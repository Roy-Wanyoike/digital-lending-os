# ADR-001: Auth & Session Security

**Status:** Accepted  
**Date:** 2025-01-XX  
**Owner:** Auth Domain Owner  

## Context

Youngsend is a multi-tenant fintech platform handling escrow payments. Authentication and session management are security-critical: a compromised session grants access to funds, business data, and cross-tenant resources.

### Problems Identified

1. **Inconsistent auth helpers**: Two sets of auth functions existed (`getApiUser`/`requireAuth` in api-helpers.ts and `getCurrentUser`/`requireAuth` in session.ts) with different behaviors.
2. **Prisma client inconsistency**: Some routes imported `prisma` from `@/lib/prisma`, others used `db` from `@/lib/db`.
3. **JWT decryption errors returning 500**: Stale or rotated tokens caused unhandled `JWEDecryptionFailed` errors.
4. **CSRF gap**: Routes using `getApiUser` directly skipped CSRF; only `requireAuth` enforced it.
5. **No IP-based rate limiting on auth endpoint**: Only per-email rate limiting existed, leaving the `/api/auth/[...nextauth]` endpoint vulnerable to credential stuffing.

## Decision

### 1. JWT Strategy (not opaque sessions)

**Decision**: Use JWT (JSON Web Tokens) with short expiry.

**Rationale**:
- JWTs are stateless — no database lookup per request for session validation.
- Scales horizontally without shared session store.
- NextAuth's JWT strategy is well-tested and supports cookie-based transport.
- Fintech platform requires sub-10ms auth overhead — JWT decryption is ~0.5ms vs ~5ms DB lookup.

**Trade-off**: Tokens cannot be immediately revoked server-side. Mitigated by:
- Short maxAge (24h)
- Audit logging on every auth check
- Account deactivation checked on JWT callback refresh

### 2. Session Expiry Strategy

| Parameter | Value | Rationale |
|-----------|-------|----------|
| `maxAge` | 24 hours | Limits token theft window |
| `updateAge` | 24 hours | Forces re-authentication daily |
| Login rate limit | 5/min per email | Brute-force mitigation |
<!-- RESOLVED: IP-based rate limiting implemented in middleware.ts (100 req/min global, 10/min financial mutations) + Cloudflare worker + K8s ingress rate limiting -->
| Auth endpoint rate limit | 10/min per IP | Credential stuffing mitigation (implemented via middleware + infra) |

### 3. Multi-Tenant Session Isolation

- `tenantId` is embedded in the JWT during sign-in.
- Every API route filters queries by `tenantId` from the session.
- The `tenantScope()` helper provides a reusable where clause.
- No cross-tenant data access is possible even if token is intercepted.

### 4. Token Rotation on Sensitive Actions

<!-- TRACKING: Token rotation not yet implemented — tracked as future work. Re-auth required after 24h JWT expiry. -->
**Decision**: Not implemented yet — deferred to next sprint.

**Planned approach**:
- On password change, rotate `NEXTAUTH_SECRET` and invalidate all sessions.
- On security-sensitive actions (role change, business transfer), issue a new session.
- Store `lastTokenIssuedAt` on the account model for forced re-auth.

### 5. CSRF Mitigation

**Current approach**: Double-submit cookie pattern via NextAuth's built-in CSRF token.

- `requireAuth()` enforces CSRF for all POST/PUT/PATCH/DELETE.
- `getApiUser()` is for read-only routes — no CSRF needed.
- `requireRole()` now routes through `requireAuth()` to inherit CSRF.
- CSRF token is validated via `x-csrf-token` header.

### 6. Canonical Auth Helper Architecture

```
API Routes:
  getApiUser(req)  → null if unauthenticated (use for reads)
  requireAuth(req)  → throws 401/403 (use for writes, includes CSRF)
  requireRole(req, roles) → throws 401/403 (auth + CSRF + role check)
  requireAdmin(req) → convenience for requireRole(req, ['admin'])

Server Components:
  getCurrentUser() → deprecated, use getApiUser
  auth() → convenience wrapper returning null on error
```

## Consequences

- **Positive**: Single source of truth for auth. Consistent CSRF enforcement. Graceful JWT error handling.
- **Positive**: All routes now use `db` from `@/lib/db` — no direct `prisma` imports.
- **Positive**: IP-based rate limiting on all API endpoints via middleware + Cloudflare worker + K8s ingress.
- **Negative**: `session.ts` functions are deprecated; requires migration of any remaining consumers.
- **Risk (resolved)**: IP-based rate limiting on `/api/auth/[...nextauth]` — now implemented via middleware.ts.
- **Risk**: No refresh token rotation — re-authentication required after 24h JWT expiry.
