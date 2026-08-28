/**
 * Collection Controller
 * 
 * Handles HTTP requests for debt collection operations.
 */

import { Request, Response, NextFunction } from 'express';
import { collectionService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

export class CollectionController {
  /**
   * GET /api/v1/collections
   * Collections dashboard data with PAR metrics and aging buckets
   */
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const status = req.query.status as string | undefined;
      const daysRange = req.query.daysRange as string | undefined;
      const agentId = req.query.agentId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await collectionService.getDashboardData({
        tenantId: tenantId!,
        status,
        daysRange,
        agentId,
        page,
        limit,
      });

      return successResponse(res, result);
    } catch (error) {
      logger.error('Error fetching collections:', error);
      return errorResponse(res, 500, 'Failed to fetch collections data');
    }
  }

  /**
   * GET /api/v1/collections/loans
   * Get loans assigned for collection
   */
  async getCollectionLoans(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const agentId = req.query.agentId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await collectionService.getCollectionLoans({
        tenantId: tenantId!,
        agentId,
        page,
        limit,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching collection loans:', error);
      return errorResponse(res, 500, 'Failed to fetch collection loans');
    }
  }

  /**
   * POST /api/v1/collections/actions
   * Record a collection action (call, SMS, visit, etc.)
   */
  async recordAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        // This shouldn't happen due to auth middleware, but just in case
        return badRequestResponse(res, 'User not authenticated');
      }

      const activity = await collectionService.recordAction(
        req.body,
        req.user.id
      );

      return createdResponse(res, activity, 'Collection action recorded successfully');
    } catch (error) {
      logger.error('Error recording collection action:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      if (code === 'INVALID_ACTION') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid action');
      }
      
      return errorResponse(res, 500, 'Failed to record collection action');
    }
  }

  /**
   * POST /api/v1/collections/promises/create
   * Create promise to pay
   */
  async createPromiseToPay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return badRequestResponse(res, 'User not authenticated');
      }

      const promise = await collectionService.createPromiseToPay(
        req.body,
        req.user.id
      );

      return createdResponse(res, promise, 'Promise to pay recorded successfully');
    } catch (error) {
      logger.error('Error creating promise to pay:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return notFoundResponse(res, 'Loan');
      }
      
      return errorResponse(res, 500, 'Failed to create promise to pay');
    }
  }

  /**
   * GET /api/v1/collections/promises
   * Get promises to pay
   */
  async getPromises(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const status = req.query.status as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const promises = await collectionService.getPromises(tenantId!, status);

      return successResponse(res, promises);
    } catch (error) {
      logger.error('Error fetching promises:', error);
      return errorResponse(res, 500, 'Failed to fetch promises');
    }
  }

  /**
   * PATCH /api/v1/collections/promises/:id/status
   * Update promise to pay status
   */
  async updatePromiseStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['KEPT', 'BROKEN'].includes(status)) {
        return badRequestResponse(res, 'Status must be KEPT or BROKEN');
      }

      await collectionService.updatePromiseStatus(id, status);

      return successResponse(res, null, `Promise marked as ${status}`);
    } catch (error) {
      logger.error('Error updating promise status:', error);
      return errorResponse(res, 500, 'Failed to update promise status');
    }
  }

  /**
   * GET /api/v1/collections/stats
   * Get collection statistics for an agent
   */
  async getAgentStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const agentId = (req.query.agentId as string) || req.user?.id;

      if (!tenantId || !agentId) {
        return badRequestResponse(res, 'tenantId and agentId are required');
      }

      const stats = await collectionService.getAgentStats(agentId!, tenantId!);

      return successResponse(res, stats);
    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      return errorResponse(res, 500, 'Failed to fetch agent stats');
    }
  }
}

// Export singleton instance
export const collectionController = new CollectionController();
