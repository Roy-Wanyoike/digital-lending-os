// ─── Digital Lending OS Edge Worker ───────────────────────────────────────
// Cloudflare Worker that handles requests at the edge before they
// reach the Next.js origin.  Features:
//   A) Static asset caching (cache-first, long TTL for hashed assets)
//   B) API response caching for GET requests (5–30 s depending on endpoint)
//   C) Authentication token validation at the edge (JWT signature check)
//   D) Rate limiting via Workers KV sliding window
//   E) Geo-blocking / geo-routing (route to nearest region)
//   F) Bot protection (challenge suspicious user agents)
//   G) A/B testing header injection
// ─────────────────────────────────────────────────────────────────

export interface Env {
  // KV namespaces bound in wrangler.toml
  CACHE_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  AB_TEST_KV: KVNamespace;

  // Secrets (set via `wrangler secret put`)
  JWT_PUBLIC_KEY: string;
  BLOCKED_COUNTRIES: string; // comma-separated ISO country codes

  // Environment
  ENVIRONMENT: 'staging' | 'production';
  ORIGIN_HOSTNAME: string;
  ALLOWED_ORIGINS: string; // comma-separated
  LOG_LEVEL: string;
}

// ─── Constants ──────────────────────────────────────────────────

const STATIC_EXTENSIONS = new Set([
  'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mp3', 'ogg',
]);

const HASHED_ASSET_PATTERN = /\/_next\/static\/(chunks|css|media|fonts)\//;

const API_CACHE_CONFIG: Record<string, number> = {
  '/api/dashboard/stats': 30,
  '/api/currency': 60,
  '/api/wallets/rates': 60,
  '/api/payment-methods/global': 600, // 10 min
  '/api/payments/rates': 60,
};

const BYPASS_CACHE_PATHS = [
  '/api/auth/',
  '/api/payments/',
  '/api/withdrawals/',
  '/api/deposits/',
  '/api/escrow/transactions',
  '/api/wallets/deposit',
  '/api/wallets/withdrawal',
  '/api/wallets/crypto-withdrawal',
  '/api/payments/initialize',
  '/api/payments/intents',
];

const RATE_LIMITS: Record<string, { maxRequests: number; windowSec: number }> = {
  global: { maxRequests: 300, windowSec: 60 },
  auth: { maxRequests: 10, windowSec: 60 },
  api: { maxRequests: 100, windowSec: 60 },
  payment: { maxRequests: 30, windowSec: 60 },
  webhook: { maxRequests: 1000, windowSec: 60 },
  static: { maxRequests: 600, windowSec: 60 },
};

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
];

const WHITELISTED_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /telegrambot/i,
];

const AB_TEST_EXPERIMENTS = [
  { name: 'checkout-flow', variants: ['control', 'variant-a', 'variant-b'], trafficPercent: 30 },
  { name: 'pricing-display', variants: ['control', 'variant-a'], trafficPercent: 20 },
  { name: 'onboarding-wizard', variants: ['control', 'variant-a'], trafficPercent: 50 },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, X-Request-ID, X-Tenant-ID',
  'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Cache-Status, X-AB-Experiment',
  'Access-Control-Max-Age': '86400',
};

// ─── Utility helpers ─────────────────────────────────────────────

function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function getCountryCode(request: Request): string {
  const cf = (request as any).cf as Record<string, any> | undefined;
  return cf?.country || 'XX';
}

function getContinent(request: Request): string {
  const cf = (request as any).cf as Record<string, any> | undefined;
  return cf?.continent || 'NA';
}

function getCity(request: Request): string {
  const cf = (request as any).cf as Record<string, any> | undefined;
  return cf?.city || 'unknown';
}

function isBotRequest(userAgent: string): boolean {
  const isSuspicious = SUSPICIOUS_BOT_PATTERNS.some((p) => p.test(userAgent));
  const isWhitelisted = WHITELISTED_BOTS.some((p) => p.test(userAgent));
  return isSuspicious && !isWhitelisted;
}

function isStaticAsset(url: URL): boolean {
  const pathname = url.pathname;
  const ext = pathname.split('.').pop()?.toLowerCase() || '';
  return STATIC_EXTENSIONS.has(ext) || HASHED_ASSET_PATTERN.test(pathname);
}

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

function isHealthCheck(url: URL): boolean {
  return url.pathname === '/api/health' || url.pathname === '/_next/webpack-hmr';
}

function matchesApiCacheConfig(pathname: string): number | null {
  for (const [prefix, ttl] of Object.entries(API_CACHE_CONFIG)) {
    if (pathname.startsWith(prefix)) return ttl;
  }
  return null;
}

