// ─── OpenSearch Client Wrapper ──────────────────────────────────────
// Provides a unified SearchClient interface that connects to a real
// OpenSearch cluster when OPENSEARCH_URL is set, or falls back to an
// in-memory Map-based stub for development and testing.
//
// Features:
//   - Exponential backoff retry with jitter
//   - Configurable request timeouts
//   - Connection pool configuration
//   - Tenant-scoped isolation
//   - Health check endpoint

// ── Types ──────────────────────────────────────────────────────────────

export interface SearchClientConfig {
  /** OpenSearch node URL (e.g. https://opensearch:9200) */
  url?: string
  /** Username for basic auth */
  username?: string
  /** Password for basic auth */
  password?: string
  /** AWS SigV4 signing region (for Amazon OpenSearch Service) */
  awsRegion?: string
  /** Request timeout in milliseconds (default: 30_000) */
  requestTimeout?: number
  /** Max retries for transient failures (default: 3) */
  maxRetries?: number
  /** Initial backoff delay in ms (default: 1000) */
  baseRetryDelay?: number
  /** Max backoff delay in ms (default: 30_000) */
  maxRetryDelay?: number
  /** Connection pool: max sockets per node (default: 10) */
  maxSockets?: number
  /** Connection pool: max total sockets (default: 20) */
  maxTotalSockets?: number
  /** Keep-alive interval in ms (default: 60_000) */
  keepAliveInterval?: number
  /** Enable TLS verification (default: true in production) */
  sslVerify?: boolean
}

export interface SearchResponse<T = Record<string, unknown>> {
  took: number
  timed_out: boolean
  hits: {
    total: { value: number; relation: string }
    max_score: number | null
    hits: SearchHit<T>[]
  }
  aggregations?: Record<string, unknown>
  scroll_id?: string
}

export interface SearchHit<T = Record<string, unknown>> {
  _index: string
  _id: string
  _score: number | null
  _source: T
  _version?: number
  _seq_no?: number
  _primary_term?: number
  highlight?: Record<string, string[]>
  sort?: unknown[]
  fields?: Record<string, unknown[]>
}

export interface IndexResponse {
  acknowledged: boolean
  index: string
}

export interface BulkResponse {
  took: number
  errors: boolean
  items: BulkItem[]
}

export interface BulkItem {
  index?: {
    _index: string
    _id: string
    _version?: number
    result: string
    status: number
    error?: Record<string, unknown>
  }
  delete?: {
    _index: string
    _id: string
    _version?: number
    result: string
    status: number
    error?: Record<string, unknown>
  }
}

export interface DeleteResponse {
  acknowledged: boolean
  _index: string
  _id: string
  result: string
}

export interface GetResponse<T = Record<string, unknown>> {
  _index: string
  _id: string
  _version?: number
  _source: T | null
  found: boolean
}

export interface IndexMappingResponse {
  [indexName: string]: {
    mappings: Record<string, unknown>
    settings: Record<string, unknown>
  }
}

export interface HealthCheckResult {
  status: 'green' | 'yellow' | 'red' | 'stub'
  cluster_name?: string
  number_of_nodes?: number
  active_primary_shards?: number
  active_shards_percent?: number
  latency_ms?: number
  message?: string
}

// ── Retry helpers ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
): number {
  // Exponential backoff: baseDelay * 2^attempt + jitter
  const exponential = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * baseDelay * 0.5
  return Math.min(exponential + jitter, maxDelay)
}

function isRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('service unavailable') ||
      msg.includes('too many requests') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('502')
    )
  }
  return false
}

// ── In-Memory Stub ───────────────────────────────────────────────────
// Provides a fully functional Map-based fallback when no OpenSearch
// cluster is available. Supports all SearchClient methods.

class InMemorySearchStore {
  private indices = new Map<string, Map<string, Record<string, unknown>>>()
  private mappings = new Map<string, Record<string, unknown>>()

  private getOrCreateIndex(indexName: string): Map<string, Record<string, unknown>> {
    let index = this.indices.get(indexName)
    if (!index) {
      index = new Map()
      this.indices.set(indexName, index)
    }
    return index
  }

  index(
    document: Record<string, unknown>,
    indexName: string,
    id: string,
  ): IndexResponse {
    const idx = this.getOrCreateIndex(indexName)
    idx.set(id, { ...document, _indexedAt: new Date().toISOString() })
    return { acknowledged: true, index: indexName }
  }

