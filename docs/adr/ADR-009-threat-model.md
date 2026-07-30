# ADR-009: Threat Model - Search & Analytics

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Unauthorized search access | Medium | High | `getApiUser()` on all search routes; 401 if unauthenticated | Low |
| Forged search API requests | Low | Medium | JWT authentication; `x-csrf-token` on POST/PUT | Very Low |
| Unauthorized analytics access | Medium | Medium | `getApiUser()` + tenant business ID resolution | Low |
| Impersonate another tenant's analytics | Medium | Critical | `tenantId` resolved from JWT → `businessId[]` → query filter | Low |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Search query injection (Lucene/OS DSL) | Medium | High | Zod validation on all query parameters; only allowed fields accepted | Low |
| Aggregation manipulation (injected buckets) | Medium | Medium | Server constructs aggregation DSL; client only passes `agg=true` flag | Very Low |
| Report date range manipulation | Medium | Low | Server validates `startDate <= endDate`; NaN check on Date constructor | Very Low |
| Pagination manipulation (negative offset, huge limit) | Low | Low | Zod validation: `offset >= 0`, `limit` capped at 200 | Very Low |
| OpenSearch document tampering | Low | High | Read-only OpenSearch user for search service; write access restricted to CDC consumer | Very Low |
| Index mapping tampering | Low | High | Admin-only API for index management; index templates prevent runtime changes | Very Low |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Deny performing a search | Low | Low | `x-request-id` on all responses; structured logs with actor, query, timestamp | Very Low |
| Deny exporting a report | Medium | Medium | Audit log on report export with actor, report type, date range, timestamp | Low |
| No evidence of who viewed sensitive analytics | Medium | Medium | Analytics endpoint logs access with `request_id`, `user_id`, `tenant_id` | Low |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Cross-tenant search results | Medium | Critical | `buildQuery()` always injects `term: { tenantId: { value } }` in bool.filter | Low |
| Cross-tenant analytics data | Medium | Critical | Analytics resolves `businessId[]` from tenant and filters all queries | Low |
| OpenSearch credentials leaked in error | Low | High | Connection errors return generic 500; no credentials in response or logs | Low |
| Search reveals document structure (field names) | Medium | Low | Field names are not sensitive; they reflect the Prisma schema | Accepted |
| Aggregation reveals volume data across tenants | Low | Medium | All aggregations are tenant-scoped; no cross-tenant aggregation endpoint | Low |
| Error messages expose OpenSearch internals | Medium | Medium | Generic 500 error; no stack trace or query DSL in response | Low |
| In-memory stub data leakage | Low | Low | In-memory stub is per-process; no persistence; no cross-request data sharing | Very Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Complex query causes OpenSearch OOM | Medium | High | Zod validation limits query complexity; `timeout: 30s` on all requests; AbortSignal | Medium |
| Deep pagination (offset 1,000,000) | Medium | Medium | Cursor-based `search_after` avoids offset penalty; max 100 results per page | Low |
| Aggregation fan-out (request 100 buckets) | Medium | Medium | Fixed aggregation definitions; client cannot control bucket count | Low |
| Full reindex during peak traffic | Low | Medium | Bulk sync uses cursor-based batching (500 docs); configurable rate limit | Low |
| OpenSearch cluster unresponsive | Low | High | In-memory Map fallback when OPENSEARCH_URL not set; graceful degradation | Medium |
| Report export (large date range) | Medium | Medium | Pagination limit (max 200 per page); date range capped at 12 months | Low |
| Analytics query on huge tenant | Medium | Medium | OpenSearch aggregations (pre-computed) not raw DB scans; 60s cache TTL | Low |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Bypass tenant filter to see all data | Low | Critical | `tenantId` filter is non-negotiable in `buildQuery()`; enforced at function level | Very Low |
| Inject arbitrary OpenSearch query | Medium | High | Client parameters are mapped to a safe query DSL; no raw query passthrough | Low |
| Access /api/search (not yet implemented) | Inherent | N/A | Route doesn't exist yet; when created, will use same auth + tenant isolation | N/A |
| Modify index mappings to bypass security | Low | High | Index management requires admin role; mapping changes are restricted | Very Low |

