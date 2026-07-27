import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { logAudit } from '@/lib/audit-logger';

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

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

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
      return successResponse({ tenants });
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

    if (!tenant) return errorResponse('Tenant not found', 404);
    return successResponse({ tenants: [tenant] });
  } catch (error: any) {
    console.error('Tenants GET error:', error);
    return errorResponse('Failed to fetch tenants', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, plan, ownerName, ownerEmail, password, referralCode } = body;

    if (!name) return errorResponse('Name is required', 400);

    // --- Registration flow (password provided) ---
    if (password) {
      if (!ownerName || !ownerEmail) {
        return errorResponse('ownerName and ownerEmail are required for registration', 400);
      }

      const tenantSlug = slug || generateSlug(name);

      // Check slug uniqueness
      const existingSlug = await db.tenant.findUnique({ where: { slug: tenantSlug } });
      if (existingSlug) {
        return errorResponse('Tenant slug already exists', 409);
      }

      // Check if owner email already has an account
      const existingAccount = await db.account.findFirst({
        where: { email: ownerEmail.toLowerCase() },
      });
      if (existingAccount) {
        return errorResponse('An account with this email already exists', 409);
      }

      // Validate referral code if provided
      let referrerId: string | null = null;
      if (referralCode) {
        const referrer = await db.account.findUnique({
          where: { referralCode: referralCode.toUpperCase() },
          select: { id: true, isActive: true },
        });
        if (!referrer) return errorResponse('Invalid referral code', 400);
        if (!referrer.isActive) return errorResponse('Referral code is no longer active', 400);
        referrerId = referrer.id;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Create tenant, owner account, and default business in a transaction
      const result = await db.$transaction(async (tx) => {
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
      return successResponse(
        {
          tenant: result.tenant,
          account: { id: result.account.id, email: result.account.email, name: result.account.name },
          business: result.business,
        },
        201
      );
    }

    // --- Admin-only tenant creation (no password) ---
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);
    if (user.role !== 'admin') {
      return errorResponse('Insufficient permissions', 403);
    }

    const tenantSlug = slug || generateSlug(name);

    const existingSlug = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingSlug) {
      return errorResponse('Tenant slug already exists', 409);
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

    return successResponse(tenant, 201);
  } catch (error: any) {
    console.error('Tenants POST error:', error);
    return errorResponse('Failed to create tenant', 500);
  }
}
