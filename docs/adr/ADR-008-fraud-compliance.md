# ADR-008: Fraud Detection and Compliance System Design

**Status:** Active
**Date:** 2025-01-29
**Domain Owner:** D8 — Fraud Detection and Compliance

## Context

Youngsend operates a multi-tenant B2B cross-border payments platform. Fraud detection and regulatory compliance are mission-critical: the platform must detect suspicious activity (money laundering, sanctions evasion, account takeover) while maintaining compliance with KYC/AML regulations across jurisdictions.

This ADR covers the design of three interrelated subsystems:
1. **Fraud Rule Engine** — configurable rules that evaluate transactions and entities for fraud signals
2. **Compliance Screening Pipeline** — sanctions, PEP, adverse media, and country-risk screening
3. **KYC Verification Flow** — identity verification, document collection, and compliance document management

## Decision

### 1. Fraud Rule Engine

**Architecture:** Declarative JSON rules stored in the database, evaluated on-demand.

- Rules are stored in `FraudRule` with a JSON `condition` field that defines the evaluation criteria.
- Actions: `alert`, `block`, `require_review`, `flag`.
- Severity levels: `low`, `medium`, `high`, `critical`.
- Rules have `triggerCount` and `lastTriggeredAt` for observability.

**Current limitation:** `FraudRule` has no `tenantId` column — rules are system-wide. All tenants share the same rule set. A future migration should add `tenantId` to support per-tenant rule customization (see Migration Plan below).

**Evaluation logic:** Rules are currently declarative only — the route stores them but the actual runtime evaluation engine is not yet implemented. The intended design is:
- Rules are fetched (cached 5min via `cache-manager`)
- On transaction events, the engine evaluates all active rules against the event payload
- Matched rules generate `FraudAlert` records with a computed fraud score

**Fraud alerts** are created with:
- `alertRef`: unique human-readable reference (e.g., `FRD-A3K9X`)
- `businessId`: required — enforces tenant isolation via the Business → Tenant relationship
- `score`: 0–100 confidence score
- `status` lifecycle: `open` → `investigating` → `confirmed_fraud`/`false_positive`/`escalated` → `resolved`

**Status transitions** are strictly enforced:
```
open → investigating, escalated, false_positive
investigating → confirmed_fraud, false_positive, escalated, resolved
escalated → investigating, confirmed_fraud, false_positive, resolved
confirmed_fraud → resolved
false_positive → resolved
resolved → (terminal)
```

### 2. Compliance Screening Pipeline

**Architecture:** Synchronous screening requests that return results immediately.

- Screening types: `sanctions`, `pep`, `adverse_media`, `country_risk`.
- Results: `clear`, `potential_match`, `alert`.
- Risk levels: `low`, `medium`, `high`, `critical`.
- Currently uses mock data; real integration should plug into external screening providers (ComplyAdvantage, Dow Jones, etc.).

**Tenant isolation:** `ComplianceScreening` has no `tenantId` but has a `businessId` field. The GET endpoint filters by tenant business IDs. The POST endpoint now requires `businessId` and validates tenant ownership.

**Compliance rules** (`ComplianceRule`) are similar to fraud rules — stored as JSON conditions, system-wide (no `tenantId`). Types include `sanctions_check`, `kyc_requirement`, `aml_threshold`, `transaction_limit`, `country_restriction`, `industry_restriction`.

### 3. KYC Verification Flow

**Architecture:** Verification records linked to businesses via the Commerce Passport.

- Verification types: `identity`, `business_registration`, `tax`, `bank_account`, `address`.
- Methods: `document`, `api`, `manual`, `third_party`.
- Verification statuses: `pending` → `in_progress` → `approved`/`rejected`/`expired`.

**Commerce Passport integration:** Creating an `identity` or `business_registration` verification automatically sets `kycStatus: 'in_progress'` on the associated Commerce Passport. Creating a `bank_account` verification sets `amlStatus: 'in_progress'`.

**Compliance documents** are uploaded to a passport with types like `certificate_of_incorporation`, `tax_registration`, `bank_statement`, `proof_of_address`, `license`. They have `expiresAt` for document expiry tracking.

### 4. Authorization Model

| Endpoint | GET | POST/PUT |
|---|---|---|
| `/api/fraud/alerts` | Any authenticated user | admin, auditor |
| `/api/fraud/alerts/[id]` | Any authenticated user | admin, auditor |
| `/api/fraud/rules` | admin, auditor | admin only |
| `/api/compliance/screenings` | Any authenticated user | admin, auditor |
| `/api/compliance/rules` | admin, auditor | admin only |
| `/api/passport/verifications` | Any authenticated user | Any authenticated user |
| `/api/passport/compliance` | Any authenticated user | Any authenticated user |

All mutations (POST/PUT) are protected by CSRF validation via `requireAuth`/`requireRole`.

### 5. Caching Strategy

- Fraud rules are cached for 5 minutes, keyed by `fraud:rules:{tenantId}`.
- Cache key is tenant-scoped to prevent cross-tenant cache poisoning (even though the underlying data is shared).
- Graceful fallback: if the cache manager module is not available, rules are fetched directly from the database.

## Consequences

### Positive
- Clear separation between fraud detection (rules + alerts) and compliance (screenings + KYC)
- Strict status transition enforcement prevents alert manipulation
- All mutations are CSRF-protected
- Tenant isolation enforced on all data endpoints

### Negative / Technical Debt
- **FraudRule and ComplianceRule lack `tenantId`** — all tenants share the same rules. This is acceptable for MVP but must be addressed before multi-tenant customization.
- **Screening pipeline uses mock data** — real screening provider integration is required for production.
- **No runtime rule evaluation engine** — rules are stored but not evaluated against transactions.
- **No alert notification system** — alerts are created but not pushed to investigators (no WebSocket, email, or webhook integration).

### Migration Plan (P0)
1. Add `tenantId` column to `FraudRule` and `ComplianceRule` (nullable, backfill with a system tenant)
2. Scope all rule queries by `tenantId`
3. Add a system-tenant for default rules that apply to all tenants
4. Implement rule evaluation engine with event-driven triggers
5. Integrate real screening providers (ComplyAdvantage, Refinitiv World-Check)
6. Add alert notification pipeline (email + in-app + webhook)
