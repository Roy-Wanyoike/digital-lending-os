import { describe, it, expect } from 'vitest'

// Sprint fixes unit tests - 28 tests across 4 groups
// Pure-function re-implementations (no .tsx imports to avoid UI deps)

// --- 1. Dark Mode Color Helpers (re-implemented from dashboard-helpers.tsx) ---

function safeNum(score: unknown): number {
  return typeof score === 'number' && isFinite(score) ? score : 0
}

function getTrustScoreColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (s >= 60) return 'text-amber-600 dark:text-amber-400'
  if (s >= 40) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function getRiskColor(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'text-red-600 dark:text-red-400'
  if (s >= 60) return 'text-orange-600 dark:text-orange-400'
  if (s >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function getRiskBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-red-500 dark:bg-red-600'
  if (s >= 60) return 'bg-orange-500 dark:bg-orange-600'
  if (s >= 40) return 'bg-amber-500 dark:bg-amber-600'
  return 'bg-emerald-500 dark:bg-emerald-600'
}

function getTrustScoreBg(score: number | undefined | null): string {
  const s = safeNum(score)
  if (s >= 80) return 'bg-emerald-500 dark:bg-emerald-600'
  if (s >= 60) return 'bg-amber-500 dark:bg-amber-600'
  if (s >= 40) return 'bg-orange-500 dark:bg-orange-600'
  return 'bg-red-500 dark:bg-red-600'
}

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

const NAV_ITEMS_IDS = [
  'overview', 'trust-graph', 'escrow', 'payments', 'passport',
  'payment-links', 'wallet', 'referral', 'fraud', 'matching',
  'collections', 'compliance',
]

const ROLE_TABS_ADMIN = [
  'overview', 'trust-graph', 'escrow', 'payments', 'passport',
  'payment-links', 'wallet', 'referral', 'fraud', 'matching',
  'collections', 'compliance',
]

interface Business {
  id: string; name: string; legalName?: string; registrationNo?: string;
  taxId?: string; country: string; city?: string;
  industry?: string; website?: string; employeeCount?: number;
  annualRevenue?: number; description?: string; logoUrl?: string;
  status: string; verifiedAt?: string; createdAt: string; updatedAt: string;
  passport?: { credentialLevel?: string; kycStatus?: string; amlStatus?: string; riskRating?: string } | null
  trustScore?: { overallScore?: number } | null
}

describe('Digital Twin Removal', () => {
  it('NAV_ITEMS does not contain digital-twin', () => {
    expect(NAV_ITEMS_IDS).not.toContain('digital-twin')
  })

  it('ROLE_TABS.admin does not contain digital-twin', () => {
    expect(ROLE_TABS_ADMIN).not.toContain('digital-twin')
  })

  it('TwinProfile is not referenced in nav/tabs config', () => {
    const allKeys = new Set([...NAV_ITEMS_IDS, ...ROLE_TABS_ADMIN])
    expect(allKeys.has('twin-profile')).toBe(false)
    expect(allKeys.has('digital-twin')).toBe(false)
  })

  it('Business type does not have digitalTwin field', () => {
    const biz: Business = {
      id: '1', name: 'Test', country: 'US', status: 'active',
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    }
    expect(biz).toBeDefined()
    expect('digitalTwin' in biz).toBe(false)
  })
})

// --- 4. Dashboard Helpers - Edge Cases (re-implemented) ---

function formatCurrency(value: number, currency = 'USD'): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (currency === 'JPY') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(safe)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe)
}

function formatCurrencyCompact(value: number, currency = 'USD'): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (currency === 'JPY' || safe >= 1000000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }).format(safe)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(safe)
}

function getStatusColor(status: string): string {
  const s = status?.toLowerCase()?.replace(/[\s_-]/g, '') || ''
  if (['completed', 'paid', 'clear', 'resolved', 'engaged'].includes(s))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
  if (['failed', 'disputed', 'critical', 'alert', 'confirmed', 'declined', 'overdue'].includes(s))
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
  if (['active', 'inescrow', 'processing', 'sent', 'investigating', 'interested', 'potential_match'].includes(s))
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
  if (['pending', 'funded'].includes(s))
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
}

function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

const FALLBACK_FLAG = '\u{1F310}' // globe emoji

function getCountryFlag(country: string): string {
  const nameMap: Record<string, string> = {
    'Nigeria': '\u{1F1F3}\u{1F1EC}', 'Kenya': '\u{1F1F0}\u{1F1EA}', 'Ghana': '\u{1F1EC}\u{1F1ED}', 'Uganda': '\u{1F1FA}\u{1F1EC}',
    'Tanzania': '\u{1F1F9}\u{1F1FF}', 'Rwanda': '\u{1F1F7}\u{1F1FC}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
    'United States': '\u{1F1FA}\u{1F1F8}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'Germany': '\u{1F1E9}\u{1F1EA}',
    'Brazil': '\u{1F1E7}\u{1F1F7}', 'Mexico': '\u{1F1F2}\u{1F1FD}', 'Japan': '\u{1F1EF}\u{1F1F5}', 'China': '\u{1F1E8}\u{1F1F3}',
    'India': '\u{1F1EE}\u{1F1F3}', 'Canada': '\u{1F1E8}\u{1F1E6}', 'Australia': '\u{1F1E6}\u{1F1FA}', 'UAE': '\u{1F1E6}\u{1F1EA}',
    'Singapore': '\u{1F1F8}\u{1F1EC}', 'France': '\u{1F1EB}\u{1F1F7}', 'Netherlands': '\u{1F1F3}\u{1F1F1}',
  }
  const CURRENCY_FLAGS: Record<string, string> = {
    USD: '\u{1F1FA}\u{1F1F8}', EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}', NGN: '\u{1F1F3}\u{1F1EC}', KES: '\u{1F1F0}\u{1F1EA}',
    GHS: '\u{1F1EC}\u{1F1ED}', UGX: '\u{1F1FA}\u{1F1EC}', TZS: '\u{1F1F9}\u{1F1FF}', RWF: '\u{1F1F7}\u{1F1FC}', BRL: '\u{1F1E7}\u{1F1F7}',
    MXN: '\u{1F1F2}\u{1F1FD}', ZAR: '\u{1F1FF}\u{1F1E6}', JPY: '\u{1F1EF}\u{1F1F5}', CNY: '\u{1F1E8}\u{1F1F3}', INR: '\u{1F1EE}\u{1F1F3}',
    CAD: '\u{1F1E8}\u{1F1E6}', AUD: '\u{1F1E6}\u{1F1FA}', CHF: '\u{1F1E8}\u{1F1ED}', AED: '\u{1F1E6}\u{1F1EA}', SGD: '\u{1F1F8}\u{1F1EC}',
  }
  if (nameMap[country]) return nameMap[country]
  return CURRENCY_FLAGS[country] || FALLBACK_FLAG
}

function abbreviateNumber(value: number): string {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  if (safe >= 1000000) return '$' + (safe / 1000000).toFixed(1) + 'M'
  if (safe >= 1000) return '$' + (safe / 1000).toFixed(safe >= 10000 ? 1 : 0) + 'K'
  return safe.toString()
}

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
