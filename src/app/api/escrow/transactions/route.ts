import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, requireAuth, AuthError } from "@/lib/auth/api-helpers";
import { eventBus } from "@/backend/services/event-bus";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { escrowListCache } from '@/backend/lib/response-cache';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
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

async function computeRiskScore(params: {
  buyerId: string;
  sellerId: string;
  amount: number;
}): Promise<{ score: number; level: string }> {
  let risk = 50;

  // Fetch buyer and seller trust scores and countries in parallel
  const [buyer, seller] = await Promise.all([
    db.business.findUnique({
      where: { id: params.buyerId },
      select: { country: true, trustScore: { select: { overallScore: true } } },
    }),
    db.business.findUnique({
      where: { id: params.sellerId },
      select: { country: true, trustScore: { select: { overallScore: true } } },
    }),
  ]);

  const buyerTrust = buyer?.trustScore?.overallScore ?? 50;
  const sellerTrust = seller?.trustScore?.overallScore ?? 50;

  // Buyer trust (lower trust = higher risk)
  if (buyerTrust > 80) risk -= 15;
  else if (buyerTrust > 60) risk -= 8;
  else risk += 5;

  // Seller trust (lower trust = higher risk)
  if (sellerTrust > 80) risk -= 15;
  else if (sellerTrust > 60) risk -= 8;
  else risk += 5;

  // Transaction amount (higher amount = higher risk)
  if (params.amount > 10000) risk += 10;
  else if (params.amount > 5000) risk += 5;
  else if (params.amount > 1000) risk += 2;

  // Previous transactions between the two parties (new relationship = higher risk)
  const prevTxCount = await db.escrowTransaction.count({
    where: {
      OR: [
        { buyerId: params.buyerId, sellerId: params.sellerId },
        { buyerId: params.sellerId, sellerId: params.buyerId },
      ],
    },
  });
  if (prevTxCount > 0) risk -= 10;
  else risk += 5;

  // Country risk (different countries = higher risk)
  if (buyer?.country && seller?.country && buyer.country !== seller.country) {
    risk += 5;
  }

  // Dispute history (past disputes for either party = higher risk)
  const disputeCount = await db.dispute.count({
    where: {
      OR: [
        { escrow: { buyerId: params.buyerId } },
        { escrow: { sellerId: params.buyerId } },
        { escrow: { buyerId: params.sellerId } },
        { escrow: { sellerId: params.sellerId } },
      ],
    },
  });
  if (disputeCount > 0) risk += 8;

  // Clamp to 0-100
  risk = Math.max(0, Math.min(100, risk));

  let level: string;
  if (risk < 30) level = "low";
  else if (risk < 70) level = "medium";
  else level = "high";

  return { score: risk, level };
}

// ── GET: List escrow transactions ────────────────────────────
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required')
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

    // Fast in-memory cache (3s TTL)
    const escrowKey = `escrow:${user.tenantId}:${page}:${limit}:${buyerId || ''}:${sellerId || ''}:${status || ''}:${currency || ''}`;
    const memCached = escrowListCache.get(escrowKey);
    if (memCached) {
      return ok({ transactions: memCached.data, pagination: memCached.pagination }, undefined, { noCache: true });
    }

    const [transactions, total] = await Promise.all([
      db.escrowTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          txRef: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          buyerId: true,
          sellerId: true,
          currentMilestone: true,
          totalMilestones: true,
          fundedAmount: true,
          releasedAmount: true,
          refundedAmount: true,
          feeAmount: true,
          feeCurrency: true,
          aiRiskScore: true,
          aiRiskLevel: true,
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          milestones: {
            select: { id: true, sequence: true, title: true, amount: true, status: true, releasedAt: true },
          },
          _count: { select: { disputes: true, disbursements: true } },
        },
      }),
      db.escrowTransaction.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    // Cache for 3s — avoids DB on rapid page flips
    escrowListCache.set(escrowKey, { data: transactions, pagination });

    return ok(transactions, pagination);
  } catch (err: any) {console.error("Error listing escrow transactions:", err);
    return error("Failed to list escrow transactions");
  }
}

// ── POST: Create escrow transaction ──────────────────────────
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = createEscrowSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Validation failed", parsed.error.issues);
    }

    const data = parsed.data;

    // Verify both buyer and seller belong to the current tenant
    const [buyerBiz, sellerBiz] = await Promise.all([
      db.business.findUnique({ where: { id: data.buyerId }, select: { id: true, tenantId: true } }),
      db.business.findUnique({ where: { id: data.sellerId }, select: { id: true, tenantId: true } }),
    ]);
    if (!buyerBiz || buyerBiz.tenantId !== user.tenantId) {
      return notFound('Buyer business not found');
    }
    if (!sellerBiz || sellerBiz.tenantId !== user.tenantId) {
      return notFound('Seller business not found');
    }

    const { score, level } = await computeRiskScore({
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      amount: data.amount,
    });
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
      return badRequest("Sum of milestone amounts must equal transaction amount");
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

    // ── Publish Kafka event ────────────────────────────────
    try {
      const { publishEvent } = await import('@/backend/lib/event-publisher')
      await publishEvent({
        topic: 'escrow.events.escrow_created',
        key: escrow.id,
        event: { eventType: 'escrow.created', escrowId: escrow.id, amount: escrow.amount, currency: escrow.currency, buyerId: escrow.buyerId, sellerId: escrow.sellerId, tenantId: user.tenantId, timestamp: new Date().toISOString() },
      })
    } catch (e) { console.error('Event publish failed:', e) }

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'escrow.create', resource: 'escrow', resourceId: escrow.id, userId: user.id, tenantId: user.tenantId, details: { amount: escrow.amount, currency: escrow.currency, txRef: escrow.txRef, buyerId: escrow.buyerId, sellerId: escrow.sellerId, riskScore: escrow.aiRiskScore, riskLevel: escrow.aiRiskLevel } })
    } catch (e) { console.error('Audit log failed:', e) }

    return created(escrow);
  } catch (err: any) {console.error("Error creating escrow transaction:", err);
    return error("Failed to create escrow transaction");
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/escrow/transactions');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/escrow/transactions');
