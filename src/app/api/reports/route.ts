import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
/** Allowed report types to prevent arbitrary switch-case fallthrough. */
const VALID_REPORT_TYPES = ['transactions', 'invoices', 'wallets', 'escrow', 'collections', 'summary'] as const;

type ReportType = (typeof VALID_REPORT_TYPES)[number];

/** Maximum rows per report page. */
const MAX_REPORT_LIMIT = 200;

/**
 * Parse and validate a date string. Returns null if invalid.
 */
function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const url = new URL(req.url);
    const rawType = url.searchParams.get('type') || 'summary';
    const type = VALID_REPORT_TYPES.includes(rawType as ReportType)
      ? (rawType as ReportType)
      : 'summary';

    const startDate = parseDateParam(url.searchParams.get('startDate'));
    const endDate = parseDateParam(url.searchParams.get('endDate'));

    // Validate date range: endDate must be >= startDate
    if (startDate && endDate && endDate < startDate) {
      return errorResponse('endDate must be on or after startDate', 400);
    }

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Pagination parameters
    const limit = Math.min(MAX_REPORT_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') || String(MAX_REPORT_LIMIT), 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

    // Get business IDs for this tenant
    const businessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id);

    if (businessIds.length === 0) {
      // No businesses in this tenant — return empty report
      return successResponse({ type, data: [], total: 0, generatedAt: new Date() });
    }

    switch (type) {
      case 'transactions': {
        const [transactions, total] = await Promise.all([
          db.paymentTransaction.findMany({
            where: { createdAt: dateFilter, intent: { fromBusinessId: { in: businessIds } } },
            include: { intent: { select: { id: true, sourceCurrency: true, targetCurrency: true, status: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          db.paymentTransaction.count({
            where: { createdAt: dateFilter, intent: { fromBusinessId: { in: businessIds } } },
          }),
        ]);
        return successResponse({ type, data: transactions, total, generatedAt: new Date() });
      }

      case 'invoices': {
        const [invoices, total] = await Promise.all([
          db.invoice.findMany({
            where: { senderId: { in: businessIds }, createdAt: dateFilter },
            include: {
              sender: { select: { id: true, name: true } },
              receiver: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          db.invoice.count({
            where: { senderId: { in: businessIds }, createdAt: dateFilter },
          }),
        ]);
        return successResponse({ type, data: invoices, total, generatedAt: new Date() });
      }

      case 'wallets': {
        // Wallets are typically few per tenant — no pagination needed
        const wallets = await db.wallet.findMany({
          where: { businessId: { in: businessIds } },
          include: { business: { select: { id: true, name: true } } },
          orderBy: { currency: 'asc' },
        });
        return successResponse({ type, data: wallets, total: wallets.length, generatedAt: new Date() });
      }

      case 'escrow': {
        const [escrows, total] = await Promise.all([
          db.escrowTransaction.findMany({
            where: { buyerId: { in: businessIds }, createdAt: dateFilter },
            include: {
              buyer: { select: { id: true, name: true } },
              seller: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          db.escrowTransaction.count({
            where: { buyerId: { in: businessIds }, createdAt: dateFilter },
          }),
        ]);
        return successResponse({ type, data: escrows, total, generatedAt: new Date() });
      }

      case 'collections': {
        const [collections, total] = await Promise.all([
          db.collectionCase.findMany({
            where: { businessId: { in: businessIds }, createdAt: dateFilter },
            include: {
              _count: { select: { reminders: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          db.collectionCase.count({
            where: { businessId: { in: businessIds }, createdAt: dateFilter },
          }),
        ]);
        return successResponse({ type, data: collections, total, generatedAt: new Date() });
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

export const GET = withApiTelemetry(getHandler, '/api/reports');
