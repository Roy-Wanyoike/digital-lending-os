# ADR-004: Escrow Lifecycle and Trust Scoring

**Status:** Accepted
**Date:** 2025-07-30
**Owner:** escrow-trust-owner (D4)
**Supersedes:** None

---

## Context

Youngsend's escrow system protects trade between buyers and sellers by holding funds until delivery conditions are met. The system must:

- Manage a multi-step escrow lifecycle with milestone-based fund release
- Enforce strict tenant isolation — no cross-tenant data leakage
- Provide trust scores derived from real transaction data (reviews, verifications, reputation events)
- Support dispute resolution with audit logging
- Emit real-time events for dashboard updates

Prior to this ADR audit:
- The `escrow/[id]/route.ts` queried `tenantId` on `EscrowTransaction` which has no such column — runtime Prisma error
- The PATCH endpoint compared `escrow.buyerId` (Business ID) against `user.id` (User ID) — authorization always failed for non-admins
- Status values used UPPERCASE (`RELEASED`, `DISPUTED`) while the schema uses lowercase (`completed`, `disputed`)
- Dispute creation lacked escrow status validation (could dispute a `cancelled` escrow)
- Dispute resolution had no role check (any user could resolve any dispute)

## Decision

### 1. Escrow State Machine

```
created ──[fund]──> funded ──[activate]──> in_escrow ──[release all]──> completed
                    │                       │
                    │                       ├──[partial release]──> partial_release ──[release remaining]──> completed
                    │                       │
                    │                       └──[dispute]──> disputed ──[resolve: refund]──> refunded
                    │                                       │
                    │                                       └──[resolve: resume]──> in_escrow
                    │
                    └──[cancel]──> cancelled
created ──[cancel]──> cancelled
```

**Valid status values (lowercase):** `created`, `funded`, `in_escrow`, `partial_release`, `completed`, `disputed`, `refunded`, `cancelled`

**Transition rules enforced at the API layer:**
- Fund: only from `created`
- Activate: only from `funded`
- Release (per milestone): only from `in_escrow`
- Dispute: only from `in_escrow` or `funded`
- Cancel: only from `created` or `funded`
- Dispute resolve (refund): moves escrow to `refunded`
- Dispute resolve (resume): moves escrow back to `in_escrow`
- All milestones released: auto-transitions to `completed`

### 2. Tenant Isolation

`EscrowTransaction` has no `tenantId` column. Ownership is derived through the `buyer` and `seller` Business relations:

```prisma
// CORRECT — joins through Business.tenantId
where: {
  id,
  OR: [
    { buyer: { tenantId: user.tenantId } },
    { seller: { tenantId: user.tenantId } },
  ],
}

// WRONG — EscrowTransaction has no tenantId column
where: { id, tenantId: user.tenantId }  // Prisma runtime error
```

This pattern is used consistently across all escrow routes.

### 3. Milestone-Based Release

- Escrows are created with N milestones (default: 1)
- Milestone amounts must sum to the transaction amount (validated on creation)
- Milestone statuses: `pending`, `ready`, `released`, `disputed`
- Each release creates a `Disbursement` record
- When all milestones are released, the escrow auto-transitions to `completed`
- Partial release transitions to `partial_release`

### 4. Trust Score Algorithm

Trust scores are calculated on-demand (POST `/api/trust/scores`) and stored in the `TrustScore` table. The algorithm uses 5 sub-scores:

| Sub-score | Weight | Data Source | Calculation |
|-----------|--------|-------------|-------------|
| Payment | 25% | `Review.paymentRating` | Average rating × 20, plus reputation event impact |
| Quality | 25% | `Review.qualityRating` | Average rating × 20, plus reputation event impact |
| Delivery | 20% | `Review.deliveryRating` | Average rating × 20, plus reputation event impact |
| Communication | 15% | `Review.communicationRating` | Average rating × 20, plus reputation event impact |
| Compliance | 15% | `Verification` records | (approved verifications / total verifications) × 100 |

**Default baseline:** If no reviews exist, all review-based scores start at 50.0.
**Reputation events:** `ReputationEvent.scoreImpact` (positive or negative) is added to all review-based scores.
**Clamping:** All scores clamped to [0, 100].

**Overall formula:**
```
overall = payment×0.25 + quality×0.25 + delivery×0.20 + communication×0.15 + compliance×0.15
```

### 5. Dispute Resolution

- Disputes can be raised by buyer or seller when escrow is `in_escrow` or `funded`
- Statuses: `open` → `resolved` | `escalated`
- Resolution is restricted to admin role only
- Resolution text is analyzed to determine escrow fate:
  - Contains "refund"/"cancel"/"return to buyer" → escrow moves to `refunded`
  - Otherwise → escrow resumes `in_escrow`
<!-- TRACKING: AI dispute analysis still uses mock recommendations — real LLM integration tracked as future work -->
- AI recommendations are currently mock-generated (TODO: integrate real AI analysis)

### 6. Audit Logging

Every escrow state change creates an `EscrowAuditLog` entry:
- `created`, `payment_initiated`, `activated`, `milestone_released`, `completed`
- `cancelled`, `dispute_raised`, `dispute_resolved`
- Each log captures: `escrowId`, `action`, `actor`, `details`, `metadata` (JSON)

### 7. Real-time Events

`eventBus.emit('escrow.updated', payload, tenantId)` fires on:
- Escrow creation
- Activation
- Milestone release
- Cancellation
- Dispute raise

Events are tenant-scoped for SSE delivery.

## Consequences

### Positive
- All escrow routes now use correct tenant isolation via Business joins
- Authorization checks compare Business IDs (not User IDs) for buyer/seller verification
- Status transition guards prevent illegal state changes
- Dispute creation and resolution have proper guards
- Trust scores are calculated from real data (reviews, verifications, reputation events)

### Negative
- AI risk score on escrow creation is random (`Math.random()`) — not a real risk assessment
- AI dispute recommendations are mock strings — not real analysis
- No automated dispute timeout (disputes can stay `open` indefinitely)
- The legacy `escrow/route.ts` (top-level) duplicates some functionality of `escrow/transactions/route.ts`

### Risks
- **Double-release race:** Two concurrent release requests for the same milestone could both pass the status check. Mitigated by: single-threaded Node.js event loop and `findFirst` + `update` not being atomic. Future: wrap release in `db.$transaction()` with `SELECT FOR UPDATE` equivalent.
- **Dispute resolution text parsing:** Keyword-based routing (`resolution.includes('refund')`) is fragile. Future: use explicit `outcome` field instead of free-text parsing.

### Future Work
- Replace random AI risk score with real fraud/risk model
- Replace mock AI dispute recommendations with LLM analysis
- Add dispute SLA (auto-escalate after N days)
- Add atomic milestone release transaction
- Deprecate or remove legacy `escrow/route.ts` in favor of `escrow/transactions/route.ts`
