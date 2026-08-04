import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry, type PaymentProviderCode, emitPaymentCompleted, emitPaymentFailed, processWebhookEvent } from '@/lib/payment'
import { db } from '@/lib/db'

// --- Stripe Webhook ------------------------------------------
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

        // --- State machine sync (before any other side-effects) ---
        await processWebhookEvent({
          provider: 'stripe',
          providerRef: providerPaymentId,
          eventType,
          status: result.status === 'completed' ? 'success' : 'failed',
          rawPayload: { sessionId: providerPaymentId, reference },
        }).catch((err) => {
          console.error('[Stripe Webhook] State machine sync failed:', err)
        })

        // Find and update the payment transaction
        const tx = await db.paymentTransaction.findFirst({
          where: { providerTxId: providerPaymentId, provider: 'stripe' },
        })

        if (tx && result.status === 'completed') {
          // Wrap all DB mutations in a single transaction for atomicity
          await db.$transaction(async (txPrisma: any) => {
            await txPrisma.paymentTransaction.update({
              where: { id: tx.id },
              data: { status: 'settled', settledAt: new Date() },
            })

            // Update payment intent (actualFee + completedAt - state synced above)
            if (tx.intentId) {
              await txPrisma.paymentIntent.update({
                where: { id: tx.intentId },
                data: {
                  status: 'completed',
                  actualFee: result.fee ? result.fee / 100 : null,
                  completedAt: new Date(),
                },
              })

              // Check if linked to escrow
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
                    details: `Escrow funded via Stripe webhook. TX: ${providerPaymentId}`,
                    metadata: JSON.stringify({ providerPaymentId, reference }),
                  },
                })

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
                      details: 'Escrow auto-activated after full Stripe payment.',
                    },
                  })
                }
              }

              // Check if linked to payment link
              if (reference) {
                const link = await txPrisma.paymentLink.findFirst({
                  where: { linkRef: reference },
                })

                if (link) {
                  await txPrisma.paymentLink.update({
                    where: { id: link.id },
                    data: {
                      paymentCount: { increment: 1 },
                      totalCollected: { increment: (result.amount ?? 0) / 100 },
                      ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments
                        ? { status: 'depleted' }
                        : {}),
                    },
                  })

                  await txPrisma.paymentLinkPayment.create({
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
          })

          // --- Emit realtime event ---
          let stripeTenantId: string | undefined
          if (tx.intentId) {
            try {
              const bizIntent = await db.paymentIntent.findUnique({ where: { id: tx.intentId }, select: { fromBusinessId: true } })
              if (bizIntent?.fromBusinessId) {
                const biz = await db.business.findUnique({ where: { id: bizIntent.fromBusinessId }, select: { tenantId: true } })
                stripeTenantId = biz?.tenantId
              }
            } catch {
              // Non-fatal
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
