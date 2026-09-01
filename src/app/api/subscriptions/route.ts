import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { idParamSchema, amountSchema, currencySchema } from '@/backend/lib/validation/schemas';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import {
  badRequest,
  created,
  forbidden,
  notFound,
  ok,
  unauthorized,
  withErrorHandler,
} from '@/backend/lib/api-response';

const log = getLogger().withContext({ route: '/api/subscriptions' });

// ─── Zod Validation Schema ──────────────────────────────────────────────

const VALID_SUBSCRIPTION_PLANS = ['free', 'starter', 'business', 'enterprise'] as const;
const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
const VALID_STATUSES = ['active', 'past_due', 'cancelled', 'paused', 'trialing'] as const;

type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

type SubscriptionStatus = (typeof VALID_STATUSES)[number];

const subscriptionCreateSchema = z.object({
  businessId: idParamSchema,
  plan: z.enum(VALID_SUBSCRIPTION_PLANS, {
    message: `plan must be one of: ${VALID_SUBSCRIPTION_PLANS.join(', ')}`,
  }),
  billingCycle: z.enum(VALID_BILLING_CYCLES, {
    message: `billingCycle must be one of: ${VALID_BILLING_CYCLES.join(', ')}`,
  }),
  amount: z
    .number({ message: 'Amount must be a valid number' })
    .min(0, 'Amount must be non-negative')
    .max(999_999_999, 'Amount exceeds maximum allowed'),
  currency: currencySchema.default('USD'),
  paymentMethodId: z.string().max(255, 'paymentMethodId is too long').trim().optional(),
  autoRenew: z.boolean().default(true),
  trialDays: z
    .number()
    .int('trialDays must be an integer')
    .positive('trialDays must be positive')
    .max(365, 'trialDays cannot exceed 365')
    .optional(),
  tenantId: z.string().optional(), // validated against auth — not used for creation
});

type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Computes the period end date from a start date and billing cycle.
 * Uses a cloned date to avoid mutating the original.
 */
function computePeriodEnd(billingCycle: BillingCycle, start: Date): Date {
  const end = new Date(start.getTime());
  switch (billingCycle) {
    case 'yearly':
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'quarterly':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'monthly':
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }
  return end;
}

// ─── GET Handler ─────────────────────────────────────────────────────────

async function getHandler(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const status = url.searchParams.get('status');

  // Validate status filter if provided
  if (status && !VALID_STATUSES.includes(status as SubscriptionStatus)) {
    return badRequest(
      `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`,
    );
  }

  // Get business IDs for this tenant
  const tenantBusinesses = await db.business.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });
  const businessIds = tenantBusinesses.map((b: { id: string }) => b.id);

  const where = {
    businessId: { in: businessIds },
    ...(status ? { status } : {}),
  };

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
  const subBizIds = [...new Set(subscriptions.map((s: { businessId: string }) => s.businessId))];
  const bizRecords = await db.business.findMany({
    where: { id: { in: subBizIds } },
    select: { id: true, name: true },
  });
  const bizMap = new Map(bizRecords.map((b: { id: string; name: string }) => [b.id, b.name]));

  return ok({
    data: subscriptions.map((s: { businessId: string; [key: string]: unknown }) => ({
      ...s,
      business: { id: s.businessId, name: bizMap.get(s.businessId) || 'Unknown' },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ─── POST Handler ────────────────────────────────────────────────────────

async function postHandler(req: NextRequest) {
  const user = await requireAuth(req);
  if (user.role !== 'admin') return forbidden();

  const body = await req.json();
  const parsed = subscriptionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      'Validation failed',
      parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    );
  }

  const data: SubscriptionCreateInput = parsed.data;

  // Validate tenantId if provided — must match authenticated user's tenant
  if (data.tenantId && data.tenantId !== user.tenantId) {
    return badRequest('tenantId does not match your organization');
  }

  // Verify business belongs to tenant
  const business = await db.business.findFirst({
    where: { id: data.businessId, tenantId: user.tenantId },
  });
  if (!business) return notFound('Business not found or does not belong to your organization');

  // Compute billing period using proper date math
  const now = new Date();
  const currentPeriodEnd = computePeriodEnd(data.billingCycle, now);

  // Build subscription data — no `any`, fully typed
  const subscriptionData = {
    businessId: data.businessId,
    planName: data.plan,
    amount: data.amount,
    currency: data.currency,
    interval: data.billingCycle,
    status: (data.trialDays ? 'trialing' : 'active') as string,
    currentPeriodStart: now,
    currentPeriodEnd,
    metadata: JSON.stringify({
      autoRenew: data.autoRenew,
      ...(data.paymentMethodId ? { paymentMethodId: data.paymentMethodId } : {}),
    }),
    ...(data.trialDays
      ? { trialEndsAt: new Date(now.getTime() + data.trialDays * 86_400_000) }
      : {}),
  };

  const subscription = await db.subscription.create({
    data: subscriptionData,
  });

  log.info('Subscription created', {
    subscriptionId: subscription.id,
    businessId: data.businessId,
    plan: data.plan,
    billingCycle: data.billingCycle,
    tenantId: user.tenantId,
  });

  return created(subscription);
}

// ─── Route Exports ───────────────────────────────────────────────────────

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/subscriptions');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/subscriptions');
