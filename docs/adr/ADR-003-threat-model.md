# ADR-003: Payment Engine Threat Model

**Status:** Accepted
**Date:** 2025-07-25
**Owner:** payment-engine-owner (D3)

---

## Threat Landscape

The payment engine is exposed to the internet via webhook endpoints. It handles money movement, making it the highest-value attack surface in the Youngsend platform.

## Threat Catalog

### T1: Webhook Signature Bypass

**Description:** An attacker sends a crafted webhook request without a valid signature to trigger payment confirmation.

**Affected Components:** Flutterwave, IntaSend webhook routes (BEFORE fix)

**Vulnerability:**
```typescript
// BEFORE (vulnerable)
if (signature && !provider.validateWebhookSignature(body, signature)) {
  return 401
}
// Empty signature -> guard is false -> no check performed

// AFTER (fixed)
if (!provider.validateWebhookSignature(body, signature)) {
  return 401
}
```

**Impact:** CRITICAL - attacker could mark any payment as completed without actual payment.

**Mitigation:**
- Removed conditional guard on all providers
- Providers now reject empty signatures in production mode
- Status: FIXED in this delivery

### T2: Timing Attack on HMAC Comparison

**Description:** An attacker measures response times to gradually determine the correct HMAC signature byte-by-byte.

**Affected Components:** Paystack, Flutterwave, IntaSend provider implementations (BEFORE fix)

**Vulnerability:**
```typescript
// BEFORE (vulnerable)
return hash === signature  // short-circuit on first differing byte

// AFTER (fixed)
if (hash.length !== signature.length) return false
return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
```

**Impact:** HIGH - practical exploitation requires many requests and low-latency network, but is feasible for motivated attackers.

**Mitigation:**
- All providers now use crypto.timingSafeEqual()
- Length pre-check prevents Buffer length mismatch errors in timingSafeEqual
- Status: FIXED in this delivery

### T3: Webhook Replay Attack

**Description:** An attacker captures a legitimate webhook and replays it later to trigger duplicate payment processing.

**Affected Components:** All webhook routes

**Vulnerability:** Webhooks update DB and emit events. Without idempotency, a replayed webhook could:
- Double-credit a payment link (increment paymentCount twice)
- Double-emit real-time events
- Double-fund an escrow

**Mitigation:**
- State machine idempotency: paymentId:targetState key caches transition results
- DB lookup guards: PaymentTransaction update is by primary key (not increment-only)
- Escrow guard: Only funds escrow if status === 'created'
- Payment link: Uses { increment: 1 } which is atomic in PostgreSQL/SQLite
- Residual risk: Payment link payment count could be double-incremented if two identical webhooks arrive simultaneously. Acceptable for now; mitigated by provider-level idempotency.

### T4: Race Condition in State Transitions

**Description:** Two webhooks for the same payment arrive concurrently (e.g., Paystack sends charge.success twice due to retry).

**Affected Components:** webhook-state-sync.ts, all webhook routes

**Vulnerability:** If both webhook handlers read the payment state simultaneously, both could determine a transition is valid and attempt it.

**Mitigation:**
- Node.js single-threaded event loop: synchronous state machine checks happen atomically between await points
- State machine idempotency cache: second transition with same key returns cached result
- DB updates use where: { id } (primary key), not conditional updates
- Future mitigation: Database-level row locking (SELECT ... FOR UPDATE) or optimistic concurrency with version column

### T5: Double-Spend via Webhook + Verify Race

**Description:** A user simultaneously triggers a manual verify (via /api/payments/verify) and receives a webhook. Both paths update the PaymentIntent status.

**Affected Components:** /api/payments/verify/route.ts, all webhook routes

**Mitigation:**
- State machine enforces legal transitions; once in COMPLETED, no further transitions
- Idempotency: Both paths produce the same end state
- Actual risk: LOW

### T6: Test Mode Signature Bypass in Production

**Description:** If a provider has testMode: true but a real secret is configured.

**Mitigation:** Test mode bypass only activates when NO secret is configured. If a secret exists, it is always used.

**Future:** In NODE_ENV=production, always require signature verification even in test mode.

### T7: State Machine Memory Exhaustion

**Description:** The in-memory state machine accumulates entries forever.

**Mitigation:** Payment creation requires auth. Rate limiting on initiation endpoint. Future: TTL-based eviction.

## Risk Matrix

| Threat | Likelihood | Impact | Severity | Status |
|--------|-----------|--------|----------|--------|
| T1: Signature Bypass | HIGH | CRITICAL | CRITICAL | FIXED |
| T2: Timing Attack | MEDIUM | HIGH | HIGH | FIXED |
| T3: Webhook Replay | MEDIUM | HIGH | HIGH | MITIGATED |
| T4: Race Condition | LOW | MEDIUM | MEDIUM | MITIGATED |
| T5: Double-Spend | LOW | HIGH | MEDIUM | MITIGATED |
| T6: Test Mode Bypass | LOW | CRITICAL | MEDIUM | ACCEPTABLE |
| T7: Memory Exhaustion | LOW | MEDIUM | LOW | FUTURE |
