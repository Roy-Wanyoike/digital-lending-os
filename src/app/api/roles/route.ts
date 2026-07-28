import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

const ROLE_DEFINITIONS = [
  { role: 'admin', label: 'Administrator', description: 'Full access to all features, user management, and settings' },
  { role: 'buyer', label: 'Buyer', description: 'Can create escrow transactions, make payments, and view invoices' },
  { role: 'seller', label: 'Seller', description: 'Can create payment links, invoices, and manage escrow as seller' },
  { role: 'auditor', label: 'Auditor', description: 'Read-only access to all data, compliance, and audit logs' },
  { role: 'viewer', label: 'Viewer', description: 'Read-only access to dashboards and reports' },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    // Return role definitions with user counts per role in tenant
    const roleCounts = await db.account.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { tenantId: user.tenantId },
    });

    const countMap = Object.fromEntries(roleCounts.map((r: any) => [r.role, r._count.id]));

    const roles = ROLE_DEFINITIONS.map(r => ({
      ...r,
      userCount: countMap[r.role] || 0,
    }));

    return successResponse(roles);
  } catch (error: any) {
    console.error('Roles GET error:', error);
    return errorResponse('Failed to fetch roles', 500);
  }
}
