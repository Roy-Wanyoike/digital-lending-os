import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, requireAuth } from "@/lib/auth/api-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
// ── Zod Schema ───────────────────────────────────────────────
const createDisputeSchema = z.object({
  raisedBy: z.enum(["buyer", "seller"] as const, {
    message: "raisedBy must be 'buyer' or 'seller'",
  }),
  reason: z.string().min(1, "Reason is required"),
  description: z.string().optional(),
});

// ── Types ──────────────────────────────────────────────────
interface TrustScoreData {
  overallScore: number;
  deliveryScore: number;
  qualityScore: number;
  paymentScore: number;
  totalTransactions: number;
}

interface MilestoneData {
  sequence: number;
  title: string;
  status: string;
  evidence: string | null;
  amount: number;
}

interface RecommendationResult {
  action: string;
  reasoning: string;
  confidence: number;
  data: Record<string, unknown>;
}

// ── Rule-based dispute recommendation engine ────────────────
async function generateDisputeRecommendation(
  dispute: { reason: string; description: string | null; raisedBy: string },
  escrow: {
    id: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currentMilestone: number;
    totalMilestones: number;
  },
): Promise<RecommendationResult> {
  const TRUST_THRESHOLD = 15; // score gap to consider one party "much higher"

  // 1. Fetch trust scores for both parties in parallel
  const [buyerTrust, sellerTrust] = await Promise.all([
    db.trustScore.findUnique({ where: { businessId: escrow.buyerId } }),
    db.trustScore.findUnique({ where: { businessId: escrow.sellerId } }),
  ]);

  const bScore: TrustScoreData = buyerTrust
    ? {
        overallScore: buyerTrust.overallScore,
        deliveryScore: buyerTrust.deliveryScore,
        qualityScore: buyerTrust.qualityScore,
        paymentScore: buyerTrust.paymentScore,
        totalTransactions: buyerTrust.totalTransactions,
      }
    : { overallScore: 50, deliveryScore: 50, qualityScore: 50, paymentScore: 50, totalTransactions: 0 };

  const sScore: TrustScoreData = sellerTrust
    ? {
        overallScore: sellerTrust.overallScore,
        deliveryScore: sellerTrust.deliveryScore,
        qualityScore: sellerTrust.qualityScore,
        paymentScore: sellerTrust.paymentScore,
        totalTransactions: sellerTrust.totalTransactions,
      }
    : { overallScore: 50, deliveryScore: 50, qualityScore: 50, paymentScore: 50, totalTransactions: 0 };

  // 2. Fetch milestones and check delivery evidence
  const milestones: MilestoneData[] = await db.escrowMilestone.findMany({
    where: { escrowId: escrow.id },
    orderBy: { sequence: 'asc' },
  });

  const deliveredMilestones = milestones.filter((m) => m.status === 'released');
  const hasEvidence = milestones.some((m) => m.evidence && JSON.parse(m.evidence).length > 0);

  // 3. Check payment history between the parties
  const pastTransactions = await db.escrowTransaction.count({
    where: {
      buyerId: escrow.buyerId,
      sellerId: escrow.sellerId,
      status: 'completed',
      id: { not: escrow.id },
    },
  });

  const relationship = await db.businessRelationship.findFirst({
    where: {
      fromBusinessId: escrow.buyerId,
      toBusinessId: escrow.sellerId,
      status: 'active',
    },
  });

  // 4. Classify dispute type
  const reasonLower = (dispute.reason + ' ' + (dispute.description || '')).toLowerCase();
  const isQualityDispute = /quality|defect|damaged|not as described|wrong item|incomplete|poor|substandard|faulty/.test(reasonLower);

  // 5. Calculate trust score gap
  const trustGap = bScore.overallScore - sScore.overallScore;
  const buyerHasMuchHigherTrust = trustGap > TRUST_THRESHOLD;
  const sellerHasMuchHigherTrust = trustGap < -TRUST_THRESHOLD;

  // 6. Apply rules in priority order
  // Rule A: Buyer trust >> Seller trust AND no delivery proof
  if (buyerHasMuchHigherTrust && !hasEvidence && !isQualityDispute) {
    return {
      action: 'refund_to_buyer',
      reasoning: [
        `Buyer trust score (${bScore.overallScore.toFixed(1)}) exceeds seller trust score (${sScore.overallScore.toFixed(1)}) by ${(trustGap).toFixed(1)} points.`,
        `No delivery evidence was attached to any milestone.`,
        pastTransactions === 0
          ? 'No prior completed transactions exist between these parties.'
          : `${pastTransactions} prior completed transaction(s) between these parties.`,
        `Recommending full refund to buyer due to insufficient delivery proof and significant trust score disparity.`,
      ].join(' '),
      confidence: Math.min(0.9, 0.5 + Math.abs(trustGap) / 100),
      data: {
        buyerOverallScore: bScore.overallScore,
        sellerOverallScore: sScore.overallScore,
        trustGap,
        hasEvidence: false,
        pastTransactions,
      },
    };
  }

  // Rule B: Seller trust >> Buyer trust AND milestone was delivered
  if (sellerHasMuchHigherTrust && deliveredMilestones.length > 0) {
    const deliveredAmount = deliveredMilestones.reduce((sum, m) => sum + m.amount, 0);
    return {
      action: 'release_to_seller',
      reasoning: [
        `Seller trust score (${sScore.overallScore.toFixed(1)}) exceeds buyer trust score (${bScore.overallScore.toFixed(1)}) by ${Math.abs(trustGap).toFixed(1)} points.`,
        `${deliveredMilestones.length} of ${milestones.length} milestone(s) show 'released' status, totaling $${deliveredAmount.toFixed(2)} of $${escrow.amount.toFixed(2)}.`,
        hasEvidence
          ? 'Supporting evidence is attached to at least one milestone.'
          : 'No supporting evidence found on milestones despite released status.',
        `Recommending release of funds to seller based on delivery confirmation and seller's stronger trust profile.`,
      ].join(' '),
      confidence: Math.min(0.9, 0.5 + Math.abs(trustGap) / 100),
      data: {
        buyerOverallScore: bScore.overallScore,
        sellerOverallScore: sScore.overallScore,
        trustGap,
        deliveredMilestones: deliveredMilestones.length,
        totalMilestones: milestones.length,
        deliveredAmount,
        hasEvidence,
        pastTransactions,
      },
    };
  }

  // Rule C: Quality dispute (not delivery) → mediate
  if (isQualityDispute) {
    return {
      action: 'mediate',
      reasoning: [
        `Dispute is classified as a quality issue: "${dispute.reason}".`,
        `Quality requires subjective assessment — buyer quality score context: ${bScore.qualityScore.toFixed(1)}, seller quality score context: ${sScore.qualityScore.toFixed(1)}.`,
        milestones.length > 0
          ? `${milestones.length} milestone(s) exist for this escrow. Manual review of deliverables is required.`
          : 'No milestones defined — deliverable scope requires clarification.',
        `Recommending human mediation to evaluate deliverable quality against the agreed specification.`,
      ].join(' '),
      confidence: 0.7,
      data: {
        buyerQualityScore: bScore.qualityScore,
        sellerQualityScore: sScore.qualityScore,
        disputeType: 'quality',
        milestonesCount: milestones.length,
        hasEvidence,
      },
    };
  }

  // Rule D: Trust scores are similar → partial release
  const sellerShare = hasEvidence ? 0.65 : 0.50;
  const partialAmount = (escrow.amount * sellerShare).toFixed(2);
  const refundAmount = (escrow.amount * (1 - sellerShare)).toFixed(2);

  const partialReasoning: string[] = [
    `Buyer trust score: ${bScore.overallScore.toFixed(1)} vs seller trust score: ${sScore.overallScore.toFixed(1)} — scores are within ${TRUST_THRESHOLD} points of each other.`,
  ];

  if (deliveredMilestones.length > 0) {
    partialReasoning.push(
      `${deliveredMilestones.length} milestone(s) were previously released, indicating partial fulfillment.`,
    );
  }

  if (hasEvidence) {
    partialReasoning.push(
      'Delivery evidence is present, supporting partial release to seller.',
    );
  } else {
    partialReasoning.push(
      'No delivery evidence found — defaulting to an even split.',
    );
  }

  if (pastTransactions > 0) {
    partialReasoning.push(
      `${pastTransactions} prior completed transaction(s) between these parties suggest an established relationship.`,
    );
  }

  partialReasoning.push(
    `Recommending partial release: $${partialAmount} (${(sellerShare * 100).toFixed(0)}%) to seller, $${refundAmount} (${((1 - sellerShare) * 100).toFixed(0)}%) refund to buyer.`,
  );

  return {
    action: 'partial_release',
    reasoning: partialReasoning.join(' '),
    confidence: 0.6,
    data: {
      buyerOverallScore: bScore.overallScore,
      sellerOverallScore: sScore.overallScore,
      trustGap,
      sellerPercentage: sellerShare * 100,
      sellerAmount: parseFloat(partialAmount),
      buyerRefund: parseFloat(refundAmount),
      hasEvidence,
      deliveredMilestones: deliveredMilestones.length,
      pastTransactions,
      relationshipTrust: relationship?.trustLevel ?? null,
    },
  };
}

