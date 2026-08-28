/**
 * Loan Controller
 * 
 * Handles HTTP requests for loan lifecycle management.
 */

import { Request, Response, NextFunction } from 'express';
import { loanService } from '../services';
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
import { AuthRequest, LoanStatus } from '../types';

export class LoanController {
  /**
   * GET /api/v1/loans
   * List loans with filtering and pagination
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const status = req.query.status as LoanStatus | undefined;
      const customerId = req.query.customerId as string | undefined;
      const arrearsStatus = req.query.arrearsStatus as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      // Customers cannot access this endpoint directly
      if (req.user?.role === 'CUSTOMER') {
        return forbiddenResponse(res, 'Use /api/v1/customers/:id/loans instead');
      }

      const result = await loanService.findAll({
        page,
        limit,
        tenantId: tenantId!,
        status,
        customerId,
        arrearsStatus: arrearsStatus as any,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching loans:', error);
      return errorResponse(res, 500, 'Failed to fetch loans');
    }
  }

  /**
   * GET /api/v1/loans/:id
   * Get loan by ID with full details including schedule
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const loan = await loanService.findById(id);

      // Check tenant access
      if (req.user?.role !== 'SUPER_ADMIN' && (loan as any).tenantId !== req.user?.tenantId) {
        return forbiddenResponse(res, 'Cannot access other tenant data');
      }

      return successResponse(res, loan);
    } catch (error) {
      logger.error('Error fetching loan:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      
      return errorResponse(res, 500, 'Failed to fetch loan');
    }
  }

  /**
   * POST /api/v1/loans
   * Create new loan from approved application
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.create(req.body);

      return createdResponse(res, loan, 'Loan created successfully');
    } catch (error) {
      logger.error('Error creating loan:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        const message = error instanceof Error ? error.message : 'Resource not found';
        return notFoundResponse(res, message);
      }
      
      return errorResponse(res, 500, 'Failed to create loan');
    }
  }

  /**
   * PATCH /api/v1/loans/:id/status
   * Update loan status (disburse, activate, write off, etc.)
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updatedLoan = await loanService.updateStatus(
        id,
        status,
        notes,
        req.user?.id
      );

      return successResponse(res, updatedLoan, `Loan status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating loan status:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      if (code === 'INVALID_TRANSITION') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid status transition');
      }
      
      return errorResponse(res, 500, 'Failed to update loan status');
    }
  }

  /**
   * POST /api/v1/loans/:id/approve
   * Approve a loan and set it ready for disbursement
   */
  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approvedAmount, interestRate, termDays, notes } = req.body;

      const updatedLoan = await loanService.approve(id, {
        approvedAmount,
        interestRate,
        termDays,
        approvedBy: req.user?.id,
        notes,
      });

      return successResponse(res, updatedLoan, 'Loan approved successfully');
    } catch (error) {
      logger.error('Error approving loan:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      if (code === 'INVALID_STATUS') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Loan cannot be approved in current status');
      }
      
      return errorResponse(res, 500, 'Failed to approve loan');
    }
  }

  /**
   * POST /api/v1/loans/:id/disburse
   * Process loan disbursement
   */
  async disburse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { referenceNumber } = req.body;

      if (!referenceNumber) {
        return badRequestResponse(res, 'referenceNumber is required');
      }

      await loanService.disburse(id, referenceNumber);

      return successResponse(res, null, 'Loan disbursed successfully');
    } catch (error) {
      logger.error('Error disbursing loan:', error);
      
      if (error instanceof Error && error.message.includes('not ready')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to disburse loan');
    }
  }

  /**
   * GET /api/v1/loans/stats
   * Get loan statistics for a tenant
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const stats = await loanService.getStats(tenantId!);
      return successResponse(res, stats);
    } catch (error) {
      logger.error('Error fetching loan stats:', error);
      return errorResponse(res, 500, 'Failed to fetch loan stats');
    }
  }

  /**
   * POST /api/v1/loans/:id/assign-collector
   * Assign collector to a loan
   */
  async assignCollector(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { collectorId } = req.body;

      if (!collectorId) {
        return badRequestResponse(res, 'collectorId is required');
      }

      await loanService.assignCollector(id, collectorId);

      return successResponse(res, null, 'Collector assigned successfully');
    } catch (error) {
      logger.error('Error assigning collector:', error);
      return errorResponse(res, 500, 'Failed to assign collector');
    }
  }

  /**
   * Generate repayment schedule preview
   */
  async generateSchedulePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const { principal, interestRate, termDays, installments, interestType } = req.body;

      if (!principal || !interestRate || !termDays) {
        return badRequestResponse(res, 'principal, interestRate, and termDays are required');
      }

      const schedule = loanService.generateRepaymentSchedule(
        principal,
        interestRate,
        termDays,
        installments || Math.ceil(termDays / 30),
        interestType || 'FLAT_RATE'
      );

      return successResponse(res, schedule);
    } catch (error) {
      logger.error('Error generating schedule:', error);
      return errorResponse(res, 500, 'Failed to generate schedule');
    }
  }
}

// Export singleton instance
export const loanController = new LoanController();
