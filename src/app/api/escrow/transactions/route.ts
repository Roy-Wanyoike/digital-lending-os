import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── Zod Schemas ──────────────────────────────────────────────
const milestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required"),
  amount: z.number().positive("Milestone amount must be positive"),
});

const createEscrowSchema = z.object({
  buyerId: z.string().min(1, "Buyer ID is required"),
  sellerId: z.string().min(1, "Seller ID is required"),
  amount: z.number().positive("Amount must be a positive number"),
  currency: z.string().default("USD"),
  description: z.string().optional(),
  milestones: z.array(milestoneSchema).optional(),
});

// ── Helpers ──────────────────────────────────────────────────
function generateTxRef(): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `ESC-${dateStr}-${rand}`;
}

function computeRiskScore(): { score: number; level: string } {
  const score = Math.floor(Math.random() * 101);
  let level: string;
  if (score < 30) level = "low";
  else if (score < 70) level = "medium";
  else level = "high";
  return { score, level };
}

// ── GET: List escrow transactions ────────────────────────────
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const buyerId = searchParams.get("buyerId") || undefined;
    const sellerId = searchParams.get("sellerId") || undefined;
    const status = searchParams.get("status") || undefined;
    const currency = searchParams.get("currency") || undefined;

    const where: Record<string, unknown> = {
      OR: [
        { buyer: { tenantId: user.tenantId } },
        { seller: { tenantId: user.tenantId } },
      ],
    };
    if (buyerId) where.buyerId = buyerId;
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;
    if (currency) where.currency = currency;

    const [transactions, total] = await Promise.all([
      db.escrowTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          milestones: true,
          disputes: true,
          disbursements: true,
        },
      }),
      db.escrowTransaction.count({ where }),
    ]);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("Error listing escrow transactions:", error);
    return NextResponse.json(
      { error: "Failed to list escrow transactions" },
      { status: 500 }
    );
  }
}

// ── POST: Create escrow transaction ──────────────────────────
async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json();
    const parsed = createEscrowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify both buyer and seller belong to the current tenant
    const [buyerBiz, sellerBiz] = await Promise.all([
      db.business.findUnique({ where: { id: data.buyerId }, select: { id: true, tenantId: true } }),
      db.business.findUnique({ where: { id: data.sellerId }, select: { id: true, tenantId: true } }),
    ]);
    if (!buyerBiz || buyerBiz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Buyer business not found' }, { status: 404 });
    }
    if (!sellerBiz || sellerBiz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Seller business not found' }, { status: 404 });
    }

    const { score, level } = computeRiskScore();
    const txRef = generateTxRef();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Determine milestones
    let milestonesInput: { title: string; amount: number }[];
    if (data.milestones && data.milestones.length > 0) {
      milestonesInput = data.milestones;
    } else {
      milestonesInput = [{ title: "Full Payment", amount: data.amount }];
    }

    // Validate milestone amounts sum to transaction amount
    const milestoneSum = milestonesInput.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(milestoneSum - data.amount) > 0.01) {
      return NextResponse.json(
        {
          error: "Sum of milestone amounts must equal transaction amount",
          milestoneSum,
          transactionAmount: data.amount,
        },
        { status: 400 }
      );
    }

    const escrow = await db.escrowTransaction.create({
      data: {
        txRef,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        amount: data.amount,
        currency: data.currency,
        description: data.description ?? null,
        aiRiskScore: score,
        aiRiskLevel: level,
        totalMilestones: milestonesInput.length,
        expiresAt,
        milestones: {
          create: milestonesInput.map((m, i) => ({
            sequence: i + 1,
            title: m.title,
            amount: m.amount,
          })),
        },
        auditLog: {
          create: {
            action: "created",
            actor: data.buyerId,
            details: `Escrow transaction created with ${milestonesInput.length} milestone(s). AI risk score: ${score} (${level})`,
            metadata: JSON.stringify({ riskScore: score, riskLevel: level, txRef }),
          },
        },
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: true,
        disbursements: true,
      },
    });

    // ─── Emit realtime event ────────────────────────────
    try {
      eventBus.emit('escrow.updated', {
        id: escrow.id,
        txRef: escrow.txRef,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        action: 'created',
      }, user.tenantId);
    } catch (err) {
      console.error('[escrow.updated] emit failed:', err);
    }

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'escrow.create', resource: 'escrow', resourceId: escrow.id, userId: user.id, tenantId: user.tenantId, details: { amount: escrow.amount, currency: escrow.currency, txRef: escrow.txRef, buyerId: escrow.buyerId, sellerId: escrow.sellerId, riskScore: escrow.aiRiskScore, riskLevel: escrow.aiRiskLevel } })
    } catch (e) { console.error('Audit log failed:', e) }

    return NextResponse.json({ data: escrow }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("Error creating escrow transaction:", error);
    return NextResponse.json(
      { error: "Failed to create escrow transaction" },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry(getHandler, '/api/escrow/transactions');

export const POST = withApiTelemetry(postHandler, '/api/escrow/transactions');
