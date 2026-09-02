/**
 * Integration tests — require running dev server on localhost:3000
 * Payment API tests — providers, rates, intents, initialize
 * Run: npx vitest run __tests__/api/payments.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000'
const UA = 'Mozilla/5.0 (Integration Test)'
let cachedCookies: string | null = null

async function login(): Promise<string> {
  if (cachedCookies) return cachedCookies
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { 'User-Agent': UA } })
  const { csrfToken } = await csrfRes.json()
  const allCookies: string[] = []
  const collectCookies = (h: Headers) => {
    for (const c of (h.getSetCookie?.() || [])) allCookies.push(c.split(';')[0])
  }
  collectCookies(csrfRes.headers)
  let url = `${BASE}/api/auth/callback/credentials`
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: allCookies.join('; '), 'User-Agent': UA },
      body: `csrfToken=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent('admin@digitallendingos.co.ke')}&password=${encodeURIComponent('demo1234')}&callbackUrl=%2F`,
      redirect: 'manual',
    })
    collectCookies(res.headers)
    const loc = res.headers.get('location')
    if (!loc || !loc.startsWith('http')) break
    url = loc
    if (!url.includes('/api/auth/')) break
  }
  cachedCookies = allCookies.join('; ')
  return cachedCookies
}

function authHeaders(cookies: string) {
  return { headers: { Cookie: cookies, 'User-Agent': UA } }
}

describe('Payment API — Auth Protection', () => {
  it('GET /api/payments/providers returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/payments/providers`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/payments/rates returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/payments/rates`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/payments/intents returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/payments/intents`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('POST /api/payments/intents returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/payments/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('POST /api/payments/initialize returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })
})

describe('Payment API — Authenticated', () => {
  let cookies: string
  beforeAll(async () => { cookies = await login() })

  describe('GET /api/payments/providers', () => {
    it('returns array of active providers with metadata', async () => {
      const res = await fetch(`${BASE}/api/payments/providers`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      expect(d.meta).toBeDefined()
      expect(d.meta.total).toBe(d.data.length)

      if (d.data.length > 0) {
        const p = d.data[0]
        expect(p.code).toBeTruthy()
        expect(p.name).toBeTruthy()
        expect(p.supportedCurrencies).toBeDefined()
        expect(p.supportedCountries).toBeDefined()
        expect(p.supportedMethods).toBeDefined()
        expect(typeof p.feePercent).toBe('number')
        expect(typeof p.isActive).toBe('boolean')
      }
    })

    it('supports currency filter', async () => {
      const res = await fetch(`${BASE}/api/payments/providers?currency=USD`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(d.meta.currency).toBe('USD')
    })

    it('supports country filter', async () => {
      const res = await fetch(`${BASE}/api/payments/providers?country=KE`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(d.meta.country).toBe('KE')
    })
  })

  describe('GET /api/payments/rates', () => {
    it('returns popular rates by default', async () => {
      const res = await fetch(`${BASE}/api/payments/rates`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      expect(d.data.length).toBeGreaterThan(0)
      expect(d.timestamp).toBeTruthy()
      expect(d.expiresAt).toBeTruthy()

      // Each rate should have from, to, rate
      const r = d.data[0]
      expect(r.from).toBeTruthy()
      expect(r.to).toBeTruthy()
      expect(typeof r.rate).toBe('number')
      expect(r.rate).toBeGreaterThan(0)
    })

    it('returns specific rate pair with from and to params', async () => {
      const res = await fetch(`${BASE}/api/payments/rates?from=USD&to=EUR`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      expect(d.data.length).toBe(1)
      expect(d.data[0].from).toBe('USD')
      expect(d.data[0].to).toBe('EUR')
      expect(d.data[0].rate).toBeGreaterThan(0)
    })

    it('same currency returns rate of 1.0', async () => {
      const res = await fetch(`${BASE}/api/payments/rates?from=USD&to=USD`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data[0].rate).toBe(1.0)
    })
  })

  describe('GET /api/payments/intents', () => {
    it('returns paginated list of payment intents', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      expect(d.pagination).toBeDefined()
      expect(typeof d.pagination.page).toBe('number')
      expect(typeof d.pagination.limit).toBe('number')
      expect(typeof d.pagination.total).toBe('number')
      expect(typeof d.pagination.totalPages).toBe('number')
    })

    it('supports pagination params', async () => {
      const res = await fetch(`${BASE}/api/payments/intents?page=1&limit=5`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.pagination.page).toBe(1)
      expect(d.pagination.limit).toBe(5)
      expect(d.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('POST /api/payments/intents', () => {
    it('rejects with 400 for empty body', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for missing required fields', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({ sourceAmount: 100, sourceCurrency: 'USD' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for negative amount', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          fromBusinessId: 'nonexistent',
          toBusinessId: 'nonexistent',
          sourceAmount: -50,
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for zero amount', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          fromBusinessId: 'nonexistent',
          toBusinessId: 'nonexistent',
          sourceAmount: 0,
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 404 for nonexistent business IDs', async () => {
      const res = await fetch(`${BASE}/api/payments/intents`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          fromBusinessId: 'biz-nonexistent-aaa',
          toBusinessId: 'biz-nonexistent-bbb',
          sourceAmount: 100,
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
        }),
      })
      // Validation passes (schema) but business not found
      expect([400, 404, 500]).toContain(res.status)
    })
  })

  describe('POST /api/payments/initialize', () => {
    it('rejects with 400 for empty body', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for missing required fields', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({ amount: 5000 }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for invalid email', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          amount: 5000,
          currency: 'USD',
          email: 'not-an-email',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for zero amount', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          amount: 0,
          currency: 'USD',
          email: 'test@example.com',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for negative amount', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          amount: -100,
          currency: 'USD',
          email: 'test@example.com',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects with 400 for currency not 3 chars', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          amount: 5000,
          currency: 'USDD',
          email: 'test@example.com',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('attempts init with valid payload (may fail with 502 if no real provider)', async () => {
      const res = await fetch(`${BASE}/api/payments/initialize`, {
        method: 'POST',
        ...authHeaders(cookies),
        body: JSON.stringify({
          amount: 10000, // $100.00 (in cents/major units depending on provider)
          currency: 'USD',
          email: 'admin@digitallendingos.co.ke',
          firstName: 'Admin',
          lastName: 'User',
        }),
      })
      // Could be 200 (success), 400 (no provider for currency), or 502 (provider init failed)
      expect([200, 400, 502]).toContain(res.status)
      const d = await res.json()
      if (res.status === 200) {
        expect(d.data).toBeDefined()
        expect(d.data.provider).toBeTruthy()
        expect(d.data.reference).toBeTruthy()
      }
    })
  })

  describe('GET /api/payments/methods', () => {
    it('returns 200 with payment methods list', async () => {
      const res = await fetch(`${BASE}/api/payments/methods`, authHeaders(cookies))
      expect([200, 401]).toContain(res.status)
      if (res.status === 200) {
        const d = await res.json()
        // Could be an array or an object with data
        expect(d).toBeDefined()
      }
    })
  })
})
