/**
 * Integration tests — require running dev server on localhost:3000
 * Tests for 6 new API routes: analytics, settings, reports, roles, notifications, subscriptions
 * Run: npx vitest run __tests__/api/new-routes.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000'
let cachedCookies: string | null = null

async function login(): Promise<string> {
  if (cachedCookies) return cachedCookies
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: allCookies.join('; ') },
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

function authHeaders(cookies: string) { return { headers: { Cookie: cookies } } }

function expect401(path: string) {
  it(`GET ${path} returns 401 without auth`, async () => {
    const res = await fetch(`${BASE}${path}`)
    expect(res.status).toBe(401)
  })
}

describe('New API Routes — Auth Protection', () => {
  expect401('/api/analytics')
  expect401('/api/settings')
  expect401('/api/reports')
  expect401('/api/roles')
  expect401('/api/notifications')
  expect401('/api/subscriptions')
})

describe('New API Routes — Authenticated', () => {
  let cookies: string
  beforeAll(async () => { cookies = await login() })

  describe('GET /api/analytics', () => {
    it('returns analytics summary', async () => {
      const res = await fetch(`${BASE}/api/analytics`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.period).toBeDefined()
      expect(d.summary).toBeDefined()
      expect(typeof d.summary.totalPaymentVolume).toBe('number')
      expect(typeof d.summary.transactionCount).toBe('number')
      expect(typeof d.summary.walletBalance).toBe('number')
    })
  })

  describe('GET /api/settings', () => {
    it('returns tenant settings', async () => {
      const res = await fetch(`${BASE}/api/settings`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.name).toBeTruthy()
      expect(d.plan).toBeTruthy()
      expect(d.features).toBeDefined()
    })
  })

  describe('GET /api/roles', () => {
    it('returns role definitions with user counts', async () => {
      const res = await fetch(`${BASE}/api/roles`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(Array.isArray(d)).toBe(true)
      expect(d.length).toBe(5)
      for (const r of d) {
        expect(r.role).toBeTruthy()
        expect(r.label).toBeTruthy()
        expect(typeof r.userCount).toBe('number')
      }
    })
  })

  describe('GET /api/notifications', () => {
    it('returns notifications with counts', async () => {
      const res = await fetch(`${BASE}/api/notifications`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.totalCount).toBeGreaterThanOrEqual(0)
      expect(d.unreadCount).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(d.data)).toBe(true)
    })
  })

  describe('GET /api/subscriptions', () => {
    it('returns subscriptions with business info', async () => {
      const res = await fetch(`${BASE}/api/subscriptions`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(Array.isArray(d)).toBe(true)
      if (d.length > 0) {
        expect(d[0].planName).toBeTruthy()
        expect(d[0].business).toBeDefined()
        expect(d[0].business.name).toBeTruthy()
      }
    })
  })

  describe('GET /api/reports', () => {
    it('returns summary report by default', async () => {
      const res = await fetch(`${BASE}/api/reports`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.type).toBe('summary')
      expect(d.data).toBeDefined()
      expect(d.data.escrow).toBeDefined()
      expect(d.data.wallets).toBeDefined()
      expect(d.data.invoices).toBeDefined()
    })

    it('returns invoice report with type=invoices', async () => {
      const res = await fetch(`${BASE}/api/reports?type=invoices`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.type).toBe('invoices')
      expect(Array.isArray(d.data)).toBe(true)
    })
  })
})