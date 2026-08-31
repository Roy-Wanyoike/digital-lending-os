/**
 * Tenant (DCP) Management Routes
 * 
 * CRUD operations for Digital Credit Provider tenants.
 * Only SUPER_ADMIN can create/manage tenants.
 * 
 * @openapi
 * tags: [Tenants]
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { config } from '../config';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { validate, createTenantSchema, paginationSchema } from '../middleware/validation';
import { AuthRequest, TenantPlan, TenantStatus } from '../types';

export const tenantRoutes = Router();

// All tenant routes require authentication
tenantRoutes.use(authenticate);

/**
 * @openapi
 * /tenants:
 *   get:
 *     summary: List all tenants
 *     description: |
 *       Retrieve a paginated list of tenants. 
 *       - SUPER_ADMIN users see all tenants
 *       - Other roles only see their own tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PENDING_ONBOARDING, SUSPENDED, DEACTIVATED]
 *         description: Filter by tenant status
 *       - in: query
 *         name: plan
 *         schema:
 *           $ref: '#/components/schemas/Tenant/properties/plan'
 *         description: Filter by subscription plan
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, slug, or company name
 *     responses:
 *       200:
 *         description: List of tenants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 */
tenantRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;
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
 * @openapi
 * /tenants/{id}:
 *   get:
 *     summary: Get tenant by ID
 *     description: Retrieve detailed information about a specific tenant including counts of related entities.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant unique identifier
 *     responses:
 *       200:
 *         description: Tenant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tenantRoutes.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
 * @openapi
 * /tenants:
 *   post:
 *     summary: Create new tenant
 *     description: |
 *       Create a new Digital Credit Provider tenant.
 *       Only SUPER_ADMIN role can create tenants.
 *       New tenants start with PENDING_ONBOARDING status.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenantRequest'
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *                 message:
 *                   type: string
 *                   example: "Tenant created successfully. Awaiting onboarding."
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires SUPER_ADMIN role
 *       409:
 *         description: Slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
    const planPricing = config.tenant.plans[body.plan as keyof typeof config.tenant.plans] || config.tenant.plans.STARTER;

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
 * @openapi
 * /tenants/{id}:
 *   put:
 *     summary: Update tenant
 *     description: |
 *       Update tenant information.
 *       - SUPER_ADMIN can update all fields including plan and status
 *       - TENANT_ADMIN can only update their own tenant's basic info
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               companyName:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               physicalAddress:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               branding:
 *                 type: object
 *               config:
 *                 type: object
 *               plan:
 *                 type: string
 *                 enum: [STARTER, PROFESSIONAL, ENTERPRISE]
 *                 description: Only SUPER_ADMIN can change this
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PENDING_ONBOARDING, SUSPENDED, DEACTIVATED]
 *                 description: Only SUPER_ADMIN can change this
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *                 message:
 *                   type: string
 *                   example: "Tenant updated successfully"
 *       403:
 *         description: Access denied
 *       404:
 *         description: Tenant not found
 */
tenantRoutes.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
 * @openapi
 * /tenants/{id}:
 *   delete:
 *     summary: Deactivate tenant
 *     description: Soft delete a tenant by setting its status to DEACTIVATED. Only SUPER_ADMIN can perform this action.
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tenant deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tenant deactivated successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires SUPER_ADMIN role
 *       404:
 *         description: Tenant not found
 */
tenantRoutes.delete('/:id', requireRoles(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);

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
