import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory sliding-window rate limiter (edge-compatible) ─────────

interface RlEntry { count: number; resetAt: number }

const rlStore = new Map<string, RlEntry>();
const RL_WINDOW = 60_000;
const RL_MAX = 100;
const RL_MAX_ENTRIES = 10_000;
let rlChecks = 0;

function evictExpired(now: number) {
  for (const [k, v] of rlStore) { if (now >= v.resetAt) rlStore.delete(k); }
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const key = `rl:${ip}`;

  // Lazy cleanup every 200 checks to prevent unbounded growth
  if (++rlChecks % 200 === 0 || rlStore.size > RL_MAX_ENTRIES) {
    evictExpired(now);
  }

  let entry = rlStore.get(key);
  if (entry && now >= entry.resetAt) { rlStore.delete(key); entry = undefined; }

  if (!entry) {
    const resetAt = now + RL_WINDOW;
    rlStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: RL_MAX - 1, resetAt, resetSec: Math.ceil(resetAt / 1000) };
  }

  entry.count++;
  const remaining = Math.max(0, RL_MAX - entry.count);
  if (entry.count > RL_MAX) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt, resetSec: Math.ceil(entry.resetAt / 1000) };
  }
  return { ok: true, remaining, resetAt: entry.resetAt, resetSec: Math.ceil(entry.resetAt / 1000) };
}

// ─── Bot detection ──────────────────────────────────────────────────

const BAD_BOT_RE = [/^curl\//i, /^wget\//i, /^python-requests\//i, /sqlmap/i, /nikto/i, /nmap/i];

// ─── CORS allowed origins ───────────────────────────────────────────
// Allowlist of origin patterns. Includes preview proxy and localhost.
// Add production domains here before deploying.

const ALLOWED_ORIGIN_RE = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
  /^https?:\/\/preview-chat-[a-f0-9-]+\.space-z\.ai$/,
  // Add production domain(s) here, e.g.:
  // /^https?:\/\/your-production-domain\.com$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_RE.some(re => re.test(origin));
}

function isBadBot(ua: string): boolean {
  return !ua || BAD_BOT_RE.some(r => r.test(ua));
}

// ─── Public API paths (skip auth) ──────────────────────────────────

function isPublicPath(p: string): boolean {
  if (p === '/api/health' || p === '/api/ready') return true;
  if (p.startsWith('/api/auth/')) return true;
  if (/^\/api\/payment-links\/[^/]+\/pay/.test(p)) return true;
  if (p.startsWith('/api/payments/webhooks/')) return true;
  return false;
}

// ─── Proxy ─────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const start = Date.now();
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');

  // --- Security headers (all responses) ---
  const res = NextResponse.next();
  res.headers.set('x-frame-options', 'DENY');
  res.headers.set('x-content-type-options', 'nosniff');
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  res.headers.set('x-xss-protection', '1; mode=block');
  res.headers.set('x-request-id', `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // --- CORS headers (all responses) ---
  // Only reflect origins on the allowlist (includes preview proxy).
  // Non-browser / same-origin requests have no Origin header and skip CORS.
  const origin = request.headers.get('origin');
  if (origin && origin !== 'null' && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-csrf-token,x-request-id');

  // --- OPTIONS preflight → return immediately ---
  if (method === 'OPTIONS') {
    res.headers.set('x-response-time', `${Date.now() - start}ms`);
    if (isApi) console.log(`${method} ${pathname} 200 ${Date.now() - start}ms`);
    return res;
  }

  // --- Non-API: headers + CORS only, pass through ---
  if (!isApi) return res;

  // ═══════════ API-specific checks below ═══════════

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip') ?? 'unknown';

  // --- Rate limiting (100 req/min per IP) ---
  const rl = checkRateLimit(ip);
  const rlHeaders: Record<string, string> = {
    'x-ratelimit-limit': String(RL_MAX),
    'x-ratelimit-remaining': String(rl.remaining),
    'x-ratelimit-reset': String(rl.resetSec),
  };

  if (!rl.ok) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    console.log(`${method} ${pathname} 429 ${Date.now() - start}ms`);
    const h = new Headers();
    h.set('x-ratelimit-limit', rlHeaders['x-ratelimit-limit']);
    h.set('x-ratelimit-remaining', rlHeaders['x-ratelimit-remaining']);
    h.set('x-ratelimit-reset', rlHeaders['x-ratelimit-reset']);
    h.set('Retry-After', String(retryAfter));
    h.set('x-response-time', `${Date.now() - start}ms`);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: h },
    );
  }

  // --- Bot protection (skip public/infra paths like health, ready, webhooks) ---
  const ua = request.headers.get('user-agent') ?? '';
  if (!isPublicPath(pathname) && isBadBot(ua)) {
    const blockedBy = BAD_BOT_RE.find(r => r.test(ua))?.source ?? 'empty-ua';
    console.log(`${method} ${pathname} 403 bot-blocked [${blockedBy}] ${Date.now() - start}ms`);
    return NextResponse.json(
      { error: 'Forbidden' },
      {
        status: 403,
        headers: {
          'x-bot-blocked': 'true',
          'x-bot-match': blockedBy,
          'x-response-time': `${Date.now() - start}ms`,
        },
      },
    );
  }

  // --- Auth guard (skip public paths) ---
  if (!isPublicPath(pathname)) {
    const hasSession = request.cookies.has('next-auth.session-token')
      || request.cookies.has('__Secure-next-auth.session-token');
    const hasBearer = (request.headers.get('authorization') ?? '').startsWith('Bearer ');
    if (!hasSession && !hasBearer) {
      console.log(`${method} ${pathname} 401 ${Date.now() - start}ms`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'x-response-time': `${Date.now() - start}ms` } },
      );
    }
  }

  // --- Attach rate-limit headers & timing to pass-through response ---
  res.headers.set('x-ratelimit-limit', rlHeaders['x-ratelimit-limit']);
  res.headers.set('x-ratelimit-remaining', rlHeaders['x-ratelimit-remaining']);
  res.headers.set('x-ratelimit-reset', rlHeaders['x-ratelimit-reset']);
  const duration = Date.now() - start;
  res.headers.set('x-response-time', `${duration}ms`);
  console.log(`${method} ${pathname} 200 ${duration}ms`);

  return res;
}

export const config = {
  // Exclude static assets, internal Next.js routes, and common static extensions
  // to avoid unnecessary middleware execution overhead.
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack|favicon\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|css|js|woff2?|ttf|eot|webmanifest)$).*)',
  ],
};
