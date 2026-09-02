// ─── Search Sync Service ────────────────────────────────────────────
// Keeps OpenSearch indices in sync with the primary database (Prisma).
// Provides:
//   - Per-entity sync functions for incremental updates
//   - Bulk sync for full reindexing
//   - CDC (Change Data Capture) pattern for Kafka consumers
//   - Backpressure-aware batching with configurable batch sizes
//
// Design notes:
//   - Sync functions are idempotent: re-indexing an existing document
//     overwrites it. Safe to run multiple times.
//   - CDC consumer subscribes to Kafka topics and translates domain
//     events into OpenSearch index/delete operations.
//   - Bulk sync uses cursor-based pagination from the database to
//     avoid OOM on large tables.

import { searchClient } from './client'
import {
  toPaymentDoc,
  toTransactionDoc,
  toBusinessDoc,
  toUserDoc,
  toAuditLogDoc,
} from './transformers'

// ── Types ──────────────────────────────────────────────────────────

export interface SyncResult {
  indexName: string
  indexed: number
  deleted: number
  errors: number
  durationMs: number
}

export interface BulkSyncOptions {
  /** Batch size for bulk indexing (default: 500). */
  batchSize?: number
  /** Maximum number of documents to sync (default: unlimited). */
  maxDocuments?: number
  /** If true, delete documents from the index that no longer exist in DB. */
  purgeOrphans?: boolean
  /** Callback for progress updates. */
  onProgress?: (progress: SyncProgress) => void
}

export interface SyncProgress {
  indexName: string
  processed: number
  total?: number
  phase: 'reading' | 'indexing' | 'purging' | 'complete'
}

/** CDC event types that trigger search index updates. */
export type CDCOperation = 'CREATE' | 'UPDATE' | 'DELETE'

export interface CDCEvent<T = Record<string, unknown>> {
  operation: CDCOperation
  entityType: 'payment' | 'transaction' | 'business' | 'user' | 'audit-log'
  entityId: string
  tenantId: string
  timestamp: string
  payload: T
}

// ── Configuration ──────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 500
const SYNC_CURSOR_FIELD = 'createdAt'

// ── Per-Entity Sync Functions ──────────────────────────────────────

/**
 * Sync a single payment document to the search index.
 */
export async function syncPayment(
  payment: Record<string, unknown>,
): Promise<void> {
  const doc = toPaymentDoc(payment)
  await searchClient.index(doc as unknown as Record<string, unknown>, 'payments', doc.id)
}

/**
 * Sync a single transaction document to the search index.
 */
export async function syncTransaction(
  transaction: Record<string, unknown>,
): Promise<void> {
  const doc = toTransactionDoc(transaction)
  await searchClient.index(doc as unknown as Record<string, unknown>, 'transactions', doc.id)
}

/**
 * Sync a single business document to the search index.
 */
export async function syncBusiness(
  business: Record<string, unknown>,
): Promise<void> {
  const doc = toBusinessDoc(business)
  await searchClient.index(doc as unknown as Record<string, unknown>, 'businesses', doc.id)
}

/**
 * Sync a single user document to the search index.
 */
export async function syncUser(
  user: Record<string, unknown>,
): Promise<void> {
  const doc = toUserDoc(user)
  await searchClient.index(doc as unknown as Record<string, unknown>, 'users', doc.id)
}

/**
 * Sync a single audit log entry to the search index.
 */
export async function syncAuditLog(
  entry: Record<string, unknown>,
): Promise<void> {
  const doc = toAuditLogDoc(entry as Parameters<typeof toAuditLogDoc>[0])
  await searchClient.index(doc as unknown as Record<string, unknown>, 'audit-logs', doc.id)
}

/**
 * Remove a document from the search index by entity type and ID.
 */
export async function deleteFromIndex(
  entityType: 'payment' | 'transaction' | 'business' | 'user' | 'audit-log',
  entityId: string,
): Promise<void> {
  const indexMap: Record<string, string> = {
    payment: 'payments',
    transaction: 'transactions',
    business: 'businesses',
    user: 'users',
    'audit-log': 'audit-logs',
  }
  const indexName = indexMap[entityType]
  if (!indexName) {
    console.error(`[SyncService] Unknown entity type: ${entityType}`)
    return
  }
  try {
    await searchClient.delete(indexName, entityId)
  } catch (error) {
    // Document not found is OK
    if (error instanceof Error && !error.message.includes('not_found')) {
      console.error(`[SyncService] Failed to delete ${entityType}/${entityId}:`, error)
    }
  }
}

