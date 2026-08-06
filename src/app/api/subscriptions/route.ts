import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth, AuthError, errorResponse, successResponse } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

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

    return NextResponse.json({
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
  } catch (error: any) {
    console.error('Subscriptions GET error:', error);
    return errorResponse('Failed to fetch subscriptions', 500);
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') return errorResponse('Insufficient permissions', 403);

    const body = await req.json();
    const { businessId, planName, amount, currency, interval, trialDays } = body;

    if (!businessId || !planName || !amount) {
      return errorResponse('businessId, planName, and amount are required', 400);
    }

    // Verify business belongs to tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
    });
    if (!business) return errorResponse('Business not found', 404);

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

    return successResponse(subscription, 201);
  } catch (error: any) {
    console.error('Subscriptions POST error:', error);
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return errorResponse('Failed to create subscription', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/subscriptions');

export const POST = withApiTelemetry(postHandler, '/api/subscriptions');
