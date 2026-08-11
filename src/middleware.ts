import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory sliding-window rate limiter (edge-compatible) ─────────

interface RlEntry { count: number; resetAt: number }

const rlStore = new Map<string, RlEntry>();
const RL_WINDOW = 60_000;
const RL_MAX = 100;
const RL_MAX_ENTRIES = 10_000;
const FINANCIAL_RL_MAX = 10; // Tighter limit for financial mutation endpoints
let rlChecks = 0;

function evictExpired(now: number) {
  for (const [k, v] of rlStore) { if (now >= v.resetAt) rlStore.delete(k); }
}

function checkRateLimit(ip: string, max: number = RL_MAX) {
  const now = Date.now();
  const key = `rl:${max}:${ip}`; // Include max in key so financial and global limits are independent

  // Lazy cleanup every 200 checks to prevent unbounded growth
  if (++rlChecks % 200 === 0 || rlStore.size > RL_MAX_ENTRIES) {
    evictExpired(now);
  }

  let entry = rlStore.get(key);
  if (entry && now >= entry.resetAt) { rlStore.delete(key); entry = undefined; }

  if (!entry) {
    const resetAt = now + RL_WINDOW;
    rlStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt, resetSec: Math.ceil(resetAt / 1000) };
  }

  entry.count++;
  const remaining = Math.max(0, max - entry.count);
  if (entry.count > max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt, resetSec: Math.ceil(entry.resetAt / 1000) };
  }
  return { ok: true, remaining, resetAt: entry.resetAt, resetSec: Math.ceil(entry.resetAt / 1000) };
}

/**
 * Paths that match financial mutation endpoints requiring tighter rate limits.
 * These handle money movement and are higher-risk targets for abuse.
 */
const FINANCIAL_MUTATION_RE = [
  /^\/api\/wallets\/(deposit|withdrawal|crypto-withdrawal|convert)\/?(\?|$)/i,
  /^\/api\/escrow\/transactions\/[^/]+\/(release|fund|disputes|activate)\/?(\?|$)/i,
  /^\/api\/payments\/initialize/i,
  /^\/api\/escrow\/transactions(\/|\?|$)/i,
  /^\/api\/withdrawals(\/|\?|$)/i,
  /^\/api\/deposits(\/|\?|$)/i,
  /^\/api\/collections(\/|\?|$)/i,
  /^\/api\/invoices(\/|\?|$)/i,
  /^\/api\/payment-links\/[^/]+\/pay/i,
];

function isFinancialMutation(pathname: string, method: string): boolean {
  if (method !== 'POST') return false;
  return FINANCIAL_MUTATION_RE.some(re => re.test(pathname));
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
  if (/^\/api\/payment-links\/ref\//.test(p)) return true;
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
  // NOTE: X-Frame-Options, X-Content-Type-Options, Referrer-Policy are set in
  // next.config.ts headers() — avoid duplicating them here.
  const res = NextResponse.next();
  res.headers.set('x-xss-protection', '1; mode=block');
  // CSP NOTE (security tradeoff): 'unsafe-eval' is required by recharts library.
  // 'unsafe-inline' in style-src is required by Next.js and Tailwind CSS runtime.
  // TODO(W5a): Migrate to nonce-based CSP once recharts is replaced or patched.
  // Current CSP provides defense-in-depth despite these allowances:
  //   - object-src, base-uri are implicitly blocked
  //   - form-action is implicitly restricted to 'self'
  //   - connect-src is locked to known payment provider domains
  res.headers.set('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.stripe.com https://api.paystack.co https://api.flutterwave.io https://api.intasend.com; frame-src https://js.stripe.com https://checkout.paystack.com https://checkout.flutterwave.com; object-src 'none'; base-uri 'self'; form-action 'self';");
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

  // --- Rate limiting (100 req/min per IP, 10/min for financial mutations) ---
  const financialLimit = isFinancialMutation(pathname, method);
  const rl = checkRateLimit(ip, financialLimit ? FINANCIAL_RL_MAX : RL_MAX);
  const rlHeaders: Record<string, string> = {
    'x-ratelimit-limit': String(financialLimit ? FINANCIAL_RL_MAX : RL_MAX),
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
    // Log the match pattern server-side only — do NOT expose in response headers
    // to prevent attackers from crafting User-Agent strings that bypass the filter.
    console.log(`${method} ${pathname} 403 bot-blocked [${blockedBy}] ${Date.now() - start}ms`);
    return NextResponse.json(
      { error: 'Forbidden' },
      {
        status: 403,
        headers: {
          'x-bot-blocked': 'true',
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

  // Skip console.log for health/ready endpoints to reduce I/O during monitoring polls
  if (pathname !== '/api/health' && pathname !== '/api/ready') {
    console.log(`${method} ${pathname} 200 ${duration}ms`);
  }

  return res;
}

export const config = {
  // Exclude static assets, internal Next.js routes, and common static extensions
  // to avoid unnecessary middleware execution overhead.
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack|favicon\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|css|js|woff2?|ttf|eot|webmanifest)$).*)',
  ],
};
