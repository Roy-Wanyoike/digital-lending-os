import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, successResponse, errorResponse } from '@/lib/auth/api-helpers';

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

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

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

    // Execute a single query with count via Prisma
    const [accounts, total] = await db.$transaction([
      db.account.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      db.account.count({ where }),
    ]);

    return successResponse({ data: accounts, total });
  } catch (error: any) {
    console.error('Accounts GET error:', error);
    return errorResponse('Failed to fetch accounts', 500);
  }
}
