# ADR-001: Auth Performance Benchmarks

## Measurement Targets

### Session Validation

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| JWT decode + verify | < 2ms p50 | ~0.5ms | jose/JWE decryption |
| getApiUser (full) | < 5ms p99 | ~1-2ms | getServerSession + decode |
| requireAuth (auth+CSRF) | < 5ms p99 | ~2ms | Same as getApiUser + cookie read |
| Login (bcrypt verify) | < 200ms p99 | ~50-100ms | bcryptjs cost factor 10 |

### Token Verification Throughput

| Metric | Target | Notes |
|--------|--------|-------|
| JWT verify/sec/instance | >10,000 | Pure CPU, no I/O |
| Concurrent sessions | No limit | Stateless JWT |
| Memory per session | ~2KB | JWT cookie size |

### Rate Limiter

| Metric | Target | Notes |
|--------|--------|-------|
| Rate limit check | < 0.1ms | In-memory Map lookup |
| Memory for 10K keys | < 5MB | Array of timestamps |
| Prune sweep | < 10ms | Every 5 minutes |

## Testing Approach

1. **Unit test**: Verify getApiUser returns null on JWEDecryptionFailed.
2. **Load test**: k6 script hitting /api/escrow/transactions with 100 concurrent users.
3. **CSRF test**: Verify POST without x-csrf-token returns 403.
4. **Rate limit test**: Verify 6th login attempt within 60s returns 429.
