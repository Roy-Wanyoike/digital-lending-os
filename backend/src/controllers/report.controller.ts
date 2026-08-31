/**
 * Report Controller
 * 
 * Handles HTTP requests for report generation and analytics.
 * Supports PDF/Excel export functionality.
 */

import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
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
      const format = req.query.format as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generatePortfolioReport(tenantId!, { period });

      // If format specified, generate file for download
      if (format === 'excel' || format === 'pdf') {
        return await this.handleExport(res, 'portfolio', report, format, 'portfolio_report');
      }

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
   * GET /api/v1/reports/customer/:id
   * Individual customer profile report
   */
  async getCustomerProfileReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const customerId = req.params.id;
      const format = req.query.format as string | undefined;

      if (!customerId) {
        return badRequestResponse(res, 'customerId is required');
      }

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generateCustomerProfileReport(customerId, tenantId);

      // If format specified, generate file for download
      if (format === 'excel' || format === 'pdf') {
        return await this.handleExport(res, 'customer', report, format, `customer_${customerId}_report`);
      }

      return successResponse(res, report);
    } catch (error) {
      logger.error('Error generating customer profile report:', error);
      
      if ((error as Error).message === 'Customer not found') {
        return notFoundResponse(res, 'Customer not found');
      }
      
      return errorResponse(res, 500, 'Failed to generate customer profile report');
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
      const format = req.query.format as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const report = await reportService.generateFinancialReport(tenantId!, { period });

      // If format specified, generate file for download
      if (format === 'excel' || format === 'pdf') {
        return await this.handleExport(res, 'financial', report, format, 'financial_report');
      }

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
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const format = req.query.format as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
      const report = await reportService.generateOperationalReport(tenantId!, dateRange);

      // If format specified, generate file for download
      if (format === 'excel' || format === 'pdf') {
        return await this.handleExport(res, 'operational', report, format, 'operational_report');
      }

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

      const tenantId = req.body.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const job = await reportService.queueGeneration(
        req.body,
        req.user.id,
        tenantId
      );

      return createdResponse(
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
   * GET /api/v1/reports/download/:jobId
   * Download a generated report
   */
  async downloadReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const jobId = req.params.jobId;

      if (!jobId) {
        return badRequestResponse(res, 'Job ID is required');
      }

      // Get job status
      const job = await reportService.getReportJob(jobId);

      if (!job) {
        return notFoundResponse(res, 'Report job not found');
      }

      if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
        return successResponse(res, {
          status: job.status,
          message: `Report is still being generated. Estimated completion: ${job.estimatedCompletion}`,
          estimatedCompletion: job.estimatedCompletion,
        });
      }

      if (job.status === 'FAILED') {
        return errorResponse(res, 500, `Report generation failed: ${job.error || 'Unknown error'}`);
      }

      // Get buffer
      const buffer = await reportService.getReportBuffer(jobId);

      if (!buffer) {
        return notFoundResponse(res, 'Report file not found or has expired');
      }

      // Set headers based on format
      const mimeType = job.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      const extension = job.format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `${job.reportId}_report.${extension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.send(buffer);
    } catch (error) {
      logger.error('Error downloading report:', error);
      return errorResponse(res, 500, 'Failed to download report');
    }
  }

  /**
   * GET /api/v1/reports/history
   * Get report generation history
   */
  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = getQueryNumber(req.query, "limit") || 50;
      const history = await reportService.getHistory(limit as number);

      return successResponse(res, {
        history,
        total: history.length,
      });
    } catch (error) {
      logger.error('Error fetching report history:', error);
      return errorResponse(res, 500, 'Failed to fetch report history');
    }
  }

  /**
   * GET /api/v1/reports/job/:jobId
   * Get status of a specific report job
   */
  async getJobStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const jobId = req.params.jobId;

      if (!jobId) {
        return badRequestResponse(res, 'Job ID is required');
      }

      const job = await reportService.getReportJob(jobId);

      if (!job) {
        return notFoundResponse(res, 'Report job not found');
      }

      return successResponse(res, job);
    } catch (error) {
      logger.error('Error fetching job status:', error);
      return errorResponse(res, 500, 'Failed to fetch job status');
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

  /**
   * Handle export to PDF/Excel
   */
  private async handleExport(
    res: Response,
    reportType: string,
    data: any,
    format: string,
    baseFilename: string
  ): Promise<Response> {
    try {
      let result;

      if (format === 'excel') {
        result = await reportService.exportToExcel(reportType, data, `${baseFilename}.xlsx`);
      } else {
        result = await reportService.exportToPdf(reportType, data, `${baseFilename}.pdf`);
      }

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      return res.send(result.buffer);
    } catch (exportError) {
      logger.error('Export failed:', exportError);
      return errorResponse(res, 500, `Failed to export report: ${(exportError as Error).message}`);
    }
  }
}

// Export singleton instance
export const reportController = new ReportController();
