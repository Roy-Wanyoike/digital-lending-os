/**
 * Tenant Controller
 * 
 * Handles HTTP requests for Digital Credit Provider (DCP) tenant management.
 */

import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
  forbiddenResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest, TenantPlan, TenantStatus } from '../types';

export class TenantController {
  /**
   * GET /api/v1/tenants
   * List all tenants (SUPER_ADMIN sees all, others see their own)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = getQueryNumber(req.query, "page", 1) || 1;
      const limit = getQueryNumber(req.query, "limit", 20) || 20;
      const status = req.query.status as TenantStatus | undefined;
      const plan = req.query.plan as TenantPlan | undefined;
      const search = req.query.search as string | undefined;

      const result = await tenantService.findAll(
        { page, limit, status, plan, search },
        req.user?.role || '',
        req.user?.tenantId || null
      );

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching tenants:', error);
      return errorResponse(res, 500, 'Failed to fetch tenants');
    }
  }

  /**
   * GET /api/v1/tenants/:id
   * Get tenant by ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      // Check access
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId !== id) {
        return forbiddenResponse(res, 'Access denied');
      }

      const tenant = await tenantService.findById(id);
      return successResponse(res, tenant);
    } catch (error) {
      logger.error('Error fetching tenant:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Tenant');
      }
      
      return errorResponse(res, 500, 'Failed to fetch tenant');
    }
  }

  /**
   * POST /api/v1/tenants
   * Create new tenant (SUPER_ADMIN only)
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.create(req.body);

      return createdResponse(res, tenant, 'Tenant created successfully. Awaiting onboarding.');
    } catch (error) {
      logger.error('Error creating tenant:', error);
      
      if ((error as any)?.code === 'SLUG_EXISTS') {
        return conflictResponse(res, error instanceof Error ? error.message : 'Slug already exists', 'SLUG_EXISTS');
      }
      
      return errorResponse(res, 500, 'Failed to create tenant');
    }
  }

  /**
   * PUT /api/v1/tenants/:id
   * Update tenant
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      // Check access
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId !== id) {
        return forbiddenResponse(res, 'Access denied');
      }

      const tenant = await tenantService.update(
        id,
        req.body,
        req.user?.role || '',
        req.user?.tenantId || null
      );

      return successResponse(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      logger.error('Error updating tenant:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Tenant');
      }
      
      return errorResponse(res, 500, 'Failed to update tenant');
    }
  }

  /**
   * DELETE /api/v1/tenants/:id
   * Soft delete tenant (SUPER_ADMIN only)
   */
  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      await tenantService.deactivate(id);

      return successResponse(res, null, 'Tenant deactivated successfully');
    } catch (error) {
      logger.error('Error deactivating tenant:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Tenant');
      }
      
      return errorResponse(res, 500, 'Failed to deactivate tenant');
    }
  }

  /**
   * GET /api/v1/tenants/:id/usage
   * Get tenant usage statistics
   */
  async getUsageStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const stats = await tenantService.getUsageStats(id);
      return successResponse(res, stats);
    } catch (error) {
      logger.error('Error fetching usage stats:', error);
      return errorResponse(res, 500, 'Failed to fetch usage stats');
    }
  }
}

// Export singleton instance
export const tenantController = new TenantController();
