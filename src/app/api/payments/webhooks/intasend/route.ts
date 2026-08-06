import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry, emitPaymentCompleted, processWebhookEvent } from '@/lib/payment'
import { db } from '@/lib/db'

// ─── IntaSend Webhook ────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-intasend-signature') || ''

    const provider = providerRegistry.getProvider('intasend')
    if (!provider) {
      return NextResponse.json({ error: 'IntaSend provider not configured' }, { status: 500 })
    }

    if (!provider.validateWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(body)
    const state = payload.state || payload.status

    if (state === 'paid' || state === 'COMPLETED') {
      const providerPaymentId = String(payload.invoice_id || payload.id || '')
      const apiRef = payload.api_ref || payload.reference

      // Wrap fetch (for idempotency + stale-read protection) and all mutations in a transaction
      const txResult = await db.$transaction(async (txPrisma: any) => {
        // Fetch payment transaction inside tx for atomic idempotency check
        const tx = await txPrisma.paymentTransaction.findFirst({
          where: { providerTxId: providerPaymentId, provider: 'intasend' },
        })

        if (!tx) return null

        // Idempotency: if already settled, skip all mutations
        if (tx.status === 'settled') return { idempotent: true, tx }

        await txPrisma.paymentTransaction.update({
          where: { id: tx.id },
          data: { status: 'settled', settledAt: new Date() },
        })

        if (tx.intentId) {
          await txPrisma.paymentIntent.update({
            where: { id: tx.intentId },
            data: { status: 'completed', completedAt: new Date() },
          })

          // Handle escrow funding
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
                details: `Escrow funded via IntaSend webhook. Invoice: ${providerPaymentId}`,
              },
            })

            if (Math.abs(intent.escrow.amount - intent.sourceAmount) < 0.01) {
              await txPrisma.escrowTransaction.update({
                where: { id: intent.escrowId },
                data: { status: 'in_escrow' },
              })
            }
          }
        }

        // Handle payment link
        if (apiRef) {
          const link = await txPrisma.paymentLink.findFirst({
            where: { linkRef: apiRef },
          })

          if (link) {
            const amount = payload.amount || 0

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
                  paymentMethod: payload.method || 'card',
                  provider: 'intasend',
                  status: 'completed',
                  netAmount: amount,
                  providerTxId: providerPaymentId,
                  completedAt: new Date(),
                },
              })
            }
          }
        }

        return { tx }
      })

      // After transaction commits: state machine sync + realtime events
      if (txResult) {
        const { tx } = txResult

        // State machine sync after successful commit (non-fatal)
        try {
          await processWebhookEvent({
            provider: 'intasend',
            providerRef: providerPaymentId,
            eventType: state,
            status: 'success',
            rawPayload: { invoiceId: providerPaymentId, state },
          })
        } catch (err) {
          console.error('[IntaSend Webhook] State machine sync failed:', err)
        }

        // ─── Emit realtime event ────────────────────────────
        let isTenantId: string | undefined
        if (tx.intentId) {
          try {
            const isIntent = await db.paymentIntent.findUnique({ where: { id: tx.intentId }, select: { fromBusinessId: true } })
            if (isIntent?.fromBusinessId) {
              const biz = await db.business.findUnique({ where: { id: isIntent.fromBusinessId }, select: { tenantId: true } })
              isTenantId = biz?.tenantId
            }
          } catch { /* non-fatal */ }
        }
        emitPaymentCompleted({
          id: tx.id, txRef: tx.txRef, providerTxId: tx.providerTxId,
          provider: tx.provider, amount: tx.amount, currency: tx.currency,
          status: 'settled', intentId: tx.intentId,
          settledAt: new Date().toISOString(),
        }, isTenantId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[IntaSend Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
