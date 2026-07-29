# Youngsend Kafka Event-Driven Architecture

## Overview

Youngsend's Kafka backbone provides a loosely coupled, eventually consistent event fabric connecting
all microservice domains — payments, wallets, escrow, trust scoring, fraud detection, compliance/KYC,
notifications, and audit logging. Events are the single source of truth for state mutations; every
write to a domain service publishes an immutable event to Kafka that other services consume.

### Architecture Diagram (Logical)

```
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ Payment   │──▶│  Kafka    │──▶│  Wallet   │   │  Fraud    │
│ Service   │   │  Cluster  │   │  Service  │   │  Engine   │
└───────────┘   │           │   └───────────┘   └───────────┘
┌───────────┐   │ ┌───────┐ │   ┌───────────┐   ┌───────────┐
│ Escrow    │──▶│ │ DLQ   │ │──▶│ Trust     │   │Compliance │
│ Service   │   │ │Topics │ │   │ Service   │   │ Service   │
└───────────┘   │ └───────┘ │   └───────────┘   └───────────┘
               │           │   ┌───────────┐   ┌───────────┐
               └───────────┘──▶│ Saga      │   │ Notification│
                               │ Orchestr. │   │ Service    │
                               └───────────┘   └───────────┘
```

---

## Topic Naming Convention

All topics follow the pattern:

```
<domain>.events.<event-type>
```

| Segment    | Description                                      | Example                      |
|------------|--------------------------------------------------|------------------------------|
| `domain`   | Bounded context (lowercase, hyphen-free)         | `payment`, `wallet`, `escrow`|
| `.events`  | Literal infix — signals this is an event topic   | `.events`                    |
| `<type>`   | Snake_case action or status change               | `payment_completed`          |

**Naming rules:**

1. No hyphens or camelCase — only `a-z`, `0-9`, `_`, and `.` separators.
2. Prefix with `dlq.` for dead-letter topics: `dlq.payment.events.payment_failed`.
3. Changelog / compacted topics use `.changelog` suffix: `wallet.changelog`.
4. Aggregate topics for CQRS projections use `.snapshots` suffix: `trust.score.snapshots`.

### Topic Hierarchy

```
payment.events.*          — Payment lifecycle events
wallet.events.*            — Wallet balance & status mutations
escrow.events.*            — Escrow transaction lifecycle
trust.events.*              — Trust scoring & relationship events
fraud.events.*              — Fraud detection & case management
compliance.events.*         — KYC, screening, & regulatory events
notification.events.*       — Delivery acknowledgements (email, push, sms, in-app)
audit.events.*              — Immutable audit trail
dlq.*                       — Dead-letter topics (per source topic)
```

---

## Consumer Group Strategy

### Group Naming

```
<owning-service>.<domain>.consumer
```

Examples: `payment-service.wallet.consumer`, `notification-service.payment.consumer`.

### Assignment Rules

| Rule                         | Implementation                                            |
|------------------------------|-----------------------------------------------------------|
| One consumer group per service-domain pair | Prevents cross-domain coupling         |
| Sticky partition assignment  | `partition.assignment.strategy=cooperative-sticky`       |
| `max.poll.records`           | 100 (tuned per domain — lower for payment, higher for audit) |
| `session.timeout.ms`         | 30 000                                                    |
| `heartbeat.interval.ms`      | 3 000                                                     |
| Auto-offset reset            | `earliest` for new groups; committed offsets preserved for existing |

### Consumer Group Matrix

| Consumer Group                         | Subscribed Topics                                          |
|----------------------------------------|-------------------------------------------------------------|
| `wallet-service.payment.consumer`     | `payment.events.payment_completed`, `payment.events.payment_refunded` |
| `escrow-service.payment.consumer`     | `payment.events.payment_completed`                          |
| `notification-service.*.consumer`      | All `*.events.*` topics (fan-out)                           |
| `trust-service.escrow.consumer`        | `escrow.events.escrow_released`                             |
| `fraud-engine.payment.consumer`        | `payment.events.payment_initiated`, `payment.events.payment_processing` |
| `compliance-service.payment.consumer` | `payment.events.payment_initiated`                         |
| `audit-service.*.consumer`            | All `*.events.*` topics (append-only log)                  |

---

## Ordering Guarantees

### Per-Key Ordering

All topics use the **entity ID** as the message key (e.g., `paymentId` for payment topics, `userId` for wallet topics). Kafka guarantees that messages with the same key land on the same partition, and consumers process them in order within that partition.

**Key strategy by domain:**

| Domain     | Message Key        | Ordering Scope                                    |
|------------|--------------------|---------------------------------------------------|
| Payment    | `paymentId`        | All events for a single payment are ordered       |
| Wallet     | `walletId`         | Balance mutations per wallet are strictly ordered |
| Escrow     | `escrowId`         | State transitions per escrow are ordered          |
| Trust      | `userId`           | Trust score updates per user are ordered           |
| Fraud      | `caseId` / `alertId` | Fraud case events are ordered per case          |
| Compliance | `userId` / `caseId` | KYC events per user are ordered                  |
| Audit      | `userId`           | User audit trail is ordered                        |

### Cross-Domain Ordering

Cross-domain ordering is achieved through **correlation IDs** and **causation IDs**:
- `correlationId` links all events belonging to the same business transaction (e.g., a payment flow).
- `causationId` links a child event to the parent event that triggered it (event chaining).

