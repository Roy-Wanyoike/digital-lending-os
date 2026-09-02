// ─── OpenSearch Index Mappings ─────────────────────────────────
// Central definition of all Digital Lending OS OpenSearch indices.
// Each index uses `tenantId` as a custom routing key for multi-tenant
// isolation so that queries scoped to a tenant hit a single shard.

export interface IndexConfig {
  name: string
  mapping: Record<string, any>
}

// Shared settings applied to every index
const DEFAULT_SETTINGS = {
  index: {
    number_of_shards: 1,
    number_of_replicas: 0,
    routing: {
      allocation: {
        include: {
          _tier_preference: 'data_hot',
        },
      },
    },
  },
}

// ── Index definitions ───────────────────────────────────────────

const INDEX_CONFIGS: IndexConfig[] = [
  {
    name: 'ys-transactions',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          txRef: { type: 'keyword' },
          amount: { type: 'double' },
          currency: { type: 'keyword' },
          status: { type: 'keyword' },
          type: { type: 'keyword' },
          description: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          businessId: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    },
  },
  {
    name: 'ys-escrow-transactions',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          txRef: { type: 'keyword' },
          amount: { type: 'double' },
          currency: { type: 'keyword' },
          status: { type: 'keyword' },
          buyerId: { type: 'keyword' },
          sellerId: { type: 'keyword' },
          description: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    },
  },
  {
    name: 'ys-invoices',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          invoiceRef: { type: 'keyword' },
          amount: { type: 'double' },
          currency: { type: 'keyword' },
          status: { type: 'keyword' },
          dueDate: { type: 'date' },
          senderId: { type: 'keyword' },
          receiverId: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          notes: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        },
      },
    },
  },
  {
    name: 'ys-fraud-alerts',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          alertRef: { type: 'keyword' },
          severity: { type: 'keyword' },
          status: { type: 'keyword' },
          fraudType: { type: 'keyword' },
          ruleId: { type: 'keyword' },
          score: { type: 'double' },
          description: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          businessId: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    },
  },
  {
    name: 'ys-audit-logs',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          action: { type: 'keyword' },
          entityType: { type: 'keyword' },
          entityId: { type: 'keyword' },
          userId: { type: 'keyword' },
          actorId: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          details: { type: 'text' },
          metadata: { type: 'object', enabled: false },
          createdAt: { type: 'date' },
        },
      },
    },
  },
  {
    name: 'ys-businesses',
    mapping: {
      settings: DEFAULT_SETTINGS,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' }, completion: { type: 'completion' } } },
          legalName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          email: { type: 'keyword' },
          status: { type: 'keyword' },
          country: { type: 'keyword' },
          industry: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    },
  },
]

/**
 * Return all index name + mapping pairs.
 */
export function getAllIndexConfigs(): IndexConfig[] {
  return INDEX_CONFIGS
}

/**
 * Create indices that do not already exist.
 * Safe to call repeatedly (idempotent).
 */
export async function initIndices(): Promise<void> {
  const { getOpenSearchClient } = await import('./opensearch-manager')
  const client = getOpenSearchClient()

  for (const cfg of INDEX_CONFIGS) {
    try {
      const exists = await client.indices.exists({ index: cfg.name })
      if (!exists.body) {
        await client.indices.create({ index: cfg.name, body: cfg.mapping })
      }
    } catch (err) {
      console.error(`[OpenSearch] Failed to init index "${cfg.name}":`, err)
    }
  }
}
