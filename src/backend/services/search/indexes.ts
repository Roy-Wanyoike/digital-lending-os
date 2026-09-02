// --- OpenSearch Index Definitions for Digital Lending OS ---
// Defines mappings, settings, and metadata for all searchable indices.
// These map to the Prisma models and power the high-level search service.

// --- Types ---

export interface IndexDefinition {
  /** Index name used in OpenSearch */
  name: string
  /** Human-readable label */
  label: string
  /** The domain this index belongs to */
  domain: 'payment' | 'wallet' | 'business' | 'user' | 'audit'
  /** OpenSearch mapping definition */
  mapping: Record<string, unknown>
  /** OpenSearch settings */
  settings: Record<string, unknown>
  /** Default highlight fields for full-text search */
  highlightFields: string[]
  /** Default sort field */
  defaultSortField: string
  /** Default sort order */
  defaultSortOrder: 'asc' | 'desc'
}

// --- Shared settings ---

const BASE_SETTINGS = {
  number_of_shards: 3,
  number_of_replicas: 1,
  refresh_interval: '5s',
  analysis: {
    analyzer: {
      // Custom analyzer for business/person names: lowercase + edge n-grams
      name_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'edge_ngram_filter'],
      },
      // Custom analyzer for emails: preserves @ and domain structure
      email_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'email_normalizer'],
      },
      // Autocomplete analyzer: shingles for phrase completion
      autocomplete_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'shingle_filter'],
      },
    },
    filter: {
      edge_ngram_filter: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 20,
      },
      email_normalizer: {
        type: 'pattern_capture',
        patterns: ['([^@]+)', '(\\w+)', '([^.]+)'],
        preserve_original: true,
      },
      shingle_filter: {
        type: 'shingle',
        min_shingle_size: 2,
        max_shingle_size: 3,
      },
    },
  },
}

// --- Dynamic templates shared across all indices ---

const DYNAMIC_TEMPLATES = [
  {
    string_fields: {
      match_mapping_type: 'string',
      mapping: {
        type: 'text',
        fields: { keyword: { type: 'keyword', ignore_above: 256 } },
      },
    },
  },
  {
    metadata_fields: {
      match: 'metadata.*',
      mapping: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
        index: false, // Don't index large JSON metadata blobs
      },
    },
  },
]

// --- Index: payments ---

const paymentsMapping = {
  dynamic: 'strict',
  properties: {
    amount: { type: 'double' },
    currency: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    status: { type: 'keyword' },
    provider: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
      analyzer: 'standard',
    },
    description: {
      type: 'text',
      analyzer: 'standard',
      fields: { keyword: { type: 'keyword', ignore_above: 256 } },
    },
    createdAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    updatedAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    userId: { type: 'keyword' },
    tenantId: { type: 'keyword' },
    // Denormalized fields for display
    fromBusinessName: {
      type: 'text',
      analyzer: 'name_analyzer',
      fields: { keyword: { type: 'keyword' } },
    },
    toBusinessName: {
      type: 'text',
      analyzer: 'name_analyzer',
      fields: { keyword: { type: 'keyword' } },
    },
    paymentMethod: { type: 'keyword' },
    escrowId: { type: 'keyword' },
    intentRef: { type: 'keyword' },
    txRef: { type: 'keyword' },
  },
  dynamic_templates: DYNAMIC_TEMPLATES,
}

// --- Index: transactions ---

const transactionsMapping = {
  dynamic: 'strict',
  properties: {
    type: { type: 'keyword' },
    amount: { type: 'double' },
    currency: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    status: { type: 'keyword' },
    walletId: { type: 'keyword' },
    businessId: { type: 'keyword' },
    createdAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    reference: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    txRef: { type: 'keyword' },
    description: {
      type: 'text',
      analyzer: 'standard',
    },
    counterpartyId: { type: 'keyword' },
    referenceType: { type: 'keyword' },
    balanceBefore: { type: 'double' },
    balanceAfter: { type: 'double' },
    provider: { type: 'keyword' },
    tenantId: { type: 'keyword' },
  },
  dynamic_templates: DYNAMIC_TEMPLATES,
}

