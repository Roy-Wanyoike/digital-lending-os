// =================================================================
// Immutable Double-Entry Ledger — Type Definitions
// =================================================================

/** Account types in the ledger system */
export type LedgerAccountType =
  | "wallet"
  | "escrow_hold"
  | "escrow_liability"
  | "platform_revenue"
  | "platform_fee"
  | "settlement";

/** Debit or credit */
export type LedgerEntryType = "debit" | "credit";

/** Entry status */
export type LedgerEntryStatus = "pending" | "posted" | "reversed";

/** A single line item for one side of a journal entry */
export interface LedgerLineItem {
  accountType: LedgerAccountType;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  currency: string;
  description?: string;
  metadata?: string;
}

/** Parameters for creating a single double-entry (debit + credit pair) */
export interface CreateLedgerEntryParams {
  /** Groups related entries (e.g. a payment + fee) */
  correlationId: string;
  /** What caused this entry (e.g. the payment intent ID) */
  causationId?: string;
  /** The debit side */
  debit: LedgerLineItem;
  /** The credit side */
  credit: LedgerLineItem;
}

/** A single line item for correlated (multi-leg) entries */
export interface CorrelatedLineItem {
  accountType: LedgerAccountType;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  currency: string;
  description?: string;
  metadata?: string;
}

/** Parameters for posting multiple correlated entries in one business event */
export interface PostCorrelatedEntriesParams {
  correlationId: string;
  causationId?: string;
  /** All legs of the journal entry — must balance (debits == credits) */
  entries: CorrelatedLineItem[];
}

/** Parameters for reversing a previously posted entry */
export interface ReverseEntryParams {
  /** The entryRef of the entry to reverse */
  entryRef: string;
  /** Reason for the reversal */
  reason: string;
  /** Optional new correlationId for the reversal group */
  correlationId?: string;
}

/** Parameters for querying an account balance */
export interface GetAccountBalanceParams {
  accountType: LedgerAccountType;
  accountId: string;
  currency: string;
}

/** Pagination parameters for ledger history */
export interface LedgerPagination {
  page?: number;
  pageSize?: number;
  /** Optional: only return entries from this point onwards (cursor-based) */
  cursor?: string;
  /** Sort direction */
  sort?: "asc" | "desc";
}

/** Parameters for querying an account ledger */
export interface GetAccountLedgerParams extends GetAccountBalanceParams {
  pagination?: LedgerPagination;
  /** Filter by status */
  status?: LedgerEntryStatus;
}

/** A posted ledger entry as returned from the service */
export interface PostedLedgerEntry {
  id: string;
  entryRef: string;
  correlationId: string;
  causationId: string | null;
  accountType: string;
  accountId: string;
  entryType: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  description: string | null;
  metadata: string | null;
  status: string;
  reversalOfId: string | null;
  createdAt: Date;
}

/** Result of a double-entry creation */
export interface CreateLedgerEntryResult {
  debit: PostedLedgerEntry;
  credit: PostedLedgerEntry;
}

/** Result of a correlated entry posting */
export interface PostCorrelatedEntriesResult {
  entries: PostedLedgerEntry[];
}

/** Result of a reversal */
export interface ReverseEntryResult {
  original: PostedLedgerEntry;
  reversalEntries: PostedLedgerEntry[];
}

/** Paginated ledger result */
export interface PaginatedLedgerResult {
  entries: PostedLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
