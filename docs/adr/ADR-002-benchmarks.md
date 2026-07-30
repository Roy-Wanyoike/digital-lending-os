# ADR-002: API Hardening Performance Benchmarks

## Measurement Targets

### Error Response Overhead

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| `withErrorHandler` wrap (no error) | < 0.1ms p99 | ~0.05ms | Function composition, no allocation |
| Zod parse + validate (typical schema) | < 1ms p99 | ~0.3ms | 10-field schema |
| Zod parse + validate (complex schema) | < 3ms p99 | ~1ms | 30-field nested schema |
| Error envelope serialization | < 0.2ms p99 | ~0.1ms | JSON.stringify on { error: { message, code } } |
| 422 validation error response | < 5ms p99 | ~1-2ms | Zod parse + field-level error extraction |
| 500 error + structured log | < 10ms p99 | ~5ms | Includes stack trace capture + logger.write |

### Auth Overhead (with Hardening)

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| `requireAuth()` on GET route | < 5ms p99 | ~2ms | JWT decode + CSRF check |
| `requireAuth()` on POST route | < 5ms p99 | ~2ms | Same + CSRF token validation |
| `requireRole(req, ['admin'])` | < 5ms p99 | ~2.5ms | Auth + role check from JWT |
| `getApiUser(req)` on read route | < 3ms p99 | ~1ms | JWT decode only |

### Rate Limiter Throughput

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| Rate limit check (single key) | < 0.1ms | ~0.05ms | In-memory Map lookup |
| Rate limit check (10K concurrent keys) | < 0.5ms | ~0.2ms | Map access is O(1) |
| Memory for 10K rate limit keys | < 10MB | ~5MB | Array of timestamps per key |
| Auto-prune sweep (10K keys) | < 20ms | ~10ms | Runs every 5 minutes |

### CORS Preflight Cost

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| OPTIONS preflight response | < 5ms p99 | ~2ms | Next.js built-in CORS handler |
| CORS header injection (simple request) | < 0.1ms | ~0.05ms | Headers set in middleware |

### Structured Logger

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| `getLogger().info(...)` | < 0.5ms | ~0.2ms | Console output (dev) or OTLP export (prod) |
| `getLogger().withContext({...}).error(...)` | < 1ms | ~0.5ms | Context merge + structured output |
| OTLP export batch (100 messages) | < 50ms | ~20ms | HTTP POST to collector |

## Testing Approach

1. **Unit test:** Verify `withErrorHandler` wraps a handler that throws ZodError → returns 422 with field details.
2. **Unit test:** Verify `withErrorHandler` wraps a handler that throws AuthError → returns 401/403.
3. **Unit test:** Verify unknown error → returns 500 with generic message (no stack trace leaked).
4. **Load test:** k6 script with 500 concurrent POST requests hitting a Zod-validated endpoint.
5. **Latency test:** Measure p50/p95/p99 of `requireAuth()` across 10,000 requests.
6. **Rate limit test:** Verify 6th request within window returns 429.
7. **Logger test:** Verify structured output is valid JSON with required fields.