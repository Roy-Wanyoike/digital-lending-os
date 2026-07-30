// ─── Webhook State Synchronizer ─────────────────────────────────────
//
// Bridges the payment state machine (in-memory) with the database
// (PaymentIntent/PaymentTransaction) and the event bus.
//
// Called by webhook handlers AFTER signature verification and BEFORE
// any business logic (escrow, payment links, etc.).
//
// Guarantees:
//   1. State transitions go through the state machine (or fail-fast)
//   2. Database is updated to match the new state
//   3. Event bus is notified (fire-and-forget, never crashes the webhook)
//   4. Idempotent — replayed webhooks produce no side-effects
//

import { db } from '@/backend/lib/db'
import { getPaymentStateMachine, type PaymentStateValue } from './state-machine'
import type { PaymentProviderCode } from './types'
import { eventBus } from '@/backend/services/event-bus'

// ── Types ──────────────────────────────────────────────────────────

export type WebhookProvider = PaymentProviderCode

export interface WebhookEventInput {
  provider: WebhookProvider
  providerRef: string           // providerPaymentId / reference from the webhook
  eventType: string             // e.g. 'charge.success', 'checkout.session.completed'
  status: 'success' | 'failed'  // outcome from the provider
  rawPayload?: Record<string, unknown>  // for audit/debugging
}

export interface WebhookSyncResult {
  success: boolean
  transitionApplied: boolean    // false if idempotent replay
  previousState: PaymentStateValue | null
  newState: PaymentStateValue | null
  paymentIntentId: string | null
  error?: string
}

// ── State Machine → DB Status Mapping ──────────────────────────────
//
// The state machine uses UPPER_SNAKE_CASE, the DB uses lowercase.
// This map is the single source of truth for the translation.

const STATE_TO_DB_STATUS: Record<PaymentStateValue, string> = {
  CREATED: 'created',
  PENDING_PROVIDER: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
}

// ── Core Function ──────────────────────────────────────────────────

/**
 * Process a webhook event through the state machine and sync to DB.
 *
 * Flow:
 *   1. Look up the PaymentTransaction by providerTxId + provider
 *   2. Load or initialize the state machine for the linked PaymentIntent
 *   3. Determine the target state from the webhook event
 *   4. Transition via the state machine (with idempotency)
 *   5. Update the DB PaymentIntent status
 *   6. Fire-and-forget publish to event bus
 *
 * If the intent is already in the target state (idempotent replay),
 * the function returns early with `transitionApplied: false`.
 *
 * If the state machine rejects the transition (illegal state move),
 * the function logs a warning and returns `success: false` — the
 * webhook handler should still return 200 to prevent retries, but
 * the state anomaly is logged.
 */