function shouldBypassCache(pathname: string): boolean {
  return BYPASS_CACHE_PATHS.some((p) => pathname.startsWith(p));
}

function getRateLimitCategory(url: URL): string {
  const pathname = url.pathname;
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/payments/') || pathname.startsWith('/api/withdrawals/')) return 'payment';
  if (pathname.startsWith('/api/')) return 'api';
  if (isStaticAsset(url)) return 'static';
  return 'global';
}

function generateCacheKey(request: Request): string {
  const url = new URL(request.url);
  const authHeader = request.headers.get('Authorization');
  const tenantHeader = request.headers.get('X-Tenant-ID');

  // Include query params for API endpoints, ignore for static
  let key: string;
  if (isApiRequest(url)) {
    key = `${url.pathname}?${url.searchParams.toString()}|${authHeader || 'anon'}|${tenantHeader || 'default'}`;
  } else {
    key = `${url.pathname}`;
  }

  // Hash the key to stay within KV key length limits
  return hashString(key);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function htmlChallengeResponse(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}
.card{background:#fff;border-radius:12px;padding:2rem;max-width:420px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center}
h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#64748b;margin:0 0 1rem;font-size:.875rem;line-height:1.5}
.btn{display:inline-block;padding:.625rem 1.5rem;border-radius:.5rem;background:#0f172a;color:#fff;text-decoration:none;font-weight:500}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>
<a href="/" class="btn">Return Home</a></div></body></html>`;
  return new Response(html, { status: 403, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

// ─── A) Static Asset Caching ────────────────────────────────────

async function handleStaticAsset(request: Request, env: Env, cache: Cache): Promise<Response> {
  const cacheKey = new Request(request.url, request);

  // Cache-first: check edge cache first
  let cached = await cache.match(cacheKey);
  if (cached) {
    const resp = new Response(cached.body, cached);
    resp.headers.set('X-Cache-Status', 'HIT');
    resp.headers.set('X-Cache-Tier', 'L1-Edge');
    return resp;
  }

  // MISS — fetch from origin
  const originResp = await fetch(request);
  const respToCache = originResp.clone();

  // Cache for 1 year for hashed assets (immutable), 1 month for other static
  const url = new URL(request.url);
  if (HASHED_ASSET_PATTERN.test(url.pathname)) {
    const headers = new Headers(respToCache.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Surrogate-Key', 'static-assets hashed-assets');

    // Wait for cache.put in background
    const waitUntil = (globalThis as any).waitUntil as ((p: Promise<any>) => void) | undefined;
    if (waitUntil) {
      waitUntil(cache.put(cacheKey, new Response(respToCache.body, { headers })));
    }

    const finalResp = new Response(originResp.body, { headers });
    finalResp.headers.set('X-Cache-Status', 'MISS');
    finalResp.headers.set('X-Cache-Tier', 'L1-Edge');
    return finalResp;
  } else {
    // Non-hashed static assets: 1 month
    const headers = new Headers(respToCache.headers);
    headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
    headers.set('Surrogate-Key', 'static-assets');

    const waitUntil = (globalThis as any).waitUntil as ((p: Promise<any>) => void) | undefined;
    if (waitUntil) {
      waitUntil(cache.put(cacheKey, new Response(respToCache.body, { headers })));
    }

    const finalResp = new Response(originResp.body, { headers });
    finalResp.headers.set('X-Cache-Status', 'MISS');
    finalResp.headers.set('X-Cache-Tier', 'L1-Edge');
    return finalResp;
  }
}

// ─── B) API Response Caching ────────────────────────────────────

async function handleApiCaching(request: Request, env: Env, cache: Cache): Promise<Response | null> {
  if (request.method !== 'GET') return null;

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip non-cacheable endpoints
  if (shouldBypassCache(pathname)) return null;

  const ttl = matchesApiCacheConfig(pathname);
  if (ttl === null) return null;

  const cacheKey = new Request(request.url, request);

  // Check edge cache
  let cached = await cache.match(cacheKey);
  if (cached) {
    const resp = new Response(cached.body, cached);
    resp.headers.set('X-Cache-Status', 'HIT');
    resp.headers.set('X-Cache-Tier', 'L1-Edge');
    resp.headers.set('Age', (Date.now() / 1000 - Number(cached.headers.get('X-Cached-At') || '0')).toFixed(0));
    return resp;
  }

  // MISS — fetch from origin
  const originResp = await fetch(request);

  if (originResp.status === 200) {
    const respToCache = originResp.clone();
    const headers = new Headers(respToCache.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}, s-maxage=${ttl}`);
    headers.set('X-Cached-At', (Date.now() / 1000).toString());
    headers.set('Surrogate-Key', `api-response api-${pathname.split('/').filter(Boolean).slice(0, 3).join('-')}`);

    const waitUntil = (globalThis as any).waitUntil as ((p: Promise<any>) => void) | undefined;
    if (waitUntil) {
      waitUntil(cache.put(cacheKey, new Response(respToCache.body, { headers })));
    }

    const finalResp = new Response(originResp.body, originResp.headers);
    finalResp.headers.set('X-Cache-Status', 'MISS');
    finalResp.headers.set('X-Cache-Tier', 'L1-Edge');
    return finalResp;
  }

  // Don't cache error responses
  return originResp;
}

