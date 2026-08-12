import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, AuthError } from "@/lib/auth/api-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, error, forbidden, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
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
      return validationError("Validation failed", parsed.error.issues);
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
      return notFound("Escrow transaction not found");
    }

    // Verify dispute exists and belongs to this escrow
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute || dispute.escrowId !== id) {
      return notFound("Dispute not found for this escrow");
    }

    if (dispute.status === "resolved" || dispute.status === "escalated") {
      return conflict(`Dispute is already '${dispute.status}'`);
    }

    // Only admins can resolve disputes
    if (user.role !== 'admin') {
      return forbidden('Only admins can resolve disputes');
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

    return ok(updated);
  } catch (err: any) {
    console.error("Error resolving dispute:", err);return error("Failed to resolve dispute");
  }
}

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/escrow/transactions/[id]/disputes/[disputeId]');