// --- Index: businesses ---

const businessesMapping = {
  dynamic: 'strict',
  properties: {
    name: {
      type: 'text',
      analyzer: 'name_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
      },
    },
    legalName: {
      type: 'text',
      analyzer: 'name_analyzer',
      fields: { keyword: { type: 'keyword' } },
    },
    industry: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    country: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    city: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    status: { type: 'keyword' },
    tenantId: { type: 'keyword' },
    createdAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    description: {
      type: 'text',
      analyzer: 'standard',
    },
    website: { type: 'keyword' },
    employeeCount: { type: 'integer' },
    annualRevenue: { type: 'double' },
    // Denormalized trust/compliance fields
    trustScore: { type: 'float' },
    credentialLevel: { type: 'keyword' },
    kycStatus: { type: 'keyword' },
    riskRating: { type: 'keyword' },
  },
  dynamic_templates: DYNAMIC_TEMPLATES,
}

// --- Index: users ---

const usersMapping = {
  dynamic: 'strict',
  properties: {
    name: {
      type: 'text',
      analyzer: 'name_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
      },
    },
    email: {
      type: 'text',
      analyzer: 'email_analyzer',
      fields: { keyword: { type: 'keyword' } },
    },
    role: { type: 'keyword' },
    status: {
      type: 'keyword',
      // isActive boolean mapped as keyword for filtering
    },
    tenantId: { type: 'keyword' },
    businessId: { type: 'keyword' },
    lastLoginAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    createdAt: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
  },
  dynamic_templates: DYNAMIC_TEMPLATES,
}

// --- Index: audit-logs ---

const auditLogsMapping = {
  dynamic: 'strict',
  properties: {
    action: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    actor: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    actorId: { type: 'keyword' },
    resource: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    resourceId: { type: 'keyword' },
    details: {
      type: 'text',
      analyzer: 'standard',
    },
    timestamp: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
    tenantId: { type: 'keyword' },
    ipAddress: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    metadata: {
      type: 'object',
      enabled: false, // Raw JSON, not indexed
    },
  },
  dynamic_templates: DYNAMIC_TEMPLATES,
}

// --- All Index Definitions ---

export const INDEX_DEFINITIONS: IndexDefinition[] = [
  {
    name: 'payments',
    label: 'Payments',
    domain: 'payment',
    mapping: paymentsMapping,
    settings: BASE_SETTINGS,
    highlightFields: ['description', 'fromBusinessName', 'toBusinessName', 'provider'],
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
  },
  {
    name: 'transactions',
    label: 'Wallet Transactions',
    domain: 'wallet',
    mapping: transactionsMapping,
    settings: BASE_SETTINGS,
    highlightFields: ['description', 'reference', 'txRef'],
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
  },
  {
    name: 'businesses',
    label: 'Businesses',
    domain: 'business',
    mapping: businessesMapping,
    settings: BASE_SETTINGS,
    highlightFields: ['name', 'legalName', 'industry', 'description'],
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
  },
  {
    name: 'users',
    label: 'Users',
    domain: 'user',
    mapping: usersMapping,
    settings: BASE_SETTINGS,
    highlightFields: ['name', 'email'],
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
  },
  {
    name: 'audit-logs',
    label: 'Audit Logs',
    domain: 'audit',
    mapping: auditLogsMapping,
    settings: {
      ...BASE_SETTINGS,
      // Audit logs benefit from more shards for high write throughput
      number_of_shards: 5,
    },
    highlightFields: ['action', 'actor', 'resource', 'details'],
    defaultSortField: 'timestamp',
    defaultSortOrder: 'desc',
  },
]

// --- Lookup helpers ---

export const INDEX_MAP = Object.fromEntries(
  INDEX_DEFINITIONS.map((def) => [def.name, def]),
) as Record<string, IndexDefinition>

export function getIndexDefinition(name: string): IndexDefinition {
  const def = INDEX_MAP[name]
  if (!def) throw new Error(`Unknown search index: ${name}`)
  return def
}

/** All searchable index names */
export const SEARCH_INDEX_NAMES = INDEX_DEFINITIONS.map((d) => d.name)
