/**
 * Report Service
 * 
 * Business logic for report generation and analytics including:
 * - Portfolio reports
 * - Customer analytics
 * - Financial statements
 * - Operational metrics
 * - PDF/Excel export functionality
 * - Report scheduling
 */

import { logger } from '../utils/logger';
import { db } from '../lib/db';

// Import template generators
import { 
  generatePortfolioData, 
  generatePortfolioExcel, 
  generatePortfolioPdf,
  PortfolioReportFilters,
  PortfolioReportData,
} from '../reports/templates/portfolio/portfolio-template';

import { 
  generateFinancialData, 
  generateFinancialExcel, 
  generateFinancialPdf,
  FinancialReportFilters,
  FinancialReportData,
} from '../reports/templates/financial/financial-template';

import { 
  generateCustomerData, 
  generateCustomerExcel, 
  generateCustomerPdf,
  CustomerReportFilters,
  CustomerReportData,
} from '../reports/templates/customer/customer-profile';

import { 
  generateOperationalData, 
  generateOperationalExcel, 
  generateOperationalPdf,
  OperationalReportFilters,
  OperationalReportData,
} from '../reports/templates/operational/operations-summary';

export interface ReportConfig {
  id: string;
  name: string;
  category: string;
  endpoint: string | null;
}

export interface GenerateReportInput {
  reportId: string;
  format?: 'pdf' | 'excel' | 'csv';
  parameters?: Record<string, unknown>;
}

