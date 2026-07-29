// ─── High-Level Search Service ──────────────────────────────────────
// Typed search functions for each Youngsend entity. Supports full-text
// search, term filters, range filters, aggregations, and cursor-based
// pagination via search_after.
//
// Design notes:
//   - Every function enforces tenant isolation via a required tenantId.
//   - Cursor pagination uses search_after for consistent, deep pagination
//     (avoids the "deep paging" performance problem of from/size).
//   - Aggregations are optional and computed only when requested.
//   - Results are strongly typed via the transformer module.

import { searchClient, type SearchResponse } from './client'
import {
  INDEX_MAP,
  getIndexDefinition,
  INDEX_DEFINITIONS,
  type IndexDefinition,
} from './indexes'
import {
  type PaymentSearchDoc,
  type TransactionSearchDoc,
  type BusinessSearchDoc,
  type UserSearchDoc,
  type AuditLogSearchDoc,
  toHighlightedResults,
  buildHighlightRequest,
  type HighlightedResult,
} from './transformers'

// ── Types ──────────────────────────────────────────────────────────

/** Common filter options shared by all search functions. */
export interface SearchFilters {
  /** Full-text query string (matches across text fields). */
  query?: string
  /** Exact-match term filters (field → value). */
  terms?: Record<string, string | string[]>
  /** Range filters (field → { gte?, gt?, lte?, lt? }). */
  ranges?: Record<string, { gte?: number | string; gt?: number | string; lte?: number | string; lt?: number | string }>
  /** Sort field (default: index defaultSortField). */
  sortField?: string
  /** Sort order (default: 'desc'). */
  sortOrder?: 'asc' | 'desc'
  /** Fields to include in highlight results. */
  highlightFields?: string[]
  /** Aggregations to compute (see AggregationRequest). */
  aggregations?: AggregationRequest[]
}

/** Aggregation request: field + type + optional size. */
export interface AggregationRequest {
  name: string
  field: string
  type: 'terms' | 'date_histogram' | 'range' | 'sum' | 'avg' | 'max' | 'min'
  size?: number
  /** For date_histogram: interval (e.g. '1d', '1h', '1w'). */
  interval?: string
  /** For range: array of { from, to } buckets. */
  ranges?: Array<{ from?: number; to?: number; key?: string }>
}

/** Cursor-based pagination result. */
export interface SearchResult<T> {
  /** Total number of matching documents. */
  total: number
  /** Whether total is accurate ('eq') or approximate ('gte'). */
  totalRelation: 'eq' | 'gte'
  /** Highlighted search results. */
  results: HighlightedResult<T>[]
  /** Aggregation results (if requested). */
  aggregations?: Record<string, unknown>
  /** Cursor for the next page (pass as `after` in next call). */
  nextCursor?: string[]
  /** Time taken by OpenSearch in ms. */
  took: number
  /** Page size used. */
  pageSize: number
}

/** Pagination options. */
export interface PaginationOptions {
  /** Number of results per page (default: 20, max: 100). */
  pageSize?: number
  /** Cursor from a previous search_after result. */
  after?: string[]
  /** Maximum number of results to return (for deep scans). */
  maxResults?: number
}

// ── Helpers ──────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function normalizePageSize(size?: number): number {
  if (!size) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(size, 1), MAX_PAGE_SIZE)
}

/**
 * Build an OpenSearch bool query from the filters object.
 */
function buildBoolQuery(filters: SearchFilters, indexDef: IndexDefinition): Record<string, unknown> {
  const must: Record<string, unknown>[] = []
  const filter: Record<string, unknown>[] = []

  // Full-text query
  if (filters.query && filters.query.trim()) {
    const multiMatchFields = indexDef.highlightFields.filter(
      (f) => !f.includes('Name') && f !== 'txRef',
    )
    if (multiMatchFields.length > 0) {
      must.push({
        multi_match: {
          query: filters.query,
          fields: multiMatchFields.map((f) => `${f}^2`).concat(multiMatchFields.map((f) => `${f}.keyword^3`)),
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
        },
      })
    } else {
      must.push({
        query_string: {
          query: `*${filters.query}*`,
          fields: indexDef.highlightFields,
        },
      })
    }
  }

  // Term filters
  if (filters.terms) {
    for (const [field, value] of Object.entries(filters.terms)) {
      if (Array.isArray(value)) {
        filter.push({ terms: { [field]: value } })
      } else {
        filter.push({ term: { [field]: { value } } })
      }
    }
  }

  // Range filters
  if (filters.ranges) {
    for (const [field, range] of Object.entries(filters.ranges)) {
      filter.push({ range: { [field]: range } })
    }
  }

  const bool: Record<string, unknown> = {}
  if (must.length > 0) bool.must = must
  if (filter.length > 0) bool.filter = filter
  return { bool }
}

