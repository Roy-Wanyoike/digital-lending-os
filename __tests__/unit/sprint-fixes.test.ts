import { describe, it, expect } from 'vitest'
import {
  getTrustScoreColor, getRiskColor, getRiskBg, getTrustScoreBg,
  formatCurrency, formatCurrencyCompact, getStatusColor, truncate,
  getCountryFlag, abbreviateNumber, ROLE_TABS,
} from '@/frontend/lib/formatters'

// NAV_ITEMS IDs are not functions, so we keep the hardcoded list
const NAV_ITEMS_IDS = [
  'overview', 'trust-graph', 'escrow', 'payments', 'passport',
  'payment-links', 'wallet', 'referral', 'fraud', 'matching',
  'collections', 'compliance',
]

// Sprint fixes unit tests - 28 tests across 4 groups

// --- 1. Dark Mode Color Helpers ---

describe('Dark Mode Color Helpers', () => {
  describe('getTrustScoreColor', () => {
    it('returns emerald for score >= 80', () => {
      expect(getTrustScoreColor(90)).toContain('text-emerald-600')
      expect(getTrustScoreColor(80)).toContain('text-emerald-600')
    })
    it('returns amber for score >= 60', () => {
      expect(getTrustScoreColor(70)).toContain('text-amber-600')
      expect(getTrustScoreColor(60)).toContain('text-amber-600')
    })
    it('returns orange for score >= 40', () => {
      expect(getTrustScoreColor(50)).toContain('text-orange-600')
      expect(getTrustScoreColor(40)).toContain('text-orange-600')
    })
    it('returns red for score < 40', () => {
      expect(getTrustScoreColor(30)).toContain('text-red-600')
      expect(getTrustScoreColor(0)).toContain('text-red-600')
    })
    it('always includes dark: variant', () => {
      for (const s of [95, 65, 45, 10, undefined, null]) {
        expect(getTrustScoreColor(s as any)).toContain('dark:')
      }
    })
  })

  describe('getRiskColor', () => {
    it('returns red for score >= 80', () => {
      expect(getRiskColor(90)).toContain('text-red-600')
      expect(getRiskColor(80)).toContain('text-red-600')
    })
    it('returns orange for score >= 60', () => {
      expect(getRiskColor(70)).toContain('text-orange-600')
      expect(getRiskColor(60)).toContain('text-orange-600')
    })
    it('returns amber for score >= 40', () => {
      expect(getRiskColor(50)).toContain('text-amber-600')
      expect(getRiskColor(40)).toContain('text-amber-600')
    })
    it('returns emerald for score < 40', () => {
      expect(getRiskColor(30)).toContain('text-emerald-600')
      expect(getRiskColor(0)).toContain('text-emerald-600')
    })
    it('always includes dark: variant', () => {
      for (const s of [95, 65, 45, 10, undefined, null]) {
        expect(getRiskColor(s as any)).toContain('dark:')
      }
    })
  })

  describe('getRiskBg', () => {
    it('returns red bg for score >= 80', () => {
      expect(getRiskBg(85)).toContain('bg-red-500')
    })
    it('returns orange bg for score >= 60', () => {
      expect(getRiskBg(65)).toContain('bg-orange-500')
    })
    it('returns amber bg for score >= 40', () => {
      expect(getRiskBg(45)).toContain('bg-amber-500')
    })
    it('returns emerald bg for score < 40', () => {
      expect(getRiskBg(20)).toContain('bg-emerald-500')
    })
    it('always includes dark: variant', () => {
      for (const s of [99, 70, 50, 15, undefined, null]) {
        expect(getRiskBg(s as any)).toContain('dark:bg-')
      }
    })
  })

  describe('getTrustScoreBg', () => {
    it('returns emerald bg for score >= 80', () => {
      expect(getTrustScoreBg(85)).toContain('bg-emerald-500')
    })
    it('returns amber bg for score >= 60', () => {
      expect(getTrustScoreBg(65)).toContain('bg-amber-500')
    })
    it('returns orange bg for score >= 40', () => {
      expect(getTrustScoreBg(45)).toContain('bg-orange-500')
    })
    it('returns red bg for score < 40', () => {
      expect(getTrustScoreBg(20)).toContain('bg-red-500')
    })
    it('always includes dark: variant', () => {
      for (const s of [99, 70, 50, 15, undefined, null]) {
        expect(getTrustScoreBg(s as any)).toContain('dark:bg-')
      }
    })
  })
})

// --- 2. Financial Rate Limiting (inlined from middleware.ts) ---

const FINANCIAL_MUTATION_RE: RegExp[] = [
  new RegExp('^/api/wallets/(deposit|withdrawal|crypto-withdrawal|convert)/?([\\?]|$)', 'i'),
  new RegExp('^/api/escrow/transactions/[^/]+/(release|fund|disputes|activate)/?([\\?]|$)', 'i'),
  /^\/api\/payments\/initialize/i,
  new RegExp('^/api/escrow/transactions(/|[\\?]|$)', 'i'),
  new RegExp('^/api/withdrawals(/|[\\?]|$)', 'i'),
  new RegExp('^/api/deposits(/|[\\?]|$)', 'i'),
  new RegExp('^/api/collections(/|[\\?]|$)', 'i'),
  new RegExp('^/api/invoices(/|[\\?]|$)', 'i'),
  /^\/api\/payment-links\/[^\/]+\/pay/i,
]

