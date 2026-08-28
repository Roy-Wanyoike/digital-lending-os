/**
 * Tenant Service
 * 
 * Business logic for Digital Credit Provider (DCP) tenant management.
 * Handles CRUD operations, plan management, and tenant configuration.
 */

import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../lib/db';
import { TenantPlan, TenantStatus } from '../types';

export interface CreateTenantInput {
  name: string;
  slug: string;
  companyName: string;
  licenseNumber?: string;
  phone: string;
  email: string;
  physicalAddress?: string;
  website?: string;
  plan?: TenantPlan;
  branding?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  companyName?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  physicalAddress?: string;
  website?: string;
  branding?: Record<string, unknown>;
  config?: Record<string, unknown>;
  // Only SUPER_ADMIN can change these
  status?: TenantStatus;
  plan?: TenantPlan;
}

export interface TenantQueryParams {
  page?: number;
  limit?: number;
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
}

export class TenantService {
  /**
   * List tenants with filtering and pagination
   */
  async findAll(params: TenantQueryParams, userRole: string, userTenantId: string | null) {
    const { page = 1, limit = 20, status, plan, search } = params;

    // Non-super-admins can only see their own tenant
    if (userRole !== 'SUPER_ADMIN' && userTenantId) {
      const tenant = await db.tenant.findUnique({
        where: { id: userTenantId },
      });
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        items: [tenant],
        pagination: { page, limit, total: 1, pages: 1 },
      };
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

    return {
      items: tenants,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get tenant by ID with full details
   */
  async findById(id: string) {
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
      const error: any = new Error('Tenant not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return tenant;
  }

  /**
   * Get tenant by slug
   */
  async findBySlug(slug: string) {
    return db.tenant.findUnique({
      where: { slug },
    });
  }

  /**
   * Create new tenant
   */
  async create(data: CreateTenantInput) {
    // Check slug uniqueness
    const existingSlug = await db.tenant.findUnique({ where: { slug: data.slug } });
    if (existingSlug) {
      const error: any = new Error('A tenant with this slug already exists');
      error.code = 'SLUG_EXISTS';
      throw error;
    }

    // Calculate pricing based on plan
    const planPricing = config.tenant.plans[data.plan || 'STARTER'];

    const tenant = await db.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        companyName: data.companyName,
        licenseNumber: data.licenseNumber || null,
        phone: data.phone,
        email: data.email,
        physicalAddress: data.physicalAddress || null,
        website: data.website || null,
        plan: data.plan || 'STARTER',
        monthlyFee: planPricing.monthlyFee,
        transactionRate: planPricing.transactionRate,
        branding: JSON.stringify(data.branding || {}),
        config: JSON.stringify(data.config || {}),
        status: 'PENDING_ONBOARDING',
      },
    });

    logger.info('Tenant created', { tenantId: tenant.id, slug: tenant.slug });

    return tenant;
  }

  /**
   * Update tenant
   */
  async update(id: string, data: UpdateTenantInput, updaterRole: string, updaterTenantId: string | null) {
    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      const error: any = new Error('Tenant not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'companyName', 'licenseNumber', 'phone', 'email', 'physicalAddress', 'website'];

    for (const field of allowedFields) {
      if (data[field as keyof UpdateTenantInput] !== undefined) {
        updateData[field] = data[field as keyof UpdateTenantInput];
      }
    }

    if (data.branding !== undefined) {
      updateData.branding = JSON.stringify(data.branding);
    }
    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }

    // Only SUPER_ADMIN can change plan/status
    if (updaterRole === 'SUPER_ADMIN') {
      if (data.plan) updateData.plan = data.plan;
      if (data.status) updateData.status = data.status;
    }

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    logger.info('Tenant updated', { tenantId: id, updatedBy: updaterRole });

    return updatedTenant;
  }

  /**
   * Soft delete/deactivate tenant
   */
  async deactivate(id: string): Promise<void> {
    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      const error: any = new Error('Tenant not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    await db.tenant.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });

    logger.info('Tenant deactivated', { tenantId: id });
  }

  /**
   * Activate tenant
   */
  async activate(id: string): Promise<void> {
    await db.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Update tenant configuration
   */
  async updateConfig(id: string, configData: Record<string, unknown>): Promise<void> {
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const currentConfig = JSON.parse(tenant.config || '{}');
    const mergedConfig = { ...currentConfig, ...configData };

    await db.tenant.update({
      where: { id },
      data: { config: JSON.stringify(mergedConfig) },
    });
  }

  /**
   * Get tenant usage statistics
   */
  async getUsageStats(tenantId: string) {
    const [
      userCount,
      customerCount,
      activeLoans,
      totalDisbursed,
      monthlyTransactions,
    ] = await Promise.all([
      db.user.count({ where: { tenantId, isActive: true } }),
      db.customer.count({ where: { tenantId } }),
      db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.loan.aggregate({
        where: { tenantId },
        _sum: { principal: true },
      }),
      db.transaction.count({
        where: {
          tenantId,
          occurredAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      users: userCount,
      customers: customerCount,
      activeLoans,
      totalDisbursed: totalDisbursed._sum.principal || 0,
      monthlyTransactions,
    };
  }
}

// Export singleton instance
export const tenantService = new TenantService();