/**
 * Build aggregation clauses from the aggregation requests.
 */
function buildAggregations(requests: AggregationRequest[]): Record<string, unknown> {
  const aggs: Record<string, unknown> = {}
  for (const req of requests) {
    const agg: Record<string, unknown> = { field: req.field }
    switch (req.type) {
      case 'terms':
        agg.size = req.size ?? 20
        aggs[req.name] = { terms: agg }
        break
      case 'date_histogram':
        if (req.interval) agg.fixed_interval = req.interval
        aggs[req.name] = { date_histogram: agg }
        break
      case 'range':
        if (req.ranges) agg.ranges = req.ranges
        aggs[req.name] = { range: agg }
        break
      case 'sum':
      case 'avg':
      case 'max':
      case 'min':
        aggs[req.name] = { [req.type]: agg }
        break
    }
  }
  return aggs
}

/**
 * Build the complete OpenSearch query body.
 */
function buildQuery(
  indexName: string,
  tenantId: string,
  filters: SearchFilters,
  pagination: PaginationOptions,
): Record<string, unknown> {
  const indexDef = getIndexDefinition(indexName)
  const pageSize = normalizePageSize(pagination.pageSize)
  const sortField = filters.sortField ?? indexDef.defaultSortField
  const sortOrder = filters.sortOrder ?? indexDef.defaultSortOrder
  const query = buildBoolQuery(filters, indexDef)

  // Ensure tenant isolation
  const bool = query.bool as Record<string, unknown>
  const existingFilter = (bool.filter as Record<string, unknown>[]) ?? []
  existingFilter.push({ term: { tenantId: { value: tenantId } } })
  bool.filter = existingFilter

  const body: Record<string, unknown> = {
    query,
    size: pageSize,
    sort: [{ [sortField]: { order: sortOrder, missing: '_last' } }],
  }

  // Cursor pagination: search_after
  if (pagination.after && pagination.after.length > 0) {
    body.search_after = pagination.after
  }

  // Highlights
  if (filters.highlightFields && filters.highlightFields.length > 0) {
    body.highlight = buildHighlightRequest(filters.highlightFields)
  } else if (filters.query) {
    body.highlight = buildHighlightRequest(indexDef.highlightFields)
  }

  // Aggregations
  if (filters.aggregations && filters.aggregations.length > 0) {
    body.aggs = buildAggregations(filters.aggregations)
  }

  // Track total hits accurately for small result sets
  body.track_total_hits = true

  return body
}

/**
 * Extract the next cursor from search hits for cursor pagination.
 */
function extractNextCursor<T>(
  response: SearchResponse<T>,
  pageSize: number,
  sortField: string,
): string[] | undefined {
  const hits = response.hits.hits
  if (hits.length < pageSize) return undefined

  // Use the last hit's sort values as the cursor
  const lastHit = hits[hits.length - 1]
  if (lastHit.sort && lastHit.sort.length > 0) {
    return lastHit.sort.map((v) => String(v))
  }
  // Fallback: use the last hit's sort field value
  const source = lastHit._source as Record<string, unknown>
  const sortValue = source?.[sortField]
  if (sortValue !== undefined) {
    return [String(sortValue), lastHit._id]
  }
  return undefined
}

// ── Payment Search ──────────────────────────────────────────────────

export interface PaymentSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  userId?: string
  provider?: string
  status?: string | string[]
  currency?: string
  minAmount?: number
  maxAmount?: number
  dateFrom?: string
  dateTo?: string
}

/**
 * Search payments with full-text, filters, aggregations, and cursor pagination.
 */