No global ordering is attempted — consumers must be idempotent and handle out-of-order arrival where needed.

---

## Exactly-Once Semantics (EOS)

### Approach

Youngsend uses **Kafka's idempotent producer + transactional API** for domains requiring strict exactly-once:

1. **Idempotent Producer** (`enable.idempotence=true`): Prevents duplicate messages on producer retries.
2. **Transactional Consumers-Producers**: For saga orchestrators that consume from one topic and produce to another atomically.
3. **Consumer Offset Tracking via Transactions**: The consumer commits offsets in the same Kafka transaction as its output messages.

### EOS Tiers

| Tier   | Domains                          | Strategy                                    |
|--------|----------------------------------|----------------------------------------------|
| **Tier 1 — EOS** | Payment, Wallet, Escrow    | Idempotent producer + consume-process-produce transactions |
| **Tier 2 — At-Least-Once + Idempotent Consumer** | Trust, Fraud, Compliance | Idempotent producer, dedup by `eventId` on consumer side |
| **Tier 3 — Fire-and-Forget** | Notification, Audit | Best-effort delivery, idempotent consumer dedup |

### Implementation

- Producer: `transactional.id=<service-name>-<partition-assignment-epoch>`
- Consumer: `isolation.level=read_committed` for Tier 1 consumers
- Fallback: Tier 1 consumers degrade to at-least-once if transaction coordinator is unavailable

---

## Dead Letter Queue (DLQ) Handling

### Strategy

Every domain topic has a corresponding DLQ topic (`dlq.<original-topic>`). Messages that fail processing after the retry exhausted are forwarded to the DLQ.

### Retry Configuration

| Attempt | Delay         | Backoff Multiplier | Max Attempts |
|---------|---------------|---------------------|--------------|
| 1       | 1 second      | 2x                  | 5            |
| 2       | 2 seconds     |                     |              |
| 3       | 4 seconds     |                     |              |
| 4       | 8 seconds     |                     |              |
| 5       | 16 seconds    |                     |              |

After 5 failed attempts, the message is forwarded to the DLQ with:
- Original topic, partition, and offset
- Error class and message
- Timestamp of each failure attempt
- Original message payload (unchanged)

### DLQ Topics

```
dlq.payment.events.payment_failed
dlq.payment.events.payment_completed
dlq.wallet.events.wallet_deposited
dlq.escrow.events.escrow_created
dlq.trust.events.trust_score_updated
dlq.fraud.events.fraud_alert_triggered
dlq.compliance.events.compliance_kyc_submitted
dlq.notification.events.notification_email_sent
dlq.audit.events.audit_action_logged
```

### DLQ Processing

DLQ consumers run with:
- `earliest` offset reset
- Manual commit only after successful reprocessing or archival
- Alerting via `notification.events` when DLQ depth exceeds threshold
- Periodic replay job for transient failures

---

## Schema Evolution Strategy

### Schema Registry

All events are registered in a Confluent Schema Registry (or Redpanda-compatible equivalent) with the subject naming convention:

```
<topic-name>-value
```

### Evolution Rules (Backward Compatibility)

Using **AVRO** or **Protobuf** with `BACKWARD` compatibility mode:

| Change Type            | Allowed | Notes                                       |
|------------------------|---------|---------------------------------------------|
| Add optional field     | ✅      | Old consumers ignore new fields             |
| Add field with default | ✅      | Old consumers use default value             |
| Remove field           | ❌      | Breaks old consumers                        |
| Rename field           | ❌      | Treated as remove + add                    |
| Change field type      | ❌      | Promotions only (int → long)               |

### Version Strategy

- Every event carries a `version` field (semantic version: `1.0.0`, `1.1.0`).
- Breaking changes (major version bump) require a new topic (`payment.events.payment_completed_v2`) and dual-write period.
- Non-breaking changes (minor/patch) are transparent via schema registry.

### Zod Validation

In addition to the schema registry, each service validates incoming events against **Zod schemas** (defined in `event-schemas.ts`). This provides:
- Runtime type safety in TypeScript services
- Early rejection of malformed events before processing
- Documentation-as-code for event contracts

---

## Monitoring & Observability

### Key Metrics

- `kafka.consumer.lag` — per consumer group, per partition
- `kafka.producer.record.errors` — production failures
- `kafka.dlq.depth` — DLQ topic size (alert at > 100)
- `kafka.consumer.processing.time` — p50/p95/p99
- `kafka.saga.step.duration` — saga step latency

### Structured Logging

Every event processing emits a structured log with `eventId`, `correlationId`, `causationId`, `timestamp`, and processing result (success/failure/skipped).

---

## Files in this Directory

| File                  | Purpose                                                   |
|-----------------------|-----------------------------------------------------------|
| `topics.ts`           | Topic definitions, partition counts, retention policies  |
| `event-schemas.ts`    | Zod schemas for all event types                            |
| `consumer-groups.ts`  | Consumer group configurations with retry & DLQ mapping     |
| `producer.ts`         | Production-ready KafkaJS producer wrapper                  |
| `consumer.ts`         | Consumer framework with DLQ forwarding & metrics           |
| `saga-orchestrator.ts`| Payment saga with state machine & compensating transactions|
