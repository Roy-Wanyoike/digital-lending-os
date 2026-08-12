/**
 * Comprehensive tests for the payment idempotency system.
 * Tests IdempotencyGuard, withIdempotentOperation, and withIdempotency middleware.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdempotencyGuard, withIdempotentOperation, withIdempotency } from '@/backend/lib/payment/idempotency'

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard

  beforeEach(() => {
    guard = new IdempotencyGuard(5000, 5000) // Short TTLs for testing
  })

  afterEach(() => {
    guard.destroy()
  })

  // ── 1. Acquire / complete / release cycle ─────────────────────────
  describe('acquire/complete/release cycle', () => {
    it('acquire returns acquired=true on first call', () => {
      const result = guard.acquire('key-1')
      expect(result.acquired).toBe(true)
      expect(result.alreadyProcessing).toBe(false)
      expect(result.completedResponse).toBeUndefined()
    })

    it('complete stores the response', () => {
      guard.acquire('key-2')
      guard.complete('key-2', { success: true, id: 'abc' }, 201, { 'X-Custom': 'yes' })

      const cached = guard.getCachedResponse('key-2')
      expect(cached).toBeDefined()
      expect(cached!.status).toBe('completed')
      expect(cached!.response).toEqual({ success: true, id: 'abc' })
      expect(cached!.responseStatus).toBe(201)
      expect(cached!.responseHeaders).toEqual({ 'X-Custom': 'yes' })
    })

    it('release removes the entry', () => {
      guard.acquire('key-3')
      expect(guard.isProcessing('key-3')).toBe(true)
      guard.release('key-3')
      expect(guard.isProcessing('key-3')).toBe(false)
      expect(guard.size).toBe(0)
    })

    it('complete on non-existent key is a no-op', () => {
      expect(() => guard.complete('no-such', {})).not.toThrow()
    })
  })

  // ── 2. Duplicate key returns cached response ───────────────────────
  describe('duplicate key returns cached response', () => {
    it('returns completed response on second acquire', () => {
      guard.acquire('key-dup')
      guard.complete('key-dup', { amount: 500 }, 200)

      const second = guard.acquire('key-dup')
      expect(second.acquired).toBe(false)
      expect(second.alreadyProcessing).toBe(false)
      expect(second.completedResponse).toBeDefined()
      expect(second.completedResponse!.response).toEqual({ amount: 500 })
    })

    it('getCachedResponse returns undefined for processing entries', () => {
      guard.acquire('key-proc')
      const cached = guard.getCachedResponse('key-proc')
      expect(cached).toBeUndefined()
    })

    it('getCachedResponse returns the response for completed entries', () => {
      guard.acquire('key-done')
      guard.complete('key-done', { data: 'hello' })
      const cached = guard.getCachedResponse<{ data: string }>('key-done')
      expect(cached!.response.data).toBe('hello')
    })
  })

  // ── 3. Concurrent same key returns 409 (already processing) ───────
  describe('concurrent same key returns alreadyProcessing', () => {
    it('second acquire while processing returns alreadyProcessing=true', () => {
      const first = guard.acquire('key-conc')
      expect(first.acquired).toBe(true)

      const second = guard.acquire('key-conc')
      expect(second.acquired).toBe(false)
      expect(second.alreadyProcessing).toBe(true)
      expect(second.completedResponse).toBeUndefined()
    })

    it('isProcessing returns true while in processing state', () => {
      guard.acquire('key-isproc')
      expect(guard.isProcessing('key-isproc')).toBe(true)

      guard.complete('key-isproc', {})
      expect(guard.isProcessing('key-isproc')).toBe(false)
    })
  })

  // ── 4. Expired entries allow re-acquisition ───────────────────────
  describe('expired entries allow re-acquisition', () => {
    it('expired processing entry can be re-acquired', async () => {
      // Use very short TTL
      guard.acquire('key-exp', 1) // 1ms TTL

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10))

      // Should be able to acquire again
      const result = guard.acquire('key-exp', 5000)
      expect(result.acquired).toBe(true)
    })

    it('expired completed entry can be re-acquired', async () => {
      guard.acquire('key-exp-done', 1)
      guard.complete('key-exp-done', { old: true })

      await new Promise((r) => setTimeout(r, 10))

      const result = guard.acquire('key-exp-done', 5000)
      expect(result.acquired).toBe(true)
      expect(result.completedResponse).toBeUndefined()
    })

    it('getCachedResponse returns undefined for expired entries', async () => {
      guard.acquire('key-exp-cache', 1)
      guard.complete('key-exp-cache', { data: 1 })

      await new Promise((r) => setTimeout(r, 10))

      const cached = guard.getCachedResponse('key-exp-cache')
      expect(cached).toBeUndefined()
    })

    it('isProcessing returns false for expired processing entries', async () => {
      guard.acquire('key-exp-proc', 1)

      await new Promise((r) => setTimeout(r, 10))

      expect(guard.isProcessing('key-exp-proc')).toBe(false)
    })
  })

  // ── 5. Failed entries have short TTL (30s) ───────────────────────
  describe('failed entries', () => {
    it('fail sets status to failed', () => {
      guard.acquire('key-fail')
      guard.fail('key-fail')

      // After fail, should NOT be processing
      expect(guard.isProcessing('key-fail')).toBe(false)
      // Should still have an entry (not deleted)
      expect(guard.size).toBe(1)
    })

    it('failed entry can be re-acquired (returns completed with failed status)', () => {
      guard.acquire('key-fail-retry')
      guard.fail('key-fail-retry')

      // Failed entries are returned as completed responses with status 'failed'
      const result = guard.acquire('key-fail-retry')
      expect(result.acquired).toBe(false)
      expect(result.alreadyProcessing).toBe(false)
      expect(result.completedResponse).toBeDefined()
      expect(result.completedResponse!.status).toBe('failed')
    })

    it('fail on non-existent key is a no-op', () => {
      expect(() => guard.fail('no-such')).not.toThrow()
    })
  })

  // ── 6. Key validation ─────────────────────────────────────────────
  describe('key validation', () => {
    it('accepts valid alphanumeric keys', () => {
      expect(IdempotencyGuard.validateKey('abc123')).toBe(true)
    })

    it('accepts keys with hyphens and underscores', () => {
      expect(IdempotencyGuard.validateKey('key-1_with-hyphens_2')).toBe(true)
    })

    it('accepts 255-char keys', () => {
      const key = 'a'.repeat(255)
      expect(IdempotencyGuard.validateKey(key)).toBe(true)
    })

    it('rejects 256-char keys', () => {
      const key = 'a'.repeat(256)
      expect(IdempotencyGuard.validateKey(key)).toBe(false)
    })

    it('rejects empty string', () => {
      expect(IdempotencyGuard.validateKey('')).toBe(false)
    })

    it('rejects keys with spaces', () => {
      expect(IdempotencyGuard.validateKey('key with space')).toBe(false)
    })

    it('rejects keys with special characters', () => {
      expect(IdempotencyGuard.validateKey('key@#$')).toBe(false)
    })

    it('rejects null/undefined', () => {
      expect(IdempotencyGuard.validateKey(null as any)).toBe(false)
      expect(IdempotencyGuard.validateKey(undefined as any)).toBe(false)
    })

    it('static helpers produce well-formed keys', () => {
      const payKey = IdempotencyGuard.paymentKey('pay-123')
      expect(payKey).toBe('idempotency:pay-123')
      // Note: the colon in the static key means it won't pass validateKey,
      // which only allows [a-zA-Z0-9_-]. This is by design — validateKey
      // is for user-supplied Idempotency-Key headers, while static helpers
      // produce internal keys used programmatically.
      expect(payKey).toContain('pay-123')

      const txnKey = IdempotencyGuard.transitionKey('pay-123', 'COMPLETED')
      expect(txnKey).toBe('txn:pay-123:COMPLETED')
      expect(txnKey).toContain('pay-123')
    })
  })

  // ── 7. withIdempotentOperation helper ─────────────────────────────
  describe('withIdempotentOperation', () => {
    it('runs the operation on first call and caches result', async () => {
      const op = vi.fn().mockResolvedValue({ result: 'ok' })
      const testGuard = new IdempotencyGuard(5000, 5000)

      const r1 = await withIdempotentOperation('op-key-1', op, testGuard)
      expect(r1).toEqual({ result: 'ok' })
      expect(op).toHaveBeenCalledTimes(1)

      // Second call should return cached result
      const r2 = await withIdempotentOperation('op-key-1', op, testGuard)
      expect(r2).toEqual({ result: 'ok' })
      expect(op).toHaveBeenCalledTimes(1) // not called again

      testGuard.destroy()
    })

    it('throws if operation is in progress', async () => {
      // Create a never-resolving promise to simulate in-progress
      let resolveOp!: (v: any) => void
      const op = vi.fn().mockImplementation(() => new Promise((r) => { resolveOp = r }))
      const testGuard = new IdempotencyGuard(5000, 5000)

      const promise1 = withIdempotentOperation('op-key-2', op, testGuard)

      // Second call should throw because first is in progress
      await expect(withIdempotentOperation('op-key-2', op, testGuard)).rejects.toThrow('already in progress')

      // Clean up
      resolveOp({ done: true })
      await promise1
      testGuard.destroy()
    })

    it('marks as failed if operation throws', async () => {
      const op = vi.fn().mockRejectedValue(new Error('boom'))
      const testGuard = new IdempotencyGuard(5000, 5000)

      await expect(withIdempotentOperation('op-key-fail', op, testGuard)).rejects.toThrow('boom')
      // Entry should exist in failed status
      expect(testGuard.size).toBe(1)

      testGuard.destroy()
    })
  })

  // ── 10. Cleanup interval purges expired entries ───────────────────
  describe('cleanup interval', () => {
    it('purges expired entries after cleanup interval', async () => {
      // Very short cleanup interval
      const testGuard = new IdempotencyGuard(1, 50) // 1ms TTL, 50ms cleanup

      testGuard.acquire('cleanup-key')
      expect(testGuard.size).toBe(1)

      // Wait for cleanup to run (at least 2x the interval)
      await new Promise((r) => setTimeout(r, 150))

      expect(testGuard.size).toBe(0)
      testGuard.destroy()
    })

    it('does not purge non-expired entries', async () => {
      const testGuard = new IdempotencyGuard(10000, 50) // 10s TTL, 50ms cleanup

      testGuard.acquire('long-lived')
      testGuard.complete('long-lived', { data: 1 })

      await new Promise((r) => setTimeout(r, 150))

      expect(testGuard.size).toBe(1)
      testGuard.destroy()
    })

    it('clear() removes all entries immediately', () => {
      guard.acquire('key-c1')
      guard.acquire('key-c2')
      guard.complete('key-c1', {})
      expect(guard.size).toBe(2)

      guard.clear()
      expect(guard.size).toBe(0)
    })
  })
})

// ── 8 & 9. withIdempotency middleware tests ─────────────────────────
describe('withIdempotency middleware', () => {
  let guard: IdempotencyGuard

  beforeEach(() => {
    guard = new IdempotencyGuard(5000, 5000)
  })

  afterEach(() => {
    guard.destroy()
  })

  function createMockRequest(headers: Record<string, string> = {}, body?: any) {
    const url = 'http://localhost:3000/api/test'
    const init: RequestInit = {
      headers: Object.entries(headers).map(([k, v]) => [k, v] as [string, string]),
    }
    if (body) init.body = JSON.stringify(body)
    return new Request(url, init) as any
  }

  // ── 9. Returns 400 if required header missing ─────────────────────
  it('returns 400 if Idempotency-Key header is required but missing', async () => {
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    const wrapped = withIdempotency(handler, { guard, required: true })

    const req = createMockRequest()
    const response = await wrapped(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('IDEMPOTENCY_KEY_REQUIRED')
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes through when required=false and no header', async () => {
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    }))
    const wrapped = withIdempotency(handler, { guard, required: false })

    const req = createMockRequest()
    const response = await wrapped(req)
    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  // ── 8. Returns cached response on replay ──────────────────────────
  it('returns cached response on replay with X-Idempotency-Replayed header', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ paymentId: 'pay-1', status: 'completed' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'X-Payment-Id': 'pay-1' },
      }),
    )
    const wrapped = withIdempotency(handler, { guard, required: true })

    // First call
    const req1 = createMockRequest({ 'Idempotency-Key': 'idem-1', 'x-user-id': 'user-1' })
    const resp1 = await wrapped(req1)
    expect(resp1.status).toBe(201)
    expect(handler).toHaveBeenCalledTimes(1)

    // Second call — should replay
    const req2 = createMockRequest({ 'Idempotency-Key': 'idem-1', 'x-user-id': 'user-1' })
    const resp2 = await wrapped(req2)
    expect(resp2.status).toBe(201)
    expect(resp2.headers.get('X-Idempotency-Replayed')).toBe('true')
    expect(handler).toHaveBeenCalledTimes(1) // not called again
  })

  it('returns 409 if already processing', async () => {
    let resolveHandler!: (v: any) => void
    const handler = vi.fn().mockImplementation(() => new Promise((r) => { resolveHandler = r }))
    const wrapped = withIdempotency(handler, { guard, required: true })

    const req1 = createMockRequest({ 'Idempotency-Key': 'idem-409', 'x-user-id': 'user-1' })
    const promise1 = wrapped(req1)

    const req2 = createMockRequest({ 'Idempotency-Key': 'idem-409', 'x-user-id': 'user-1' })
    const resp2 = await wrapped(req2)
    expect(resp2.status).toBe(409)
    const data = await resp2.json()
    expect(data.code).toBe('IDEMPOTENCY_CONFLICT')
    expect(resp2.headers.get('Retry-After')).toBe('5')

    // Clean up
    resolveHandler(new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    await promise1
  })

  it('returns 400 for invalid key format', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('{}'))
    const wrapped = withIdempotency(handler, { guard, required: true })

    const req = createMockRequest({ 'Idempotency-Key': 'invalid key!@#', 'x-user-id': 'user-1' })
    const resp = await wrapped(req)
    expect(resp.status).toBe(400)
    const data = await resp.json()
    expect(data.code).toBe('IDEMPOTENCY_KEY_INVALID')
    expect(handler).not.toHaveBeenCalled()
  })

  it('stores failed state if handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('handler error'))
    const wrapped = withIdempotency(handler, { guard, required: true })

    const req = createMockRequest({ 'Idempotency-Key': 'idem-err', 'x-user-id': 'user-1' })
    await expect(wrapped(req)).rejects.toThrow('handler error')
  })
})
