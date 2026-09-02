# OpenSearch Search Service — Architecture

## Overview

Digital Lending OS uses OpenSearch as the primary full-text search engine for querying payments, transactions, businesses, users, and audit logs. The search layer sits between the API routes and the primary database, providing sub-second search across millions of records with support for faceted navigation, aggregations, and real-time CDC synchronization.

```
 ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
 │  API Routes  │────▶│  search-service  │────▶│   OpenSearch    │
 │  /api/*      │     │  (typed queries)  │     │   Cluster       │
 └─────────────┘     └──────────────────┘     └─────────────────┘
                            │                         ▲
                            │                         │
                     ┌──────┴──────┐          ┌──────┴──────┐
                     │   sync-     │          │  Kafka CDC   │
                     │   service   │─────────▶│  Consumer    │
                     │  (reindex)  │          └─────────────┘
                     └─────────────┘
                            │
                     ┌──────┴──────┐
                     │  Prisma DB  │
                     │  (source)   │
                     └─────────────┘
```

## Architecture Layers

### 1. Client Layer (`client.ts`)

The `SearchClient` class provides a unified interface that:
- **Real OpenSearch**: Connects via HTTP REST API (no native driver dependency). Supports basic auth and configurable timeouts.
- **In-Memory Fallback**: A fully functional `InMemorySearchStore` using Maps, automatically activated when `OPENSEARCH_URL` is not set. Supports filtering, sorting, and pagination.

Key features:
- Exponential backoff retry with jitter (3 retries, configurable)
- Connection timeout (30s default)
- Singleton pattern via `globalThis` for Next.js HMR compatibility
- Tenant-scoped isolation enforced at the query level

### 2. Index Definitions (`indexes.ts`)

Five index definitions with typed mappings:

| Index | Domain | Key Fields | Shards | Replicas |
|-------|--------|------------|--------|----------|
| `payments` | payment | amount, currency, status, provider, userId, tenantId | 3 | 1 |
| `transactions` | wallet | type, amount, currency, status, walletId, reference | 3 | 1 |
| `businesses` | business | name, industry, country, status, tenantId | 3 | 1 |
| `users` | user | name, email, role, status, tenantId | 3 | 1 |
| `audit-logs` | audit | action, actor, resource, timestamp, ipAddress, tenantId | 5 | 1 |

Custom analyzers:
- **name_analyzer**: standard tokenizer + lowercase + edge_ngrams (2-20) for autocomplete
- **email_analyzer**: pattern_capture for partial email matching
- **autocomplete_analyzer**: shingles (2-3 word phrases) for typeahead

### 3. Search Service (`search-service.ts`)

High-level typed search functions:

- `searchPayments()` — Full-text across description/business names, filter by status/provider/currency/amount/date
- `searchTransactions()` — Full-text across description/reference, filter by type/status/wallet/amount/date
- `searchBusinesses()` — Full-text across name/industry/description, filter by country/industry/status
- `searchUsers()` — Full-text across name/email, filter by role/status
- `searchAuditLogs()` — Full-text across action/actor/resource, filter by action/ip/date
- `globalSearch()` — Cross-index search across all or selected indices

Features per search function:
- **Full-text search**: multi_match with field boosting and fuzzy matching
- **Term filters**: exact-match on keyword fields (status, currency, role)
- **Range filters**: numeric (amount) and date ranges (createdAt, timestamp)
- **Aggregations**: terms, date_histogram, sum, avg, max, min
- **Cursor pagination**: `search_after` for consistent deep pagination (avoids the from/size 10K limit)
- **Highlights**: `<mark>`-wrapped fragments from matched fields

### 4. Sync Service (`sync-service.ts`)

Three synchronization strategies:

#### Single-entity sync
- `syncPayment()`, `syncTransaction()`, `syncBusiness()`, `syncUser()`, `syncAuditLog()`
- Used in API routes after CRUD operations for near-real-time index updates

#### Bulk sync
- `bulkSyncPayments()`, `bulkSyncTransactions()`, etc.
- Cursor-based pagination from the database with configurable batch sizes (default: 500)
- `fullBulkSync()` runs all entity syncs in parallel
- Used for initial indexing and periodic re-indexing

