/**
 * Application Controller
 * 
 * Handles HTTP requests for loan application processing workflow.
 */

import { Request, Response, NextFunction } from 'express';
import { applicationService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  forbiddenResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest, ApplicationStatus } from '../types';

export class ApplicationController {
  /**
   * GET /api/v1/applications
   * List loan applications
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = getQueryNumber(req.query, 'page', 1);
      const limit = getQueryNumber(req.query, 'limit', 20);
      const tenantId = getQueryString(req.query, 'tenantId') || req.user?.tenantId;
      const status = getQueryString(req.query, 'status') as ApplicationStatus | undefined;
      const customerId = getQueryString(req.query, 'customerId');

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await applicationService.findAll({
        page,
        limit,
        tenantId: tenantId!,
        status: status as any,
        customerId,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching applications:', error);
      return errorResponse(res, 500, 'Failed to fetch applications');
    }
  }

  /**
   * GET /api/v1/applications/:id
   * Get application by ID with full details
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const application = await applicationService.findById(id);

      if (req.user?.role !== 'SUPER_ADMIN' && (application as any).tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Access denied');
      }

      return successResponse(res, application);
    } catch (error) {
      logger.error('Error fetching application:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Application');
      }
      
      return errorResponse(res, 500, 'Failed to fetch application');
    }
  }

  /**
   * POST /api/v1/applications
   * Create new loan application
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = { ...req.body };
      const tenantId = body.tenantId || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const application = await applicationService.create(
        { ...body, tenantId },
        req.user?.id
      );

      return createdResponse(res, application, 'Application submitted successfully');
    } catch (error) {
      logger.error('Error creating application:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, error instanceof Error ? error.message : 'Resource not found');
      }
      
      return errorResponse(res, 500, 'Failed to create application');
    }
  }

  /**
   * PATCH /api/v1/applications/:id/review
   * Review and approve/reject application
   */
  async review(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { decision, notes, approvedAmount, interestRate, termDays } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return badRequestResponse(res, 'Decision must be APPROVED or REJECTED');
      }

      const updatedApp = await applicationService.review(
        id,
        { decision, notes, approvedAmount, interestRate, termDays },
        req.user!.id
      );

      return successResponse(res, updatedApp, `Application ${decision.toLowerCase()} successfully`);
    } catch (error) {
      logger.error('Error reviewing application:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Application');
      }
      if (code === 'INVALID_STATUS') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Cannot review in current status');
      }
      
      return errorResponse(res, 500, 'Failed to review application');
    }
  }

  /**
   * POST /api/v1/applications/:id/submit
   * Submit a draft application
   */
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      await applicationService.submit(id);

      return successResponse(res, null, 'Application submitted successfully');
    } catch (error) {
      logger.error('Error submitting application:', error);
      
      if (error instanceof Error && error.message.includes('Only draft')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to submit application');
    }
  }

  /**
   * POST /api/v1/applications/:id/cancel
   * Cancel application
   */
  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { reason } = req.body;

      await applicationService.cancel(id, reason || 'Cancelled by user', req.user!.id);

      return successResponse(res, null, 'Application cancelled successfully');
    } catch (error) {
      logger.error('Error cancelling application:', error);
      
      if (error instanceof Error && error.message.includes('cannot cancel')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to cancel application');
    }
  }

  /**
   * POST /api/v1/applications/:id/withdraw
   * Withdraw application (customer action)
   */
  async withdraw(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      await applicationService.withdraw(id);

      return successResponse(res, null, 'Application withdrawn successfully');
    } catch (error) {
      logger.error('Error withdrawing application:', error);
      
      if (error instanceof Error && error.message.includes('cannot withdraw')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to withdraw application');
    }
  }

  /**
   * GET /api/v1/applications/stats
   * Get application statistics
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const stats = await applicationService.getStats(tenantId!);
      return successResponse(res, stats);
    } catch (error) {
      logger.error('Error fetching application stats:', error);
      return errorResponse(res, 500, 'Failed to fetch application stats');
    }
  }
}

// Export singleton instance
export const applicationController = new ApplicationController();
