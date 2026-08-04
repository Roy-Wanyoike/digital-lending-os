import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";
import { processEscrow } from "@/backend/services/temporal-bridge";
import { recordPaymentTransition } from "@/backend/lib/payment/route-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── Zod Schema ───────────────────────────────────────────────
const releaseSchema = z.object({
  milestoneId: z.string().min(1, "Milestone ID is required"),
});

// ── POST: Release funds for a milestone ─────────────────────
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = releaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { milestoneId } = parsed.data;
    const now = new Date();

    // Wrap fetch, validation, and all DB mutations in a single transaction for atomicity
    const updatedEscrow = await db.$transaction(async (tx: any) => {
      // Fetch escrow inside transaction for serializable read
      const escrow = await tx.escrowTransaction.findFirst({
        where: {
          id,
          OR: [
            { buyer: { tenantId: user.tenantId } },
            { seller: { tenantId: user.tenantId } },
          ],
        },
        include: {
          milestones: { orderBy: { sequence: "asc" } },
          buyer: { select: { id: true, name: true, tenantId: true } },
          seller: { select: { id: true, name: true, tenantId: true } },
        },
      });

      if (!escrow) throw new Error('Escrow transaction not found');
      if (escrow.status !== 'in_escrow') throw new Error(`Cannot release funds from escrow with status '${escrow.status}'. Only 'in_escrow' escrows can release funds.`);

      // Authorization check (preserve the BUG 10 fix)
      const isBuyer = escrow.buyer?.tenantId === user.tenantId;
      if (!isBuyer && !['admin', 'auditor'].includes(user.role)) {
        throw new Error('Only the buyer or an administrator can release escrow funds');
      }

      // Find the milestone
      const milestone = escrow.milestones.find((m: any) => m.id === milestoneId);
      if (!milestone) throw new Error('Milestone not found for this escrow');
      if (milestone.status === 'released') throw new Error('Milestone has already been released');

      // Update milestone status
      await tx.escrowMilestone.update({
        where: { id: milestoneId },
        data: {
          status: "released",
          releasedAt: now,
        },
      });

      // Create disbursement (status: processing — actual wallet credit is async)
      const disbursement = await tx.disbursement.create({
        data: {
          escrowId: id,
          milestoneId,
          amount: milestone.amount,
          currency: escrow.currency,
          status: "processing",
          paymentRef: `DIS-${escrow.txRef}-${milestone.sequence}`,
        },
      });

      // Check if all milestones are released
      const allMilestones = await tx.escrowMilestone.findMany({
        where: { escrowId: id },
      });
      const allReleased = allMilestones.every((m: any) => m.status === "released");
      const totalReleased = allMilestones
        .filter((m: any) => m.status === "released")
        .reduce((sum: any, m: any) => sum + m.amount, 0);

      const updateData: Record<string, unknown> = {
        releasedAmount: totalReleased,
      };

      if (allReleased) {
        updateData.status = "completed";
        updateData.completedAt = now;
      } else {
        updateData.status = "partial_release";
      }

      const result = await tx.escrowTransaction.update({
        where: { id },
        data: updateData,
        include: {
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          milestones: { orderBy: { sequence: "asc" } },
          disbursements: true,
        },
      });

      // Audit log for milestone release
      await tx.escrowAuditLog.create({
        data: {
          escrowId: id,
          action: "milestone_released",
          details: `Milestone "${milestone.title}" (seq ${milestone.sequence}) released. Amount: ${milestone.amount} ${escrow.currency}. Disbursement ${disbursement.paymentRef} created.`,
          metadata: JSON.stringify({
            milestoneId,
            milestoneTitle: milestone.title,
            amount: milestone.amount,
            disbursementId: disbursement.id,
          }),
        },
      });

      // If all released, add completion log
      if (allReleased) {
        await tx.escrowAuditLog.create({
          data: {
            escrowId: id,
            action: "completed",
            details: `All milestones released. Escrow ${escrow.txRef} completed. Total released: ${totalReleased} ${escrow.currency}.`,
          },
        });
      }

      return { result, disbursementId: disbursement.id, milestoneTitle: milestone.title, milestoneSequence: milestone.sequence, milestoneAmount: milestone.amount };
    });

    const { result: escrowResult, disbursementId, milestoneTitle, milestoneSequence, milestoneAmount } = updatedEscrow;

    // ─── Emit realtime event ────────────────────────────
    try {
      eventBus.emit('escrow.updated', {
        id: escrowResult.id,
        txRef: escrowResult.txRef,
        amount: escrowResult.amount,
        currency: escrowResult.currency,
        status: escrowResult.status,
        action: 'milestone_released',
        milestoneId,
        milestoneTitle,
      }, user.tenantId);
    } catch (err) {
      console.error('[escrow.updated] emit failed:', err);
    }

    // Wire to Temporal workflow (falls back to direct execution if Temporal is unavailable)
    void processEscrow({ escrowId: id, milestoneId, milestoneSequence, tenantId: user.tenantId });

    // ── State machine: record payment transition (release) ──
    void recordPaymentTransition(id, 'in_escrow', escrowResult.status, user.email || user.id || 'authenticated');

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'escrow.release', resource: 'escrow', resourceId: id, userId: user.id, tenantId: user.tenantId, details: { milestoneId, milestoneTitle, amount: milestoneAmount, disbursementId, newStatus: escrowResult.status } })
    } catch (e) { console.error('Audit log failed:', e) }

    return NextResponse.json({ data: escrowResult });
  } catch (error) {
    console.error("Error releasing escrow funds:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });

    // Map thrown errors from inside the transaction to proper HTTP status codes
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Escrow transaction not found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.startsWith('Cannot release')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.startsWith('Only the buyer')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes('Milestone')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Failed to release escrow funds" },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry(postHandler, '/api/escrow/transactions/[id]/release');
