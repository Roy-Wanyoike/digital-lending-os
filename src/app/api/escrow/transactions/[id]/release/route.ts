import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";
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
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

    // Fetch escrow with milestones
    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      include: {
        milestones: { orderBy: { sequence: "asc" } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    if (escrow.status !== "in_escrow") {
      return NextResponse.json(
        {
          error: `Cannot release funds from escrow with status '${escrow.status}'. Only 'in_escrow' escrows can release funds.`,
        },
        { status: 409 }
      );
    }

    // Find the milestone
    const milestone = escrow.milestones.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found for this escrow" },
        { status: 404 }
      );
    }

    if (milestone.status === "released") {
      return NextResponse.json(
        { error: "Milestone has already been released" },
        { status: 409 }
      );
    }

    const now = new Date();

    // Wrap all DB mutations in a single transaction for atomicity
    const updatedEscrow = await db.$transaction(async (tx: any) => {
      // Update milestone status
      await tx.escrowMilestone.update({
        where: { id: milestoneId },
        data: {
          status: "released",
          releasedAt: now,
        },
      });

      // Create disbursement
      const disbursement = await tx.disbursement.create({
        data: {
          escrowId: id,
          milestoneId,
          amount: milestone.amount,
          currency: escrow.currency,
          status: "completed",
          paymentRef: `DIS-${escrow.txRef}-${milestone.sequence}`,
          completedAt: now,
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

      return { result, disbursementId: disbursement.id };
    });

    const { result: escrowResult, disbursementId } = updatedEscrow;

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
        milestoneTitle: milestone.title,
      }, user.tenantId);
    } catch (err) {
      console.error('[escrow.updated] emit failed:', err);
    }

    // Wire to Temporal workflow (falls back to direct execution if Temporal is unavailable)
    void processEscrow({ escrowId: id, milestoneId, milestoneSequence: milestone.sequence, tenantId: user.tenantId });

    // ── State machine: record payment transition (release) ──
    void recordPaymentTransition(id, 'in_escrow', escrowResult.status, user.email || user.id || 'authenticated');

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'escrow.release', resource: 'escrow', resourceId: id, userId: user.id, tenantId: user.tenantId, details: { milestoneId, milestoneTitle: milestone.title, amount: milestone.amount, disbursementId, newStatus: escrowResult.status } })
    } catch (e) { console.error('Audit log failed:', e) }

    return NextResponse.json({ data: escrowResult });
  } catch (error) {
    console.error("Error releasing escrow funds:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to release escrow funds" },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry(postHandler, '/api/escrow/transactions/[id]/release');