// ── Bulk Sync Functions ─────────────────────────────────────────────

/**
 * Bulk sync payments from the database to the search index.
 * Uses cursor-based pagination for memory efficiency.
 */
export async function bulkSyncPayments(
  fetchFn: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>,
  options: BulkSyncOptions = {},
): Promise<SyncResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const start = Date.now()
  let indexed = 0
  let deleted = 0
  let errors = 0

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    if (options.maxDocuments && indexed >= options.maxDocuments) break

    options.onProgress?.({
      indexName: 'payments',
      processed: indexed,
      phase: 'reading',
    })

    const batch = await fetchFn(cursor, batchSize)
    hasMore = batch.nextCursor !== null
    cursor = batch.nextCursor

    if (batch.records.length === 0) continue

    options.onProgress?.({
      indexName: 'payments',
      processed: indexed,
      phase: 'indexing',
    })

    const docs = batch.records.map((r) => toPaymentDoc(r) as unknown as Record<string, unknown>)
    try {
      const result = await searchClient.bulkIndex(docs, 'payments')
      indexed += result.items.filter((i) => i.index?.status === 200 || i.index?.status === 201).length
      errors += result.items.filter((i) => i.index?.status && i.index.status >= 400).length
    } catch (err) {
      errors += docs.length
      console.error('[SyncService] Bulk index error for payments:', err)
    }
  }

  return {
    indexName: 'payments',
    indexed,
    deleted,
    errors,
    durationMs: Date.now() - start,
  }
}

/**
 * Bulk sync transactions from the database to the search index.
 */
export async function bulkSyncTransactions(
  fetchFn: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>,
  options: BulkSyncOptions = {},
): Promise<SyncResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const start = Date.now()
  let indexed = 0
  let deleted = 0
  let errors = 0

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    if (options.maxDocuments && indexed >= options.maxDocuments) break

    options.onProgress?.({
      indexName: 'transactions',
      processed: indexed,
      phase: 'reading',
    })

    const batch = await fetchFn(cursor, batchSize)
    hasMore = batch.nextCursor !== null
    cursor = batch.nextCursor

    if (batch.records.length === 0) continue

    const docs = batch.records.map((r) => toTransactionDoc(r) as unknown as Record<string, unknown>)
    try {
      const result = await searchClient.bulkIndex(docs, 'transactions')
      indexed += result.items.filter((i) => i.index?.status === 200 || i.index?.status === 201).length
      errors += result.items.filter((i) => i.index?.status && i.index.status >= 400).length
    } catch (err) {
      errors += docs.length
      console.error('[SyncService] Bulk index error for transactions:', err)
    }
  }

  return {
    indexName: 'transactions',
    indexed,
    deleted,
    errors,
    durationMs: Date.now() - start,
  }
}

/**
 * Bulk sync businesses from the database to the search index.
 */
export async function bulkSyncBusinesses(
  fetchFn: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>,
  options: BulkSyncOptions = {},
): Promise<SyncResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const start = Date.now()
  let indexed = 0
  let deleted = 0
  let errors = 0

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    if (options.maxDocuments && indexed >= options.maxDocuments) break

    const batch = await fetchFn(cursor, batchSize)
    hasMore = batch.nextCursor !== null
    cursor = batch.nextCursor

    if (batch.records.length === 0) continue

    const docs = batch.records.map((r) => toBusinessDoc(r) as unknown as Record<string, unknown>)
    try {
      const result = await searchClient.bulkIndex(docs, 'businesses')
      indexed += result.items.filter((i) => i.index?.status === 200 || i.index?.status === 201).length
      errors += result.items.filter((i) => i.index?.status && i.index.status >= 400).length
    } catch (err) {
      errors += docs.length
      console.error('[SyncService] Bulk index error for businesses:', err)
    }
  }

  return {
    indexName: 'businesses',
    indexed,
    deleted,
    errors,
    durationMs: Date.now() - start,
  }
}

/**
 * Bulk sync users from the database to the search index.
 */
