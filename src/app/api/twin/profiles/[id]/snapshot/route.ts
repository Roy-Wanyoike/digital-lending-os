import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { created, notFound, withErrorHandler } from '@/backend/lib/api-response';

const riskFactorPool = [
  'High accounts receivable aging',
  'Currency exposure in 3 markets',
  'Concentration risk — top 3 clients represent 70% of revenue',
  'Rising supplier payment delays',
  'Increasing dispute rate over last 60 days',
  'Cash reserves below 2-month operating expenses',
  'Dependency on single payment processor',
  'Seasonal revenue volatility detected',
  'Growing accounts payable over 90 days',
  'Foreign exchange headwinds in emerging markets',
  'Regulatory compliance gaps in 2 jurisdictions',
  'Supply chain disruption risk identified',
];

const opportunityPool = [
  'Expand to 2 new markets',
  'Negotiate better payment terms',
  'Diversify supplier base to reduce risk',
  'Implement dynamic pricing to boost margins',
  'Leverage trade finance for faster cash conversion',
  'Automate invoice processing to reduce DSO',
  'Establish multi-currency treasury management',
  'Secure early-payment discount programs',
  'Launch cross-border escrow services',
  'Optimize inventory turnover with predictive analytics',
  'Build strategic partnership with logistics providers',
  'Adopt supply chain financing platform',
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateAISummary(
  healthScore: number,
  cashFlowHealth: number,
  creditWorthiness: number,
  liquidityScore: number,
  growthTrajectory: string,
  riskFactors: string[],
  opportunities: string[]
): string {
  const healthLabel =
    healthScore >= 75 ? 'strong' : healthScore >= 50 ? 'moderate' : 'concerning';

  const trajectoryLabel = growthTrajectory === 'rapid_growth'
    ? 'rapid growth trajectory'
    : growthTrajectory === 'growing'
      ? 'steady growth trajectory'
      : growthTrajectory === 'stable'
        ? 'stable financial position'
        : 'declining trend';

  const cashFlowLabel =
    cashFlowHealth >= 70 ? 'healthy' : cashFlowHealth >= 40 ? 'adequate' : 'stressed';

  return `The financial digital twin exhibits a ${healthLabel} overall health score of ${healthScore.toFixed(1)}/100, with a ${trajectoryLabel}. Cash flow health is ${cashFlowLabel} at ${cashFlowHealth.toFixed(1)}/100, while credit worthiness stands at ${creditWorthiness.toFixed(1)}/100 and liquidity at ${liquidityScore.toFixed(1)}/100. Key risk factors include ${riskFactors.slice(0, 2).join(' and ').toLowerCase()}. Notable opportunities for improvement include ${opportunities.slice(0, 2).join(' and ').toLowerCase()}. Continued monitoring and proactive risk management are recommended to sustain financial stability.`;
}

// POST /api/twin/profiles/[id]/snapshot — Generate a financial snapshot
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request);
  const { id } = await params;

  // Verify twin exists and belongs to tenant
  const twin = await db.financialDigitalTwin.findUnique({
    where: { id },
    include: { business: { select: { tenantId: true } } },
  });

  if (!twin || twin.business.tenantId !== user.tenantId) {
    return notFound('Digital twin not found');
  }

  // Determine snapshot type: event_driven if recent snapshot exists within 24h, otherwise daily
  const recentSnapshot = await db.financialSnapshot.findFirst({
    where: {
      twinId: id,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  const snapshotType = recentSnapshot ? 'event_driven' : 'daily';

  const riskFactors = pickRandom(riskFactorPool, 3);
  const opportunities = pickRandom(opportunityPool, 3);

  const aiSummary = generateAISummary(
    twin.healthScore,
    twin.cashFlowHealth,
    twin.creditWorthiness,
    twin.liquidityScore,
    twin.growthTrajectory,
    riskFactors,
    opportunities
  );

  const snapshot = await db.financialSnapshot.create({
    data: {
      twinId: id,
      snapshotType,
      healthScore: twin.healthScore,
      cashFlowHealth: twin.cashFlowHealth,
      creditWorthiness: twin.creditWorthiness,
      liquidityScore: twin.liquidityScore,
      topRiskFactors: JSON.stringify(riskFactors),
      topOpportunities: JSON.stringify(opportunities),
      aiSummary,
    },
  });

  return created(snapshot);
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/twin/profiles/[id]/snapshot');
