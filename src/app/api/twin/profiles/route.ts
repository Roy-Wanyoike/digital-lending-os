import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, created, badRequest, notFound, unauthorized, conflict, withErrorHandler } from '@/backend/lib/api-response';

const createTwinSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
});

/**
 * Calculate initial scores from real business data at onboarding time.
 *
 * - revenueScore: invoice totals vs a baseline (first $50k maps linearly to 100)
 * - growthScore:  transaction volume trend over last 3 months
 * - riskScore:    inverted from failed payments, disputes, compliance flags, fraud alerts
 * - operationalScore: account age + verification completeness
 */
async function calculateInitialScores(businessId: string) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Fetch wallets (for balances and transaction access)
  const wallets = await db.wallet.findMany({
    where: { businessId, status: 'active' },
    select: { id: true, balance: true, availableBalance: true, currency: true },
  });
  const walletIds = wallets.map((w: { id: string; balance: number; availableBalance: number; currency: string }) => w.id);

  const totalBalance = wallets.reduce((s: number, w: { id: string; balance: number; availableBalance: number; currency: string }) => s + w.availableBalance, 0);

  // Invoice totals (sent invoices as revenue proxy)
  const invoiceAgg = await db.invoice.aggregate({
    _sum: { amount: true, paidAmount: true },
    _count: true,
    where: { senderId: businessId, createdAt: { gte: threeMonthsAgo } },
  });
  const invoiceTotal = invoiceAgg._sum.amount ?? 0;
  const invoicePaidTotal = invoiceAgg._sum.paidAmount ?? 0;
  const invoiceCount = invoiceAgg._count;

  // Wallet transaction volumes per month (last 3 months)
  const monthBuckets = [
    { label: 'm3', start: threeMonthsAgo, end: twoMonthsAgo },
    { label: 'm2', start: twoMonthsAgo, end: oneMonthAgo },
    { label: 'm1', start: oneMonthAgo, end: now },
  ];

  const monthlyVolumes: number[] = [];
  for (const bucket of monthBuckets) {
    if (walletIds.length === 0) {
      monthlyVolumes.push(0);
      continue;
    }
    const agg = await db.walletTransaction.aggregate({
      _sum: { amount: true },
      _count: true,
      where: {
        walletId: { in: walletIds },
        createdAt: { gte: bucket.start, lt: bucket.end },
        status: 'completed',
      },
    });
    monthlyVolumes.push(agg._sum.amount ?? 0);
  }

  // Failed transactions & disputes (risk signals)
  const failedTxCount = walletIds.length > 0
    ? await db.walletTransaction.count({
        where: {
          walletId: { in: walletIds },
          status: 'failed',
          createdAt: { gte: threeMonthsAgo },
        },
      })
    : 0;

  const totalTxCount = walletIds.length > 0
    ? await db.walletTransaction.count({
        where: {
          walletId: { in: walletIds },
          createdAt: { gte: threeMonthsAgo },
        },
      })
    : 0;

  const disputeCount = await db.escrowTransaction.count({
    where: {
      OR: [{ buyerId: businessId }, { sellerId: businessId }],
      disputes: { some: { status: { in: ['open', 'under_review', 'escalated'] } } },
    },
  });

  const complianceAlerts = await db.complianceScreening.count({
    where: {
      businessId,
      result: { in: ['match', 'potential_match', 'alert'] },
    },
  });

  const fraudAlerts = await db.fraudAlert.count({
    where: {
      businessId,
      status: { in: ['open', 'investigating', 'confirmed_fraud'] },
    },
  });

  // Trust score & verification
  const trustScore = await db.trustScore.findUnique({
    where: { businessId },
    select: { overallScore: true, paymentScore: true, complianceScore: true },
  });

  const passport = await db.commercePassport.findUnique({
    where: { businessId },
    select: { kycStatus: true, amlStatus: true, credentialLevel: true },
  });

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { createdAt: true, verifiedAt: true },
  });

  // ── revenueScore: based on invoice totals ──
  // First $50k of invoice volume maps linearly to 0-100
  const revenueScore = Math.min(100, (invoiceTotal / 50000) * 100);

  // ── growthScore: transaction volume trend ──
  let growthScore = 50;
  if (monthlyVolumes[0] > 0) {
    // Compare most recent month to oldest month
    const ratio = monthlyVolumes[2] / monthlyVolumes[0];
    if (ratio >= 1.5) growthScore = 90;
    else if (ratio >= 1.2) growthScore = 75;
    else if (ratio >= 1.0) growthScore = 60;
    else if (ratio >= 0.8) growthScore = 40;
    else growthScore = 20;
  } else if (monthlyVolumes[1] > 0 || monthlyVolumes[2] > 0) {
    // No data in oldest month but some in newer months → positive signal
    growthScore = 65;
  }

  // ── riskScore: inverted risk (100 = low risk) ──
  const failRate = totalTxCount > 0 ? failedTxCount / totalTxCount : 0;
  const riskPenalty =
    failRate * 200 +       // up to 40 points for 20%+ fail rate
    disputeCount * 8 +     // up to 24 points for 3+ disputes
    complianceAlerts * 10 + // up to 30 for 3+ compliance flags
    fraudAlerts * 15;      // up to 45 for 3+ fraud alerts
  const riskScore = Math.max(0, Math.min(100, 100 - riskPenalty));

  // ── operationalScore: account age + verification ──
  let operationalScore = 20; // baseline
  if (business) {
    const ageDays = (now.getTime() - business.createdAt.getTime()) / 86400000;
    operationalScore += Math.min(30, (ageDays / 365) * 30); // up to 30 for 1+ year
    if (business.verifiedAt) operationalScore += 20;
  }
  if (passport) {
    if (passport.kycStatus === 'verified') operationalScore += 15;
    else if (passport.kycStatus === 'in_progress') operationalScore += 5;
    if (passport.amlStatus === 'cleared') operationalScore += 15;
  }
  if (trustScore && trustScore.overallScore > 50) {
    operationalScore += (trustScore.overallScore - 50) * 0.2; // up to 10 bonus
  }
  operationalScore = Math.min(100, operationalScore);

  // Composite scores for the twin
  const healthScore = Math.round((revenueScore * 0.3 + growthScore * 0.25 + riskScore * 0.25 + operationalScore * 0.2) * 100) / 100;
  const creditWorthiness = Math.round((riskScore * 0.5 + (trustScore?.paymentScore ?? 50) * 0.3 + revenueScore * 0.2) * 100) / 100;
  const liquidityScore = Math.round(Math.min(100, (totalBalance > 100000 ? 80 : totalBalance > 10000 ? 60 : totalBalance > 0 ? 40 : 10) + (wallets.length > 1 ? 10 : 0)) * 100) / 100;

  let growthTrajectory = 'stable';
  if (growthScore >= 80) growthTrajectory = 'rapid_growth';
  else if (growthScore >= 65) growthTrajectory = 'growing';
  else if (growthScore <= 30) growthTrajectory = 'declining';

  return {
    healthScore,
    cashFlowHealth: Math.round((creditWorthiness * 0.6 + liquidityScore * 0.4) * 100) / 100,
    creditWorthiness,
    liquidityScore,
    growthTrajectory,
  };
}

