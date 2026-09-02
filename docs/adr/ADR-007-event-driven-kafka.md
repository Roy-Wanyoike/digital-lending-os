# ADR-007: Event-Driven Architecture with Kafka

**Status:** Active  
**Date:** 2025-01-29  
**Domain Owner:** D7 — Event-Driven Architecture  

---

## Context

Digital Lending OS is a multi-tenant B2B fintech platform handling escrow payments, digital wallets, and compliance services for 100M users across emerging markets. As the system scales beyond a monolithic architecture, synchronous point-to-point integrations between domains become a liability:

1. **Tight coupling:** Payment completion must trigger wallet crediting, escrow funding, notification delivery, audit logging, and search indexing. Direct API calls create a dependency graph that makes independent deployment impossible.
2. **No audit trail:** Synchronous calls between services leave no immutable record of what happened, when, and why. Financial regulators require a complete, ordered event log.
3. **No retry semantics:** When a downstream service is unavailable, the calling service has no built-in mechanism to retry. Failed side-effects (missed notifications, stale search indices) require manual intervention.
4. **Scalability bottleneck:** Peak payment volumes (10,000 TPS target) cannot be handled by synchronous call chains. Each additional consumer adds latency to the critical path.
5. **Future service extraction:** The current monolithic Next.js BFF must be splittable into independent microservices without architectural changes. An event backbone enables this.

## Decision

### 1. Kafka as the Event Backbone

**Decision:** Use Apache Kafka as the sole async communication layer between domains.

**Rationale:**
- Immutable, ordered, append-only log provides a natural audit trail.
- Exactly-once semantics (EOS) prevent duplicate processing of financial events.
- Partition-based parallelism enables horizontal scaling per domain.
- Consumer groups allow multiple services to independently consume the same event.
- 7-day to 90-day retention enables reprocessing and debugging.

**Alternative considered:** RabbitMQ — rejected because it lacks persistent log semantics, partition-based ordering, and the ability to replay events. RabbitMQ is better suited for task queues than event streaming.

### 2. Topic Taxonomy

**Naming convention:** `<domain>.events.<event-type>`

All 38 topics across 8 domains:

| Domain | Topics | Partitions | Retention | Compaction | EOS Tier |
|--------|--------|------------|-----------|------------|----------|
| **Payment** (5 topics) | `payment.events.payment_initiated`, `payment.events.payment_processing`, `payment.events.payment_completed`, `payment.events.payment_failed`, `payment.events.payment_refunded` | 6–12 | 30 days | delete,compact | Tier 1 (EOS required) |
| **Wallet** (5 topics) | `wallet.events.wallet_deposited`, `wallet.events.wallet_withdrawn`, `wallet.events.wallet_converted`, `wallet.events.wallet_frozen`, `wallet.events.wallet_unfrozen` | 6–12 | 30 days | delete,compact | Tier 1 |
| **Escrow** (5 topics) | `escrow.events.escrow_created`, `escrow.events.escrow_funded`, `escrow.events.escrow_released`, `escrow.events.escrow_disputed`, `escrow.events.escrow_cancelled` | 6–8 | 30 days | delete,compact | Tier 1 |
| **Trust** (4 topics) | `trust.events.trust_score_updated`, `trust.events.trust_review_submitted`, `trust.events.trust_relationship_created`, `trust.events.trust_verification_completed` | 6–8 | 7 days | compact | Tier 2 |
| **Fraud** (4 topics) | `fraud.events.fraud_alert_triggered`, `fraud.events.fraud_rule_matched`, `fraud.events.fraud_case_opened`, `fraud.events.fraud_case_resolved` | 6–8 | 7 days | delete | Tier 2 |
| **Compliance** (5 topics) | `compliance.events.compliance_screening_requested`, `compliance.events.compliance_screening_completed`, `compliance.events.compliance_kyc_submitted`, `compliance.events.compliance_kyc_verified`, `compliance.events.compliance_kyc_rejected` | 6–8 | 30 days | delete | Tier 2 |
| **Notification** (4 topics) | `notification.events.notification_email_sent`, `notification.events.notification_push_sent`, `notification.events.notification_sms_sent`, `notification.events.notification_in_app` | 6 | 1 GB / 7 days | delete | Tier 3 (fire-and-forget) |
| **Audit** (1 topic) | `audit.events.audit_action_logged` | 12 | 90 days | delete | Tier 3 |

