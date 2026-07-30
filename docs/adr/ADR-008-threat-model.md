# ADR-008: Fraud & Compliance Threat Model

**Status:** Active
**Date:** 2025-01-29
**Domain Owner:** D8 — Fraud Detection and Compliance

## Threat Inventory

### T1: Fraud Rule Bypass via Tenant Isolation Gap

**Description:** `FraudRule` and `ComplianceRule` have no `tenantId` column. Rules are system-wide. A tenant admin cannot customize rules for their specific risk profile. More critically, any admin from any tenant can create/delete rules that affect all tenants.

**Severity:** High — Cross-tenant rule manipulation

**Current Mitigations:**
- Rule creation requires `admin` role
- Rule listing requires `admin` or `auditor` role
- Cache is tenant-keyed to prevent cache poisoning

**Residual Risk:** Medium. An admin from Tenant A can create a rule that weakens fraud detection for Tenant B. There is no audit trail on rule creation/deletion.

**Recommended Hardening:**
- Add `tenantId` to `FraudRule` and `ComplianceRule` (P0 migration)
- Add audit logging for all rule CRUD operations
- Implement rule versioning to detect unauthorized changes

---

### T2: Orphaned Fraud Alerts Bypassing Tenant Isolation

**Description:** FraudAlert has an optional `businessId`. If `businessId` is null, the alert has no tenant binding. Previously, the GET endpoint filtered by `businessId: { in: tenantBizIds }` which would exclude null values, but the PUT endpoint's tenant check was conditional: `if (alert.businessId)` — skipping isolation entirely for orphaned alerts.

**Severity:** Critical — Cross-tenant alert access

**Current Mitigations:**
- POST now requires `businessId` (schema validation)
- GET filters by tenant business IDs (null businessId alerts are invisible)
- GET/PUT on `[id]` now deny access if `businessId` is null

**Residual Risk:** Low. Existing orphaned alerts (created before the fix) are invisible to all tenants but still exist in the database.

**Recommended Hardening:**
- Run a data cleanup: delete or reassign all FraudAlerts with null `businessId`
- Add a NOT NULL constraint on `FraudAlert.businessId` at the database level
- Same fix applies to `ComplianceScreening.businessId`

---

### T3: CSRF Bypass on Fraud/Compliance Mutations

**Description:** All POST/PUT routes previously used `getApiUser()` which only checks session authentication. It does not enforce CSRF tokens on state-changing methods. An attacker could craft a malicious page that submits a form to `/api/fraud/alerts/[id]` to change an alert's status (e.g., mark confirmed fraud as false_positive).

**Severity:** High — Alert status manipulation

**Current Mitigations:**
- All POST/PUT handlers now use `requireAuth()` or `requireRole()` which enforce CSRF via `csrfGuard()`

**Residual Risk:** Low. The CSRF guard validates the `X-CSRF-Token` header or form field.

---

### T4: Arbitrary Alert Status Transitions

**Description:** The PUT `/api/fraud/alerts/[id]` endpoint previously allowed any valid status value regardless of the current state. An auditor could set a `resolved` alert back to `open`, or skip directly from `open` to `resolved` without investigation.

**Severity:** Medium — Audit trail integrity

**Current Mitigations:**
- A strict state machine now enforces valid transitions (see ADR-008-fraud-compliance.md)
- Invalid transitions return 409 Conflict with the allowed options

**Residual Risk:** Low. The state machine covers all legitimate investigation workflows.

---

### T5: Missing Role Authorization on Alert/Screening Creation

**Description:** Previously, any authenticated user (including `user` role) could create fraud alerts and compliance screenings. This could allow a malicious insider to create noise alerts to mask real fraud (alert fatigue) or trigger excessive screenings to exhaust rate limits.

**Severity:** Medium — Insider threat / alert fatigue

**Current Mitigations:**
- Fraud alert creation requires `admin` or `auditor` role
- Compliance screening creation requires `admin` or `auditor` role
- Verification creation (KYC) requires any authenticated user (legitimate use case: businesses submit their own documents)

**Residual Risk:** Low.

---

### T6: Screening Evasion via Mock Data

**Description:** The compliance screening pipeline currently returns randomized mock results. There is no real sanctions/PEP/adverse media check. A sanctioned entity would pass screening 80% of the time.

**Severity:** Critical — Regulatory non-compliance

**Current Mitigations:**
- None. The mock is clearly labeled in code but the API does not indicate results are mock.

**Residual Risk:** Critical. This must be addressed before any production deployment.

**Recommended Hardening:**
- Integrate a real screening provider (ComplyAdvantage, Refinitiv, LexisNexis)
- Add a `dataSource` field to `ComplianceScreening` to distinguish mock from real results
- Return `X-Mock-Data: true` header during development/staging

---

### T7: Unbounded List Endpoints (DoS)

**Description:** `GET /api/passport/verifications` and `GET /api/passport/compliance` previously returned all matching records with no pagination. A tenant with thousands of verifications could cause memory pressure and slow responses.

**Severity:** Low — Performance / availability

**Current Mitigations:**
- Both endpoints now support `page` and `limit` parameters (default 50, max 100)

**Residual Risk:** Low.

---

### T8: Alert Fatigue Attack

**Description:** An admin/auditor could create hundreds of low-severity fraud alerts to overwhelm investigators, causing real high-severity alerts to be missed. The `alertRef` generation loop has no rate limiting.

**Severity:** Medium — Operational security

**Current Mitigations:**
- Alert creation requires admin/auditor role
- Alert refs have a max retry limit (10) to prevent infinite loops

**Residual Risk:** Medium. Rate limiting on alert creation is not implemented.

**Recommended Hardening:**
- Add rate limiting: max 50 alerts per tenant per hour
- Add alert deduplication: suppress identical alerts within a time window
- Implement alert prioritization: auto-escalate if high/critical alert volume exceeds threshold

---

### T9: Business ID Injection in Filtered Listings

**Description:** The GET endpoints for fraud alerts and screenings accept a `businessId` query parameter. Previously, this was applied directly to the `where` clause without verifying the business belongs to the requesting tenant. A user from Tenant A could pass Tenant B's business ID to view their alerts/screenings.

**Severity:** High — Cross-tenant data leakage

**Current Mitigations:**
- Compliance screenings GET now validates `businessId` against tenant business IDs before applying the filter
- Fraud alerts GET filters by `businessId: { in: tenantBizIds }`, so even if a cross-tenant ID is passed, it won't match the `in` clause

**Residual Risk:** Low for fraud alerts (the `in` clause naturally excludes cross-tenant IDs). Zero for screenings (explicit validation added).

---

## Threat Summary Matrix

| ID | Threat | Severity | Status |
|---|---|---|---|
| T1 | Rule tenant isolation gap | High | Mitigated (migration pending) |
| T2 | Orphaned alert isolation bypass | Critical | Fixed |
| T3 | CSRF on mutations | High | Fixed |
| T4 | Arbitrary status transitions | Medium | Fixed |
| T5 | Missing role authorization | Medium | Fixed |
| T6 | Mock screening data | Critical | Open (P0 for production) |
| T7 | Unbounded list endpoints | Low | Fixed |
| T8 | Alert fatigue attack | Medium | Partially mitigated |
| T9 | Business ID injection | High | Fixed |