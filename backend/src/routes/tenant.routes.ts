/**
 * Tenant (DCP) Management Routes
 * 
 * CRUD operations for Digital Credit Provider tenants.
 * Only SUPER_ADMIN can create/manage tenants.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
} from '../utils/response';
import { validate, createTenantSchema, paginationSchema } from '../middleware/validation';
import { AuthRequest, TenantPlan, TenantStatus } from '../types';

export const tenantRoutes = Router();

// All tenant routes require authentication
tenantRoutes.use(authenticate);

/**
 * GET /api/v1/tenants
 * List all tenants (SUPER_ADMIN sees all, others see their own)
 */
tenantRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as TenantStatus | undefined;
    const plan = req.query.plan as TenantPlan | undefined;
    const search = req.query.search as string | undefined;

    // Non-super-admins can only see their own tenant
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId) {
      const tenant = await db.tenant.findUnique({
        where: { id: req.user.tenantId },
      });
      
      if (!tenant) {
        return notFoundResponse(res, 'Tenant');
      }

      return successResponse(res, [tenant]);
    }

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (plan) where.plan = plan;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              customers: true,
              loans: true,
              loanApplications: true,
            },
          },
        },
      }),
      db.tenant.count({ where }),
    ]);

    return paginatedResponse(res, tenants, page, limit, total);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch tenants');
  }
});

/**
 * GET /api/v1/tenants/:id
 * Get tenant by ID
 */
tenantRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId !== id) {
      return require('../utils/response').forbiddenResponse(res, 'Access denied');
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            loans: true,
            loanApplications: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      return notFoundResponse(res, 'Tenant');
    }

    return successResponse(res, tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch tenant');
  }
});

/**
 * POST /api/v1/tenants
 * Create new tenant (SUPER_ADMIN only)
 */
tenantRoutes.post('/', requireRoles(['SUPER_ADMIN']), validate(createTenantSchema), async (req: AuthRequest, res) => {
  try {
    const body = req.body;

    // Check slug uniqueness
    const existingSlug = await db.tenant.findUnique({ where: { slug: body.slug } });
    if (existingSlug) {
      return conflictResponse(res, 'A tenant with this slug already exists', 'SLUG_EXISTS');
    }

    // Calculate pricing based on plan
    const planPricing = config.tenant.plans[body.plan] || config.tenant.plans.STARTER;

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        companyName: body.companyName,
        licenseNumber: body.licenseNumber || null,
        phone: body.phone,
        email: body.email,
        physicalAddress: body.physicalAddress || null,
        website: body.website || null,
        plan: body.plan,
        monthlyFee: planPricing.monthlyFee,
        transactionRate: planPricing.transactionRate,
        branding: JSON.stringify(body.branding || {}),
        config: JSON.stringify(body.config || {}),
        status: 'PENDING_ONBOARDING',
      },
    });

    return createdResponse(res, tenant, 'Tenant created successfully. Awaiting onboarding.');
  } catch (error) {
    console.error('Error creating tenant:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to create tenant');
  }
});

/**
 * PUT /api/v1/tenants/:id
 * Update tenant (SUPER_ADMIN or TENANT_ADMIN of same tenant)
 */
tenantRoutes.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId !== id) {
      return require('../utils/response').forbiddenResponse(res, 'Access denied');
    }

    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return notFoundResponse(res, 'Tenant');
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'companyName', 'licenseNumber', 'phone', 'email', 'physicalAddress', 'website', 'branding', 'config'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = ['branding', 'config'].includes(field)
          ? JSON.stringify(req.body[field])
          : req.body[field];
      }
    }

    // Only SUPER_ADMIN can change plan/status
    if (req.user?.role === 'SUPER_ADMIN') {
      if (req.body.plan) updateData.plan = req.body.plan;
      if (req.body.status) updateData.status = req.body.status;
    }

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    return successResponse(res, updatedTenant, 'Tenant updated successfully');
  } catch (error) {
    console.error('Error updating tenant:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to update tenant');
  }
});

/**
 * DELETE /api/v1/tenants/:id
 * Soft delete tenant (SUPER_ADMIN only)
 */
tenantRoutes.delete('/:id', requireRoles(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return notFoundResponse(res, 'Tenant');
    }

    // Soft delete - set status to DEACTIVATED
    await db.tenant.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });

    return successResponse(res, null, 'Tenant deactivated successfully');
  } catch (error) {
    console.error('Error deactivating tenant:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to deactivate tenant');
  }
});
