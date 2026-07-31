/**
 * Integration tests — require running dev server on localhost:3000
 * Auth API tests — verify session, CSRF, and login flow
 * Run: bash scripts/run-tests.sh __tests__/api/auth.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000'
let cachedCookies: string | null = null

/**
 * Login once and cache the session cookies.
 * All subsequent calls return the cached cookies.
 */
async function login(email = 'admin@youngsend.com', password = 'demo1234'): Promise<string> {
  if (cachedCookies) return cachedCookies

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const allCookies: string[] = []
  const collectCookies = (h: Headers) => {
    for (const c of (h.getSetCookie?.() || [])) {
      allCookies.push(c.split(';')[0])
    }
  }
  collectCookies(csrfRes.headers)

  let url = `${BASE}/api/auth/callback/credentials`
  for (let redirect = 0; redirect < 5; redirect++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: allCookies.join('; '),
      },
      body: `csrfToken=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&callbackUrl=%2F`,
      redirect: 'manual',
    })
    collectCookies(res.headers)
    const location = res.headers.get('location')
    if (!location || !location.startsWith('http')) break
    url = location
    if (!url.includes('/api/auth/')) break
  }

  cachedCookies = allCookies.join('; ')
  return cachedCookies
}

describe('Auth API', () => {
  describe('Unauthenticated', () => {
    it('GET /api/auth/session returns empty object', async () => {
      const res = await fetch(`${BASE}/api/auth/session`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({})
    })

    it('GET /api/auth/csrf returns a csrfToken', async () => {
      const res = await fetch(`${BASE}/api/auth/csrf`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.csrfToken).toBeTruthy()
      expect(typeof data.csrfToken).toBe('string')
      expect(data.csrfToken.length).toBeGreaterThan(10)
    })
  })

  describe('Login flow', () => {
    it('valid credentials produce authenticated session', async () => {
      const cookies = await login()
      expect(cookies.length).toBeGreaterThan(0)

      const res = await fetch(`${BASE}/api/auth/session`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('admin@youngsend.com')
      expect(data.user.role).toBe('admin')
      expect(data.user.tenantId).toBeTruthy()
      expect(data.user.accountId).toBeTruthy()
    })
  })

  describe('API auth protection', () => {
    it('GET /api/wallets returns 401 without auth', async () => {
      const res = await fetch(`${BASE}/api/wallets`)
      expect(res.status).toBe(401)
    })

    it('GET /api/dashboard/stats returns 401 without auth', async () => {
      const res = await fetch(`${BASE}/api/dashboard/stats`)
      expect(res.status).toBe(401)
    })

    it('GET /api/escrow/transactions returns 401 without auth', async () => {
      const res = await fetch(`${BASE}/api/escrow/transactions`)
      expect(res.status).toBe(401)
    })

    it('GET /api/businesses returns 401 without auth', async () => {
      const res = await fetch(`${BASE}/api/businesses`)
      expect(res.status).toBe(401)
    })

    it('GET /api/wallets returns data with auth', async () => {
      const cookies = await login()
      const res = await fetch(`${BASE}/api/wallets`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      // Wallets returns a bare array (not wrapped in { data })
      const wallets = Array.isArray(data) ? data : data.data
      expect(Array.isArray(wallets)).toBe(true)
    })

    it('GET /api/dashboard/stats returns real stats with auth', async () => {
      const cookies = await login()
      const res = await fetch(`${BASE}/api/dashboard/stats`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toBeDefined()
      expect(data.data.totalBusinesses).toBeGreaterThanOrEqual(0)
      expect(data.data.activeEscrows).toBeGreaterThanOrEqual(0)
    })

    it('GET /api/transactions returns data with auth', async () => {
      const cookies = await login()
      const res = await fetch(`${BASE}/api/transactions`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('GET /api/audit-log returns data with auth', async () => {
      const cookies = await login()
      const res = await fetch(`${BASE}/api/audit-log`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('GET /api/accounts returns data with auth (admin)', async () => {
      const cookies = await login()
      const res = await fetch(`${BASE}/api/accounts`, {
        headers: { Cookie: cookies },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThanOrEqual(1)
      // Password hash must never be exposed
      const first = data.data[0]
      expect(first).not.toHaveProperty('passwordHash')
    })
  })
})
