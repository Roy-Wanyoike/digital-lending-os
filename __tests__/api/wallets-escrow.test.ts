/**
 * Integration tests — require running dev server on localhost:3000
 * Wallet, Escrow, Invoices, Deposits, Withdrawals, Referral API tests
 * Run: npx vitest run __tests__/api/wallets-escrow.test.ts
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
      body: `csrfToken=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent('admin@youngsend.com')}&password=${encodeURIComponent('demo1234')}&callbackUrl=%2F`,
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

// ── Auth protection checks ──────────────────────────────────────
describe('Wallet & Escrow API — Auth Protection', () => {
  it('GET /api/wallets returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/wallets`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/wallets/rates returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/wallets/rates`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/escrow/transactions returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/escrow/transactions`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/invoices returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/invoices`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/deposits returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/deposits`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/withdrawals returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/withdrawals`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/referral returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/referral`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })

  it('GET /api/referral/bonuses returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/referral/bonuses`, { headers: { 'User-Agent': UA } })
    expect(res.status).toBe(401)
  })
})

// ── Authenticated wallet & escrow tests ──────────────────────────
describe('Wallet & Escrow API — Authenticated', () => {
  let cookies: string
  beforeAll(async () => { cookies = await login() })

  describe('GET /api/wallets', () => {
    it('returns wallets array', async () => {
      const res = await fetch(`${BASE}/api/wallets`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const data = await res.json()
      // Wallets returns a bare array or { data: [...] }
      const wallets = Array.isArray(data) ? data : data.data
      expect(Array.isArray(wallets)).toBe(true)

      if (wallets.length > 0) {
        const w = wallets[0]
        expect(w.id).toBeTruthy()
        expect(w.currency).toBeTruthy()
        expect(typeof w.balance).toBe('number')
        expect(w.businessId).toBeTruthy()
      }
    })
  })

  describe('GET /api/wallets/rates', () => {
    it('returns exchange rate data with all rate types', async () => {
      const res = await fetch(`${BASE}/api/wallets/rates`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()

      // Fiat rates matrix
      expect(d.data.fiatRates).toBeDefined()
      expect(typeof d.data.fiatRates).toBe('object')
      // Should have at least USD and EUR keys
      expect(d.data.fiatRates.USD).toBeDefined()
      expect(d.data.fiatRates.EUR).toBeDefined()

      // Crypto prices
      expect(d.data.cryptoPrices).toBeDefined()
      expect(d.data.cryptoPrices.USDT).toBe(1.0)
      expect(d.data.cryptoPrices.BTC).toBeGreaterThan(0)
      expect(d.data.cryptoPrices.ETH).toBeGreaterThan(0)

      // Fiat-to-USD conversion rates
      expect(d.data.fiatToUsd).toBeDefined()
      expect(d.data.fiatToUsd.USD).toBe(1)

      // Network fees
      expect(d.data.networkFees).toBeDefined()
      expect(typeof d.data.networkFees.trc20).toBe('number')

      // Crypto networks
      expect(d.data.cryptoNetworks).toBeDefined()
      expect(d.data.cryptoNetworks.USDT).toBeDefined()
      expect(Array.isArray(d.data.cryptoNetworks.USDT)).toBe(true)

      // Fee configuration
      expect(typeof d.data.conversionFeePercent).toBe('number')
      expect(typeof d.data.withdrawalFeePercent).toBe('number')
      expect(typeof d.data.withdrawalFlatFee).toBe('number')
    })
  })

  describe('GET /api/escrow/transactions', () => {
    it('returns paginated escrow transactions list', async () => {
      const res = await fetch(`${BASE}/api/escrow/transactions`, authHeaders(cookies))
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
      const res = await fetch(`${BASE}/api/escrow/transactions?page=1&limit=5`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.pagination.page).toBe(1)
      expect(d.pagination.limit).toBe(5)
      expect(d.data.length).toBeLessThanOrEqual(5)
    })

    it('supports status filter', async () => {
      const res = await fetch(`${BASE}/api/escrow/transactions?status=pending`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      // All returned items should match the filter (if any exist)
      for (const tx of d.data) {
        expect(tx.status).toBe('pending')
      }
    })
  })

  describe('GET /api/invoices', () => {
    it('returns invoice data', async () => {
      const res = await fetch(`${BASE}/api/invoices`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(d.data.invoices).toBeDefined()
      expect(Array.isArray(d.data.invoices)).toBe(true)
    })
  })

  describe('GET /api/deposits', () => {
    it('returns deposits with pagination', async () => {
      const res = await fetch(`${BASE}/api/deposits`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      // Response uses ok() helper which includes pagination in meta
      expect(d.meta).toBeDefined()
    })
  })

  describe('GET /api/withdrawals', () => {
    it('returns withdrawals with pagination', async () => {
      const res = await fetch(`${BASE}/api/withdrawals`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.withdrawals).toBeDefined()
      expect(Array.isArray(d.withdrawals)).toBe(true)
      expect(d.pagination).toBeDefined()
      expect(typeof d.pagination.total).toBe('number')
    })
  })

  describe('GET /api/referral', () => {
    it('returns referral data with code and stats', async () => {
      const res = await fetch(`${BASE}/api/referral`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(d.data.referralCode).toBeTruthy()
      expect(d.data.referralLink).toBeTruthy()
      expect(typeof d.data.bonusAmount).toBe('number')
      expect(d.data.bonusCurrency).toBeTruthy()
      expect(d.data.stats).toBeDefined()
      expect(typeof d.data.stats.totalReferred).toBe('number')
      expect(typeof d.data.stats.totalBonusEarned).toBe('number')
      expect(typeof d.data.stats.activeBonusCount).toBe('number')
    })
  })

  describe('GET /api/referral/bonuses', () => {
    it('returns referral bonuses with pagination', async () => {
      const res = await fetch(`${BASE}/api/referral/bonuses`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
      expect(d.pagination).toBeDefined()
      expect(typeof d.pagination.total).toBe('number')
      expect(typeof d.pagination.page).toBe('number')
    })

    it('enriches bonuses with referrer/referee names', async () => {
      const res = await fetch(`${BASE}/api/referral/bonuses`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      if (d.data.length > 0) {
        const b = d.data[0]
        expect(b.referrerName).toBeDefined()
        expect(b.refereeName).toBeDefined()
      }
    })
  })

  describe('GET /api/transactions', () => {
    it('returns transaction list with data wrapper', async () => {
      const res = await fetch(`${BASE}/api/transactions`, authHeaders(cookies))
      expect(res.status).toBe(200)
      const d = await res.json()
      expect(d.data).toBeDefined()
      expect(Array.isArray(d.data)).toBe(true)
    })
  })
})
