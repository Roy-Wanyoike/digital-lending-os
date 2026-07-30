# ADR-005: Wallet & Transactions Performance Benchmarks

## Measurement Targets

### Balance Query

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| GET /api/wallets (list all wallets for business) | < 100ms p99 | ~30-50ms | Indexed query on businessId |
| GET /api/wallets/[id] (single wallet with balance) | < 50ms p99 | ~15-25ms | Primary key lookup |
| Balance from Redis cache (hit) | < 2ms p99 | ~0.5ms | GET on `ys:wallet:{walletId}` |
| Balance from Redis cache (miss → DB) | < 50ms p99 | ~20-30ms | Cache miss + DB read + cache write |
| Balance cache invalidation (Pub/Sub) | < 5ms p99 | ~2ms | PUBLISH to `cache:invalidate:wallet` |

### Transfer Operations

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Deposit (demo, single wallet) | < 150ms p99 | ~50-80ms | Prisma $transaction: insert + update balances |
| Withdrawal (demo, single wallet) | < 150ms p99 | ~50-80ms | Prisma $transaction: insert + update balances |
| Currency conversion (2 wallets) | < 200ms p99 | ~80-120ms | Prisma $transaction: 4 writes + rate lookup |
| Crypto withdrawal | < 200ms p99 | ~80-120ms | Prisma $transaction: 3 writes |
| Balance invariant check (within transaction) | < 0.1ms p99 | ~0.05ms | Addition check on 3 columns |

### Batch Processing

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| GET /api/transactions (paginated, 50 per page) | < 100ms p99 | ~30-60ms | Partitioned table + index scan |
| GET /api/transactions (deep page, offset 10,000) | < 200ms p99 | ~100-150ms | Offset scan on partitioned table |
| GET /api/deposits (paginated, 50 per page) | < 100ms p99 | ~30-50ms | Indexed on walletId + createdAt |
| GET /api/withdrawals (paginated) | < 100ms p99 | ~30-50ms | Indexed on walletId + createdAt |
| Transaction list with wallet/currency join | < 150ms p99 | ~50-80ms | 2-table join with select projection |

### Exchange Rate Operations

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Exchange rate lookup (Redis cache hit) | < 1ms p99 | ~0.5ms | GET on `ys:fx:{from}:{to}` |
| Exchange rate lookup (cache miss → DB) | < 30ms p99 | ~15ms | DB query + cache write (60s TTL) |
| Exchange rate lookup (external API fallback) | < 500ms p99 | ~200-300ms | External API call + cache write |

### Cache Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Wallet balance cache hit ratio | > 85% | Redis GET命中率 |
| Exchange rate cache hit ratio | > 95% | 60s TTL + 5min SWR |
| Payment methods cache hit ratio | > 90% | 10min TTL per tenant/currency |
| Cache stampede prevention | 0 redundant origin hits | Distributed lock via SET NX EX |

### Connection Pool Utilization

| Metric | Target | Notes |
|--------|--------|-------|
| PgBouncer Pool A (WRITE) utilization | < 70% avg | 160 server connections |
| PgBouncer Pool B (READ) utilization | < 60% avg | Read replica queries |
| Prisma connection per pod | 1 | PgBouncer handles multiplexing |
| Max client connections (all pods) | 10,000 | PgBouncer client limit |
| Connection wait time | < 5ms p99 | PgBouncer transaction mode |

## Testing Approach

1. **Unit test:** Verify balance invariant holds after deposit (balance = available + pending + frozen).
2. **Unit test:** Verify withdrawal fails when availableBalance < amount + fee.
3. **Unit test:** Verify currency conversion debits source and credits destination atomically.
4. **Integration test:** Deposit NGN 10,000 → convert to USD → withdraw USD → verify all balances correct.
5. **Load test:** 500 concurrent balance queries, verify p99 < 50ms.
6. **Race condition test:** 2 concurrent withdrawals from same wallet, only one succeeds.
7. **Cache test:** Verify cache stampede protection — 100 concurrent requests for expired key → 1 DB query.
8. **Partition test:** Query transactions across 12 monthly partitions, verify partition pruning works.