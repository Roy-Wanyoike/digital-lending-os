/**
 * Collection Service
 * 
 * Business logic for debt collection operations including:
 * - Overdue loan management
 * - Collection actions (calls, SMS, visits)
 * - Promises to pay tracking
 * - SMS campaign management
 * - PAR calculations
 */

import { logger } from '../utils/logger';
import { db } from '../../prisma/client';
import { CollectionActionInput, PromiseToPayInput } from '../types';

export interface CollectionsQueryParams {
  tenantId: string;
  status?: string;
  daysRange?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface CollectionSummary {
  dueToday: { amount: number; count: number };
  collectedToday: { amount: number; count: number };
  overdueTotal: { amount: number; count: number };
  par: {
    par1: number;
    par7: number;
    par30: number;
    par90: number;
  };
  totalPortfolio: number;
}

export class CollectionService {
  /**
   * Get collections dashboard data with PAR metrics
   */
  async getDashboardData(params: CollectionsQueryParams): Promise<{
    summary: CollectionSummary;
    agingBuckets: Array<{ bucket: string; count: number; amount: number; severity: string }>;
    overdueLoans: any[];
    collectionAgents: any[];
    pagination: any;
  }> {
    const { tenantId, status, daysRange, agentId, page = 1, limit = 20 } = params;

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
        where: { ...overdueWhere, ...(agentId && { assignedCollector: agentId }) },
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

    return {
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
  }

  /**
   * Record a collection action (call, SMS, visit, etc.)
   */
  async recordAction(data: CollectionActionInput, agentId: string): Promise<any> {
    const loan = await db.loan.findUnique({ where: { id: data.loanId } });
    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const validActions = ['CALL', 'SMS', 'EMAIL', 'VISIT', 'LEGAL_NOTICE', 'DEBT_RECOVERY', 'WRITE_OFF', 'WAIVE'];
    if (!validActions.includes(data.action)) {
      const error: any = new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
      error.code = 'INVALID_ACTION';
      throw error;
    }

    // Create collection activity record
    const activity = await db.collectionActivity.create({
      data: {
        loanId: data.loanId,
        agentId,
        actionType: data.action,
        notes: data.notes || null,
        outcome: data.outcome || null,
        followUpAt: data.followUpDate ? new Date(data.followUpDate) : null,
        promiseAmount: data.promiseToPayAmount || null,
        promiseDate: data.promiseToPayDate ? new Date(data.promiseToPayDate) : null,
      },
    });

    // Update loan's collector assignment if not set
    if (!loan.collectorId) {
      await db.loan.update({
        where: { id: data.loanId },
        data: { assignedCollector: agentId },
      });
    }

    logger.info('Collection action recorded', {
      loanId: data.loanId,
      action: data.action,
      agentId,
    });

    return activity;
  }

  /**
   * Create promise to pay
   */
  async createPromiseToPay(data: PromiseToPayInput, agentId: string): Promise<any> {
    const loan = await db.loan.findUnique({ where: { id: data.loanId } });
    if (!loan) {
      throw new Error('Loan not found');
    }

    const promise = await db.collectionActivity.create({
      data: {
        loanId: data.loanId,
        agentId,
        actionType: 'PROMISE',
        promiseAmount: data.amount,
        promiseDate: new Date(data.promiseDate),
        notes: data.notes || null,
        followUpAt: new Date(data.promiseDate),
      },
    });

    logger.info('Promise to pay created', {
      loanId: data.loanId,
      amount: data.amount,
      promiseDate: data.promiseDate,
    });

    return promise;
  }

  /**
   * Get promises to pay
   */
  async getPromises(tenantId: string, status?: string): Promise<any[]> {
    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;

    const activities = await db.collectionActivity.findMany({
      where: {
        ...where,
        promiseAmount: { gt: 0 },
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

    return activities;
  }

  /**
   * Get loans assigned for collection
   */
  async getCollectionLoans(params: {
    tenantId: string;
    agentId?: string;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, agentId, page = 1, limit = 20 } = params;

    const where: Record<string, unknown> = {
      tenantId,
      daysInArrears: { gt: 0 },
      outstandingBalance: { gt: 0 },
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
    };

    if (agentId) where.assignedCollector = agentId;

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

    return {
      items: loans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update promise to pay status
   */
  async updatePromiseStatus(activityId: string, status: 'KEPT' | 'BROKEN'): Promise<void> {
    await db.collectionActivity.update({
      where: { id: activityId },
      data: { status: status as any },
    });
  }

  /**
   * Get collection statistics for an agent
   */
  async getAgentStats(agentId: string, tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [assignedLoans, todayActions, promisesKept, promisesBroken] = await Promise.all([
      db.loan.count({
        where: { tenantId, assignedCollector: agentId, daysInArrears: { gt: 0 } },
      }),
      db.collectionActivity.count({
        where: { agentId, createdAt: { gte: today } },
      }),
      db.collectionActivity.count({
        where: { agentId, promiseAmount: { gt: 0 }, status: 'KEPT' },
      }),
      db.collectionActivity.count({
        where: { agentId, promiseAmount: { gt: 0 }, status: 'BROKEN' },
      }),
    ]);

    return {
      assignedOverdueLoans: assignedLoans,
      actionsToday: todayActions,
      promisesKept,
      promisesBroken,
      keepRate: (promisesKept + promisesBroken) > 0 
        ? (promisesKept / (promisesKept + promisesBroken)) * 100 
        : 0,
    };
  }
}

// Export singleton instance
export const collectionService = new CollectionService();
