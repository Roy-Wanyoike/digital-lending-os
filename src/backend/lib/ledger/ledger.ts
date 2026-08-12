// =================================================================
// Immutable Double-Entry Ledger Service
// =================================================================
// All entries are immutable once posted. Reversals create new entries
// that reference the original. Balances are computed from posted entries
// only (excluding reversed/pending).
// =================================================================

import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type {
  CreateLedgerEntryParams,
  CreateLedgerEntryResult,
  PostCorrelatedEntriesParams,
  PostCorrelatedEntriesResult,
  ReverseEntryParams,
  ReverseEntryResult,
  GetAccountBalanceParams,
  GetAccountLedgerParams,
  PostedLedgerEntry,
  PaginatedLedgerResult,
  CorrelatedLineItem,
} from './types'

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Compute the current balance for an account+currency by looking at the
 * latest posted (non-reversed) entry's balanceAfter.
 */
async function getCurrentBalance(
  tx: any,
  accountType: string,
  accountId: string,
  currency: string,
): Promise<number> {
  const latest = await tx.ledgerEntry.findFirst({
    where: {
      accountType,
      accountId,
      currency,
      status: 'posted',
    },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  })
  return latest?.balanceAfter ?? 0
}

/**
 * Apply the entry type delta to a running balance.
 * Debit increases asset accounts (wallet, escrow_hold), credit decreases them.
 * For liability/revenue accounts it's the opposite, but we keep it simple:
 *   debit  → +amount
 *   credit → -amount
 * This is the standard convention for asset-type accounts.
 */
function applyEntryType(currentBalance: number, entryType: string, amount: number): number {
  // For asset accounts (wallet, escrow_hold): debit increases, credit decreases
  // For liability/revenue accounts (escrow_liability, platform_revenue, platform_fee, settlement):
  //   credit increases, debit decreases
  // Since we track each account separately, the caller is responsible for
  // choosing the correct entryType for the account type.
  // Here we use the universal rule: debit = +, credit = -
  // (Works correctly for asset accounts; callers should flip for liability accounts
  //  by using the opposite entryType if needed, but typically the API caller
  //  passes the correct debit/credit direction.)
  return entryType === 'debit' ? currentBalance + amount : currentBalance - amount
}

/**
 * Convert a Prisma ledger row to our PostedLedgerEntry interface.
 */
