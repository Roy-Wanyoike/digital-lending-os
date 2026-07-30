import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory sliding-window rate limiter (edge-compatible) ─────────

interface RlEntry { count: number; resetAt: number }

const rlStore = new Map<string, RlEntry>();
const RL_WINDOW = 60_000;
const RL_MAX = 100;
let rlChecks = 0;

function checkRateLimit(ip: string) {
  const now = Date.now();
  const key = `rl:${ip}`;

  // Lazy cleanup every 200 checks to prevent unbounded growth
  if (++rlChecks % 200 === 0) {
    for (const [k, v] of rlStore) { if (now >= v.resetAt) rlStore.delete(k); }
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

// ─── Middleware ─────────────────────────────────────────────────────

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
  res.headers.set('x-request-id', crypto.randomUUID());

  // --- CORS headers (all responses) ---
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-request-id');

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
  const rlHeaders = {
    'x-ratelimit-limit': String(RL_MAX),
    'x-ratelimit-remaining': String(rl.remaining),
    'x-ratelimit-reset': String(rl.resetSec),
  };

  if (!rl.ok) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    console.log(`${method} ${pathname} 429 ${Date.now() - start}ms`);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { ...rlHeaders, 'Retry-After': String(retryAfter), 'x-response-time': `${Date.now() - start}ms` } },
    );
  }

  // --- Bot protection (API routes only) ---
  const ua = request.headers.get('user-agent') ?? '';
  if (isBadBot(ua)) {
    console.log(`${method} ${pathname} 403 ${Date.now() - start}ms`);
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'x-response-time': `${Date.now() - start}ms` } },
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
  for (const [k, v] of Object.entries(rlHeaders)) res.headers.set(k, v);
  const duration = Date.now() - start;
  res.headers.set('x-response-time', `${duration}ms`);
  console.log(`${method} ${pathname} 200 ${duration}ms`);

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
