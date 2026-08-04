import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { providerRegistry, type PaymentProviderCode } from '@/lib/payment'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { getPaymentStateMachine as getSM, recordPaymentTransition } from '@/backend/lib/payment/route-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

// ── DB ↔ State Machine status mapping ─────────────────────────────
function dbStatusToStateMachineState(dbStatus: string | null): string {
  if (!dbStatus) return 'CREATED'
  const upper = dbStatus.toUpperCase().replace(/-/g, '_')
  const validStates = ['CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'COMPLETED',
    'FAILED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'DISPUTED']
  if (validStates.includes(upper)) return upper
  const aliasMap: Record<string, string> = { 'PENDING': 'PENDING_PROVIDER' }
  return aliasMap[dbStatus.toUpperCase()] ?? 'CREATED'
}

function stateMachineStateToDbStatus(state: string): string {
  const map: Record<string, string> = {
    CREATED: 'created', PENDING_PROVIDER: 'pending', PROCESSING: 'processing',
    COMPLETED: 'completed', FAILED: 'failed', REFUNDING: 'refunding',
    REFUNDED: 'refunded', CANCELLED: 'cancelled', DISPUTED: 'disputed',
  }
  return map[state] ?? state.toLowerCase()
}
const verifySchema = z.object({
  providerPaymentId: z.string().min(1, 'Provider payment ID is required'),
  provider: z.enum(['stripe', 'paystack', 'intasend', 'flutterwave', 'paya'] as const),
  paymentIntentId: z.string().optional(),
})

// ─── POST: Verify a payment with the provider ──────────────
async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json()
    const parsed = verifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { providerPaymentId, provider, paymentIntentId } = parsed.data

    const providerInstance = providerRegistry.getProvider(provider as PaymentProviderCode)
    if (!providerInstance) {
      return NextResponse.json(
        { error: `Provider '${provider}' is not available` },
        { status: 400 }
      )
    }

    // If paymentIntentId provided, verify tenant owns it
    if (paymentIntentId) {
      const bizIds = (await db.business.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      })).map((b: any) => b.id)

      const intent = await db.paymentIntent.findFirst({
        where: {
          id: paymentIntentId,
          OR: [
            { fromBusinessId: { in: bizIds } },
            { toBusinessId: { in: bizIds } },
          ],
        },
      })
      if (!intent) {
        return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 })
      }
    }

    // ─── Verify with provider ───────────────────────────────
    const result = await providerInstance.verify({
      providerPaymentId,
      provider: provider as PaymentProviderCode,
    })

    // ─── Update PaymentTransaction ───────────────────────────
    await db.paymentTransaction.updateMany({
      where: { providerTxId: providerPaymentId, provider },
      data: {
        status: result.status,
        ...(result.paidAt ? { settledAt: new Date(result.paidAt) } : {}),
        ...(result.amount ? { amount: result.amount / 100 } : {}),
        metadata: JSON.stringify({
          verifiedAt: new Date().toISOString(),
          ...result,
        }),
      },
    })

    // ── State machine transitions ───────────────────────────────────
    const sm = paymentIntentId ? await getSM() : null
    let smFinalState: string | null = null

    if (sm && paymentIntentId) {
      try {
        // Rehydrate state machine from DB if not already tracking this payment
        if (!sm.getState(paymentIntentId)) {
          const intentRow = await db.paymentIntent.findUnique({
            where: { id: paymentIntentId },
            select: { status: true },
          })
          sm.initialize(paymentIntentId)
          if (intentRow?.status && intentRow.status !== 'created') {
            const hydrated = dbStatusToStateMachineState(intentRow.status)
            if (hydrated !== 'CREATED') {
              await sm.transition(paymentIntentId, hydrated, { provider, reason: 'Rehydrated from DB on verify' })
            }
          }
        }

        const actor = user?.email || user?.id || 'system'

        if (result.status === 'completed') {
          // Success path: step through PROCESSING → COMPLETED
          const cur = sm.getState(paymentIntentId)
          if (cur === 'CREATED' || cur === 'PENDING_PROVIDER') {
            await sm.transition(paymentIntentId, 'PROCESSING', {
              provider,
              reason: 'Verify: provider confirmed payment',
            })
            void recordPaymentTransition(paymentIntentId, cur!, 'PROCESSING', actor)
          }
          const after = sm.getState(paymentIntentId)
          if (after === 'PROCESSING') {
            await sm.transition(paymentIntentId, 'COMPLETED', {
              provider,
              reason: 'Verify: provider confirmed payment success',
            })
            void recordPaymentTransition(paymentIntentId, after!, 'COMPLETED', actor)
          }
          smFinalState = sm.getState(paymentIntentId)
        } else if (result.status === 'failed') {
          // Failure path: step through PROCESSING → FAILED
          const cur = sm.getState(paymentIntentId)
          if (cur === 'CREATED' || cur === 'PENDING_PROVIDER') {
            try {
              await sm.transition(paymentIntentId, 'PROCESSING', {
                provider,
                reason: 'Verify: provider reported failure',
              })
              void recordPaymentTransition(paymentIntentId, cur!, 'PROCESSING', actor)
            } catch { /* non-fatal: may not be legal from this state */ }
          }
          const after = sm.getState(paymentIntentId)
          if (after === 'PROCESSING') {
            await sm.transition(paymentIntentId, 'FAILED', {
              provider,
              reason: 'Verify: provider reported payment failure',
            })
            void recordPaymentTransition(paymentIntentId, after!, 'FAILED', actor)
          }
          smFinalState = sm.getState(paymentIntentId)
        }
      } catch (err) {
        // State machine errors are non-fatal — fall back to direct DB update
        console.warn('[Payments/Verify] State machine error (non-fatal):', err)
      }
    }

    // ─── Update PaymentIntent ────────────────────────────────
    if (paymentIntentId) {
      const resolvedStatus = smFinalState
        ? stateMachineStateToDbStatus(smFinalState)
        : (result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'processing')

      const updateData: Record<string, unknown> = {
        status: resolvedStatus,
      }
      if (result.fee) updateData.actualFee = result.fee / 100
      if (resolvedStatus === 'completed') updateData.completedAt = new Date()

      await db.paymentIntent.update({
        where: { id: paymentIntentId },
        data: updateData,
      })
    }

    // ─── If payment completed, process post-payment logic ────
    if (result.status === 'completed' && paymentIntentId) {
      await handleSuccessfulPayment(paymentIntentId, result)
    }

    return NextResponse.json({
      data: {
        success: result.success,
        status: result.status,
        provider,
        providerPaymentId,
        amount: result.amount,
        currency: result.currency,
        fee: result.fee,
        paidAt: result.paidAt,
      },
    })
  } catch (error) {
    console.error('[Payments] Verify error:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

// ─── Post-payment processing ────────────────────────────────
async function handleSuccessfulPayment(paymentIntentId: string, result: any) {
  try {
    const intent = await db.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    })

    if (!intent) return

    const metadata = intent.escrowId ? { referenceType: 'escrow', referenceId: intent.escrowId } : null

    // If linked to an escrow, fund it
    if (intent.escrowId) {
      const escrow = await db.escrowTransaction.findUnique({
        where: { id: intent.escrowId },
      })

      if (escrow && escrow.status === 'created') {
        await db.escrowTransaction.update({
          where: { id: intent.escrowId },
          data: {
            status: 'funded',
            fundedAmount: intent.sourceAmount,
            paymentIntentId: intent.id,
          },
        })

        await db.escrowAuditLog.create({
          data: {
            escrowId: intent.escrowId,
            action: 'funded',
            actor: 'system',
            details: `Escrow funded via ${intent.routingProvider}. Amount: ${intent.sourceAmount} ${intent.sourceCurrency}. Provider TX: ${result.providerPaymentId}`,
            metadata: JSON.stringify({
              paymentIntentId: intent.id,
              provider: intent.routingProvider,
              providerPaymentId: result.providerPaymentId,
            }),
          },
        })

        // Auto-activate if funded amount matches
        if (Math.abs(escrow.amount - intent.sourceAmount) < 0.01) {
          await db.escrowTransaction.update({
            where: { id: intent.escrowId },
            data: { status: 'in_escrow' },
          })

          await db.escrowAuditLog.create({
            data: {
              escrowId: intent.escrowId,
              action: 'activated',
              actor: 'system',
              details: `Escrow auto-activated after full funding via ${intent.routingProvider}.`,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('[Payments] Post-payment processing error:', error)
  }
}

export const POST = withApiTelemetry(postHandler, '/api/payments/verify');
