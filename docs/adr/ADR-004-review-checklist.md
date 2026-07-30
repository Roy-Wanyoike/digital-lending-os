# ADR-004: Escrow & Trust Review Checklist

**Task:** D4 — Escrow & Trust
**Date:** 2025-07-30
**Reviewer:** _______________

---

## 1. Escrow Model & Prisma

- [ ] All routes use `db.escrowTransaction` (not `PaymentTransaction` or `Escrow`)
- [ ] No route queries `tenantId` directly on `EscrowTransaction` (column does not exist)
- [ ] All routes use Business-relation join for tenant isolation: `{ buyer: { tenantId } }` or `{ seller: { tenantId } }`
- [ ] Status values are lowercase: `created`, `funded`, `in_escrow`, `partial_release`, `completed`, `disputed`, `refunded`, `cancelled`
- [ ] No route uses UPPERCASE status values (`RELEASED`, `DISPUTED`, etc.)

## 2. Tenant Isolation

- [ ] `escrow/route.ts` GET filters by business IDs belonging to tenant
- [ ] `escrow/[id]/route.ts` GET uses OR-based Business join (not `tenantId` on escrow)
- [ ] `escrow/transactions/route.ts` GET uses OR-based Business join
- [ ] `escrow/transactions/[id]/route.ts` GET/PUT use OR-based Business join
- [ ] `escrow/transactions/[id]/fund/route.ts` uses OR-based Business join
- [ ] `escrow/transactions/[id]/activate/route.ts` uses OR-based Business join
- [ ] `escrow/transactions/[id]/release/route.ts` uses OR-based Business join
- [ ] `escrow/transactions/[id]/disputes/route.ts` uses OR-based Business join
- [ ] `escrow/transactions/[id]/disputes/[disputeId]/route.ts` uses OR-based Business join

## 3. Status Transition Guards

- [ ] Fund: only allows `created` → requires `escrow.status === 'created'`
- [ ] Activate: only allows `funded` → requires `escrow.status === 'funded'`
- [ ] Release: only allows `in_escrow` → requires `escrow.status === 'in_escrow'`
- [ ] Cancel: only allows `created` or `funded` → checked in PUT handler
- [ ] Dispute: only allows `in_escrow` or `funded` → checked in POST handler
- [ ] Dispute resolve: checks dispute is not already `resolved` or `escalated`
- [ ] Milestone release: checks `milestone.status !== 'released'` before processing

## 4. Authorization

- [ ] Release action: verifies user's business is the buyer (not comparing User ID to Business ID)
- [ ] Release action: admin role bypasses buyer check
- [ ] Dispute resolution: restricted to admin role only
- [ ] Dispute creation: both buyer and seller can raise (no party-specific restriction beyond status)
- [ ] Cancel: no specific party restriction (either participant can cancel)

## 5. Import Paths

- [ ] All escrow routes import from `@/lib/auth/api-helpers` (canonical path)
- [ ] No route imports from `@/backend/lib/auth/api-helpers` directly
- [ ] All routes import `db` from `@/lib/db`

## 6. Error Handling

- [ ] All routes catch `AuthError` and return appropriate status code
- [ ] All routes have a generic catch block returning 500
- [ ] Zod validation errors return 400 with issue details
- [ ] Status transition violations return 409 with descriptive message
- [ ] Not-found resources return 404
- [ ] Event bus emissions are wrapped in try/catch (fire-and-forget)

## 7. Audit Logging

- [ ] Escrow creation logs `created` action with txRef and milestone count
- [ ] Payment initiation logs `payment_initiated` with provider and fee details
- [ ] Activation logs `activated` with status transition
- [ ] Milestone release logs `milestone_released` with amount and disbursement ref
- [ ] Completion logs `completed` when all milestones released
- [ ] Cancellation logs `cancelled` with previous status
- [ ] Dispute raise logs `dispute_raised` with reason
- [ ] Dispute resolution logs `dispute_resolved` with resolution text

## 8. Trust Score

- [ ] GET `/api/trust/scores` returns scores from DB (not mock data)
- [ ] POST `/api/trust/scores` recalculates from real reviews, verifications, and reputation events
- [ ] Business ownership verified before recalculation
- [ ] Score clamped to [0, 100] range
- [ ] `scoreVersion` incremented on recalculation
- [ ] Reputation event created for recalculation with score delta

## 9. Frontend (EscrowTab.tsx)

- [ ] API endpoints match actual backend routes
- [ ] `useApi` hook correctly unwraps `{ data: ... }` responses
- [ ] Loading state shows `<LoadingSkeleton />`
- [ ] Error state shows `<ErrorState />` with retry
- [ ] Status filter correctly maps ESCROW_STATUSES to lowercase DB values
- [ ] Fund dialog fetches providers from `/api/payments/providers`
- [ ] Dispute dialog sends `raisedBy`, `reason`, `description` to correct endpoint
- [ ] Toast notifications shown for success and error states

## 10. Documentation

- [ ] ADR-004-escrow-trust.md covers state machine, trust algorithm, dispute resolution, audit logging
- [ ] ADR-004-threat-model.md covers all threats with severity ratings and mitigations
- [ ] This checklist is complete
- [ ] Worklog updated with Task D4

---

## Sign-Off

| Area | Approved | Notes |
|------|----------|-------|
| Tenant Isolation | [ ] | |
| Status Transitions | [ ] | |
| Authorization | [ ] | |
| Audit Logging | [ ] | |
| Trust Scores | [ ] | |
| Frontend | [ ] | |
| Documentation | [ ] | |