// GET /api/twin/profiles — List financial digital twins
async function getHandler(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized('Authentication required');

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const minHealthScore = searchParams.get('minHealthScore');
  const growthTrajectory = searchParams.get('growthTrajectory');

  const where: Record<string, unknown> = { business: { tenantId: user.tenantId } };

  if (businessId) {
    where.businessId = businessId;
  }
  if (minHealthScore) {
    where.healthScore = { gte: parseFloat(minHealthScore) };
  }
  if (growthTrajectory) {
    where.growthTrajectory = growthTrajectory;
  }

  const twins = await db.financialDigitalTwin.findMany({
    where,
    include: {
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
        },
      },
      metrics: {
        orderBy: { periodDate: 'asc' },
        take: 6,
      },
      predictions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(twins);
}

// POST /api/twin/profiles — Create a financial digital twin
async function postHandler(request: NextRequest) {
  const user = await requireAuth(request);
  const body = await request.json();
  const parsed = createTwinSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((e) => e.message).join(', '));
  }

  const { businessId } = parsed.data;

  // Check business exists and belongs to tenant
  const business = await db.business.findUnique({
    where: { id: businessId },
  });

  if (!business || business.tenantId !== user.tenantId) {
    return notFound('Business not found');
  }

  // Check business doesn't already have a twin
  const existingTwin = await db.financialDigitalTwin.findUnique({
    where: { businessId },
  });

  if (existingTwin) {
    return conflict('This business already has a financial digital twin');
  }

  // Calculate initial scores from real business data
  const scores = await calculateInitialScores(businessId);

  const twin = await db.financialDigitalTwin.create({
    data: {
      businessId,
      healthScore: scores.healthScore,
      cashFlowHealth: scores.cashFlowHealth,
      riskAppetite: 'moderate',
      creditWorthiness: scores.creditWorthiness,
      liquidityScore: scores.liquidityScore,
      growthTrajectory: scores.growthTrajectory,
      aiModelVersion: 'v2.0',
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
        },
      },
    },
  });

  return created(twin);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/twin/profiles');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles');
