# ADR-012: Threat Model - Performance & Developer Experience

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Spoofed `x-request-id` header | Low | Low | Server generates UUID if no header present; header is informational, not used for auth | Very Low |
| Forwarded `x-request-id` from attacker | Low | Low | `x-request-id` is not used for authorization; it's a tracing identifier only | Very Low |
| Spoofed `x-response-time` header | Inherent | None | Response-time header is set by server; client cannot set it | None |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Modify `x-response-time` to mask slow endpoint | Low | Low | Response time is measured server-side via `performance.now()`; header reflects actual measurement | Very Low |
| Modify telemetry log output | Low | Low | Logs are written to stderr/OTLP; not accessible to client | Very Low |
| Tamper with structured log format | Low | Low | Log format is defined in code; not configurable at runtime | Very Low |
| Modify `x-request-id` mid-request | Low | Low | Server sets the value once at request start; not re-read | Very Low |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Deny making a request (no log evidence) | Low | Medium | Every telemetry-wrapped request produces a structured JSON log with timestamp, route, method, status, duration, request_id | Very Low |
| Delete telemetry logs to cover tracks | Low | Low | Logs shipped to external OTLP collector; not stored locally in container | Very Low |
| No log for untelemetered routes | Medium | Medium | Currently only 5 GET routes have `withApiTelemetry`; POST/PUT/DELETE routes are untelemetered (future work) | Medium |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| `x-request-id` enables request correlation for attacker | Low | Low | Request IDs are random UUIDs; an attacker cannot predict or control them | Very Low |
| `x-response-time` reveals endpoint performance | Medium | Low | Reveals that `/api/wallets` takes ~30ms — not sensitive; helps legitimate users debug | Accepted |
| Structured log exposes internal route names | Low | Low | Route names are not secret; they correspond to public API paths | Accepted |
| Error stack trace in telemetry log | Medium | Medium | Stack trace is logged on error path; only accessible to ops team via log aggregation | Low |
| Telemetry data leakage via OTLP | Low | Medium | OTLP collector uses mTLS; logs shipped over encrypted channel; access restricted to ops team | Low |
| Performance.now() timing data | Low | Low | Timing data is per-request; no cross-request aggregation exposed to client | Very Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| `withApiTelemetry` overhead on every request | Low | Low | Overhead is ~0.1ms (UUID generation + performance.now()); negligible at scale | Very Low |
| Telemetry log I/O blocks event loop | Low | Medium | Single `console.log` per request; async OTLP export in production; no blocking I/O | Very Low |
| Response cloning overhead for large payloads | Low | Medium | `withApiTelemetry` clones `NextResponse` to set headers; streaming body clone is lazy | Low |
| `crypto.randomUUID()` unavailability | Very Low | Medium | Available in Node 19+ and all modern runtimes; CI runs Node 20 | Very Low |
| Cache poisoning via telemetry (no direct risk) | N/A | N/A | Telemetry is read-only; does not modify cache | N/A |
| DoS via cache misses (related to caching, not telemetry) | Medium | High | Stampede protection via distributed lock (SET NX EX); SWR serves stale data during repopulation | Low |
| Cache key collision | Very Low | Low | Cache keys include tenant ID, role, and resource type; UUIDs prevent collision | Very Low |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------||
| Use `x-request-id` to access another user's request | Very Low | Very Low | Request IDs are per-request; no session or state associated with them | Very Low |
| Timing side-channel via `x-response-time` | Low | Low | Response times are similar for authorized and unauthorized requests (auth check is < 5ms) | Very Low |
| Telemetry wrapper bypasses auth | Very Low | Critical | `withApiTelemetry` wraps the handler but does NOT replace `requireAuth()`; auth is applied first | Very Low |

---

## Attack Trees

### Attack Tree 1: Cache Poisoning

