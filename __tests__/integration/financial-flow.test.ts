/**
 * Financial integration tests — simulates end-to-end financial flows
 * by composing the state machine, idempotency guard, and ledger together.
 * All DB interactions are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentStateMachine, type PaymentStateValue } from '@/backend/lib/payment/state-machine'
import { IdempotencyGuard } from '@/backend/lib/payment/idempotency'

// ── Mock Prisma DB (same pattern as ledger-reconciliation tests) ──

let ledgerStore: any[] = []
let createdAtCounter = 0

function nextCreatedAt() { return ++createdAtCounter }

function createMockTx() {
  return {
    ledgerEntry: {
      findFirst: vi.fn(async (args: any) => {
        let results = [...ledgerStore]
        if (args.where) {
          if (args.where.accountType) results = results.filter((e) => e.accountType === args.where.accountType)
          if (args.where.accountId) results = results.filter((e) => e.accountId === args.where.accountId)
          if (args.where.currency) results = results.filter((e) => e.currency === args.where.currency)
          if (args.where.status) results = results.filter((e) => e.status === args.where.status)
          if (args.where.entryRef) results = results.filter((e) => e.entryRef === args.where.entryRef)
        }
        if (args.orderBy?.createdAt === 'desc') {
          results.sort((a, b) => b.createdAt - a.createdAt)
        } else {
          results.sort((a, b) => a.createdAt - b.createdAt)
        }
        if (args.select?.balanceAfter) {
          return results[0] ? { balanceAfter: results[0].balanceAfter } : null
        }
        return results[0] ?? null
      }),
      findUnique: vi.fn(async (args: any) => {
        if (args.where.entryRef) {
          return ledgerStore.find((e) => e.entryRef === args.where.entryRef) ?? null
        }
        return null
      }),
      findMany: vi.fn(async (args: any) => {
        let results = [...ledgerStore]
        if (args.where) {
          if (args.where.accountType) results = results.filter((e) => e.accountType === args.where.accountType)
          if (args.where.accountId) results = results.filter((e) => e.accountId === args.where.accountId)
          if (args.where.currency) results = results.filter((e) => e.currency === args.where.currency)
          if (args.where.status) results = results.filter((e) => e.status === args.where.status)
        }
        if (args.orderBy?.createdAt === 'asc') {
          results.sort((a, b) => a.createdAt - b.createdAt)
        } else {
          results.sort((a, b) => b.createdAt - a.createdAt)
        }
        return results.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? 50))
      }),
      count: vi.fn(async (args: any) => {
        let results = [...ledgerStore]
        if (args.where) {
          if (args.where.accountType) results = results.filter((e) => e.accountType === args.where.accountType)
          if (args.where.accountId) results = results.filter((e) => e.accountId === args.where.accountId)
          if (args.where.currency) results = results.filter((e) => e.currency === args.where.currency)
          if (args.where.status) results = results.filter((e) => e.status === args.where.status)
        }
        return results.length
      }),
      create: vi.fn(async (args: any) => {
        const entry = {
          id: `id_${Math.random().toString(36).slice(2, 10)}`,
          createdAt: nextCreatedAt(),
          ...args.data,
        }
        ledgerStore.push(entry)
        return entry
      }),
      update: vi.fn(async (args: any) => {
        const idx = ledgerStore.findIndex((e) => e.id === args.where.id)
        if (idx >= 0) {
          ledgerStore[idx] = { ...ledgerStore[idx], ...args.data }
          return ledgerStore[idx]
        }
        throw new Error('Not found')
      }),
    },
  }
}

const mockTransactionFn = vi.fn(async (fn: any) => {
  const tx = createMockTx()
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  db: new Proxy({} as any, {
    get(_, prop) {
      if (prop === '$transaction') return mockTransactionFn
      const tx = createMockTx()
      return (tx as any)[prop]
    },
  }),
}))

// ── Import after mock setup ────────────────────────────────────

import {
  createLedgerEntry,
  postCorrelatedEntries,
  reverseEntry,
  getAccountBalance,
} from '@/backend/lib/ledger/ledger'

// ── Helpers: simulate financial flows ──────────────────────────

/**
 * Simulate the full happy-path payment completion.
 */
