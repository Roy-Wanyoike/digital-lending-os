import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, } from '@/lib/auth/api-helpers';
import { getTenantBusinessIds } from '@/backend/lib/tenant-cache';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { analyticsCache } from '@/backend/lib/response-cache';
import { error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return unauthorized('Authentication required');

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d';

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d': startDate = new Date(now.getTime() - 7 * 86400000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 86400000); break;
      case '12m': startDate = new Date(now.getTime() - 365 * 86400000); break;
      default: startDate = new Date(now.getTime() - 30 * 86400000);
    }

    const businessIds = await getTenantBusinessIds(user.tenantId, db);

    // Fast in-memory cache (5s TTL) — analytics does 11 parallel aggregations
    const analyticsKey = `analytics:${user.tenantId}:${period}`;
    const memCached = analyticsCache.get(analyticsKey);
    if (memCached) {
      return ok(memCached);
    }

    const [paymentVolume, completedTxCount, activeEscrows, completedEscrows, invoiceStats, walletStats, collectionStats, fraudCount, screeningCount, linkStats, overdueInvoices] = await Promise.all([
      db.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { createdAt: { gte: startDate }, status: 'completed', intent: { fromBusinessId: { in: businessIds } } },
      }),
      db.paymentTransaction.count({
        where: { createdAt: { gte: startDate }, intent: { fromBusinessId: { in: businessIds } } },
      }),
      db.escrowTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { buyerId: { in: businessIds }, status: { in: ['funded', 'partial'] } },
      }),
      db.escrowTransaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { buyerId: { in: businessIds }, status: 'completed', createdAt: { gte: startDate } },
      }),
      db.invoice.aggregate({
        _sum: { amount: true, paidAmount: true },
        _count: true,
        where: { senderId: { in: businessIds }, createdAt: { gte: startDate } },
      }),
      db.wallet.aggregate({
        _sum: { balance: true, availableBalance: true },
        _count: true,
        where: { businessId: { in: businessIds }, status: 'active' },
      }),
      db.collectionCase.aggregate({
        _sum: { outstandingAmount: true },
        _count: true,
        where: { businessId: { in: businessIds }, status: { in: ['active', 'paused'] } },
      }),
      db.fraudAlert.count({
        where: { businessId: { in: businessIds }, createdAt: { gte: startDate } },
      }),
      db.complianceScreening.count({
        where: { businessId: { in: businessIds }, createdAt: { gte: startDate } },
      }),
      db.paymentLink.aggregate({
        _sum: { totalCollected: true },
        _count: true,
        where: { businessId: { in: businessIds }, createdAt: { gte: startDate } },
      }),
      db.invoice.count({
        where: { senderId: { in: businessIds }, status: 'overdue' },
      }),
    ]);

    const result = {
      period,
      startDate,
      endDate: now,
      summary: {
        totalPaymentVolume: paymentVolume._sum.amount || 0,
        transactionCount: completedTxCount,
        activeEscrowCount: activeEscrows._count,
        activeEscrowVolume: activeEscrows._sum.amount || 0,
        completedEscrowVolume: completedEscrows._sum.amount || 0,
        completedEscrowCount: completedEscrows._count,
        invoiceTotalAmount: invoiceStats._sum.amount || 0,
        invoicePaidAmount: invoiceStats._sum.paidAmount || 0,
        invoiceCount: invoiceStats._count,
        overdueInvoices,
        walletBalance: walletStats._sum.balance || 0,
        walletAvailable: walletStats._sum.availableBalance || 0,
        walletCount: walletStats._count,
        outstandingCollections: collectionStats._sum.outstandingAmount || 0,
        activeCollections: collectionStats._count,
        fraudAlertCount: fraudCount,
        complianceScreeningCount: screeningCount,
        paymentLinkRevenue: linkStats._sum.totalCollected || 0,
        paymentLinkCount: linkStats._count,
      },
    };

    // Cache the result for subsequent requests within 5s
    analyticsCache.set(analyticsKey, result);

    return ok(result);
  } catch (error: any) {
    console.error('Analytics GET error:', error);
    return error('Failed to fetch analytics');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/analytics');
