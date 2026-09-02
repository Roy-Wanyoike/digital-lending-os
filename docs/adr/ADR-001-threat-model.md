# ADR-001: Threat Model - Auth Domain

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
<!-- RESOLVED: IP-based rate limiting implemented in middleware.ts (100 req/min per IP, 10/min financial) + Cloudflare worker + K8s ingress -->
| Credential stuffing on /api/auth | High | Critical | Per-email rate limit (5/min). IP-based rate limit in middleware + infra | Medium |
| Session token theft via XSS | Medium | Critical | HttpOnly, Secure, SameSite=Lax cookies (NextAuth default) | Low |
| Email enumeration via login | Medium | Low | Generic invalid credentials message | Low |
| Account takeover via stale JWT | Low | High | 24h maxAge + graceful decryption error to 401 | Low |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| JWT payload manipulation | Low | Critical | JWS signature verification (NextAuth built-in) | Very Low |
| CSRF on mutating endpoints | Medium | High | Double-submit cookie via requireAuth() | Low |
| Role escalation via forged session | Low | Critical | Role embedded in signed JWT, not client-controlled | Very Low |
| Cross-tenant data access | Low | Critical | tenantId in JWT + query-level filtering | Low |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Deny fraudulent action | Medium | Medium | logAudit() on login success/failure, rate limits | Low |
| No evidence of who released funds | Medium | High | Audit log on escrow actions (actor, timestamp, details) | Low |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Token leaked in server logs | Low | High | getApiUser catch block logs generic message, not token | Low |
| Tenant data visible across tenants | Low | Critical | tenantId filtering on every query | Low |
| JWT content readable by client | Inherent | Low | JWT is base64-encoded but signed - expected behavior | Accepted |
| Session fixation | Low | High | NextAuth generates unique session tokens | Very Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Brute force login DoS | Medium | Medium | Per-email rate limit + generic error | Low |
| Expensive bcrypt hashing | Low | Medium | bcryptjs built-in cost factor (10 rounds) | Low |
| Rate limiter memory exhaustion | Low | Low | Auto-prune every 5 minutes, sliding window | Very Low |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| User escalates to admin | Very Low | Critical | Role in signed JWT, server-validated on every request | Very Low |
| Access to other tenant data | Low | Critical | tenantId in JWT + all queries scoped by tenantId | Low |
| SQL injection to bypass tenant filter | Low | Critical | Prisma parameterized queries (no raw SQL in auth) | Very Low |

---

## Attack Trees

### Attack Tree 1: Session Hijacking

```
Session Hijacking
+-- 1.1 Steal JWT via XSS
|   +-- Inject script via user input
|   |   +-- Mitigated: Input sanitization, CSP headers
|   +-- Inject via third-party dependency
|   |   +-- Mitigated: npm audit, lockfile integrity
|   +-- Read cookie via client-side JS
|       +-- Mitigated: HttpOnly flag
+-- 1.2 Intercept network traffic
|   +-- Mitigated: HTTPS + Secure cookie flag
+-- 1.3 CSRF to perform actions
|   +-- Mitigated: Double-submit cookie in requireAuth()
+-- 1.4 Session fixation
    +-- Mitigated: NextAuth regenerates session ID
```

### Attack Tree 2: Brute Force Login

```
Brute Force
+-- 2.1 Credential stuffing
|   +-- Per-email rate limit: 5/min
|   +-- Mitigated: IP-based rate limit in middleware (100 req/min) + Cloudflare worker + K8s ingress
<!-- RESOLVED: Cloudflare worker rate limiting + K8s ingress rate limiting deployed -->
|   +-- Mitigated: WAF at infrastructure level (Cloudflare worker + K8s ingress)
+-- 2.2 Password spraying
|   +-- Each account gets own rate limit
+-- 2.3 Dictionary attack on single account
    +-- 5 attempts/min + bcrypt cost factor 10
```

### Attack Tree 3: Token Theft

```
Token Theft
+-- 3.1 Read from browser storage
|   +-- Mitigated: HttpOnly cookies, not localStorage
+-- 3.2 Extract from Referer header
|   +-- Mitigated: SameSite=Lax
+-- 3.3 Log injection to capture token
|   +-- Mitigated: Errors don't log token content
+-- 3.4 Physical access to device
    +-- Mitigated: 24h maxAge
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------|----------|
| Brute force | LOW | IP-based rate limit implemented via middleware + infra |
| Session hijacking | LOW | |
| CSRF | LOW | |
| Cross-tenant access | LOW | |
| Token theft | LOW | |

<!-- RESOLVED: IP-based rate limiting now implemented via middleware.ts + Cloudflare worker + K8s ingress -->
**Former top priority (resolved):** IP-based rate limiting on /api/auth/[...nextauth] — implemented via middleware + infrastructure.