#### CDC (Change Data Capture)
- Subscribes to Kafka topics: `payment.events.*`, `wallet.events.*`, `business.events.*`, `user.events.*`, `audit.events.*`
- `processCDCEvent()` translates Kafka events → OpenSearch index/delete operations
- `createCDCMessageHandler()` returns a handler compatible with the Digital Lending OS Kafka consumer framework
- Sequential processing within partitions to preserve ordering
- Errors propagate to the consumer's DLQ handling

### 5. Transformers (`transformers.ts`)

Prisma model → flat search document transformers:
- Normalize dates to ISO 8601
- Denormalize related fields (e.g., `fromBusiness.name` → `fromBusinessName`)
- Strip relation objects (only scalar fields)
- Search result wrappers with highlight extraction

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPENSEARCH_URL` | _(none)_ | OpenSearch node URL (e.g., `https://opensearch:9200`). Absent → in-memory stub. |
| `OPENSEARCH_USERNAME` | _(none)_ | Basic auth username |
| `OPENSEARCH_PASSWORD` | _(none)_ | Basic auth password |
| `OPENSEARCH_TIMEOUT` | `30000` | Request timeout in ms |
| `OPENSEARCH_MAX_RETRIES` | `3` | Max retry attempts for transient failures |

## Index Templates

Located at `infra/opensearch/index-templates.json`. Register with:

```bash
# Register all templates
for template in payments transactions businesses users audit-logs; do
  curl -X PUT "https://opensearch:9200/_index_template/dlo-${template}-template" \
    -H 'Content-Type: application/json' \
    -d @index-templates.json
done

# Or use the OpenSearch Dashboard → Index Management → Index Templates
```

Settings: 3 shards / 1 replica (5 shards for audit-logs), 5s refresh interval.

## Quick Start

```typescript
// Search for payments in a tenant
import { searchPayments } from '@/backend/services/search'

const results = await searchPayments({
  tenantId: 'tenant_abc123',
  query: 'failed transfer',
  status: ['failed', 'refunded'],
  minAmount: 100,
  dateFrom: '2024-01-01',
  pageSize: 20,
  aggregations: [
    { name: 'by_provider', field: 'provider.keyword', type: 'terms', size: 5 },
  ],
})

console.log(results.results)        // Highlighted results
console.log(results.aggregations)   // Facets
console.log(results.nextCursor)     // Cursor for next page
```

## Operational Runbook

### Health Check
```bash
curl http://localhost:9200/_cluster/health?pretty
# Status: green (all shards), yellow (replicas missing), red (shards missing)
```

### Full Reindex
```typescript
import { fullBulkSync, ensureSearchIndices } from '@/backend/services/search'
import { prisma } from '@/backend/lib/prisma'

await ensureSearchIndices()
await fullBulkSync({
  payments: async (cursor, limit) => {
    const records = await prisma.paymentIntent.findMany({
      take: limit,
      ...(cursor && { cursor: { createdAt: cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: { fromBusiness: { select: { name: true } } },
    })
    return {
      records: records as any[],
      nextCursor: records.length === limit ? records[records.length - 1].createdAt.toISOString() : null,
    }
  },
  // ... similar for other entities
})
```

### Monitoring
- Search latency via `took` field in all responses
- Index health via `/_cluster/health`
- Index stats via `/_stats`
- Slow queries via OpenSearch slowlog (configured in `index-templates.json`)

## File Reference

| File | Purpose |
|------|---------|
| `src/backend/services/search/client.ts` | OpenSearch client with in-memory fallback |
| `src/backend/services/search/indexes.ts` | Index mappings and definitions |
| `src/backend/services/search/transformers.ts` | Prisma → OpenSearch document transformers |
| `src/backend/services/search/search-service.ts` | High-level typed search functions |
| `src/backend/services/search/sync-service.ts` | Sync, bulk sync, and CDC handlers |
| `src/backend/services/search/index.ts` | Barrel re-exports |
| `infra/opensearch/index-templates.json` | OpenSearch index templates with mappings |
