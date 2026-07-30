# ADR-004: Escrow & Trust Threat Model

**Status:** Accepted
**Date:** 2025-07-30
**Owner:** escrow-trust-owner (D4)
**Supersedes:** None

---

## Threat Landscape

The escrow system holds funds in trust between two parties. It is the highest-value attack surface in Youngsend because a compromised escrow flow directly results in financial loss.

### STRIDE Analysis

| Threat | Category | Target | Severity | Mitigation Status |
|--------|----------|--------|----------|-------------------|
| Cross-tenant escrow access | Spoofing/Tampering | All escrow routes | **Critical** | **Fixed** (D4) — was querying non-existent `tenantId` column |
| Buyer ID vs User ID confusion | Tampering | `escrow/[id]` PATCH | **Critical** | **Fixed** (D4) — now compares Business IDs |
| Premature fund release | Tampering | Release route | **High** | Mitigated — status guard requires `in_escrow` |
| Unauthorized dispute resolution | Elevation of Privilege | Dispute resolve | **High** | **Fixed** (D4) — admin role check added |
| Dispute on completed escrow | Tampering | Dispute create | **Medium** | **Fixed** (D4) — status guard added |
| Fund theft via status bypass | Tampering | All state transitions | **High** | Mitigated — each route validates current status |
| Double milestone release | Tampering | Release route | **Medium** | Partial — no DB-level lock; Node.js single-thread provides implicit safety |
| Score manipulation | Tampering | Trust score POST | **Medium** | Mitigated — scores are recalculated from source data, not user-supplied |
| Dispute abuse (frivolous) | Denial of Service | Dispute create | **Medium** | Open — no rate limiting or dispute count limits |
| AI risk score manipulation | Tampering | Escrow create | **Low** | Open — risk score is random; no user input affects it |
| Audit log tampering | Repudiation | All routes | **Low** | Mitigated — audit logs are append-only, no update/delete exposed |

---

## Detailed Threat Analysis

### T1: Cross-Tenant Escrow Access (FIXED)

**Description:** The `escrow/[id]/route.ts` used `where: { id, tenantId: user.tenantId }`. Since `EscrowTransaction` has no `tenantId` column, this would cause a Prisma runtime error, but a different implementation could expose data across tenants.

**Attack scenario:**
1. Attacker is tenant B
2. Requests `GET /api/escrow/[tenant-A-escrow-id]`
3. If tenant check is bypassed or broken, attacker sees tenant A's escrow details

**Fix applied (D4):** Replaced with OR-based Business join query matching all other escrow routes.

**Residual risk:** None — consistent pattern across all routes.

### T2: Buyer ID vs User ID Authorization Bypass (FIXED)

**Description:** The PATCH release action compared `escrow.buyerId !== user.id`. Since `buyerId` is a Business ID and `user.id` is a User ID, this check would **always fail** for non-admins (even the actual buyer), effectively locking out all users from releasing funds, or if the check were reversed, allowing any user to release.

**Fix applied (D4):** Now resolves `user.businessId` via Business query and compares against `escrow.buyerId`.

**Residual risk:** Low — the `user.businessId` is set during session creation. If a user has multiple businesses, only the session's active business is checked.

### T3: Premature Fund Release

**Description:** An attacker attempts to release funds from an escrow that hasn't been fully funded or activated.

**Current mitigations:**
- Release route checks `escrow.status !== 'in_escrow'` and returns 409
- Milestone release checks `milestone.status === 'released'` and rejects duplicates
- All status transitions are validated before DB update

**Residual risk:** Low — status checks are correct. Race condition possible but unlikely (see T5).

### T4: Unauthorized Dispute Resolution (FIXED)

**Description:** Any authenticated user could resolve any dispute, potentially refunding funds to themselves.

**Attack scenario:**
1. Buyer raises dispute on escrow
2. Seller resolves their own dispute with "refund" → funds returned to buyer
3. Or seller resolves with no refund → escrow resumes, seller gets paid without delivering

**Fix applied (D4):** Added `user.role !== 'admin'` check. Only admins can resolve disputes.

**Residual risk:** Low — admin accounts must be protected via MFA and strong passwords.

### T5: Double Milestone Release

**Description:** Two concurrent requests release the same milestone, creating two disbursements for one milestone amount.

**Current mitigations:**
- Node.js single-threaded event loop provides implicit serialization
- `milestone.status === 'released'` check rejects already-released milestones

**Residual risk:** Medium — under high load with multiple Next.js instances, a race condition is possible. The milestone check and update are not atomic.

**Recommended fix:** Wrap release in `db.$transaction()` with a pessimistic lock:
```typescript
const milestone = await tx.escrowMilestone.findFirst({
  where: { id: milestoneId, status: 'pending' },
});
if (!milestone) throw new Error('Milestone not available');
await tx.escrowMilestone.update({ ... });
```

### T6: Score Manipulation

**Description:** A business attempts to inflate its trust score.

**Current mitigations:**
- Trust scores are recalculated from source data (reviews, verifications, reputation events)
- User cannot supply scores directly — only trigger recalculation
- Score is clamped to [0, 100]
- `scoreVersion` is incremented on each recalculation for audit

**Residual risk:** Medium — if an attacker can create fake reviews (review creation is out of scope for D4), they can inflate scores. Review fraud is addressed by the matching/trust domain.

### T7: Dispute Abuse (Denial of Service)

**Description:** A malicious user raises disputes on all their escrows to freeze funds indefinitely.

**Current mitigations:** None — no rate limiting on dispute creation.

**Residual risk:** Medium — disputes freeze escrow funds and require manual admin resolution.

**Recommended fix:**
- Add per-business dispute rate limit (e.g., max 3 open disputes per business)
- Add dispute SLA: auto-escalate after 7 days, auto-resolve after 30 days
- Track dispute history in trust score (repeated frivolous disputers get penalized)

---

## Attack Tree: Fund Theft

``nGoal: Steal funds from escrow
├── Path A: Bypass tenant isolation
│   ├── Query escrow by ID without tenant check → FIXED (D4)
│   └── Modify tenant context in session → mitigated by JWT signing
├── Path B: Force status transition
│   ├── Release from non-in_escrow status → mitigated by status guard
│   ├── Direct DB update (SQL injection) → mitigated by Prisma parameterized queries
│   └── Admin API abuse → mitigated by admin role check
├── Path C: Dispute manipulation
│   ├── Self-resolve dispute → FIXED (D4) — admin only
│   └── Keyword-gaming resolution text → possible (use explicit outcome field)
└── Path D: Payment provider exploit
    ├── Webhook signature bypass → mitigated by timing-safe comparison (ADR-003)
    └── Duplicate webhook → mitigated by state machine idempotency (ADR-003)
```

---

## Security Controls Summary

| Control | Implementation | Status |
|---------|---------------|--------|
| Tenant isolation | Business-relation join queries | Verified (D4) |
| Authorization (release) | Business ID comparison + admin fallback | Fixed (D4) |
| Authorization (dispute resolve) | Admin role check | Fixed (D4) |
| Status transition guards | `if (escrow.status !== 'expected')` checks | Verified (D4) |
| Audit logging | EscrowAuditLog append-only writes | Verified |
| CSRF protection | `requireAuth()` enforces CSRF on mutations | Verified |
| Input validation | Zod schemas on all POST routes | Verified |
| Trust score integrity | Calculated from source data, not user input | Verified |
| Real-time event scoping | `eventBus.emit()` with tenantId | Verified |