async function simulatePaymentFlow(
  paymentId: string,
  amount: number,
  currency: string,
  sm: PaymentStateMachine,
  guard: IdempotencyGuard,
) {
  const idempotencyKey = `paykey_${paymentId}`

  const existing = guard.getCachedResponse(idempotencyKey)
  if (existing) return { idempotent: true, existing }

  const acquireResult = guard.acquire(idempotencyKey)
  if (!acquireResult.acquired) {
    if (acquireResult.alreadyProcessing) throw new Error('Payment already being processed')
    return { idempotent: true, existing: acquireResult.completedResponse }
  }

  try {
    sm.initialize(paymentId)
    await sm.transition(paymentId, 'PENDING_PROVIDER', { provider: 'paystack' })
    await sm.transition(paymentId, 'PROCESSING', { provider: 'paystack' })
    await sm.transition(paymentId, 'COMPLETED', { provider: 'paystack' })

    const fee = Math.round(amount * 0.015)
    const netAmount = amount - fee

    const ledgerResult = await postCorrelatedEntries({
      correlationId: `pay-${paymentId}`,
      causationId: paymentId,
      entries: [
        { accountType: 'escrow_hold', accountId: `esc-${paymentId}`, entryType: 'debit', amount, currency, description: 'Payment received' },
        { accountType: 'wallet', accountId: `merchant-${paymentId}`, entryType: 'credit', amount: netAmount, currency, description: 'Net to merchant' },
        { accountType: 'platform_fee', accountId: 'system', entryType: 'credit', amount: fee, currency, description: 'Platform fee' },
      ],
    })

    const result = { paymentId, status: 'COMPLETED' as const, amount, fee, netAmount, ledgerEntries: ledgerResult.entries.length }
    guard.complete(idempotencyKey, result, 201)
    return { idempotent: false, result }
  } catch (error) {
    guard.fail(idempotencyKey)
    throw error
  }
}

// ── Tests ──────────────────────────────────────────────────────

let sm: PaymentStateMachine
let guard: IdempotencyGuard

beforeEach(() => {
  ledgerStore = []
  createdAtCounter = 0
  vi.clearAllMocks()
  sm = new PaymentStateMachine()
  guard = new IdempotencyGuard(5000, 5000)
})

