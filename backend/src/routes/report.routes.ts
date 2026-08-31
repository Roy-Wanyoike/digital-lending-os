/**
 * Reports & Analytics Routes
 * 
 * Report generation, scheduling, and data export endpoints.
 * 
 * @openapi
 * tags: [Reports]
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.use(requireTenantAccess);

// =============================================================================
// REPORT CATALOG
// =============================================================================

/**
 * @openapi
 * /reports:
 *   get:
 *     summary: Get available reports catalog
 *     description: Retrieve a list of all available reports with their categories and endpoints.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports catalog retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           endpoint:
 *                             type: string
 *                               format: uri
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     totalReports:
 *                       type: integer
 */
reportRoutes.get('/', (_req: AuthRequest, res) => {
  const reports = [
    // Portfolio Reports
    { id: 'portfolio-overview', name: 'Portfolio Overview', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
    { id: 'disbursement-trend', name: 'Disbursement Trend Analysis', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
    { id: 'par-analysis', name: 'PAR (Portfolio at Risk) Analysis', category: 'portfolio', endpoint: '/api/v1/reports/portfolio' },
    
    // Customer Reports
    { id: 'customer-overview', name: 'Customer Overview', category: 'customer', endpoint: '/api/v1/reports/customer' },
    { id: 'customer-segmentation', name: 'Customer Segmentation', category: 'customer', endpoint: '/api/v1/reports/customer' },
    
    // Financial Reports
    { id: 'financial-pnl', name: 'Profit & Loss Statement', category: 'financial', endpoint: '/api/v1/reports/financial' },
    { id: 'revenue-mix', name: 'Revenue Mix Analysis', category: 'financial', endpoint: '/api/v1/reports/financial' },
    
    // Operational Reports
    { id: 'application-pipeline', name: 'Application Pipeline', category: 'operational', endpoint: '/api/v1/reports/operational' },
    { id: 'staff-performance', name: 'Staff Performance Leaderboard', category: 'operational', endpoint: '/api/v1/reports/operational' },
    
    // Compliance Reports
    { id: 'cbk-reporting', name: 'CBK Regulatory Report', category: 'compliance', endpoint: null },
    { id: 'audit-trail', name: 'Audit Trail Report', category: 'compliance', endpoint: null },
  ];

  return successResponse(res, {
    reports,
    categories: [
      { id: 'portfolio', name: 'Portfolio Analytics' },
      { id: 'customer', name: 'Customer Analytics' },
      { id: 'financial', name: 'Financial Reports' },
      { id: 'operational', name: 'Operational Metrics' },
      { id: 'compliance', name: 'Compliance & Audit' },
    ],
    totalReports: reports.length,
  });
});

// =============================================================================
// PORTFOLIO REPORTS
// =============================================================================

/**
 * @openapi
 * /reports/portfolio:
 *   get:
 *     summary: Generate portfolio quality report
 *     description: |
 *       Comprehensive portfolio analysis including:
 *       - Total loans and active loans count
 *       - Disbursed amount and outstanding balance
 *       - PAR (Portfolio at Risk) analysis at 1, 30, and 90 days
 *       - Average loan size metrics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Tenant ID for the report
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 12m]
 *           default: "30d"
 *         description: Report period
 *     responses:
 *       200:
 *         description: Portfolio report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalLoans:
 *                           type: integer
 *                         activeLoans:
 *                           type: integer
 *                         totalDisbursed:
 *                           type: number
 *                         totalOutstanding:
 *                           type: number
 *                         averageLoanSize:
 *                           type: number
 *                     parAnalysis:
 *                       type: object
 *                       properties:
 *                         par1:
 *                           type: number
 *                           description: PAR > 1 day (%)
 *                         par30:
 *                           type: number
 *                           description: PAR > 30 days (%)
 *                         par90:
 *                           type: number
 *                           description: PAR > 90 days (%)
 *                     period:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 */
reportRoutes.get('/portfolio', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const period = req.query.period as string || '30d';

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    // Fetch portfolio metrics
    const [totalLoans, activeLoans, disbursedAmount, outstandingBalance, parMetrics] = await Promise.all([
      db.loan.count({ where: { tenantId } }),
      db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.loan.aggregate({ where: { tenantId }, _sum: { principal: true } }),
      db.loan.aggregate({ where: { tenantId, status: { in: ['ACTIVE', 'IN_ARREARS'] } }, _sum: { outstandingBalance: true } }),
      Promise.all([
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 1 }, outstandingBalance: { gt: 0 } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 30 }, outstandingBalance: { gt: 0 } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 90 }, outstandingBalance: { gt: 0 } }, _sum: { outstandingBalance: true } }),
      ]),
    ]);

    const totalOutstanding = outstandingBalance._sum.outstandingBalance || 0;

    return successResponse(res, {
      summary: {
        totalLoans,
        activeLoans,
        totalDisbursed: disbursedAmount._sum.principal || 0,
        totalOutstanding,
        averageLoanSize: activeLoans > 0 ? (disbursedAmount._sum.principal || 0) / activeLoans : 0,
      },
      parAnalysis: {
        par1: totalOutstanding > 0 ? ((parMetrics[0]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
        par30: totalOutstanding > 0 ? ((parMetrics[1]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
        par90: totalOutstanding > 0 ? ((parMetrics[2]._sum.outstandingBalance || 0) / totalOutstanding) * 100 : 0,
      },
      period,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating portfolio report:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to generate portfolio report');
  }
});

// =============================================================================
// CUSTOMER REPORTS
// =============================================================================

/**
 * @openapi
 * /reports/customer:
 *   get:
 *     summary: Generate customer analytics report
 *     description: |
 *       Customer segmentation and analytics including:
 *       - Total customer count and growth rate
 *       - Risk level distribution
 *       - Geographic distribution by county
 *       - New customer acquisition metrics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tenant ID for the report
 *       - in: query
 *         name: segmentBy
 *         schema:
 *           type: string
 *           enum: [riskLevel, county, employmentStatus]
 *         description: Segmentation criteria
 *     responses:
 *       200:
 *         description: Customer report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCustomers:
 *                           type: integer
 *                         newCustomersThisMonth:
 *                           type: integer
 *                         growthRate:
 *                           type: number
 *                     segmentation:
 *                       type: object
 *                       properties:
 *                         byRiskLevel:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               segment:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                               percentage:
 *                                 type: number
 *                         byGeography:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               county:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 */
reportRoutes.get('/customer', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const segmentBy = req.query.segmentBy as string | undefined;

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

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
        db.customer.count({ where: { tenantId, riskLevel: 'CRITICAL' } }),
      ]),
      // Top counties (mock - would need aggregation)
      [{ county: 'Nairobi', count: 1250 }, { county: 'Mombasa', count: 450 }, { county: 'Kisumu', count: 280 }],
    ]);

    return successResponse(res, {
      summary: {
        totalCustomers,
        newCustomersThisMonth,
        growthRate: 12.5, // Would calculate from historical data
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
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to generate customer report');
  }
});

