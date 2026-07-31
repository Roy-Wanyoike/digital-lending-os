/**
 * Integration tests — require running dev server on localhost:3000
 * Middleware security tests — public routes, auth guard, bot protection, response headers
 * Run: npx vitest run __tests__/api/middleware.test.ts
 */
import { describe, it, expect } from 'vitest'

const BASE = 'http://localhost:3000'
const UA = 'Mozilla/5.0 (Integration Test)'

// Helper: fetch with standard User-Agent to avoid bot block
function fetchWithUA(path: string, opts: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'User-Agent': UA, ...opts.headers },
  })
}

describe('Middleware — Public routes', () => {
  it('GET /api/health returns 200 with valid User-Agent', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.checks).toBeDefined()
    expect(data.checks.database).toBe('ok')
    expect(data.timestamp).toBeTruthy()
  })

  it('GET /api/ready returns 200 with valid User-Agent', async () => {
    const res = await fetchWithUA('/api/ready')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ready).toBe(true)
    expect(data.db).toBe('connected')
  })

  it('GET /api/auth/csrf is public and returns 200', async () => {
    const res = await fetchWithUA('/api/auth/csrf')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.csrfToken).toBeTruthy()
  })

  it('GET /api/auth/session is public and returns 200', async () => {
    const res = await fetchWithUA('/api/auth/session')
    expect(res.status).toBe(200)
    // No session cookie sent, so body should be empty or have no user
    const data = await res.json()
    expect(data.user).toBeUndefined()
  })
})

describe('Middleware — Auth guard (protected routes)', () => {
  it('GET /api/wallets returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/wallets')
    expect(res.status).toBe(401)
  })

  it('GET /api/transactions returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/transactions')
    expect(res.status).toBe(401)
  })

  it('GET /api/deposits returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/deposits')
    expect(res.status).toBe(401)
  })

  it('GET /api/withdrawals returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/withdrawals')
    expect(res.status).toBe(401)
  })

  it('GET /api/invoices returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/invoices')
    expect(res.status).toBe(401)
  })

  it('GET /api/referral returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/referral')
    expect(res.status).toBe(401)
  })

  it('GET /api/analytics returns 401 without auth', async () => {
    const res = await fetchWithUA('/api/analytics')
    expect(res.status).toBe(401)
  })
})

describe('Middleware — Response headers', () => {
  it('GET /api/health includes x-request-id header (UUID v4)', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const requestId = res.headers.get('x-request-id')
    expect(requestId).toBeTruthy()
    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('GET /api/health includes x-ratelimit-limit header', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const limit = res.headers.get('x-ratelimit-limit')
    expect(limit).toBeTruthy()
    expect(Number(limit)).toBeGreaterThan(0)
  })

  it('GET /api/health includes x-ratelimit-remaining header', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const remaining = res.headers.get('x-ratelimit-remaining')
    expect(remaining).toBeTruthy()
    expect(Number(remaining)).toBeGreaterThanOrEqual(0)
  })

  it('GET /api/health includes x-ratelimit-reset header', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const reset = res.headers.get('x-ratelimit-reset')
    expect(reset).toBeTruthy()
    expect(Number(reset)).toBeGreaterThan(0)
  })

  it('GET /api/health includes x-response-time header (ms format)', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.status).toBe(200)
    const responseTime = res.headers.get('x-response-time')
    expect(responseTime).toBeTruthy()
    expect(responseTime).toMatch(/^\d+ms$/)
  })

  it('GET /api/health includes standard security headers', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('x-xss-protection')).toBe('1; mode=block')
  })

  it('GET /api/health includes CORS headers', async () => {
    const res = await fetchWithUA('/api/health')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })

  it('each request gets a unique x-request-id', async () => {
    const [r1, r2] = await Promise.all([
      fetchWithUA('/api/health'),
      fetchWithUA('/api/health'),
    ])
    expect(r1.headers.get('x-request-id')).not.toBe(r2.headers.get('x-request-id'))
  })
})

describe('Middleware — Bot protection', () => {
  it('empty User-Agent on /api/health returns 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': '' },
    })
    expect(res.status).toBe(403)
  })

  it('curl User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'curl/7.88.0' },
    })
    expect(res.status).toBe(403)
  })

  it('wget User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'wget/1.21' },
    })
    expect(res.status).toBe(403)
  })

  it('python-requests User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'python-requests/2.31.0' },
    })
    expect(res.status).toBe(403)
  })

  it('sqlmap User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'sqlmap/1.7' },
    })
    expect(res.status).toBe(403)
  })

  it('nikto User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'nikto/2.1.6' },
    })
    expect(res.status).toBe(403)
  })

  it('nmap User-Agent is blocked with 403', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': 'nmap/7.94' },
    })
    expect(res.status).toBe(403)
  })

  it('bot block response includes error body', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { 'User-Agent': '' },
    })
    const data = await res.json()
    expect(data.error).toBe('Forbidden')
  })
})

describe('Middleware — Rate limit headers on 401 responses', () => {
  it('401 response includes rate limit headers', async () => {
    const res = await fetchWithUA('/api/wallets')
    expect(res.status).toBe(401)
    expect(res.headers.get('x-ratelimit-limit')).toBeTruthy()
    expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
    expect(res.headers.get('x-response-time')).toBeTruthy()
  })
})

// Note: Rate limit 429 response is difficult to test in integration tests
// because it requires exceeding 100 requests/min per IP. The middleware
// implements a sliding window rate limiter (100 req/min) that returns 429
// with a Retry-After header when exceeded.