### 3. Exactly-Once Semantics (EOS) Tiers

Not all events require the same delivery guarantee. Three tiers balance performance and correctness:

| EOS Tier | Guarantee | Use Case | Configuration |
|----------|-----------|----------|---------------|
| **Tier 1** | Exactly-once (idempotent) | Financial mutations: payment, wallet, escrow | `enable.idempotence=true`, `isolation.level=read_committed`, `acks=all` |
| **Tier 2** | At-least-once with dedup | Non-financial but important: trust, fraud, compliance, search CDC | `acks=all`, consumer dedup via `eventId` |
| **Tier 3** | Fire-and-forget | Best-effort: notifications, audit | `acks=1`, no consumer dedup needed |

### 4. Consumer Group Strategy

**Naming convention:** `<owning-service>.<domain>.consumer`

| Consumer Group | Subscribed Topics | EOS Tier | `max.poll.records` | Notes |
|-----------------|-------------------|----------|--------------------|-------|
| `wallet-service.payment.consumer` | `payment.events.payment_completed`, `payment_refunded` | Tier 1 | 50 | Credits wallet on payment success |
| `escrow-service.payment.consumer` | `payment.events.payment_completed` | Tier 1 | 50 | Funds escrow on payment success |
| `fraud-engine.payment.consumer` | `payment.events.payment_initiated`, `payment_processing` | Tier 2 | 100 | Real-time fraud evaluation |
| `compliance-service.payment.consumer` | `payment.events.payment_initiated` | Tier 2 | 50 | AML screening on new payments |
| `trust-service.escrow.consumer` | `escrow.events.escrow_released` | Tier 2 | 100 | Recalculates trust score |
| `notification-service.*.consumer` | All `*.events.*` (fan-out) | Tier 3 | 500 | Multi-channel delivery |
| `audit-service.*.consumer` | All `*.events.*` (append-only) | Tier 3 | 1000 | Immutable audit log |
| `search-service.*.consumer` | All `*.events.*` (CDC sync) | Tier 2 | 200 | OpenSearch index projection |

**Assignment strategy:** Cooperative-sticky (`partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor`) to minimize rebalancing disruption.

### 5. Saga Orchestration for Payments

The payment saga is the most critical cross-domain workflow. It orchestrates distributed transactions across Payment, Wallet, and Escrow services using a state machine with compensating transactions:

```
IDLE → INITIATED → PROCESSING → COMPLETED
         │             │
         ▼             ▼
      CANCELLED      FAILED
                        │
                        ▼
                     REFUNDED
```

**Saga steps and compensating actions:**

| Step | Forward Action | Compensating Action | Failure Impact |
|------|----------------|-------------------|----------------|
| 1. Validate & route | Select provider, create PaymentIntent | No-op (nothing to undo) | Low |
| 2. Provider charge | Call provider API | Refund via provider API | Medium |
| 3. Debit wallet | Debit buyer wallet | Credit wallet (refund) | Critical — financial |
| 4. Create escrow | Create escrow holding | Cancel escrow | Critical — financial |
| 5. Send notification | Email/push to buyer & seller | No-op (best-effort) | Low |

**Implementation:** The saga orchestrator runs as a Kafka consumer in the `payment-service` consumer group. Each saga step publishes a domain event on success. If a step fails, the orchestrator publishes compensating events in reverse order.

**Idempotency:** Every saga instance has a `correlationId` (UUID). The orchestrator stores saga state in PostgreSQL (`SagaInstance` table) to enable recovery after crashes. Replay of the same `correlationId` is idempotent.

### 6. Dead Letter Queues (DLQ)

Every consumer group has a corresponding DLQ topic: `<domain>.events.<event-type>.dlq`

**DLQ routing conditions:**
- Message fails processing 3 consecutive times (configurable per consumer group)
- Message exceeds `max.poll.interval.ms` (consumer stuck)
- Deserialization/parsing failure (poison pill)
- Schema validation failure (incompatible event structure)

**DLQ monitoring:**
- DLQ consumer lag is tracked as a critical metric in Grafana.
- DLQ depth > 100 messages triggers PagerDuty alert.
- DLQ messages include original headers plus `x-dlq-reason`, `x-dlq-timestamp`, `x-dlq-original-topic`.
- Manual replay tool: `kafka-console-producer` can republish DLQ messages to the original topic after investigation.

