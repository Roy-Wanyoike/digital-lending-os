# ADR-007: Threat Model - Event-Driven Architecture (Kafka)

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Malicious producer injects fake events | Medium | Critical | SASL/SCRAM authentication on all brokers; ACLs restrict which principals can produce to which topics | Low |
| Consumer group impersonation | Low | High | Group coordination via authenticated credentials; consumer group names include service identity | Low |
| Spoofed broker in man-in-the-middle | Low | Critical | TLS mutual authentication (mTLS) between brokers and clients; broker certificate pinning | Very Low |
| Stolen service credentials used to produce events | Medium | Critical | Service accounts with least-privilege ACLs; credential rotation every 90 days; audit log on all produce/consume actions | Medium |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Message payload tampering in transit | Low | Critical | TLS encryption for all broker connections; payload integrity via Zod schema validation on consume | Very Low |
| Message replay attack (replay old event) | Medium | Critical | Consumer deduplication via `eventId` UUID; idempotent consumer pattern; EOS Tier 1 uses transactional writes | Low |
| Event ordering manipulation | Low | High | Partition-based ordering is enforced by broker; single producer per partition-key ensures causal ordering | Very Low |
| Compensating event tampering (undo a refund) | Low | Critical | Saga state machine only accepts compensating transitions in FAILED state; all transitions validated | Low |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Deny producing a fraudulent event | Medium | High | Audit topic captures all events with `actor`, `ipAddress`, `timestamp`; broker access logs | Low |
| Deny consuming sensitive data | Medium | Medium | Consumer group ACLs log all consume actions; broker audit logs track `fetch` requests | Low |
| Delete evidence from topic | Low | Critical | Immutable log — Kafka does not support message deletion within retention; 90-day retention for audit/compliance topics | Very Low |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Cross-tenant event leakage via Kafka | Medium | Critical | `tenantId` enforced at producer level (set from JWT session); consumer filters by `tenantId`; topic-level ACLs prevent cross-tenant produce | Low |
| Sensitive data in event payload (PII, amounts) | High | High | Event payloads contain business IDs, not raw PII; payment amounts are in events but required for downstream processing. Future: field-level encryption for PII | Medium |
| Consumer reads events from wrong topic | Low | Medium | Consumer group ACLs restrict which topics each service can subscribe to; misconfigured consumer would fail ACL check | Very Low |
| Broker log leakage | Low | Medium | Broker logs configured to not log message payloads; only metadata (topic, partition, offset, timestamp) logged | Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Broker unavailability (single broker failure) | Medium | High | 3-broker cluster with replication factor 3; `min.insync.replicas=2`; automatic leader election | Low |
| Consumer group takeover (rogue consumer joins group) | Low | High | SASL authentication required; consumer group names are service-specific; unauthorized join rejected by ACL | Low |
| Poison pill message crashes all consumers | Medium | High | Zod schema validation catches malformed payloads; failed messages routed to DLQ after 3 retries; DLQ is isolated from main pipeline | Low |
| Topic flooding (malicious producer sends millions of events) | Medium | High | Per-producer quota (`producer_byte_rate`); topic-level retention limits (1 GB for transient topics); broker-side rate limiting | Medium |
| Partition imbalance (hot partition) | Medium | Medium | Composite partition keys (`tenantId:entityId`); monitoring alerts on per-partition lag > 2x average | Medium |
| Consumer lag accumulation (downstream slow) | Medium | High | Per-consumer-group lag alerting (> 1000 messages p99); circuit breaker stops consuming when downstream is down; horizontal scaling via additional consumer instances | Medium |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Produce to restricted topic (e.g., audit) | Low | High | Topic-level ACLs; only `audit-service` can produce to `audit.events.*` | Very Low |
| Consumer reads all tenants' events | Medium | Critical | `tenantId` filtering enforced at consumer level; application code filters events by session tenant before processing; defense-in-depth with RLS on DB reads | Low |
| Alter topic configuration (increase retention, disable compaction) | Low | Medium | Admin operations restricted to platform team; Kafka ACLs on `Alter` operations | Very Low |
| Schema manipulation (publish incompatible event) | Medium | High | Consumer-side Zod validation rejects unknown fields; version check rejects unsupported versions; DLQ routing for schema mismatches | Low |

---

## Attack Trees

### Attack Tree 1: Message Injection

