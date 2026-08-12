import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError, } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, forbidden, notFound, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return unauthorized('Authentication required');

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const status = url.searchParams.get('status');

    // Get business IDs for this tenant
    const businessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map((b: any) => b.id);

    const where: any = { businessId: { in: businessIds } };
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        include: {
          _count: { select: { invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.subscription.count({ where }),
    ]);

    // Enrich with business names
    const subBizIds = [...new Set(subscriptions.map((s: any) => s.businessId))];
    const businesses = await db.business.findMany({
      where: { id: { in: subBizIds } },
      select: { id: true, name: true },
    });
    const bizMap = Object.fromEntries(businesses.map((b: any) => [b.id, b.name]));

    return ok({
      data: subscriptions.map((s: any) => ({
        ...s,
        business: { id: s.businessId, name: bizMap[s.businessId] || 'Unknown' },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Subscriptions GET error:', err);
    return error('Failed to fetch subscriptions');
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') return forbidden('Insufficient permissions');

    const body = await req.json();
    const { businessId, planName, amount, currency, interval, trialDays } = body;

    if (!businessId || !planName || !amount) {
      return badRequest('businessId, planName, and amount are required');
    }

    // Verify business belongs to tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
    });
    if (!business) return notFound('Business not found');

    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (interval === 'quarterly') {
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    } else if (interval === 'weekly') {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const subData: any = {
      businessId,
      planName,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      interval: interval || 'monthly',
      status: trialDays ? 'trialing' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };

    if (trialDays) {
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + parseInt(trialDays));
      subData.trialEndsAt = trialEnd;
    }

    const subscription = await db.subscription.create({
      data: subData,
    });

    return created(subscription);
  } catch (err: any) {
    console.error('Subscriptions POST error:', err);return error('Failed to create subscription');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/subscriptions');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/subscriptions');