// =============================================================================
// FINANCIAL REPORTS
// =============================================================================

/**
 * @openapi
 * /reports/financial:
 *   get:
 *     summary: Generate financial performance report
 *     description: |
 *       Financial P&L analysis including:
 *       - Revenue breakdown (interest, fees, penalties)
 *       - Cost analysis (operating costs, cost of funds, provisions)
 *       - Key financial ratios (yield on portfolio, cost-to-income, NIM)
 *       - Net profit calculation
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tenant ID for the report
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly, yearly]
 *           default: "monthly"
 *         description: Reporting period
 *     responses:
 *       200:
 *         description: Financial report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profitLoss:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: object
 *                         costs:
 *                           type: object
 *                         netProfit:
 *                           type: number
 *                     keyRatios:
 *                       type: object
 *                       properties:
 *                         yieldOnPortfolio:
*                            type: string
 *                         costToIncome:
 *                           type: string
 *                         netInterestMargin:
 *                           type: string
 *                     period:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 */
reportRoutes.get('/financial', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const period = req.query.period as string || 'monthly';

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    // Calculate financial metrics
    const [interestIncome, feeIncome, penaltyIncome, disbursements, collections] = await Promise.all([
      db.transaction.aggregate({
        where: { tenantId, transactionType: 'REPAYMENT_INTEREST' },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { tenantId, transactionType: 'FEE_COLLECTED' },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { tenantId, transactionType: 'PENALTY_COLLECTED' },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { tenantId, transactionType: 'DISBURSEMENT' },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { tenantId, transactionType: { in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'] } },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = (interestIncome._sum.amount || 0) + (feeIncome._sum.amount || 0) + (penaltyIncome._sum.amount || 0);
    const operatingCosts = 456000; // Would fetch from actual cost records

    return successResponse(res, {
      profitLoss: {
        revenue: {
          interestIncome: interestIncome._sum.amount || 0,
          feeIncome: feeIncome._sum.amount || 0,
          penaltyIncome: penaltyIncome._sum.amount || 0,
          totalRevenue,
        },
        costs: {
          operatingCosts,
          costOfFunds: disbursements._sum.amount ? (disbursements._sum.amount * 0.08) : 0, // Mock COF rate
          provisions: totalRevenue * 0.02, // 2% provision
          totalCosts: operatingCosts + (disbursements._sum.amount ? (disbursements._sum.amount * 0.08) : 0) + (totalRevenue * 0.02),
        },
        netProfit: totalRevenue - operatingCosts - (disbursements._sum.amount ? (disbursements._sum.amount * 0.08) : 0) - (totalRevenue * 0.02),
      },
      keyRatios: {
        yieldOnPortfolio: collections._sum.amount && disbursements._sum.amount
          ? ((collections._sum.amount / disbursements._sum.amount) * 100).toFixed(2)
          : '0',
        costToIncome: (operatingCosts / totalRevenue * 100).toFixed(2),
        netInterestMargin: '8.5',
      },
      period,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to generate financial report');
  }
});

// =============================================================================
// OPERATIONAL REPORTS
// =============================================================================

/**
 * @openapi
 * /reports/operational:
 *   get:
 *     summary: Generate operational metrics report
 *     description: |
 *       Operational KPIs including:
 *       - Application pipeline statistics
 *       - Approval and rejection rates
 *       - Average processing time
 *       - Staff performance leaderboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Tenant ID for the report
 *     responses:
 *       200:
 *         description: Operational report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     applicationPipeline:
 *                       type: object
 *                       properties:
 *                         totalApplications:
 *                           type: integer
 *                         approved:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         approvalRate:
 *                           type: number
 *                         averageProcessingTimeHours:
 *                           type: number
 *                     staffPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           staffName:
 *                             type: string
 *                           role:
 *                             type: string
 *                           applicationsProcessed:
 *                             type: integer
 *                           approvalRate:
 *                             type: number
 *                           collectionRate:
 *                             type: number
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 */
reportRoutes.get('/operational', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    const [applications, approvedApplications, rejectedApplications, avgProcessingTime] = await Promise.all([
      db.loanApplication.count({ where: { tenantId } }),
      db.loanApplication.count({ where: { tenantId, status: 'APPROVED' } }),
      db.loanApplication.count({ where: { tenantId, status: 'REJECTED' } }),
      // Mock average processing time - would calculate from timestamps
      Promise.resolve(4.5), // hours
    ]);

    return successResponse(res, {
      applicationPipeline: {
        totalApplications: applications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        pending: applications - approvedApplications - rejectedApplications,
        approvalRate: applications > 0 ? (approvedApplications / applications) * 100 : 0,
        averageProcessingTimeHours: avgProcessingTime,
      },
      staffPerformance: [
        { staffName: 'John Kamau', role: 'Loan Officer', applicationsProcessed: 45, approvalRate: 78, collectionRate: 92 },
        { staffName: 'Grace Wanjiku', role: 'Collections Agent', loansAssigned: 28, recoveryRate: 85, promisesKept: 22 },
        { staffName: 'Peter Ochieng', role: 'Manager', teamPerformance: 87, customerSatisfaction: 94 },
      ],
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating operational report:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to generate operational report');
  }
});

// =============================================================================
// REPORT GENERATION & EXPORT
// =============================================================================

/**
 * @openapi
 * /reports/generate:
 *   post:
 *     summary: Queue report for generation
 *     description: |
 *       Queue a report for async generation and download.
 *       Supports PDF, Excel, and CSV output formats.
 *       Returns a job ID that can be used to track progress.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateReportRequest'
 *     responses:
 *       200:
 *         description: Report generation queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "job-1703123456789"
 *                     reportId:
 *                       type: string
 *                     format:
 *                       type: string
 *                       enum: [pdf, excel, csv]
 *                     status:
 *                       type: string
 *                       example: "QUEUED"
 *                     requestedBy:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     estimatedCompletion:
 *                       type: string
 *                       format: date-time
 *                     downloadUrl:
 *                       type: string
 *                       format: uri
 *                 message:
 *                   type: string
 *                   example: "Report generation queued successfully"
 *       400:
 *         description: Invalid request or unsupported format
 */
reportRoutes.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { reportId, format, parameters } = req.body;

    if (!reportId) {
      return badRequestResponse(res, 'reportId is required');
    }

    const validFormats = ['pdf', 'excel', 'csv'];
    if (format && !validFormats.includes(format)) {
      return badRequestResponse(res, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Create report job record
    const reportJob = {
      id: `job-${Date.now()}`,
      reportId,
      format: format || 'pdf',
      status: 'QUEUED',
      requestedBy: req.user!.id,
      createdAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 300000), // 5 minutes
      downloadUrl: `/api/v1/reports/download/job-${Date.now()}`,
    };

    return successResponse(
      res,
      reportJob,
      'Report generation queued successfully'
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return require('../utils/response').errorResponse(res, 500, 'Report generation failed');
  }
});
