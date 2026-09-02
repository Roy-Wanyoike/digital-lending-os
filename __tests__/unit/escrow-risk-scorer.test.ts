/**
 * Unit tests for the escrow AI risk scorer.
 * Tests multi-factor risk scoring with mocked DB queries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────
const mockFindUnique = vi.fn();
const mockCount = vi.fn();
const mockGroupBy = vi.fn();
const mockAggregate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    business: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    escrowTransaction: {
      count: (...args: any[]) => mockCount(...args),
      groupBy: (...args: any[]) => mockGroupBy(...args),
      aggregate: (...args: any[]) => mockAggregate(...args),
    },
    dispute: {
      count: (...args: any[]) => mockCount(...args),
    },
  },
}));

import { computeRiskScore } from '@/backend/lib/escrow/risk-scorer';
import type { RiskScoreResult, RiskFactor } from '@/backend/lib/escrow/risk-scorer';

// ── Helpers ───────────────────────────────────────────────────

const BUYER_ID = 'buyer-1';
const SELLER_ID = 'seller-1';

/**
 * Build a mock setup helper that sets all db mocks to return safe defaults,
 * then allows selective overrides.
 */
function setupDefaults(overrides: {
  buyer?: any;
  seller?: any;
  prevTxCount?: number;
  disputeCount?: number;
  buyerCompletedCount?: number;
  sellerCompletedCount?: number;
  buyerTotalTx?: number;
  sellerTotalTx?: number;
  buyerDisputeCount?: number;
  sellerDisputeCount?: number;
  buyerCurrencies?: any[];
  sellerCurrencies?: any[];
  buyerVolume?: number;
} = {}) {
  const buyer = overrides.buyer ?? {
    country: 'US',
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
    trustScore: { overallScore: 70 },
  };
  const seller = overrides.seller ?? {
    country: 'US',
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    trustScore: { overallScore: 70 },
  };

  mockFindUnique.mockImplementation((args: any) => {
    if (args.where.id === BUYER_ID) return buyer;
    if (args.where.id === SELLER_ID) return seller;
    return null;
  });

  // Default: no previous transactions between parties
  mockCount.mockImplementation((args: any) => {
    const orEntries = args?.where?.OR ?? [];

    // Helper: check if OR entries reference escrow relations (dispute model queries)
    const hasEscrowRelation = orEntries.some((o: any) => o.escrow != null);

    // Helper: extract business IDs referenced via escrow relation in OR entries
    const escrowIds = orEntries
      .filter((o: any) => o.escrow != null)
      .flatMap((o: any) => [o.escrow?.buyerId, o.escrow?.sellerId])
      .filter(Boolean);

    // Previous transactions between parties (escrowTransaction.count, flat OR)
    if (!hasEscrowRelation && orEntries.some(
      (o: any) =>
        (o.buyerId === BUYER_ID && o.sellerId === SELLER_ID) ||
        (o.buyerId === SELLER_ID && o.sellerId === BUYER_ID)
    ) && !args.where.status) {
      return Promise.resolve(overrides.prevTxCount ?? 0);
    }

    // Dispute queries (dispute.count with escrow relation)
    if (hasEscrowRelation) {
      const hasBuyer = escrowIds.includes(BUYER_ID);
      const hasSeller = escrowIds.includes(SELLER_ID);

      // Dispute history query: 4 entries referencing both parties
      if (hasBuyer && hasSeller && escrowIds.length >= 4) {
        return Promise.resolve(overrides.disputeCount ?? 0);
      }
      // Per-party dispute count (2 entries each)
      if (hasBuyer && !hasSeller) {
        return Promise.resolve(overrides.buyerDisputeCount ?? 0);
      }
      if (hasSeller && !hasBuyer) {
        return Promise.resolve(overrides.sellerDisputeCount ?? 0);
      }
      // Fallback: treat as general dispute
      return Promise.resolve(overrides.disputeCount ?? 0);
    }

    // 90-day completed count (escrowTransaction.count with status='completed')
    if (args?.where?.status === 'completed') {
      const isBuyer = orEntries.some(
        (o: any) => o.buyerId === BUYER_ID || o.sellerId === BUYER_ID
      );
      if (isBuyer) return Promise.resolve(overrides.buyerCompletedCount ?? 0);
      return Promise.resolve(overrides.sellerCompletedCount ?? 0);
    }

    // Total tx count (escrowTransaction.count, flat OR, no status)
    const isBuyer = orEntries.some(
      (o: any) => o.buyerId === BUYER_ID || o.sellerId === BUYER_ID
    );
    if (isBuyer) return Promise.resolve(overrides.buyerTotalTx ?? 0);
    return Promise.resolve(overrides.sellerTotalTx ?? 0);
  });

  mockGroupBy.mockImplementation((args: any) => {
    const isBuyer = args.where.OR?.some(
      (o: any) => o.buyerId === BUYER_ID || o.sellerId === BUYER_ID
    );
    if (isBuyer) return Promise.resolve(overrides.buyerCurrencies ?? []);
    return Promise.resolve(overrides.sellerCurrencies ?? []);
  });

  mockAggregate.mockResolvedValue({
    _sum: { amount: overrides.buyerVolume ?? 0 },
  });
}

