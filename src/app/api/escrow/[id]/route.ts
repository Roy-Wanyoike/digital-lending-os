import { NextRequest } from 'next/server';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { eventBus } from '@/backend/services/event-bus';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, conflict, error, forbidden, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) return unauthorized('Authentication required');
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
        buyer: { select: { id: true, name: true, country: true } },
        seller: { select: { id: true, name: true, country: true } },
      },
    });

    if (!escrow) return notFound('Escrow transaction not found');
    return ok(escrow);
  } catch (error: any) {console.error('Escrow GET by ID error:', error);
    return error('Failed to fetch escrow transaction');
  }
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      include: {
        buyer: { select: { id: true, tenantId: true } },
        seller: { select: { id: true, tenantId: true } },
      },
    });

    if (!escrow) return notFound('Escrow transaction not found');

    if (action === 'release') {
      if (escrow.status !== 'in_escrow') {
        return conflict(`Cannot release escrow with status '${escrow.status}'. Only 'in_escrow' escrows can release funds.`);
      }
      if (user.role !== 'admin') {
        // Verify user's business is the buyer for this escrow
        const userBusiness = await db.business.findFirst({
          where: { id: user.businessId, tenantId: user.tenantId },
          select: { id: true },
        });
        if (!userBusiness || escrow.buyerId !== userBusiness.id) {
          return forbidden('Only buyer or admin can release funds');
        }
      }
      const updated = await db.escrowTransaction.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date(), releasedAt: new Date() },
      });

      try {
        eventBus.emit('escrow.updated', {
          id: updated.id, txRef: updated.txRef,
          amount: updated.amount, currency: updated.currency,
          status: 'completed', action: 'released',
        }, user.tenantId);
      } catch (err) {
        console.error('[escrow.updated] emit failed:', err);
      }

      return ok(updated);
    }

    if (action === 'dispute') {
      if (!['in_escrow', 'funded'].includes(escrow.status)) {
        return conflict(`Cannot dispute escrow with status '${escrow.status}'. Only 'in_escrow' or 'funded' escrows can be disputed.`);
      }
      const updated = await db.escrowTransaction.update({
        where: { id },
        data: { status: 'disputed' },
      });

      await db.escrowAuditLog.create({
        data: {
          escrowId: id,
          action: 'dispute_raised',
          details: `Dispute raised on escrow ${escrow.txRef} via PATCH action.`,
        },
      });

      return ok(updated);
    }

    return badRequest('Invalid action. Use "release" or "dispute"');
  } catch (error: any) {console.error('Escrow PATCH error:', error);
    return error('Failed to update escrow transaction');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/escrow/[id]');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/escrow/[id]');
