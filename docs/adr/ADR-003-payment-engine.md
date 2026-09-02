# ADR-003: Payment Engine Architecture

**Status:** Accepted
**Date:** 2025-07-25
**Owner:** payment-engine-owner (D3)
**Supersedes:** None

---

## Context

Digital Lending OS processes payments across 5 providers (Stripe, Paystack, Flutterwave, IntaSend, Paya) spanning Africa, Europe, and the Americas. The payment engine must:

- Initialize payments with the optimal provider (cost routing)
- Receive and verify webhooks from each provider
- Maintain a consistent payment state across in-memory state machine and persistent database
- Guarantee idempotency for retried webhooks and client requests
- Emit real-time events for SSE clients

Prior to this ADR, the system had:
- Individual webhook routes with duplicate business logic (escrow funding, payment link updates)
- No state machine integration in webhooks (direct DB updates)
- Inconsistent signature verification (2 of 5 providers lacked timing-safe comparison)
- A signature bypass vulnerability in Flutterwave and IntaSend routes
- A state machine (`state-machine.ts`) that existed but was not wired into the webhook pipeline

## Decision

### 1. State Machine Design

A formal finite state machine governs all payment state transitions:

```
CREATED -> PENDING_PROVIDER -> PROCESSING -> COMPLETED
                                  |-> FAILED -> PENDING_PROVIDER (retry)
PENDING_PROVIDER -> CANCELLED
COMPLETED -> REFUNDING -> REFUNDED
COMPLETED -> DISPUTED -> COMPLETED | REFUNDED
```

**Key properties:**
- **Terminal states:** COMPLETED, REFUNDED, CANCELLED (no further transitions)
- **Idempotency:** Each transition is keyed by `paymentId:targetState`. Replays return the cached result.
- **In-memory + DB sync:** The state machine is the source of truth during a process lifecycle. DB is the durable source of truth. The `webhook-state-sync.ts` module reconciles them.

**Why not a DB-backed state machine?** The current in-memory implementation is sufficient for single-process Next.js deployments. Production scaling to multiple instances would require Redis or PostgreSQL-backed state. This is tracked as a future migration path.

### 2. Webhook Processing Pipeline

Every webhook follows this pipeline:

```
1. Read raw body (request.text())
2. Extract signature header
3. Validate signature (provider-specific, timing-safe)
4. Parse JSON payload
5. processWebhookEvent() -- state machine sync
6. Update PaymentTransaction (settled/failed)
7. Update PaymentIntent (completed/failed + fee/timestamps)
8. Side-effects: escrow funding, payment link tracking
9. Emit real-time event (fire-and-forget)
10. Return 200 OK
```

The `processWebhookEvent()` call at step 5 is **fire-and-forget** (wrapped in `.catch()`). It never blocks or crashes the webhook handler. If the state machine rejects an illegal transition, the webhook still returns 200 but logs a warning.

### 3. Signature Verification

Each provider's `validateWebhookSignature()` method:

| Provider | Algorithm | Header | Timing-Safe | Test Mode Bypass |
|----------|-----------|--------|-------------|------------------|
| Paystack | HMAC-SHA512 | `x-paystack-signature` | Yes (fixed) | Yes (if no secretKey + testMode) |
| Stripe | HMAC-SHA256 (via SDK) | `stripe-signature` | Yes (SDK) | Yes (if no webhookSecret + testMode) |
| Flutterwave | HMAC-SHA256 | `verif-hash` | Yes (fixed) | Yes (if no webhookSecret + testMode) |
| IntaSend | HMAC-SHA256 | `x-intasend-signature` | Yes (fixed) | Yes (if no webhookSecret + testMode) |
| Paya | HMAC-SHA256 | `x-paya-signature` | Yes (was already correct) | Yes (if no webhookSecret + testMode) |

**Critical fixes applied:**
- Paystack, Flutterwave, IntaSend: Changed `hash === signature` to `crypto.timingSafeEqual()`
- Flutterwave, IntaSend: Removed `if (signature && ...)` guard that allowed bypassing verification when header was empty
- All providers now reject empty signatures in production mode

### 4. Idempotency Guarantees

**Client-facing (POST /intents):**
- `Idempotency-Key` header checked via `withPaymentIdempotency` HOF
- Cached responses returned for replayed keys
- 409 Conflict for in-flight duplicate requests

**Webhook-facing:**
- State machine idempotency: `paymentId:targetState` key prevents double-processing
- DB-level: PaymentTransaction lookup by `providerTxId + provider` ensures no duplicate updates
- Idempotent replays return `transitionApplied: false` without side-effects

### 5. Provider Abstraction

All providers implement the `PaymentProvider` interface:

```typescript
interface PaymentProvider {
  code: PaymentProviderCode
  name: string
  isActive: boolean
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>
  validateWebhookSignature(payload: string, signature: string): boolean
  getSupportedMethods(): PaymentMethod[]
  getSupportedCurrencies(): string[]
  getSupportedCountries(): string[]
}
```

The `providerRegistry` provides lazy-instantiated singletons. Providers are configured via environment variables (`PAYSTACK_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.) and read through `getProviderConfig()`.

### 6. DB Status Mapping

The Prisma schema stores `status` as a plain `String` (not an enum) for migration flexibility. The `webhook-state-sync.ts` module maintains a bidirectional mapping:

| State Machine | DB Status |
|---------------|-----------|
| CREATED | created |
| PENDING_PROVIDER | pending |
| PROCESSING | processing |
| COMPLETED | completed |
| FAILED | failed |
| REFUNDING | refunding |
| REFUNDED | refunded |
| CANCELLED | cancelled |
| DISPUTED | disputed |

**Future:** Migrate to a Prisma enum once the state machine states are stable and all data is migrated.

## Consequences

### Positive
- All 5 webhook routes now have verified, timing-safe signature verification
- Signature bypass vulnerability closed (Flutterwave, IntaSend)
- State machine is the single source of truth for payment lifecycle
- Idempotent webhook processing prevents double-crediting
- Clean separation: signature verification -> state sync -> business logic -> events

### Negative
- In-memory state machine loses state on process restart (webhooks rehydrate from DB)
- Test mode bypasses signature verification entirely (acceptable for dev, must be blocked in prod)
- Duplicate DB reads: `processWebhookEvent` and the webhook handler both query PaymentTransaction

### Risks
- **Race condition:** Two webhooks for the same payment arriving concurrently could both pass the state machine check before either writes. Mitigated by: state machine is single-threaded (Node.js event loop) and the idempotency cache catches replays.
- **State desync:** If the DB update fails after the state machine transitions, the in-memory and DB states diverge until the next webhook rehydrates from DB.

### Future Work
- Migrate state machine to Redis/PostgreSQL for multi-instance deployments
- Add `payment.state.changed` event consumption for downstream services
- Prisma enum for PaymentIntent.status
- Remove mock exchange rates from /api/payments/intents/route.ts
