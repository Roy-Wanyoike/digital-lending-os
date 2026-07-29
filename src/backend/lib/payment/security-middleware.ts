// --- Security Middleware for Payment Routes ---
//
// CORS configuration, Helmet-style security headers, rate limiting,
// request body size limits, user-agent validation, IP blocklist.
//

import type { NextRequest, NextResponse } from 'next/server'

// --- Types ---

export interface SecurityConfig {
  cors?: CorsConfig
  rateLimit?: RateLimitConfig
  maxBodySize?: number
  allowedUserAgentPatterns?: RegExp[]
  blockedIps?: string[]
  blockedIpRanges?: string[]
}

export interface CorsConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  exposedHeaders: string[]
  allowCredentials: boolean
  maxAge: number
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  perIp?: boolean
  perUser?: boolean
}

export interface RateLimitEntry {
  count: number
  resetAt: number
}

// --- Default Configuration ---

const DEFAULT_CORS: CorsConfig = {
  allowedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Request-ID',
    'X-Idempotency-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Idempotency-Replayed',
    'Retry-After',
  ],
  allowCredentials: true,
  maxAge: 86400,
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
  perIp: true,
  perUser: true,
}

const DEFAULT_MAX_BODY_SIZE = 1 * 1024 * 1024 // 1MB

// --- Security Headers (Helmet-style) ---

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '0', // Disabled in favor of CSP
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Request-ID': crypto.randomUUID(),
  }
}

// --- Rate Limiter ---

export class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(private cleanupMs: number = 60_000) {
    this.startCleanup()
  }

  check(key: string, config: RateLimitConfig): {
    allowed: boolean
    remaining: number
    resetAt: number
    limit: number
  } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (entry && now >= entry.resetAt) {
      this.store.delete(key)
    }

    const current = this.store.get(key)
    if (!current) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
        limit: config.maxRequests,
      }
    }

    current.count++
    if (current.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.resetAt,
        limit: config.maxRequests,
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetAt: current.resetAt,
      limit: config.maxRequests,
    }
  }

  clear(): void {
    this.store.clear()
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.store) {
        if (now >= entry.resetAt) this.store.delete(key)
      }
    }, this.cleanupMs)
    if (this.cleanupInterval.unref) this.cleanupInterval.unref()
  }
}

const rateLimiter = new InMemoryRateLimiter()

// --- IP Blocklist ---

const blockedIpSet = new Set<string>(process.env.BLOCKED_IPS?.split(',')?.map(s => s.trim()) ?? [])

function isIpBlocked(ip: string): boolean {
  if (blockedIpSet.has(ip)) return true
  // Check against CIDR ranges (simplified: only exact matches in env)
  return false
}

// --- User-Agent Validation ---

const SUSPICIOUS_UA_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /httpclient/i,
  /^\s*$/, // empty UA
]

function isUserAgentSuspicious(ua: string): boolean {
  return SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(ua))
}

// --- CORS Handler ---

export function handleCors(request: NextRequest, config: CorsConfig = DEFAULT_CORS): NextResponse | null {
  const origin = request.headers.get('origin') ?? ''
  const isAllowed = config.allowedOrigins.includes('*') || config.allowedOrigins.includes(origin)

  // Handle preflight
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
      'Access-Control-Max-Age': config.maxAge.toString(),
      'Access-Control-Expose-Headers': config.exposedHeaders.join(', '),
    }
    if (isAllowed && origin) {
      headers['Access-Control-Allow-Origin'] = origin
    }
    if (config.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
    return new NextResponse(null, { status: 204, headers })
  }

  return null // not a preflight, continue processing
}

// --- Secure Payment Handler HOF ---

type PaymentHandler = (req: NextRequest, ctx?: { params?: Record<string, string> }) => Promise<NextResponse>

export interface SecurePaymentHandlerOptions {
  config?: SecurityConfig
  skipAuth?: boolean
  skipRateLimit?: boolean
}

export function securePaymentHandler(
  handler: PaymentHandler,
  options: SecurePaymentHandlerOptions = {},
): PaymentHandler {
  const {
    config = {},
    skipAuth = false,
    skipRateLimit = false,
  } = options

  const cors = config.cors ?? DEFAULT_CORS
  const rateLimit = config.rateLimit ?? DEFAULT_RATE_LIMIT
  const maxBodySize = config.maxBodySize ?? DEFAULT_MAX_BODY_SIZE

  return async (req: NextRequest, ctx) => {
    // 1. IP Blocklist check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    if (isIpBlocked(clientIp)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'IP_BLOCKED' },
        { status: 403 },
      )
    }

    // 2. User-Agent validation (soft check - only warn, don't block for APIs)
    const ua = req.headers.get('user-agent') ?? ''
    if (isUserAgentSuspicious(ua) && req.headers.get('authorization')) {
      // Suspicious UA with auth token - potential credential stuffing
      return NextResponse.json(
        { error: 'Forbidden', code: 'SUSPICIOUS_REQUEST' },
        { status: 403 },
      )
    }

    // 3. CORS preflight handling
    const corsResponse = handleCors(req, cors)
    if (corsResponse) return corsResponse

    // 4. Request body size check
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (contentLength > maxBodySize) {
      return NextResponse.json(
        { error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' },
        { status: 413 },
      )
    }

    // 5. Rate limiting
    let rateLimitHeaders: Record<string, string> = {}
    if (!skipRateLimit) {
      const userId = req.headers.get('x-user-id') ?? ''
      const rateLimitKey = rateLimit.perUser && userId
        ? `user:${userId}`
        : `ip:${clientIp}`

      const result = rateLimiter.check(rateLimitKey, rateLimit)
      rateLimitHeaders = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
      }

      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many requests', code: 'RATE_LIMITED' },
          {
            status: 429,
            headers: {
              ...rateLimitHeaders,
              'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            },
          },
        )
      }
    }

    // 6. Execute handler
    try {
      const response = await handler(req, ctx)

      // Inject security headers and rate limit headers into response
      const securityHeaders = getSecurityHeaders()
      const newHeaders = new Headers(response.headers)
      for (const [key, value] of Object.entries({ ...securityHeaders, ...rateLimitHeaders })) {
        if (!newHeaders.has(key)) {
          newHeaders.set(key, value)
        }
      }

      // Set CORS origin header
      const origin = req.headers.get('origin') ?? ''
      if (cors.allowedOrigins.includes('*')) {
        newHeaders.set('Access-Control-Allow-Origin', '*')
      } else if (cors.allowedOrigins.includes(origin)) {
        newHeaders.set('Access-Control-Allow-Origin', origin)
        if (cors.allowCredentials) {
          newHeaders.set('Access-Control-Allow-Credentials', 'true')
        }
      }
      newHeaders.set('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '))

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (error) {
      // Don't leak internal errors
      console.error('[securePaymentHandler] Unhandled error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500, headers: rateLimitHeaders },
      )
    }
  }
}
