import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('audit-trail', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('creates an AuditTrail instance without error', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    expect(() => new AuditTrail()).not.toThrow()
  })

  it('record produces an entry with required fields', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()
    const entry = await trail.record({
      action: 'PAYMENT_CREATED',
      actor: 'user:123',
      resourceId: 'pay_abc',
      resourceType: 'payment',
      description: 'Payment created',
      metadata: { amount: 100 },
    })

    expect(entry.id).toBe(1)
    expect(entry.action).toBe('PAYMENT_CREATED')
    expect(entry.actor).toBe('user:123')
    expect(entry.resourceId).toBe('pay_abc')
    expect(entry.resourceType).toBe('payment')
    expect(entry.description).toBe('Payment created')
    expect(entry.metadata).toEqual({ amount: 100 })
    expect(entry.hash).toBeDefined()
    expect(typeof entry.hash).toBe('string')
    expect(entry.hash.length).toBe(64) // SHA-256 hex
    expect(entry.signature).toBeDefined()
    expect(typeof entry.signature).toBe('string')
    expect(entry.signature.length).toBe(64) // HMAC-SHA256 hex
    expect(entry.timestamp).toBeDefined()
  })

  it('hash chain links entries correctly', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()

    const entry1 = await trail.record({
      action: 'PAYMENT_CREATED',
      actor: 'user:1',
      resourceId: 'pay_1',
      resourceType: 'payment',
      description: 'First',
    })

    const entry2 = await trail.record({
      action: 'STATE_TRANSITION',
      actor: 'system',
      resourceId: 'pay_1',
      resourceType: 'payment',
      description: 'Second',
    })

    // entry2.previousHash should equal entry1.hash
    expect(entry2.previousHash).toBe(entry1.hash)
    // IDs should be sequential
    expect(entry2.id).toBe(entry1.id + 1)
  })

  it('verifyChain returns valid=true for a clean chain', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()

    await trail.record({
      action: 'PAYMENT_CREATED',
      actor: 'user:1',
      resourceId: 'pay_1',
      resourceType: 'payment',
      description: 'First',
    })
    await trail.record({
      action: 'STATE_TRANSITION',
      actor: 'system',
      resourceId: 'pay_1',
      resourceType: 'payment',
      description: 'Second',
    })

    const result = trail.verifyChain()
    expect(result.valid).toBe(true)
    expect(result.totalEntries).toBe(2)
    expect(result.verifiedCount).toBe(2)
    expect(result.firstInvalidIndex).toBeNull()
  })

  it('verifyChain returns valid=true for empty chain', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()
    const result = trail.verifyChain()
    expect(result.valid).toBe(true)
    expect(result.totalEntries).toBe(0)
  })

  it('query filters by action', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()

    await trail.record({
      action: 'PAYMENT_CREATED', actor: 'user:1', resourceId: 'p1', resourceType: 'payment', description: 'a',
    })
    await trail.record({
      action: 'REFUND_INITIATED', actor: 'user:1', resourceId: 'p1', resourceType: 'payment', description: 'b',
    })
    await trail.record({
      action: 'PAYMENT_CREATED', actor: 'user:2', resourceId: 'p2', resourceType: 'payment', description: 'c',
    })

    const results = trail.query({ action: 'PAYMENT_CREATED' })
    expect(results).toHaveLength(2)
  })

  it('getById and getLatest work correctly', async () => {
    const { AuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const trail = new AuditTrail()

    const e1 = await trail.record({
      action: 'PAYMENT_CREATED', actor: 'u', resourceId: 'r', resourceType: 'payment', description: 'd',
    })
    const e2 = await trail.record({
      action: 'REFUND_INITIATED', actor: 'u', resourceId: 'r', resourceType: 'payment', description: 'd2',
    })

    expect(trail.getById(1)).toEqual(e1)
    expect(trail.getById(99)).toBeNull()
    expect(trail.getLatest(1)).toEqual([e2])
    expect(trail.size).toBe(2)
  })
})
