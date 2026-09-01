import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, created, unauthorized, forbidden, conflict, validationError, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

// ─── Zod Validation ────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  role: z.enum(['admin', 'viewer', 'buyer', 'seller', 'auditor']).optional().default('buyer'),
});

// ─── Invite Token Generation ───────────────────────────────────────────────

/**
 * Generates a 32-byte secure random hex token for the invite flow.
 * The token is returned in plaintext (for the admin to send) and
 * its bcrypt hash is stored in `passwordHash` so it can be verified
 * by the same logic as the forgot-password flow.
 */
function generateInviteToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = bcrypt.hashSync(token, 12);
  return { token, hash };
}

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

  // ── Validate request body ───────────────────────────────────────
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      'Invalid request body',
      parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    );
  }

  const { email, name, role } = parsed.data;

  // ── Check for duplicate within same tenant ─────────────────────
  const existing = await db.account.findFirst({
    where: { email: email.toLowerCase(), tenantId: user.tenantId },
  });
  if (existing) {
    return conflict('User already exists in this tenant');
  }

  // ── Generate invite token ───────────────────────────────────────
  // The bcrypt hash of the token is stored in `passwordHash` so that
  // the same verification logic (bcrypt.compare) used in forgot-password
  // can accept the token and let the user set a real password.
  const { token: inviteToken, hash: inviteTokenHash } = generateInviteToken();

  const newUser = await db.account.create({
    data: {
      email: email.toLowerCase(),
      name,
      role,
      tenantId: user.tenantId,
      isActive: false, // 'invited' state — activated once password is set
      passwordHash: inviteTokenHash,
    },
  });

  // ─── Audit trail ────────────────────────────────
  try {
    const { auditLog } = await import('@/backend/lib/audit-helper')
    await auditLog({ action: 'user.create', resource: 'user', resourceId: newUser.id, userId: user.id, tenantId: user.tenantId, details: { newUserEmail: newUser.email, newUserRole: newUser.role, newUserTenantId: newUser.tenantId, invited: true } })
  } catch (e) { console.error('Audit log failed:', e) }

  // ── Build invite URL ────────────────────────────────────────────
  // Uses the same token shape as forgot-password so a single
  // "set-password?token=<inviteToken>" endpoint can handle both flows.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

  return created({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    status: 'invited' as const,
    isActive: false,
    inviteToken,   // one-time, only returned at creation time
    inviteUrl,     // pre-built URL the admin can send
    createdAt: newUser.createdAt,
  });
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/users');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/users');
