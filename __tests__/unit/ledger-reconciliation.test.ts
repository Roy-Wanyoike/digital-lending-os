/**
 * Comprehensive ledger reconciliation and hardening tests.
 * Mocks @/lib/db (Prisma) to test ledger operations in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Prisma DB ──────────────────────────────────────────────

// In-memory store of ledger entries
let ledgerStore: any[] = []
let createdAtCounter = 0

function nextCreatedAt() {
  return ++createdAtCounter
}

function createMockTx() {
  return {
    ledgerEntry: {
      findFirst: vi.fn(async (args: any) => {
        const { where, orderBy, select } = args
        let results = [...ledgerStore]

        if (where) {
          if (where.accountType) results = results.filter((e) => e.accountType === where.accountType)
          if (where.accountId) results = results.filter((e) => e.accountId === where.accountId)
          if (where.currency) results = results.filter((e) => e.currency === where.currency)
          if (where.status) results = results.filter((e) => e.status === where.status)
          if (where.entryRef) results = results.filter((e) => e.entryRef === where.entryRef)
        }

        if (orderBy?.createdAt === 'desc') {
          results.sort((a, b) => b.createdAt - a.createdAt)
        } else {
          results.sort((a, b) => a.createdAt - b.createdAt)
        }

        if (select?.balanceAfter) {
          const entry = results[0]
          return entry ? { balanceAfter: entry.balanceAfter } : null
        }

        return results[0] ?? null
      }),
      findUnique: vi.fn(async (args: any) => {
        const { where } = args
        if (where.entryRef) {
          return ledgerStore.find((e) => e.entryRef === where.entryRef) ?? null
        }
        return null
      }),
      findMany: vi.fn(async (args: any) => {
        const { where, orderBy, skip, take } = args
        let results = [...ledgerStore]

        if (where) {
          if (where.accountType) results = results.filter((e) => e.accountType === where.accountType)
          if (where.accountId) results = results.filter((e) => e.accountId === where.accountId)
          if (where.currency) results = results.filter((e) => e.currency === where.currency)
          if (where.status) results = results.filter((e) => e.status === where.status)
        }

        if (orderBy?.createdAt === 'asc') {
          results.sort((a, b) => a.createdAt - b.createdAt)
        } else {
          results.sort((a, b) => b.createdAt - a.createdAt)
        }

        const paginated = results.slice(skip ?? 0, (skip ?? 0) + (take ?? 50))
        return paginated
      }),
      count: vi.fn(async (args: any) => {
        const { where } = args
        let results = [...ledgerStore]
        if (where) {
          if (where.accountType) results = results.filter((e) => e.accountType === where.accountType)
          if (where.accountId) results = results.filter((e) => e.accountId === where.accountId)
          if (where.currency) results = results.filter((e) => e.currency === where.currency)
          if (where.status) results = results.filter((e) => e.status === where.status)
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
        const { where, data } = args
        const idx = ledgerStore.findIndex((e) => e.id === where.id)
        if (idx >= 0) {
          ledgerStore[idx] = { ...ledgerStore[idx], ...data }
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
  getAccountLedger,
} from '@/backend/lib/ledger/ledger'

beforeEach(() => {
  ledgerStore = []
  createdAtCounter = 0
  vi.clearAllMocks()
})

describe('Ledger Reconciliation & Hardening', () => {
  // ── 1. Double-entry balance invariant ─────────────────────────────
  describe('double-entry balance invariant', () => {
    it('after any entry, sum of debits == sum of credits', async () => {
      const result = await createLedgerEntry({
        correlationId: 'corr-1',
        causationId: 'cause-1',
        debit: {
          accountType: 'wallet', accountId: 'user-1', entryType: 'debit',
          amount: 1000, currency: 'KES', description: 'Payment received',
        },
        credit: {
          accountType: 'escrow_hold', accountId: 'escrow-1', entryType: 'credit',
          amount: 1000, currency: 'KES', description: 'Escrow hold',
        },
      })

      expect(result.debit.amount).toBe(1000)
      expect(result.credit.amount).toBe(1000)
      expect(result.debit.entryType).toBe('debit')
      expect(result.credit.entryType).toBe('credit')
      expect(result.debit.balanceAfter).toBe(1000)
      expect(result.credit.balanceAfter).toBe(-1000)
    })

    it('rejects currency mismatch between debit and credit', async () => {
      await expect(
        createLedgerEntry({
          correlationId: 'corr-bad-1',
          debit: { accountType: 'wallet', accountId: 'u1', entryType: 'debit', amount: 100, currency: 'KES' },
          credit: { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 100, currency: 'USD' },
        }),
      ).rejects.toThrow('Currency mismatch')
    })

    it('rejects amount mismatch between debit and credit', async () => {
      await expect(
        createLedgerEntry({
          correlationId: 'corr-bad-2',
          debit: { accountType: 'wallet', accountId: 'u1', entryType: 'debit', amount: 100, currency: 'KES' },
          credit: { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 200, currency: 'KES' },
        }),
      ).rejects.toThrow('Double-entry imbalance')
    })
  })

  // ── 2. Reversal correctness ────────────────────────────────────────
  describe('reversal correctness', () => {
    it('reversing an entry creates an opposite entry and marks original as reversed', async () => {
      const created = await createLedgerEntry({
        correlationId: 'corr-rev-1',
        debit: { accountType: 'wallet', accountId: 'u1', entryType: 'debit', amount: 500, currency: 'KES' },
        credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 500, currency: 'KES' },
      })

      expect(created.debit.balanceAfter).toBe(500)

      const reversed = await reverseEntry({
        entryRef: created.debit.entryRef,
        reason: 'Test reversal',
        correlationId: 'rev-corr-1',
      })

      // Original should be marked reversed
      expect(reversed.original.status).toBe('reversed')
      // Reversal entry should be a credit (opposite of debit)
      expect(reversed.reversalEntries[0].entryType).toBe('credit')
      expect(reversed.reversalEntries[0].amount).toBe(500)
      // The reversal creates a new posted entry from the current running balance.
      // After original is marked 'reversed', the latest posted entry for this account
      // is the reversal itself. The running balance from 0 (no other posted entries)
      // with a credit of 500 gives balanceAfter = -500.
      expect(reversed.reversalEntries[0].balanceAfter).toBe(-500)
      // Reversal should reference the original
      expect(reversed.reversalEntries[0].reversalOfId).toBe(created.debit.id)
      // Reversal description includes reason
      expect(reversed.reversalEntries[0].description).toContain('REVERSAL')
      expect(reversed.reversalEntries[0].description).toContain('Test reversal')
    })

    it('reversing the credit side creates a debit reversal', async () => {
      const created = await createLedgerEntry({
        correlationId: 'corr-rev-credit',
        debit: { accountType: 'wallet', accountId: 'u-rc', entryType: 'debit', amount: 300, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e-rc', entryType: 'credit', amount: 300, currency: 'KES' },
      })

      // Reverse the credit (escrow) side
      const reversed = await reverseEntry({
        entryRef: created.credit.entryRef,
        reason: 'Release escrow',
      })

      expect(reversed.reversalEntries[0].entryType).toBe('debit')
      expect(reversed.reversalEntries[0].amount).toBe(300)
    })
  })

  // ── 3. Multi-leg (3+ legs) correlated entries balancing ──────────
  describe('multi-leg correlated entries', () => {
    it('posts a 3-leg journal entry with balanced debits and credits', async () => {
      const result = await postCorrelatedEntries({
        correlationId: 'corr-multi-1',
        causationId: 'pay-123',
        entries: [
          { accountType: 'escrow_hold', accountId: 'esc-1', entryType: 'debit', amount: 1000, currency: 'KES', description: 'Hold for payment' },
          { accountType: 'wallet', accountId: 'user-1', entryType: 'credit', amount: 970, currency: 'KES', description: 'Net to wallet' },
          { accountType: 'platform_fee', accountId: 'sys', entryType: 'credit', amount: 30, currency: 'KES', description: 'Platform fee' },
        ],
      })

      expect(result.entries).toHaveLength(3)
      for (const entry of result.entries) {
        expect(entry.status).toBe('posted')
        expect(entry.correlationId).toBe('corr-multi-1')
      }
      expect(result.entries[0].balanceAfter).toBe(1000)
      expect(result.entries[1].balanceAfter).toBe(-970)
      expect(result.entries[2].balanceAfter).toBe(-30)
    })

    it('rejects unbalanced multi-leg entries', async () => {
      await expect(
        postCorrelatedEntries({
          correlationId: 'corr-unbal',
          entries: [
            { accountType: 'escrow_hold', accountId: 'e1', entryType: 'debit', amount: 1000, currency: 'KES' },
            { accountType: 'wallet', accountId: 'u1', entryType: 'credit', amount: 500, currency: 'KES' },
          ],
        }),
      ).rejects.toThrow('not balanced')
    })

    it('rejects correlated entries with fewer than 2 legs', async () => {
      await expect(
        postCorrelatedEntries({
          correlationId: 'corr-single',
          entries: [
            { accountType: 'wallet', accountId: 'u1', entryType: 'debit', amount: 100, currency: 'KES' },
          ],
        }),
      ).rejects.toThrow('At least 2 entries')
    })

    it('handles entries for the same account correctly (multiple legs same account)', async () => {
      // Two debits and two credits, with one account appearing twice
      const result = await postCorrelatedEntries({
        correlationId: 'corr-same-acct',
        entries: [
          { accountType: 'wallet', accountId: 'u-dup', entryType: 'debit', amount: 600, currency: 'KES' },
          { accountType: 'wallet', accountId: 'u-dup', entryType: 'debit', amount: 400, currency: 'KES' },
          { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 1000, currency: 'KES' },
        ],
      })

      // The first debit gives balanceAfter=600, second gives balanceAfter=1000
      const walletEntries = result.entries.filter((e) => e.accountType === 'wallet')
      expect(walletEntries[0].balanceAfter).toBe(600)
      expect(walletEntries[1].balanceAfter).toBe(1000)
    })
  })

  // ── 4. Balance computation from scratch (empty account → 0) ──────
  describe('balance computation from scratch', () => {
    it('returns 0 for an account with no entries', async () => {
      const balance = await getAccountBalance({
        accountType: 'wallet', accountId: 'nonexistent', currency: 'KES',
      })
      expect(balance).toBe(0)
    })

    it('returns 0 for an unknown currency', async () => {
      // Create a KES entry
      await createLedgerEntry({
        correlationId: 'corr-unknown-cur',
        debit: { accountType: 'wallet', accountId: 'u-cur', entryType: 'debit', amount: 100, currency: 'KES' },
        credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 100, currency: 'KES' },
      })
      // Query for EUR should return 0
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-cur', currency: 'EUR' })).toBe(0)
    })
  })

  // ── 5. Concurrent balance reads don't corrupt data ────────────────
  describe('concurrent balance reads', () => {
    it('multiple concurrent balance reads return consistent results', async () => {
      await createLedgerEntry({
        correlationId: 'corr-conc',
        debit: { accountType: 'wallet', accountId: 'u-conc', entryType: 'debit', amount: 2000, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'esc-conc', entryType: 'credit', amount: 2000, currency: 'KES' },
      })

      const results = await Promise.all([
        getAccountBalance({ accountType: 'wallet', accountId: 'u-conc', currency: 'KES' }),
        getAccountBalance({ accountType: 'wallet', accountId: 'u-conc', currency: 'KES' }),
        getAccountBalance({ accountType: 'wallet', accountId: 'u-conc', currency: 'KES' }),
        getAccountBalance({ accountType: 'wallet', accountId: 'u-conc', currency: 'KES' }),
        getAccountBalance({ accountType: 'wallet', accountId: 'u-conc', currency: 'KES' }),
      ])

      for (const bal of results) {
        expect(bal).toBe(2000)
      }
    })
  })

  // ── 6. Currency isolation ─────────────────────────────────────────
  describe('currency isolation', () => {
    it('KES entries do not affect USD balance', async () => {
      await createLedgerEntry({
        correlationId: 'corr-kes',
        debit: { accountType: 'wallet', accountId: 'u-multi', entryType: 'debit', amount: 5000, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'esc-1', entryType: 'credit', amount: 5000, currency: 'KES' },
      })
      await createLedgerEntry({
        correlationId: 'corr-usd',
        debit: { accountType: 'wallet', accountId: 'u-multi', entryType: 'debit', amount: 50, currency: 'USD' },
        credit: { accountType: 'escrow_hold', accountId: 'esc-2', entryType: 'credit', amount: 50, currency: 'USD' },
      })

      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-multi', currency: 'KES' })).toBe(5000)
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-multi', currency: 'USD' })).toBe(50)
    })

    it('mixed-currency entries are isolated in balance queries', async () => {
      await createLedgerEntry({
        correlationId: 'corr-mix-1',
        debit: { accountType: 'wallet', accountId: 'u-iso', entryType: 'debit', amount: 1000, currency: 'KES' },
        credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 1000, currency: 'KES' },
      })
      await createLedgerEntry({
        correlationId: 'corr-mix-2',
        debit: { accountType: 'wallet', accountId: 'u-iso', entryType: 'debit', amount: 10, currency: 'USD' },
        credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 10, currency: 'USD' },
      })

      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-iso', currency: 'KES' })).toBe(1000)
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-iso', currency: 'USD' })).toBe(10)
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-iso', currency: 'EUR' })).toBe(0)
    })
  })

  // ── 7. Reversal of already-reversed entry throws ──────────────────
  describe('reversal edge cases', () => {
    it('reversing an already-reversed entry throws', async () => {
      const created = await createLedgerEntry({
        correlationId: 'corr-dbl-rev',
        debit: { accountType: 'wallet', accountId: 'u-rev', entryType: 'debit', amount: 100, currency: 'KES' },
        credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 100, currency: 'KES' },
      })

      await reverseEntry({ entryRef: created.debit.entryRef, reason: 'First reversal' })

      await expect(
        reverseEntry({ entryRef: created.debit.entryRef, reason: 'Second reversal' }),
      ).rejects.toThrow('already reversed')
    })

    // ── 8. Reversal of non-posted entry throws ──────────────────────
    it('reversing a non-existent entry throws', async () => {
      await expect(
        reverseEntry({ entryRef: 'LE-nonexistent', reason: 'No such entry' }),
      ).rejects.toThrow('not found')
    })
  })

  // ── 9. Pagination of ledger history ────────────────────────────────
  describe('pagination of ledger history', () => {
    it('returns paginated results with correct metadata', async () => {
      for (let i = 0; i < 5; i++) {
        await createLedgerEntry({
          correlationId: `corr-page-${i}`,
          debit: { accountType: 'wallet', accountId: 'u-page', entryType: 'debit', amount: 100, currency: 'KES' },
          credit: { accountType: 'platform_revenue', accountId: 'sys', entryType: 'credit', amount: 100, currency: 'KES' },
        })
      }

      // Only the debits go to wallet:u-page:KES; credits go to platform_revenue:sys:KES
      const page1 = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-page', currency: 'KES',
        pagination: { page: 1, pageSize: 3 },
      })

      expect(page1.entries).toHaveLength(3)
      expect(page1.total).toBe(5) // 5 debit entries for wallet:u-page:KES
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(3)
      expect(page1.hasNextPage).toBe(true)
    })

    it('page 2 starts after page 1 entries', async () => {
      for (let i = 0; i < 5; i++) {
        await createLedgerEntry({
          correlationId: `corr-pg2-${i}`,
          debit: { accountType: 'wallet', accountId: 'u-pg2', entryType: 'debit', amount: 100, currency: 'KES' },
          credit: { accountType: 'escrow_hold', accountId: `esc-${i}`, entryType: 'credit', amount: 100, currency: 'KES' },
        })
      }

      const page1 = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-pg2', currency: 'KES',
        pagination: { page: 1, pageSize: 2 },
      })
      const page2 = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-pg2', currency: 'KES',
        pagination: { page: 2, pageSize: 2 },
      })

      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(2)
      expect(page2.page).toBe(2)
      expect(page2.pageSize).toBe(2)
      // No overlap between pages
      const page1Refs = page1.entries.map((e) => e.entryRef)
      const page2Refs = page2.entries.map((e) => e.entryRef)
      for (const ref of page2Refs) {
        expect(page1Refs).not.toContain(ref)
      }
    })

    it('hasNextPage is false on last page', async () => {
      // Create 5 entries for this test
      for (let i = 0; i < 5; i++) {
        await createLedgerEntry({
          correlationId: `corr-pg3-${i}`,
          debit: { accountType: 'wallet', accountId: 'u-pg3', entryType: 'debit', amount: 100, currency: 'KES' },
          credit: { accountType: 'escrow_hold', accountId: `e-pg3-${i}`, entryType: 'credit', amount: 100, currency: 'KES' },
        })
      }
      const page3 = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-pg3', currency: 'KES',
        pagination: { page: 3, pageSize: 2 },
      })
      // 5 total entries, page 3 starts at offset 4, has 1 entry
      expect(page3.entries).toHaveLength(1)
      expect(page3.hasNextPage).toBe(false)
    })

    it('defaults to page 1 with pageSize 50 when no pagination given', async () => {
      const result = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-defaults', currency: 'KES',
      })
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasNextPage).toBe(false)
    })

    it('supports ascending sort', async () => {
      await createLedgerEntry({
        correlationId: 'corr-asc-1',
        debit: { accountType: 'wallet', accountId: 'u-asc', entryType: 'debit', amount: 100, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 100, currency: 'KES' },
      })
      await createLedgerEntry({
        correlationId: 'corr-asc-2',
        debit: { accountType: 'wallet', accountId: 'u-asc', entryType: 'debit', amount: 200, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e2', entryType: 'credit', amount: 200, currency: 'KES' },
      })

      const result = await getAccountLedger({
        accountType: 'wallet', accountId: 'u-asc', currency: 'KES',
        pagination: { page: 1, pageSize: 10, sort: 'asc' },
      })

      // Ascending: first entry has balanceAfter=100, second has 300
      expect(result.entries[0].balanceAfter).toBe(100)
      expect(result.entries[1].balanceAfter).toBe(300)
    })
  })

  // ── 10. Balance after multiple sequential entries ─────────────────
  describe('balance after sequential entries', () => {
    it('balance accumulates correctly across multiple entries', async () => {
      // Entry 1: +1000
      await createLedgerEntry({
        correlationId: 'corr-seq-1',
        debit: { accountType: 'wallet', accountId: 'u-seq', entryType: 'debit', amount: 1000, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 1000, currency: 'KES' },
      })

      let balance = await getAccountBalance({ accountType: 'wallet', accountId: 'u-seq', currency: 'KES' })
      expect(balance).toBe(1000)

      // Entry 2: +500
      await createLedgerEntry({
        correlationId: 'corr-seq-2',
        debit: { accountType: 'wallet', accountId: 'u-seq', entryType: 'debit', amount: 500, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e2', entryType: 'credit', amount: 500, currency: 'KES' },
      })

      balance = await getAccountBalance({ accountType: 'wallet', accountId: 'u-seq', currency: 'KES' })
      expect(balance).toBe(1500)

      // Entry 3: -300 (credit to wallet)
      await createLedgerEntry({
        correlationId: 'corr-seq-3',
        debit: { accountType: 'escrow_hold', accountId: 'e3', entryType: 'debit', amount: 300, currency: 'KES' },
        credit: { accountType: 'wallet', accountId: 'u-seq', entryType: 'credit', amount: 300, currency: 'KES' },
      })

      balance = await getAccountBalance({ accountType: 'wallet', accountId: 'u-seq', currency: 'KES' })
      expect(balance).toBe(1200)
    })

    it('balance tracks correctly after reversal in a sequence', async () => {
      // +1000
      const e1 = await createLedgerEntry({
        correlationId: 'corr-seq-r1',
        debit: { accountType: 'wallet', accountId: 'u-seqr', entryType: 'debit', amount: 1000, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e1', entryType: 'credit', amount: 1000, currency: 'KES' },
      })

      // +500
      await createLedgerEntry({
        correlationId: 'corr-seq-r2',
        debit: { accountType: 'wallet', accountId: 'u-seqr', entryType: 'debit', amount: 500, currency: 'KES' },
        credit: { accountType: 'escrow_hold', accountId: 'e2', entryType: 'credit', amount: 500, currency: 'KES' },
      })

      // Balance: 1500
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-seqr', currency: 'KES' })).toBe(1500)

      // Reverse the first entry: the original debit (balanceAfter=1000) is marked reversed.
      // Current posted balance for wallet:u-seqr:KES = latest non-reversed = the 2nd debit (balanceAfter=1500)
      // Reversal credit of 1000 from 1500 → balanceAfter = 500
      await reverseEntry({ entryRef: e1.debit.entryRef, reason: 'Undo first' })

      // The latest posted entry is the reversal with balanceAfter=500
      expect(await getAccountBalance({ accountType: 'wallet', accountId: 'u-seqr', currency: 'KES' })).toBe(500)
    })
  })
})
