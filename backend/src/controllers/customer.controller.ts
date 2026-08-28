/**
 * Customer Controller
 * 
 * Handles HTTP requests for customer management operations.
 */

import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
  forbiddenResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export class CustomerController {
  /**
   * GET /api/v1/customers
   * List customers with filtering and pagination
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = getQueryNumber(req.query, "page", 1) || 1;
      const limit = getQueryNumber(req.query, "limit", 20) || 20;
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const status = getQueryString(req.query, "status") as string | undefined;
      const riskLevel = req.query.riskLevel as string | undefined;
      const search = req.query.search as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      // Customers cannot access this endpoint directly
      if (req.user?.role === 'CUSTOMER') {
        return forbiddenResponse(res, 'Access denied', 'FORBIDDEN');
      }

      const result = await customerService.findAll({
        page,
        limit,
        tenantId: tenantId!,
        status: status as any,
        riskLevel: riskLevel as any,
        search,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching customers:', error);
      return errorResponse(res, 500, 'Failed to fetch customers');
    }
  }

  /**
   * GET /api/v1/customers/:id
   * Get customer by ID with full profile
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const customer = await customerService.findById(id);

      // Check tenant access
      if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Cannot access other tenant data');
      }

      return successResponse(res, customer);
    } catch (error) {
      logger.error('Error fetching customer:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Customer');
      }
      
      return errorResponse(res, 500, 'Failed to fetch customer');
    }
  }

  /**
   * POST /api/v1/customers
   * Create new customer
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.create(req.body);

      return createdResponse(res, customer, 'Customer created successfully');
    } catch (error) {
      logger.error('Error creating customer:', error);
      
      if ((error as any)?.code === 'DUPLICATE_PHONE') {
        return conflictResponse(
          res,
          error instanceof Error ? error.message : 'Duplicate phone number',
          'DUPLICATE_PHONE'
        );
      }
      
      return errorResponse(res, 500, 'Failed to create customer');
    }
  }

  /**
   * PUT /api/v1/customers/:id
   * Update customer information
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const existingCustomer = await customerService.findById(id);

      // Check tenant access
      if (req.user?.role !== 'SUPER_ADMIN' && existingCustomer.tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Cannot update customer from another tenant');
      }

      const updatedCustomer = await customerService.update(id, req.body);

      return successResponse(res, updatedCustomer, 'Customer updated successfully');
    } catch (error) {
      logger.error('Error updating customer:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Customer');
      }
      
      return errorResponse(res, 500, 'Failed to update customer');
    }
  }

  /**
   * GET /api/v1/customers/:id/loans
   * Get all loans for a specific customer
   */
  async getLoans(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      // Verify customer exists and belongs to tenant
      const customer = await customerService.findById(id);
      
      if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Access denied');
      }

      const loans = await customerService.getLoans(id);
      return successResponse(res, loans);
    } catch (error) {
      logger.error('Error fetching customer loans:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Customer');
      }
      
      return errorResponse(res, 500, 'Failed to fetch customer loans');
    }
  }

  /**
   * GET /api/v1/customers/:id/documents
   * Get customer's KYC documents
   */
  async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const customer = await customerService.findById(id);

      if (req.user?.role !== 'SUPER_ADMIN' && customer.tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Access denied');
      }

      const documents = await customerService.getDocuments(id);
      return successResponse(res, documents);
    } catch (error) {
      logger.error('Error fetching customer documents:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Customer');
      }
      
      return errorResponse(res, 500, 'Failed to fetch documents');
    }
  }

  /**
   * GET /api/v1/customers/search
   * Search customers by various criteria
   */
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, limit = 20 } = req.query;
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId || !q) {
        return badRequestResponse(res, 'tenantId and query (q) are required');
      }

      const results = await customerService.search(tenantId!, q as string, parseInt(limit as string));
      return successResponse(res, results);
    } catch (error) {
      logger.error('Error searching customers:', error);
      return errorResponse(res, 500, 'Failed to search customers');
    }
  }

  /**
   * GET /api/v1/customers/stats
   * Get customer statistics for a tenant
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const stats = await customerService.getStats(tenantId!);
      return successResponse(res, stats);
    } catch (error) {
      logger.error('Error fetching customer stats:', error);
      return errorResponse(res, 500, 'Failed to fetch customer stats');
    }
  }

  /**
   * POST /api/v1/customers/:id/check-eligibility
   * Check loan eligibility for a customer
   */
  async checkEligibility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const eligibility = await customerService.checkLoanEligibility(id);
      return successResponse(res, eligibility);
    } catch (error) {
      logger.error('Error checking eligibility:', error);
      return errorResponse(res, 500, 'Failed to check eligibility');
    }
  }
}

// Export singleton instance
export const customerController = new CustomerController();
