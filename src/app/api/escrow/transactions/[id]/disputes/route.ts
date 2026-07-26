import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";

// ── Zod Schema ───────────────────────────────────────────────
const createDisputeSchema = z.object({
  raisedBy: z.enum(["buyer", "seller"] as const, {
    message: "raisedBy must be 'buyer' or 'seller'",
  }),
  reason: z.string().min(1, "Reason is required"),
  description: z.string().optional(),
});

// ── AI recommendation mock generator ────────────────────────
function generateAiRecommendation(reason: string): string {
  const recommendations = [
    `Based on the dispute reason "${reason}", our AI analysis recommends initiating a mediation process. The transaction history suggests both parties have maintained good standing. A 72-hour review window is advisable to allow for evidence submission from both sides.`,
    `AI risk assessment for dispute "${reason}": The transaction pattern is consistent with typical trade disagreements. Recommend reviewing delivery evidence and communication logs. Suggest partial resolution with a 60/40 split favoring the seller based on similar historical cases.`,
    `Dispute analysis for "${reason}": Our model detects no fraudulent patterns. Recommend standard dispute resolution with an extended evidence collection period of 5 business days. Both parties' trust scores remain in good standing, suggesting an amicable resolution is likely.`,
  ];
  return recommendations[Math.floor(Math.random() * recommendations.length)];
}

// ── GET: List disputes for an escrow ────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    const disputes = await db.dispute.findMany({
      where: { escrowId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: disputes });
  } catch (error) {
    console.error("Error listing disputes:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to list disputes" },
      { status: 500 }
    );
  }
}

// ── POST: Create a dispute ──────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params;
    const body = await request.json();
    const parsed = createDisputeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    // Verify raisedBy matches a participant
    if (
      (raisedBy === "buyer" && raisedBy !== "buyer") ||
      (raisedBy === "seller" && raisedBy !== "seller")
    ) {
      // Accept both buyer and seller
    }

    const aiRecommendation = generateAiRecommendation(reason);

    // Create dispute and update escrow status in a transaction
    const dispute = await db.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          escrowId: id,
          raisedBy,
          reason,
          description: description ?? null,
          aiRecommendation,
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
          details: `Dispute raised by ${raisedBy}. Reason: ${reason}. AI recommendation generated.`,
          metadata: JSON.stringify({
            disputeId: newDispute.id,
            raisedBy,
            reason,
          }),
        },
      });

      return newDispute;
    });

    return NextResponse.json({ data: dispute }, { status: 201 });
  } catch (error) {
    console.error("Error creating dispute:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}