export async function searchPayments(
  options: PaymentSearchOptions,
): Promise<SearchResult<PaymentSearchDoc>> {
  const filters: SearchFilters = {
    query: options.query,
    terms: {
      ...options.terms,
      ...(options.userId && { userId: options.userId }),
      ...(options.provider && { provider: options.provider }),
      ...(options.status && { status: options.status }),
      ...(options.currency && { currency: options.currency }),
    },
    ranges: {
      ...options.ranges,
      ...(options.minAmount !== undefined && { amount: { ...options.ranges?.amount, gte: options.minAmount } }),
      ...(options.maxAmount !== undefined && { amount: { ...options.ranges?.amount, lte: options.maxAmount } }),
      ...(options.dateFrom && { createdAt: { ...options.ranges?.createdAt, gte: options.dateFrom } }),
      ...(options.dateTo && { createdAt: { ...options.ranges?.createdAt, lte: options.dateTo } }),
    },
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    highlightFields: options.highlightFields,
    aggregations: options.aggregations ?? [
      { name: 'by_status', field: 'status', type: 'terms', size: 10 },
      { name: 'by_provider', field: 'provider.keyword', type: 'terms', size: 10 },
      { name: 'by_currency', field: 'currency.keyword', type: 'terms', size: 10 },
      { name: 'total_amount', field: 'amount', type: 'sum' },
    ],
  }

  const body = buildQuery('payments', options.tenantId, filters, options)
  const response = await searchClient.search<PaymentSearchDoc>('payments', body)
  const pageSize = normalizePageSize(options.pageSize)

  return {
    total: response.hits.total.value,
    totalRelation: response.hits.total.relation as 'eq' | 'gte',
    results: toHighlightedResults(response.hits.hits),
    aggregations: response.aggregations as Record<string, unknown> | undefined,
    nextCursor: extractNextCursor(response, pageSize, filters.sortField ?? 'createdAt'),
    took: response.took,
    pageSize,
  }
}

// ── Transaction Search ──────────────────────────────────────────────

export interface TransactionSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  walletId?: string
  type?: string | string[]
  status?: string | string[]
  currency?: string
  minAmount?: number
  maxAmount?: number
  dateFrom?: string
  dateTo?: string
  reference?: string
}

/**
 * Search wallet transactions with full-text, filters, aggregations, and cursor pagination.
 */
export async function searchTransactions(
  options: TransactionSearchOptions,
): Promise<SearchResult<TransactionSearchDoc>> {
  const filters: SearchFilters = {
    query: options.query,
    terms: {
      ...options.terms,
      ...(options.walletId && { walletId: options.walletId }),
      ...(options.type && { type: options.type }),
      ...(options.status && { status: options.status }),
      ...(options.currency && { currency: options.currency }),
      ...(options.reference && { reference: options.reference }),
    },
    ranges: {
      ...options.ranges,
      ...(options.minAmount !== undefined && { amount: { ...options.ranges?.amount, gte: options.minAmount } }),
      ...(options.maxAmount !== undefined && { amount: { ...options.ranges?.amount, lte: options.maxAmount } }),
      ...(options.dateFrom && { createdAt: { ...options.ranges?.createdAt, gte: options.dateFrom } }),
      ...(options.dateTo && { createdAt: { ...options.ranges?.createdAt, lte: options.dateTo } }),
    },
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    highlightFields: options.highlightFields,
    aggregations: options.aggregations ?? [
      { name: 'by_type', field: 'type', type: 'terms', size: 10 },
      { name: 'by_status', field: 'status', type: 'terms', size: 10 },
      { name: 'by_currency', field: 'currency.keyword', type: 'terms', size: 10 },
      { name: 'total_volume', field: 'amount', type: 'sum' },
      { name: 'avg_amount', field: 'amount', type: 'avg' },
    ],
  }

  const body = buildQuery('transactions', options.tenantId, filters, options)
  const response = await searchClient.search<TransactionSearchDoc>('transactions', body)
  const pageSize = normalizePageSize(options.pageSize)

  return {
    total: response.hits.total.value,
    totalRelation: response.hits.total.relation as 'eq' | 'gte',
    results: toHighlightedResults(response.hits.hits),
    aggregations: response.aggregations as Record<string, unknown> | undefined,
    nextCursor: extractNextCursor(response, pageSize, filters.sortField ?? 'createdAt'),
    took: response.took,
    pageSize,
  }
}

// ── Business Search ──────────────────────────────────────────────────

