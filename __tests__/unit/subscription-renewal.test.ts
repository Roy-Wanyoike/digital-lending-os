/**
 * Unit tests for subscription renewal billing.
 * Tests the computePeriodEnd helper, isAutoRenew helper, and processRenewals function.
 * Mocks @/lib/db (Prisma) to test in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma DB ──────────────────────────────────────────────

const mockSubscriptionFindMany = vi.fn();
const mockSubscriptionUpdate = vi.fn();
const mockInvoiceCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    subscription: {
      findMany: (...args: unknown[]) => mockSubscriptionFindMany(...args),
      update: (...args: unknown[]) => mockSubscriptionUpdate(...args),
    },
    invoice: {
      create: (...args: unknown[]) => mockInvoiceCreate(...args),
    },
  },
}));

// ── Mock Logger ─────────────────────────────────────────────────

vi.mock('@/backend/lib/telemetry/logger', () => ({
  getLogger: () => ({
    withContext: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));

// ── Test Fixtures ────────────────────────────────────────────────

function makeSubscription(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const pastEnd = new Date(now.getTime() - 86_400_000); // 1 day ago
  return {
    id: 'sub_abc12345',
    businessId: 'biz_xyz98765',
    planName: 'starter',
    amount: 29.99,
    currency: 'USD',
    interval: 'monthly',
    status: 'active',
    currentPeriodStart: new Date(pastEnd.getTime() - 30 * 86_400_000),
    currentPeriodEnd: pastEnd,
    metadata: JSON.stringify({ autoRenew: true }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('billing helpers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('computePeriodEnd', () => {
    it('computes monthly period end', async () => {
      const { computePeriodEnd } = await import('@/backend/lib/billing/helpers');
      const start = new Date('2024-01-15T10:00:00Z');
      const end = computePeriodEnd('monthly', start);
      expect(end.getMonth()).toBe(1); // February
      expect(end.getFullYear()).toBe(2024);
      // Original should not be mutated
      expect(start.getMonth()).toBe(0);
    });

    it('computes quarterly period end', async () => {
      const { computePeriodEnd } = await import('@/backend/lib/billing/helpers');
      const start = new Date('2024-01-15T10:00:00Z');
      const end = computePeriodEnd('quarterly', start);
      expect(end.getMonth()).toBe(3); // April
      expect(end.getFullYear()).toBe(2024);
    });

    it('computes yearly period end', async () => {
      const { computePeriodEnd } = await import('@/backend/lib/billing/helpers');
      const start = new Date('2024-06-01T00:00:00Z');
      const end = computePeriodEnd('yearly', start);
      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(5); // June
    });

    it('does not mutate the input date', async () => {
      const { computePeriodEnd } = await import('@/backend/lib/billing/helpers');
      const original = new Date('2024-03-15T12:00:00Z');
      const originalTime = original.getTime();
      computePeriodEnd('monthly', original);
      expect(original.getTime()).toBe(originalTime);
    });

    it('handles year boundary for monthly', async () => {
      const { computePeriodEnd } = await import('@/backend/lib/billing/helpers');
      const start = new Date('2024-12-15T00:00:00Z');
      const end = computePeriodEnd('monthly', start);
      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(0); // January
    });
  });

  describe('isAutoRenew', () => {
    it('returns true when autoRenew is true', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew(JSON.stringify({ autoRenew: true }))).toBe(true);
    });

    it('returns false when autoRenew is false', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew(JSON.stringify({ autoRenew: false }))).toBe(false);
    });

    it('returns false for null metadata', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew(null)).toBe(false);
    });

    it('returns false for undefined metadata', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew(undefined)).toBe(false);
    });

    it('returns false for empty string', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew('')).toBe(false);
    });

    it('returns false for invalid JSON', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew('not-json')).toBe(false);
    });

    it('returns false when autoRenew key is missing', async () => {
      const { isAutoRenew } = await import('@/backend/lib/billing/helpers');
      expect(isAutoRenew(JSON.stringify({ other: true }))).toBe(false);
    });
  });
});

describe('processRenewals', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSubscriptionFindMany.mockReset();
    mockSubscriptionUpdate.mockReset();
    mockInvoiceCreate.mockReset();
  });

  it('returns zero result when no subscriptions are due', async () => {
    mockSubscriptionFindMany.mockResolvedValue([]);

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it('skips subscriptions without autoRenew in metadata', async () => {
    const sub = makeSubscription({ metadata: JSON.stringify({ autoRenew: false }) });
    mockSubscriptionFindMany.mockResolvedValue([sub]);

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
  });

  it('processes a single auto-renewing subscription', async () => {
    const sub = makeSubscription();
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_new1' });
    mockSubscriptionUpdate.mockResolvedValue({ ...sub, currentPeriodStart: sub.currentPeriodEnd });

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockInvoiceCreate).toHaveBeenCalledTimes(1);

    // Verify invoice was created with correct data
    const invoiceCall = mockInvoiceCreate.mock.calls[0][0];
    expect(invoiceCall.data.amount).toBe(29.99);
    expect(invoiceCall.data.currency).toBe('USD');
    expect(invoiceCall.data.subscriptionId).toBe('sub_abc12345');
    expect(invoiceCall.data.status).toBe('draft');

    // Verify subscription was updated with new period
    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    expect(updateCall.where.id).toBe('sub_abc12345');
    expect(updateCall.data.currentPeriodStart.getTime()).toBe(sub.currentPeriodEnd.getTime());
  });

  it('processes multiple subscriptions and handles partial failure', async () => {
    const sub1 = makeSubscription({ id: 'sub_1', businessId: 'biz_1' });
    const sub2 = makeSubscription({ id: 'sub_2', businessId: 'biz_2' });
    const sub3 = makeSubscription({ id: 'sub_3', businessId: 'biz_3' });

    mockSubscriptionFindMany.mockResolvedValue([sub1, sub2, sub3]);
    mockInvoiceCreate
      .mockResolvedValueOnce({ id: 'inv_1' })
      .mockRejectedValueOnce(new Error('DB connection lost'))
      .mockResolvedValueOnce({ id: 'inv_3' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].subscriptionId).toBe('sub_2');
    expect(result.errors[0].reason).toBe('DB connection lost');
  });

  it('computes correct new period for monthly subscription', async () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-02-01T00:00:00Z');
    const sub = makeSubscription({
      currentPeriodEnd: end,
      interval: 'monthly',
    });
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_m' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    await processRenewals();

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    // New period starts at old end, new end should be March 1
    expect(updateCall.data.currentPeriodStart.getTime()).toBe(end.getTime());
    const newEnd = updateCall.data.currentPeriodEnd;
    expect(newEnd.getMonth()).toBe(2); // March
    expect(newEnd.getFullYear()).toBe(2024);
  });

  it('computes correct new period for quarterly subscription', async () => {
    const end = new Date('2024-04-01T00:00:00Z');
    const sub = makeSubscription({
      currentPeriodEnd: end,
      interval: 'quarterly',
    });
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_q' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    await processRenewals();

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    const newEnd = updateCall.data.currentPeriodEnd;
    expect(newEnd.getMonth()).toBe(6); // July
    expect(newEnd.getFullYear()).toBe(2024);
  });

  it('computes correct new period for yearly subscription', async () => {
    const end = new Date('2024-06-15T00:00:00Z');
    const sub = makeSubscription({
      currentPeriodEnd: end,
      interval: 'yearly',
    });
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_y' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    await processRenewals();

    const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
    const newEnd = updateCall.data.currentPeriodEnd;
    expect(newEnd.getFullYear()).toBe(2025);
    expect(newEnd.getMonth()).toBe(5); // June
  });

  it('creates invoice with subscription line items', async () => {
    const sub = makeSubscription({ planName: 'enterprise', interval: 'yearly' });
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_li' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    await processRenewals();

    const invoiceCall = mockInvoiceCreate.mock.calls[0][0];
    const items = JSON.parse(invoiceCall.data.items);
    expect(items).toHaveLength(1);
    expect(items[0].description).toContain('enterprise');
    expect(items[0].description).toContain('yearly');
    expect(items[0].amount).toBe(29.99);
  });

  it('generates unique invoice reference', async () => {
    const sub = makeSubscription({ id: 'clx123abc' });
    mockSubscriptionFindMany.mockResolvedValue([sub]);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv_ref' });
    mockSubscriptionUpdate.mockResolvedValue({});

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    await processRenewals();

    const invoiceCall = mockInvoiceCreate.mock.calls[0][0];
    expect(invoiceCall.data.invoiceRef).toMatch(/^INV-RENEW-/);
    expect(invoiceCall.data.invoiceRef).toContain('clx123ab');
  });

  it('skips subscriptions with null metadata', async () => {
    const sub = makeSubscription({ metadata: null });
    mockSubscriptionFindMany.mockResolvedValue([sub]);

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('skips subscriptions with non-autoRenew true metadata', async () => {
    const sub = makeSubscription({ metadata: JSON.stringify({ foo: 'bar' }) });
    mockSubscriptionFindMany.mockResolvedValue([sub]);

    const { processRenewals } = await import('@/backend/lib/billing/subscription-renewal');
    const result = await processRenewals();

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

describe('billing barrel export', () => {
  it('exports computePeriodEnd and isAutoRenew', async () => {
    const mod = await import('@/backend/lib/billing');
    expect(typeof mod.computePeriodEnd).toBe('function');
    expect(typeof mod.isAutoRenew).toBe('function');
  });

  it('exports processRenewals', async () => {
    const mod = await import('@/backend/lib/billing');
    expect(typeof mod.processRenewals).toBe('function');
  });

  it('exports BillingCycle type', async () => {
    // Type export — just ensure the module loads
    const mod = await import('@/backend/lib/billing');
    expect(mod).toBeDefined();
  });
});
