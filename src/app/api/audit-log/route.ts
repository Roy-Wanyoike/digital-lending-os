import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, successResponse, errorResponse } from '@/lib/auth/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return errorResponse('Authentication required', 401);

    const { searchParams } = new URL(request.url);

    const escrowId = searchParams.get('escrowId') || undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    // Build tenant-scoped where: only audit logs for escrows in this tenant
    const where: any = {
      escrow: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id },
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
