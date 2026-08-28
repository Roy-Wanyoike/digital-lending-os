/**
 * Collections Management Routes
 * 
 * Debt collection operations: overdue loans, collection actions, promises to pay.
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export const collectionRoutes = Router();

collectionRoutes.use(authenticate);
collectionRoutes.use(requireTenantAccess);

/**
 * GET /api/v1/collections
 * Collections dashboard data with PAR metrics and aging buckets
 */
collectionRoutes.get('/', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const status = getQueryString(req.query, "status") as string | undefined;
    const daysRange = req.query.daysRange as string | undefined;
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build overdue query
    const overdueWhere: Record<string, unknown> = {
      tenantId,
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
      outstandingBalance: { gt: 0 },
    };

    if (status === 'overdue') {
      overdueWhere.daysInArrears = { gt: 0 };
    }

    if (daysRange) {
      const [minDays, maxDays] = daysRange.split('-').map(Number);
      if (maxDays === undefined) {
        overdueWhere.daysInArrears = { gte: minDays };
      } else if (maxDays >= 90) {
        overdueWhere.daysInArrears = { gte: 91 };
      } else {
        overdueWhere.daysInArrears = { gte: minDays, lte: maxDays };
      }
    }

    // Fetch all collections data in parallel
    const [
      dueTodayResult,
      collectedTodayResult,
      totalOverdue,
      parCalculations,
      agingBucketData,
      overdueLoans,
      collectionAgents,
      totalOverdueCount,
    ] = await Promise.all([
      // Due today
      db.loan.aggregate({
        where: {
          tenantId,
          nextPaymentDue: { gte: today, lt: tomorrow },
          outstandingBalance: { gt: 0 },
          status: { in: ['ACTIVE', 'IN_ARREARS'] },
        },
        _sum: { outstandingBalance: true },
        _count: true,
      }),
      // Collected today
      db.repayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: today, lt: tomorrow },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total overdue
      db.loan.aggregate({
        where: {
          tenantId,
          daysInArrears: { gt: 0 },
          outstandingBalance: { gt: 0 },
          status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
        },
        _sum: { outstandingBalance: true },
        _count: true,
      }),
      // PAR calculations
      Promise.all([
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 1 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 7 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 30 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true } }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 91 }, outstandingBalance: { gt: 0 }, status: { in: ['IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true } }),
      ]),
      // Aging buckets
      Promise.all([
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 1, lte: 7 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS'] } }, _sum: { outstandingBalance: true }, _count: true }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 8, lte: 30 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS'] } }, _sum: { outstandingBalance: true }, _count: true }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 31, lte: 60 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true }, _count: true }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 61, lte: 90 }, outstandingBalance: { gt: 0 }, status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true }, _count: true }),
        db.loan.aggregate({ where: { tenantId, daysInArrears: { gte: 91 }, outstandingBalance: { gt: 0 }, status: { in: ['IN_ARREARS', 'DEFAULTED'] } }, _sum: { outstandingBalance: true }, _count: true }),
      ]),
      // Overdue loans list
      db.loan.findMany({
        where: overdueWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { daysInArrears: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, alternativePhone: true, email: true } },
          collector: { select: { id: true, name: true, email: true, phone: true } },
          product: { select: { id: true, name: true, category: true } },
        },
      }),
      // Collection agents
      db.user.findMany({
        where: { tenantId, role: { in: ['AGENT', 'MANAGER', 'TENANT_ADMIN'] }, isActive: true },
        select: { id: true, name: true, email: true, phone: true, role: true },
        orderBy: { name: 'asc' },
      }),
      // Total count for pagination
      db.loan.count({ where: overdueWhere }),
    ]);

    // Calculate PAR ratios
    const totalPortfolio = parCalculations[1]._sum.outstandingBalance || 0;

    const response = {
      summary: {
        dueToday: { amount: dueTodayResult._sum.outstandingBalance || 0, count: dueTodayResult._count },
        collectedToday: { amount: collectedTodayResult._sum.amount || 0, count: collectedTodayResult._count },
        overdueTotal: { amount: totalOverdue._sum.outstandingBalance || 0, count: totalOverdue._count },
        par: {
          par1: totalPortfolio > 0 ? ((parCalculations[0]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0,
          par7: totalPortfolio > 0 ? ((parCalculations[2]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0,
          par30: totalPortfolio > 0 ? ((parCalculations[3]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0,
          par90: totalPortfolio > 0 ? ((parCalculations[4]._sum.outstandingBalance || 0) / totalPortfolio) * 100 : 0,
        },
        totalPortfolio,
      },
      agingBuckets: [
        { bucket: '1-7 days', count: agingBucketData[0]._count, amount: agingBucketData[0]._sum.outstandingBalance || 0, severity: 'low' as const },
        { bucket: '8-30 days', count: agingBucketData[1]._count, amount: agingBucketData[1]._sum.outstandingBalance || 0, severity: 'medium' as const },
        { bucket: '31-60 days', count: agingBucketData[2]._count, amount: agingBucketData[2]._sum.outstandingBalance || 0, severity: 'high' as const },
        { bucket: '61-90 days', count: agingBucketData[3]._count, amount: agingBucketData[3]._sum.outstandingBalance || 0, severity: 'critical' as const },
        { bucket: '90+ days', count: agingBucketData[4]._count, amount: agingBucketData[4]._sum.outstandingBalance || 0, severity: 'severe' as const },
      ],
      overdueLoans,
      collectionAgents,
      pagination: { page, limit, total: totalOverdueCount, pages: Math.ceil(totalOverdueCount / limit) },
    };

    return successResponse(res, response);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch collections data');
  }
});

/**
 * GET /api/v1/collections/loans
 * Get loans assigned for collection
 */
collectionRoutes.get('/loans', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const agentId = req.query.agentId as string | undefined;
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    const where: Record<string, unknown> = {
      tenantId,
      daysInArrears: { gt: 0 },
      outstandingBalance: { gt: 0 },
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
    };

    if (agentId) where.collectorId = agentId;

    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { daysInArrears: 'desc' },
        include: {
          customer: true,
          product: { select: { id: true, name: true } },
        },
      }),
      db.loan.count({ where }),
    ]);

    return paginatedResponse(res, loans, page, limit, total);
  } catch (error) {
    console.error('Error fetching collection loans:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch collection loans');
  }
});