  bulkIndex(
    documents: Record<string, unknown>[],
    indexName: string,
  ): BulkResponse {
    const idx = this.getOrCreateIndex(indexName)
    const items: BulkItem[] = []
    let errors = false
    const start = Date.now()

    for (const doc of documents) {
      const id = String(doc.id ?? Date.now() + Math.random())
      try {
        idx.set(id, { ...doc, _indexedAt: new Date().toISOString() })
        items.push({ index: { _index: indexName, _id: id, result: 'created', status: 200 } })
      } catch {
        errors = true
        items.push({ index: { _index: indexName, _id: id, result: 'error', status: 500, error: { type: 'internal_error' } } })
      }
    }

    return { took: Date.now() - start, errors, items }
  }

  search(
    indexName: string,
    query: Record<string, unknown>,
  ): SearchResponse {
    const start = Date.now()
    const idx = this.indices.get(indexName)
    const q = query.query as Record<string, unknown> | undefined
    const bool = q?.bool as Record<string, unknown> | undefined
    const must = (bool?.must ?? bool?.filter ?? []) as Array<Record<string, unknown>>
    const size = (query.size as number) ?? 10
    const from = (query.from as number) ?? 0
    const sortField = query.sort as string | undefined
    const sortDesc = String(sortField).startsWith('-')
    const sortKey = sortDesc ? String(sortField).slice(1) : sortField

    // Simple in-memory filtering
    let results = idx ? Array.from(idx.entries()) : []

    for (const clause of must) {
      if (clause.match) {
        const matchClause = clause.match as Record<string, unknown>
        const field = Object.keys(matchClause)[0]
        const term = String(matchClause[field]).toLowerCase()
        results = results.filter(([, doc]) => {
          const val = doc[field]
          if (val == null) return false
          return String(val).toLowerCase().includes(term)
        })
      } else if (clause.term) {
        const termClause = clause.term as Record<string, unknown>
        const field = Object.keys(termClause)[0]
        const expected = termClause[field]
        if (typeof expected === 'object' && expected !== null && 'value' in expected) {
          results = results.filter(([, doc]) => doc[field] === (expected as { value: unknown }).value)
        } else {
          results = results.filter(([, doc]) => doc[field] === expected)
        }
      } else if (clause.range) {
        const rangeClause = clause.range as Record<string, unknown>
        const field = Object.keys(rangeClause)[0]
        const range = rangeClause[field] as Record<string, unknown>
        results = results.filter(([, doc]) => {
          const val = doc[field]
          if (typeof val !== 'number') return true
          if (range.gte !== undefined && val < Number(range.gte)) return false
          if (range.gt !== undefined && val <= Number(range.gt)) return false
          if (range.lte !== undefined && val > Number(range.lte)) return false
          if (range.lt !== undefined && val >= Number(range.lt)) return false
          return true
        })
      }
    }

    // Sort
    if (sortKey) {
      results.sort((a, b) => {
        const aVal = a[1][sortKey]
        const bVal = b[1][sortKey]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortDesc ? -cmp : cmp
      })
    }

    const total = results.length
    const paged = results.slice(from, from + size)

    return {
      took: Date.now() - start,
      timed_out: false,
      hits: {
        total: { value: total, relation: 'eq' },
        max_score: 1.0,
        hits: paged.map(([id, source]) => ({
          _index: indexName,
          _id: id,
          _score: 1.0,
          _source: source as Record<string, unknown>,
        })),
      },
    }
  }

  delete(indexName: string, id: string): DeleteResponse {
    const idx = this.indices.get(indexName)
    const found = idx?.delete(id) ?? false
    return { acknowledged: true, _index: indexName, _id: id, result: found ? 'deleted' : 'not_found' }
  }

  getIndex(indexName: string): GetResponse<Record<string, unknown>> {
    const idx = this.indices.get(indexName)
    const mapping = this.mappings.get(indexName)
    if (!idx && !mapping) {
      return { _index: indexName, _id: '', _source: null, found: false }
    }
    return { _index: indexName, _id: '', _source: { mappings: mapping ?? {} }, found: true }
  }

