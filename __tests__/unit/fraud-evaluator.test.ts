/**
 * Unit tests for the fraud rule evaluator.
 * Tests condition evaluation operators, rule processing, and caching.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────
// Mock the DB module before importing the evaluator
vi.mock('@/lib/db', () => ({
  db: {
    fraudRule: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    fraudAlert: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock the cache-manager to avoid Redis dependency
vi.mock('@/backend/lib/cache/cache-manager', () => ({
  default: {
    getOrSet: vi.fn((_key: string, fetch: () => Promise<any>) => fetch()),
  },
}))

import { db } from '@/lib/db'
import { evaluateCondition, evaluateTransaction, fetchActiveRules } from '@/backend/lib/fraud/evaluator'
import type { FraudCondition, FraudTransactionContext } from '@/backend/lib/fraud/evaluator'

// ── Helpers ───────────────────────────────────────────────────
const baseCtx: FraudTransactionContext = {
  tenantId: 'tenant-1',
  businessId: 'biz-1',
  amount: 1000,
  currency: 'USD',
  country: 'US',
  transactionType: 'payment_intent',
}

function makeRule(overrides: Partial<{
  id: string
  name: string
  condition: string
  action: string
  severity: string
  isActive: boolean
}> = {}) {
  return {
    id: overrides.id || 'rule-1',
    name: overrides.name || 'Test Rule',
    condition: overrides.condition || JSON.stringify({ field: 'amount', operator: 'greater_than', value: 500 }),
    action: overrides.action || 'block',
    severity: overrides.severity || 'high',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  }
}

function makeConditionWithTenant(condition: Record<string, unknown>, tenantId: string): string {
  return JSON.stringify({ ...condition, _tenantId: tenantId })
}

// ════════════════════════════════════════════════════════════════════════
// evaluateCondition — pure function tests
// ════════════════════════════════════════════════════════════════════════

describe('evaluateCondition', () => {
  it('greater_than: returns true when amount exceeds threshold', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'greater_than', value: 500 }
    expect(evaluateCondition(condition, baseCtx)).toBe(true) // 1000 > 500
  })

  it('greater_than: returns false when amount is below threshold', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'greater_than', value: 5000 }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // 1000 < 5000
  })

  it('greater_than: returns false when amount equals threshold', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'greater_than', value: 1000 }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // 1000 === 1000, not greater
  })

  it('less_than: returns true when amount is below threshold', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'less_than', value: 5000 }
    expect(evaluateCondition(condition, baseCtx)).toBe(true) // 1000 < 5000
  })

  it('less_than: returns false when amount exceeds threshold', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'less_than', value: 500 }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // 1000 > 500
  })

  it('equals: returns true when currency matches', () => {
    const condition: FraudCondition = { field: 'currency', operator: 'equals', value: 'USD' }
    expect(evaluateCondition(condition, baseCtx)).toBe(true)
  })

  it('equals: returns false when currency does not match', () => {
    const condition: FraudCondition = { field: 'currency', operator: 'equals', value: 'EUR' }
    expect(evaluateCondition(condition, baseCtx)).toBe(false)
  })

  it('not_equals: returns true when currency differs', () => {
    const condition: FraudCondition = { field: 'currency', operator: 'not_equals', value: 'EUR' }
    expect(evaluateCondition(condition, baseCtx)).toBe(true) // USD !== EUR
  })

  it('not_equals: returns false when currency matches', () => {
    const condition: FraudCondition = { field: 'currency', operator: 'not_equals', value: 'USD' }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // USD === USD
  })

  it('in: returns true when country is in the list', () => {
    const condition: FraudCondition = { field: 'country', operator: 'in', value: ['KP', 'IR', 'US', 'CU'] }
    expect(evaluateCondition(condition, baseCtx)).toBe(true) // US is in list
  })

  it('in: returns false when country is not in the list', () => {
    const condition: FraudCondition = { field: 'country', operator: 'in', value: ['KP', 'IR', 'SY', 'CU'] }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // US is not in list
  })

  it('not_in: returns true when country is not in the list', () => {
    const condition: FraudCondition = { field: 'country', operator: 'not_in', value: ['KP', 'IR', 'SY'] }
    expect(evaluateCondition(condition, baseCtx)).toBe(true) // US not in list
  })

  it('not_in: returns false when country is in the list', () => {
    const condition: FraudCondition = { field: 'country', operator: 'not_in', value: ['US', 'KP', 'IR'] }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // US is in list
  })

  it('returns false for unknown field', () => {
    const condition: FraudCondition = { field: 'unknown_field', operator: 'equals', value: 'anything' }
    expect(evaluateCondition(condition, baseCtx)).toBe(false)
  })

  it('returns false for unknown operator', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'unknown_op' as any, value: 500 }
    expect(evaluateCondition(condition, baseCtx)).toBe(false)
  })

  it('returns false when country is undefined and operator is in', () => {
    const noCountryCtx: FraudTransactionContext = { ...baseCtx, country: undefined }
    const condition: FraudCondition = { field: 'country', operator: 'in', value: ['US', 'GB'] }
    expect(evaluateCondition(condition, noCountryCtx)).toBe(false)
  })

  it('returns false when country is undefined and operator is equals', () => {
    const noCountryCtx: FraudTransactionContext = { ...baseCtx, country: undefined }
    const condition: FraudCondition = { field: 'country', operator: 'equals', value: 'US' }
    expect(evaluateCondition(condition, noCountryCtx)).toBe(false)
  })

  it('returns false for non-numeric comparison with greater_than', () => {
    const condition: FraudCondition = { field: 'currency', operator: 'greater_than', value: 500 }
    expect(evaluateCondition(condition, baseCtx)).toBe(false) // currency is string, not number
  })

  it('greater_than: returns false when threshold is not a number', () => {
    const condition: FraudCondition = { field: 'amount', operator: 'greater_than', value: 'not a number' }
    expect(evaluateCondition(condition, baseCtx)).toBe(false)
  })

  it('handles transactionType field', () => {
    const condition: FraudCondition = { field: 'transactionType', operator: 'equals', value: 'payment_intent' }
    expect(evaluateCondition(condition, baseCtx)).toBe(true)
  })

  it('handles businessId field', () => {
    const condition: FraudCondition = { field: 'businessId', operator: 'equals', value: 'biz-1' }
    expect(evaluateCondition(condition, baseCtx)).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════
// fetchActiveRules — tenant scoping & caching
// ════════════════════════════════════════════════════════════════════════

describe('fetchActiveRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters rules by embedded _tenantId', async () => {
    const rules = [
      makeRule({
        id: 'r1',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
      }),
      makeRule({
        id: 'r2',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 100 }, 'tenant-2'),
      }),
      makeRule({
        id: 'r3',
        condition: JSON.stringify({ field: 'amount', operator: 'greater_than', value: 200 }), // no _tenantId
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await fetchActiveRules('tenant-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('returns empty array when no rules match tenant', async () => {
    const rules = [
      makeRule({
        id: 'r1',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-2'),
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await fetchActiveRules('tenant-1')
    expect(result).toHaveLength(0)
  })

  it('returns empty array when DB returns no rules', async () => {
    ;(db.fraudRule.findMany as any).mockResolvedValue([])

    const result = await fetchActiveRules('tenant-1')
    expect(result).toHaveLength(0)
  })
})

// ════════════════════════════════════════════════════════════════════════
// evaluateTransaction — end-to-end rule evaluation
// ════════════════════════════════════════════════════════════════════════

describe('evaluateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no alerts in DB
    ;(db.fraudAlert.findUnique as any).mockResolvedValue(null)
    ;(db.fraudAlert.create as any).mockResolvedValue({})
    ;(db.fraudRule.update as any).mockResolvedValue({})
  })

  it('allows transaction when no rules match', async () => {
    const rules = [
      makeRule({
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 50000 }, 'tenant-1'),
        action: 'block',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.alerts).toHaveLength(0)
    expect(result.blockedBy).toBeUndefined()
  })

  it('blocks transaction when a block rule matches', async () => {
    const rules = [
      makeRule({
        name: 'High-Risk Country',
        condition: makeConditionWithTenant({ field: 'country', operator: 'in', value: ['US', 'KP'] }, 'tenant-1'),
        action: 'block',
        severity: 'critical',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(false)
    expect(result.blockedBy).toBe('High-Risk Country')
    expect(result.alerts).toContain('Blocked by rule: High-Risk Country')
  })

  it('creates alert when an alert rule matches', async () => {
    const rules = [
      makeRule({
        name: 'Large Transaction Alert',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'alert',
        severity: 'high',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.alerts).toHaveLength(1)
    expect(result.alerts[0]).toContain('Large Transaction Alert')
    expect(db.fraudAlert.create).toHaveBeenCalled()
  })

  it('flags require_review when a require_review rule matches', async () => {
    const rules = [
      makeRule({
        name: 'New Account Large Payment',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'require_review',
        severity: 'medium',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.requireReview).toBe(true)
    expect(result.alerts[0]).toContain('Review required: New Account Large Payment')
  })

  it('blocks immediately on first matching block rule (short-circuit)', async () => {
    const rules = [
      makeRule({
        name: 'Block Rule A',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'block',
      }),
      makeRule({
        name: 'Block Rule B',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 100 }, 'tenant-1'),
        action: 'block',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(false)
    expect(result.blockedBy).toBe('Block Rule A')
  })

  it('processes all rules: alert + require_review both fire', async () => {
    const rules = [
      makeRule({
        name: 'Large Amount Alert',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'alert',
        severity: 'high',
      }),
      makeRule({
        name: 'Currency Review',
        condition: makeConditionWithTenant({ field: 'currency', operator: 'equals', value: 'USD' }, 'tenant-1'),
        action: 'require_review',
        severity: 'medium',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.alerts).toHaveLength(2)
    expect(result.requireReview).toBe(true)
  })

  it('skips rules with malformed condition JSON', async () => {
    const rules = [
      makeRule({
        name: 'Bad JSON Rule',
        condition: 'not-valid-json{{',
        action: 'block',
      }),
      makeRule({
        name: 'Good Rule',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 50000 }, 'tenant-1'),
        action: 'block',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true) // only bad-json rule was skipped, good one doesn't match
  })

  it('skips rules with missing field or operator', async () => {
    const rules = [
      makeRule({
        name: 'No Field',
        condition: makeConditionWithTenant({ operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'block',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
  })

  it('updates trigger count and lastTriggeredAt when rule fires', async () => {
    const rules = [
      makeRule({
        name: 'Tracked Rule',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'alert',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    await evaluateTransaction(baseCtx)
    expect(db.fraudRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          triggerCount: { increment: 1 },
        }),
      }),
    )
  })

  it('does not update trigger count for non-matching rules', async () => {
    const rules = [
      makeRule({
        name: 'High Threshold',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 999999 }, 'tenant-1'),
        action: 'alert',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    await evaluateTransaction(baseCtx)
    expect(db.fraudRule.update).not.toHaveBeenCalled()
  })

  it('handles empty rule set gracefully', async () => {
    ;(db.fraudRule.findMany as any).mockResolvedValue([])

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.alerts).toHaveLength(0)
  })

  it('ignores unknown action types', async () => {
    const rules = [
      makeRule({
        name: 'Unknown Action Rule',
        condition: makeConditionWithTenant({ field: 'amount', operator: 'greater_than', value: 500 }, 'tenant-1'),
        action: 'flag', // not block/alert/require_review
        severity: 'medium',
      }),
    ]
    ;(db.fraudRule.findMany as any).mockResolvedValue(rules)

    const result = await evaluateTransaction(baseCtx)
    expect(result.allowed).toBe(true)
    expect(result.alerts).toHaveLength(0)
  })
})