/**
 * POST /api/v1/collections/actions
 * Record a collection action (call, SMS, visit, etc.)
 */
collectionRoutes.post('/actions', async (req: AuthRequest, res) => {
  try {
    const { loanId, action, notes, outcome, followUpDate, promiseToPayAmount, promiseToPayDate } = req.body;

    if (!loanId || !action) {
      return badRequestResponse(res, 'loanId and action are required');
    }

    const validActions = ['CALL', 'SMS', 'EMAIL', 'VISIT', 'LEGAL_NOTICE', 'DEBT_RECOVERY', 'WRITE_OFF', 'WAIVE'];
    if (!validActions.includes(action)) {
      return badRequestResponse(res, `Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    // Verify loan exists
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      return notFoundResponse(res, 'Loan');
    }

    // Create collection activity record
    const activity = await db.collectionActivity.create({
      data: {
        loanId,
        agentId: req.user!.id,
        actionType: action,
        notes: notes || null,
        outcome: outcome || null,
        followUpAt: followUpDate ? new Date(followUpDate) : null,
        promiseAmount: promiseToPayAmount || null,
        promiseDate: promiseToPayDate ? new Date(promiseToPayDate) : null,
      },
    });

    // Update loan's collector assignment if not set
    if (!loan.collectorId) {
      await db.loan.update({
        where: { id: loanId },
        data: { collectorId: req.user!.id },
      });
    }

    return createdResponse(res, activity, 'Collection action recorded successfully');
  } catch (error) {
    console.error('Error recording collection action:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to record collection action');
  }
});

/**
 * GET /api/v1/collections/promises
 * Get promises to pay
 */
collectionRoutes.get('/promises', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
    const status = getQueryString(req.query, "status") as string | undefined; // PENDING, KEPT, BROKEN

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    const where: Record<string, unknown> = {};
    
    // Filter by loan's tenant
    if (status) where.status = status;

    const activities = await db.collectionActivity.findMany({
      where: {
        ...where,
        promiseAmount: { gt: 0 }, // Only get records with promises
        loan: { tenantId },
      },
      include: {
        loan: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { promiseDate: 'asc' },
    });

    return successResponse(res, activities);
  } catch (error) {
    console.error('Error fetching promises:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch promises');
  }
});
