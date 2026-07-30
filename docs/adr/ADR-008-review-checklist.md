# ADR-008: Fraud & Compliance Review Checklist

**Domain Owner:** D8 — Fraud Detection and Compliance
**Date:** 2025-01-29

## Route Audits

### Fraud Alerts — `POST /api/fraud/alerts`
- [x] Auth: uses `requireRole(['admin', 'auditor'])` — CSRF enforced
- [x] `businessId` is required in schema (prevents orphaned alerts)
- [x] `businessId` validated against tenant ownership
- [x] Alert ref generation has max retry limit (10)
- [x] Zod validation on all fields
- [x] Score constrained to 0–100
- [x] Error handling: AuthError caught with correct `.status`

### Fraud Alert Detail — `GET /api/fraud/alerts/[id]`
- [x] Auth: uses `requireAuth()`
- [x] Tenant isolation: denies access if `businessId` is null (orphan)
- [x] Tenant isolation: verifies `business.tenantId === user.tenantId`
- [x] Returns 404 for non-existent and cross-tenant alerts (no information leakage)

### Fraud Alert Update — `PUT /api/fraud/alerts/[id]`
- [x] Auth: uses `requireRole(['admin', 'auditor'])` — CSRF enforced
- [x] Status transition state machine enforced (409 on invalid transitions)
- [x] Tenant isolation same as GET
- [x] `resolvedAt` and `resolvedBy` auto-set on terminal statuses
- [x] `recommendation` field populated from `resolution` input

### Fraud Rules — `GET /api/fraud/rules`
- [x] Auth: uses `requireAuth()`
- [x] Role check: admin or auditor only
- [x] Cache: 5-min TTL, tenant-keyed
- [ ] **KNOWN:** No `tenantId` filter on query (rules are system-wide) — tracked in ADR-008

### Fraud Rules — `POST /api/fraud/rules`
- [x] Auth: uses `requireRole(['admin'])` — CSRF enforced
- [x] Condition validated as JSON object (not just valid JSON)
- [ ] **KNOWN:** No `tenantId` on create — tracked in ADR-008

### Compliance Screenings — `GET /api/compliance/screenings`
- [x] Auth: `getApiUser` (read-only, no CSRF needed)
- [x] Pagination: page + limit (max 100)
- [x] Tenant isolation via `businessId: { in: tenantBizIds }`
- [x] `businessId` filter validated against tenant

### Compliance Screenings — `POST /api/compliance/screenings`
- [x] Auth: `requireRole(['admin', 'auditor'])` — CSRF enforced
- [x] `businessId` required in schema
- [x] `businessId` validated against tenant

### Compliance Rules — `GET /api/compliance/rules`
- [x] Auth: `requireAuth()`
- [x] Role check: admin or auditor only
- [ ] **KNOWN:** No `tenantId` filter — tracked in ADR-008

### Compliance Rules — `POST /api/compliance/rules`
- [x] Auth: `requireRole(['admin'])` — CSRF enforced
- [x] Condition validated as JSON object
- [ ] **KNOWN:** No `tenantId` — tracked in ADR-008

### Passport Verifications — `GET /api/passport/verifications`
- [x] Auth: `getApiUser`
- [x] Pagination: page + limit (max 100)
- [x] Tenant isolation via `business: { tenantId }` relation

### Passport Verifications — `POST /api/passport/verifications`
- [x] Auth: `requireAuth()` — CSRF enforced
- [x] `businessId` validated against tenant
- [x] Passport status auto-updated (kycStatus / amlStatus)

### Passport Compliance — `GET /api/passport/compliance`
- [x] Auth: `getApiUser`
- [x] Pagination: page + limit (max 100)
- [x] Tenant isolation via `passport.business.tenantId`

### Passport Compliance — `POST /api/passport/compliance`
- [x] Auth: `requireAuth()` — CSRF enforced
- [x] `passportId` validated against tenant via passport → business chain

## UI Audits

### FraudTab.tsx
- [x] API endpoints match backend routes
- [x] Error states handled with `ErrorState` component
- [x] Both `refetch` functions available for retry
- [x] 403 on rules endpoint degrades gracefully (shows access-denied message)
- [x] Loading skeleton shown during fetch
- [x] `useApi` auto-unwraps `{ data: T }` envelope correctly

### ComplianceTab.tsx
- [x] API endpoints match backend routes
- [x] Error states handled
- [x] Both `refetch` functions available for retry
- [x] 403 on rules degrades gracefully
- [x] Business ID shown in screenings table (was hardcoded `'—'`)
- [x] Loading skeleton shown during fetch

## Schema / Data Integrity

- [x] `FraudAlert.score` is Float — displayed as integer in UI (acceptable truncation)
- [x] `FraudAlert.businessId` is nullable in schema but enforced required at API layer
- [ ] **TODO:** Add NOT NULL DB constraint on `FraudAlert.businessId` (migration)
- [ ] **TODO:** Add NOT NULL DB constraint on `ComplianceScreening.businessId` (migration)
- [ ] **TODO:** Add `tenantId` to `FraudRule` (migration, see ADR-008)
- [ ] **TODO:** Add `tenantId` to `ComplianceRule` (migration, see ADR-008)

## Known Limitations (Not Bugs — Tracked for Future Work)

1. **No runtime rule evaluation engine** — Rules are CRUD-only; no transaction-event evaluation.
2. **Mock screening data** — Must integrate real provider before production.
3. **No alert notifications** — Alerts are created but not pushed to investigators.
4. **No audit log for rule changes** — Rule CRUD should emit audit events.
5. **No rate limiting on alert creation** — Alert fatigue attack possible.
6. **No alert deduplication** — Identical alerts can be created repeatedly.
7. **No document upload verification** — `docUrl` in compliance documents is not validated.
8. **Verification POST has no role check** — Any authenticated user can create verifications (intentional for self-service KYC).
