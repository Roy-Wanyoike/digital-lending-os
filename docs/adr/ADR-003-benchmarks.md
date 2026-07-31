# ADR-003: Payment Engine Performance Benchmarks

## Measurement Targets

### Payment Intent Creation

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/payments/intents (no idempotency cache hit) | < 200ms p99 | ~80-120ms | DB write + provider init + Kafka produce |
| POST /api/payments/intents (idempotency cache hit) | < 10ms p99 | ~5ms | Redis lookup + return cached response |
| Provider routing decision | < 5ms p99 | ~2ms | Cost comparison across 5 providers |
| PaymentIntent DB insert | < 20ms p99 | ~10ms | Single row insert with indexes |
| Kafka produce (payment_initiated) | < 10ms p99 | ~5ms | EOS Tier 1, acks=all |

### State Machine Throughput

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| State transition (in-memory) | < 0.1ms p99 | ~0.05ms | Map lookup + guard check |
| Webhook processing (full pipeline) | < 100ms p99 | ~50-80ms | Signature verify → state sync → DB update → event emit |
| Signature verification (HMAC-SHA256) | < 1ms p99 | ~0.3ms | crypto.timingSafeEqual |
| Signature verification (HMAC-SHA512, Paystack) | < 1ms p99 | ~0.4ms | Slightly larger hash |
| DB update (PaymentTransaction + PaymentIntent) | < 30ms p99 | ~15ms | Transaction with 2-3 writes |
| SSE event emit (fire-and-forget) | < 2ms p99 | ~1ms | In-memory event bus |

### Idempotency Check

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Idempotency key lookup (Redis) | < 1ms p99 | ~0.5ms | GET on `ys:idem:{key}` |
| Idempotency key set (Redis) | < 2ms p99 | ~1ms | SET EX 3600 on `ys:idem:{key}` |
| In-flight dedup check | < 0.5ms p99 | ~0.2ms | In-memory Map for active requests |
| Webhook idempotency (providerTxId lookup) | < 10ms p99 | ~5ms | DB query with unique index |
| State machine idempotency replay | < 0.1ms p99 | ~0.05ms | Map.get on `paymentId:targetState` |

### Encryption / Decryption

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| JWE token decryption | < 2ms p99 | ~0.5ms | jose JWE decrypt |
| Provider secret decrypt (env var) | < 0.1ms | ~0.05ms | Process.env read |
| Webhook signature HMAC | < 1ms p99 | ~0.3ms | crypto.createHmac |

### Provider-Specific Latency

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Stripe initialize | < 500ms p99 | ~200-300ms | SDK call to Stripe API |
| Paystack initialize | < 500ms p99 | ~150-250ms | SDK call to Paystack API |
| Flutterwave initialize | < 500ms p99 | ~200-300ms | REST API call |
| IntaSend initialize | < 500ms p99 | ~200-400ms | REST API call |
| Paya initialize | < 500ms p99 | ~300-500ms | REST API call |
| Webhook callback processing (any provider) | < 200ms p99 | ~50-80ms | Local processing, no provider call |

## Testing Approach

1. **Unit test:** Verify state machine rejects illegal transitions (e.g., CREATED → COMPLETED).
2. **Unit test:** Verify idempotency key returns cached response on second POST.
3. **Unit test:** Verify webhook signature validation rejects tampered payloads.
4. **Integration test:** Simulate Paystack webhook with valid signature → payment transitions to COMPLETED.
5. **Load test:** k6 with 200 concurrent payment intent creations, measure p50/p95/p99 latency.
6. **Idempotency test:** Send 10 identical POST requests with same Idempotency-Key → only 1 payment created.
7. **State machine stress test:** 1,000 webhook events for the same payment → only first succeeds, rest return idempotent result.
8. **Race condition test:** Two concurrent webhooks for the same payment → verify no double-crediting.
