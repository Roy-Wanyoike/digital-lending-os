# ADR-011: Data Layer — Prisma Client Unification, Schema Design & Migration Strategy

**Status:** Accepted
**Date:** 2025-07-14
**Owner:** Domain Owner 11 — Data Layer

---

## Context

### Problem 1: Dual Prisma Client Instances

Two Prisma client files existed:
- `src/backend/lib/db.ts` — exports `db`, with `log: ['query']` in dev, used by **81 route files**.
- `src/backend/lib/prisma.ts` — exports `prisma`, no query logging, used by **0 files**.

Both used the same `globalThis.prisma` key for hot-reload safety, so whichever file was imported first would win. This created a latent risk: if any file ever imported from `prisma.ts`, it would appear to work (same singleton key) but the lack of query logging would mask issues.

### Problem 2: Wrong Import Paths for api-helpers

9 files imported `getApiUser` / `requireRole` / `AuthError` from `@/backend/lib/auth/api-helpers` (full filesystem path) instead of the correct tsconfig alias `@/lib/auth/api-helpers`. While this worked at runtime (Next.js resolves both), it violated the project convention and created fragility — if tsconfig paths change, these imports break silently in type-checking but not necessarily at runtime.

### Problem 3: Schema — SQLite vs PostgreSQL

The active `prisma/schema.prisma` uses `provider = "sqlite"`, but a PostgreSQL migration already exists at `infra/postgresql/migration-schema.prisma` with hand-written SQL migrations. The schema needs a documented migration path.

### Problem 4: Schema Design Issues

The 1140-line schema has 30+ models. Several design issues were identified during audit (see below).

---

## Decision

### 1. Prisma Client Unification

**Action taken:** Deleted `src/backend/lib/prisma.ts`. The canonical client is `src/backend/lib/db.ts`, exporting `db`.

**Rationale:**
- 81 files already import from `@/lib/db`; 0 imported from `@/lib/prisma`.
- `db.ts` includes `log: ['query']` for dev debugging.
- The globalThis singleton pattern prevents connection pool explosion in Next.js hot-reload.

### 2. Import Path Corrections

**Action taken:** Fixed all 9 files:
- `src/app/api/compliance/screenings/route.ts`
- `src/app/api/compliance/rules/route.ts`
- `src/backend/lib/auth/session.ts`
- `src/app/api/realtime/route.ts`
- `src/app/api/fraud/alerts/route.ts`
- `src/app/api/fraud/alerts/[id]/route.ts`
- `src/app/api/fraud/rules/route.ts`
- `src/app/api/passport/verifications/route.ts`
- `src/app/api/passport/compliance/route.ts`

All now use `@/lib/auth/api-helpers` (verified: 77 files total, 0 with wrong path).

### 3. Schema Audit Findings

#### A. Indexes — Generally Good
All models have appropriate `@@index` directives for common query patterns. One minor gap:
- **`Review` model**: Has `@@index([toBusinessId])` but missing `@@index([fromBusinessId])` — "reviews I wrote" queries will be unoptimized.

#### B. Relations Without onDelete — Safe Defaults
Several relations omit `onDelete`, which defaults to `Restrict` in Prisma. These are **correctly safe**:
- Business → Tenant (Restrict — can't delete tenant with businesses)
- EscrowTransaction → Business buyer/seller (Restrict — can't delete business with active escrows)
- Invoice → Business sender/receiver (Restrict)
- Wallet → Business (Restrict — can't delete business with wallets)
- PaymentIntent → EscrowTransaction (Restrict)

#### C. Orphaned/Loose FK Fields (No Prisma @relation)

These models have foreign-key-like `String` fields without Prisma `@relation` declarations. They function as loose references — no referential integrity at the DB level:

| Model | Loose FK Fields | Notes |
|---|---|---|
| Review | fromBusinessId, toBusinessId, escrowId | No DB-level integrity |
| User | businessId | Entire model has NO relations — likely orphaned/legacy |
| PaymentMethod | businessId | No relation to Business |
| PaymentLink | createdBy (String?) | No relation to Account |
| FraudAlert | businessId | No relation to Business |
| BusinessMatch | seekerId, candidateId | No relation to Business |
| CollectionCase | businessId, debtorId, invoiceId | No relations |
| ComplianceScreening | businessId | No relation to Business |
| ReferralBonus | referrerId, refereeId, depositId, walletId | No relations |
| Notification | accountId | No relation to Account |
| Subscription | businessId | No relation to Business |

**Recommendation:** Add `@relation` to critical ones (Subscription → Business, FraudAlert → Business, CollectionCase → Invoice) for referential integrity. Leave polymorphic/optional ones (ComplianceScreening.businessId, Review.escrowId) as loose strings if intentional.

#### D. Cascade Delete Safety

| Relation | onDelete | Risk |
|---|---|---|
| Account → Tenant | Cascade | ✅ Safe — accounts belong to tenant |
| CommercePassport/Verification/TrustScore/DigitalTwin → Business | Cascade | ✅ Safe — child records of business |
| BusinessRelationship → Business (both sides) | Cascade | ⚠️ Deleting either business deletes the relationship record. Acceptable but worth soft-deleting businesses instead. |
| WalletTransaction/Deposit/Withdrawal/CryptoWithdrawal → Wallet | Cascade | ⚠️ **FINANCIAL RISK** — deleting a wallet destroys all transaction history. Wallets should NEVER be hard-deleted. Use `status: "closed"` instead. |
| CurrencyConversion → Wallet (both sides) | Cascade | ⚠️ Deleting either wallet in a conversion destroys the conversion record. Risky for audit trails. |

**Recommendation:** Change Wallet → WalletTransaction/Deposit/Withdrawal/CryptoWithdrawal to `Restrict`. Never hard-delete wallets — use status field. Consider changing CurrencyConversion cascades to `SetNull` or `Restrict`.

#### E. Orphaned Model: User

The `User` model (Module 6) has:
- No `@relation` declarations to any other model
- Overlaps with `Account` (Module 0) which already has name, email, role, businessId, tenantId
- Not imported by any route (confirmed via grep)

**Recommendation:** Mark as deprecated or remove entirely. It appears to be an earlier design artifact superseded by `Account`.

### 4. SQLite → PostgreSQL Migration Strategy

The PostgreSQL migration files exist at `infra/postgresql/migrations/` with a companion `migration-schema.prisma`. Strategy:

1. **Phase 1:** Add missing `@relation` declarations to loose FK fields (non-breaking for SQLite).
2. **Phase 2:** Switch `prisma/schema.prisma` datasource to `postgresql` and `DATABASE_URL` to PG connection string.
3. **Phase 3:** Run `prisma migrate dev` to generate PG-compatible migration from current SQLite schema.
4. **Phase 4:** Cross-reference with hand-written PG migrations in `infra/postgresql/migrations/` — reconcile any PG-specific optimizations (partitions, JSONB columns instead of String JSON, enums instead of String status fields).
5. **Phase 5:** Replace `String` JSON fields (`features`, `items`, `metadata`, `allowedMethods`, `countries`, etc.) with native `Json` type (supported in both SQLite and PG).

---

## Consequences

- **Single source of truth:** All 81+ routes use `db` from `@/lib/db`. No confusion possible.
- **Consistent imports:** All api-helpers imports use the tsconfig alias.
- **Known schema debt:** Loose FK fields and cascade risks are documented for incremental resolution.
- **Migration path clear:** PostgreSQL migration is blocked only on adding missing relations and running Prisma migration.
