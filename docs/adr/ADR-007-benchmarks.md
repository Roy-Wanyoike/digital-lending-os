# ADR-007: Kafka Performance Benchmarks

## Measurement Targets

### Producer Throughput

| Metric | Target | Notes |
|--------|--------|-------|
| Produce rate (p50) | >50,000 msg/s | Per producer instance, 1 KB payload |
| Produce rate (p95) | >50,000 msg/s | Sustained under load |
| Produce rate (p99) | >40,000 msg/s | Tail latency allowance |
| Batch size | 16–32 KB | `batch.size` tuned per topic |
| `linger.ms` | 5 | Balance latency vs throughput |

### Consumer Lag

| Metric | Target | Notes |
|--------|--------|-------|
| Consumer lag (p95) | < 100ms | Measured from produce-to-commit offset |
| Consumer lag (p99) | < 500ms | Under peak load (10,000 TPS) |
| Max poll interval | 300,000ms (5 min) | Configured per consumer group |
| `max.poll.records` | 50–1000 | Per consumer group (see ADR-007) |

### End-to-End Latency (Produce → Consume)

| Metric | Target | Notes |
|--------|--------|-------|
| E2E latency (p50) | < 20ms | Single broker, same AZ |
| E2E latency (p95) | < 50ms | Include serialization + network |
| E2E latency (p99) | < 100ms | Cross-partition worst case |

### Saga Orchestration Latency

| Metric | Target | Notes |
|--------|--------|-------|
| Per-saga-step latency | < 200ms | Includes DB write + produce |
| Full saga (5 steps) | < 1s | Happy path: initiate → completed |
| Compensating step | < 200ms | Reverse saga step latency |

### Dead Letter Queue Processing

| Metric | Target | Notes |
|--------|--------|-------|
| DLQ route time | < 5s | From consumer failure to DLQ publish |
| DLQ consumer lag | < 30s | DLQ dedicated consumer processes within SLA |
| DLQ replay time | < 2s | Manual replay via admin tool |

### Schema Evolution

| Metric | Target | Notes |
|--------|--------|-------|
| Zero-downtime compat | Required | New optional fields must not break existing consumers |
| Backward compat check | Pre-deploy | Zod `.optional()` for additive changes |
| Version bump latency | < 100ms | Consumer reads version field, routes to correct handler |

### Topic Compaction Retention

| Metric | Target | Notes |
|--------|--------|-------|
| Compacted topics | 7 days minimum | `min.cleanable.dirty.ratio=0.5` |
| Compact lag | < 1 hour | Active segments compacted within SLA |
| Non-compacted retention | 7–90 days | Per-topic override (see topics.ts) |

### Consumer Group Rebalance

| Metric | Target | Notes |
|--------|--------|-------|
| Rebalance duration | < 30s | Cooperative-sticky assignor |
| Rebalance pause | 0 | No stop-the-world with cooperative-sticky |
| Session timeout | 45s | `session.timeout.ms` |
| Heartbeat interval | 15s | `heartbeat.interval.ms` |

## Testing Approach

1. **Producer benchmark**: `kafka-producer-perf-test.sh` with 1 KB payloads, 3 partitions, `acks=all`.
2. **Consumer lag test**: Produce 100K messages, measure offset delta every 100ms until caught up.
3. **E2E latency test**: Custom producer timestamps messages; consumer measures delta.
4. **Saga benchmark**: Instrument saga orchestrator with `performance.now()` per step.
5. **Rebalance test**: Start/stop consumer instances, measure time to stable assignment.
6. **DLQ test**: Inject malformed messages, verify DLQ routing within 5s.
7. **Schema compat test**: Add optional field to Zod schema, verify old consumers still parse.
