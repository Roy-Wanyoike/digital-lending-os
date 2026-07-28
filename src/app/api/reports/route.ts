import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'summary';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get business IDs for this tenant
    const businessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id);

    switch (type) {
      case 'transactions': {
        const transactions = await db.paymentTransaction.findMany({
          where: { createdAt: dateFilter, intent: { fromBusinessId: { in: businessIds } } },
          include: { intent: { select: { id: true, currency: true, status: true } } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        return successResponse({ type, data: transactions, generatedAt: new Date() });
      }

      case 'invoices': {
        const invoices = await db.invoice.findMany({
          where: { senderId: { in: businessIds }, createdAt: dateFilter },
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        return successResponse({ type, data: invoices, generatedAt: new Date() });
      }

      case 'wallets': {
        const wallets = await db.wallet.findMany({
          where: { businessId: { in: businessIds } },
          include: { business: { select: { id: true, name: true } } },
          orderBy: { currency: 'asc' },
        });
        return successResponse({ type, data: wallets, generatedAt: new Date() });
      }

      case 'escrow': {
        const escrows = await db.escrowTransaction.findMany({
          where: { buyerId: { in: businessIds }, createdAt: dateFilter },
          include: {
            buyer: { select: { id: true, name: true } },
            seller: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        return successResponse({ type, data: escrows, generatedAt: new Date() });
      }

      case 'collections': {
        const collections = await db.collectionCase.findMany({
          where: { businessId: { in: businessIds }, createdAt: dateFilter },
          include: {
            debtor: { select: { id: true, name: true } },
            _count: { select: { reminders: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        return successResponse({ type, data: collections, generatedAt: new Date() });
      }

      default: {
        const [escrowStats, invoiceStats, walletStats, collectionStats, fraudStats] = await Promise.all([
          db.escrowTransaction.aggregate({
            _sum: { amount: true },
            _count: true,
            where: { buyerId: { in: businessIds }, createdAt: dateFilter },
          }),
          db.invoice.aggregate({
            _sum: { amount: true, paidAmount: true },
            _count: true,
            where: { senderId: { in: businessIds }, createdAt: dateFilter },
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
            where: { businessId: { in: businessIds }, createdAt: dateFilter },
          }),
        ]);

        return successResponse({
          type: 'summary',
          data: {
            escrow: { totalVolume: escrowStats._sum.amount || 0, count: escrowStats._count },
            invoices: { totalAmount: invoiceStats._sum.amount || 0, paidAmount: invoiceStats._sum.paidAmount || 0, count: invoiceStats._count },
            wallets: { totalBalance: walletStats._sum.balance || 0, availableBalance: walletStats._sum.availableBalance || 0, count: walletStats._count },
            collections: { outstandingAmount: collectionStats._sum.outstandingAmount || 0, activeCases: collectionStats._count },
            fraudAlerts: fraudStats,
          },
          generatedAt: new Date(),
        });
      }
    }
  } catch (error: any) {
    console.error('Reports GET error:', error);
    return errorResponse('Failed to generate report', 500);
  }
}
