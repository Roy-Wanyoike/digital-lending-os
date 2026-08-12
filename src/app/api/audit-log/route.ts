import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser,  } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required');

    const { searchParams } = new URL(request.url);

    const escrowId = searchParams.get('escrowId') || undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    // Resolve the user's business IDs using cached lookup
    let businessIds = await getTenantBusinessIds(user.tenantId, db);

    // If escrowId is provided, verify it belongs to the user's tenant (parallel with business fetch)
    let escrowCheck: Promise<void> | null = null;
    if (escrowId) {
      escrowCheck = (async () => {
        const escrow = await db.escrowTransaction.findFirst({
          where: {
            id: escrowId,
            OR: [
              { buyer: { tenantId: user.tenantId } },
              { seller: { tenantId: user.tenantId } },
            ],
          },
          select: { id: true },
        });
        if (!escrow) throw new Error('NOT_FOUND');
      })();
    }

    if (escrowCheck) {
      try {
        await escrowCheck;
      } catch {
        return notFound('Escrow not found');
      }
    }

    if (businessIds.length === 0) {
      return ok({ data: [], total: 0 });
    }

    // Build tenant-scoped where: only audit logs for escrows involving this user's businesses
    const where: any = {
      escrow: {
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

    return ok({ data: logs, total });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return error('Failed to fetch audit logs');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/audit-log');