export interface BusinessSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  industry?: string | string[]
  country?: string | string[]
  status?: string | string[]
}

/**
 * Search businesses with full-text, filters, aggregations, and cursor pagination.
 */
export async function searchBusinesses(
  options: BusinessSearchOptions,
): Promise<SearchResult<BusinessSearchDoc>> {
  const filters: SearchFilters = {
    query: options.query,
    terms: {
      ...options.terms,
      ...(options.industry && { industry: options.industry }),
      ...(options.country && { country: options.country }),
      ...(options.status && { status: options.status }),
    },
    ranges: options.ranges,
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    highlightFields: options.highlightFields ?? ['name', 'legalName', 'industry', 'description'],
    aggregations: options.aggregations ?? [
      { name: 'by_industry', field: 'industry.keyword', type: 'terms', size: 20 },
      { name: 'by_country', field: 'country.keyword', type: 'terms', size: 20 },
      { name: 'by_status', field: 'status', type: 'terms', size: 10 },
    ],
  }

  const body = buildQuery('businesses', options.tenantId, filters, options)
  const response = await searchClient.search<BusinessSearchDoc>('businesses', body)
  const pageSize = normalizePageSize(options.pageSize)

  return {
    total: response.hits.total.value,
    totalRelation: response.hits.total.relation as 'eq' | 'gte',
    results: toHighlightedResults(response.hits.hits),
    aggregations: response.aggregations as Record<string, unknown> | undefined,
    nextCursor: extractNextCursor(response, pageSize, filters.sortField ?? 'createdAt'),
    took: response.took,
    pageSize,
  }
}

// ── User Search ─────────────────────────────────────────────────────

export interface UserSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  role?: string | string[]
  status?: string | string[]
}

/**
 * Search users with full-text, filters, aggregations, and cursor pagination.
 */
export async function searchUsers(
  options: UserSearchOptions,
): Promise<SearchResult<UserSearchDoc>> {
  const filters: SearchFilters = {
    query: options.query,
    terms: {
      ...options.terms,
      ...(options.role && { role: options.role }),
      ...(options.status && { status: options.status }),
    },
    ranges: options.ranges,
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    highlightFields: options.highlightFields ?? ['name', 'email'],
    aggregations: options.aggregations ?? [
      { name: 'by_role', field: 'role', type: 'terms', size: 10 },
      { name: 'by_status', field: 'status', type: 'terms', size: 10 },
    ],
  }

  const body = buildQuery('users', options.tenantId, filters, options)
  const response = await searchClient.search<UserSearchDoc>('users', body)
  const pageSize = normalizePageSize(options.pageSize)

  return {
    total: response.hits.total.value,
    totalRelation: response.hits.total.relation as 'eq' | 'gte',
    results: toHighlightedResults(response.hits.hits),
    aggregations: response.aggregations as Record<string, unknown> | undefined,
    nextCursor: extractNextCursor(response, pageSize, filters.sortField ?? 'createdAt'),
    took: response.took,
    pageSize,
  }
}

// ── Audit Log Search ─────────────────────────────────────────────────

export interface AuditLogSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  action?: string | string[]
  actor?: string
  resource?: string | string[]
  ipAddress?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Search audit logs with full-text, filters, aggregations, and cursor pagination.
 */
export async function searchAuditLogs(
  options: AuditLogSearchOptions,
): Promise<SearchResult<AuditLogSearchDoc>> {
  const filters: SearchFilters = {
    query: options.query,
    terms: {
      ...options.terms,
      ...(options.action && { action: options.action }),
      ...(options.actor && { actor: options.actor }),
      ...(options.resource && { resource: options.resource }),
      ...(options.ipAddress && { ipAddress: options.ipAddress }),
    },
    ranges: {
      ...options.ranges,
      ...(options.dateFrom && { timestamp: { ...options.ranges?.timestamp, gte: options.dateFrom } }),
      ...(options.dateTo && { timestamp: { ...options.ranges?.timestamp, lte: options.dateTo } }),
    },
    sortField: options.sortField ?? 'timestamp',
    sortOrder: options.sortOrder ?? 'desc',
    highlightFields: options.highlightFields ?? ['action', 'actor', 'resource', 'details'],
    aggregations: options.aggregations ?? [
      { name: 'by_action', field: 'action.keyword', type: 'terms', size: 20 },
      { name: 'by_actor', field: 'actor.keyword', type: 'terms', size: 20 },
      { name: 'by_resource', field: 'resource.keyword', type: 'terms', size: 20 },
      { name: 'over_time', field: 'timestamp', type: 'date_histogram', interval: '1d' },
    ],
  }

  const body = buildQuery('audit-logs', options.tenantId, filters, options)
  const response = await searchClient.search<AuditLogSearchDoc>('audit-logs', body)
  const pageSize = normalizePageSize(options.pageSize)

  return {
    total: response.hits.total.value,
    totalRelation: response.hits.total.relation as 'eq' | 'gte',
    results: toHighlightedResults(response.hits.hits),
    aggregations: response.aggregations as Record<string, unknown> | undefined,
    nextCursor: extractNextCursor(response, pageSize, filters.sortField ?? 'timestamp'),
    took: response.took,
    pageSize,
  }
}