```
Cache Poisoning
+-- 1.1 Poison Cloudflare CDN cache (L1)
|   +-- Mitigated: Cache keys include auth identity; attacker cannot write to another tenant's cache
|   +-- Mitigated: Only origin responses are cached; attacker cannot inject arbitrary content
|   +-- Mitigated: Surrogate-Key headers controlled by origin only
+-- 1.2 Poison Redis cache (L2)
|   +-- Mitigated: Cache writes only from application code (server-side)
|   +-- Mitigated: Redis AUTH required; password in K8s Secret
|   +-- Risk: Cache key collision (different tenants share cache key pattern)
|       +-- Mitigated: Cache keys include tenantId: `ys:dash:{tenantId}:{role}`
+-- 1.3 Cache stampede (indirect DoS)
    +-- Mitigated: Distributed lock via SET NX EX on `ys:lock:{key}`
    +-- Mitigated: SWR grace period serves stale data during repopulation
    +-- Mitigated: Lock auto-expires after 5s (failsafe)
```

### Attack Tree 2: DoS via Cache Misses

```
DoS via Cache Misses
+-- 2.1 Request unique URLs to bypass CDN cache
|   +-- Mitigated: Cache key is Path + Query + Auth; query params are validated (Zod)
|   +-- Mitigated: Edge rate limiting (Cloudflare KV) blocks high request rates
+-- 2.2 Invalidate cache repeatedly via mutations
|   +-- Mitigated: Rate limiting on mutation endpoints (POST/PUT/DELETE)
|   +-- Mitigated: CSRF protection prevents cross-site mutation spam
+-- 2.3 Force cache miss on every request
|   +-- Mitigated: Cache-Control headers are set by origin, not client
|   +-- Mitigated: Client cannot bypass cache; if resource is cacheable, CDN serves it
+-- 2.4 Exhaust Redis connections via cache operations
    +-- Mitigated: Redis Sentinel cluster with connection pooling
    +-- Mitigated: Pipeline multiple commands to reduce round trips
```

### Attack Tree 3: Telemetry Data Leakage

```
Telemetry Data Leakage
+-- 3.1 Structured log contains sensitive user data
|   +-- Mitigated: Log contains route, method, status, duration, request_id
|   +-- Mitigated: No user data (names, emails, amounts) in telemetry log
|   +-- Mitigated: Error path logs stack trace but not request body
+-- 3.2 OTLP collector intercepts telemetry
|   +-- Mitigated: mTLS between application and OTLP collector
|   +-- Mitigated: Collector in private subnet; no public access
+-- 3.3 Log aggregation system breach
    +-- Mitigated: Grafana/Prometheus in private subnet; SSO + RBAC for access
    +-- Mitigated: Telemetry data is operational, not PII
```

### Attack Tree 4: SPECTRE / Timing Side-Channels

```
Timing Side-Channels
+-- 4.1 Measure response time to infer data
|   +-- Risk: `x-response-time` header reveals endpoint latency
|   +-- Mitigated: Latency differences are too small (< 5ms) for reliable inference over the internet
|   +-- Mitigated: All authenticated responses go through same auth path (~2ms)
+-- 4.2 Measure cache hit vs miss timing
|   +-- Risk: Cache hit (~0.5ms) vs miss (~20ms) reveals whether data exists
|   +-- Mitigated: Network jitter (10-100ms) overwhelms the 20ms difference
|   +-- Mitigated: `x-response-time` is total request time, not cache-only time
+-- 4.3 SPECTRE-style CPU side-channel
    +-- Mitigated: Shared CPU tenants (GKE) is inherent risk
    +-- Mitigated: Financial data processed in memory for < 50ms; SPECTRE requires sustained access
    +-- Accepted: SPECTRE is a hardware-level risk mitigated by cloud provider (Google's mitigations)
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------||
| Cache poisoning | LOW | tenantId in cache keys + origin-controlled writes |
| DoS via cache misses | LOW | Stampede protection + rate limiting |
| Telemetry data leakage | VERY LOW | No PII in telemetry logs; mTLS for OTLP |
| Timing side-channels | VERY LOW | Network jitter overwhelms timing differences |
| SPECTRE | LOW (Accepted) | Hardware-level; Google cloud mitigations |
| Uninstrumented routes | MEDIUM | Only 5 GET routes wrapped; POST/PUT/DELETE not yet covered |
| Response clone overhead | LOW | Negligible for JSON; monitor for streaming payloads |

**Top priority:** Extend `withApiTelemetry` to POST/PUT/DELETE handlers and propagate `x-request-id` to upstream Kafka producer and downstream service calls for full distributed tracing.