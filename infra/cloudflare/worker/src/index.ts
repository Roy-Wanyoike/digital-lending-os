// ─── Digital Lending OS Edge Worker — Comprehensive Edge Protection ───────────
// Cloudflare Worker that intercepts all requests at the edge before they
// reach the Next.js origin at digital-lending-os.space-z.ai.
//
// Features:
//   1. Rate Limiting (KV-based sliding window, per-auth status)
//   2. Bot Protection (UA analysis + CAPTCHA challenge)
//   3. Auth Token Validation (JWT format check)
//   4. CORS Headers (configurable origins)
//   5. Security Headers (HSTS, CSP, X-Frame-Options, etc.)
//   6. Cache Control (static assets, /api/health, bypass auth API)
//   7. Geo Blocking (CF-IPCountry, ALLOWED_COUNTRIES)
//   8. Request Logging (structured JSON, trace headers)
// ─────────────────────────────────────────────────────────────────────

export interface Env {
  // KV namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace;

  // Secrets (set via `wrangler secret put`)
  JWT_PUBLIC_KEY: string;
  ALLOWED_COUNTRIES: string; // comma-separated ISO country codes (empty = allow all)

  // Environment
  ENVIRONMENT: 'staging' | 'production';
  ORIGIN_URL: string; // e.g. https://digital-lending-os.space-z.ai
  ALLOWED_ORIGINS: string; // comma-separated origins for CORS
  LOG_LEVEL: string; // debug | info | warn | error
}

// ─── Constants ──────────────────────────────────────────────────

const HASHED_ASSET_PATTERN = /\/_next\/static\/(chunks|css|media|fonts)\//;

const HEALTH_PATH = '/api/health';

/** Paths that should never be rate-limited or auth-checked */
const ALWAYS_BYPASS = [HEALTH_PATH, '/_next/webpack-hmr', '/_next/image'];

/** API paths that are public (no auth required) */
const PUBLIC_API_PATHS = [
  '/api/auth/',
  '/api/currency',
  '/api/payment-methods/global',
  '/api/payments/rates',
  '/api/wallets/rates',
  '/api/ready',
];

// ─── 1. Rate Limiting Config ─────────────────────────────────────

interface RateLimitConfig {
  maxRequests: number;
  windowSec: number;
}

const RATE_LIMIT_AUTH: RateLimitConfig = { maxRequests: 100, windowSec: 60 };
const RATE_LIMIT_UNAUTH: RateLimitConfig = { maxRequests: 20, windowSec: 60 };
const RATE_LIMIT_HEALTH: RateLimitConfig = { maxRequests: 60, windowSec: 60 };
const RATE_LIMIT_STATIC: RateLimitConfig = { maxRequests: 600, windowSec: 60 };

// ─── 2. Bot Protection Patterns ─────────────────────────────────

const WHITELISTED_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /telegrambot/i,
  /applebot/i,
  /gptbot/i,          // OpenAI crawler
  /ccbot/i,           // Common Crawl
  /ahrefsbot/i,       // Ahrefs (SEO tool, but legitimate)
];

const SUSPICIOUS_BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl\b/i,
  /wget\b/i,
  /python-requests/i,
  /python-httpx/i,
  /go-http-client/i,
  /java\/\d/i,
  /httpclient/i,
  /masscan/i,
  /nmap/i,
  /nikto/i,
  /sqlmap/i,
  /zgrab/i,
  /feroxbuster/i,
  /dirbuster/i,
  /gobuster/i,
];

// ─── 5. Security Headers ────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
};

const CSP_PRODUCTION =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; " +
  "img-src 'self' data: blob: https://*.stripe.com; " +
  "frame-src https://js.stripe.com https://hooks.stripe.com; " +
  "connect-src 'self' https://*.stripe.com https://api.paystack.co https://api.flutterwave.com https://api.intasend.com wss:;";

const CSP_STAGING =
  "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
  "img-src 'self' data: blob:; " +
  "frame-src 'self' https://js.stripe.com;";

const HSTS_HEADER = 'max-age=31536000; includeSubDomains; preload';

// ─── Utility Helpers ─────────────────────────────────────────────

function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function getCountryCode(request: Request): string {
  const cf = (request as unknown as { cf?: Record<string, string> }).cf;
  return cf?.country || 'XX';
}

function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isStaticAsset(pathname: string): boolean {
  return HASHED_ASSET_PATTERN.test(pathname);
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/api/auth/');
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
}

function shouldBypass(pathname: string): boolean {
  return ALWAYS_BYPASS.some((p) => pathname === p || pathname.startsWith(p));
}