// ─── C) JWT Edge Validation ──────────────────────────────────────

async function validateJwtAtEdge(request: Request, env: Env): Promise<{ valid: boolean; payload?: any; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'No Bearer token' };
  }

  const token = authHeader.slice(7);

  // Only validate on API paths that require auth (skip public endpoints)
  const url = new URL(request.url);
  const publicEndpoints = ['/api/auth/', '/api/currency', '/api/payment-methods/global', '/api/payments/rates', '/api/wallets/rates'];
  if (publicEndpoints.some((p) => url.pathname.startsWith(p))) {
    return { valid: true }; // Skip validation for public endpoints
  }

  try {
    // Import the Web Crypto API for JWT verification
    // Decode JWT header to get algorithm
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token' };
    }

    const headerB64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const headerJson = atob(headerB64);
    const header = JSON.parse(headerJson);

    if (header.alg !== 'RS256' && header.alg !== 'RS512') {
      return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
    }

    // Verify signature using the public key
    const publicKeyPEM = env.JWT_PUBLIC_KEY;
    if (!publicKeyPEM) {
      return { valid: true }; // Skip validation if key not configured (dev mode)
    }

    // Convert PEM to ArrayBuffer
    const pemContents = publicKeyPEM
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const keyData: globalThis.AlgorithmIdentifier | globalThis.JsonWebKey = {
      kty: 'RSA',
      alg: header.alg as 'RS256' | 'RS512',
      ext: true,
      n: btoa(String.fromCharCode(...binaryDer.subarray(33, 165))),
      e: btoa(String.fromCharCode(...binaryDer.subarray(0, 4).reverse())),
      // We use the importKey approach instead since the manual JWK construction
      // is complex for RSA. Fall back to spki import.
    };

    // Use SPKI import instead
    const spkiDer = new Uint8Array(
      pemContents.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    );

    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: header.alg === 'RS512' ? 'SHA-512' : 'SHA-256' },
      false,
      ['verify'],
    );

    const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      data,
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check expiration
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token not yet valid' };
    }

    return { valid: true, payload };
  } catch (error) {
    // On any error, allow request through to origin (fail open for reliability)
    // but log for monitoring
    console.error('[EDGE] JWT validation error:', error);
    return { valid: true };
  }
}

// ─── D) Rate Limiting via KV sliding window ────────────────────

interface RateLimitWindow {
  timestamps: number[];
}

