// ─── Temporal Bridge ────────────────────────────────────────────────────────
// Thin service layer that wires API routes to Temporal workflows.
//
// Each exported function:
//   1. Attempts to dispatch the workflow via Temporal server (using the
//      existing client.ts + runner.ts which has a built-in fallback).
//   2. If Temporal is unavailable (typical in dev / demo), the runner falls
//      back to DIRECT execution of the activity logic — synchronous, in-process.
//   3. Any error is caught and logged so the API route's primary mutation
//      (which has already happened by the time the bridge is invoked) is
//      never rolled back or blocked by workflow processing.
//
// Usage from an API route:
//   import { processPayment } from '@/backend/services/temporal-bridge'
//   await processPayment({ paymentIntentId: intent.id, amount, ... })

import {
  runWorkflow,
  runPaymentProcessing,
  runMilestoneRelease,
  runComplianceScreening,
} from '@/lib/temporal/runner'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentData {
  /** Optional PaymentLink ID. If absent, the workflow is skipped (no-op). */
  paymentLinkId?: string
  /** The PaymentIntent ID created by the route (used for logging). */
  paymentIntentId?: string
  amount: number
  currency?: string
  payerEmail: string
  payerName: string
  provider: string
  tenantId?: string
}

export interface EscrowData {
  escrowId: string
  /** Optional milestoneId for logging / audit. */
  milestoneId?: string
  /** The milestone sequence number to release. */
  milestoneSequence: number
  tenantId?: string
}

export interface WithdrawalData {
  walletId: string
  withdrawalId: string
  withdrawalRef: string
  amount: number
  currency?: string
  tenantId?: string
}

export interface ComplianceData {
  businessId: string
  transactionType: string
  transactionId: string
  tenantId?: string
}

// ─── processPayment ─────────────────────────────────────────────────────────
// Attempts Temporal first; falls back to the direct `processPaymentLink`
// activity (synchronous, in-process). Idempotent — the activity checks for an
// existing payment record before creating a new one.

export async function processPayment(data: PaymentData) {
  try {
    if (!data.paymentLinkId) {
      // The intents API route creates a PaymentIntent, not a PaymentLink — so
      // there's nothing for the `processPaymentLink` activity to do. Log and
      // skip rather than throwing, so the route's response is unaffected.
      console.log(
        `[temporal-bridge] processPayment: no paymentLinkId, skipping workflow for intent ${data.paymentIntentId ?? 'unknown'}`
      )
      return {
        status: 'skipped',
        reason: 'no paymentLinkId',
        paymentIntentId: data.paymentIntentId,
      }
    }

    return await runPaymentProcessing(
      data.paymentLinkId,
      data.amount,
      data.payerEmail,
      data.payerName,
      data.provider
    )
  } catch (err) {
    console.warn('[temporal-bridge] processPayment failed:', err)
    return { status: 'failed', error: String(err) }
  }
}

// ─── processEscrow ──────────────────────────────────────────────────────────
// Attempts Temporal first; falls back to the direct `releaseMilestone`
// activity. Idempotent — the activity checks if the milestone is already
// released before mutating anything.

export async function processEscrow(data: EscrowData) {
  try {
    return await runMilestoneRelease(data.escrowId, data.milestoneSequence)
  } catch (err) {
    console.warn('[temporal-bridge] processEscrow failed:', err)
    return { status: 'failed', error: String(err) }
  }
}

// ─── processWithdrawal ──────────────────────────────────────────────────────
// Attempts Temporal first; falls back to a direct no-op that simply logs the
// withdrawal processing trigger.
//
// Note: the actual fund movement (wallet balance update + WalletTransaction
// record) is performed by the withdrawal API route inside a Prisma
// transaction. The bridge deliberately does NOT re-debit the wallet in the
// fallback path to avoid double-charging. When a real Temporal worker is
// connected, the `withdrawal-processing` workflow can perform additional
// downstream steps (notifications, payout provider calls, etc.).

export async function processWithdrawal(data: WithdrawalData) {
  try {
    return await runWorkflow(
      'withdrawal-processing',
      data,
      async () => {
        // Direct fallback: fund movement already happened in the API route.
        console.log(
          `[temporal-bridge] processWithdrawal direct fallback for ${data.withdrawalRef} (wallet ${data.walletId}, amount ${data.amount} ${data.currency ?? ''})`
        )
        return {
          status: 'processed',
          withdrawalRef: data.withdrawalRef,
          withdrawalId: data.withdrawalId,
        }
      }
    )
  } catch (err) {
    console.warn('[temporal-bridge] processWithdrawal failed:', err)
    return { status: 'failed', error: String(err) }
  }
}

// ─── processCompliance ──────────────────────────────────────────────────────
// Attempts Temporal first; falls back to the direct `runComplianceScreening`
// activity. Idempotent — the activity checks for an existing screening before
// creating a new one.

export async function processCompliance(data: ComplianceData) {
  try {
    return await runComplianceScreening(
      data.businessId,
      data.transactionType,
      data.transactionId
    )
  } catch (err) {
    console.warn('[temporal-bridge] processCompliance failed:', err)
    return { status: 'failed', error: String(err) }
  }
}
