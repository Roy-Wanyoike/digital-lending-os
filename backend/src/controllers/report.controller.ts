/**
 * Report Controller
 * 
 * Handles HTTP requests for report generation and analytics.
 */

import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export class ReportController {
  /**
   * GET /api/v1/reports
   * Get catalog of available reports
   */
  async getCatalog(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const catalog = await reportService.getCatalog();

      return successResponse(res, catalog);
    } catch (error) {
      logger.error('Error fetching report catalog:', error);
      return errorResponse(res, 500, 'Failed to fetch reports');
    }
  }

  /**
   * GET /api/v1/reports/portfolio
   * Portfolio quality report with PAR analysis
   */
  async getPortfolioReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const period = req.query.period as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generatePortfolioReport(tenantId!, period);

      return successResponse(res, report);
    } catch (error) {
      logger.error('Error generating portfolio report:', error);
      return errorResponse(res, 500, 'Failed to generate portfolio report');
    }
  }

  /**
   * GET /api/v1/reports/customer
   * Customer analytics and segmentation
   */
  async getCustomerReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const segmentBy = req.query.segmentBy as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generateCustomerReport(tenantId!, segmentBy);

      return successResponse(res, report);
    } catch (error) {
      logger.error('Error generating customer report:', error);
      return errorResponse(res, 500, 'Failed to generate customer report');
    }
  }

  /**
   * GET /api/v1/reports/financial
   * Financial performance report (P&L)
   */
  async getFinancialReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const period = req.query.period as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generateFinancialReport(tenantId!, period);

      return successResponse(res, report);
    } catch (error) {
      logger.error('Error generating financial report:', error);
      return errorResponse(res, 500, 'Failed to generate financial report');
    }
  }

  /**
   * GET /api/v1/reports/operational
   * Operational metrics and staff performance
   */
  async getOperationalReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generateOperationalReport(tenantId!);

      return successResponse(res, report);
    } catch (error) {
      logger.error('Error generating operational report:', error);
      return errorResponse(res, 500, 'Failed to generate operational report');
    }
  }

  /**
   * POST /api/v1/reports/generate
   * Generate and queue a report for async generation
   */
  async queueGeneration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return badRequestResponse(res, 'User not authenticated');
      }

      const job = await reportService.queueGeneration(
        req.body,
        req.user.id
      );

      return successResponse(
        res,
        job,
        'Report generation queued successfully'
      );
    } catch (error) {
      logger.error('Error generating report:', error);
      
      const code = (error as any)?.code;
      if (code === 'BAD_REQUEST') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'reportId is required');
      }
      if (code === 'INVALID_FORMAT') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid format');
      }
      
      return errorResponse(res, 500, 'Report generation failed');
    }
  }

  /**
   * GET /api/v1/reports/scheduled
   * Get scheduled reports
   */
  async getScheduledReports(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const scheduled = await reportService.getScheduledReports(tenantId!);

      return successResponse(res, scheduled);
    } catch (error) {
      logger.error('Error fetching scheduled reports:', error);
      return errorResponse(res, 500, 'Failed to fetch scheduled reports');
    }
  }

  /**
   * POST /api/v1/reports/schedule
   * Schedule a recurring report
   */
  async scheduleReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return badRequestResponse(res, 'User not authenticated');
      }

      const tenantId = req.body.tenantId || req.user?.tenantId;
      
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required in body or query');
      }

      const schedule = await reportService.scheduleReport({
        ...req.body,
        tenantId,
        userId: req.user.id,
      });

      return createdResponse(res, schedule, 'Report scheduled successfully');
    } catch (error) {
      logger.error('Error scheduling report:', error);
      return errorResponse(res, 500, 'Failed to schedule report');
    }
  }
}

// Export singleton instance
export const reportController = new ReportController();
