import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth/api-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── Zod Schema ───────────────────────────────────────────────
const resolveDisputeSchema = z.object({
  resolution: z.string().min(1, "Resolution is required"),
  status: z.enum(["resolved", "escalated"] as const, {
    message: "Status must be 'resolved' or 'escalated'",
  }),
});

// ── PUT: Resolve a dispute ──────────────────────────────────
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id, disputeId } = await params;
    const body = await request.json();
    const parsed = resolveDisputeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { resolution, status: disputeStatus } = parsed.data;

    // Verify escrow belongs to tenant
    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
    });

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    // Verify dispute exists and belongs to this escrow
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute || dispute.escrowId !== id) {
      return NextResponse.json(
        { error: "Dispute not found for this escrow" },
        { status: 404 }
      );
    }

    if (dispute.status === "resolved" || dispute.status === "escalated") {
      return NextResponse.json(
        { error: `Dispute is already '${dispute.status}'` },
        { status: 409 }
      );
    }

    // Only admins can resolve disputes
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can resolve disputes' },
        { status: 403 }
      );
    }

    // Determine new escrow status based on resolution
    let newEscrowStatus: string;
    const resolutionLower = resolution.toLowerCase();

    if (disputeStatus === "escalated") {
      newEscrowStatus = "disputed"; // stays disputed
    } else if (
      resolutionLower.includes("refund") ||
      resolutionLower.includes("cancel") ||
      resolutionLower.includes("return to buyer")
    ) {
      newEscrowStatus = "refunded";
    } else {
      newEscrowStatus = "in_escrow"; // resume escrow
    }

    const now = new Date();

    const updated = await db.$transaction(async (tx: any) => {
      // Update dispute
      const resolvedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          resolution,
          status: disputeStatus,
          resolvedAt: disputeStatus === "resolved" ? now : null,
        },
      });

      // Update escrow status
      await tx.escrowTransaction.update({
        where: { id },
        data: { status: newEscrowStatus },
      });

      // Create audit log
      await tx.escrowAuditLog.create({
        data: {
          escrowId: id,
          action: "dispute_resolved",
          details: `Dispute ${disputeId} ${disputeStatus}. Resolution: ${resolution}. Escrow status changed to '${newEscrowStatus}'.`,
          metadata: JSON.stringify({
            disputeId,
            resolution,
            disputeStatus,
            newEscrowStatus,
          }),
        },
      });

      return resolvedDispute;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}

export const PUT = withApiTelemetry(putHandler, '/api/escrow/transactions/[id]/disputes/[disputeId]');