export interface ReportJob {
  id: string;
  reportId: string;
  format: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  estimatedCompletion: Date;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

// In-memory storage for generated reports (in production, use database)
const reportJobs = new Map<string, ReportJob>();
const reportBuffers = new Map<string, Buffer>();

export class ReportService {
  /**
   * Get catalog of available reports
   */
  async getCatalog(): Promise<{
    reports: ReportConfig[];
    categories: Array<{ id: string; name: string }>;
    totalReports: number;
  }> {
    const reports = [
      // Portfolio Reports
      { id: 'portfolio-overview', name: 'Portfolio Overview', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
      { id: 'disbursement-trend', name: 'Disbursement Trend Analysis', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
      { id: 'par-analysis', name: 'PAR (Portfolio at Risk) Analysis', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
      
      // Customer Reports
      { id: 'customer-overview', name: 'Customer Overview', category: 'customer', endpoint: '/api/v1/reports/customer' },
      { id: 'customer-segmentation', name: 'Customer Segmentation', category: 'customer', endpoint: '/api/v1/reports/customer' },
      { id: 'customer-profile', name: 'Customer Profile (Individual)', category: 'customer', endpoint: '/api/v1/reports/customer/:id' },
      
      // Financial Reports
      { id: 'financial-pnl', name: 'Profit & Loss Statement', category: 'financial', endpoint: '/api/v1/reports/financial' },
      { id: 'financial-balance-sheet', name: 'Balance Sheet', category: 'financial', endpoint: '/api/v1/reports/financial' },
      { id: 'revenue-mix', name: 'Revenue Mix Analysis', category: 'financial', endpoint: '/api/v1/reports/financial' },
      
      // Operational Reports
      { id: 'application-pipeline', name: 'Application Pipeline', category: 'operational', endpoint: '/api/v1/reports/operational' },
      { id: 'staff-performance', name: 'Staff Performance Leaderboard', category: 'operational', endpoint: '/api/v1/reports/operational' },
      { id: 'collections-efficiency', name: 'Collection Efficiency', category: 'operational', endpoint: '/api/v1/reports/operational' },
      
      // Compliance Reports
      { id: 'cbk-reporting', name: 'CBK Regulatory Report', category: 'compliance', endpoint: null },
      { id: 'audit-trail', name: 'Audit Trail Report', category: 'compliance', endpoint: null },
    ];

    return {
      reports,
      categories: [
        { id: 'portfolio', name: 'Portfolio Analytics' },
        { id: 'customer', name: 'Customer Analytics' },
        { id: 'financial', name: 'Financial Reports' },
        { id: 'operational', name: 'Operational Metrics' },
        { id: 'compliance', name: 'Compliance & Audit' },
      ],
      totalReports: reports.length,
    };
  }

  /**
   * Generate portfolio quality report with PAR analysis
   */
  async generatePortfolioReport(tenantId: string, filters?: Partial<PortfolioReportFilters>): Promise<PortfolioReportData> {
    const data = await generatePortfolioData({
      tenantId,
      ...filters,
    });
    
    logger.info('Portfolio report generated', { tenantId, period: data.period });
    return data;
  }

  /**
   * Generate customer analytics report
   */
  async generateCustomerReport(tenantId: string, segmentBy?: string): Promise<any> {
    const [totalCustomers, newCustomersThisMonth, customersByRisk, customersByCounty] = await Promise.all([
      db.customer.count({ where: { tenantId } }),
      db.customer.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      // Risk level distribution
      Promise.all([
        db.customer.count({ where: { tenantId, riskLevel: 'LOW' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'MEDIUM' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'HIGH' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'VERY_HIGH' } }),
      ]),
      // Top counties (mock)
      [{ county: 'Nairobi', count: 1250 }, { county: 'Mombasa', count: 450 }, { county: 'Kisumu', count: 280 }],
    ]);

    return {
      summary: {
        totalCustomers,
        newCustomersThisMonth,
        growthRate: 12.5,
      },
      segmentation: {
        byRiskLevel: [
          { segment: 'Low Risk', count: customersByRisk[0], percentage: (customersByRisk[0] / totalCustomers) * 100 },
          { segment: 'Medium Risk', count: customersByRisk[1], percentage: (customersByRisk[1] / totalCustomers) * 100 },
          { segment: 'High Risk', count: customersByRisk[2], percentage: (customersByRisk[2] / totalCustomers) * 100 },
          { segment: 'Critical Risk', count: customersByRisk[3], percentage: (customersByRisk[3] / totalCustomers) * 100 },
        ],
        byGeography: customersByCounty.slice(0, 10),
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate individual customer profile report
   */
  async generateCustomerProfileReport(customerId: string, tenantId: string): Promise<CustomerReportData> {
    const data = await generateCustomerData({
      customerId,
      tenantId,
    });

    logger.info('Customer profile report generated', { customerId, tenantId });
    return data;
  }

  /**
   * Generate financial performance report (P&L)
   */
  async generateFinancialReport(tenantId: string, filters?: Partial<FinancialReportFilters>): Promise<FinancialReportData> {
    const data = await generateFinancialData({
      tenantId,
      ...filters,
    });

    logger.info('Financial report generated', { tenantId, period: data.period });
    return data;
  }

  /**
   * Generate operational metrics report
   */
  async generateOperationalReport(tenantId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<OperationalReportData> {
    const defaultDateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
    };

    const data = await generateOperationalData({
      tenantId,
      ...dateRange,
      ...defaultDateRange,
    });

    logger.info('Operational report generated', { tenantId, period: data.dateRange });
    return data;
  }

  /**
   * Export report to Excel format
   */
  async exportToExcel(reportType: string, data: any, filename?: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    let buffer: Buffer;
    const outputFilename = filename || `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      switch (reportType) {
        case 'portfolio':
          buffer = await generatePortfolioExcel(data as PortfolioReportData);
          break;
        case 'financial':
          buffer = await generateFinancialExcel(data as FinancialReportData);
          break;
        case 'customer':
          buffer = await generateCustomerExcel(data as CustomerReportData);
          break;
        case 'operational':
          buffer = await generateOperationalExcel(data as OperationalReportData);
          break;
        default:
          throw new Error(`Unsupported report type for Excel export: ${reportType}`);
      }

      logger.info('Excel export completed', { reportType, size: buffer.length });
      return {
        buffer,
        filename: outputFilename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      logger.error('Excel export failed', { reportType, error });
      throw error;
    }
  }

  /**
   * Export report to PDF format
   */
  async exportToPdf(reportType: string, data: any, filename?: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const outputFilename = filename || `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;

    try {
      // For PDF, we need to collect chunks asynchronously
      const doc = this.getPdfDocument(reportType, data);
      const chunks = (doc as any).__chunks || [];
      
      // Create a promise to collect all chunks
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const collectedChunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => collectedChunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(collectedChunks));
        });
        doc.on('error', reject);
      });

      logger.info('PDF export completed', { reportType, size: buffer.length });
      return {
        buffer,
        filename: outputFilename,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      logger.error('PDF export failed', { reportType, error });
      throw error;
    }
  }

  /**
   * Get PDF document instance for a report type
   */
  private getPdfDocument(reportType: string, data: any): any {
    switch (reportType) {
      case 'portfolio':
        return generatePortfolioPdf(data as PortfolioReportData);
      case 'financial':
        return generateFinancialPdf(data as FinancialReportData);
      case 'customer':
        return generateCustomerPdf(data as CustomerReportData);
      case 'operational':
        return generateOperationalPdf(data as OperationalReportData);
      default:
        throw new Error(`Unsupported report type for PDF export: ${reportType}`);
    }
  }

  /**
   * Queue a report for async generation with export
   */
  async queueGeneration(data: GenerateReportInput, userId: string, tenantId: string): Promise<ReportJob> {
    if (!data.reportId) {
      const error: any = new Error('reportId is required');
      error.code = 'BAD_REQUEST';
      throw error;
    }

    const validFormats = ['pdf', 'excel', 'csv'];
    if (data.format && !validFormats.includes(data.format)) {
      const error: any = new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
      error.code = 'INVALID_FORMAT';
      throw error;
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const reportJob: ReportJob = {
      id: jobId,
      reportId: data.reportId,
      format: data.format || 'pdf',
      status: 'QUEUED',
      requestedBy: userId,
      createdAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 300000), // 5 minutes
      downloadUrl: `/api/v1/reports/download/${jobId}`,
    };

    reportJobs.set(jobId, reportJob);

    // Process asynchronously
    this.processReportAsync(jobId, data, userId, tenantId).catch(error => {
      logger.error('Async report processing failed', { jobId, error });
      const job = reportJobs.get(jobId);
      if (job) {
        job.status = 'FAILED';
        job.error = error.message;
      }
    });

    logger.info('Report generation queued', reportJob);

    return reportJob;
  }

  /**
   * Process report generation asynchronously
   */
  private async processReportAsync(
    jobId: string,
    input: GenerateReportInput,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const job = reportJobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';

    try {
      let reportData: any;
      let reportType: string;

      // Generate report data based on type
      switch (input.reportId) {
        case 'portfolio-overview':
        case 'disbursement-trend':
        case 'par-analysis':
          reportType = 'portfolio';
          reportData = await this.generatePortfolioReport(tenantId, input.parameters as any);
          break;
        case 'customer-profile':
          reportType = 'customer';
          reportData = await this.generateCustomerProfileReport(
            (input.parameters?.customerId as string) || '',
            tenantId
          );
          break;
        case 'financial-pnl':
        case 'financial-balance-sheet':
        case 'revenue-mix':
          reportType = 'financial';
          reportData = await this.generateFinancialReport(tenantId, input.parameters as any);
          break;
        case 'application-pipeline':
        case 'staff-performance':
        case 'collections-efficiency':
          reportType = 'operational';
          reportData = await this.generateOperationalReport(tenantId, input.parameters as any);
          break;
        default:
          throw new Error(`Unknown report type: ${input.reportId}`);
      }

      // Generate export based on format
      let exportResult: { buffer: Buffer; filename: string; mimeType: string };

      if (job.format === 'excel') {
        exportResult = await this.exportToExcel(reportType, reportData);
      } else {
        exportResult = await this.exportToPdf(reportType, reportData);
      }

      // Store the result
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.fileSize = exportResult.buffer.length;
      reportBuffers.set(jobId, exportResult.buffer);

      logger.info('Report generation completed', { jobId, fileSize: job.fileSize });
    } catch (error) {
      job.status = 'FAILED';
      job.error = (error as Error).message;
      throw error;
    }
  }

  /**
   * Get report job by ID
   */
  async getReportJob(jobId: string): Promise<ReportJob | null> {
    return reportJobs.get(jobId) || null;
  }

  /**
   * Get report buffer for download
   */
  async getReportBuffer(jobId: string): Promise<Buffer | null> {
    return reportBuffers.get(jobId) || null;
  }

  /**
   * Get report generation history
   */
  async getHistory(tenantId: string, limit: number = 50): Promise<ReportJob[]> {
    const jobs = Array.from(reportJobs.values())
      .filter(job => job.requestedBy === tenantId || true) // In production, filter properly
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return jobs;
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(tenantId: string): Promise<any[]> {
    // In production: Query scheduled_reports table
    return [];
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(data: {
    tenantId: string;
    reportId: string;
    schedule: string;
    recipients: string[];
    format?: string;
    userId: string;
  }): Promise<any> {
    logger.info('Report scheduled', data);
    
    return {
      id: `sched-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(data.schedule),
    };
  }

  /**
   * Clean up old report buffers (call periodically)
   */
  cleanupOldReports(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [jobId, job] of reportJobs.entries()) {
      if (now - job.createdAt.getTime() > maxAgeMs) {
        reportJobs.delete(jobId);
        reportBuffers.delete(jobId);
      }
    }
    logger.info('Cleaned up old reports');
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    
    switch (schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      default:
        now.setDate(now.getDate() + 1);
    }
    
    return now;
  }
}

// Export singleton instance
export const reportService = new ReportService();

// Cleanup old reports every hour
setInterval(() => {
  reportService.cleanupOldReports();
}, 3600000);
