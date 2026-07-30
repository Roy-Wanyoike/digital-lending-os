import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── GET: Single escrow transaction ───────────────────────────
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: escrow });
  } catch (error) {
    console.error("Error fetching escrow transaction:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to fetch escrow transaction" },
      { status: 500 }
    );
  }
}

// ── PUT: Cancel escrow transaction ───────────────────────────
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    if (escrow.status !== "created" && escrow.status !== "funded") {
      return NextResponse.json(
        {
          error: `Cannot cancel escrow with status '${escrow.status}'. Only 'created' or 'funded' escrows can be cancelled.`,
        },
        { status: 409 }
      );
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

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error cancelling escrow transaction:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to cancel escrow transaction" },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry(getHandler, '/api/escrow/transactions/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/escrow/transactions/[id]');
