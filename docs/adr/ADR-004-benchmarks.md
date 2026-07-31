# ADR-004: Escrow & Trust Scoring Performance Benchmarks

## Measurement Targets

### Escrow Creation

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/escrow/transactions | < 200ms p99 | ~80-120ms | DB insert + milestone validation + audit log |
| Escrow DB insert with N milestones | < 30ms p99 | ~15ms | Single transaction, N milestone rows |
| Milestone sum validation | < 1ms p99 | ~0.2ms | JS reduce loop |
| Audit log write | < 10ms p99 | ~5ms | EscrowAuditLog insert |
| SSE event emit | < 2ms p99 | ~1ms | In-memory event bus, tenant-scoped |
| Kafka produce (escrow_created) | < 10ms p99 | ~5ms | EOS Tier 1 |

### Escrow State Transitions

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| PATCH /api/escrow/transactions/[id] (fund) | < 150ms p99 | ~50-80ms | Status update + audit log + event |
| PATCH /api/escrow/transactions/[id] (release milestone) | < 150ms p99 | ~50-80ms | Milestone update + disbursement + audit log |
| PATCH /api/escrow/transactions/[id] (dispute) | < 150ms p99 | ~50-80ms | Status update + dispute record + audit log |
| PATCH /api/escrow/transactions/[id] (resolve) | < 150ms p99 | ~60-100ms | Status update + text analysis + audit log |
| Escrow query with buyer/seller join | < 30ms p99 | ~15ms | Two OR clauses on Business.tenantId |

### Trust Score Computation

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/trust/scores (full computation) | < 500ms p99 | ~200-300ms | 5 sub-score queries + aggregation |
| Review average query (per sub-score) | < 50ms p99 | ~20ms | Aggregation with WHERE on businessId |
| Compliance sub-score query | < 30ms p99 | ~15ms | Verification count query |
| Reputation event impact query | < 20ms p99 | ~10ms | SUM of scoreImpact for business |
| Trust score cache write (Redis) | < 2ms p99 | ~1ms | SET EX 600 |
| Trust score cache read (Redis) | < 1ms p99 | ~0.5ms | GET on `ys:trust:{businessId}` |

### Review Processing

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/trust/reviews | < 150ms p99 | ~50-80ms | DB insert + trust score invalidation |
| Review DB insert | < 20ms p99 | ~10ms | Single row with 4 rating fields |
| Trust score cache invalidation | < 5ms p99 | ~2ms | DEL on `ys:trust:{businessId}` |
| GET /api/trust/reviews (paginated, 20 per page) | < 100ms p99 | ~30-50ms | Indexed query with LIMIT/OFFSET |

### Dispute Resolution

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/escrow/transactions/[id]/disputes | < 150ms p99 | ~50-80ms | Dispute record + audit log |
| PATCH /api/escrow/transactions/[id]/disputes/[id]/resolve | < 200ms p99 | ~80-120ms | Status update + text analysis + escrow update |
| Keyword-based resolution analysis | < 1ms p99 | ~0.2ms | `resolution.includes('refund')` |

## Testing Approach

1. **Unit test:** Verify escrow status transition guards reject illegal transitions.
2. **Unit test:** Verify milestone amounts must sum to escrow amount.
3. **Unit test:** Verify trust score clamped to [0, 100].
4. **Integration test:** Create escrow → fund → release milestone → verify escrow auto-completes.
5. **Integration test:** Create escrow → fund → dispute → resolve (refund) → verify escrow moves to `refunded`.
6. **Load test:** 100 concurrent escrow creations with 3 milestones each.
7. **Trust score test:** Create 100 reviews for a business, compute trust score, verify result matches manual calculation.
8. **Tenant isolation test:** Verify business A cannot query business B's escrows.