# ADR-009: Search & Analytics Performance Benchmarks

## Measurement Targets

### Search Query Latency

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Simple term query (status=completed) | < 50ms p50, < 100ms p95, < 200ms p99 | ~20ms p50 | Single index, keyword filter |
| Full-text search (business name) | < 100ms p50, < 200ms p95, < 500ms p99 | ~50ms p50 | edge_ngram analyzer, 3 shards |
| Cross-index global search | < 200ms p50, < 500ms p95, < 1,000ms p99 | ~150ms p50 | Fan-out to 5 indices in parallel |
| Search with aggregations | < 200ms p50, < 500ms p95, < 1,000ms p99 | ~200ms p50 | Aggregation + query in single request |
| Cursor-based pagination (search_after) | < 100ms p50, < 200ms p95, < 500ms p99 | ~50ms p50 | No offset penalty on deep pages |
| Autocomplete query | < 50ms p50, < 100ms p95, < 200ms p99 | ~20ms p50 | shingle + edge_ngram analyzer |

### Indexing Throughput

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Single document index (CDC) | < 50ms p99 | ~20ms | Kafka consume → OpenSearch bulk |
| Bulk index (500 documents) | < 2,000ms p99 | ~1,000ms | NDJSON bulk API |
| Full reindex (payments, 1M documents) | < 30 min | ~20 min | Cursor-based batch of 500 |
| CDC consumer lag | < 1,000 messages p99 | ~500 | Per consumer group |
| CDC consumer processing rate | > 5,000 msg/s | ~8,000 msg/s | Bulk API with 500-doc batches |

### Aggregation Performance

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Status breakdown (terms agg) | < 100ms p99 | ~30ms | Single terms aggregation |
| Volume sum by currency | < 100ms p99 | ~40ms | Sum aggregation with terms |
| Date histogram (30-day) | < 200ms p99 | ~80ms | date_histogram with 30 buckets |
| Multi-agg dashboard query | < 500ms p99 | ~200ms | 5+ aggregations in single request |

### Analytics API

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| GET /api/analytics (full summary) | < 500ms p99 | ~200-400ms | 9 metrics, all from OpenSearch agg |
| GET /api/analytics (Redis cache hit) | < 5ms p99 | ~2ms | 60s TTL cache |
| GET /api/reports/transactions (50 per page) | < 200ms p99 | ~80-120ms | Prisma query + pagination |
| GET /api/reports/invoices (50 per page) | < 200ms p99 | ~80-120ms | Prisma query + pagination |
| GET /api/transactions (merge mode, 50 per page) | < 300ms p99 | ~150-200ms | 2 oversized queries + merge-sort |

### OpenSearch Client

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| HTTP request to OpenSearch (single node) | < 10ms p99 | ~5ms | Intra-cluster network |
| Retry on transient error (exponential backoff) | < 30s total | ~7s avg (3 retries) | Base 1s, max 30s, jitter |
| Connection timeout | 30s | Configurable via `OPENSEARCH_TIMEOUT` | AbortSignal.timeout() |
| In-memory stub query | < 1ms p99 | ~0.5ms | Map-based fallback |

## Testing Approach

1. **Unit test:** Verify `buildQuery()` always injects `tenantId` filter.
2. **Unit test:** Verify pagination limit capped at 100.
3. **Unit test:** Verify date validation rejects `endDate < startDate`.
4. **Integration test:** Index 1,000 documents → search → verify all results belong to correct tenant.
5. **Load test:** 100 concurrent search queries with aggregations, measure p50/p95/p99.
6. **CDC test:** Publish 10,000 Kafka events → verify OpenSearch index count matches.
7. **Graceful degradation test:** Stop OpenSearch → verify in-memory stub handles queries.
8. **Cross-index test:** Global search returns results from all 5 indices in single response.
