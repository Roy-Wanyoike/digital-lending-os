// ─── Search Service Re-exports ─────────────────────────────────────
// Single entry point for all search-related types, classes, and
// functions. Import from here instead of individual modules.

// ── Client ──────────────────────────────────────────────────────────
export {
  SearchClient,
  searchClient,
  type SearchClientConfig,
  type SearchResponse,
  type SearchHit,
  type IndexResponse,
  type BulkResponse,
  type BulkItem,
  type DeleteResponse,
  type GetResponse,
  type HealthCheckResult,
} from './client'

// ── Indexes ────────────────────────────────────────────────────────
export {
  INDEX_DEFINITIONS,
  INDEX_MAP,
  SEARCH_INDEX_NAMES,
  getIndexDefinition,
  type IndexDefinition,
} from './indexes'

// ── Transformers ────────────────────────────────────────────────────
export {
  toPaymentDoc,
  toTransactionDoc,
  toBusinessDoc,
  toUserDoc,
  toAuditLogDoc,
  toHighlightedResults,
  getHighlightFragment,
  buildHighlightRequest,
  type PaymentSearchDoc,
  type TransactionSearchDoc,
  type BusinessSearchDoc,
  type UserSearchDoc,
  type AuditLogSearchDoc,
  type HighlightedResult,
} from './transformers'

// ── Search Service ──────────────────────────────────────────────────
export {
  searchPayments,
  searchTransactions,
  searchBusinesses,
  searchUsers,
  searchAuditLogs,
  globalSearch,
  ensureSearchIndices,
  resetSearchIndices,
  type SearchFilters,
  type AggregationRequest,
  type SearchResult,
  type PaginationOptions,
  type PaymentSearchOptions,
  type TransactionSearchOptions,
  type BusinessSearchOptions,
  type UserSearchOptions,
  type AuditLogSearchOptions,
  type GlobalSearchOptions,
} from './search-service'

// ── Sync Service ────────────────────────────────────────────────────
export {
  syncPayment,
  syncTransaction,
  syncBusiness,
  syncUser,
  syncAuditLog,
  deleteFromIndex,
  bulkSyncPayments,
  bulkSyncTransactions,
  bulkSyncBusinesses,
  bulkSyncUsers,
  bulkSyncAuditLogs,
  fullBulkSync,
  processCDCEvent,
  processCDCBatch,
  createCDCMessageHandler,
  getCDCTopics,
  type SyncResult,
  type BulkSyncOptions,
  type SyncProgress,
  type CDCEvent,
  type CDCOperation,
} from './sync-service'