---

## Attack Trees

### Attack Tree 1: Search Injection

```
Search Injection
+-- 1.1 Inject Lucene query syntax in search term
|   +-- Mitigated: Zod validates input as string; OpenSearch client escapes special chars
|   +-- Mitigated: Query DSL is constructed server-side; user input is in a `match` query, not raw DSL
+-- 1.2 Inject aggregation manipulation
|   +-- Mitigated: Aggregations are predefined server-side; client only requests `agg=true`
|   +-- Mitigated: No user-controlled aggregation DSL
+-- 1.3 SQL injection via OpenSearch (not applicable)
|   +-- Mitigated: OpenSearch uses its own query DSL, not SQL
+-- 1.4 Field name injection
    +-- Mitigated: Search fields are whitelisted in the index mapping
    +-- Mitigated: `multi_match` query uses explicit field list, not user-provided
```

### Attack Tree 2: Data Exfiltration via Search

```
Data Exfiltration
+-- 2.1 Enumerate all tenants' data via search
|   +-- Mitigated: tenantId filter enforced in buildQuery()
|   +-- Mitigated: Even with direct OpenSearch access, read-only user has no tenant bypass
+-- 2.2 Extract analytics for other tenants
|   +-- Mitigated: Analytics resolves businessId[] from JWT tenant
|   +-- Mitigated: All aggregation queries include businessId filter
+-- 2.3 Use aggregations to infer other tenants' volumes
|   +-- Mitigated: No cross-tenant aggregation endpoint exists
|   +-- Mitigated: Each aggregation is scoped to tenant's business IDs
+-- 2.4 Export all data via reports
    +-- Mitigated: Pagination limit (200 per page)
    +-- Mitigated: Tenant-scoped queries only
```

### Attack Tree 3: Index Pollution

```
Index Pollution
+-- 3.1 Flood index with fake documents
|   +-- Mitigated: Write access restricted to CDC consumer service account
|   +-- Mitigated: No user-facing write endpoint to OpenSearch
+-- 3.2 Delete documents from index
|   +-- Mitigated: Read-only OpenSearch user for search service
|   +-- Mitigated: Admin-only access for index management
+-- 3.3 Modify document to inject XSS into search results
    +-- Mitigated: React auto-escapes search result display
    +-- Mitigated: CSP blocks inline scripts
```

### Attack Tree 4: DoS via Complex Queries

```
DoS via Complex Queries
+-- 4.1 Wildcard query on all fields
|   +-- Mitigated: Zod limits query to specific search fields
|   +-- Mitigated: 30s timeout via AbortSignal
+-- 4.2 Regex query (expensive backtracking)
|   +-- Mitigated: No regex query support in current search API
|   +-- Mitigated: edge_ngram analyzer handles autocomplete without regex
+-- 4.3 Request 100 aggregations in single query
    +-- Mitigated: Aggregations are server-defined; client cannot control count or type
    +-- Mitigated: 30s timeout kills runaway queries
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------||
| Cross-tenant search leakage | LOW | tenantId enforced in buildQuery() |
| Search injection | LOW | Server-side query construction |
| DoS via complex queries | MEDIUM | 30s timeout mitigates; no query complexity scoring |
| Index pollution | LOW | Write access restricted to CDC consumer |
| Data exfiltration via analytics | LOW | All queries tenant-scoped |
| OpenSearch unavailability | MEDIUM | In-memory fallback exists but not feature-complete |
| No /api/search route | N/A | Gap: search service exists but no HTTP endpoint |

**Top priority:** Create the `/api/search` route with proper auth, tenant isolation, and query validation to expose the existing search service to the frontend.
