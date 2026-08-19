// ─── OpenSearch Search Service ────────────────────────────────
// High-level search / index / aggregate / suggest API.
// Every query enforces `tenantId` filtering for multi-tenant security.

import { getOpenSearchClient } from './opensearch-manager'

// ── Public types ───────────────────────────────────────────────

export interface SearchPagination {
  from?: number   // offset (default 0)
  size?: number   // page size (default 20, max 100)
}

export interface SearchSort {
  field: string
  order: 'asc' | 'desc'
}

export interface SearchFilters {
  /** key-value term filters (exact match) */
  terms?: Record<string, string | string[]>
  /** range filters — e.g. { amount: { gte: 100, lte: 5000 } } */
  ranges?: Record<string, { gte?: number; lte?: number; gt?: number; lt?: number }>
  /** date range filters — same shape as ranges but for date fields */
  dateRanges?: Record<string, { gte?: string; lte?: string; gt?: string; lt?: string }>
}

export interface SearchResult<T = Record<string, any>> {
  hits: T[]
  total: number
  aggregations?: Record<string, any>
}

// ── Helpers ────────────────────────────────────────────────────

const MAX_SIZE = 100
const DEFAULT_SIZE = 20

function sanitizePagination(p?: SearchPagination): { from: number; size: number } {
  const from = Math.max(0, p?.from ?? 0)
  const size = Math.min(MAX_SIZE, Math.max(1, p?.size ?? DEFAULT_SIZE))
  return { from, size }
}

function buildFilterClauses(filters?: SearchFilters): any[] {
  if (!filters) return []

  const clauses: any[] = []

  if (filters.terms) {
    for (const [field, value] of Object.entries(filters.terms)) {
      if (Array.isArray(value)) {
        clauses.push({ terms: { [field]: value } })
      } else {
        clauses.push({ term: { [field]: value } })
      }
    }
  }

  if (filters.ranges) {
    for (const [field, range] of Object.entries(filters.ranges)) {
 clauses.push({ range: { [field]: range } })
    }
  }

  if (filters.dateRanges) {
    for (const [field, range] of Object.entries(filters.dateRanges)) {
      clauses.push({ range: { [field]: range } })
    }
  }

  return clauses
}

/** Always include a tenantId term filter for multi-tenant isolation */
function withTenantFilter(
  filters?: SearchFilters,
  tenantId?: string,
): any[] {
  const clauses = buildFilterClauses(filters)
  if (tenantId) {
    clauses.unshift({ term: { tenantId } })
  }
  return clauses
}

// ── Search Service ─────────────────────────────────────────────

export const searchService = {
  /**
   * Full-text search across an index with tenant isolation.
   */
  async search<T = Record<string, any>>(
    index: string,
    query: string,
    filters?: SearchFilters,
    pagination?: SearchPagination,
    sort?: SearchSort | SearchSort[],
    tenantId?: string,
  ): Promise<SearchResult<T>> {
    const client = getOpenSearchClient()
    const { from, size } = sanitizePagination(pagination)
    const filterClauses = withTenantFilter(filters, tenantId)

    const body: any = {
      query: {
        bool: {
          must: query
            ? [{ multi_match: { query, fields: ['*'], type: 'best_fields' } }]
            : [{ match_all: {} }],
          filter: filterClauses,
        },
      },
      from,
      size,
    }

    if (sort) {
      body.sort = Array.isArray(sort) ? sort.map(s => ({ [s.field]: { order: s.order } })) : [{ [sort.field]: { order: sort.order } }]
    }

    try {
      const resp = await client.search({ index, body, routing: tenantId })
      const raw = resp.body ?? resp
      const hits = raw?.hits?.hits ?? []
      return {
        hits: hits.map((h: any) => ({ _id: h._id, _score: h._score, ...(h._source ?? {}) })),
        total: raw?.hits?.total?.value ?? 0,
      }
    } catch (err) {
      console.error(`[OpenSearch] search failed on ${index}:`, err)
      return { hits: [], total: 0 }
    }
  },

  /**
   * Index a single document.
   */
  async index(
    index: string,
    id: string,
    document: Record<string, any>,
  ): Promise<void> {
    const client = getOpenSearchClient()
    const routing = document.tenantId
    try {
      await client.index({ index, id, body: document, routing, refresh: 'wait_for' })
    } catch (err) {
      console.error(`[OpenSearch] index failed on ${index}/${id}:`, err)
    }
  },

  /**
   * Bulk-index an array of documents.
   * Each element must have an `id` field (used as the OpenSearch document _id).
   */
  async bulkIndex(
    index: string,
    documents: Record<string, any>[],
  ): Promise<void> {
    if (documents.length === 0) return
    const client = getOpenSearchClient()

    const body: any[] = []
    for (const doc of documents) {
      const id = doc.id
      const routing = doc.tenantId
      body.push({ index: { _index: index, _id: id, routing } })
      body.push(doc)
    }

    try {
      await client.bulk({ body, refresh: 'wait_for' })
    } catch (err) {
      console.error(`[OpenSearch] bulkIndex failed on ${index}:`, err)
    }
  },

  /**
   * Delete a document by id.
   */
  async delete(
    index: string,
    id: string,
    tenantId?: string,
  ): Promise<void> {
    const client = getOpenSearchClient()
    try {
      await client.delete({ index, id, routing: tenantId })
    } catch (err) {
      console.error(`[OpenSearch] delete failed on ${index}/${id}:`, err)
    }
  },

  /**
   * Run an aggregation query scoped to a tenant.
   */
  async aggregate(
    index: string,
    aggregation: Record<string, any>,
    tenantId?: string,
  ): Promise<Record<string, any>> {
    const client = getOpenSearchClient()
    const filterClauses = withTenantFilter(undefined, tenantId)

    const body: any = {
      size: 0,
      query: {
        bool: {
          must: [{ match_all: {} }],
          filter: filterClauses,
        },
      },
      aggs: aggregation,
    }

    try {
      const resp = await client.search({ index, body, routing: tenantId })
      const raw = resp.body ?? resp
      return raw?.aggregations ?? {}
    } catch (err) {
      console.error(`[OpenSearch] aggregate failed on ${index}:`, err)
      return {}
    }
  },

  /**
   * Autocomplete / suggestion for a specific field.
   * Uses a `prefix` query on a `.keyword` sub-field, or falls back to
   * `match_phrase_prefix` for text fields.
   */
  async suggest(
    index: string,
    field: string,
    text: string,
    tenantId?: string,
    size?: number,
  ): Promise<any[]> {
    const client = getOpenSearchClient()
    const filterClauses = withTenantFilter(undefined, tenantId)
    const s = Math.min(MAX_SIZE, Math.max(1, size ?? 10))

    // Try keyword sub-field first for exact-prefix matching
    const keywordField = field.endsWith('.keyword') ? field : `${field}.keyword`
    const body: any = {
      size: s,
      query: {
        bool: {
          must: [{ prefix: { [keywordField]: { value: text, case_insensitive: true } } }],
          filter: filterClauses,
        },
      },
      // Use a source filter to return only the requested field + id + tenantId
      _source: ['id', field, 'tenantId'],
    }

    try {
      const resp = await client.search({ index, body, routing: tenantId })
      const raw = resp.body ?? resp
      const hits = raw?.hits?.hits ?? []
      return hits.map((h: any) => ({ _id: h._id, ...(h._source ?? {}) }))
    } catch (err) {
      console.error(`[OpenSearch] suggest failed on ${index}.${field}:`, err)
      return []
    }
  },
}
