# ADR-011 Review Checklist — Data Layer

**Task ID:** D11 | **Agent:** data-layer-owner

---

## 1. Prisma Client Unification

- [x] Read and compared `src/backend/lib/db.ts` and `src/backend/lib/prisma.ts`
- [x] Determined canonical client: `db.ts` (81 consumers vs 0)
- [x] Deleted orphaned `src/backend/lib/prisma.ts`
- [x] Verified 0 files remain importing from `@/lib/prisma`
- [x] Verified all 81 files import from `@/lib/db`

## 2. Import Path Corrections

- [x] Found all 9 files with wrong `@/backend/lib/auth/api-helpers` path
- [x] Fixed `src/app/api/compliance/screenings/route.ts`
- [x] Fixed `src/app/api/compliance/rules/route.ts`
- [x] Fixed `src/backend/lib/auth/session.ts`
- [x] Fixed `src/app/api/realtime/route.ts`
- [x] Fixed `src/app/api/fraud/alerts/route.ts`
- [x] Fixed `src/app/api/fraud/alerts/[id]/route.ts`
- [x] Fixed `src/app/api/fraud/rules/route.ts`
- [x] Fixed `src/app/api/passport/verifications/route.ts`
- [x] Fixed `src/app/api/passport/compliance/route.ts`
- [x] Verified 0 files remain with wrong path
- [x] Verified 77 files now use correct `@/lib/auth/api-helpers`

## 3. Schema Integrity Audit

### 3A. Indexes

- [x] All 30+ models have `@@index` on primary query fields
- [x] Composite indexes present where needed (unique constraints)
- [ ] **OPEN:** Add `@@index([fromBusinessId])` to `Review` model

### 3B. onDelete Behavior

- [x] All explicit `onDelete: Cascade` relations audited
- [x] All implicit `Restrict` (no onDelete) relations audited — all safe
- [ ] **OPEN:** Change Wallet→WalletTransaction/Deposit/Withdrawal/CryptoWithdrawal cascades to `Restrict`
- [ ] **OPEN:** Review CurrencyConversion dual-cascade to Wallet

### 3C. Orphaned Models

- [x] `User` model identified as orphaned (no relations, no consumers, overlaps with `Account`)
- [ ] **OPEN:** Decide: deprecate or remove `User` model

### 3D. Loose FK Fields (No @relation)

- [x] All 11 models with loose FK strings documented in ADR
- [ ] **OPEN:** Add `@relation` to critical paths (Subscription→Business, FraudAlert→Business, CollectionCase→Invoice)
- [ ] **OPEN:** Document intent for polymorphic loose refs (Review.escrowId, ComplianceScreening.businessId)

### 3E. Data Types

- [ ] **OPEN:** Replace `String` JSON fields with native `Json` type (features, items, metadata, allowedMethods, countries, etc.)
- [ ] **OPEN:** Replace `String` status/role fields with `enum` types for type safety

## 4. PostgreSQL Migration Readiness

- [x] PostgreSQL migration files confirmed at `infra/postgresql/migrations/`
- [x] Migration strategy documented in ADR-011
- [ ] **OPEN:** Add missing `@relation` declarations before migration
- [ ] **OPEN:** Run `prisma migrate dev` against PostgreSQL
- [ ] **OPEN:** Reconcile hand-written SQL with Prisma-generated migration
- [ ] **OPEN:** Convert JSON strings to native `Json`/`JsonB` columns

## 5. Documentation

- [x] ADR-011-data-layer.md created
- [x] ADR-011-review-checklist.md created (this file)
- [x] Worklog entry appended
