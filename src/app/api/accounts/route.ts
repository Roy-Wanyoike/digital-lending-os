import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser,  } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
/**
 * GET /api/accounts
 *
 * Authenticated endpoint to list accounts.
 * - Admin users: see all accounts in their tenant.
 * - Non-admin users: see only their own account.
 *
 * Query params:
 *   ?role=buyer       Filter by role
 *   ?search=john      Search by name or email (case-insensitive)
 */

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  tenantId: true,
  businessId: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return unauthorized('Authentication required');

    // Build the base where clause depending on role
    const baseWhere: any =
      user.role === 'admin'
        ? { tenantId: user.tenantId }
        : { id: user.id };

    // Extract optional query filters
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

    // Compose the full where clause
    const where: any = { ...baseWhere };

    if (roleFilter) {
      where.role = roleFilter;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Execute a single query with count via Prisma
    const [accounts, total] = await db.$transaction([
      db.account.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.account.count({ where }),
    ]);

    return ok({ data: accounts, total, pagination: { page, limit, offset, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) {
    console.error('Accounts GET error:', error);
    return error('Failed to fetch accounts');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/accounts');
