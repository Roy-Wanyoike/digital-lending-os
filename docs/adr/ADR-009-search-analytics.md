# ADR-009: Search & Analytics Architecture

**Status:** Active
**Date:** 2025-01-29
**Domain Owner:** D9 — Search & Analytics

## Context

Digital Lending OS requires three interconnected capabilities:
1. **Full-text search** — users and admins need to search across payments, transactions, businesses, users, and audit logs with filtering, sorting, and aggregations.
2. **Analytics** — the dashboard and reporting system need aggregated metrics (payment volume, escrow stats, wallet balances, fraud counts) scoped to a tenant.
3. **Reporting** — exportable reports for transactions, invoices, escrows, wallets, and collections with date filtering and pagination.

### Constraints
- **Multi-tenant isolation** — every query must be scoped to the authenticated user's tenant. Cross-tenant data leakage is a critical security bug.
- **No heavy dependencies** — the OpenSearch client uses native `fetch()` (Node 18+) instead of the `@opensearch-project/opensearch` npm package to avoid native module compilation issues in containerized environments.
- **Graceful degradation** — when OpenSearch is unavailable (dev/test), an in-memory Map-based stub provides full API compatibility.
- **Resource constraints** — the platform runs in memory-constrained containers; analytics queries must not load entire tables into memory.

## Decision

### 1. OpenSearch Client (`client.ts`)

**Architecture:** Single-purpose HTTP client wrapping the OpenSearch REST API.

- **URL source:** `process.env.OPENSEARCH_URL` with fallback to `http://localhost:9200`.
- **Authentication:** Basic auth via `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` env vars (for Amazon OpenSearch Service with fine-grained access control, SigV4 signing should be added).
- **Singleton pattern:** Uses `globalThis` to maintain a single connection across hot reloads in dev.
- **Retry:** Exponential backoff with jitter (base 1s, max 30s, up to 3 retries). Retries only on transient errors (timeouts, 429, 502, 503, connection refused).
- **Timeout:** Configurable via `OPENSEARCH_TIMEOUT` (default 30s), enforced via `AbortSignal.timeout()`.
- **In-memory stub:** When `OPENSEARCH_URL` is not set, all operations fall back to a `Map<string, Map<string, Record>>` implementation that supports basic match/term/range filtering, sorting, and pagination.

### 2. Index Definitions (`indexes.ts`)

Five search indices with strict dynamic mapping:

| Index | Domain | Shards | Key Fields |
|---|---|---|---|
| `payments` | payment | 3 | amount, currency, status, provider, fromBusinessName, toBusinessName |
| `transactions` | wallet | 3 | type, amount, currency, status, walletId, reference, balanceBefore/After |
| `businesses` | business | 3 | name (edge n-gram), legalName, industry, country, trustScore, kycStatus |
| `users` | user | 3 | name (edge n-gram), email (custom analyzer), role |
| `audit-logs` | audit | 5 | action, actor, resource, timestamp, ipAddress |

**All indices include `tenantId: { type: 'keyword' }` for tenant isolation.**

**Custom analyzers:**
- `name_analyzer` — standard + lowercase + edge_ngram (2–20) for autocomplete on business/user names.
- `email_analyzer` — standard + lowercase + pattern_capture for email search.
- `autocomplete_analyzer` — standard + lowercase + shingle (2–3) for phrase completion.

### 3. Search Service (`search-service.ts`)

**Architecture:** High-level typed search functions with mandatory tenant isolation.

