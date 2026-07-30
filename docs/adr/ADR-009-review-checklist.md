# ADR-009: Search & Analytics Review Checklist

**Domain Owner:** D9 — Search & Analytics
**Date:** 2025-01-29

## Route Audits

### Analytics — `GET /api/analytics`
- [x] Auth: uses `getApiUser()` — returns 401 if unauthenticated
- [x] Tenant isolation: resolves `user.tenantId` → `businessId[]` → all queries filtered
- [x] Period filter: `7d`, `30d`, `90d`, `12m` with default fallback
- [x] Error handling: generic 500, no internal detail leakage
- [x] Transaction count scoped to period (was unscoped — **fixed in D9**)

### Reports — `GET /api/reports`
- [x] Auth: uses `getApiUser()` — returns 401 if unauthenticated
- [x] Tenant isolation: all queries filtered by `businessId: { in: tenantBusinessIds }`
- [x] Date validation: `isNaN` check on parsed dates, rejects `endDate < startDate` with 400
- [x] Type allowlist: only `transactions|invoices|wallets|escrow|collections|summary` accepted
- [x] Pagination: `limit` (max 200) + `offset` on all list reports; returns `total` count
- [x] Empty tenant guard: returns empty data immediately if no businesses in tenant
- [x] Error handling: generic 500, no internal detail leakage

### Transactions — `GET /api/transactions`
- [x] Auth: uses `getApiUser()` — returns 401 if unauthenticated
- [x] Tenant isolation (wallet): `wallet.business.tenantId`
- [x] Tenant isolation (payment): `intent.OR[fromBusinessId, toBusinessId]` with tenant business IDs
- [x] Type-specific pagination: wallet/payment use DB-level `take`/`skip`
- [x] Merge mode: fetches bounded batches (offset + limit), not full tables (**fixed OOM in D9**)
- [x] Joins: wallet includes `{ wallet: { id, currency, balance, businessId } }`
- [x] Joins: payment includes `{ intent: { id, currency, status, fromBusinessId, toBusinessId } }`
- [x] Error handling: internal errors return generic 500; auth errors preserve status codes
- [x] Empty tenant guard: returns empty data immediately if no businesses in tenant

## OpenSearch Client

### client.ts
- [x] URL from `process.env.OPENSEARCH_URL` with `http://localhost:9200` fallback
- [x] Basic auth from `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD`
- [x] Timeout from `OPENSEARCH_TIMEOUT` (default 30s) via `AbortSignal.timeout()`
- [x] Retry: exponential backoff with jitter, max 3 retries, transient errors only
- [x] Singleton via `globalThis` for dev hot-reload safety
- [x] In-memory stub fallback when `OPENSEARCH_URL` is not set
- [x] All HTTP methods (index, bulk, search, delete, get, create, health) implemented

### indexes.ts
- [x] `payments` index has `tenantId: { type: 'keyword' }`
- [x] `transactions` index has `tenantId: { type: 'keyword' }` (**added in D9 — was missing**)
- [x] `businesses` index has `tenantId: { type: 'keyword' }`
- [x] `users` index has `tenantId: { type: 'keyword' }`
- [x] `audit-logs` index has `tenantId: { type: 'keyword' }`
- [x] All indices use `dynamic: 'strict'` to reject unmapped fields
- [x] Custom analyzers: `name_analyzer`, `email_analyzer`, `autocomplete_analyzer`

### search-service.ts
- [x] `buildQuery()` always injects `term: { tenantId }` into `bool.filter`
- [x] All search functions require `tenantId` parameter
- [x] Cursor-based pagination via `search_after`
- [x] Page size capped at 100 (`MAX_PAGE_SIZE`)
- [x] Aggregations are optional and per-request
- [x] `globalSearch()` isolates per-index errors (one failure doesn't fail all)
- [x] Highlight support with field-level control

### sync-service.ts
- [x] Per-entity sync functions (idempotent)
- [x] Bulk sync with cursor-based DB pagination
- [x] CDC event processing (Kafka topic → index/delete)
- [x] Sequential processing within CDC batch (preserves ordering)
- [x] Error logging with re-throw for DLQ handling

## Known Limitations (Not Bugs — Tracked for Future Work)

1. **No `/api/search` HTTP route** — search service exists but no frontend-facing endpoint.
2. **CDC consumer not wired** — `processCDCEvent` exists but no Kafka consumer runs it.
3. **No SigV4 signing** — Basic auth only; AWS OpenSearch Service requires request signing.
4. **In-memory stub lacks aggregations** — stub supports basic filtering but not agg results.
5. **No analytics caching** — every request recomputes all aggregates from the database.
6. **No report export formats** — JSON only; CSV/PDF export not implemented.
7. **Transactions merge is approximate** — the merge of two sorted streams may miss some results at page boundaries when both sources have records with identical timestamps.
8. **No search query rate limiting** — search endpoint (when created) should be rate-limited.
9. **No index lifecycle management** — no ILM policy for audit-log rollover.
10. **Sync functions don't read from Prisma directly** — caller must provide `fetchFn`.