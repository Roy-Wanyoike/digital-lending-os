import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, error, notFound, ok, withErrorHandler } from '@/backend/lib/api-response';
// ── POST: Activate escrow (move to in_escrow) ───────────────
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

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

    if (escrow.status !== "funded") {
      return conflict(`Cannot activate escrow with status '${escrow.status}'. Only 'funded' escrows can be activated.`);
    }

    const updated = await db.escrowTransaction.update({
      where: { id },
      data: { status: "in_escrow" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: { orderBy: { sequence: "asc" } },
        disbursements: true,
      },
    });

    await db.escrowAuditLog.create({
      data: {
        escrowId: id,
        action: "activated",
        actor: escrow.buyerId,
        details: `Escrow ${escrow.txRef} activated and moved to 'in_escrow' status. Funds are now held.`,
      },
    });

    // ─── Emit realtime event ────────────────────────────
    try {
      eventBus.emit('escrow.updated', {
        id: updated.id,
        txRef: escrow.txRef,
        amount: updated.amount,
        currency: updated.currency,
        status: 'in_escrow',
        action: 'activated',
      }, user.tenantId);
    } catch (err) {
      console.error('[escrow.updated] emit failed:', err);
    }

    return ok(updated);
  } catch (err: any) {
    console.error("Error activating escrow transaction:", err);return error("Failed to activate escrow transaction");
  }
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/escrow/transactions/[id]/activate');
