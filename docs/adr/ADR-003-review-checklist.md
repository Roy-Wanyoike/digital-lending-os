# ADR-003: Payment Engine Review Checklist

**Task:** D3 — Payment Engine
**Date:** 2025-07-25
**Reviewer:** _______________

---

## 1. Signature Verification

- [ ] All 5 webhook routes read raw body via `request.text()` (not `request.json()`)
- [ ] All providers use `crypto.timingSafeEqual()` for HMAC comparison
- [ ] No provider uses `===` for signature comparison
- [ ] No provider has conditional signature checking (`if (signature && ...)`)
- [ ] Paystack uses HMAC-SHA512 with `x-paystack-signature` header
- [ ] Stripe uses SDK `constructEvent()` with `stripe-signature` header
- [ ] Flutterwave uses HMAC-SHA256 with `verif-hash` header
- [ ] IntaSend uses HMAC-SHA256 with `x-intasend-signature` header
- [ ] Paya uses HMAC-SHA256 with `x-paya-signature` header
- [ ] Test mode bypass only when NO secret is configured

## 2. State Machine Integration

- [ ] `webhook-state-sync.ts` exists and exports `processWebhookEvent`
- [ ] Paystack webhook calls `processWebhookEvent()` before business logic
- [ ] Stripe webhook calls `processWebhookEvent()` before business logic
- [ ] State machine transition is fire-and-forget (`.catch()` handler)
- [ ] State machine transition never crashes the webhook handler
- [ ] Terminal states (COMPLETED, CANCELLED, REFUNDED) are respected

## 3. Idempotency

- [ ] State machine uses `paymentId:targetState` as idempotency key
- [ ] Replayed webhooks return `transitionApplied: false`
- [ ] DB updates are by primary key (not conditional)
- [ ] Escrow funding only when `status === 'created'`

## 4. Database Consistency

- [ ] `webhook-state-sync.ts` maps state machine states to DB statuses correctly
- [ ] PaymentIntent.status is updated to match state machine final state
- [ ] PaymentTransaction.status is set independently (settled/failed)
- [ ] `completedAt` is set when transitioning to COMPLETED

## 5. Event Bus

- [ ] `payment.state.changed` event is emitted after successful transition
- [ ] Event emission is fire-and-forget (try/catch, never crashes webhook)
- [ ] `payment.completed` and `payment.failed` events still emitted by webhook handlers

## 6. Security

- [ ] No webhook route returns detailed error messages (always 401 or 500)
- [ ] Webhook errors are logged server-side only
- [ ] No sensitive data in log output (amounts, customer data)
- [ ] All providers initialized lazily (no cold-start secret leaks)

## 7. Code Quality

- [ ] No `any` types in new code (except metadata objects)
- [ ] All async functions have proper error handling
- [ ] Comments explain non-obvious logic (e.g., why test mode bypasses)
- [ ] No duplicate business logic between webhook routes and state sync

## 8. Documentation

- [ ] ADR-003-payment-engine.md covers state machine, webhooks, idempotency, provider abstraction
- [ ] ADR-003-threat-model.md covers all identified threats with severity ratings
- [ ] This checklist is complete
- [ ] Worklog updated with Task D3

---

## Sign-Off

| Area | Approved | Notes |
|------|----------|-------|
| Signature Verification | [ ] | |
| State Machine | [ ] | |
| Idempotency | [ ] | |
| Security | [ ] | |
| Documentation | [ ] | |