// ── GET: List disputes for an escrow ────────────────────────
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required')
    const { id } = await params;

    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      select: { id: true },
    });

    if (!escrow) {
      return notFound("Escrow transaction not found");
    }

    const disputes = await db.dispute.findMany({
      where: { escrowId: id },
      orderBy: { createdAt: "desc" },
    });

    return ok(disputes);
  } catch (err: any) {
    console.error("Error listing disputes:", err);return error("Failed to list disputes");
  }
}

// ── POST: Create a dispute ──────────────────────────────────
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = createDisputeSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Validation failed", parsed.error.issues);
    }

    const { raisedBy, reason, description } = parsed.data;

    // Fetch escrow
    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!escrow) {
      return notFound("Escrow transaction not found");
    }

    // Validate escrow is in a disputable state
    if (!['in_escrow', 'funded'].includes(escrow.status)) {
      return conflict(`Cannot dispute escrow with status '${escrow.status}'. Only 'in_escrow' or 'funded' escrows can be disputed.`);
    }

    // Generate rule-based dispute recommendation
    const recommendation = await generateDisputeRecommendation(
      { reason, description: description ?? null, raisedBy },
      { buyerId: escrow.buyerId, sellerId: escrow.sellerId, amount: escrow.amount, currentMilestone: escrow.currentMilestone, totalMilestones: escrow.totalMilestones, id },
    );

    const recommendationSummary = `[${recommendation.action.toUpperCase()}] ${recommendation.reasoning}`;

    // Create dispute and update escrow status in a transaction
    const dispute = await db.$transaction(async (tx: any) => {
      const newDispute = await tx.dispute.create({
        data: {
          escrowId: id,
          raisedBy,
          reason,
          description: description ?? null,
          aiRecommendation: recommendationSummary,
          metadata: JSON.stringify({
            recommendation: {
              action: recommendation.action,
              confidence: recommendation.confidence,
              ...recommendation.data,
            },
          }),
          status: "open",
        },
      });

      await tx.escrowTransaction.update({
        where: { id },
        data: { status: "disputed" },
      });

      await tx.escrowAuditLog.create({
        data: {
          escrowId: id,
          action: "dispute_raised",
          actor: raisedBy === "buyer" ? escrow.buyerId : escrow.sellerId,
          details: `Dispute raised by ${raisedBy}. Reason: ${reason}. Rule-based recommendation: ${recommendation.action} (confidence: ${(recommendation.confidence * 100).toFixed(0)}%).`,
          metadata: JSON.stringify({
            disputeId: newDispute.id,
            raisedBy,
            reason,
            recommendationAction: recommendation.action,
            recommendationConfidence: recommendation.confidence,
          }),
        },
      });

      return newDispute;
    });

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'escrow.dispute', resource: 'escrow', resourceId: id, userId: user.id, tenantId: user.tenantId, details: { disputeId: dispute.id, raisedBy, reason, escrowStatus: 'disputed' } })
    } catch (e) { console.error('Audit log failed:', e) }

    return created(dispute);
  } catch (err: any) {
    console.error("Error creating dispute:", err);return error("Failed to create dispute");
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/escrow/transactions/[id]/disputes');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/escrow/transactions/[id]/disputes');
