import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, created, badRequest, unauthorized, forbidden, conflict, withErrorHandler } from '@/backend/lib/api-response';
import type { ApiUser } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

  const selectFields = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    avatarUrl: true,
    createdAt: true,
    lastLoginAt: true,
    tenant: { select: { id: true, name: true } },
  };

  if (user.role === 'admin') {
    // Admin can see all users across tenants
    const [users, total] = await Promise.all([
      db.account.findMany({
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.account.count(),
    ]);
    return ok({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  // Regular users see only users in their tenant
  const [users, total] = await Promise.all([
    db.account.findMany({
      where: { tenantId: user.tenantId },
      select: selectFields,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.account.count({ where: { tenantId: user.tenantId } }),
  ]);

  return ok({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

const postHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  if (user.role !== 'admin') {
    return forbidden();
  }

  const body = await req.json();
  const { email, name, role } = body;

  if (!email || !name) {
    return badRequest('email and name are required');
  }

  // Check for duplicate within same tenant
  const existing = await db.account.findFirst({
    where: { email: email.toLowerCase(), tenantId: user.tenantId },
  });
  if (existing) {
    return conflict('User already exists in this tenant');
  }

  const newUser = await db.account.create({
    data: {
      email: email.toLowerCase(),
      name,
      role: role || 'buyer',
      tenantId: user.tenantId,
      isActive: true,
      passwordHash: '', // Placeholder — user should set password via invite flow
    },
  });

  // ─── Audit trail ────────────────────────────────
  try {
    const { auditLog } = await import('@/backend/lib/audit-helper')
    await auditLog({ action: 'user.create', resource: 'user', resourceId: newUser.id, userId: user.id, tenantId: user.tenantId, details: { newUserEmail: newUser.email, newUserRole: newUser.role, newUserTenantId: newUser.tenantId } })
  } catch (e) { console.error('Audit log failed:', e) }

  return created(newUser);
});

export const GET = withApiTelemetry(getHandler, '/api/users');

export const POST = withApiTelemetry(postHandler, '/api/users');
