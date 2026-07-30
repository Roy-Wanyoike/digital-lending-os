# ADR-011: Data Layer Performance Benchmarks

## Measurement Targets

### Read Replica Lag

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Sync replica (Replica B) lag | < 100ms p99 | ~10-50ms | Synchronous replication |
| Async replica (Replica C) lag | < 1s p99 | ~100-500ms | Asynchronous replication |
| Async replica (Replica D, analytics) | < 5s p99 | ~1-3s | Low-priority analytics queries |
| WAL shipping delay | < 500ms p99 | ~100ms | Network latency between nodes |
| Long-running query impact on replica lag | < 5s increase | N/A | Analytics queries on Replica D |

### Query Performance

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Simple SELECT by primary key | < 5ms p99 | ~2ms | Single row lookup |
| SELECT with foreign key join (2 tables) | < 20ms p99 | ~10ms | Indexed join |
| SELECT with 3+ table join | < 50ms p99 | ~20-30ms | Escrow + buyer + seller |
| SELECT with WHERE on indexed column | < 10ms p99 | ~5ms | B-tree index scan |
| SELECT with partial index (active records) | < 15ms p99 | ~5-10ms | Partial index prunes 90% of rows |
| SELECT with covering index (INCLUDE) | < 10ms p99 | ~3ms | Index-only scan, no heap fetch |
| SELECT on partitioned table (single partition) | < 20ms p99 | ~10ms | Partition pruning eliminates other months |
| SELECT on partitioned table (cross-partition) | < 100ms p99 | ~50ms | 12-month range scan with BRIN index |
| Aggregation query (COUNT, SUM, AVG) | < 100ms p99 | ~30-50ms | On indexed column |
| Full-text search (GIN index) | < 50ms p99 | ~20ms | `@@` operator on tsvector |
| JSONB containment query (GIN index) | < 10ms p99 | ~5ms | `@>` operator on JSONB column |
| Slow query log threshold | 500ms | Configured | `log_min_duration_statement = 500` |

### Connection Pool Utilization

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| PgBouncer Pool A (WRITE) — server connections | 160 | Configured | `(64 cores * 2) + 32 spindles` |
| PgBouncer Pool A — max client connections | 3,333 | Configured | 10,000 / 3 pools |
| PgBouncer Pool B (READ) — server connections | 160 | Configured | Same formula |
| PgBouncer Pool C (ANALYTICS) — server connections | 40 | Configured | Lower priority pool |
| Pool A average utilization (steady state) | < 70% | ~40-50% | Headroom for spikes |
| Pool A peak utilization (traffic burst) | < 90% | ~70-80% | Triggers HPA scale-up |
| Connection wait time (PgBouncer queue) | < 5ms p99 | ~2ms | Transaction mode releases fast |
| Connection checkout time | < 1ms p99 | ~0.5ms | PgBouncer in-process |
| Prisma connections per pod | 1 | Configured | PgBouncer multiplexes |
| Max pods (before pool exhaustion) | ~3,333 | Pool A limit / 1 per pod | Triggers HPA at lower threshold |

### Migration Downtime

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Add column (non-blocking) | 0s downtime | Instant | `ALTER TABLE ADD COLUMN` without default |
| Add column (with default, nullable) | 0s downtime | Instant | PostgreSQL 11+ instant default |
| Create index (CONCURRENTLY) | 0s downtime | ~5-60min | Background index build |
| Add @relation (new FK) | 0s downtime | ~1-5s | Non-blocking with existing data |
| Add @relation (FK + data backfill) | < 5min | ~2-3min | Backfill in batches of 10,000 |
| Change column type (String → Enum) | < 15min | ~5-10min | 3-step: add column, backfill, swap |
| SQLite → PostgreSQL migration (full) | < 60min | ~30-45min | Data export + import + verify |
| Add RLS policy | 0s downtime | ~1s | `CREATE POLICY` is non-blocking |
| Create partition (new month) | < 5s | ~1s | `CREATE TABLE ... PARTITION OF` |

### Schema Operations

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| `prisma generate` (client) | < 30s | ~15s | 30+ models, 100+ fields |
| `prisma migrate dev` (single migration) | < 30s | ~10-15s | Apply + test |
| `prisma migrate deploy` (production) | < 60s | ~20-30s | Apply pending migrations |
| Prisma query logging overhead (dev) | < 5% latency | ~2-3% | `log: ['query']` adds I/O |

## Testing Approach

1. **Query plan test:** `EXPLAIN ANALYZE` on all dashboard queries, verify index usage.
2. **Replica lag test:** Sustained write load (5,000 TPS), measure replica lag continuously.
3. **Connection pool test:** 1,000 concurrent queries, verify no connection timeout.
4. **Migration test:** Run all pending migrations on a copy of production data, measure downtime.
5. **Partition test:** Query WalletTransactions across 12 partitions with date range, verify pruning.
6. **Covering index test:** Verify `EXPLAIN` shows "Index Only Scan" for dashboard queries with INCLUDE columns.
7. **RLS test:** Connect as different tenants, verify data isolation at query level.
8. **PgBouncer test:** Verify transaction mode works correctly with Prisma (no session-state leakage).
