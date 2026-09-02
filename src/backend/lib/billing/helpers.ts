// ─── Shared Billing Helpers ──────────────────────────────────────────────
//
// Common utility functions used across subscription and billing modules.
//

/** Supported billing cycles */
export const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
export type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

/**
 * Computes the period end date from a start date and billing cycle.
 * Uses a cloned date to avoid mutating the original.
 */
export function computePeriodEnd(billingCycle: BillingCycle, start: Date): Date {
  const end = new Date(start.getTime());
  switch (billingCycle) {
    case 'yearly':
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'quarterly':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'monthly':
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }
  return end;
}

/**
 * Parses a JSON metadata string and extracts the autoRenew flag.
 * Returns false if metadata is null/undefined or autoRenew is not true.
 */
export function isAutoRenew(metadata: string | null | undefined): boolean {
  if (!metadata) return false;
  try {
    const parsed = JSON.parse(metadata);
    return parsed?.autoRenew === true;
  } catch {
    return false;
  }
}