function isHealthEndpoint(pathname: string): boolean {
  return pathname === HEALTH_PATH;
}

function isUnauthenticated(authHeader: string | null, sessionCookie: string | null): boolean {
  return !authHeader && !sessionCookie;
}

function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function structuredLog(
  env: Env,
  data: {
    level: string;
    message: string;
    method: string;
    path: string;
    status?: number;
    country: string;
  
  botScore: string;
    responseTime: number;
    traceId: string;
    requestId: string;
    ip?: string;
  
  extra?: Record<string, unknown>;
  },
): void {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const configuredLevel = levels[env.LOG_LEVEL as keyof typeof levels] ?? 1;
  if (levels[data.level as keyof typeof levels] < configuredLevel) return;

  const log = { ...data, timestamp: new Date().toISOString(), worker: 'digital-lending-os-edge' };
  console.log(JSON.stringify(log));
}

// ─── 1. Rate Limiting (KV sliding window) ────────────────────────

interface RateLimitWindow {
  timestamps: number[];
}

async function checkRateLimit(
  request: Request,
  env: Env,
  authenticated: boolean,
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfterSeconds: number;
}> {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Select rate limit config based on request type and auth status
  let config: RateLimitConfig;
  if (isHealthEndpoint(pathname)) {
    config = RATE_LIMIT_HEALTH;
  } else if (isStaticAsset(pathname)) {
    config = RATE_LIMIT_STATIC;
  } else if (authenticated) {
    config = RATE_LIMIT_AUTH; // 100 req/min
  } else {
    config = RATE_LIMIT_UNAUTH; // 20 req/min
  }

  const key = `rl:${authenticated ? 'auth' : 'unauth'}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSec;

  try {
    const entry = (await env.RATE_LIMIT_KV.get(key, 'json')) as RateLimitWindow | null;
    let timestamps: number[] = entry?.timestamps || [];

    // Prune old entries (sliding window)
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + config.windowSec;
      const retryAfterSeconds = resetAt - now;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: config.maxRequests,
        retryAfterSeconds,
      };
    }

    // Record this request
    timestamps.push(now);

    // Persist to KV (fire-and-forget)
    const waitUntil = (globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil;
    if (waitUntil) {
      waitUntil(
        env.RATE_LIMIT_KV.put(key, JSON.stringify({ timestamps }), {
          expirationTtl: config.windowSec + 60,
        }),
      );
    }

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetAt: now + config.windowSec,
      limit: config.maxRequests,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    // Fail open: allow request if KV is unavailable
    console.error('[EDGE] Rate limit KV error:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowSec,
      limit: config.maxRequests,
      retryAfterSeconds: 0,
    };
  }
}

// ─── 2. Bot Protection ───────────────────────────────────────────

type BotCheckResult =
  | { action: 'allow' }
  | { action: 'block'; reason: string }
  | { action: 'challenge'; reason: string };

function checkBot(userAgent: string): BotCheckResult {
  // Block empty User-Agent
  if (!userAgent) {
    return { action: 'block', reason: 'Empty User-Agent' };
  }

  // Check if it's a whitelisted bot (Googlebot, Bingbot, etc.)
  const isWhitelisted = WHITELISTED_BOTS.some((pattern) => pattern.test(userAgent));
  if (isWhitelisted) {
    return { action: 'allow' };
  }

  // Check if it matches suspicious bot patterns
  const isSuspicious = SUSPICIOUS_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
  if (isSuspicious) {
    // Known malicious tools → hard block (403)
    const isMalicious = /masscan|nmap|nikto|sqlmap|zgrab|feroxbuster|dirbuster|gobuster/i.test(userAgent);
    if (isMalicious) {
      return { action: 'block', reason: 'Known attack tool detected' };
    }
    // Other suspicious bots → challenge with CAPTCHA
    return { action: 'challenge', reason: 'Suspicious bot pattern detected' };
  }

  return { action: 'allow' };
}

// ─── 3. Auth Token Validation ────────────────────────────────────

function validateAuthToken(request: Request, env: Env): {
  hasToken: boolean;
  isValidFormat: boolean;
  token: string | null;
} {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Don't block auth routes
  if (isAuthRoute(pathname)) {
    return { hasToken: false, isValidFormat: true, token: null };
  }

  // Check for Bearer token or session cookie
  const authHeader = request.headers.get('Authorization');
  const sessionCookie = request.headers.get('Cookie');

  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (sessionCookie) {
    // Extract session token from cookie
    const match = sessionCookie.match(/(?:next-auth\.session-token|__Secure-next-auth\.session-token)=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    // For non-auth API routes, a missing token is OK (origin handles 401)
    // but we don't mark it as "verified"
    return { hasToken: false, isValidFormat: true, token: null };
  }

  // Validate JWT format (3 dot-separated base64url segments)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { hasToken: true, isValidFormat: false, token };
  }

  // Validate each part is valid base64url
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  for (const part of parts) {
    if (!base64urlPattern.test(part)) {
      return { hasToken: true, isValidFormat: false, token };
    }
  }

  // Decode header and check it's a valid JSON with alg field
  try {
    const headerB64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const headerJson = atob(headerB64);
    const header = JSON.parse(headerJson);

    if (!header.alg || typeof header.alg !== 'string') {
      return { hasToken: true, isValidFormat: false, token };
    }
  } catch {
    return { hasToken: true, isValidFormat: false, token };
  }

  return { hasToken: true, isValidFormat: true, token };
}

// ─── 4. CORS Handling ───────────────────────────────────────────

function handleCors(request: Request, env: Env): Response | null {
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') {
    const headers = new Headers();

    // Determine the allowed origin
    const isWildcard = allowedOrigins.includes('*');
    const isOriginAllowed = isWildcard || allowedOrigins.includes(origin);

    if (isOriginAllowed) {
      headers.set('Access-Control-Allow-Origin', isWildcard ? '*' : origin);
    }

    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Idempotency-Key, X-Request-ID, X-Tenant-ID, X-Trace-ID',
    );
    headers.set(
      'Access-Control-Expose-Headers',
      'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Cache-Status, X-Trace-ID, X-Request-ID, X-Geo-Country',
    );
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    return new Response(null, { status: 204, headers });
  }

  // For non-OPTIONS requests, CORS headers are added to responses later
  return null;
}

function addCorsHeaders(response: Response, env: Env, request: Request): void {
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';

  if (!origin) return;

  const isWildcard = allowedOrigins.includes('*');
  const isOriginAllowed = isWildcard || allowedOrigins.includes(origin);

  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', isWildcard ? '*' : origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin, Authorization');
  }
}

// ─── 5. Security Headers Injection ───────────────────────────────

function injectSecurityHeaders(response: Response, env: Env): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }

  // HSTS (only in production)
  if (env.ENVIRONMENT === 'production') {
    if (!response.headers.has('Strict-Transport-Security')) {
      response.headers.set('Strict-Transport-Security', HSTS_HEADER);
    }
  }

  // Content-Security-Policy
  if (!response.headers.has('Content-Security-Policy')) {
    response.headers.set(
      'Content-Security-Policy',
      env.ENVIRONMENT === 'production' ? CSP_PRODUCTION : CSP_STAGING,
    );
  }
}

// ─── 6. Cache Control ───────────────────────────────────────────

function getCacheControlHeaders(pathname: string, method: string, authenticated: boolean): Record<string, string> | null {
  // Static assets: cache at edge with immutable for hashed assets
  if (isStaticAsset(pathname)) {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Surrogate-Key': 'static-assets hashed-assets',
    };
  }

  // Health endpoint: short cache
  if (isHealthEndpoint(pathname)) {
    return {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5',
      'Surrogate-Key': 'api-health',
    };
  }

  // Authenticated API routes: bypass cache entirely
  if (isApiRoute(pathname) && authenticated) {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Surrogate-Key': 'api-auth',
    };
  }

  return null;
}

// ─── 7. Geo Blocking ────────────────────────────────────────────

function checkGeo(request: Request, env: Env): {
  blocked: boolean;
  country: string;
} {
  const country = getCountryCode(request);
  const allowedCountries = (env.ALLOWED_COUNTRIES || '').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);

  // If ALLOWED_COUNTRIES is not set or empty, allow all countries
  if (allowedCountries.length === 0) {
    return { blocked: false, country };
  }

  const blocked = !allowedCountries.includes(country);
  return { blocked, country };
}

// ─── 8. Structured Request Logging ───────────────────────────────

interface LogEntry {
  level: string;
  message: string;
  method: string;
  path: string;
  status: number;
  country: string;
  botScore: string;
  responseTime: number;
  traceId: string;
  requestId: string;
  ip: string;
}

function logRequest(
  env: Env,
  entry: LogEntry,
  extra: Record<string, unknown> = {},
): void {
  structuredLog(env, {
    level: entry.status >= 500 ? 'error' : entry.status >= 400 ? 'warn' : 'info',
    message: 'edge-request',
    method: entry.method,
    path: entry.path,
    status: entry.status,
    country: entry.country,
  botScore: entry.botScore,
  responseTime: entry.responseTime,
  traceId: entry.traceId,
  requestId: entry.requestId,
  ip: entry.ip,
  extra,
  });
}

// ─── HTML Response for Challenges / Blocks ───────────────────────

function htmlResponse(title: string, message: string, status: number): Response {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}
.card{background:#fff;border-radius:12px;padding:2rem;max-width:420px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center}
h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#64748b;margin:0 0 1rem;font-size:.875rem;line-height:1.5}
.btn{display:inline-block;padding:.625rem 1.5rem;border-radius:.5rem;background:#0f172a;color:#fff;text-decoration:none;font-weight:500}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>
<a href="/" class="btn">Return Home</a></div></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

// ─── Main Fetch Handler ──────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    const startTime = Date.now();
    const traceId = generateTraceId();
    const requestId = request.headers.get('X-Request-ID') || generateTraceId();
    const userAgent = request.headers.get('User-Agent') || '';
    const clientIP = getClientIP(request);
    const countryCode = getCountryCode(request);

    try {
      // ── 0. Health check bypass ──
      if (shouldBypass(pathname)) {
        const resp = await fetch(request);
        const elapsed = Date.now() - startTime;
        resp.headers.set('X-Trace-ID', traceId);
        resp.headers.set('X-Request-ID', requestId);
        logRequest(env, {
          level: 'info',
          message: 'bypass-request',
          method, path: pathname, status: resp.status,
          country: countryCode, botScore: 'n/a', responseTime: elapsed,
          traceId, requestId, ip: clientIP,
        });
        return resp;
      }

      // ── 1. CORS preflight ──
      const corsResp = handleCors(request, env);
      if (corsResp) {
        corsResp.headers.set('X-Trace-ID', traceId);
        corsResp.headers.set('X-Request-ID', requestId);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'info', message: 'cors-preflight', method, path: pathname,
          status: 204, country: countryCode, botScore: 'n/a',
          responseTime: elapsed, traceId, requestId, ip: clientIP,
        });
        return corsResp;
      }

      // ── 2. Bot Protection ──
      const botResult = checkBot(userAgent);
      const botScore = botResult.action === 'allow' ? 'trusted' : botResult.action === 'challenge' ? 'suspicious' : 'malicious';

      if (botResult.action === 'block') {
        const resp = jsonResponse(
          { error: 'Forbidden', message: botResult.reason, code: 'EDGE_BOT_BLOCKED' },
          403,
          { 'X-Trace-ID': traceId, 'X-Request-ID': requestId },
        );
        injectSecurityHeaders(resp, env);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'warn', message: `bot-blocked: ${botResult.reason}`, method, path: pathname,
          status: 403, country: countryCode, botScore, responseTime: elapsed,
          traceId, requestId, ip: clientIP,
        });
        return resp;
      }

      if (botResult.action === 'challenge') {
        // Return a CAPTCHA challenge header for unknown bots
        const resp = new Response(null, {
          status: 403,
          headers: {
            'Content-Type': 'text/html',
            'CF-Challenge': 'managed',
            'CF-Mitigated': 'challenge',
            'X-Trace-ID': traceId,
            'X-Request-ID': requestId,
          },
        });
        injectSecurityHeaders(resp, env);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'warn', message: `bot-challenged: ${botResult.reason}`, method, path: pathname,
          status: 403, country: countryCode, botScore, responseTime: elapsed,
          traceId, requestId, ip: clientIP,
        });
        return resp;
      }

      // ── 3. Geo Blocking ──
      const geo = checkGeo(request, env);
      if (geo.blocked) {
        const resp = htmlResponse(
          'Access Restricted',
          `Access from your region (${geo.country}) is not available. If you believe this is an error, please contact support.`,
          403,
        );
        resp.headers.set('X-Trace-ID', traceId);
        resp.headers.set('X-Request-ID', requestId);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'warn', message: `geo-blocked: ${geo.country}`, method, path: pathname,
          status: 403, country: geo.country, botScore, responseTime: elapsed,
          traceId, requestId, ip: clientIP,
        });
        return resp;
      }

      // ── 4. Auth Token Validation (for API routes) ──
      const authHeader = request.headers.get('Authorization');
      const sessionCookie = request.headers.get('Cookie');
      const isAuthenticated = !isUnauthenticated(authHeader, sessionCookie);

      if (isApiRoute(pathname) && !isPublicApi(pathname) && !isAuthRoute(pathname)) {
        const authResult = validateAuthToken(request, env);
        if (authResult.hasToken && !authResult.isValidFormat) {
          const resp = jsonResponse(
            { error: 'Unauthorized', message: 'Invalid token format', code: 'EDGE_AUTH_FAILURE' },
            401,
          
            { 'WWW-Authenticate': 'Bearer realm="Digital Lending OS", error="invalid_token"' },
          );
          injectSecurityHeaders(resp, env);
          resp.headers.set('X-Trace-ID', traceId);
          resp.headers.set('X-Request-ID', requestId);
          const elapsed = Date.now() - startTime;
          logRequest(env, {
            level: 'warn', message: 'auth-token-invalid-format', method, path: pathname,
            status: 401, country: geo.country, botScore, responseTime: elapsed,
            traceId, requestId, ip: clientIP,
          });
          return resp;
        }
      }

      // ── 5. Rate Limiting ──
      const rateLimitResult = await checkRateLimit(request, env, isAuthenticated);
      if (!rateLimitResult.allowed) {
        const resp = jsonResponse(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again after ${rateLimitResult.retryAfterSeconds} seconds.`,
            retryAfter: rateLimitResult.resetAt,
          },
          429,
          {
            'Retry-After': rateLimitResult.retryAfterSeconds.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          },
        );
        injectSecurityHeaders(resp, env);
        resp.headers.set('X-Trace-ID', traceId);
        resp.headers.set('X-Request-ID', requestId);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'warn', message: 'rate-limit-exceeded', method, path: pathname,
          status: 429, country: geo.country, botScore, responseTime: elapsed,
          traceId, requestId, ip: clientIP,
        }, { remaining: 0, limit: rateLimitResult.limit });
        return resp;
      }

      // ── 6. Build origin request with extra headers ──
      const originHeaders = new Headers(request.headers);
      originHeaders.set('X-Trace-ID', traceId);
      originHeaders.set('X-Request-ID', requestId);
      originHeaders.set('X-Geo-Country', geo.country);

      // Forward verified token if present
      if (isApiRoute(pathname)) {
        const authResult = validateAuthToken(request, env);
        if (authResult.hasToken && authResult.isValidFormat && authResult.token) {
          originHeaders.set('X-Verified-Token', 'true');
        }
      }

      // ── 7. Fetch from origin ──
      const originRequest = new Request(request, { headers: originHeaders });
      let originResp = await fetch(originRequest);

      // ── 8. Apply Cache-Control headers ──
      const cacheHeaders = getCacheControlHeaders(pathname, method, isAuthenticated);
      if (cacheHeaders) {
        for (const [key, value] of Object.entries(cacheHeaders)) {
          originResp.headers.set(key, value);
        }
      }

      // ── 9. Inject rate limit headers ──
      originResp.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      originResp.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      originResp.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());

      // ── 10. Inject security headers ──
      injectSecurityHeaders(originResp, env);

      // ── 11. Add CORS headers ──
      addCorsHeaders(originResp, env, request);

      // ── 12. Add trace headers ──
      originResp.headers.set('X-Trace-ID', traceId);
      originResp.headers.set('X-Request-ID', requestId);
      originResp.headers.set('X-Edge-Worker', 'digital-lending-os-edge');
      originResp.headers.set('X-Edge-Processing-Time', `${Date.now() - startTime}ms`);

      // ── 13. Log the request ──
      const elapsed = Date.now() - startTime;
      logRequest(env, {
        level: 'info', message: 'origin-proxy', method, path: pathname,
        status: originResp.status, country: geo.country, botScore,
        responseTime: elapsed, traceId, requestId, ip: clientIP,
      });

      return originResp;
    } catch (error) {
      // Edge worker error — fail open to origin
      console.error('[EDGE] Worker error:', error);

      try {
        const originResp = await fetch(request);
        originResp.headers.set('X-Cache-Status', 'BYPASS');
        originResp.headers.set('X-Edge-Error', 'worker-exception');
        originResp.headers.set('X-Trace-ID', traceId);
        originResp.headers.set('X-Request-ID', requestId);
        return originResp;
      } catch {
        const resp = jsonResponse(
          { error: 'Service Unavailable', message: 'The service is temporarily unavailable. Please try again.', code: 'EDGE_WORKER_FAILURE' },
          503,
          { 'Retry-After': '30', 'X-Trace-ID': traceId, 'X-Request-ID': requestId },
        );
        injectSecurityHeaders(resp, env);
        const elapsed = Date.now() - startTime;
        logRequest(env, {
          level: 'error', message: 'worker-failure', method, path: pathname,
          status: 503, country: countryCode, botScore: 'error',
          responseTime: elapsed, traceId, requestId, ip: clientIP,
        }, { error: String(error) });
        return resp;
      }
    }
  },
};
