/**
 * Escrow AI Risk Scorer — multi-factor analysis.
 *
 * Returns a risk score 0-100 with a per-factor breakdown so callers
 * can explain *why* a transaction received its risk level.
 */

import { db } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────

export interface RiskFactor {
  name: string;
  impact: number;   // positive = more risk, negative = less risk
  value: string;    // human-readable description of the factor's value
}

export interface RiskScoreResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
}

export interface ComputeRiskScoreParams {
  buyerId: string;
  sellerId: string;
  amount: number;
  currency?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// ── Public API ───────────────────────────────────────────────

export async function computeRiskScore(
  params: ComputeRiskScoreParams,
): Promise<RiskScoreResult> {
  const factors: RiskFactor[] = [];
  let risk = 50; // baseline

  // Fetch buyer and seller profiles in parallel
  const [buyer, seller] = await Promise.all([
    db.business.findUnique({
      where: { id: params.buyerId },
      select: {
        country: true,
        createdAt: true,
        trustScore: { select: { overallScore: true } },
      },
    }),
    db.business.findUnique({
      where: { id: params.sellerId },
      select: {
        country: true,
        createdAt: true,
        trustScore: { select: { overallScore: true } },
      },
    }),
  ]);

  const buyerTrust = buyer?.trustScore?.overallScore ?? 50;
  const sellerTrust = seller?.trustScore?.overallScore ?? 50;

  // ── 1. Buyer trust score ─────────────────────────────────
  if (buyerTrust > 80) {
    risk -= 15;
    factors.push({ name: 'Buyer trust', impact: -15, value: `High (${buyerTrust})` });
  } else if (buyerTrust > 60) {
    risk -= 8;
    factors.push({ name: 'Buyer trust', impact: -8, value: `Moderate (${buyerTrust})` });
  } else {
    risk += 5;
    factors.push({ name: 'Buyer trust', impact: 5, value: `Low (${buyerTrust})` });
  }

  // ── 2. Seller trust score ────────────────────────────────
  if (sellerTrust > 80) {
    risk -= 15;
    factors.push({ name: 'Seller trust', impact: -15, value: `High (${sellerTrust})` });
  } else if (sellerTrust > 60) {
    risk -= 8;
    factors.push({ name: 'Seller trust', impact: -8, value: `Moderate (${sellerTrust})` });
  } else {
    risk += 5;
    factors.push({ name: 'Seller trust', impact: 5, value: `Low (${sellerTrust})` });
  }

  // ── 3. Transaction amount ────────────────────────────────
  if (params.amount > 10000) {
    risk += 10;
    factors.push({ name: 'Transaction amount', impact: 10, value: `$${params.amount} (> $10,000)` });
  } else if (params.amount > 5000) {
    risk += 5;
    factors.push({ name: 'Transaction amount', impact: 5, value: `$${params.amount} (> $5,000)` });
  } else if (params.amount > 1000) {
    risk += 2;
    factors.push({ name: 'Transaction amount', impact: 2, value: `$${params.amount} (> $1,000)` });
  } else {
    factors.push({ name: 'Transaction amount', impact: 0, value: `$${params.amount} (≤ $1,000)` });
  }

  // ── 4. Relationship history (previous transactions) ──────
  const prevTxCount = await db.escrowTransaction.count({
    where: {
      OR: [
        { buyerId: params.buyerId, sellerId: params.sellerId },
        { buyerId: params.sellerId, sellerId: params.buyerId },
      ],
    },
  });
  if (prevTxCount > 0) {
    risk -= 10;
    factors.push({ name: 'Relationship history', impact: -10, value: `${prevTxCount} prior transaction(s)` });
  } else {
    risk += 5;
    factors.push({ name: 'Relationship history', impact: 5, value: 'No prior transactions' });
  }

  // ── 5. Cross-border factor (country mismatch) ───────────
  if (buyer?.country && seller?.country && buyer.country !== seller.country) {
    risk += 5;
    factors.push({
      name: 'Cross-border',
      impact: 5,
      value: `${buyer.country} → ${seller.country}`,
    });
  } else {
    factors.push({ name: 'Cross-border', impact: 0, value: 'Same country' });
  }

  // ── 6. Dispute history (any past disputes) ──────────────
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
  if (disputeCount > 0) {
    risk += 8;
    factors.push({ name: 'Dispute history', impact: 8, value: `${disputeCount} dispute(s)` });
  } else {
    factors.push({ name: 'Dispute history', impact: 0, value: 'No disputes' });
  }

  // ── 7. Payment history factor (90-day completed txns) ───
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [buyerCompletedCount, sellerCompletedCount] = await Promise.all([
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: params.buyerId }, { sellerId: params.buyerId }],
        status: 'completed',
        createdAt: { gte: ninetyDaysAgo },
      },
    }),
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: params.sellerId }, { sellerId: params.sellerId }],
        status: 'completed',
        createdAt: { gte: ninetyDaysAgo },
      },
    }),
  ]);

  if (buyerCompletedCount > 5 && sellerCompletedCount > 5) {
    risk -= 10;
    factors.push({
      name: 'Payment history',
      impact: -10,
      value: `Buyer: ${buyerCompletedCount}, Seller: ${sellerCompletedCount} completed (90d)`,
    });
  } else {
    factors.push({
      name: 'Payment history',
      impact: 0,
      value: `Buyer: ${buyerCompletedCount}, Seller: ${sellerCompletedCount} completed (90d)`,
    });
  }

  // ── 8. Dispute rate factor ───────────────────────────────
  const [buyerTotalTx, sellerTotalTx] = await Promise.all([
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: params.buyerId }, { sellerId: params.buyerId }],
      },
    }),
    db.escrowTransaction.count({
      where: {
        OR: [{ buyerId: params.sellerId }, { sellerId: params.sellerId }],
      },
    }),
  ]);

  const [buyerDisputeCount, sellerDisputeCount] = await Promise.all([
    db.dispute.count({
      where: {
        OR: [
          { escrow: { buyerId: params.buyerId } },
          { escrow: { sellerId: params.buyerId } },
        ],
      },
    }),
    db.dispute.count({
      where: {
        OR: [
          { escrow: { buyerId: params.sellerId } },
          { escrow: { sellerId: params.sellerId } },
        ],
      },
    }),
  ]);

  const buyerDisputeRate = buyerTotalTx > 0 ? buyerDisputeCount / buyerTotalTx : 0;
  const sellerDisputeRate = sellerTotalTx > 0 ? sellerDisputeCount / sellerTotalTx : 0;

  if (buyerDisputeRate > 0.2 || sellerDisputeRate > 0.2) {
    risk += 15;
    factors.push({
      name: 'Dispute rate',
      impact: 15,
      value: `Buyer: ${(buyerDisputeRate * 100).toFixed(1)}%, Seller: ${(sellerDisputeRate * 100).toFixed(1)}%`,
    });
  } else {
    factors.push({
      name: 'Dispute rate',
      impact: 0,
      value: `Buyer: ${(buyerDisputeRate * 100).toFixed(1)}%, Seller: ${(sellerDisputeRate * 100).toFixed(1)}%`,
    });
  }

  // ── 9. Account age factor ────────────────────────────────
  const now = new Date();
  const buyerAgeDays = buyer?.createdAt ? daysBetween(now, buyer.createdAt) : 0;
  const sellerAgeDays = seller?.createdAt ? daysBetween(now, seller.createdAt) : 0;

  if (buyerAgeDays < 30 || sellerAgeDays < 30) {
    risk += 8;
    factors.push({
      name: 'Account age',
      impact: 8,
      value: `Buyer: ${Math.round(buyerAgeDays)}d, Seller: ${Math.round(sellerAgeDays)}d`,
    });
  } else {
    factors.push({
      name: 'Account age',
      impact: 0,
      value: `Buyer: ${Math.round(buyerAgeDays)}d, Seller: ${Math.round(sellerAgeDays)}d`,
    });
  }

  // ── 10. Currency mismatch (cross-border enhancement) ─────
  // Check if buyer's and seller's most-used currencies differ
  const [buyerCurrencies, sellerCurrencies] = await Promise.all([
    db.escrowTransaction.groupBy({
      by: ['currency'],
      where: {
        OR: [{ buyerId: params.buyerId }, { sellerId: params.buyerId }],
      },
      _count: { currency: true },
      orderBy: { _count: { currency: 'desc' } },
      take: 1,
    }),
    db.escrowTransaction.groupBy({
      by: ['currency'],
      where: {
        OR: [{ buyerId: params.sellerId }, { sellerId: params.sellerId }],
      },
      _count: { currency: true },
      orderBy: { _count: { currency: 'desc' } },
      take: 1,
    }),
  ]);

  const buyerPrimaryCurrency = buyerCurrencies[0]?.currency;
  const sellerPrimaryCurrency = sellerCurrencies[0]?.currency;

  if (
    buyerPrimaryCurrency &&
    sellerPrimaryCurrency &&
    buyerPrimaryCurrency !== sellerPrimaryCurrency
  ) {
    risk += 5;
    factors.push({
      name: 'Currency mismatch',
      impact: 5,
      value: `Buyer: ${buyerPrimaryCurrency}, Seller: ${sellerPrimaryCurrency}`,
    });
  } else {
    factors.push({
      name: 'Currency mismatch',
      impact: 0,
      value: buyerPrimaryCurrency
        ? `Both use ${buyerPrimaryCurrency}`
        : 'Insufficient data',
    });
  }

  // ── 11. Amount concentration ─────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const buyerVolumeRows = await db.escrowTransaction.aggregate({
    where: {
      OR: [{ buyerId: params.buyerId }, { sellerId: params.buyerId }],
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });

  const buyerTotalVolume = buyerVolumeRows._sum.amount ?? 0;
  if (buyerTotalVolume > 0 && params.amount / buyerTotalVolume > 0.5) {
    risk += 10;
    factors.push({
      name: 'Amount concentration',
      impact: 10,
      value: `${((params.amount / buyerTotalVolume) * 100).toFixed(1)}% of buyer 30d volume ($${buyerTotalVolume})`,
    });
  } else {
    factors.push({
      name: 'Amount concentration',
      impact: 0,
      value: buyerTotalVolume > 0
        ? `${((params.amount / buyerTotalVolume) * 100).toFixed(1)}% of buyer 30d volume`
        : 'No prior volume',
    });
  }

  // ── Clamp and determine level ─────────────────────────────
  risk = Math.max(0, Math.min(100, risk));

  let level: 'low' | 'medium' | 'high';
  if (risk < 30) level = 'low';
  else if (risk < 70) level = 'medium';
  else level = 'high';

  return { score: risk, level, factors };
}
