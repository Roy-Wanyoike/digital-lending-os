// ─── Subscription Renewal Processor ─────────────────────────────────────
//
// Finds subscriptions that are due for renewal and creates invoices for them.
// Designed to be called by a scheduled job (cron) or invoked manually.
//

import { db } from '@/lib/db';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { computePeriodEnd, isAutoRenew, type BillingCycle } from './helpers';

const log = getLogger().withContext({ module: 'subscription-renewal' });

export interface RenewalResult {
  processed: number;
  failed: number;
  skipped: number;
  errors: Array<{ subscriptionId: string; reason: string }>;
}

/**
 * Processes all subscriptions that are due for renewal.
 *
 * Criteria:
 *  - `currentPeriodEnd <= now`
 *  - `status = 'active'`
 *  - `metadata` contains `autoRenew: true`
 *
 * For each matching subscription:
 *  1. Creates a new invoice (status: 'draft')
 *  2. Advances `currentPeriodStart` to old `currentPeriodEnd`
 *  3. Recomputes `currentPeriodEnd` using the billing cycle
 */
export async function processRenewals(): Promise<RenewalResult> {
  const now = new Date();
  const result: RenewalResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  log.info('Starting subscription renewal processing', { timestamp: now.toISOString() });

  // Find all subscriptions due for renewal
  const dueSubscriptions = await db.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lte: now },
    },
  });

  // Filter by autoRenew in metadata (can't query JSON in SQLite reliably)
  const autoRenewSubs = dueSubscriptions.filter((sub: { metadata: string | null }) => isAutoRenew(sub.metadata));

  if (autoRenewSubs.length === 0) {
    result.skipped = dueSubscriptions.length;
    log.info('No subscriptions due for renewal', { skipped: result.skipped });
    return result;
  }

  log.info('Found subscriptions due for renewal', {
    total: dueSubscriptions.length,
    autoRenew: autoRenewSubs.length,
  });

  for (const sub of autoRenewSubs) {
    try {
      const billingCycle = sub.interval as BillingCycle;
      const newPeriodStart = new Date(sub.currentPeriodEnd.getTime());
      const newPeriodEnd = computePeriodEnd(billingCycle, newPeriodStart);

      // Generate a unique invoice reference
      const invoiceRef = `INV-RENEW-${sub.id.slice(0, 8)}-${newPeriodStart.getTime().toString(36)}`;

      // Create the renewal invoice
      await db.invoice.create({
        data: {
          invoiceRef,
          senderId: sub.businessId,
          receiverId: sub.businessId,
          subscriptionId: sub.id,
          amount: sub.amount,
          currency: sub.currency,
          status: 'draft',
          items: JSON.stringify([
            {
              description: `${sub.planName} plan renewal (${sub.interval})`,
              amount: sub.amount,
            },
          ]),
          notes: `Automatic renewal for subscription ${sub.id}`,
        },
      });

      // Advance the billing period
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      result.processed++;
      log.info('Subscription renewed', {
        subscriptionId: sub.id,
        businessId: sub.businessId,
        plan: sub.planName,
        newPeriodStart: newPeriodStart.toISOString(),
        newPeriodEnd: newPeriodEnd.toISOString(),
        amount: sub.amount,
        currency: sub.currency,
      });
    } catch (err) {
      result.failed++;
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push({ subscriptionId: sub.id, reason: message });
      log.error('Failed to renew subscription', {
        subscriptionId: sub.id,
        error: message,
      });
    }
  }

  result.skipped = dueSubscriptions.length - autoRenewSubs.length;

  log.info('Subscription renewal processing complete', {
    processed: result.processed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}