export async function bulkSyncUsers(
  fetchFn: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>,
  options: BulkSyncOptions = {},
): Promise<SyncResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const start = Date.now()
  let indexed = 0
  let deleted = 0
  let errors = 0

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    if (options.maxDocuments && indexed >= options.maxDocuments) break

    const batch = await fetchFn(cursor, batchSize)
    hasMore = batch.nextCursor !== null
    cursor = batch.nextCursor

    if (batch.records.length === 0) continue

    const docs = batch.records.map((r) => toUserDoc(r) as unknown as Record<string, unknown>)
    try {
      const result = await searchClient.bulkIndex(docs, 'users')
      indexed += result.items.filter((i) => i.index?.status === 200 || i.index?.status === 201).length
      errors += result.items.filter((i) => i.index?.status && i.index.status >= 400).length
    } catch (err) {
      errors += docs.length
      console.error('[SyncService] Bulk index error for users:', err)
    }
  }

  return {
    indexName: 'users',
    indexed,
    deleted,
    errors,
    durationMs: Date.now() - start,
  }
}

/**
 * Bulk sync audit logs from the database to the search index.
 */
export async function bulkSyncAuditLogs(
  fetchFn: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>,
  options: BulkSyncOptions = {},
): Promise<SyncResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const start = Date.now()
  let indexed = 0
  let deleted = 0
  let errors = 0

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    if (options.maxDocuments && indexed >= options.maxDocuments) break

    const batch = await fetchFn(cursor, batchSize)
    hasMore = batch.nextCursor !== null
    cursor = batch.nextCursor

    if (batch.records.length === 0) continue

    const docs = batch.records.map((r) => toAuditLogDoc(r as Parameters<typeof toAuditLogDoc>[0]) as unknown as Record<string, unknown>)
    try {
      const result = await searchClient.bulkIndex(docs, 'audit-logs')
      indexed += result.items.filter((i) => i.index?.status === 200 || i.index?.status === 201).length
      errors += result.items.filter((i) => i.index?.status && i.index.status >= 400).length
    } catch (err) {
      errors += docs.length
      console.error('[SyncService] Bulk index error for audit-logs:', err)
    }
  }

  return {
    indexName: 'audit-logs',
    indexed,
    deleted,
    errors,
    durationMs: Date.now() - start,
  }
}

// ── Full Bulk Sync ─────────────────────────────────────────────────

/**
 * Run a full bulk sync across all indices.
 * Each entity uses its own fetch function for cursor-based reading.
 */
export async function fullBulkSync(
  fetchFunctions: {
    payments: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>
    transactions: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>
    businesses: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>
    users: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>
    auditLogs: (cursor: string | null, limit: number) => Promise<{ records: Record<string, unknown>[]; nextCursor: string | null }>
  },
  options: BulkSyncOptions = {},
): Promise<SyncResult[]> {
  const results = await Promise.all([
    bulkSyncPayments(fetchFunctions.payments, options),
    bulkSyncTransactions(fetchFunctions.transactions, options),
    bulkSyncBusinesses(fetchFunctions.businesses, options),
    bulkSyncUsers(fetchFunctions.users, options),
    bulkSyncAuditLogs(fetchFunctions.auditLogs, options),
  ])
  return results
}

// ── CDC (Change Data Capture) ───────────────────────────────────────

/**
 * Event type to Kafka topic mapping for CDC consumers.
 */
const CDC_TOPIC_MAP: Record<string, string[]> = {
  payment: ['payment.events.created', 'payment.events.completed', 'payment.events.failed', 'payment.events.refunded', 'payment.events.cancelled'],
  transaction: ['wallet.events.debit', 'wallet.events.credit', 'wallet.events.transfer'],
  business: ['business.events.created', 'business.events.updated', 'business.events.verified'],
  user: ['user.events.created', 'user.events.updated', 'user.events.deactivated'],
  'audit-log': ['audit.events.logged'],
}

/**
 * Map Kafka event type to CDC operation.
 */
function eventToOperation(eventType: string): CDCOperation {
  if (eventType.includes('created') || eventType.includes('logged')) return 'CREATE'
  if (eventType.includes('updated') || eventType.includes('completed') ||
      eventType.includes('failed') || eventType.includes('refunded') ||
      eventType.includes('cancelled') || eventType.includes('verified') ||
      eventType.includes('deactivated') || eventType.includes('debit') ||
      eventType.includes('credit') || eventType.includes('transfer')) return 'UPDATE'
  if (eventType.includes('deleted') || eventType.includes('removed')) return 'DELETE'
  return 'UPDATE'
}