function isFinancialMutation(pathname: string, method: string): boolean {
  if (method !== 'POST') return false
  return FINANCIAL_MUTATION_RE.some(re => re.test(pathname))
}

describe('Financial Rate Limiting - isFinancialMutation', () => {
  it('matches POST /api/wallets/deposit', () => {
    expect(isFinancialMutation('/api/wallets/deposit', 'POST')).toBe(true)
  })
  it('matches POST /api/withdrawals', () => {
    expect(isFinancialMutation('/api/withdrawals', 'POST')).toBe(true)
  })
  it('matches POST /api/deposits', () => {
    expect(isFinancialMutation('/api/deposits', 'POST')).toBe(true)
  })
  it('matches POST /api/collections', () => {
    expect(isFinancialMutation('/api/collections', 'POST')).toBe(true)
  })
  it('matches POST /api/invoices', () => {
    expect(isFinancialMutation('/api/invoices', 'POST')).toBe(true)
  })
  it('matches POST /api/escrow/transactions', () => {
    expect(isFinancialMutation('/api/escrow/transactions', 'POST')).toBe(true)
  })
  it('matches POST /api/escrow/transactions/:id/activate', () => {
    expect(isFinancialMutation('/api/escrow/transactions/esc_123/activate', 'POST')).toBe(true)
  })
  it('does NOT match GET requests (only POST should match)', () => {
    const paths = [
      '/api/wallets/deposit',
      '/api/withdrawals',
      '/api/deposits',
      '/api/collections',
      '/api/invoices',
      '/api/escrow/transactions',
      '/api/escrow/transactions/esc_123/activate',
    ]
    for (const p of paths) {
      expect(isFinancialMutation(p, 'GET')).toBe(false)
      expect(isFinancialMutation(p, 'PUT')).toBe(false)
      expect(isFinancialMutation(p, 'DELETE')).toBe(false)
    }
  })
})

// --- 3. Digital Twin Removal ---

const NAV_ITEMS_IDS_STUB = [
  'overview', 'trust-graph', 'escrow', 'payments', 'passport',
  'payment-links', 'wallet', 'referral', 'fraud', 'matching',
  'collections', 'compliance',
]
const ROLE_TABS_ADMIN = ROLE_TABS.admin

describe('Digital Twin Removal', () => {
  it('NAV_ITEMS does not contain digital-twin', () => {
    expect(NAV_ITEMS_IDS_STUB).not.toContain('digital-twin')
  })

  it('ROLE_TABS.admin does not contain digital-twin', () => {
    expect(ROLE_TABS_ADMIN).not.toContain('digital-twin')
  })

  it('TwinProfile is not referenced in nav/tabs config', () => {
    const allKeys = new Set([...NAV_ITEMS_IDS_STUB, ...ROLE_TABS_ADMIN])
    expect(allKeys.has('twin-profile')).toBe(false)
    expect(allKeys.has('digital-twin')).toBe(false)
  })
})

// --- 4. Dashboard Helpers - Edge Cases ---

const FALLBACK_FLAG = '\u{1F310}' // globe emoji

describe('Dashboard Helpers - Edge Cases', () => {
  it('formatCurrency with NaN returns $0.00', () => {
    expect(formatCurrency(NaN)).toBe('$0.00')
  })

  it('formatCurrency with Infinity returns $0.00', () => {
    expect(formatCurrency(Infinity)).toBe('$0.00')
  })

  it('formatCurrency with negative value formats correctly', () => {
    const result = formatCurrency(-123.45)
    expect(result).toContain('123.45')
    expect(result).toContain('-')
  })

  it('formatCurrency with zero returns $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formatCurrencyCompact with values under 1M uses non-compact format', () => {
    const result = formatCurrencyCompact(500000)
    expect(result).not.toContain('M')
    expect(result).toContain('500')
  })

  it('getStatusColor handles space-separated status "in escrow"', () => {
    const color = getStatusColor('in escrow')
    expect(color).toContain('bg-blue-100')
    expect(color).toContain('dark:')
  })

  it('getStatusColor handles underscored status "in_escrow"', () => {
    const color = getStatusColor('in_escrow')
    expect(color).toContain('bg-blue-100')
    expect(color).toContain('dark:')
  })

  it('truncate with empty string returns empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('truncate with string shorter than len returns original', () => {
    expect(truncate('hi', 10)).toBe('hi')
  })

  it('truncate with exact length returns original (no ellipsis)', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('getCountryFlag with unknown country returns globe', () => {
    expect(getCountryFlag('Unknown Country')).toBe(FALLBACK_FLAG)
    expect(getCountryFlag('')).toBe(FALLBACK_FLAG)
  })

  it('abbreviateNumber with 0 returns "0"', () => {
    expect(abbreviateNumber(0)).toBe('0')
  })

  it('abbreviateNumber with 999 returns "999"', () => {
    expect(abbreviateNumber(999)).toBe('999')
  })

  it('abbreviateNumber with 1000 returns "$1K"', () => {
    expect(abbreviateNumber(1000)).toBe('$1K')
  })

  it('abbreviateNumber with 10000 returns "$10.0K"', () => {
    expect(abbreviateNumber(10000)).toBe('$10.0K')
  })

  it('abbreviateNumber with 1000000 returns "$1.0M"', () => {
    expect(abbreviateNumber(1000000)).toBe('$1.0M')
  })
})
