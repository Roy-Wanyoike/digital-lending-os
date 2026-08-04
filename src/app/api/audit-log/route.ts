import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, successResponse, errorResponse } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return errorResponse('Authentication required', 401);

    const { searchParams } = new URL(request.url);

    const escrowId = searchParams.get('escrowId') || undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    // Resolve the user's business IDs (buyerId/sellerId on Escrow are Business IDs, not Account IDs)
    const businessIds: string[] = [];
    if (user.businessId) {
      businessIds.push(user.businessId);
    }
    const tenantBusinesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    for (const b of tenantBusinesses) {
      if (!businessIds.includes(b.id)) businessIds.push(b.id);
    }

    if (businessIds.length === 0) {
      return successResponse({ data: [], total: 0 });
    }

    // If escrowId is provided, verify it belongs to the user's tenant
    if (escrowId) {
      const escrow = await db.escrowTransaction.findUnique({
        where: { id: escrowId },
        select: { tenantId: true },
      });
      if (!escrow || escrow.tenantId !== user.tenantId) {
        return errorResponse('Escrow not found', 404);
      }
    }

    // Build tenant-scoped where: only audit logs for escrows involving this user's businesses
    const where: any = {
      escrow: {
        tenantId: user.tenantId,
        OR: [
          { buyerId: { in: businessIds } },
          { sellerId: { in: businessIds } },
        ],
      },
    };

    if (escrowId) {
      where.escrowId = escrowId;
    }

    const [logs, total] = await Promise.all([
      db.escrowAuditLog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          escrow: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
            },
          },
        },
      }),
      db.escrowAuditLog.count({ where }),
    ]);

    return successResponse({ data: logs, total });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return errorResponse('Failed to fetch audit logs', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/audit-log');