async function checkRateLimit(request: Request, env: Env): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}> {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const category = getRateLimitCategory(url);
  const config = RATE_LIMITS[category] || RATE_LIMITS.global;

  const key = `rl:${category}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSec;

  try {
    const entry = await env.RATE_LIMIT_KV.get(key, 'json') as RateLimitWindow | null;

    let timestamps: number[] = entry?.timestamps || [];

    // Prune old entries (sliding window)
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetAt = oldestInWindow + config.windowSec;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: config.maxRequests,
      };
    }

    // Record this request
    timestamps.push(now);

    // Persist to KV (fire-and-forget with waitUntil)
    const waitUntil = (globalThis as any).waitUntil as ((p: Promise<any>) => void) | undefined;
    if (waitUntil) {
      waitUntil(
        env.RATE_LIMIT_KV.put(key, JSON.stringify({ timestamps }), {
          expirationTtl: config.windowSec + 60, // auto-expire after window
        }),
      );
    }

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      resetAt: now + config.windowSec,
      limit: config.maxRequests,
    };
  } catch (error) {
    // Fail open: allow request if KV is unavailable
    console.error('[EDGE] Rate limit KV error:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowSec,
      limit: config.maxRequests,
    };
  }
}

// ─── E) Geo-blocking / geo-routing ──────────────────────────────

function handleGeoRouting(request: Request, env: Env): { blocked: boolean; headers: Record<string, string>; nearestRegion: string } {
  const countryCode = getCountryCode(request);
  const continent = getContinent(request);
  const city = getCity(request);

  // Check blocked countries
  const blockedCountries = (env.BLOCKED_COUNTRIES || '').split(',').map((c) => c.trim().toUpperCase());
  if (blockedCountries.length > 0 && blockedCountries.includes(countryCode)) {
    return { blocked: true, headers: {}, nearestRegion: '' };
  }

  // Map continent to nearest origin region
  const regionMap: Record<string, string> = {
    NA: 'us-east-1',
    SA: 'us-east-1',
    EU: 'eu-west-1',
    AF: 'eu-west-1',
    AS: 'ap-southeast-1',
    OC: 'ap-southeast-1',
  };

  const nearestRegion = regionMap[continent] || 'us-east-1';

  return {
    blocked: false,
    headers: {
      'X-Geo-Country': countryCode,
      'X-Geo-Continent': continent,
      'X-Geo-City': city,
      'X-Nearest-Region': nearestRegion,
    },
    nearestRegion,
  };
}

// ─── F) Bot Protection ───────────────────────────────────────────

function handleBotProtection(request: Request): { challenged: boolean; response?: Response } {
  const userAgent = request.headers.get('User-Agent') || '';

  if (!isBotRequest(userAgent)) {
    return { challenged: false };
  }

  // Challenge suspicious bots with a Managed Challenge (Cloudflare Turnstile)
  // In production, this would integrate with Cloudflare's Bot Management
  return {
    challenged: true,
    response: jsonResponse(
      {
        error: 'Bot detected',
        message: 'Your request has been flagged. Please try again with a standard web browser.',
        cf_challenge: true,
      },
      403,
      { 'CF-Challenge': 'managed' },
    ),
  };
}

// ─── G) A/B Testing Header Injection ─────────────────────────────

async function resolveABTests(request: Request, env: Env): Promise<Record<string, string>> {
  const ip = getClientIP(request);
  const userId = request.headers.get('X-User-ID') || ip;
  const headers: Record<string, string> = {};

  for (const experiment of AB_TEST_EXPERIMENTS) {
    const lookupKey = `ab:${experiment.name}:${userId}`;
    const url = new URL(request.url);

    // Check KV for sticky assignment first
    try {
      const assigned = await env.AB_TEST_KV.get(lookupKey);
      if (assigned) {
        headers[`X-AB-${experiment.name}`] = assigned;
        headers['X-AB-Experiment'] = (headers['X-AB-Experiment'] || '') + `${experiment.name}=${assigned};`;
        continue;
      }
    } catch {
      // Fall through to deterministic assignment
    }

    // Deterministic hash-based assignment
    const hashInput = `${experiment.name}:${userId}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = ((hash << 5) - hash + hashInput.charCodeAt(i)) | 0;
    }
    const normalized = Math.abs(hash) % 100;

    let variant: string;
    if (normalized >= experiment.trafficPercent) {
      variant = 'holdout'; // Not in experiment
    } else {
      // Distribute evenly across variants
      const variantIndex = Math.floor((normalized / experiment.trafficPercent) * experiment.variants.length);
      variant = experiment.variants[Math.min(variantIndex, experiment.variants.length - 1)];
    }

    // Persist assignment (fire-and-forget)
    const waitUntil = (globalThis as any).waitUntil as ((p: Promise<any>) => void) | undefined;
    if (waitUntil) {
      waitUntil(
        env.AB_TEST_KV.put(lookupKey, variant, {
          expirationTtl: 30 * 24 * 3600, // 30 days sticky
        }),
      );
    }

    headers[`X-AB-${experiment.name}`] = variant;
    headers['X-AB-Experiment'] = (headers['X-AB-Experiment'] || '') + `${experiment.name}=${variant};`;
  }

  return headers;
}

// ─── CORS handling ──────────────────────────────────────────────

function handleCors(request: Request, env: Env): Response | null {
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    }
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value);
    }
    return new Response(null, { status: 204, headers });
  }

  return null; // Not a preflight
}

// ─── Security headers injection ──────────────────────────────────

function injectSecurityHeaders(response: Response, env: Env): void {
  const headers = new Headers(response.headers);

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
  );

  if (env.ENVIRONMENT === 'production') {
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; connect-src 'self' https://*.stripe.com https://api.paystack.co https://api.flutterwave.com https://api.intasend.com wss://;",
    );
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  } else {
    headers.set(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; frame-src 'self' https://js.stripe.com;",
    );
  }

  // Apply modified headers back
  response.headers.forEach((value, key) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });
}