describe('Financial Flow Integration', () => {
  // ── 1. Complete payment flow ──────────────────────────────────────
  describe('complete payment flow', () => {
    it('create intent → process → complete → ledger entries created', async () => {
      const result = await simulatePaymentFlow('pay-int-1', 10000, 'KES', sm, guard)

      expect(result.idempotent).toBe(false)
      expect(result.result!.status).toBe('COMPLETED')
      expect(result.result!.amount).toBe(10000)
      expect(result.result!.fee).toBe(150)
      expect(result.result!.netAmount).toBe(9850)
      expect(result.result!.ledgerEntries).toBe(3)

      expect(sm.getState('pay-int-1')).toBe('COMPLETED')
      expect(sm.getHistory('pay-int-1')).toHaveLength(3)

      const escrowBalance = await getAccountBalance({ accountType: 'escrow_hold', accountId: 'esc-pay-int-1', currency: 'KES' })
      expect(escrowBalance).toBe(10000)

      const walletBalance = await getAccountBalance({ accountType: 'wallet', accountId: 'merchant-pay-int-1', currency: 'KES' })
      expect(walletBalance).toBe(-9850)

      const feeBalance = await getAccountBalance({ accountType: 'platform_fee', accountId: 'system', currency: 'KES' })
      expect(feeBalance).toBe(-150)
    })

    it('idempotent replay returns cached result without new ledger entries', async () => {
      const first = await simulatePaymentFlow('pay-int-2', 5000, 'KES', sm, guard)
      expect(first.idempotent).toBe(false)

      const beforeReplay = ledgerStore.length
      const second = await simulatePaymentFlow('pay-int-2', 5000, 'KES', sm, guard)
      expect(second.idempotent).toBe(true)
      expect(ledgerStore.length).toBe(beforeReplay)
    })
  })

  // ── 2. Escrow flow ───────────────────────────────────────────────
  describe('escrow flow', () => {
    it('fund → release → ledger entries for all legs', async () => {
      const paymentId = 'pay-esc-1'
      const amount = 25000
      const currency = 'KES'

      sm.initialize(paymentId)
      await sm.transition(paymentId, 'PENDING_PROVIDER')
      await sm.transition(paymentId, 'PROCESSING')
      await sm.transition(paymentId, 'COMPLETED')

      // Fund escrow: debit escrow_hold, credit buyer wallet
      const fundResult = await createLedgerEntry({
        correlationId: `escrow-fund-${paymentId}`,
        causationId: paymentId,
        debit: { accountType: 'escrow_hold', accountId: `escrow-${paymentId}`, entryType: 'debit', amount, currency, description: 'Escrow funded' },
        credit: { accountType: 'wallet', accountId: `buyer-${paymentId}`, entryType: 'credit', amount, currency, description: 'Buyer wallet debited for escrow' },
      })

      expect(fundResult.debit.balanceAfter).toBe(amount)
      expect(fundResult.credit.balanceAfter).toBe(-amount)

      // Release escrow: debit seller wallet, credit escrow_hold
      const releaseResult = await createLedgerEntry({
        correlationId: `escrow-release-${paymentId}`,
        causationId: paymentId,
        debit: { accountType: 'wallet', accountId: `seller-${paymentId}`, entryType: 'debit', amount, currency, description: 'Seller receives escrow release' },
        credit: { accountType: 'escrow_hold', accountId: `escrow-${paymentId}`, entryType: 'credit', amount, currency, description: 'Escrow hold released' },
      })

      // Escrow balance: 25000 (funded) - 25000 (released) = 0
      const escrowBalance = await getAccountBalance({ accountType: 'escrow_hold', accountId: `escrow-${paymentId}`, currency })
      expect(escrowBalance).toBe(0)

      // Seller wallet: +25000
      const sellerBalance = await getAccountBalance({ accountType: 'wallet', accountId: `seller-${paymentId}`, currency })
      expect(sellerBalance).toBe(amount)

      // Buyer wallet: -25000
      const buyerBalance = await getAccountBalance({ accountType: 'wallet', accountId: `buyer-${paymentId}`, currency })
      expect(buyerBalance).toBe(-amount)

      // Double-entry invariant: debits == credits
      const totalDebits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'debit')
        .reduce((s, e) => s + e.amount, 0)
      const totalCredits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'credit')
        .reduce((s, e) => s + e.amount, 0)
      expect(totalDebits).toBe(totalCredits)
    })
  })

  // ── 3. Withdrawal flow ───────────────────────────────────────────
  describe('withdrawal flow', () => {
    it('fund wallet → withdraw → balance decreased', async () => {
      const paymentId = 'pay-wd-1'
      const amount = 5000
      const currency = 'KES'

      // Fund the wallet
      await createLedgerEntry({
        correlationId: `wd-fund-${paymentId}`,
        debit: { accountType: 'wallet', accountId: `user-${paymentId}`, entryType: 'debit', amount: 10000, currency },
        credit: { accountType: 'platform_revenue', accountId: 'system', entryType: 'credit', amount: 10000, currency },
      })

      expect(await getAccountBalance({ accountType: 'wallet', accountId: `user-${paymentId}`, currency })).toBe(10000)

      // Withdrawal (credit wallet = decrease balance)
      await createLedgerEntry({
        correlationId: `wd-withdraw-${paymentId}`,
        causationId: paymentId,
        debit: { accountType: 'settlement', accountId: 'bank', entryType: 'debit', amount, currency },
        credit: { accountType: 'wallet', accountId: `user-${paymentId}`, entryType: 'credit', amount, currency },
      })

      // Wallet should be 10000 - 5000 = 5000
      const walletBalance = await getAccountBalance({ accountType: 'wallet', accountId: `user-${paymentId}`, currency })
      expect(walletBalance).toBe(5000)

      // Settlement should be 5000
      const settlementBalance = await getAccountBalance({ accountType: 'settlement', accountId: 'bank', currency })
      expect(settlementBalance).toBe(amount)
    })
  })

  // ── 4. Failed payment ────────────────────────────────────────────
  describe('failed payment flow', () => {
    it('create → fail → no ledger entries', async () => {
      const paymentId = 'pay-fail-1'

      sm.initialize(paymentId)
      await sm.transition(paymentId, 'PENDING_PROVIDER')
      await sm.transition(paymentId, 'PROCESSING')
      await sm.transition(paymentId, 'FAILED')

      expect(sm.getState(paymentId)).toBe('FAILED')

      const paymentEntries = ledgerStore.filter(
        (e) => e.causationId === paymentId || e.correlationId?.includes(paymentId),
      )
      expect(paymentEntries).toHaveLength(0)

      expect(await getAccountBalance({ accountType: 'wallet', accountId: `user-${paymentId}`, currency: 'KES' })).toBe(0)
      expect(await getAccountBalance({ accountType: 'escrow_hold', accountId: `esc-${paymentId}`, currency: 'KES' })).toBe(0)
    })

    it('failed payment can be retried successfully', async () => {
      const paymentId = 'pay-retry-1'

      sm.initialize(paymentId)
      await sm.transition(paymentId, 'PENDING_PROVIDER')
      await sm.transition(paymentId, 'PROCESSING')
      await sm.transition(paymentId, 'FAILED')

      await sm.transition(paymentId, 'PENDING_PROVIDER')
      await sm.transition(paymentId, 'PROCESSING')
      await sm.transition(paymentId, 'COMPLETED')

      expect(sm.getState(paymentId)).toBe('COMPLETED')
      expect(sm.getHistory(paymentId)).toHaveLength(6)
    })
  })

  // ── 5. Refund flow ───────────────────────────────────────────────
  describe('refund flow', () => {
    it('complete → refund → reversal entries created', async () => {
      const paymentId = 'pay-ref-1'
      const amount = 8000
      const currency = 'KES'

      sm.initialize(paymentId)
      await sm.transition(paymentId, 'PENDING_PROVIDER')
      await sm.transition(paymentId, 'PROCESSING')
      await sm.transition(paymentId, 'COMPLETED')

      // Post original ledger entries
      const original = await postCorrelatedEntries({
        correlationId: `pay-${paymentId}`,
        causationId: paymentId,
        entries: [
          { accountType: 'escrow_hold', accountId: `esc-${paymentId}`, entryType: 'debit', amount, currency, description: 'Hold' },
          { accountType: 'wallet', accountId: `merchant-${paymentId}`, entryType: 'credit', amount, currency, description: 'Merchant credit' },
        ],
      })

      expect(original.entries).toHaveLength(2)
      expect(await getAccountBalance({ accountType: 'escrow_hold', accountId: `esc-${paymentId}`, currency })).toBe(amount)

      // Initiate refund (state machine)
      await sm.transition(paymentId, 'REFUNDING')
      await sm.transition(paymentId, 'REFUNDED')

      // Reverse the escrow hold entry
      const escrowDebitEntry = original.entries.find(
        (e) => e.accountType === 'escrow_hold' && e.entryType === 'debit',
      )!
      const reversal1 = await reverseEntry({
        entryRef: escrowDebitEntry.entryRef,
        reason: 'Full refund to customer',
        correlationId: `refund-${paymentId}`,
      })
      expect(reversal1.reversalEntries[0].entryType).toBe('credit')
      expect(reversal1.reversalEntries[0].amount).toBe(amount)
      expect(reversal1.original.status).toBe('reversed')

      // Reverse the merchant wallet credit
      const walletCreditEntry = original.entries.find(
        (e) => e.accountType === 'wallet' && e.entryType === 'credit',
      )!
      const reversal2 = await reverseEntry({
        entryRef: walletCreditEntry.entryRef,
        reason: 'Refund: reverse merchant credit',
        correlationId: `refund-${paymentId}`,
      })
      expect(reversal2.reversalEntries[0].entryType).toBe('debit')
      expect(reversal2.reversalEntries[0].amount).toBe(amount)

      // Escrow: original debit reversed (status=reversed), reversal credit posted
      // The reversal entry creates a credit from the current balance.
      // After original is reversed, the latest posted for escrow is the reversal credit.
      // Current posted balance = 0 (no other posted escrow entries for this account)
      // Credit of 8000 from 0 → balanceAfter = -8000
      const escrowAfterRefund = await getAccountBalance({ accountType: 'escrow_hold', accountId: `esc-${paymentId}`, currency })
      expect(escrowAfterRefund).toBe(-amount)

      // Double-entry invariant still holds
      const allDebits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'debit')
        .reduce((s, e) => s + e.amount, 0)
      const allCredits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'credit')
        .reduce((s, e) => s + e.amount, 0)
      expect(allDebits).toBe(allCredits)
    })
  })

  // ── Cross-cutting: Double-entry invariant across all flows ──────
  describe('double-entry invariant across all flows', () => {
    it('cumulative entries always balance', async () => {
      for (let i = 0; i < 5; i++) {
        await simulatePaymentFlow(`pay-batch-${i}`, 1000 * (i + 1), 'KES', sm, guard)
      }

      const allDebits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'debit')
        .reduce((s, e) => s + e.amount, 0)
      const allCredits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'credit')
        .reduce((s, e) => s + e.amount, 0)

      expect(allDebits).toBe(allCredits)
    })

    it('invariant holds after mix of successful and failed payments', async () => {
      await simulatePaymentFlow('pay-mix-ok-1', 1000, 'KES', sm, guard)
      await simulatePaymentFlow('pay-mix-ok-2', 2000, 'KES', sm, guard)

      sm.initialize('pay-mix-fail-1')
      await sm.transition('pay-mix-fail-1', 'PENDING_PROVIDER')
      await sm.transition('pay-mix-fail-1', 'PROCESSING')
      await sm.transition('pay-mix-fail-1', 'FAILED')

      await simulatePaymentFlow('pay-mix-ok-3', 3000, 'KES', sm, guard)

      const allDebits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'debit')
        .reduce((s, e) => s + e.amount, 0)
      const allCredits = ledgerStore
        .filter((e) => e.status === 'posted' && e.entryType === 'credit')
        .reduce((s, e) => s + e.amount, 0)

      expect(allDebits).toBe(allCredits)
    })
  })
})