```
Message Injection
+-- 1.1 Compromised producer service
|   +-- Mitigated: SASL/SCRAM auth, service account least-privilege
|   +-- Mitigated: mTLS between all Kafka clients and brokers
+-- 1.2 Stolen producer credentials
|   +-- Mitigated: Credential rotation every 90 days
|   +-- Mitigated: Per-topic ACLs limit blast radius
|   +-- GAP: No IP-based access control on brokers (relies on mTLS only)
+-- 1.3 Rogue internal service
|   +-- Mitigated: Consumer-side Zod validation rejects malformed payloads
|   +-- Mitigated: Tenant isolation — injected event with wrong tenantId filtered by consumers
|   +-- Risk: Valid-structured event with spoofed tenantId could pass schema validation
|       +-- Mitigated: Producer enforces tenantId from authenticated JWT session
+-- 1.4 Direct broker network access
    +-- Mitigated: Kafka cluster in private subnet (GKE private cluster)
    +-- Mitigated: Network policies restrict Kafka port (9092/9093) to application pods only
```

### Attack Tree 2: Replay Attack

```
Replay Attack
+-- 2.1 Re-publish previously consumed event
|   +-- Mitigated: Consumer deduplication via eventId UUID
|   +-- Mitigated: EOS Tier 1 — transactional consumer offsets prevent double-processing
|   +-- Mitigated: Idempotent wallet operations (balance check before credit)
+-- 2.2 Re-process from earlier offset
|   +-- Risk: Manual offset reset could replay financial events
|   +-- Mitigated: Idempotent consumers — replaying a completed payment credit is a no-op
|   +-- Mitigated: Offset reset requires admin access to Kafka
+-- 2.3 Webhook replay triggers duplicate event
    +-- Mitigated: Payment webhook idempotency (providerTxId uniqueness)
    +-- Mitigated: State machine idempotency (paymentId:targetState key)
```

### Attack Tree 3: Consumer Group Takeover

```
Consumer Group Takeover
+-- 3.1 Rogue consumer joins existing group
|   +-- Mitigated: SASL/SCRAM authentication required
|   +-- Mitigated: Consumer group name includes service identity (naming convention)
|   +-- Mitigated: Group coordinator rejects unauthenticated join requests
+-- 3.2 Kick existing consumers via group instability
|   +-- Mitigated: Cooperative-sticky assignor minimizes rebalancing
|   +-- Mitigated: `session.timeout.ms=30000` prevents premature rebalance
|   +-- Risk: Rapid connect/disconnect cycles could cause rebalance storm
|       +-- Mitigated: `max.poll.interval.ms=300000` gives consumers time to process
+-- 3.3 Spoof consumer group name
    +-- Mitigated: Even with correct name, SASL credentials must match service identity
    +-- Mitigated: ACLs checked on every fetch request
```

### Attack Tree 4: Poison Pill

```
Poison Pill
+-- 4.1 Malformed JSON payload
|   +-- Mitigated: JSON.parse failure → DLQ (reason: parse_error)
+-- 4.2 Valid JSON, fails Zod schema
|   +-- Mitigated: Zod validation → DLQ (reason: schema_mismatch)
+-- 4.3 Valid schema, causes runtime error in consumer
|   +-- Mitigated: try-catch in consumer handler → DLQ after 3 retries
|   +-- Mitigated: Dead letter queue isolates poison messages from main pipeline
+-- 4.4 Extremely large payload (> 1 MB)
|   +-- Mitigated: `message.max.bytes=1048576` rejected by broker
|   +-- Mitigated: Producer-side Zod validation catches oversized nested objects
+-- 4.5 Schema version mismatch (future)
    +-- Mitigated: Version check before payload parsing → DLQ
    +-- Mitigated: Backward-compatible schema evolution (optional fields, no removal)
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------|----------|
| Message injection (spoofed tenantId) | MEDIUM | No IP-based broker access control; relies on mTLS + SASL |
| Poison pill causing consumer crash | LOW | Zod validation + DLQ routing provides defense in depth |
| Replay attack on financial events | LOW | eventId dedup + idempotent consumers |
| Broker unavailability | LOW | 3-broker cluster with replication factor 3 |
| Consumer lag DoS | MEDIUM | No circuit breaker yet; lag alerting exists but no auto-scaling trigger |
| Cross-tenant event leakage | LOW | tenantId enforced at producer + consumer level |
| Schema incompatibility | MEDIUM | No centralized schema registry; breaking changes require coordinated deploy |

**Top priority:** Implement centralized schema registry (Apicurio/Confluent) to enforce backward compatibility and prevent schema-breaking deployments.