### 7. Schema Evolution with Zod

All event payloads are validated against Zod schemas at both produce and consume time:

**Producer-side validation:**
```typescript
const PaymentInitiatedEvent = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('payment.events.payment_initiated'),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  version: z.literal(1),
  tenantId: z.string(),
  payload: z.object({
    paymentIntentId: z.string(),
    amount: z.number().positive(),
    currency: z.string().length(3),
    provider: z.enum(['stripe', 'paystack', 'flutterwave', 'intasend', 'paya']),
    fromBusinessId: z.string(),
    toBusinessId: z.string(),
    idempotencyKey: z.string(),
  }),
});
```

**Consumer-side validation:**
- Events that fail Zod validation are routed to DLQ with reason `schema_mismatch`.
- Schema version is checked first — unsupported versions are DLQ'd immediately.
- Backward compatibility: new optional fields added with `.optional()`. Removing fields requires a version bump.

**Schema registry (future):** Current approach uses Zod schemas co-located with consumer code. A centralized schema registry (Confluent Schema Registry or Apicurio) is planned for Phase 2 to enable cross-language consumers and automated compatibility checks.

### 8. Event Envelope

Every event follows a standard envelope:

```json
{
  "eventId": "uuid-v4",
  "eventType": "payment.events.payment_completed",
  "correlationId": "uuid-v4",
  "causationId": "uuid-v4",
  "timestamp": "2025-01-29T12:00:00.000Z",
  "version": 1,
  "tenantId": "clx...",
  "actor": {
    "userId": "uuid",
    "role": "admin",
    "ipAddress": "203.0.113.42"
  },
  "payload": { ... }
}
```

**Required fields on every event:** `eventId`, `eventType`, `timestamp`, `version`, `tenantId`.

### 9. Kafka Cluster Configuration

| Parameter | Value | Rationale |
|-----------|-------|----------|
| Brokers | 3 (StatefulSet) | Minimum for replication factor 3 |
| Replication factor | 3 | Tolerate 1 broker failure without data loss |
| Min in-sync replicas | 2 | Ack=all requires 2 brokers to acknowledge |
| `unclean.leader.election.enable` | false | Prefer data loss over inconsistency |
| `log.retention.hours` | 168 (7d) default, per-topic override | Balances storage cost and replayability |
| `message.max.bytes` | 1 MB | Events are small (< 10 KB typical); prevents oversized payloads |
| `compression.type` | lz4 | Fast compression, good ratio for JSON payloads |

## Consequences

### Positive
- Loose coupling between domains enables independent deployment and scaling.
- Immutable event log provides a complete audit trail for regulatory compliance.
- Saga pattern with compensating transactions ensures financial consistency across distributed services.
- Consumer groups enable multiple services to react to the same event independently.
- DLQ handling prevents poison pills from blocking consumer progress.
- Zod schema validation catches malformed events early.

### Negative
- **Operational complexity:** Kafka cluster requires ZooKeeper/KRaft, monitoring, partition management, and consumer lag alerting.
- **Eventual consistency:** Read models (OpenSearch) lag behind PostgreSQL by 1–5 seconds. UI must handle stale data gracefully.
- **Debugging difficulty:** Distributed event flows are harder to trace than synchronous call stacks. Correlation IDs and distributed tracing are essential.
- **No schema registry yet:** Schema evolution relies on code-level Zod schemas. Breaking changes require coordinated deployments.

### Risks
- **Consumer lag spike:** During outages, lag can grow faster than consumers can drain. Mitigation: partition count must support 3x peak throughput.
- **Saga orphan:** If the saga orchestrator crashes mid-saga and cannot recover, the saga is stuck. Mitigation: periodic saga timeout scanner marks stale sagas as FAILED and triggers compensation.
- **Partition skew:** Uneven key distribution (e.g., one tenant generating 80% of traffic) can overload a single partition. Mitigation: composite keys (`tenantId:entityId`) for better distribution.

### Future Work
- Implement centralized schema registry (Confluent or Apicurio).
- Add KRaft mode (ZooKeeper-free) for simpler cluster management.
- Implement saga timeout scanner for orphaned saga recovery.
- Add consumer-side circuit breaker (stop consuming when downstream is down).
- Event replay tooling for debugging and disaster recovery.