// ════════════════════════════════════════════════════════════════════════
// Basic structure tests
// ════════════════════════════════════════════════════════════════════════

describe('computeRiskScore — structure', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaults(); });

  it('returns score, level, and factors array', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('factors');
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it('score is clamped between 0 and 100', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('level is one of low, medium, high', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(['low', 'medium', 'high']).toContain(result.level);
  });

  it('low level when score < 30', async () => {
    // Both high trust, prior relationship, no disputes → should be low
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 90 } },
      seller: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 90 } },
      prevTxCount: 3,
      disputeCount: 0,
      buyerCompletedCount: 10,
      sellerCompletedCount: 10,
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result.level).toBe('low');
  });

  it('high level when score >= 70', async () => {
    // Low trust, no relationship, new accounts, disputes, high amount
    setupDefaults({
      buyer: { country: 'NG', createdAt: new Date(), trustScore: { overallScore: 20 } },
      seller: { country: 'KE', createdAt: new Date(), trustScore: { overallScore: 20 } },
      prevTxCount: 0,
      disputeCount: 3,
      buyerCompletedCount: 0,
      sellerCompletedCount: 0,
      buyerTotalTx: 10,
      sellerTotalTx: 10,
      buyerDisputeCount: 3,
      sellerDisputeCount: 3,
      buyerCurrencies: [{ currency: 'USD', _count: { currency: 5 } }],
      sellerCurrencies: [{ currency: 'KES', _count: { currency: 5 } }],
      buyerVolume: 100,
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 15000 });
    expect(result.level).toBe('high');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Factor-level tests
// ════════════════════════════════════════════════════════════════════════

describe('computeRiskScore — factor breakdown', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaults(); });

  it('includes all 11 factors in the breakdown', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const names = result.factors.map((f: RiskFactor) => f.name);
    expect(names).toContain('Buyer trust');
    expect(names).toContain('Seller trust');
    expect(names).toContain('Transaction amount');
    expect(names).toContain('Relationship history');
    expect(names).toContain('Cross-border');
    expect(names).toContain('Dispute history');
    expect(names).toContain('Payment history');
    expect(names).toContain('Dispute rate');
    expect(names).toContain('Account age');
    expect(names).toContain('Currency mismatch');
    expect(names).toContain('Amount concentration');
  });

  it('each factor has name, impact (number), and value (string)', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    for (const factor of result.factors) {
      expect(typeof factor.name).toBe('string');
      expect(typeof factor.impact).toBe('number');
      expect(typeof factor.value).toBe('string');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Individual factor tests
// ════════════════════════════════════════════════════════════════════════

describe('computeRiskScore — trust score factors', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('high buyer trust (>80) reduces risk by 15', async () => {
    setupDefaults({ buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 85 } } });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Buyer trust');
    expect(f?.impact).toBe(-15);
    expect(f?.value).toContain('85');
  });

  it('moderate buyer trust (60-80) reduces risk by 8', async () => {
    setupDefaults({ buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 65 } } });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Buyer trust');
    expect(f?.impact).toBe(-8);
  });

  it('low buyer trust (<=60) increases risk by 5', async () => {
    setupDefaults({ buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 40 } } });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Buyer trust');
    expect(f?.impact).toBe(5);
  });

  it('missing buyer trust defaults to 50 (low tier)', async () => {
    setupDefaults({ buyer: { country: 'US', createdAt: new Date('2024-01-01') } });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Buyer trust');
    expect(f?.impact).toBe(5);
  });
});