/**
 * Map Kafka event domain to entity type.
 */
function topicToEntityType(topic: string): 'payment' | 'transaction' | 'business' | 'user' | 'audit-log' {
  if (topic.startsWith('payment.')) return 'payment'
  if (topic.startsWith('wallet.')) return 'transaction'
  if (topic.startsWith('business.')) return 'business'
  if (topic.startsWith('user.')) return 'user'
  if (topic.startsWith('audit.')) return 'audit-log'
  return 'payment' // fallback
}

/**
 * Extract the entity ID and tenant ID from a Kafka event payload.
 */
function extractCDCMetadata(
  payload: Record<string, any>,
): { entityId: string; tenantId: string } {
  return {
    entityId: String(payload.id ?? payload.paymentId ?? payload.transactionId ?? payload.entityId ?? ''),
    tenantId: String(payload.tenantId ?? payload.business?.tenantId ?? ''),
  }
}

/**
 * Process a single CDC event and apply it to the search index.
 * This is the core handler that bridges Kafka → OpenSearch.
 */
export async function processCDCEvent(event: {
  topic: string
  eventType: string
  payload: Record<string, unknown>
}): Promise<void> {
  const entityType = topicToEntityType(event.topic)
  const operation = eventToOperation(event.eventType)
  const { entityId, tenantId } = extractCDCMetadata(event.payload)

  if (!entityId) {
    console.warn(`[CDC] Skipping event — no entity ID: ${event.eventType}`)
    return
  }

  try {
    switch (operation) {
      case 'CREATE':
      case 'UPDATE': {
        // Index or re-index the document
        switch (entityType) {
          case 'payment':
            await syncPayment(event.payload)
            break
          case 'transaction':
            await syncTransaction(event.payload)
            break
          case 'business':
            await syncBusiness(event.payload)
            break
          case 'user':
            await syncUser(event.payload)
            break
          case 'audit-log':
            await syncAuditLog(event.payload)
            break
        }
        break
      }
      case 'DELETE': {
        await deleteFromIndex(entityType, entityId)
        break
      }
    }
  } catch (error) {
    console.error(
      `[CDC] Failed to process ${operation} ${entityType}/${entityId}:`,
      error instanceof Error ? error.message : error,
    )
    // Re-throw to let the Kafka consumer handle retry/DLQ
    throw error
  }
}

/**
 * Get the list of Kafka topics a CDC consumer should subscribe to.
 */
export function getCDCTopics(
  entityTypes?: Array<'payment' | 'transaction' | 'business' | 'user' | 'audit-log'>,
): string[] {
  const types = entityTypes ?? Object.keys(CDC_TOPIC_MAP) as Array<keyof typeof CDC_TOPIC_MAP>
  const topics: string[] = []
  for (const type of types) {
    topics.push(...(CDC_TOPIC_MAP[type] ?? []))
  }
  return [...new Set(topics)]
}

// ── CDC Batch Processor ────────────────────────────────────────────

/**
 * Process a batch of CDC events with backpressure awareness.
 * Processes events sequentially to preserve ordering within a partition.
 */
export async function processCDCBatch(
  events: Array<{
    topic: string
    eventType: string
    payload: Record<string, unknown>
  }>,
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  for (const event of events) {
    try {
      await processCDCEvent(event)
      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Create a CDC consumer handler suitable for use with the Digital Lending OS
 * Kafka consumer framework (see infra/kafka/consumer.ts).
 *
 * Usage:
 * ```ts
 * import { DigitalLendingOsConsumer } from '@/infra/kafka/consumer'
 * import { createCDCMessageHandler, getCDCTopics } from '@/backend/services/search/sync-service'
 *
 * const consumer = new DigitalLendingOsConsumer({
 *   groupId: 'search-sync-service',
 *   topics: getCDCTopics(),
 *   handler: createCDCMessageHandler(),
 * })
 * ```
 */
export function createCDCMessageHandler(): (
  event: { eventType: string; payload: Record<string, unknown> },
  metadata: { topic: string },
) => Promise<void> {
  return async (event, metadata) => {
    await processCDCEvent({
      topic: metadata.topic,
      eventType: event.eventType,
      payload: event.payload,
    })
  }
}
