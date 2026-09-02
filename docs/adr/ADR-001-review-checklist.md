# ADR-001: Auth Domain Review Checklist

## Code Review Checklist

### Authentication

- [x] All API routes (except webhooks + health) have auth check
- [x] No route imports prisma directly (all use db from @/lib/db)
- [x] Session errors return 401, not 500
- [x] Rate limiting on auth endpoints (IP-based implemented via middleware.ts + Cloudflare worker + K8s ingress)
- [x] JWT has expiry <= 24h (configured: exactly 24h)
- [ ] Refresh token rotation implemented (deferred)
- [x] CSRF protection on all mutations (requireAuth enforces for POST/PUT/PATCH/DELETE)
- [x] AuthError class has consistent statusCode/status access
- [x] requireRole routes through requireAuth (CSRF enforced)
- [x] session.ts getCurrentUser reads correct field (was accountId, fixed to id)

### Session Security

- [x] JWT secret from environment variable (NEXTAUTH_SECRET)
- [x] Startup validation warns if NEXTAUTH_SECRET is missing
- [x] Session strategy is JWT (not database)
- [x] Cookie flags: HttpOnly, Secure, SameSite (NextAuth defaults)
- [x] Token enrichment includes tenantId, role, businessId
- [x] Token creation timestamp (iat) added for future rotation

### Multi-Tenancy

- [x] tenantId embedded in JWT
- [x] All queries filter by tenantId from session
- [x] tenantScope() helper available for consistent filtering
- [x] No cross-tenant query paths exist

### Error Handling

- [x] JWEDecryptionFailed caught and returns null (401)
- [x] Generic error messages (no token content in logs)
- [x] Audit logging on login success/failure/rate-limit

### CSRF

- [x] Double-submit cookie via NextAuth csrf-token
- [x] requireAuth() enforces CSRF for mutating methods
- [x] getApiUser() skips CSRF (read-only routes)
- [x] x-csrf-token header validation

## Remaining Gaps

1. ~~IP-based rate limiting on /api/auth/*~~: **Resolved** — middleware.ts enforces 100 req/min per IP globally, 10 req/min for financial mutations. Cloudflare worker and K8s ingress provide additional layers.
2. Refresh token rotation: Deferred. Re-auth after 24h.
3. Session revocation: Cannot revoke individual sessions.