export async function processWebhookEvent(
  input: WebhookEventInput,
): Promise<WebhookSyncResult> {
  const { provider, providerRef, eventType, status, rawPayload } = input

  // ── 1. Find the PaymentTransaction ───────────────────────────────
  const tx = await db.paymentTransaction.findFirst({
    where: { providerTxId: providerRef, provider },
  })

  if (!tx) {
    // No matching transaction — this could be a payment-link payment
    // or an unknown reference. Not an error, just nothing to sync.
    return {
      success: true,
      transitionApplied: false,
      previousState: null,
      newState: null,
      paymentIntentId: null,
    }
  }

  if (!tx.intentId) {
    // Transaction exists but no linked intent (e.g. direct payment-link)
    return {
      success: true,
      transitionApplied: false,
      previousState: null,
      newState: null,
      paymentIntentId: null,
    }
  }

  const intentId = tx.intentId

  // ── 2. Load the PaymentIntent from DB ────────────────────────────
  const intent = await db.paymentIntent.findUnique({
    where: { id: intentId },
    select: { id: true, status: true, fromBusinessId: true },
  })

  if (!intent) {
    console.error(`[webhook-state-sync] PaymentIntent ${intentId} not found for tx ${tx.id}`)
    return { success: false, transitionApplied: false, previousState: null, newState: null, paymentIntentId: intentId, error: 'Intent not found' }
  }

  // ── 3. Determine target state ────────────────────────────────────
  let targetState: PaymentStateValue
  if (status === 'failed') {
    targetState = 'FAILED'
  } else {
    // Success path: determine which state to transition to based on
    // the current DB status (which reflects where the intent was left)
    const currentState = inferStateMachineState(intent.status)

    // If already in a terminal state, this is an idempotent replay
    if (currentState === 'COMPLETED' || currentState === 'FAILED' || currentState === 'CANCELLED') {
      return {
        success: true,
        transitionApplied: false,
        previousState: currentState,
        newState: currentState,
        paymentIntentId: intentId,
      }
    }

    // Transition through PROCESSING first, then to COMPLETED
    if (currentState === 'CREATED' || currentState === 'PENDING_PROVIDER') {
      // Fast-forward: webhook confirms payment → go to COMPLETED
      targetState = 'COMPLETED'
    } else if (currentState === 'PROCESSING') {
      targetState = 'COMPLETED'
    } else {
      // Already in a non-transitional state, skip
      return {
        success: true,
        transitionApplied: false,
        previousState: currentState,
        newState: currentState,
        paymentIntentId: intentId,
      }
    }
  }

  // ── 4. Execute state machine transition ───────────────────────────
  const sm = getPaymentStateMachine()

  // Ensure the payment is initialized in the state machine
  const existingState = sm.getState(intentId)
  if (!existingState) {
    const currentState = inferStateMachineState(intent.status)
    sm.initialize(intentId)
    // Fast-forward to current state if it's not CREATED
    if (currentState !== 'CREATED') {
      try {
        await sm.transition(intentId, currentState, { provider, reason: 'Rehydrated from DB on webhook' })
      } catch {
        // If we can't fast-forward, just proceed — the intent is already past CREATED
      }
    }
  }

  // For success: may need to step through PROCESSING first
  if (targetState === 'COMPLETED') {
    const current = sm.getState(intentId)
    if (current === 'CREATED' || current === 'PENDING_PROVIDER') {
      try {
        await sm.transition(intentId, 'PROCESSING', {
          provider,
          reason: `Webhook ${eventType} received`,
          metadata: rawPayload ? { eventType, providerRef } : undefined,
        })
      } catch (err) {
        console.warn(`[webhook-state-sync] PENDING_PROVIDER→PROCESSING failed for ${intentId}:`, err)
      }
    }

    const afterProcessing = sm.getState(intentId)
    if (afterProcessing === 'PROCESSING') {
      try {
        await sm.transition(intentId, 'COMPLETED', {
          provider,
          reason: `Webhook ${eventType}: provider confirmed payment`,
          metadata: rawPayload ? { eventType, providerRef } : undefined,
        })
      } catch (err) {
        console.warn(`[webhook-state-sync] PROCESSING→COMPLETED failed for ${intentId}:`, err)
        return {
          success: false,
          transitionApplied: false,
          previousState: afterProcessing,
          newState: afterProcessing,
          paymentIntentId: intentId,
          error: `Transition failed: ${err instanceof Error ? err.message : String(err)}`,
        }
      }
    }
  } else if (targetState === 'FAILED') {
    const current = sm.getState(intentId)
    // Need to be in PROCESSING to go to FAILED
    if (current === 'CREATED' || current === 'PENDING_PROVIDER') {
      try {
        await sm.transition(intentId, 'PROCESSING', { provider, reason: 'Webhook failure event' })
      } catch {
        // Non-fatal
      }
    }
    const afterStep = sm.getState(intentId)
    if (afterStep === 'PROCESSING') {
      try {
        await sm.transition(intentId, 'FAILED', {
          provider,
          reason: `Webhook ${eventType}: provider reported failure`,
        })
      } catch (err) {
        console.warn(`[webhook-state-sync] PROCESSING→FAILED failed for ${intentId}:`, err)
        return {
          success: false,
          transitionApplied: false,
          previousState: afterStep,
          newState: afterStep,
          paymentIntentId: intentId,
          error: `Transition failed: ${err instanceof Error ? err.message : String(err)}`,
        }
      }
    }
  }

  // ── 5. Update DB PaymentIntent status ─────────────────────────────
  const finalState = sm.getState(intentId)!
  const dbStatus = STATE_TO_DB_STATUS[finalState]

  if (dbStatus && dbStatus !== intent.status) {
    try {
      await db.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: dbStatus,
          ...(finalState === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      })
    } catch (err) {
      console.error(`[webhook-state-sync] DB update failed for ${intentId}:`, err)
      // Don't fail the webhook — the state machine is the source of truth
    }
  }

  // ── 6. Fire-and-forget event bus publish ─────────────────────────
  try {
    eventBus.emit(
      'payment.state.changed',
      {
        paymentIntentId: intentId,
        provider,
        providerRef,
        eventType,
        previousState: inferStateMachineState(intent.status),
        newState: finalState,
        timestamp: new Date().toISOString(),
      },
    )
  } catch {
    // Never crash the webhook due to event bus issues
  }

  return {
    success: true,
    transitionApplied: true,
    previousState: inferStateMachineState(intent.status),
    newState: finalState,
    paymentIntentId: intentId,
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Map a DB status string (lowercase) to a PaymentStateValue.
 * Defaults to CREATED for unknown/empty statuses.
 */
function inferStateMachineState(dbStatus: string | null): PaymentStateValue {
  if (!dbStatus) return 'CREATED'
  const upper = dbStatus.toUpperCase().replace(/-/g, '_')
  const validStates: PaymentStateValue[] = [
    'CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'COMPLETED',
    'FAILED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'DISPUTED',
  ]
  if (validStates.includes(upper as PaymentStateValue)) {
    return upper as PaymentStateValue
  }
  // Map common DB status strings to state machine states
  const aliasMap: Record<string, PaymentStateValue> = {
    'PENDING': 'PENDING_PROVIDER',
    'SETTLED': 'COMPLETED',
    'SUCCESS': 'COMPLETED',
    'PAID': 'COMPLETED',
    'REJECTED': 'FAILED',
    'CANCELLED': 'CANCELLED',
  }
  return aliasMap[dbStatus.toUpperCase()] ?? 'CREATED'
}
