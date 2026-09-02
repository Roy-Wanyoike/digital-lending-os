import { NextRequest } from 'next/server';
import { type AccountRole } from '@prisma/client';
import { db } from '@/lib/db';
import { getApiUser } from '@/lib/auth/api-helpers';
import { ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const ROLE_DEFINITIONS = [
  { role: 'admin', label: 'Administrator', description: 'Full access to all features, user management, and settings' },
  { role: 'buyer', label: 'Buyer', description: 'Can create escrow transactions, make payments, and view invoices' },
  { role: 'seller', label: 'Seller', description: 'Can create payment links, invoices, and manage escrow as seller' },
  { role: 'auditor', label: 'Auditor', description: 'Read-only access to all data, compliance, and audit logs' },
  { role: 'viewer', label: 'Viewer', description: 'Read-only access to dashboards and reports' },
];

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  // Return role definitions with user counts per role in tenant
  const roleCounts: { role: AccountRole; _count: { id: number } }[] = await db.account.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { tenantId: user.tenantId },
  });

  const countMap = Object.fromEntries(
    roleCounts.map((r) => [r.role, r._count.id])
  );

  const roles = ROLE_DEFINITIONS.map(r => ({
    ...r,
    userCount: countMap[r.role] || 0,
  }));

  return ok(roles);
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/roles');