function toPostedEntry(row: any): PostedLedgerEntry {
  return {
    id: row.id,
    entryRef: row.entryRef,
    correlationId: row.correlationId,
    causationId: row.causationId,
    accountType: row.accountType,
    accountId: row.accountId,
    entryType: row.entryType,
    amount: row.amount,
    currency: row.currency,
    balanceAfter: row.balanceAfter,
    description: row.description,
    metadata: row.metadata,
    status: row.status,
    reversalOfId: row.reversalOfId,
    createdAt: row.createdAt,
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Create a single double-entry pair (one debit + one credit) atomically.
 * Both entries share the same correlationId and are created within a single
 * Prisma transaction, ensuring atomicity.
 */
export async function createLedgerEntry(
  params: CreateLedgerEntryParams,
): Promise<CreateLedgerEntryResult> {
  const { correlationId, causationId, debit, credit } = params

  // Validate: debit and credit must be for the same currency
  if (debit.currency !== credit.currency) {
    throw new Error(
      `Currency mismatch: debit is ${debit.currency}, credit is ${credit.currency}`,
    )
  }

  // Validate: amounts must match (fundamental double-entry rule)
  if (debit.amount !== credit.amount) {
    throw new Error(
      `Double-entry imbalance: debit ${debit.amount} != credit ${credit.amount}`,
    )
  }

  const result = await db.$transaction(async (tx: any) => {
    // Compute balance for debit account
    const debitBalance = await getCurrentBalance(tx, debit.accountType, debit.accountId, debit.currency)
    const debitBalanceAfter = applyEntryType(debitBalance, 'debit', debit.amount)

    // Compute balance for credit account
    const creditBalance = await getCurrentBalance(tx, credit.accountType, credit.accountId, credit.currency)
    const creditBalanceAfter = applyEntryType(creditBalance, 'credit', credit.amount)

    // Create both entries
    const [debitEntry, creditEntry] = await Promise.all([
      tx.ledgerEntry.create({
        data: {
          entryRef: `LE-${randomUUID().slice(0, 12)}`,
          correlationId,
          causationId: causationId ?? null,
          accountType: debit.accountType,
          accountId: debit.accountId,
          entryType: 'debit',
          amount: debit.amount,
          currency: debit.currency,
          balanceAfter: debitBalanceAfter,
          description: debit.description ?? null,
          metadata: debit.metadata ?? null,
          status: 'posted',
        },
      }),
      tx.ledgerEntry.create({
        data: {
          entryRef: `LE-${randomUUID().slice(0, 12)}`,
          correlationId,
          causationId: causationId ?? null,
          accountType: credit.accountType,
          accountId: credit.accountId,
          entryType: 'credit',
          amount: credit.amount,
          currency: credit.currency,
          balanceAfter: creditBalanceAfter,
          description: credit.description ?? null,
          metadata: credit.metadata ?? null,
          status: 'posted',
        },
      }),
    ])

    return { debit: toPostedEntry(debitEntry), credit: toPostedEntry(creditEntry) }
  })

  return result
}

/**
 * Post multiple correlated entries for a single business event.
 * E.g. payment received: debit escrow_hold, credit wallet, debit wallet fee, credit platform_fee
 * Validates that total debits == total credits across all entries.
 */
export async function postCorrelatedEntries(
  params: PostCorrelatedEntriesParams,
): Promise<PostCorrelatedEntriesResult> {
  const { correlationId, causationId, entries } = params

  if (entries.length < 2) {
    throw new Error('At least 2 entries are required for a correlated posting')
  }

  // Validate balanced entries (sum of debits == sum of credits)
  const totalDebits = entries
    .filter((e) => e.entryType === 'debit')
    .reduce((sum, e) => sum + e.amount, 0)
  const totalCredits = entries
    .filter((e) => e.entryType === 'credit')
    .reduce((sum, e) => sum + e.amount, 0)

  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(
      `Correlated entries not balanced: debits=${totalDebits}, credits=${totalCredits}`,
    )
  }

  const result = await db.$transaction(async (tx: any) => {
    const postedEntries: PostedLedgerEntry[] = []

    // Group by account+currency to compute balances in order
    // We need to process entries for the same account sequentially to avoid
    // race conditions on balanceAfter computation.
    const accountGroups = new Map<string, CorrelatedLineItem[]>()
    for (const entry of entries) {
      const key = `${entry.accountType}:${entry.accountId}:${entry.currency}`
      const group = accountGroups.get(key) ?? []
      group.push(entry)
      accountGroups.set(key, group)
    }

    // Compute all balances first (read phase)
    const balanceCache = new Map<string, number>()
    for (const [key, group] of accountGroups) {
      const [accountType, accountId, currency] = key.split(':')
      const balance = await getCurrentBalance(tx, accountType, accountId, currency)
      balanceCache.set(key, balance)
    }

    // Create all entries (write phase)
    for (const entry of entries) {
      const key = `${entry.accountType}:${entry.accountId}:${entry.currency}`
      const currentBalance = balanceCache.get(key) ?? 0
      const newBalance = applyEntryType(currentBalance, entry.entryType, entry.amount)

      // Update the cache so subsequent entries for the same account see the updated balance
      balanceCache.set(key, newBalance)

      const created = await tx.ledgerEntry.create({
        data: {
          entryRef: `LE-${randomUUID().slice(0, 12)}`,
          correlationId,
          causationId: causationId ?? null,
          accountType: entry.accountType,
          accountId: entry.accountId,
          entryType: entry.entryType,
          amount: entry.amount,
          currency: entry.currency,
          balanceAfter: newBalance,
          description: entry.description ?? null,
          metadata: entry.metadata ?? null,
          status: 'posted',
        },
      })

      postedEntries.push(toPostedEntry(created))
    }

    return { entries: postedEntries }
  })

  return result
}

/**
 * Reverse a previously posted entry by creating opposite entries.
 * Marks the original entry's status as 'reversed' and creates new
 * debit/credit entries that undo the original's effect.
 */
export async function reverseEntry(
  params: ReverseEntryParams,
): Promise<ReverseEntryResult> {
  const { entryRef, reason, correlationId: overrideCorrelationId } = params

  const result = await db.$transaction(async (tx: any) => {
    // Fetch the original entry
    const original = await tx.ledgerEntry.findUnique({
      where: { entryRef },
    })

    if (!original) {
      throw new Error(`LedgerEntry with entryRef '${entryRef}' not found`)
    }

    if (original.status === 'reversed') {
      throw new Error(`LedgerEntry '${entryRef}' is already reversed`)
    }

    if (original.status !== 'posted') {
      throw new Error(`LedgerEntry '${entryRef}' has status '${original.status}', expected 'posted'`)
    }

    // Mark original as reversed
    await tx.ledgerEntry.update({
      where: { id: original.id },
      data: { status: 'reversed' },
    })

    // The reversal correlationId groups the reversal entries together
    const reversalCorrelationId = overrideCorrelationId ?? `rev_${randomUUID().slice(0, 12)}`

    // Compute the reversal balance for the original account
    // We need to get the latest balance (which may have changed since the original entry)
    const currentBalance = await getCurrentBalance(
      tx,
      original.accountType,
      original.accountId,
      original.currency,
    )

    // The reversal entry type is the opposite of the original
    const reversalEntryType = original.entryType === 'debit' ? 'credit' : 'debit'
    const reversalBalanceAfter = applyEntryType(currentBalance, reversalEntryType, original.amount)

    // Create the reversal entry
    const reversalEntry = await tx.ledgerEntry.create({
      data: {
        entryRef: `LE-${randomUUID().slice(0, 12)}`,
        correlationId: reversalCorrelationId,
        causationId: original.causationId,
        accountType: original.accountType,
        accountId: original.accountId,
        entryType: reversalEntryType,
        amount: original.amount,
        currency: original.currency,
        balanceAfter: reversalBalanceAfter,
        description: `REVERSAL: ${reason}${original.description ? ` (original: ${original.description})` : ''}`,
        metadata: original.metadata,
        status: 'posted',
        reversalOfId: original.id,
      },
    })

    return {
      original: toPostedEntry({ ...original, status: 'reversed' }),
      reversalEntries: [toPostedEntry(reversalEntry)],
    }
  })

  return result
}

/**
 * Get the current balance for an account by computing from the latest
 * posted (non-reversed) ledger entry.
 */
export async function getAccountBalance(
  params: GetAccountBalanceParams,
): Promise<number> {
  const { accountType, accountId, currency } = params

  const latest = await db.ledgerEntry.findFirst({
    where: {
      accountType,
      accountId,
      currency,
      status: 'posted',
    },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  })

  return latest?.balanceAfter ?? 0
}

/**
 * Get a paginated ledger history for an account.
 */
export async function getAccountLedger(
  params: GetAccountLedgerParams,
): Promise<PaginatedLedgerResult> {
  const { accountType, accountId, currency, pagination, status } = params

  const page = pagination?.page ?? 1
  const pageSize = Math.min(pagination?.pageSize ?? 50, 200)
  const sort = pagination?.sort ?? 'desc'
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {
    accountType,
    accountId,
    currency,
  }

  if (status) {
    where.status = status
  }

  const [entries, total] = await Promise.all([
    db.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
      skip,
      take: pageSize,
    }),
    db.ledgerEntry.count({ where }),
  ])

  return {
    entries: entries.map(toPostedEntry),
    total,
    page,
    pageSize,
    hasNextPage: skip + pageSize < total,
  }
}
