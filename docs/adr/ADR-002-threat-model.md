# ADR-002: API Threat Model

**Status:** Accepted  
**Date:** 2025-07-13  
**Scope:** Youngsend API surface (70+ routes)

---

## STRIDE Analysis

| Threat | Severity | Mitigations In-Place | Gaps | Remediation |
|--------|----------|---------------------|------|-------------|
| **S**poofing | HIGH | NextAuth JWT, CSRF tokens on mutations | Legacy `/api/convert` had no auth (DELETED) | All routes must call `getApiUser` or `requireAuth` |
| **T**ampering | HIGH | Zod on payments/intents, webhook signature verification | Most POST routes have no Zod | Shared validation schemas + `withErrorHandler` |
| **R**epudiation | MEDIUM | Audit trail module, structured logging | Some routes use `console.error` | Migrate to `getLogger()` everywhere |
| **I**nformation Disclosure | HIGH | Tenant-scoped queries, no raw SQL | Root `/api/route.ts` leaked info (DELETED), inconsistent error messages | Standard error envelope hides internals |
| **D**enial of Service | MEDIUM | Rate limiter in cache module | No per-route rate limiting on GET endpoints | Use `rate-limiter.ts` on expensive queries |
| **E**levation of Privilege | HIGH | RBAC via `requireRole`, admin checks | Business creation is admin-only but validated manually | `businessCreateSchema` + `withErrorHandler` |

---

## Injection Vectors

### SQL/NoSQL Injection
- **Risk:** LOW. All database access goes through Prisma ORM with parameterised queries.
- **Tested:** `searchParams` values are passed as Prisma `where` clauses, never interpolated.
- **Remaining risk:** Raw query edge cases (none found in audit).

### XSS via Stored Data
- **Risk:** MEDIUM. Invoice notes, business descriptions, and user metadata are string fields stored in DB and rendered client-side.
- **Mitigation:** `sanitizeInput()` in `payment/validation.ts` handles HTML entity encoding. This should be applied to all text inputs, not just payments.

### Command Injection
- **Risk:** LOW. No `child_process` or `exec` calls in API routes.

---

## Mass Assignment

**Risk:** HIGH. Routes like `POST /api/businesses` spread user-provided fields directly into `db.business.create({ data: body })`. An attacker could set `tenantId`, `role`, or other sensitive fields.

**Mitigation:** Zod schemas whitelist exactly which fields are allowed. The `businessCreateSchema` only permits: `name`, `description`, `industry`, `website`, `logoUrl`, `country`. The `tenantId` is set server-side from the session.

**Remaining gaps:** Routes not yet migrated to Zod still spread raw body. These are tracked in the review checklist.

---

## IDOR (Insecure Direct Object Reference)

**Pattern:** Routes accept resource IDs as URL params (`/api/businesses/[id]`) or query params (`?walletId=xxx`).

**Mitigation:** All routes must verify the resource belongs to the authenticated user's tenant:
```ts
const wallet = await db.wallet.findFirst({ where: { id: walletId } })
const biz = await db.business.findFirst({ where: { id: wallet.businessId, tenantId: user.tenantId } })
if (!biz) return notFound()
```

**Audit status:** Deposits, withdrawals, and wallet routes follow this pattern. Invoices and collections need verification.

---

## Rate Abuse

**Current state:** `src/backend/lib/cache/rate-limiter.ts` exists with Redis-backed sliding window. It is applied at the middleware level.

**Gaps:**
- No per-route rate limits (e.g. stricter on `/api/payments/initialize`)
- No per-tenant rate limits
- No cost-based rate limiting (large transactions = higher friction)

**Recommendation:** Add route-specific rate limit configs as a follow-up.