// ── Cross-Index Search ──────────────────────────────────────────────

export interface GlobalSearchOptions extends SearchFilters, PaginationOptions {
  tenantId: string
  /** Limit search to specific indices (default: all). */
  indices?: string[]
}

/**
 * Search across all indices (or a subset) for a tenant.
 * Returns grouped results per index.
 */
export async function globalSearch(
  options: GlobalSearchOptions,
): Promise<Record<string, SearchResult<Record<string, unknown>>>> {
  const indices = options.indices ?? INDEX_DEFINITIONS.map((d) => d.name)
  const results: Record<string, SearchResult<Record<string, unknown>>> = {}

  // Execute searches in parallel
  const promises = indices.map(async (indexName) => {
    try {
      const filters: SearchFilters = {
        query: options.query,
        terms: options.terms,
        ranges: options.ranges,
        sortField: options.sortField,
        sortOrder: options.sortOrder,
        highlightFields: options.highlightFields,
        aggregations: options.aggregations,
      }

      const body = buildQuery(indexName, options.tenantId, filters, options)
      const response = await searchClient.search(indexName, body)
      const pageSize = normalizePageSize(options.pageSize)
      const indexDef = INDEX_MAP[indexName]

      results[indexName] = {
        total: response.hits.total.value,
        totalRelation: response.hits.total.relation as 'eq' | 'gte',
        results: toHighlightedResults(response.hits.hits),
        aggregations: response.aggregations as Record<string, unknown> | undefined,
        nextCursor: extractNextCursor(
          response,
          pageSize,
          filters.sortField ?? indexDef?.defaultSortField ?? 'createdAt',
        ),
        took: response.took,
        pageSize,
      }
    } catch (error) {
      // Log but don't fail the entire global search for one bad index
      console.error(`[SearchService] Global search failed for index ${indexName}:`, error)
      results[indexName] = {
        total: 0,
        totalRelation: 'eq',
        results: [],
        took: 0,
        pageSize: normalizePageSize(options.pageSize),
      }
    }
  })

  await Promise.all(promises)
  return results
}

// ── Index Initialization ──────────────────────────────────────────────

/**
 * Ensure all search indices exist with the correct mappings.
 * Creates missing indices; skips existing ones.
 */
export async function ensureSearchIndices(): Promise<void> {
  for (const indexDef of INDEX_DEFINITIONS) {
    try {
      await searchClient.createIndex(indexDef.name, {
        settings: indexDef.settings,
        mappings: indexDef.mapping,
      })
    } catch (error) {
      // Index already exists is OK
      if (error instanceof Error && !error.message.includes('already exists')) {
        console.error(`[SearchService] Failed to create index ${indexDef.name}:`, error)
      }
    }
  }
}

/**
 * Drop and recreate all search indices. Destructive — all data is lost.
 */
export async function resetSearchIndices(): Promise<void> {
  for (const indexDef of INDEX_DEFINITIONS) {
    try {
      // Delete existing
      await searchClient.delete(indexDef.name, '')
    } catch {
      // Ignore if doesn't exist
    }
    try {
      await searchClient.createIndex(indexDef.name, {
        settings: indexDef.settings,
        mappings: indexDef.mapping,
      })
    } catch (error) {
      console.error(`[SearchService] Failed to recreate index ${indexDef.name}:`, error)
    }
  }
}
