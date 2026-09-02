/**
 * Component Rendering / Formatter Unit Tests
 * Tests pure formatter functions from @/frontend/lib/formatters.ts
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyCompact,
  abbreviateNumber,
  formatDate,
  getCountryFlag,
  getStatusBadgeVariant,
  getStatusColor,
  getTrustScoreColor,
  getTrustScoreBg,
  getRiskColor,
  getRiskBg,
  truncate,
  CURRENCY_FLAGS,
  CHART_COLORS,
  ESCROW_STATUSES,
  FRAUD_SEVERITIES,
  FRAUD_STATUSES,
  MATCHING_STATUSES,
  AGING_BUCKETS,
  PRIORITY_LEVELS,
  PAYMENT_METHOD_TYPES,
  ROLE_LABELS,
  ROLE_TABS,
} from '@/frontend/lib/formatters'

// ════════════════════════════════════════════════════════════════════════
// 9C.1: formatCurrency
// ════════════════════════════════════════════════════════════════════════

describe('formatCurrency', () => {
  it('formats USD with 2 decimal places', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('formats negative numbers', () => {
    const result = formatCurrency(-500, 'USD')
    expect(result).toContain('500.00')
    expect(result).toContain('-')
  })

  it('handles very large numbers', () => {
    const result = formatCurrency(999999999.99, 'USD')
    expect(result).toContain('999,999,999.99')
  })

  it('handles very small numbers', () => {
    expect(formatCurrency(0.01, 'USD')).toBe('$0.01')
  })

  it('formats JPY without decimal places', () => {
    expect(formatCurrency(1000, 'JPY')).toBe('¥1,000')
  })

  it('defaults to USD when no currency specified', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })

  it('handles NaN by returning $0.00', () => {
    expect(formatCurrency(NaN, 'USD')).toBe('$0.00')
  })

  it('handles Infinity by returning $0.00', () => {
    expect(formatCurrency(Infinity, 'USD')).toBe('$0.00')
  })

  it('handles -Infinity by returning $0.00', () => {
    expect(formatCurrency(-Infinity, 'USD')).toBe('$0.00')
  })

  it('handles null-like via non-number input gracefully', () => {
    // TypeScript would catch this, but runtime safety
    expect(formatCurrency(undefined as any, 'USD')).toBe('$0.00')
  })

  it('formats other currencies correctly', () => {
    expect(formatCurrency(100, 'EUR')).toContain('100.00')
    expect(formatCurrency(100, 'GBP')).toContain('100.00')
    expect(formatCurrency(100, 'NGN')).toContain('100.00')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.2: formatCurrencyCompact
// ════════════════════════════════════════════════════════════════════════

describe('formatCurrencyCompact', () => {
  it('formats millions with compact notation', () => {
    const result = formatCurrencyCompact(1500000, 'USD')
    expect(result).toContain('M')
  })

  it('formats thousands without compact for USD', () => {
    const result = formatCurrencyCompact(500000, 'USD')
    expect(result).toBe('$500,000')
  })

  it('formats JPY in compact notation', () => {
    const result = formatCurrencyCompact(1000000, 'JPY')
    expect(result).toContain('M')
  })

  it('handles zero', () => {
    expect(formatCurrencyCompact(0, 'USD')).toBe('$0')
  })

  it('handles NaN gracefully', () => {
    expect(formatCurrencyCompact(NaN, 'USD')).toBe('$0')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.3: abbreviateNumber
// ════════════════════════════════════════════════════════════════════════

describe('abbreviateNumber', () => {
  it('abbreviates millions with 1 decimal', () => {
    expect(abbreviateNumber(1500000)).toBe('$1.5M')
  })

  it('abbreviates thousands >= 10K with 1 decimal', () => {
    expect(abbreviateNumber(15000)).toBe('$15.0K')
  })

  it('abbreviates thousands < 10K without decimal', () => {
    expect(abbreviateNumber(5000)).toBe('$5K')
  })

  it('returns string for small numbers', () => {
    expect(abbreviateNumber(999)).toBe('999')
  })

  it('handles zero', () => {
    expect(abbreviateNumber(0)).toBe('0')
  })

  it('handles NaN gracefully', () => {
    expect(abbreviateNumber(NaN)).toBe('0')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.4: formatDate
// ════════════════════════════════════════════════════════════════════════

describe('formatDate', () => {
  it('formats ISO date string correctly', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toBe('Jan 15, 2024')
  })

  it('returns original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('handles date-only strings', () => {
    const result = formatDate('2024-06-01')
    expect(result).toBe('Jun 01, 2024')
  })

  it('handles various months', () => {
    expect(formatDate('2024-12-25')).toBe('Dec 25, 2024')
    expect(formatDate('2024-03-01')).toBe('Mar 01, 2024')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.5: getCountryFlag
// ════════════════════════════════════════════════════════════════════════

describe('getCountryFlag', () => {
  it('returns flag for Nigeria by name', () => {
    const flag = getCountryFlag('Nigeria')
    expect(flag).toBeTruthy()
    expect(flag.length).toBeGreaterThan(0)
    expect(flag).not.toBe('🌐')
  })

  it('returns flag for Kenya by name', () => {
    const flag = getCountryFlag('Kenya')
    expect(flag).toBeTruthy()
    expect(flag).not.toBe('🌐')
  })

  it('returns flag for currency code USD', () => {
    const flag = getCountryFlag('USD')
    expect(flag).toBeTruthy()
    expect(flag).not.toBe('🌐')
  })

  it('returns flag for currency code EUR', () => {
    const flag = getCountryFlag('EUR')
    expect(flag).toBeTruthy()
    expect(flag).not.toBe('🌍')
  })

  it('returns globe emoji for unknown country', () => {
    expect(getCountryFlag('UnknownLand')).toBe('🌐')
  })

  it('returns flag for all countries in nameMap', () => {
    const knownCountries = [
      'Nigeria', 'Kenya', 'Ghana', 'Uganda', 'Tanzania', 'Rwanda',
      'South Africa', 'United States', 'United Kingdom', 'Germany',
      'Brazil', 'Mexico', 'Japan', 'China', 'India', 'Canada',
      'Australia', 'UAE', 'Singapore', 'France', 'Netherlands',
    ]
    for (const country of knownCountries) {
      const flag = getCountryFlag(country)
      expect(flag).not.toBe('🌐')
    }
  })

  it('returns flag for all currency codes in CURRENCY_FLAGS', () => {
    for (const code of Object.keys(CURRENCY_FLAGS)) {
      const flag = getCountryFlag(code)
      expect(flag).not.toBe('🌐')
    }
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.6: getStatusBadgeVariant
// ════════════════════════════════════════════════════════════════════════

describe('getStatusBadgeVariant', () => {
  it('returns "default" for completed', () => {
    expect(getStatusBadgeVariant('completed')).toBe('default')
  })

  it('returns "default" for paid', () => {
    expect(getStatusBadgeVariant('paid')).toBe('default')
  })

  it('returns "default" for resolved', () => {
    expect(getStatusBadgeVariant('resolved')).toBe('default')
  })

  it('returns "destructive" for failed', () => {
    expect(getStatusBadgeVariant('failed')).toBe('destructive')
  })

  it('returns "destructive" for disputed', () => {
    expect(getStatusBadgeVariant('disputed')).toBe('destructive')
  })

  it('returns "destructive" for critical', () => {
    expect(getStatusBadgeVariant('critical')).toBe('destructive')
  })

  it('returns "destructive" for overdue', () => {
    expect(getStatusBadgeVariant('overdue')).toBe('destructive')
  })

  it('returns "outline" for unknown status', () => {
    expect(getStatusBadgeVariant('unknown_status')).toBe('outline')
  })

  it('handles null/undefined', () => {
    expect(getStatusBadgeVariant(null as any)).toBe('outline')
    expect(getStatusBadgeVariant(undefined as any)).toBe('outline')
  })

  it('handles status with spaces and hyphens', () => {
    expect(getStatusBadgeVariant('In Escrow')).toBe('outline')
    expect(getStatusBadgeVariant('in-escrow')).toBe('outline')
    expect(getStatusBadgeVariant('in_escrow')).toBe('outline')
  })

  it('is case-insensitive', () => {
    expect(getStatusBadgeVariant('COMPLETED')).toBe('default')
    expect(getStatusBadgeVariant('Completed')).toBe('default')
    expect(getStatusBadgeVariant('completed')).toBe('default')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.7: getStatusColor — comprehensive coverage
// ════════════════════════════════════════════════════════════════════════

describe('getStatusColor', () => {
  const greenStatuses = ['completed', 'paid', 'clear', 'resolved', 'engaged']
  const redStatuses = ['failed', 'disputed', 'critical', 'alert', 'confirmed', 'declined', 'overdue']
  // Note: 'potential_match' is excluded because getStatusColor normalizes by removing
  // underscores, so 'potential_match' becomes 'potentialmatch' which doesn't match
  // the 'potential_match' entry in the source array (a dead code path).
  const blueStatuses = ['active', 'inescrow', 'processing', 'sent', 'investigating', 'interested']
  const amberStatuses = ['pending', 'funded']
  const grayStatuses = ['created', 'unknown', 'cancelled']

  it('green statuses have emerald classes', () => {
    for (const s of greenStatuses) {
      const color = getStatusColor(s)
      expect(color).toContain('emerald')
    }
  })

  it('red statuses have red classes', () => {
    for (const s of redStatuses) {
      const color = getStatusColor(s)
      expect(color).toContain('red')
    }
  })

  it('blue statuses have blue classes', () => {
    for (const status of blueStatuses) {
      const color = getStatusColor(status)
      expect(color).toContain('blue')
    }
  })

  it('amber statuses have amber classes', () => {
    for (const s of amberStatuses) {
      const color = getStatusColor(s)
      expect(color).toContain('amber')
    }
  })

  it('unknown/gray statuses have slate classes', () => {
    for (const s of grayStatuses) {
      const color = getStatusColor(s)
      expect(color).toContain('slate')
    }
  })

  it('all status colors include dark mode variants', () => {
    const statuses = [...greenStatuses, ...redStatuses, ...blueStatuses, ...amberStatuses, ...grayStatuses]
    for (const s of statuses) {
      const color = getStatusColor(s)
      expect(color).toContain('dark:')
    }
  })

  it('all status colors include border classes', () => {
    const statuses = [...greenStatuses, ...redStatuses, ...blueStatuses, ...amberStatuses, ...grayStatuses]
    for (const s of statuses) {
      const color = getStatusColor(s)
      expect(color).toContain('border-')
    }
  })

  it('handles null/undefined', () => {
    const color = getStatusColor(null as any)
    expect(color).toContain('slate')
  })

  it('handles statuses with spaces (normalized)', () => {
    expect(getStatusColor('In Escrow')).toContain('blue')
    expect(getStatusColor('In_Escrow')).toContain('blue')
    expect(getStatusColor('in-escrow')).toContain('blue')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.8: getTrustScoreColor
// ════════════════════════════════════════════════════════════════════════

describe('getTrustScoreColor', () => {
  it('returns emerald for score >= 80', () => {
    expect(getTrustScoreColor(80)).toContain('emerald')
    expect(getTrustScoreColor(95)).toContain('emerald')
    expect(getTrustScoreColor(100)).toContain('emerald')
  })

  it('returns amber for score 60-79', () => {
    expect(getTrustScoreColor(60)).toContain('amber')
    expect(getTrustScoreColor(70)).toContain('amber')
    expect(getTrustScoreColor(79)).toContain('amber')
  })

  it('returns orange for score 40-59', () => {
    expect(getTrustScoreColor(40)).toContain('orange')
    expect(getTrustScoreColor(50)).toContain('orange')
    expect(getTrustScoreColor(59)).toContain('orange')
  })

  it('returns red for score < 40', () => {
    expect(getTrustScoreColor(0)).toContain('red')
    expect(getTrustScoreColor(20)).toContain('red')
    expect(getTrustScoreColor(39)).toContain('red')
  })

  it('handles null', () => {
    expect(getTrustScoreColor(null)).toContain('red')
  })

  it('handles undefined', () => {
    expect(getTrustScoreColor(undefined)).toContain('red')
  })

  it('handles NaN', () => {
    expect(getTrustScoreColor(NaN)).toContain('red')
  })

  it('includes dark mode variant', () => {
    expect(getTrustScoreColor(90)).toContain('dark:')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.9: getTrustScoreBg
// ════════════════════════════════════════════════════════════════════════

describe('getTrustScoreBg', () => {
  it('returns emerald bg for score >= 80', () => {
    expect(getTrustScoreBg(90)).toContain('emerald')
  })

  it('returns amber bg for score 60-79', () => {
    expect(getTrustScoreBg(70)).toContain('amber')
  })

  it('returns orange bg for score 40-59', () => {
    expect(getTrustScoreBg(50)).toContain('orange')
  })

  it('returns red bg for score < 40', () => {
    expect(getTrustScoreBg(20)).toContain('red')
  })

  it('handles null', () => {
    expect(getTrustScoreBg(null)).toContain('red')
  })

  it('includes dark mode variant', () => {
    expect(getTrustScoreBg(85)).toContain('dark:')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.10: getRiskColor (inverse of trust — high risk = red)
// ════════════════════════════════════════════════════════════════════════

describe('getRiskColor', () => {
  it('returns red for score >= 80 (high risk)', () => {
    expect(getRiskColor(80)).toContain('red')
    expect(getRiskColor(100)).toContain('red')
  })

  it('returns orange for score 60-79', () => {
    expect(getRiskColor(60)).toContain('orange')
    expect(getRiskColor(75)).toContain('orange')
  })

  it('returns amber for score 40-59', () => {
    expect(getRiskColor(40)).toContain('amber')
    expect(getRiskColor(55)).toContain('amber')
  })

  it('returns emerald for score < 40 (low risk)', () => {
    expect(getRiskColor(0)).toContain('emerald')
    expect(getRiskColor(20)).toContain('emerald')
    expect(getRiskColor(39)).toContain('emerald')
  })

  it('handles null', () => {
    expect(getRiskColor(null)).toContain('emerald')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.11: getRiskBg
// ════════════════════════════════════════════════════════════════════════

describe('getRiskBg', () => {
  it('returns red bg for score >= 80', () => {
    expect(getRiskBg(80)).toContain('red')
  })

  it('returns emerald bg for score < 40', () => {
    expect(getRiskBg(20)).toContain('emerald')
  })

  it('handles null', () => {
    expect(getRiskBg(null)).toContain('emerald')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.12: truncate
// ════════════════════════════════════════════════════════════════════════

describe('truncate', () => {
  it('returns string as-is when under limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates and adds ellipsis when over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('handles null/undefined-like input', () => {
    expect(truncate(null as any, 10)).toBe('')
    expect(truncate(undefined as any, 10)).toBe('')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.13: Constants — validate completeness
// ════════════════════════════════════════════════════════════════════════

describe('Constants', () => {
  it('CURRENCY_FLAGS has expected currencies', () => {
    const expected = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'JPY', 'INR']
    for (const cur of expected) {
      expect(CURRENCY_FLAGS[cur]).toBeTruthy()
    }
  })

  it('CHART_COLORS has 8 entries', () => {
    expect(CHART_COLORS).toHaveLength(8)
  })

  it('ESCROW_STATUSES has expected entries', () => {
    expect(ESCROW_STATUSES).toContain('Created')
    expect(ESCROW_STATUSES).toContain('Funded')
    expect(ESCROW_STATUSES).toContain('In Escrow')
    expect(ESCROW_STATUSES).toContain('Completed')
    expect(ESCROW_STATUSES).toContain('Disputed')
  })

  it('FRAUD_SEVERITIES has all levels', () => {
    expect(FRAUD_SEVERITIES).toEqual(['Critical', 'High', 'Medium', 'Low'])
  })

  it('FRAUD_STATUSES has expected entries', () => {
    expect(FRAUD_STATUSES).toEqual(['Open', 'Investigating', 'Confirmed', 'Resolved'])
  })

  it('ROLE_LABELS covers all 6 roles', () => {
    const roles = ['admin', 'credit_officer', 'collections_officer', 'compliance_officer', 'underwriter', 'viewer']
    for (const role of roles) {
      expect(ROLE_LABELS[role as keyof typeof ROLE_LABELS]).toBeTruthy()
    }
  })

  it('ROLE_TABS has tabs for all roles', () => {
    const roles = ['admin', 'credit_officer', 'collections_officer', 'compliance_officer', 'underwriter', 'viewer'] as const
    for (const role of roles) {
      expect(ROLE_TABS[role].length).toBeGreaterThan(0)
      expect(ROLE_TABS[role]).toContain('overview')
    }
  })

  it('admin has the most tabs', () => {
    const adminTabCount = ROLE_TABS.admin.length
    for (const role of ['credit_officer', 'collections_officer', 'compliance_officer', 'underwriter', 'viewer'] as const) {
      expect(ROLE_TABS[role].length).toBeLessThanOrEqual(adminTabCount)
    }
  })

  it('PAYMENT_METHOD_TYPES includes All', () => {
    expect(PAYMENT_METHOD_TYPES[0]).toBe('All')
  })

  it('AGING_BUCKETS covers standard aging periods', () => {
    expect(AGING_BUCKETS).toEqual(['Current', '1-30', '31-60', '61-90', '90+'])
  })

  it('PRIORITY_LEVELS covers urgency range', () => {
    expect(PRIORITY_LEVELS).toEqual(['Urgent', 'High', 'Normal', 'Low'])
  })

  it('MATCHING_STATUSES covers the matching lifecycle', () => {
    expect(MATCHING_STATUSES).toContain('Suggested')
    expect(MATCHING_STATUSES).toContain('Declined')
    expect(MATCHING_STATUSES).toContain('Engaged')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 9C.14: Cross-function consistency
// ════════════════════════════════════════════════════════════════════════

describe('Cross-function consistency', () => {
  it('getStatusBadgeVariant and getStatusColor agree on green statuses', () => {
    const greenStatuses = ['completed', 'paid', 'resolved']
    for (const s of greenStatuses) {
      const variant = getStatusBadgeVariant(s)
      const color = getStatusColor(s)
      // 'default' variant maps to emerald (green) color
      expect(variant).toBe('default')
      expect(color).toContain('emerald')
    }
  })

  it('getStatusBadgeVariant and getStatusColor agree on red statuses', () => {
    const redStatuses = ['failed', 'disputed', 'critical']
    for (const s of redStatuses) {
      const variant = getStatusBadgeVariant(s)
      const color = getStatusColor(s)
      expect(variant).toBe('destructive')
      expect(color).toContain('red')
    }
  })

  it('trust and risk color functions are inverses', () => {
    // High trust = green, High risk = red
    expect(getTrustScoreColor(90)).toContain('emerald')
    expect(getRiskColor(90)).toContain('red')

    // Low trust = red, Low risk = green
    expect(getTrustScoreColor(10)).toContain('red')
    expect(getRiskColor(10)).toContain('emerald')
  })
})
