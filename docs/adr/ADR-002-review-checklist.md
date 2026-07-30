# ADR-002: API Hardening Review Checklist

**Use this checklist for every PR that touches API routes.**

---

## 1. Error Handling

- [ ] Every exported handler is wrapped in `withErrorHandler()` OR has an explicit try-catch
- [ ] Errors are returned via `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, or `error()` from `@/backend/lib/api-response`
- [ ] No raw `NextResponse.json({ error: 'string' })` calls — use the helpers
- [ ] No bare `throw` statements that would crash the process
- [ ] `AuthError` is NOT caught manually — `withErrorHandler` handles it

## 2. Response Consistency

- [ ] Success responses use `ok(data, meta?)` or `created(data)`
- [ ] Error responses follow `{ error: { message, code?, details? } }` shape
- [ ] No routes return `{ error: 'string' }` (flat string) — must be nested object
- [ ] Pagination responses include `meta: { page, limit, total, pages }`

## 3. Input Validation

- [ ] Every POST/PUT route validates input with a Zod schema
- [ ] Schema imported from `@/backend/lib/validation/schemas` (shared) or defined inline for route-specific fields
- [ ] Validation uses `safeParse()` and returns structured 422 on failure
- [ ] No `if (!field) return error(...)` ad-hoc checks for validated fields
- [ ] Numeric inputs validated as `z.number()`, not parsed from strings without validation
- [ ] URLs validated with `z.string().url()` where applicable

## 4. Authentication & Authorization

- [ ] Route calls `getApiUser()` or `requireAuth()` / `requireRole()`
- [ ] Null user check returns `unauthorized()`
- [ ] Role checks return `forbidden()` with specific message
- [ ] Resource access is scoped to `user.tenantId`
- [ ] No IDOR: foreign key lookups verify tenant ownership

## 5. Logging

- [ ] No `console.error()` or `console.log()` in route handlers
- [ ] Errors logged via `getLogger().withContext({ route: '...' })`
- [ ] Sensitive data (passwords, tokens, PII) NOT included in log output
- [ ] Successful mutations logged at INFO level with resource ID

## 6. Route Hygiene

- [ ] No "Hello World" or debug routes in production
- [ ] No open proxy/redirect routes (like the deleted `/api/convert`)
- [ ] GET endpoints are safe and idempotent
- [ ] File has no unused imports

---

## Quick Reference: Import Paths

```ts
// Response helpers
import { ok, created, badRequest, unauthorized, forbidden, notFound, withErrorHandler } from '@/backend/lib/api-response'

// Auth
import { getApiUser, requireAuth, requireRole, AuthError } from '@/lib/auth/api-helpers'

// Validation
import { paginationSchema, idParamSchema, currencySchema, amountSchema, businessCreateSchema, depositCreateSchema, invoiceCreateSchema } from '@/backend/lib/validation/schemas'

// Logging
import { getLogger } from '@/backend/lib/telemetry/logger'
```
