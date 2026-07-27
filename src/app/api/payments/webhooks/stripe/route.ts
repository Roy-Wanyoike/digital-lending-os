import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry, type PaymentProviderCode, emitPaymentCompleted, emitPaymentFailed } from '@/lib/payment'
import { db } from '@/lib/db'

// ─── Stripe Webhook ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    const provider = providerRegistry.getProvider('stripe')
    if (!provider) {
      return NextResponse.json({ error: 'Stripe provider not configured' }, { status: 500 })
    }

    if (!provider.validateWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    const eventType = payload.type

    // Handle checkout.session.completed
    if (eventType === 'checkout.session.completed') {
      const session = payload.data?.object
      const providerPaymentId = session?.id
      const reference = session?.metadata?.reference

      if (providerPaymentId) {
        const result = await provider.verify({
          providerPaymentId,
          provider: 'stripe' as PaymentProviderCode,
        })

        // Find and update the payment transaction
        const tx = await db.paymentTransaction.findFirst({
          where: { providerTxId: providerPaymentId, provider: 'stripe' },
        })

        if (tx && result.status === 'completed') {
          await db.paymentTransaction.update({
            where: { id: tx.id },
            data: { status: 'settled', settledAt: new Date() },
          })

          // Update payment intent
          if (tx.intentId) {
            await db.paymentIntent.update({
              where: { id: tx.intentId },
              data: {
                status: 'completed',
                actualFee: result.fee ? result.fee / 100 : null,
                completedAt: new Date(),
              },
            })

            // Check if linked to escrow
            const intent = await db.paymentIntent.findUnique({
              where: { id: tx.intentId },
              include: { escrow: true },
            })

            if (intent?.escrowId && intent.escrow?.status === 'created') {
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
                  details: `Escrow funded via Stripe webhook. TX: ${providerPaymentId}`,
                  metadata: JSON.stringify({ providerPaymentId, reference }),
                },
              })

              if (Math.abs(intent.escrow.amount - intent.sourceAmount) < 0.01) {
                await db.escrowTransaction.update({
                  where: { id: intent.escrowId },
                  data: { status: 'in_escrow' },
                })

                await db.escrowAuditLog.create({
                  data: {
                    escrowId: intent.escrowId,
                    action: 'activated',
                    actor: 'system',
                    details: 'Escrow auto-activated after full Stripe payment.',
                  },
                })
              }
            }

            // Check if linked to payment link
            if (reference) {
              const link = await db.paymentLink.findFirst({
                where: { linkRef: reference },
              })

              if (link) {
                await db.paymentLink.update({
                  where: { id: link.id },
                  data: {
                    paymentCount: { increment: 1 },
                    totalCollected: { increment: (result.amount ?? 0) / 100 },
                    ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments
                      ? { status: 'depleted' }
                      : {}),
                  },
                })

                await db.paymentLinkPayment.create({
                  data: {
                    paymentLinkId: link.id,
                    amount: (result.amount ?? 0) / 100,
                    currency: (result.currency ?? 'USD'),
                    paymentMethod: 'card',
                    provider: 'stripe',
                    status: 'completed',
                    feeAmount: result.fee ? result.fee / 100 : null,
                    netAmount: (result.amount ?? 0) / 100 - (result.fee ? result.fee / 100 : 0),
                    providerTxId: providerPaymentId,
                    completedAt: new Date(),
                  },
                })
              }
            }
          }

          // ─── Emit realtime event ────────────────────────────
          // Best-effort tenantId lookup so SSE clients can filter by tenant
          let stripeTenantId: string | undefined
          if (intent?.fromBusinessId) {
            try {
              const biz = await db.business.findUnique({
                where: { id: intent.fromBusinessId },
                select: { tenantId: true },
              })
              stripeTenantId = biz?.tenantId
            } catch {
              // Non-fatal — emit without tenantId (broadcasts to all)
            }
          }

          emitPaymentCompleted({
            id: tx.id,
            txRef: tx.txRef,
            providerTxId: tx.providerTxId,
            provider: tx.provider,
            amount: tx.amount,
            currency: tx.currency,
            status: 'settled',
            intentId: tx.intentId,
            settledAt: new Date().toISOString(),
          }, stripeTenantId)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
