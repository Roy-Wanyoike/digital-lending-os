# ADR-002: API Hardening — Error Responses, Validation & Route Hygiene

**Status:** Accepted  
**Date:** 2025-07-13  
**Owner:** Domain Owner 2 — API Hardening

---

## Context

Youngsend has 70+ API routes. An audit revealed:

1. **Inconsistent error envelopes** — routes return `{ error: string }`, `{ error: { message } }`, or throw raw. Frontend cannot reliably parse errors.
2. **Missing try-catch** — `/api/payments/providers`, `/api/convert` (now deleted), and `/api/route.ts` (now deleted) lacked error boundaries.
3. **No input validation** — most POST/PUT routes beyond payments/intents used ad-hoc `if (!field)` checks instead of Zod schemas.
4. **Structured logging gap** — many routes used `console.error` instead of the `YoungsendLogger` telemetry pipeline.
5. **Legacy routes** — `/api/convert` was an open proxy with no auth; `/api/route.ts` leaked a "Hello World" response.

## Decision

### 1. Standard Error Response Envelope

All API routes must return errors in this shape:

```json
{
  "error": {
    "message": "Human-readable message",
    "code": "MACHINE_READABLE_CODE",
    "details": {} // optional, e.g. Zod field errors
  }
}
```

Success responses:

```json
{
  "data": {},
  "meta": {} // optional, e.g. pagination
}
```

**Module:** `src/backend/lib/api-response.ts` exports: `ok()`, `created()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `validationError()`, `error()`, and `withErrorHandler()` HOF.

### 2. withErrorHandler HOF

Every exported route handler should be wrapped in `withErrorHandler()` which:
- Catches `AuthError` → maps to its statusCode
- Catches `ZodError` → 422 with field-level details
- Catches errors with `.statusCode` → passthrough
- Falls back to 500 with structured logging

### 3. Zod Validation Strategy

- **Shared schemas** live in `src/backend/lib/validation/schemas.ts`
- Every POST/PUT route must validate its input with `schema.safeParse()`
- Parsing failures return 422 with per-field details
- Existing payment validation in `src/backend/lib/payment/validation.ts` is preserved as-is (it handles provider-specific webhook payloads)

### 4. Legacy Route Deprecation

| Route | Action | Rationale |
|--------|--------|-----------|
| `/api/convert` | **DELETED** | Open proxy, no auth, no try-catch. Users should use `/api/wallets/convert`. |
| `/api/route.ts` | **DELETED** | Leaked implementation details. No business value. |

### 5. Structured Logging

All routes must use `getLogger().withContext({ route: '/api/...' })` instead of `console.error`. The logger pipes to OTLP in production and colored stderr in development.

## Consequences

- **Positive:** Consistent error parsing for frontend SDK, reduced 500 surface, audit-ready validation trail.
- **Negative:** Existing frontend code that parses `{ error: string }` will need updating. Migration is backward-compatible for most cases since the `error` key still exists.
- **Migration path:** Existing routes should be incrementally refactored to use `withErrorHandler` + response helpers. The `errorResponse()`/`successResponse()` in `api-helpers.ts` are now **deprecated** in favor of `api-response.ts`.

---
