// ─── OpenSearch Client Manager ──────────────────────────────────
// Singleton client with lazy initialization.  Falls back to a no-op
// implementation when OPENSEARCH_URL is not configured so the rest of
// the application never has to null-check the client.

let _client: any = undefined
let _noop = false

/** No-op client that silently accepts every call and returns empty results. */
const NOOP_CLIENT = {
  ping: async () => false,
  search: async () => ({ hits: { hits: [], total: { value: 0 } }, aggregations: {} }),
  index: async () => ({ _id: '', result: 'noop' }),
  bulk: async () => ({ errors: false, items: [] }),
  delete: async () => ({ result: 'noop' }),
  indices: {
    exists: async () => false,
    create: async () => ({ acknowledged: true }),
    putMapping: async () => ({ acknowledged: true }),
    getAlias: async () => ({}) as any,
  },
  cat: {
    health: async () => '' as any,
  },
  transport: { requestTimeout: 0 },
}

/**
 * Build the real OpenSearch client from environment variables.
 * Imported lazily so the @opensearch-project/opensearch dependency is
 * only pulled in when actually needed.
 */
function buildClient(): any {
  const url = process.env.OPENSEARCH_URL
  if (!url) {
    _noop = true
    return NOOP_CLIENT
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Client } = require('@opensearch-project/opensearch')

  const sslVerify = process.env.OPENSEARCH_SSL_VERIFY !== 'false' // default true

  const nodeConfig: Record<string, unknown> = { url }
  if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
    nodeConfig.auth = {
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    }
  }

  return new Client({
    node: nodeConfig,
    requestTimeout: 30_000, // 30 seconds
    ssl: {
      rejectUnauthorized: sslVerify,
    },
    // sniff on start to discover cluster nodes
    sniffOnStart: true,
    // retry on connection error (up to 3 times)
    maxRetries: 3,
    // retry on timeout
    retryOnTimeout: true,
  })
}

/**
 * Return the singleton OpenSearch client.
 *
 * On first call the client is created from env vars.  Subsequent calls
 * return the cached instance.  When OPENSEARCH_URL is not set a no-op
 * client is returned so callers never need to guard against `null`.
 */
export function getOpenSearchClient(): any {
  if (!_client) {
    _client = buildClient()
  }
  return _client
}

export interface OpenSearchHealth {
  available: boolean
  noop: boolean
  clusterName?: string
  status?: string
  latencyMs?: number
  error?: string
}

/**
 * Ping the cluster and return basic health information.
 * Returns `{ available: false, noop: true }` when OPENSEARCH_URL is not set.
 */
export async function getOpenSearchHealth(): Promise<OpenSearchHealth> {
  const client = getOpenSearchClient()

  if (_noop) {
    return { available: false, noop: true }
  }

  try {
    const start = Date.now()
    const pingOk = await client.ping()
    const latencyMs = Date.now() - start

    if (!pingOk) {
      return { available: false, noop: false, error: 'ping returned false' }
    }

    // Best-effort fetch cluster health — ignore errors
    let clusterName: string | undefined
    let status: string | undefined
    try {
      const healthLine = await client.cat.health({ format: 'json' })
      const h = Array.isArray(healthLine?.body) ? healthLine.body[0] : healthLine.body
      clusterName = h?.cluster
      status = h?.status
    } catch {
      // non-critical
    }

    return { available: true, noop: false, clusterName, status, latencyMs }
  } catch (err: any) {
    return {
      available: false,
      noop: false,
      error: err?.message ?? String(err),
    }
  }
}