// ─── Main Fetch Handler ──────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cache = caches.default;
    const startTime = Date.now();

    try {
      // ── 0. Health check bypass ──
      if (isHealthCheck(url)) {
        return fetch(request);
      }

      // ── 1. CORS preflight ──
      const corsResp = handleCors(request, env);
      if (corsResp) return corsResp;

      // ── 2. Geo-blocking / geo-routing ──
      const geo = handleGeoRouting(request, env);
      if (geo.blocked) {
        return htmlChallengeResponse(
          'Access Restricted',
          `Access from your region (${getCountryCode(request)}) is not available. If you believe this is an error, please contact support.`,
        );
      }

      // ── 3. Bot protection ──
      const botCheck = handleBotProtection(request);
      if (botCheck.challenged && botCheck.response) {
        return botCheck.response;
      }

      // ── 4. Rate limiting ──
      const rateLimitResult = await checkRateLimit(request, env);
      if (!rateLimitResult.allowed) {
        return jsonResponse(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again after ${new Date(rateLimitResult.resetAt * 1000).toISOString()}.`,
            retryAfter: rateLimitResult.resetAt,
          },
          429,
          {
            'Retry-After': rateLimitResult.resetAt.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          },
        );
      }

      // ── 5. JWT edge validation (API requests only) ──
      if (isApiRequest(url)) {
        const jwtResult = await validateJwtAtEdge(request, env);
        if (!jwtResult.valid) {
          return jsonResponse(
            {
              error: 'Unauthorized',
              message: jwtResult.error || 'Invalid authentication token',
              code: 'EDGE_AUTH_FAILURE',
            },
            401,
            { 'WWW-Authenticate': 'Bearer realm="Digital Lending OS", error="invalid_token"' },
          );
        }
      }

      // ── 6. A/B testing header injection ──
      const abHeaders = await resolveABTests(request, env);

      // ── 7. Static asset handling (cache-first) ──
      if (isStaticAsset(url)) {
        const resp = await handleStaticAsset(request, env, cache);
        // Inject geo + AB headers
        for (const [key, value] of Object.entries(geo.headers)) {
          resp.headers.set(key, value);
        }
        for (const [key, value] of Object.entries(abHeaders)) {
          resp.headers.set(key, value);
        }
        resp.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        resp.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        resp.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
        return resp;
      }

      // ── 8. API response caching (GET requests only) ──
      if (isApiRequest(url) && request.method === 'GET') {
        const cachedResp = await handleApiCaching(request, env, cache);
        if (cachedResp) {
          for (const [key, value] of Object.entries(geo.headers)) {
            cachedResp.headers.set(key, value);
          }
          for (const [key, value] of Object.entries(abHeaders)) {
            cachedResp.headers.set(key, value);
          }
          cachedResp.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
          cachedResp.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          cachedResp.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
          injectSecurityHeaders(cachedResp, env);
          return cachedResp;
        }
      }

      // ── 9. Pass-through to origin ──
      const originResp = await fetch(request);

      // Inject all edge headers on pass-through
      for (const [key, value] of Object.entries(geo.headers)) {
        originResp.headers.set(key, value);
      }
      for (const [key, value] of Object.entries(abHeaders)) {
        originResp.headers.set(key, value);
      }
      originResp.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      originResp.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      originResp.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
      originResp.headers.set('X-Cache-Status', 'BYPASS');
      originResp.headers.set('X-Edge-Processing-Time', `${Date.now() - startTime}ms`);
      originResp.headers.set('X-Edge-Worker', 'digital-lending-os-edge');
      originResp.headers.set('Vary', 'Authorization, X-Tenant-ID');

      injectSecurityHeaders(originResp, env);

      return originResp;
    } catch (error) {
      // Edge worker error — fail open to origin
      console.error('[EDGE] Worker error:', error);

      try {
        const originResp = await fetch(request);
        originResp.headers.set('X-Cache-Status', 'BYPASS');
        originResp.headers.set('X-Edge-Error', 'worker-exception');
        return originResp;
      } catch {
        return jsonResponse(
          {
            error: 'Service Unavailable',
            message: 'The service is temporarily unavailable. Please try again.',
            code: 'EDGE_WORKER_FAILURE',
          },
          503,
          { 'Retry-After': '30' },
        );
      }
    }
  },
};