- **Tenant enforcement:** `buildQuery()` always injects `term: { tenantId: { value } }` into the `bool.filter` clause. This is non-negotiable — every search function requires `tenantId` as a parameter.
- **Pagination:** Cursor-based via `search_after` for consistent deep pagination. Page size capped at 100.
- **Aggregations:** Optional per-request. Default aggregations include status breakdowns, provider distributions, and volume sums.
- **Cross-index search:** `globalSearch()` fans out to multiple indices in parallel, with per-index error isolation (one failing index doesn't fail the entire search).
- **Typed results:** Transformers (`transformers.ts`) convert raw OpenSearch hits into strongly-typed domain objects with highlight extraction.

### 4. Sync Service (`sync-service.ts`)

**Architecture:** Dual-mode sync — incremental (CDC via Kafka) and bulk (full reindex).

- **CDC pipeline:** Subscribes to Kafka topics (e.g., `payment.events.created`, `wallet.events.debit`) and translates events into OpenSearch index/delete operations. Sequential processing within a partition to preserve ordering.
- **Bulk sync:** Cursor-based reading from the database with configurable batch size (default 500). Uses `bulkIndex` NDJSON API for efficiency.
- **Idempotency:** All sync operations are safe to replay (index = upsert).

### 5. Analytics API (`/api/analytics`)

**Architecture:** Single GET endpoint returning a summary object.

- **Auth:** Session-based via `getApiUser()`. Returns 401 if unauthenticated.
- **Tenant isolation:** Resolves `user.tenantId` → `businessId[]` → filters all queries by `businessId: { in: [...] }`.
- **Period filter:** Supports `7d`, `30d` (default), `90d`, `12m`. All aggregation queries are scoped to the period.
- **Metrics:** Payment volume, transaction count, active/completed escrow stats, invoice totals, wallet balances, collection outstanding amounts, fraud alert count, compliance screening count, payment link revenue.
- **Error handling:** Generic 500 with no internal detail leakage.

### 6. Reports API (`/api/reports`)

**Architecture:** Type-switch GET endpoint with pagination and date filtering.

- **Auth:** Session-based via `getApiUser()`. Returns 401 if unauthenticated.
- **Type allowlist:** Only `transactions`, `invoices`, `wallets`, `escrow`, `collections`, `summary` are valid. Invalid types fall through to `summary`.
- **Date validation:** Parses `startDate`/`endDate` via `Date` constructor with `isNaN` check. Rejects `endDate < startDate` with 400.
- **Pagination:** All list reports accept `limit` (max 200) and `offset` parameters. Returns `total` count for client-side pagination.
- **Empty tenant guard:** Returns empty data immediately if the tenant has no businesses (avoids unnecessary queries).
- **Tenant isolation:** All queries filtered by `businessId: { in: tenantBusinessIds }`.

### 7. Transactions API (`/api/transactions`)

**Architecture:** Unified transaction list with type-specific and merged views.

- **Auth:** Session-based via `getApiUser()`. Returns 401 if unauthenticated.
- **Type filtering:** `?type=wallet` or `?type=payment` for single-source queries with DB-level pagination.
- **Merge mode (default):** Fetches over-sized batches (offset + limit) from both wallet and payment tables, merge-sorts by `createdAt`, then slices for pagination. Uses `select` to minimize data transfer.
- **Joins:** Wallet type includes `{ wallet: { id, currency, balance, businessId } }`. Payment type includes `{ intent: { id, currency, status, fromBusinessId, toBusinessId } }`.
- **Tenant isolation:** Wallet queries use `wallet.business.tenantId`. Payment queries use `intent.OR[fromBusinessId, toBusinessId]` with tenant business IDs.
- **Error handling:** Internal errors return generic 500. Auth errors preserve their status codes.

## Consequences

### Positive
- All three APIs (analytics, reports, transactions) have authentication and tenant isolation.
- OpenSearch client is dependency-free (native fetch) with graceful in-memory fallback.
- Cursor-based pagination avoids deep-paging performance issues in OpenSearch.
- CDC pipeline enables near-real-time search index updates via Kafka.
- Reports route now has proper pagination and date validation.
- Transactions merge query no longer loads entire tables into memory.

### Negative / Technical Debt
- **No SigV4 signing** — AWS OpenSearch Service requires request signing. The current Basic Auth approach works for self-managed clusters but not for AWS.
- **In-memory stub is not feature-complete** — the stub supports basic match/term/range but lacks full query DSL, aggregations, and scoring.
- **No search API route** — the search service exists but there is no `/api/search` HTTP endpoint exposing it to the frontend.
- **CDC pipeline is not wired** — `processCDCEvent` exists but no Kafka consumer is actually running it.
- **Sync functions accept raw Records** — they don't read from Prisma directly; the caller must provide a `fetchFn`. This adds flexibility but also boilerplate.
- **Analytics has no caching** — every GET recomputes all aggregates. A Redis-backed cache with short TTL (60s) would reduce DB load.
- **Reports do not support export formats** — currently JSON only. CSV/PDF export would be valuable for financial reporting.

### Migration Plan (P1)
1. Add `/api/search` route exposing `searchService` with auth + tenant isolation.
2. Wire CDC consumer to Temporal workflow for reliable search sync.
3. Add Redis cache layer to analytics (60s TTL, tenant-keyed).
4. Add CSV/PDF export to reports endpoint.
5. Add SigV4 signing support to OpenSearch client for AWS.
6. Add `businessId` to transactions index mapping for direct business-scoped search.
