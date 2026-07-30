# ADR-007: Review Checklist — Event-Driven Architecture (Kafka)

## Topic Design

- [ ] **TC-01:** All topics follow the `<domain>.events.<event-type>` naming convention.
- [ ] **TC-02:** No topic name exceeds 249 characters (Kafka limit).
- [ ] **TC-03:** Partition count is a power of 2 or divisible by planned consumer count.
- [ ] **TC-04:** Partition count supports 3x peak throughput per partition (target: 1,000 msg/s per partition).
- [ ] **TC-05:** Replication factor is 3 for all topics.
- [ ] **TC-06:** `min.insync.replicas` is 2 for Tier 1 (financial) topics.
- [ ] **TC-07:** Retention policy is set per topic based on domain requirements (7d/30d/90d).
- [ ] **TC-08:** Compaction strategy matches the topic's data characteristics (delete for transient events, compact for state snapshots, delete+compact for business events).
- [ ] **TC-09:** `message.max.bytes` is set to 1 MB; no event payload should exceed 900 KB.
- [ ] **TC-10:** DLQ topic exists for every consumer group (`<original-topic>.dlq`).

## Consumer Group Configuration

- [ ] **CG-01:** Consumer group name follows `<service>.<domain>.consumer` convention.
- [ ] **CG-02:** Cooperative-sticky partition assignment is configured.
- [ ] **CG-03:** `max.poll.records` is tuned per domain (lower for financial, higher for audit).
- [ ] **CG-04:** `max.poll.interval.ms` exceeds the maximum expected processing time per batch.
- [ ] **CG-05:** `session.timeout.ms` is set appropriately (30s default, 60s for slow consumers).
- [ ] **CG-06:** `enable.auto.commit` is false for Tier 1 consumers; offsets committed after successful processing.
- [ ] **CG-07:** `isolation.level=read_committed` is set for Tier 1 consumers.
- [ ] **CG-08:** Consumer group has at least 2 instances for HA (except single-partition topics).
- [ ] **CG-09:** Consumer graceful shutdown commits final offsets before exiting.
- [ ] **CG-10:** No consumer subscribes to topics it should not access (ACL enforcement).

## Dead Letter Queue (DLQ)

- [ ] **DLQ-01:** DLQ topic exists for every source topic that has active consumers.
- [ ] **DLQ-02:** DLQ consumer is deployed and forwarding alerts to the on-call team.
- [ ] **DLQ-03:** DLQ messages include `x-dlq-reason`, `x-dlq-timestamp`, `x-dlq-original-topic` headers.
- [ ] **DLQ-04:** DLQ depth is monitored in Grafana with alerting threshold (> 100 messages).
- [ ] **DLQ-05:** Manual replay tool is documented and tested.
- [ ] **DLQ-06:** DLQ retention is 90 days (longer than source topics) for investigation.

## Idempotency & Deduplication

- [ ] **ID-01:** Every event has a unique `eventId` (UUID v4).
- [ ] **ID-02:** Consumer deduplicates by `eventId` before processing.
- [ ] **ID-03:** Tier 1 consumers use transactional offset commits (exactly-once semantics).
- [ ] **ID-04:** Wallet credit operations are idempotent (check `eventId` before applying balance change).
- [ ] **ID-05:** Saga orchestrator stores `correlationId` to detect and reject duplicate saga instances.
- [ ] **ID-06:** Idempotency keys are stored in Redis with 24h TTL to prevent replay within the window.

## Schema Evolution

- [ ] **SE-01:** Every event type has a corresponding Zod schema in the codebase.
- [ ] **SE-02:** Producer validates event against Zod schema before publishing.
- [ ] **SE-03:** Consumer validates event against Zod schema before processing.
- [ ] **SE-04:** Schema validation failures route to DLQ with reason `schema_mismatch`.
- [ ] **SE-05:** Event `version` field is checked before payload parsing.
- [ ] **SE-06:** New fields are added as `.optional()` for backward compatibility.
- [ ] **SE-07:** No field is removed without a version bump and migration plan.
- [ ] **SE-08:** Schema version history is documented in the event schema file.

## Security

- [ ] **SEC-01:** All Kafka connections use TLS encryption (mTLS preferred).
- [ ] **SEC-02:** SASL/SCRAM authentication is enabled for all clients.
- [ ] **SEC-03:** Per-topic ACLs restrict which principals can produce and consume.
- [ ] **SEC-04:** `tenantId` is set from the authenticated JWT session on every produced event.
- [ ] **SEC-05:** Consumer filters events by `tenantId` before processing.
- [ ] **SEC-06:** Broker cluster is in a private subnet; no public internet access.
- [ ] **SEC-07:** Service account credentials are stored in Kubernetes secrets with rotation.
- [ ] **SEC-08:** No sensitive PII (SSN, full address, ID numbers) in event payloads.

## Saga Orchestration

- [ ] **SAGA-01:** Payment saga has a `correlationId` linking all steps.
- [ ] **SAGA-02:** Compensating transactions are defined for every forward step.
- [ ] **SAGA-03:** Saga state is persisted in PostgreSQL for crash recovery.
- [ ] **SAGA-04:** Saga timeout scanner detects and fails orphaned sagas.
- [ ] **SAGA-05:** Financial compensating actions (wallet credit, escrow cancel) are tested for idempotency.

## Monitoring & Observability

- [ ] **MON-01:** Consumer lag is tracked per consumer group in Prometheus/Grafana.
- [ ] **MON-02:** Producer throughput (messages/sec, bytes/sec) is tracked per topic.
- [ ] **MON-03:** Broker disk usage and partition count are monitored.
- [ ] **MON-04:** DLQ depth and age are monitored with alerting.
- [ ] **MON-05:** Consumer error rate (exceptions per 10,000 messages) is tracked.
- [ ] **MON-06:** Saga success/failure/timeout rates are tracked.
- [ ] **MON-07:** End-to-end event latency (produce → consume → DB write) is tracked via distributed tracing.

## Testing

- [ ] **TEST-01:** Unit tests validate Zod schemas against sample payloads (valid and invalid).
- [ ] **TEST-02:** Integration tests verify consumer deduplication (send same `eventId` twice).
- [ ] **TEST-03:** Saga integration test verifies compensating transactions on step failure.
- [ ] **TEST-04:** DLQ test: publish a malformed message, verify it lands in DLQ with correct reason.
- [ ] **TEST-05:** Consumer group rebalance test: kill a consumer, verify partitions redistribute.
- [ ] **TEST-06:** Load test: produce at 3x peak throughput, verify consumer lag stays < 1,000 messages.
- [ ] **TEST-07:** Broker failure test: kill one broker, verify producers and consumers continue without data loss.