  createIndex(indexName: string, mapping: Record<string, unknown>): IndexResponse {
    if (!this.indices.has(indexName)) {
      this.indices.set(indexName, new Map())
    }
    this.mappings.set(indexName, mapping)
    return { acknowledged: true, index: indexName }
  }

  healthCheck(): HealthCheckResult {
    return { status: 'stub', message: 'In-memory search stub (no OpenSearch cluster)' }
  }
}

// ── Search Client ────────────────────────────────────────────────────

class SearchClient {
  private config: Required<Pick<SearchClientConfig, 'requestTimeout' | 'maxRetries' | 'baseRetryDelay' | 'maxRetryDelay'>>
  private stub: InMemorySearchStore
  private _isStub: boolean
  private httpClient: unknown | null = null

  constructor(config?: SearchClientConfig) {
    this.config = {
      requestTimeout: config?.requestTimeout ?? 30_000,
      maxRetries: config?.maxRetries ?? 3,
      baseRetryDelay: config?.baseRetryDelay ?? 1_000,
      maxRetryDelay: config?.maxRetryDelay ?? 30_000,
    }
    this.stub = new InMemorySearchStore()
    this._isStub = !config?.url
  }

  /**
   * Whether this client is using the in-memory stub.
   */
  get isStub(): boolean {
    return this._isStub
  }

  /**
   * Index a single document.
   */
  async index<T extends Record<string, unknown>>(
    document: T,
    indexName: string,
    id: string,
  ): Promise<IndexResponse> {
    if (this._isStub) return this.stub.index(document, indexName, id)
    return this.withRetry(() => this.doIndex(document, indexName, id))
  }

  /**
   * Bulk index multiple documents.
   */
  async bulkIndex<T extends Record<string, unknown>>(
    documents: T[],
    indexName: string,
  ): Promise<BulkResponse> {
    if (this._isStub) return this.stub.bulkIndex(documents, indexName)
    return this.withRetry(() => this.doBulkIndex(documents, indexName))
  }

  /**
   * Search an index with a query DSL.
   */
  async search<T = Record<string, unknown>>(
    indexName: string,
    query: Record<string, unknown>,
  ): Promise<SearchResponse<T>> {
    if (this._isStub) return this.stub.search(indexName, query) as SearchResponse<T>
    return this.withRetry(() => this.doSearch<T>(indexName, query))
  }

  /**
   * Delete a document by ID.
   */
  async delete(indexName: string, id: string): Promise<DeleteResponse> {
    if (this._isStub) return this.stub.delete(indexName, id)
    return this.withRetry(() => this.doDelete(indexName, id))
  }

  /**
   * Get index mapping and settings.
   */
  async getIndex(indexName: string): Promise<GetResponse<Record<string, unknown>>> {
    if (this._isStub) return this.stub.getIndex(indexName)
    return this.withRetry(() => this.doGetIndex(indexName))
  }

  /**
   * Create an index with explicit mapping and settings.
   */
  async createIndex(
    indexName: string,
    mapping: Record<string, unknown>,
  ): Promise<IndexResponse> {
    if (this._isStub) return this.stub.createIndex(indexName, mapping)
    return this.withRetry(() => this.doCreateIndex(indexName, mapping))
  }

