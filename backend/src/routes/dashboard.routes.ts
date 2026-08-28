/**
 * Dashboard & Statistics Routes
 * 
 * KPIs, charts data, and summary statistics for dashboards.
 */

import { Router } from 'express';
import { db } from '../../prisma/client';
import { authenticate, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  badRequestResponse,
} from '../utils/response';
import { AuthRequest, DashboardStats } from '../types';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.use(requireTenantAccess);

/**
 * GET /api/v1/dashboard/stats
 * Get dashboard KPI statistics
 */
dashboardRoutes.get('/stats', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    // Fetch all stats in parallel
    const [
      totalCustomers,
      activeLoans,
      totalDisbursed,
      totalCollected,
      pendingApplications,
      overdueLoansCount,
      todayDisbursements,
      todayCollections,
      monthDisbursements,
      monthCollections,
    ] = await Promise.all([
      db.customer.count({ where: { tenantId } }),
      db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.loan.aggregate({
        where: { tenantId },
        _sum: { principal: true },
      }),
      db.repayment.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      db.loanApplication.count({
        where: { tenantId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
      db.loan.count({
        where: { tenantId, daysInArrears: { gt: 0 }, outstandingBalance: { gt: 0 } },
      }),
      // Today's metrics
      db.loan.aggregate({
        where: {
          tenantId,
          disbursementDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { principal: true },
        _count: true,
      }),
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Month to date
      db.loan.aggregate({
        where: {
          tenantId,
          disbursementDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { principal: true },
      }),
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ]);

    const stats: DashboardStats = {
      totalCustomers,
      activeLoans,
      totalDisbursed: totalDisbursed._sum.principal || 0,
      totalCollected: totalCollected._sum.amount || 0,
      portfolioAtRisk: activeLoans > 0 ? (overdueLoansCount / activeLoans) * 100 : 0,
      approvalRate: 72.5, // Would calculate from historical data
      averageLoanSize: activeLoans > 0 ? (totalDisbursed._sum.principal || 0) / activeLoans : 0,
      pendingApplications,
      overdueLoans: overdueLoansCount,
      collectionEfficiency: (totalCollected._sum.amount || 0) > 0 && (totalDisbursed._sum.principal || 0) > 0
        ? ((totalCollected._sum.amount || 0) / (totalDisbursed._sum.principal || 0)) * 100
        : 0,
    };

    return successResponse(res, {
      ...stats,
      today: {
        disbursements: {
          count: todayDisbursements._count,
          amount: todayDisbursements._sum.principal || 0,
        },
        collections: {
          count: todayCollections._count,
          amount: todayCollections._sum.amount || 0,
        },
      },
      monthToDate: {
        disbursements: monthDisbursements._sum.principal || 0,
        collections: monthCollections._sum.amount || 0,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch dashboard stats');
  }
});

/**
 * GET /api/v1/dashboard/charts
 * Get chart data for dashboard visualizations
 */
dashboardRoutes.get('/charts', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
    const chartType = req.query.type as string | undefined; // disbursement-trend, loan-distribution, etc.

    if (!tenantId) {
      return badRequestResponse(res, 'tenantId is required');
    }

    let chartData: Record<string, unknown> = {};

    switch (chartType) {
      case 'disbursement-trend':
        // Last 30 days disbursement trend
        chartData = generateTrendData(30, 'disbursement');
        break;

      case 'collection-trend':
        // Last 30 days collection trend
        chartData = generateTrendData(30, 'collection');
        break;

      case 'loan-status-distribution':
        // Pie chart of loan statuses
        chartData = await getLoanStatusDistribution(tenantId);
        break;

      case 'risk-segmentation':
        // Customer risk distribution
        chartData = await getRiskSegmentation(tenantId);
        break;

      case 'county-distribution':
        // Loans by county
        chartData = getCountyDistribution();
        break;

      default:
        // Return all charts if no specific type requested
        chartData = {
          disbursementTrend: generateTrendData(30, 'disbursement'),
          collectionTrend: generateTrendData(30, 'collection'),
          loanStatusDistribution: await getLoanStatusDistribution(tenantId),
          riskSegmentation: await getRiskSegmentation(tenantId),
          countyDistribution: getCountyDistribution(),
        };
    }

    return successResponse(res, {
      type: chartType || 'all',
      data: chartData,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch chart data');
  }
});

// =============================================================================
// CHART DATA GENERATORS
// =============================================================================

function generateTrendData(days: number, type: 'disbursement' | 'collection'): Array<{
  date: string;
  value: number;
  count: number;
}> {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic mock data with some variation
    const baseValue = type === 'disbursement' ? 150000 : 120000;
    const variance = Math.random() * baseValue * 0.4 - baseValue * 0.2; // ±20% variance
    const weekendFactor = [0, 6].includes(date.getDay()) ? 0.5 : 1;
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round((baseValue + variance) * weekendFactor),
      count: Math.round(Math.random() * 20 + 5) * weekendFactor,
    });
  }

  return data;
}

async function getLoanStatusDistribution(tenantId: string): Promise<Array<{ label: string; value: number; percentage: number }>> {
  const statuses = ['ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'PAID_OFF', 'PENDING_DISBURSEMENT'];
  const distribution = [];

  for (const status of statuses) {
    const count = await db.loan.count({ where: { tenantId, status } });
    distribution.push({ label: status.replace('_', ' '), value: count, percentage: 0 });
  }

  const total = distribution.reduce((sum, d) => sum + d.value, 0);
  distribution.forEach((d) => d.percentage = total > 0 ? (d.value / total) * 100 : 0);

  return distribution;
}

async function getRiskSegmentation(tenantId: string): Promise<Array<{ segment: string; count: number; percentage: number }>> {
  const segments = [
    { level: 'LOW', label: 'Low Risk' },
    { level: 'MEDIUM', label: 'Medium Risk' },
    { level: 'HIGH', label: 'High Risk' },
    { level: 'CRITICAL', label: 'Critical Risk' },
  ];

  const result = [];
  for (const seg of segments) {
    const count = await db.customer.count({ where: { tenantId, riskLevel: seg.level as any } });
    result.push({ segment: seg.label, count, percentage: 0 });
  }

  const total = result.reduce((sum, r) => sum + r.count, 0);
  result.forEach((r) => r.percentage = total > 0 ? (r.count / total) * 100 : 0);

  return result;
}

function getCountyDistribution(): Array<{ county: string; loans: number; customers: number }> {
  // Mock data for top Kenyan counties
  return [
    { county: 'Nairobi', loans: 1250, customers: 890 },
    { county: 'Mombasa', loans: 450, customers: 320 },
    { county: 'Kisumu', loans: 280, customers: 195 },
    { county: 'Nakuru', loans: 220, customers: 160 },
    { county: 'Eldoret', loans: 180, customers: 130 },
    { county: 'Thika', loans: 150, customers: 110 },
    { county: 'Machakos', loans: 130, customers: 95 },
    { county: 'Kiambu', loans: 120, customers: 85 },
  ];
}
