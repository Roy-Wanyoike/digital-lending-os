import { NextRequest } from 'next/server'
import { providerRegistry, emitPaymentCompleted, emitPaymentFailed, processWebhookEvent } from '@/lib/payment'
import { db } from '@/lib/db'
import { badRequest, error, ok } from '@/backend/lib/api-response'

// ─── Paya Webhook ───────────────────────────────────────
// Paya delivers deposit/withdrawal lifecycle events as POST JSON.
// The signature is sent in the `x-paya-signature` header (HMAC-SHA256 of the
// raw body using PAYA_WEBHOOK_SECRET). In test mode with no secret configured
// we accept the payload (mirrors the other providers).
//
// Supported events (best-effort, mirrored after the Paystack webhook):
//   - deposit.completed   → mark payment settled + escrow/payment-link funding
//   - deposit.failed      → mark payment failed
//   - withdrawal.*        → logged only (no DB side-effect here)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paya-signature') || ''

    const provider = providerRegistry.getProvider('paya')
    if (!provider) {
      return error('Paya provider not configured')}

    // Demo mode (no secret + test mode) → validateWebhookSignature returns true
    if (!provider.validateWebhookSignature(body, signature)) {
      return badRequest('Invalid signature')}

    const payload = JSON.parse(body) as {
      event?: string
      type?: string
      status?: string
      reference?: string
      id?: string | number
      deposit_id?: string | number
      amount?: number
      currency?: string
      paid_at?: string
      created_at?: string
      metadata?: Record<string, unknown> | null
      data?: Record<string, unknown> | null
    }

    // Normalize event: Paya may send either `event` or `type` at the top level,
    // or wrap the actual fields inside `data`.
    const root = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>
    const event = String(
      payload.event || payload.type || root.event || root.type || '',
    ).toLowerCase()
    const status = String(
      payload.status || root.status || '',
    ).toLowerCase()

    const providerPaymentId = String(
      payload.reference || payload.id || payload.deposit_id ||
      root.reference || root.id || root.deposit_id || '',
    )

    const isCompleted =
      event.includes('deposit.completed') ||
      event.includes('payment.completed') ||
      event.includes('deposit.success') ||
      status === 'completed' ||
      status === 'successful' ||
      status === 'paid'

    const isFailed =
      event.includes('deposit.failed') ||
      event.includes('payment.failed') ||
      status === 'failed' ||
      status === 'rejected' ||
      status === 'cancelled'

    if (!providerPaymentId) {
      // Nothing we can correlate on — acknowledge to avoid retries
      return ok({ received: true, ignored: true, reason: 'no_reference' })
    }

    // Wrap fetch (for idempotency + stale-read protection) and all mutations in a transaction
    const txResult = await db.$transaction(async (txPrisma: any) => {
      // Fetch payment transaction inside tx for atomic idempotency check
      const tx = await txPrisma.paymentTransaction.findFirst({
        where: { providerTxId: providerPaymentId, provider: 'paya' },
      })

      if (!tx) return null

      // Idempotency: if already settled, skip all mutations
      if (tx.status === 'settled') return { idempotent: true, tx }

      let resolvedStatus: 'completed' | 'failed' | null = null

      if (isCompleted) {
        resolvedStatus = 'completed'

        await txPrisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'settled',
            settledAt: payload.paid_at ? new Date(payload.paid_at) : new Date(),
          },
        })

        if (tx.intentId) {
          await txPrisma.paymentIntent.update({
            where: { id: tx.intentId },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          })

          // Escrow funding side-effect
          const intent = await txPrisma.paymentIntent.findUnique({
            where: { id: tx.intentId },
            include: { escrow: true },
          })

          if (intent?.escrowId && intent.escrow?.status === 'created') {
            await txPrisma.escrowTransaction.update({
              where: { id: intent.escrowId },
              data: {
                status: 'funded',
                fundedAmount: intent.sourceAmount,
                paymentIntentId: intent.id,
              },
            })

            await txPrisma.escrowAuditLog.create({
              data: {
                escrowId: intent.escrowId,
                action: 'funded',
                actor: 'system',
                details: `Escrow funded via Paya webhook. Reference: ${providerPaymentId}`,
                metadata: JSON.stringify({ providerPaymentId, event }),
              },
            })

            // Auto-activate if funded amount matches escrow amount
            if (Math.abs(intent.escrow.amount - intent.sourceAmount) < 0.01) {
              await txPrisma.escrowTransaction.update({
                where: { id: intent.escrowId },
                data: { status: 'in_escrow' },
              })

              await txPrisma.escrowAuditLog.create({
                data: {
                  escrowId: intent.escrowId,
                  action: 'activated',
                  actor: 'system',
                  details: 'Escrow auto-activated after full Paya payment.',
                },
              })
            }
          }
        }

        // Payment link side-effect (if reference maps to a PaymentLink.linkRef)
        const link = await txPrisma.paymentLink.findFirst({
          where: { linkRef: providerPaymentId },
        })

        if (link) {
          const amount = typeof payload.amount === 'number' ? payload.amount : 0

          // Idempotency: check for duplicate payment link payment
          const existingLinkPayment = await txPrisma.paymentLinkPayment.findFirst({
            where: { paymentLinkId: link.id, providerTxId: providerPaymentId },
          })

          if (!existingLinkPayment) {
            await txPrisma.paymentLink.update({
              where: { id: link.id },
              data: {
                paymentCount: { increment: 1 },
                totalCollected: { increment: amount },
                ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments
                  ? { status: 'depleted' }
                  : {}),
              },
            })

            await txPrisma.paymentLinkPayment.create({
              data: {
                paymentLinkId: link.id,
                amount,
                currency: (payload.currency || link.currency).toUpperCase(),
                paymentMethod: 'bank_transfer',
                provider: 'paya',
                status: 'completed',
                netAmount: amount,
                providerTxId: providerPaymentId,
                completedAt: payload.paid_at ? new Date(payload.paid_at) : new Date(),
              },
            })
          }
        }
      } else if (isFailed) {
        resolvedStatus = 'failed'

        await txPrisma.paymentTransaction.update({
          where: { id: tx.id },
          data: { status: 'failed' },
        })

        if (tx.intentId) {
          await txPrisma.paymentIntent.update({
            where: { id: tx.intentId },
            data: { status: 'failed' },
          })
        }
      }

      return { tx, resolvedStatus }
    })

    // After transaction commits: state machine sync + realtime events
    if (txResult) {
      const { tx, resolvedStatus } = txResult

      // State machine sync after successful commit (non-fatal)
      try {
        await processWebhookEvent({
          provider: 'paya',
          providerRef: providerPaymentId,
          eventType: event,
          status: resolvedStatus === 'failed' ? 'failed' : 'success',
          rawPayload: { providerPaymentId, event, status },
        })
      } catch (err) {
        console.error('[Paya Webhook] State machine sync failed:', err)
      }

      // ─── Emit realtime event ────────────────────────────
      if (resolvedStatus === 'completed' || !resolvedStatus) {
        let payaTenantId: string | undefined
        if (tx.intentId) {
          try {
            const payaIntent = await db.paymentIntent.findUnique({ where: { id: tx.intentId }, select: { fromBusinessId: true } })
            if (payaIntent?.fromBusinessId) {
              const biz = await db.business.findUnique({ where: { id: payaIntent.fromBusinessId }, select: { tenantId: true } })
              payaTenantId = biz?.tenantId
            }
          } catch { /* non-fatal */ }
        }
        emitPaymentCompleted({
          id: tx.id, txRef: tx.txRef, providerTxId: tx.providerTxId,
          provider: tx.provider, amount: tx.amount, currency: tx.currency,
          status: 'settled', intentId: tx.intentId,
          settledAt: payload.paid_at ? new Date(payload.paid_at).toISOString() : new Date().toISOString(),
        }, payaTenantId)
      } else if (resolvedStatus === 'failed') {
        // ─── Emit realtime failure event ───────────────────
        emitPaymentFailed({
          id: tx.id, txRef: tx.txRef, providerTxId: tx.providerTxId,
          provider: tx.provider, amount: tx.amount, currency: tx.currency,
          status: 'failed', intentId: tx.intentId,
        })
      }
    }

    return ok({ received: true })
  } catch (err: any) {
    console.error('[Paya Webhook] Error:', err)
    return error('Webhook processing failed')
  }
}