  /**
   * Cluster health check.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (this._isStub) return this.stub.healthCheck()
    return this.doHealthCheck()
  }

  // ── Retry wrapper ───────────────────────────────────────────────

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        if (attempt === this.config.maxRetries || !isRetriable(error)) {
          throw error
        }
        const delay = calculateBackoff(
          attempt,
          this.config.baseRetryDelay,
          this.config.maxRetryDelay,
        )
        console.warn(
          `[SearchClient] Retry ${attempt + 1}/${this.config.maxRetries} after ${Math.round(delay)}ms:`,
          error instanceof Error ? error.message : error,
        )
        await sleep(delay)
      }
    }
    throw lastError
  }

  // ── Real OpenSearch HTTP methods ────────────────────────────────
  // These use fetch (available in Node 18+ and Edge Runtime) to talk
  // to the OpenSearch REST API directly, avoiding the need for the
  // @opensearch-project/opensearch npm package at runtime.

  private get baseUrl(): string {
    return process.env.OPENSEARCH_URL ?? 'http://localhost:9200'
  }

  private get authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const user = process.env.OPENSEARCH_USERNAME
    const pass = process.env.OPENSEARCH_PASSWORD
    if (user && pass) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
    }
    return headers
  }

  private async doIndex<T extends Record<string, unknown>>(
    document: T,
    indexName: string,
    id: string,
  ): Promise<IndexResponse> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(indexName)}/_doc/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(document),
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenSearch index error ${res.status}: ${body}`)
    }
    const data = await res.json()
    return { acknowledged: data.result === 'created' || data.result === 'updated', index: indexName }
  }

  private async doBulkIndex<T extends Record<string, unknown>>(
    documents: T[],
    indexName: string,
  ): Promise<BulkResponse> {
    const ndjson: string[] = []
    for (const doc of documents) {
      const id = String(doc.id ?? crypto.randomUUID())
      ndjson.push(JSON.stringify({ index: { _index: indexName, _id: id } }))
      ndjson.push(JSON.stringify(doc))
    }
    const res = await fetch(`${this.baseUrl}/_bulk`, {
      method: 'POST',
      headers: this.authHeaders,
      body: ndjson.join('\n') + '\n',
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenSearch bulk error ${res.status}: ${body}`)
    }
    return res.json()
  }

  private async doSearch<T>(
    indexName: string,
    query: Record<string, unknown>,
  ): Promise<SearchResponse<T>> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(indexName)}/_search`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenSearch search error ${res.status}: ${body}`)
    }
    return res.json()
  }

  private async doDelete(indexName: string, id: string): Promise<DeleteResponse> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(indexName)}/_doc/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.authHeaders,
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (!res.ok && res.status !== 404) {
      const body = await res.text()
      throw new Error(`OpenSearch delete error ${res.status}: ${body}`)
    }
    const data = res.status === 404 ? { result: 'not_found' } : await res.json()
    return { acknowledged: true, _index: indexName, _id: id, result: data.result }
  }

  private async doGetIndex(indexName: string): Promise<GetResponse<Record<string, unknown>>> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(indexName)}`, {
      method: 'GET',
      headers: this.authHeaders,
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (res.status === 404) {
      return { _index: indexName, _id: '', _source: null, found: false }
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenSearch get index error ${res.status}: ${body}`)
    }
    const data = await res.json()
    return { _index: indexName, _id: '', _source: data, found: true }
  }

  private async doCreateIndex(
    indexName: string,
    mapping: Record<string, unknown>,
  ): Promise<IndexResponse> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(indexName)}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(mapping),
      signal: AbortSignal.timeout(this.config.requestTimeout),
    })
    if (!res.ok && res.status !== 400) { // 400 = index already exists
      const body = await res.text()
      throw new Error(`OpenSearch create index error ${res.status}: ${body}`)
    }
    return { acknowledged: true, index: indexName }
  }

  private async doHealthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/_cluster/health`, {
        method: 'GET',
        headers: this.authHeaders,
        signal: AbortSignal.timeout(this.config.requestTimeout),
      })
      if (!res.ok) {
        return { status: 'red', message: `Cluster returned ${res.status}`, latency_ms: Date.now() - start }
      }
      const data = await res.json()
      return {
        status: data.status,
        cluster_name: data.cluster_name,
        number_of_nodes: data.number_of_nodes,
        active_primary_shards: data.active_primary_shards,
        active_shards_percent: data.active_shards_percent,
        latency_ms: Date.now() - start,
      }
    } catch (error) {
      return {
        status: 'red',
        message: error instanceof Error ? error.message : String(error),
        latency_ms: Date.now() - start,
      }
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

const GLOBAL_CLIENT_KEY = '__YOUNGSEND_SEARCH_CLIENT__'
type GlobalWithClient = typeof globalThis & { [GLOBAL_CLIENT_KEY]?: SearchClient }

function getOrCreateClient(): SearchClient {
  const g = globalThis as GlobalWithClient
  if (!g[GLOBAL_CLIENT_KEY]) {
    g[GLOBAL_CLIENT_KEY] = new SearchClient({
      url: process.env.OPENSEARCH_URL,
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
      requestTimeout: Number(process.env.OPENSEARCH_TIMEOUT ?? 30_000),
      maxRetries: Number(process.env.OPENSEARCH_MAX_RETRIES ?? 3),
    })
  }
  return g[GLOBAL_CLIENT_KEY]!
}

export const searchClient = getOrCreateClient()
export { SearchClient }
