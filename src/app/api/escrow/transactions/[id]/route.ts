import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getApiUser, requireAuth, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, error, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
// ── GET: Single escrow transaction ───────────────────────────
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required')
    const { id } = await params;

    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: { orderBy: { sequence: "asc" } },
        disbursements: true,
        disputes: { orderBy: { createdAt: "desc" } },
        auditLog: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!escrow) {
      return notFound("Escrow transaction not found");
    }

    return ok(escrow);
  } catch (err: any) {
    console.error("Error fetching escrow transaction:", err);return error("Failed to fetch escrow transaction");
  }
}

// ── PUT: Cancel escrow transaction ───────────────────────────
async function putHandler(
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
      select: { id: true, status: true, txRef: true },
    });

    if (!escrow) {
      return notFound("Escrow transaction not found");
    }

    if (escrow.status !== "created" && escrow.status !== "funded") {
      return conflict(`Cannot cancel escrow with status '${escrow.status}'. Only 'created' or 'funded' escrows can be cancelled.`);
    }

    const updated = await db.escrowTransaction.update({
      where: { id },
      data: { status: "cancelled" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: true,
        disbursements: true,
      },
    });

    await db.escrowAuditLog.create({
      data: {
        escrowId: id,
        action: "cancelled",
        details: `Escrow transaction ${escrow.txRef} cancelled from status '${escrow.status}'`,
      },
    });

    // ─── Emit realtime event ────────────────────────────
    try {
      eventBus.emit('escrow.updated', {
        id: updated.id,
        txRef: updated.txRef,
        amount: updated.amount,
        currency: updated.currency,
        status: 'cancelled',
        action: 'cancelled',
      }, user.tenantId);
    } catch (err) {
      console.error('[escrow.updated] emit failed:', err);
    }

    return ok(updated);
  } catch (err: any) {
    console.error("Error cancelling escrow transaction:", err);return error("Failed to cancel escrow transaction");
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/escrow/transactions/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/escrow/transactions/[id]');
