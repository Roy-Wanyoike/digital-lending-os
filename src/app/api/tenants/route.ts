import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { logAudit } from '@/lib/audit-logger';
import { ok, created, badRequest, unauthorized, forbidden, notFound, conflict, withErrorHandler } from '@/backend/lib/api-response';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  ownerEmail: z.string().email('Invalid email address').optional(),
  ownerName: z.string().min(1).max(200).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and digit').optional(),
  businessName: z.string().min(2).max(200).optional(),
  plan: z.string().optional(),
  slug: z.string().optional(),
  referralCode: z.string().optional(),
}).refine(
  (data) => !data.password || (data.ownerName && data.ownerEmail),
  { message: 'ownerName and ownerEmail are required when password is provided', path: ['password'] }
);

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

const getHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  if (user.role === 'admin') {
    // Admin can see all tenants
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            businesses: true,
            accounts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok({ tenants });
  }

  // Regular users see their own tenant only
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    include: {
      _count: {
        select: {
          businesses: true,
          accounts: true,
        },
      },
    },
  });

  if (!tenant) return notFound('Tenant not found');
  return ok({ tenants: [tenant] });
});

const postHandler = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const { name, slug, plan, ownerName, ownerEmail, password, referralCode } = parsed.data;

  if (!name) return badRequest('Name is required');

  // --- Registration flow (password provided) ---
  if (password) {
    if (!ownerName || !ownerEmail) {
      return badRequest('ownerName and ownerEmail are required for registration');
    }

    const tenantSlug = slug || generateSlug(name);

    // Check slug uniqueness
    const existingSlug = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingSlug) {
      return conflict('Tenant slug already exists');
    }

    // Check if owner email already has an account
    const existingAccount = await db.account.findFirst({
      where: { email: ownerEmail.toLowerCase() },
    });
    if (existingAccount) {
      return conflict('An account with this email already exists');
    }

    // Validate referral code if provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await db.account.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { id: true, isActive: true },
      });
      if (!referrer) return badRequest('Invalid referral code');
      if (!referrer.isActive) return badRequest('Referral code is no longer active');
      referrerId = referrer.id;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant, owner account, and default business in a transaction
    const result = await db.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug: tenantSlug,
          plan: plan || 'starter',
          ownerEmail: ownerEmail.toLowerCase(),
          ownerName,
        },
      });

      const account = await tx.account.create({
        data: {
          email: ownerEmail.toLowerCase(),
          name: ownerName,
          passwordHash: hashedPassword,
          role: 'admin',
          tenantId: tenant.id,
          isActive: true,
          referredBy: referrerId || undefined,
        },
      });

      const business = await tx.business.create({
        data: {
          name: `${name} - Main`,
          country: 'US',
          tenantId: tenant.id,
        },
      });

      // Link account to the created business
      await tx.account.update({
        where: { id: account.id },
        data: { businessId: business.id },
      });

      return { tenant, account, business };
    });

    // Audit log the registration
    logAudit('tenant.register', result.account.id, `Tenant "${name}" registered by ${result.account.email}`, {
      tenantId: result.tenant.id,
      accountId: result.account.id,
      tenantSlug: result.tenant.slug,
      plan: result.tenant.plan,
    });

    // Return tenant info (don't expose password hash)
    return created({
      tenant: result.tenant,
      account: { id: result.account.id, email: result.account.email, name: result.account.name },
      business: result.business,
    });
  }

  // --- Admin-only tenant creation (no password) ---
  const user = await requireAuth(req);
  if (user.role !== 'admin') {
    return forbidden();
  }

  const tenantSlug = slug || generateSlug(name);

  const existingSlug = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existingSlug) {
    return conflict('Tenant slug already exists');
  }

  const tenant = await db.tenant.create({
    data: {
      name,
      slug: tenantSlug,
      plan: plan || 'starter',
      ownerEmail: user.email,
      ownerName: user.email, // fallback to email; caller can update later
    },
  });

  // Audit log the admin tenant creation
  logAudit('tenant.create', user.id, `Admin created tenant "${name}"`, {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    plan: tenant.plan,
    createdBy: user.email,
  });

  return created(tenant);
});

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/tenants');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/tenants');