describe('computeRiskScore — transaction amount factor', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaults(); });

  it('amount > 10000 adds +10 risk', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 15000 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Transaction amount');
    expect(f?.impact).toBe(10);
  });

  it('amount > 5000 adds +5 risk', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 7000 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Transaction amount');
    expect(f?.impact).toBe(5);
  });

  it('amount > 1000 adds +2 risk', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 2000 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Transaction amount');
    expect(f?.impact).toBe(2);
  });

  it('amount <= 1000 adds 0 risk', async () => {
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Transaction amount');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — relationship history factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('prior transactions reduces risk by 10', async () => {
    setupDefaults({ prevTxCount: 3 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Relationship history');
    expect(f?.impact).toBe(-10);
  });

  it('no prior transactions increases risk by 5', async () => {
    setupDefaults({ prevTxCount: 0 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Relationship history');
    expect(f?.impact).toBe(5);
  });
});

describe('computeRiskScore — cross-border factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('different countries adds +5 risk', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
      seller: { country: 'GB', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Cross-border');
    expect(f?.impact).toBe(5);
  });

  it('same country adds 0 risk', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
      seller: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Cross-border');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — dispute history factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('past disputes adds +8 risk', async () => {
    setupDefaults({ disputeCount: 2 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute history');
    expect(f?.impact).toBe(8);
  });

  it('no disputes adds 0 risk', async () => {
    setupDefaults({ disputeCount: 0 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute history');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — payment history factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('both parties >5 completed in 90 days reduces risk by 10', async () => {
    setupDefaults({ buyerCompletedCount: 8, sellerCompletedCount: 12 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Payment history');
    expect(f?.impact).toBe(-10);
  });

  it('only one party >5 completed adds 0 impact', async () => {
    setupDefaults({ buyerCompletedCount: 8, sellerCompletedCount: 2 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Payment history');
    expect(f?.impact).toBe(0);
  });

  it('neither party >5 completed adds 0 impact', async () => {
    setupDefaults({ buyerCompletedCount: 3, sellerCompletedCount: 1 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Payment history');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — dispute rate factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('buyer dispute rate > 20% adds +15 risk', async () => {
    setupDefaults({
      buyerTotalTx: 10,
      sellerTotalTx: 10,
      buyerDisputeCount: 3,  // 30%
      sellerDisputeCount: 0, // 0%
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute rate');
    expect(f?.impact).toBe(15);
  });

  it('seller dispute rate > 20% adds +15 risk', async () => {
    setupDefaults({
      buyerTotalTx: 10,
      sellerTotalTx: 10,
      buyerDisputeCount: 0,
      sellerDisputeCount: 3,  // 30%
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute rate');
    expect(f?.impact).toBe(15);
  });

  it('both parties under 20% dispute rate adds 0 risk', async () => {
    setupDefaults({
      buyerTotalTx: 10,
      sellerTotalTx: 10,
      buyerDisputeCount: 1,  // 10%
      sellerDisputeCount: 1, // 10%
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute rate');
    expect(f?.impact).toBe(0);
  });

  it('zero total transactions means 0% dispute rate', async () => {
    setupDefaults({
      buyerTotalTx: 0,
      sellerTotalTx: 0,
      buyerDisputeCount: 0,
      sellerDisputeCount: 0,
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Dispute rate');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — account age factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('buyer < 30 days old adds +8 risk', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), trustScore: { overallScore: 70 } },
      seller: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Account age');
    expect(f?.impact).toBe(8);
  });

  it('seller < 30 days old adds +8 risk', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
      seller: { country: 'US', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), trustScore: { overallScore: 70 } },
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Account age');
    expect(f?.impact).toBe(8);
  });

  it('both >= 30 days old adds 0 risk', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 70 } },
      seller: { country: 'US', createdAt: new Date('2024-02-01'), trustScore: { overallScore: 70 } },
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Account age');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — currency mismatch factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('different primary currencies adds +5 risk', async () => {
    setupDefaults({
      buyerCurrencies: [{ currency: 'USD', _count: { currency: 10 } }],
      sellerCurrencies: [{ currency: 'EUR', _count: { currency: 8 } }],
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Currency mismatch');
    expect(f?.impact).toBe(5);
  });

  it('same primary currencies adds 0 risk', async () => {
    setupDefaults({
      buyerCurrencies: [{ currency: 'USD', _count: { currency: 10 } }],
      sellerCurrencies: [{ currency: 'USD', _count: { currency: 8 } }],
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Currency mismatch');
    expect(f?.impact).toBe(0);
  });

  it('no currency history for either adds 0 risk', async () => {
    setupDefaults({
      buyerCurrencies: [],
      sellerCurrencies: [],
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Currency mismatch');
    expect(f?.impact).toBe(0);
  });
});

describe('computeRiskScore — amount concentration factor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('transaction >50% of buyer 30d volume adds +10 risk', async () => {
    setupDefaults({ buyerVolume: 100 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 600 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Amount concentration');
    expect(f?.impact).toBe(10);
  });

  it('transaction <=50% of buyer 30d volume adds 0 risk', async () => {
    setupDefaults({ buyerVolume: 5000 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 1000 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Amount concentration');
    expect(f?.impact).toBe(0);
  });

  it('zero buyer volume adds 0 risk (insufficient data)', async () => {
    setupDefaults({ buyerVolume: 0 });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    const f = result.factors.find((f: RiskFactor) => f.name === 'Amount concentration');
    expect(f?.impact).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Edge cases
// ════════════════════════════════════════════════════════════════════════

describe('computeRiskScore — edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('handles missing buyer (null) gracefully', async () => {
    setupDefaults({ buyer: null });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBeDefined();
  });

  it('handles missing seller (null) gracefully', async () => {
    setupDefaults({ seller: null });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('score cannot go below 0 (extreme negative factors)', async () => {
    setupDefaults({
      buyer: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 95 } },
      seller: { country: 'US', createdAt: new Date('2024-01-01'), trustScore: { overallScore: 95 } },
      prevTxCount: 5,
      disputeCount: 0,
      buyerCompletedCount: 10,
      sellerCompletedCount: 10,
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 500 });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('score cannot go above 100 (extreme positive factors)', async () => {
    setupDefaults({
      buyer: { country: 'NG', createdAt: new Date(), trustScore: { overallScore: 10 } },
      seller: { country: 'KE', createdAt: new Date(), trustScore: { overallScore: 10 } },
      prevTxCount: 0,
      disputeCount: 10,
      buyerTotalTx: 10,
      sellerTotalTx: 10,
      buyerDisputeCount: 5,
      sellerDisputeCount: 5,
      buyerCurrencies: [{ currency: 'NGN', _count: { currency: 10 } }],
      sellerCurrencies: [{ currency: 'KES', _count: { currency: 10 } }],
      buyerVolume: 100,
    });
    const result = await computeRiskScore({ buyerId: BUYER_ID, sellerId: SELLER_ID, amount: 50000 });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
