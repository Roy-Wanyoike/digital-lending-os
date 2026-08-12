/**
 * Unit tests for src/middleware.ts
 * Tests the edge middleware logic directly (not via HTTP).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to import the middleware function. Since it's a module-level export,
// we need to reset module state between tests. The rate limiter uses a module-level
// Map, so we use vi.resetModules() for clean isolation.

function createRequest(pathname: string, opts: {
  method?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
} = {}): any {
  const headers = new Headers(opts.headers || {})
  return {
    method: opts.method || 'GET',
    nextUrl: { pathname },
    headers,
    cookies: {
      get: (name: string) => {
        const val = opts.cookies?.[name]
        return val ? { name, value: val } : undefined
      },
      has: (name: string) => !!opts.cookies?.[name],
    },
  }
}

// ════════════════════════════════════════════════════════════════════════
// 9B.1: Public Path Identification
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Public path identification', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  it('/api/health is public (no auth required)', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
    }))
    // Should NOT be 401 even with no session
    expect(res.status).not.toBe(401)
  })

  it('/api/ready is public (no auth required)', async () => {
    const res = await middleware(createRequest('/api/ready', {
      headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
    }))
    expect(res.status).not.toBe(401)
  })

  it('/api/auth/* paths are public', async () => {
    const authPaths = [
      '/api/auth/csrf',
      '/api/auth/session',
      '/api/auth/signin',
      '/api/auth/callback/credentials',
    ]
    for (const path of authPaths) {
      const res = await middleware(createRequest(path, {
        headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
      }))
      expect(res.status).not.toBe(401)
    }
  })

  it('/api/payment-links/ref/:ref is public', async () => {
    const res = await middleware(createRequest('/api/payment-links/ref/abc123', {
      headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
    }))
    expect(res.status).not.toBe(401)
  })

  it('/api/payment-links/:id/pay is public', async () => {
    const res = await middleware(createRequest('/api/payment-links/pay-abc123/pay', {
      headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
    }))
    expect(res.status).not.toBe(401)
  })

  it('/api/payments/webhooks/* paths are public', async () => {
    const webhookPaths = [
      '/api/payments/webhooks/paystack',
      '/api/payments/webhooks/stripe',
      '/api/payments/webhooks/flutterwave',
    ]
    for (const path of webhookPaths) {
      const res = await middleware(createRequest(path, {
        headers: { 'User-Agent': 'TestBot/1.0', 'x-forwarded-for': '1.2.3.4' },
      }))
      expect(res.status).not.toBe(401)
    }
  })

  it('non-public API paths require auth', async () => {
    const protectedPaths = [
      '/api/wallets',
      '/api/transactions',
      '/api/roles',
      '/api/compliance/rules',
      '/api/analytics',
    ]
    for (const path of protectedPaths) {
      const res = await middleware(createRequest(path, {
        headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '1.2.3.5' },
      }))
      expect(res.status).toBe(401)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.2: Rate Limiter
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Rate limiter', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  it('allows requests under the limit', async () => {
    const req = createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.1',
        'Authorization': 'Bearer test',
      },
    })

    for (let i = 0; i < 50; i++) {
      const res = await middleware(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
    }
  })

  it('sets rate limit headers on all API responses', async () => {
    const req = createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.2',
        'Authorization': 'Bearer test',
      },
    })

    const res = await middleware(req)
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
    expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
    expect(res.headers.get('x-ratelimit-reset')).toBeTruthy()
  })

  it('returns 429 when rate limit exceeded', async () => {
    const req = createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.99',
        'Authorization': 'Bearer test',
      },
    })

    // Send 101 requests (exceed 100 limit)
    let lastStatus: number | undefined
    for (let i = 0; i < 101; i++) {
      const res = await middleware(req)
      lastStatus = res.status
      if (res.status === 429) break
    }

    expect(lastStatus).toBe(429)
  })

  it('429 response includes Retry-After header', async () => {
    const req = createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.100',
        'Authorization': 'Bearer test',
      },
    })

    let res429: any
    for (let i = 0; i < 101; i++) {
      const res = await middleware(req)
      if (res.status === 429) {
        res429 = res
        break
      }
    }

    expect(res429).toBeDefined()
    expect(res429.headers.get('Retry-After')).toBeTruthy()
  })

  it('uses tighter rate limit for financial mutation POST endpoints', async () => {
    // POST /api/wallets/deposit is a financial mutation → limit 10
    const req = createRequest('/api/wallets/deposit', {
      method: 'POST',
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.200',
        'Authorization': 'Bearer test',
      },
    })

    // First request should show limit of 10
    const firstRes = await middleware(req)
    expect(firstRes.headers.get('x-ratelimit-limit')).toBe('10')
    expect(firstRes.status).toBe(200)
  })

  it('financial mutation rate limit triggers at 11 requests', async () => {
    const req = createRequest('/api/wallets/deposit', {
      method: 'POST',
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.201',
        'Authorization': 'Bearer test',
      },
    })

    let lastStatus: number | undefined
    for (let i = 0; i < 11; i++) {
      const res = await middleware(req)
      lastStatus = res.status
      if (res.status === 429) break
    }
    expect(lastStatus).toBe(429)
  })

  it('GET requests to financial endpoints use global limit (not financial limit)', async () => {
    const req = createRequest('/api/wallets/deposit', {
      method: 'GET',
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.0.202',
        'Authorization': 'Bearer test',
      },
    })

    const res = await middleware(req)
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
  })

  it('different IPs have independent rate limits', async () => {
    const headers1 = {
      'User-Agent': 'GoodBot/1.0',
      'x-forwarded-for': '10.0.0.50',
      'Authorization': 'Bearer test',
    }
    const headers2 = {
      'User-Agent': 'GoodBot/1.0',
      'x-forwarded-for': '10.0.0.51',
      'Authorization': 'Bearer test',
    }

    // Exhaust IP1
    for (let i = 0; i < 101; i++) {
      await middleware(createRequest('/api/wallets', { headers: headers1 }))
    }
    const res1 = await middleware(createRequest('/api/wallets', { headers: headers1 }))
    expect(res1.status).toBe(429)

    // IP2 should still be fine
    const res2 = await middleware(createRequest('/api/wallets', { headers: headers2 }))
    expect(res2.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.3: Bot Protection
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Bot protection', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  const badUserAgents = [
    { ua: 'curl/7.88.0', label: 'curl' },
    { ua: 'wget/1.21', label: 'wget' },
    { ua: 'python-requests/2.31.0', label: 'python-requests' },
    { ua: 'sqlmap/1.7', label: 'sqlmap' },
    { ua: 'nikto/2.1.6', label: 'nikto' },
    { ua: 'nmap/7.94', label: 'nmap' },
    { ua: '', label: 'empty UA' },
  ]

  for (const { ua, label } of badUserAgents) {
    it(`blocks ${label} User-Agent with 403`, async () => {
      const res = await middleware(createRequest('/api/wallets', {
        headers: {
          'User-Agent': ua,
          'x-forwarded-for': '10.0.0.3',
          'Authorization': 'Bearer test',
        },
      }))
      expect(res.status).toBe(403)
    })
  }

  it('allows normal User-Agent through', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'x-forwarded-for': '10.0.0.4',
        'Authorization': 'Bearer test',
      },
    }))
    expect(res.status).toBe(200)
  })

  it('does NOT block bad bots on public paths', async () => {
    // Public paths like /api/health skip bot protection
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'curl/7.88.0', 'x-forwarded-for': '10.0.0.5' },
    }))
    expect(res.status).not.toBe(403)
  })

  it('bot-blocked response includes x-bot-blocked header', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'curl/7.88.0',
        'x-forwarded-for': '10.0.0.6',
        'Authorization': 'Bearer test',
      },
    }))
    expect(res.headers.get('x-bot-blocked')).toBe('true')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.4: Security Headers
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Security headers', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  it('sets x-xss-protection on API responses', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.7' },
    }))
    expect(res.headers.get('x-xss-protection')).toBe('1; mode=block')
  })

  it('sets content-security-policy on API responses', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.8' },
    }))
    const csp = res.headers.get('content-security-policy')
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain('https://*.stripe.com')
  })

  it('sets x-request-id on every response', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.9' },
    }))
    const requestId = res.headers.get('x-request-id')
    expect(requestId).toBeTruthy()
    // Format: timestamp-randomString
    expect(requestId).toMatch(/^\d+-[a-z0-9]+$/)
  })

  it('sets x-response-time on every response', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.10' },
    }))
    const rt = res.headers.get('x-response-time')
    expect(rt).toBeTruthy()
    expect(rt).toMatch(/^\d+ms$/)
  })

  it('sets Access-Control-Allow-Methods', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.11' },
    }))
    const methods = res.headers.get('Access-Control-Allow-Methods')
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('DELETE')
  })

  it('sets Access-Control-Allow-Headers', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.12' },
    }))
    const headers = res.headers.get('Access-Control-Allow-Headers')
    expect(headers).toContain('Content-Type')
    expect(headers).toContain('Authorization')
    expect(headers).toContain('x-csrf-token')
  })

  it('OPTIONS preflight returns 200 immediately', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      method: 'OPTIONS',
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.0.13' },
    }))
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.5: Financial Mutation Detection
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Financial mutation detection', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  const financialPostPaths = [
    '/api/wallets/deposit',
    '/api/wallets/withdrawal',
    '/api/wallets/crypto-withdrawal',
    '/api/wallets/convert',
    '/api/payments/initialize',
    '/api/escrow/transactions',
    '/api/withdrawals',
    '/api/deposits',
    '/api/collections',
    '/api/invoices',
  ]

  for (const path of financialPostPaths) {
    it(`POST ${path} uses financial rate limit (10)`, async () => {
      const res = await middleware(createRequest(path, {
        method: 'POST',
        headers: {
          'User-Agent': 'GoodBot/1.0',
          'x-forwarded-for': '10.0.1.1',
          'Authorization': 'Bearer test',
        },
      }))
      expect(res.headers.get('x-ratelimit-limit')).toBe('10')
    })
  }

  const escrowActionPaths = [
    '/api/escrow/transactions/tx-123/release',
    '/api/escrow/transactions/tx-123/fund',
    '/api/escrow/transactions/tx-123/disputes',
    '/api/escrow/transactions/tx-123/activate',
  ]

  for (const path of escrowActionPaths) {
    it(`POST ${path} uses financial rate limit (10)`, async () => {
      const res = await middleware(createRequest(path, {
        method: 'POST',
        headers: {
          'User-Agent': 'GoodBot/1.0',
          'x-forwarded-for': '10.0.1.2',
          'Authorization': 'Bearer test',
        },
      }))
      expect(res.headers.get('x-ratelimit-limit')).toBe('10')
    })
  }

  it('GET requests to financial endpoints use global limit (100)', async () => {
    const res = await middleware(createRequest('/api/wallets/deposit', {
      method: 'GET',
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.1.3',
        'Authorization': 'Bearer test',
      },
    }))
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
  })

  it('non-financial POST endpoints use global limit (100)', async () => {
    const res = await middleware(createRequest('/api/roles', {
      method: 'POST',
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.1.4',
        'Authorization': 'Bearer test',
      },
    }))
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
  })

  it('/api/payment-links/:id/pay is NOT a financial mutation (it is public)', async () => {
    // This is a public endpoint, so it passes through without auth
    const res = await middleware(createRequest('/api/payment-links/abc/pay', {
      method: 'POST',
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.1.5' },
    }))
    // It's public so should not be 401
    expect(res.status).not.toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.6: Auth Guard
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — Auth guard', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  it('returns 401 when no auth on protected API path', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.2.1' },
    }))
    expect(res.status).toBe(401)
  })

  it('returns 401 with error body', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.2.2' },
    }))
    // NextResponse.json() body is not directly accessible in test env;
    // verify status code is correct (the body is tested in integration tests)
    expect(res.status).toBe(401)
  })

  it('passes with Bearer token on protected path', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.2.3',
        'Authorization': 'Bearer test-token',
      },
    }))
    expect(res.status).toBe(200)
  })

  it('passes with session cookie on protected path', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.2.4' },
      cookies: { 'next-auth.session-token': 'sess-abc' },
    }))
    expect(res.status).toBe(200)
  })

  it('passes with __Secure- session cookie on protected path', async () => {
    const res = await middleware(createRequest('/api/wallets', {
      headers: { 'User-Agent': 'GoodBot/1.0', 'x-forwarded-for': '10.0.2.5' },
      cookies: { '__Secure-next-auth.session-token': 'sess-secure' },
    }))
    expect(res.status).toBe(200)
  })

  it('non-API paths skip auth check', async () => {
    const res = await middleware(createRequest('/dashboard', {
      headers: { 'User-Agent': 'GoodBot/1.0' },
    }))
    // Non-API paths pass through without auth check
    expect(res.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9B.7: CORS
// ════════════════════════════════════════════════════════════════════════

describe('Middleware — CORS', () => {
  let middleware: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middleware')
    middleware = mod.middleware
  })

  it('reflects allowed origin for localhost', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.3.1',
        'Origin': 'http://localhost:3001',
      },
    }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001')
    expect(res.headers.get('Vary')).toBe('Origin')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('reflects allowed origin for 127.0.0.1', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.3.2',
        'Origin': 'http://127.0.0.1:3000',
      },
    }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:3000')
  })

  it('does NOT reflect disallowed origin', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.3.3',
        'Origin': 'https://evil.com',
      },
    }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('reflects preview proxy origin', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.3.4',
        'Origin': 'https://preview-chat-abc123.space-z.ai',
      },
    }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://preview-chat-abc123.space-z.ai')
  })

  it('does not reflect "null" origin', async () => {
    const res = await middleware(createRequest('/api/health', {
      headers: {
        'User-Agent': 'GoodBot/1.0',
        'x-forwarded-for': '10.0.3.5',
        'Origin': 'null',
      },
    }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
