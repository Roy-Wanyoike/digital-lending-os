# ADR-008: Fraud Detection & Compliance Performance Benchmarks

## Measurement Targets

### Fraud Detection

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Real-time fraud evaluation (single rule) | < 5ms p99 | ~2ms | Redis cache hit + JSON condition eval |
| Real-time fraud evaluation (all active rules) | < 50ms p99 | ~20ms | N rules from cache, each evaluated in memory |
| Fraud rule cache load (Redis) | < 5ms p99 | ~2ms | GET on `ys:fr:{tenantId}:{type}` |
| Fraud rule cache miss → DB | < 30ms p99 | ~15ms | DB query + cache write (5min TTL) |
| FraudAlert creation | < 50ms p99 | ~20ms | DB insert + alertRef generation |
| FraudAlert query (list, 50 per page) | < 100ms p99 | ~40-60ms | Indexed on businessId + createdAt |
| FraudAlert status transition | < 50ms p99 | ~20ms | Status guard check + DB update |
| FraudCase creation | < 100ms p99 | ~40ms | DB insert + linked alerts |
| Fraud score computation | < 10ms p99 | ~5ms | Weighted aggregation of matched rule scores |

### AML / Sanctions Screening

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Compliance screening request (mock) | < 50ms p99 | ~10ms | Mock data, no external call |
| Compliance screening request (real provider) | < 3,000ms p99 | ~1,000-2,000ms | External API call (ComplyAdvantage, etc.) |
| Compliance screening list query | < 100ms p99 | ~40-60ms | Indexed on businessId |
| ComplianceRule cache load | < 5ms p99 | ~2ms | GET on `ys:cr:{tenantId}:{type}` |
| Batch screening (10 entities) | < 10,000ms p99 | ~5,000ms | External API rate limits; 500ms per entity |

### KYC Verification

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| POST /api/passport/verifications | < 200ms p99 | ~80-120ms | DB insert + Commerce Passport status update |
| Verification status query | < 50ms p99 | ~20ms | Indexed on businessId |
| Verification list (all types for business) | < 100ms p99 | ~40-60ms | Indexed query |
| Document upload (presigned URL) | < 100ms p99 | ~50ms | GCS presigned URL generation |
| Commerce Passport update on verification | < 50ms p99 | ~20ms | Single row update |

### Case Throughput

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| FraudAlert → FraudCase promotion | < 200ms p99 | ~80-100ms | Case creation + alert linkage |
| Case resolution (with audit log) | < 150ms p99 | ~60-80ms | Status update + audit log + alert updates |
| Daily fraud alerts (expected volume) | ~10,000 | ~5,000-15,000 | Based on 100M user base, ~0.01% trigger rate |
| Daily compliance screenings | ~50,000 | ~30,000-70,000 | Every new business/payment triggers screening |

### Compliance Rule Evaluation

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Single rule evaluation (JSON condition) | < 1ms p99 | ~0.5ms | JSON path evaluation |
| GIN index lookup on FraudRule.condition | < 5ms p99 | ~2ms | JSONB containment query |
| All active rules fetch (DB) | < 30ms p99 | ~15ms | WHERE active=true + GIN scan |

## Testing Approach

1. **Unit test:** Verify fraud rule JSON condition evaluation matches expected result.
2. **Unit test:** Verify fraud alert status transition guards reject illegal transitions.
3. **Integration test:** POST a payment intent → verify fraud evaluation runs and creates alert if rules match.
4. **Load test:** 1,000 concurrent fraud evaluations with 50 active rules each.
5. **Screening test:** 100 concurrent compliance screening requests to mock provider.
6. **Cache test:** Verify fraud rules are cached for 5 minutes, invalidated on rule update.
7. **Alert spike test:** Inject 100 fraud alerts in 1 minute → verify PagerDuty escalation triggers.
8. **Tenant isolation test:** Verify tenant A cannot query tenant B's fraud alerts or compliance screenings.
