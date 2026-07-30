import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';
import { eventBus } from '@/backend/services/event-bus';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
        buyer: { select: { id: true, email: true, name: true } },
        seller: { select: { id: true, email: true, name: true } },
      },
    });

    if (!escrow) return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 });
    return NextResponse.json({ data: escrow });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Escrow GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch escrow transaction' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    if (!escrow) return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 });

    if (action === 'release') {
      if (escrow.status !== 'in_escrow') {
        return NextResponse.json(
          { error: `Cannot release escrow with status '${escrow.status}'. Only 'in_escrow' escrows can release funds.` },
          { status: 409 }
        );
      }
      if (user.role !== 'admin') {
        // Verify user's business is the buyer for this escrow
        const userBusiness = await db.business.findFirst({
          where: { id: user.businessId, tenantId: user.tenantId },
          select: { id: true },
        });
        if (!userBusiness || escrow.buyerId !== userBusiness.id) {
          return NextResponse.json({ error: 'Only buyer or admin can release funds' }, { status: 403 });
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

      return NextResponse.json({ data: updated });
    }

    if (action === 'dispute') {
      if (!['in_escrow', 'funded'].includes(escrow.status)) {
        return NextResponse.json(
          { error: `Cannot dispute escrow with status '${escrow.status}'. Only 'in_escrow' or 'funded' escrows can be disputed.` },
          { status: 409 }
        );
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

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Invalid action. Use "release" or "dispute"' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Escrow PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update escrow transaction' }, { status: 500 });
  }
}
