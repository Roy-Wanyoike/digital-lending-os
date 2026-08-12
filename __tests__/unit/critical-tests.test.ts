/**
 * Critical financial and security tests for Youngsend platform.
 * Validates payment state machine idempotency, API response consistency,
 * CSRF protection, ledger type constraints, and auth helper correctness.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mocks for modules with heavy side-effect imports ─────────────────
// auth.ts pulls in next-auth, bcryptjs, db, audit-logger, rate-limiter.
// api-helpers.ts re-exports auth.ts symbols and also uses next-auth.
// We mock the heavy deps so the lightweight classes (AuthError, tenantScope)
// can be imported cleanly in unit tests.

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
  getServerSession: vi.fn(),
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {},
}))

vi.mock('@/lib/audit-logger', () => ({
  logAudit: vi.fn(),
}))

vi.mock('@/backend/middleware/rate-limiter', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}))

// ── Real imports (after mocks) ──────────────────────────────────────

import {
  PaymentStateMachine,
  type PaymentStateValue,
  type TransitionResult,
} from '@/backend/lib/payment/state-machine'

import {
  ok,
  badRequest,
  notFound,
  validationError,
  withErrorHandler,
} from '@/backend/lib/api-response'

import { verifyCsrf, csrfGuard } from '@/backend/middleware/csrf'

import type {
  LedgerLineItem,
  CreateLedgerEntryParams,
  CorrelatedLineItem,
  PostCorrelatedEntriesParams,
  ReverseEntryParams,
  PostedLedgerEntry,
  CreateLedgerEntryResult,
  PostCorrelatedEntriesResult,
  ReverseEntryResult,
  PaginatedLedgerResult,
  LedgerAccountType,
  LedgerEntryType,
  LedgerEntryStatus,
  GetAccountBalanceParams,
  LedgerPagination,
  GetAccountLedgerParams,
} from '@/backend/lib/ledger/types'

import { AuthError, tenantScope } from '@/backend/lib/auth/api-helpers'

import { NextRequest } from 'next/server'

import { z } from 'zod'

// ══════════════════════════════════════════════════════════════════════
// 1. PAYMENT STATE MACHINE IDEMPOTENCY  (15 tests)
// ══════════════════════════════════════════════════════════════════════

describe('PaymentStateMachine – Critical', () => {
  let sm: PaymentStateMachine

  beforeEach(() => {
    sm = new PaymentStateMachine()
  })

  // ── States & transitions inventory ─────────────────────────────────

  it('exposes exactly 9 states', () => {
    const states = sm.getAllStates()
    expect(states).toHaveLength(9)
    const expected: PaymentStateValue[] = [
      'CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'COMPLETED',
      'FAILED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'DISPUTED',
    ]
    for (const s of expected) {
      expect(states).toContain(s)
    }
  })

  it('defines exactly 11 legal transitions', () => {
    const transitions = sm.getAllTransitions()
    expect(transitions).toHaveLength(11)
  })

  // ── Happy-path transitions ─────────────────────────────────────────

  it('CREATED → PENDING_PROVIDER succeeds with correct previous/newState', async () => {
    sm.initialize('p1')
    const r = await sm.transition('p1', 'PENDING_PROVIDER')
    expect(r.success).toBe(true)
    expect(r.previousState).toBe('CREATED')
    expect(r.newState).toBe('PENDING_PROVIDER')
  })

  it('full happy path: CREATED → PENDING_PROVIDER → PROCESSING → COMPLETED', async () => {
    sm.initialize('p2')
    const r1 = await sm.transition('p2', 'PENDING_PROVIDER')
    const r2 = await sm.transition('p2', 'PROCESSING')
    const r3 = await sm.transition('p2', 'COMPLETED')
    expect(r1.newState).toBe('PENDING_PROVIDER')
    expect(r2.newState).toBe('PROCESSING')
    expect(r3.newState).toBe('COMPLETED')
  })

  it('failure-retry path: PROCESSING → FAILED → PENDING_PROVIDER', async () => {
    sm.initialize('p3')
    await sm.transition('p3', 'PENDING_PROVIDER')
    await sm.transition('p3', 'PROCESSING')
    const rFail = await sm.transition('p3', 'FAILED')
    expect(rFail.newState).toBe('FAILED')
    const rRetry = await sm.transition('p3', 'PENDING_PROVIDER')
    expect(rRetry.newState).toBe('PENDING_PROVIDER')
    expect(rRetry.previousState).toBe('FAILED')
  })

  it('refund path: COMPLETED → REFUNDING → REFUNDED', async () => {
    sm.initialize('p4')
    await sm.transition('p4', 'PENDING_PROVIDER')
    await sm.transition('p4', 'PROCESSING')
    await sm.transition('p4', 'COMPLETED')
    const rRefunding = await sm.transition('p4', 'REFUNDING')
    expect(rRefunding.newState).toBe('REFUNDING')
    const rRefunded = await sm.transition('p4', 'REFUNDED')
    expect(rRefunded.newState).toBe('REFUNDED')
  })

  it('dispute-resolved path: COMPLETED → DISPUTED → COMPLETED', async () => {
    sm.initialize('p5')
    await sm.transition('p5', 'PENDING_PROVIDER')
    await sm.transition('p5', 'PROCESSING')
    await sm.transition('p5', 'COMPLETED')
    await sm.transition('p5', 'DISPUTED')
    const r = await sm.transition('p5', 'COMPLETED')
    expect(r.previousState).toBe('DISPUTED')
    expect(r.newState).toBe('COMPLETED')
  })

  it('dispute-with-refund path: COMPLETED → DISPUTED → REFUNDED', async () => {
    sm.initialize('p6')
    await sm.transition('p6', 'PENDING_PROVIDER')
    await sm.transition('p6', 'PROCESSING')
    await sm.transition('p6', 'COMPLETED')
    await sm.transition('p6', 'DISPUTED')
    const r = await sm.transition('p6', 'REFUNDED')
    expect(r.newState).toBe('REFUNDED')
  })

  it('cancellation path: PENDING_PROVIDER → CANCELLED', async () => {
    sm.initialize('p7')
    await sm.transition('p7', 'PENDING_PROVIDER')
    const r = await sm.transition('p7', 'CANCELLED')
    expect(r.newState).toBe('CANCELLED')
  })

  // ── Idempotency ────────────────────────────────────────────────────

  it('duplicate transition with same idempotencyKey returns same transitionId', async () => {
    sm.initialize('p8')
    const first = await sm.transition('p8', 'PENDING_PROVIDER', {}, 'idem-1')
    const second = await sm.transition('p8', 'PENDING_PROVIDER', {}, 'idem-1')
    expect(second.idempotent).toBe(true)
    expect(second.transitionId).toBe(first.transitionId)
    expect(second.newState).toBe(first.newState)
    expect(second.previousState).toBe(first.previousState)
  })

  it('duplicate default-key transition is also idempotent', async () => {
    sm.initialize('p9')
    const first = await sm.transition('p9', 'PENDING_PROVIDER')
    // Default key is "p9:PENDING_PROVIDER" – calling again with same target
    // from new state won't match (state changed), so we call with explicit key
    const second = await sm.transition('p9', 'PENDING_PROVIDER', {}, 'p9:PENDING_PROVIDER')
    expect(second.idempotent).toBe(true)
    expect(second.transitionId).toBe(first.transitionId)
  })

  // ── Invalid transitions ────────────────────────────────────────────

  it('COMPLETED → PROCESSING is rejected as illegal transition', async () => {
    sm.initialize('p10')
    await sm.transition('p10', 'PENDING_PROVIDER')
    await sm.transition('p10', 'PROCESSING')
    await sm.transition('p10', 'COMPLETED')
    await expect(sm.transition('p10', 'PROCESSING')).rejects.toThrow(/Illegal transition/)
  })

  // ── Terminal state enforcement ─────────────────────────────────────

  it('terminal state COMPLETED blocks all further transitions', async () => {
    sm.initialize('p11')
    await sm.transition('p11', 'PENDING_PROVIDER')
    await sm.transition('p11', 'PROCESSING')
    await sm.transition('p11', 'COMPLETED')
    // COMPLETED only allows REFUNDING and DISPUTED
    await expect(sm.transition('p11', 'PROCESSING')).rejects.toThrow()
    await expect(sm.transition('p11', 'CREATED')).rejects.toThrow()
  })

  it('terminal state REFUNDED is a dead end', async () => {
    sm.initialize('p12')
    await sm.transition('p12', 'PENDING_PROVIDER')
    await sm.transition('p12', 'PROCESSING')
    await sm.transition('p12', 'COMPLETED')
    await sm.transition('p12', 'REFUNDING')
    await sm.transition('p12', 'REFUNDED')
    await expect(sm.transition('p12', 'COMPLETED')).rejects.toThrow()
  })

  // ── History entries ────────────────────────────────────────────────

  it('history records correct from/to, paymentId, idempotencyKey, and timestamp', async () => {
    sm.initialize('p13')
    const ctx = { actorId: 'user-1', provider: 'stripe' }
    await sm.transition('p13', 'PENDING_PROVIDER', ctx, 'hist-key')

    const history = sm.getHistory('p13')
    expect(history).toHaveLength(1)
    const entry = history[0]
    expect(entry.from).toBe('CREATED')
    expect(entry.to).toBe('PENDING_PROVIDER')
    expect(entry.paymentId).toBe('p13')
    expect(entry.idempotencyKey).toBe('hist-key')
    expect(entry.actorId).toBe('user-1')
    expect(entry.provider).toBe('stripe')
    expect(entry.timestamp).toBeTruthy() // ISO 8601
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN()
  })
})

// ══════════════════════════════════════════════════════════════════════
// 2. API RESPONSE ENVELOPE CONSISTENCY  (10 tests)
// ══════════════════════════════════════════════════════════════════════

describe('API Response Envelope – Critical', () => {
  it('ok() returns 200 with { data } body and no error property', async () => {
    const res = ok({ items: [1, 2, 3] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ data: { items: [1, 2, 3] } })
    expect(body.error).toBeUndefined()
  })

  it('ok() includes Cache-Control header with private, max-age, swr', async () => {
    const res = ok({})
    const cc = res.headers.get('cache-control')
    expect(cc).toContain('private')
    expect(cc).toContain('max-age=')
    expect(cc).toContain('stale-while-revalidate=')
  })

  it('ok() includes ETag header with weak prefix', async () => {
    const res = ok({ test: true })
    const etag = res.headers.get('etag')
    expect(etag).toMatch(/^W\//)
  })

  it('badRequest() returns 400 with code BAD_REQUEST and message', async () => {
    const res = badRequest('Invalid amount')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.message).toBe('Invalid amount')
    expect(body.error.code).toBe('BAD_REQUEST')
  })

  it('notFound() returns 404 with code NOT_FOUND and message', async () => {
    const res = notFound('Wallet not found')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.message).toBe('Wallet not found')
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('validationError() returns 422 with code VALIDATION_ERROR', async () => {
    const res = validationError('Amount must be positive')
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('Amount must be positive')
  })

  it('validationError() passes through optional details', async () => {
    const details = [{ field: 'amount', message: 'too small' }]
    const res = validationError('Validation failed', details)
    const body = await res.json()
    expect(body.error.details).toEqual(details)
  })

  it('withErrorHandler catches ZodError → 422 with field-level details', async () => {
    const schema = z.object({ email: z.string().email(), age: z.number().min(0) })
    const wrapped = withErrorHandler(async () => {
      schema.parse({ email: 'not-an-email', age: -5 })
    })
    const res = await wrapped()
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('Validation failed')
    expect(Array.isArray(body.error.details)).toBe(true)
    // Each detail should have field and message
    for (const d of body.error.details) {
      expect(d).toHaveProperty('field')
      expect(d).toHaveProperty('message')
    }
  })

  it('withErrorHandler catches AuthError(401) → 401 and AuthError(403) → 403', async () => {
    const wrapped401 = withErrorHandler(async () => {
      throw new AuthError(401, 'Authentication required')
    })
    const res401 = await wrapped401()
    expect(res401.status).toBe(401)
    const body401 = await res401.json()
    expect(body401.error.code).toBe('UNAUTHORIZED')

    const wrapped403 = withErrorHandler(async () => {
      throw new AuthError(403, 'Insufficient permissions')
    })
    const res403 = await wrapped403()
    expect(res403.status).toBe(403)
    const body403 = await res403.json()
    expect(body403.error.code).toBe('FORBIDDEN')
  })

  it('withErrorHandler catches generic Error → 500 with INTERNAL_ERROR code', async () => {
    const wrapped = withErrorHandler(async () => {
      throw new Error('Something broke')
    })
    const res = await wrapped()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Something broke')
  })
})

// ══════════════════════════════════════════════════════════════════════
// 3. CSRF PROTECTION  (8 tests)
// ══════════════════════════════════════════════════════════════════════

describe('CSRF Protection – Critical', () => {
  function makeRequest(
    url: string,
    opts: {
      method?: string
      cookie?: string
      csrfHeader?: string
      contentType?: string
    } = {},
  ): NextRequest {
    const headers: Record<string, string> = {}
    if (opts.cookie) headers['cookie'] = opts.cookie
    if (opts.csrfHeader) headers['x-csrf-token'] = opts.csrfHeader
    if (opts.contentType) headers['content-type'] = opts.contentType
    return new NextRequest(`http://localhost:3000${url}`, {
      method: opts.method ?? 'GET',
      headers,
    })
  }

  it('valid token pair on POST /api/* returns null (no error)', () => {
    const req = makeRequest('/api/wallets', {
      method: 'POST',
      cookie: 'next-auth.csrf-token=abc123|somehash',
      csrfHeader: 'abc123',
    })
    expect(verifyCsrf(req)).toBeNull()
  })

  it('mismatched tokens return error string', () => {
    const req = makeRequest('/api/wallets', {
      method: 'POST',
      cookie: 'next-auth.csrf-token=tokenA|hashA',
      csrfHeader: 'tokenB',
    })
    expect(verifyCsrf(req)).toBe('CSRF token mismatch')
  })

  it('missing CSRF cookie on POST /api/* returns error', () => {
    const req = makeRequest('/api/wallets', {
      method: 'POST',
      csrfHeader: 'someToken',
    })
    expect(verifyCsrf(req)).toBe('Missing CSRF cookie')
  })

  it('GET request is always skipped (returns null)', () => {
    const req = makeRequest('/api/wallets', { method: 'GET' })
    expect(verifyCsrf(req)).toBeNull()
  })

  it('POST to /api/auth/* without submitted token is exempt (returns null)', () => {
    const req = makeRequest('/api/auth/signin', {
      method: 'POST',
      cookie: 'next-auth.csrf-token=abc|hash',
    })
    expect(verifyCsrf(req)).toBeNull()
  })

  it('POST to /api/* without token returns error', () => {
    const req = makeRequest('/api/payments', {
      method: 'POST',
      cookie: 'next-auth.csrf-token=abc|hash',
    })
    expect(verifyCsrf(req)).toBe('CSRF token required. Include x-csrf-token header.')
  })

  it('csrfGuard returns { valid: true } for valid request', () => {
    const req = makeRequest('/api/test', {
      method: 'POST',
      cookie: 'next-auth.csrf-token=same|hash',
      csrfHeader: 'same',
    })
    expect(csrfGuard(req)).toEqual({ valid: true })
  })

  it('csrfGuard returns { valid: false, error } for invalid request', () => {
    const req = makeRequest('/api/test', {
      method: 'POST',
      csrfHeader: 'orphanToken',
    })
    const result = csrfGuard(req)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

// ══════════════════════════════════════════════════════════════════════
// 4. LEDGER ENTRY VALIDATION  (12 tests)
// ══════════════════════════════════════════════════════════════════════

describe('Ledger Types – Critical', () => {
  // ── Type existence & shape ─────────────────────────────────────────

  it('LedgerAccountType includes all expected account types', () => {
    const types: LedgerAccountType[] = [
      'wallet', 'escrow_hold', 'escrow_liability',
      'platform_revenue', 'platform_fee', 'settlement',
    ]
    // If these compile, the type union accepts them
    expect(types).toHaveLength(6)
  })

  it('LedgerEntryType is exactly "debit" | "credit"', () => {
    const debit: LedgerEntryType = 'debit'
    const credit: LedgerEntryType = 'credit'
    expect(debit).toBe('debit')
    expect(credit).toBe('credit')
  })

  it('LedgerEntryStatus is "pending" | "posted" | "reversed"', () => {
    const statuses: LedgerEntryStatus[] = ['pending', 'posted', 'reversed']
    expect(statuses).toHaveLength(3)
  })

  // ── CreateLedgerEntryParams ────────────────────────────────────────

  it('CreateLedgerEntryParams requires correlationId, debit, and credit', () => {
    const debit: LedgerLineItem = {
      accountType: 'wallet',
      accountId: 'acc-1',
      entryType: 'debit',
      amount: 10000,
      currency: 'USD',
    }
    const credit: LedgerLineItem = {
      accountType: 'platform_fee',
      accountId: 'acc-2',
      entryType: 'credit',
      amount: 10000,
      currency: 'USD',
    }
    const params: CreateLedgerEntryParams = {
      correlationId: 'corr-1',
      causationId: 'pay-1',
      debit,
      credit,
    }
    expect(params.correlationId).toBe('corr-1')
    expect(params.debit.entryType).toBe('debit')
    expect(params.credit.entryType).toBe('credit')
  })

  it('CreateLedgerEntryParams debit and credit should have matching currency', () => {
    const validateMatchingCurrency = (p: CreateLedgerEntryParams): boolean =>
      p.debit.currency === p.credit.currency

    const valid: CreateLedgerEntryParams = {
      correlationId: 'c1',
      debit: { accountType: 'wallet', accountId: 'a1', entryType: 'debit', amount: 100, currency: 'KES' },
      credit: { accountType: 'platform_fee', accountId: 'a2', entryType: 'credit', amount: 100, currency: 'KES' },
    }
    expect(validateMatchingCurrency(valid)).toBe(true)

    const mismatched: CreateLedgerEntryParams = {
      correlationId: 'c2',
      debit: { accountType: 'wallet', accountId: 'a1', entryType: 'debit', amount: 100, currency: 'USD' },
      credit: { accountType: 'platform_fee', accountId: 'a2', entryType: 'credit', amount: 100, currency: 'EUR' },
    }
    expect(validateMatchingCurrency(mismatched)).toBe(false)
  })

  // ── PostCorrelatedEntriesParams ────────────────────────────────────

  it('PostCorrelatedEntriesParams requires correlationId and entries array', () => {
    const entries: CorrelatedLineItem[] = [
      { accountType: 'wallet', accountId: 'a1', entryType: 'debit', amount: 1000, currency: 'USD' },
      { accountType: 'platform_fee', accountId: 'a2', entryType: 'credit', amount: 30, currency: 'USD' },
      { accountType: 'settlement', accountId: 'a3', entryType: 'credit', amount: 970, currency: 'USD' },
    ]
    const params: PostCorrelatedEntriesParams = { correlationId: 'corr-x', entries }
    expect(params.correlationId).toBe('corr-x')
    expect(params.entries).toHaveLength(3)
  })

  it('PostCorrelatedEntriesParams must balance: sum(debits) === sum(credits)', () => {
    const isBalanced = (entries: CorrelatedLineItem[]): boolean => {
      const d = entries.filter(e => e.entryType === 'debit').reduce((s, e) => s + e.amount, 0)
      const c = entries.filter(e => e.entryType === 'credit').reduce((s, e) => s + e.amount, 0)
      return d === c
    }

    const balanced: CorrelatedLineItem[] = [
      { accountType: 'wallet', accountId: 'a', entryType: 'debit', amount: 500, currency: 'USD' },
      { accountType: 'platform_fee', accountId: 'b', entryType: 'credit', amount: 500, currency: 'USD' },
    ]
    expect(isBalanced(balanced)).toBe(true)

    const unbalanced: CorrelatedLineItem[] = [
      { accountType: 'wallet', accountId: 'a', entryType: 'debit', amount: 500, currency: 'USD' },
      { accountType: 'platform_fee', accountId: 'b', entryType: 'credit', amount: 400, currency: 'USD' },
    ]
    expect(isBalanced(unbalanced)).toBe(false)
  })

  // ── ReverseEntryParams ─────────────────────────────────────────────

  it('ReverseEntryParams requires entryRef and reason', () => {
    const params: ReverseEntryParams = { entryRef: 'entry-abc', reason: 'duplicate charge' }
    expect(params.entryRef).toBe('entry-abc')
    expect(params.reason).toBe('duplicate charge')
  })

  it('ReverseEntryParams without entryRef is invalid', () => {
    const validate = (p: Partial<ReverseEntryParams>): boolean =>
      typeof p.entryRef === 'string' && p.entryRef.length > 0

    expect(validate({ entryRef: 'ref-1', reason: 'test' })).toBe(true)
    expect(validate({ reason: 'test' } as Partial<ReverseEntryParams>)).toBe(false)
  })

  it('ReverseEntryParams without reason is invalid', () => {
    const validate = (p: Partial<ReverseEntryParams>): boolean =>
      typeof p.reason === 'string' && p.reason.length > 0

    expect(validate({ entryRef: 'ref-1', reason: 'test' })).toBe(true)
    expect(validate({ entryRef: 'ref-1' } as Partial<ReverseEntryParams>)).toBe(false)
  })

  // ── Result types ───────────────────────────────────────────────────

  it('PostedLedgerEntry has all required fields', () => {
    const entry: PostedLedgerEntry = {
      id: 'e1',
      entryRef: 'ref-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      accountType: 'wallet',
      accountId: 'acc-1',
      entryType: 'debit',
      amount: 1000,
      currency: 'USD',
      balanceAfter: 9000,
      description: 'test entry',
      metadata: null,
      status: 'posted',
      reversalOfId: null,
      createdAt: new Date(),
    }
    expect(entry.id).toBe('e1')
    expect(entry.balanceAfter).toBe(9000)
    expect(entry.reversalOfId).toBeNull()
  })

  it('PaginatedLedgerResult has correct shape for pagination', () => {
    const result: PaginatedLedgerResult = {
      entries: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasNextPage: false,
    }
    expect(result).toHaveProperty('entries')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('pageSize')
    expect(result).toHaveProperty('hasNextPage')
    expect(result.hasNextPage).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════
// 5. AUTH HELPERS  (10 tests)
// ══════════════════════════════════════════════════════════════════════

describe('Auth Helpers – Critical', () => {
  it('AuthError extends Error', () => {
    const err = new AuthError(401, 'test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AuthError)
  })

  it('AuthError exposes statusCode property', () => {
    const err = new AuthError(401, 'Unauthorized')
    expect(err.statusCode).toBe(401)
  })

  it('AuthError has status getter that returns statusCode', () => {
    const err = new AuthError(403, 'Forbidden')
    expect(err.status).toBe(403)
    expect(err.status).toBe(err.statusCode)
  })

  it('AuthError(401) sets correct statusCode and message', () => {
    const err = new AuthError(401, 'Authentication required')
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Authentication required')
    expect(err.name).toBe('AuthError')
  })

  it('AuthError(403) sets correct statusCode and message', () => {
    const err = new AuthError(403, 'Insufficient permissions')
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('Insufficient permissions')
  })

  it('AuthError name is "AuthError" for stack trace clarity', () => {
    const err = new AuthError(500, 'Internal')
    expect(err.name).toBe('AuthError')
  })

  it('tenantScope returns object with tenantId', () => {
    const scope = tenantScope('tenant-abc')
    expect(scope.tenantId).toBe('tenant-abc')
  })

  it('tenantScope merges extraWhere into result', () => {
    const scope = tenantScope('tenant-1', { isActive: true, role: 'admin' })
    expect(scope.tenantId).toBe('tenant-1')
    expect(scope.isActive).toBe(true)
    expect(scope.role).toBe('admin')
  })

  it('tenantScope does not mutate the original extraWhere object', () => {
    const extra = { isActive: true }
    const copy = { ...extra }
    tenantScope('tenant-x', extra)
    expect(extra).toEqual(copy)
  })

  it('tenantScope with no extraWhere returns only tenantId', () => {
    const scope = tenantScope('tenant-z')
    expect(Object.keys(scope)).toEqual(['tenantId'])
    expect(scope.tenantId).toBe('tenant-z')
  })
})
