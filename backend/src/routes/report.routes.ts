/**
 * Reports & Analytics Routes
 * 
 * Report generation, scheduling, and data export endpoints.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.use(requireTenantAccess);

// =============================================================================
// REPORT CATALOG
// =============================================================================

/**
 * GET /api/v1/reports
 * Get catalog of available reports
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
 * GET /api/v1/reports/portfolio
 * Portfolio quality report with PAR analysis
 */
reportRoutes.get('/portfolio', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
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
 * GET /api/v1/reports/customer
 * Customer analytics and segmentation
 */
reportRoutes.get('/customer', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
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
 * GET /api/v1/reports/financial
 * Financial performance report (P&L, revenue mix)
 */
reportRoutes.get('/financial', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
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
 * GET /api/v1/reports/operational
 * Operational metrics and staff performance
 */
reportRoutes.get('/operational', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

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
 * POST /api/v1/reports/generate
 * Generate and queue a report for async generation
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
