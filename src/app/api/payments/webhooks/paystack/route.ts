import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry, emitPaymentCompleted, processWebhookEvent } from '@/lib/payment'
import { db } from '@/lib/db'

// ─── Paystack Webhook ────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''

    const provider = providerRegistry.getProvider('paystack')
    if (!provider) {
      return NextResponse.json({ error: 'Paystack provider not configured' }, { status: 500 })
    }

    if (!provider.validateWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(body)
    const event = payload.event

    // Handle charge.success
    if (event === 'charge.success') {
      const data = payload.data
      const providerPaymentId = data.reference
      const metadata = data.metadata?.custom_fields?.reduce((acc: any, f: any) => { acc[f.variable_name] = f.value; return acc }, {}) || data.metadata || {}

      // Wrap fetch (for idempotency + stale-read protection) and all mutations in a transaction
      const txResult = await db.$transaction(async (txPrisma: any) => {
        // Fetch payment transaction inside tx for atomic idempotency check
        const tx = await txPrisma.paymentTransaction.findFirst({
          where: { providerTxId: providerPaymentId, provider: 'paystack' },
        })

        if (!tx) return null

        // Idempotency: if already settled, skip all mutations
        if (tx.status === 'settled') return { idempotent: true, tx }

        await txPrisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'settled',
            settledAt: new Date(data.paid_at),
          },
        })

        // Update payment intent (actualFee + completedAt)
        if (tx.intentId) {
          await txPrisma.paymentIntent.update({
            where: { id: tx.intentId },
            data: {
              status: 'completed',
              actualFee: data.fees ? data.fees / 100 : null,
              completedAt: new Date(data.paid_at),
            },
          })

          // Check escrow link
          const intent = await txPrisma.paymentIntent.findUnique({
            where: { id: tx.intentId },
            include: { escrow: true },
          })

          if (intent?.escrowId && intent.escrow?.status === 'created') {
            await txPrisma.escrowTransaction.update({
              where: { id: intent.escrowId },
              data: {
                status: 'funded',
                fundedAmount: data.amount / 100,
                paymentIntentId: intent.id,
              },
            })

            await txPrisma.escrowAuditLog.create({
              data: {
                escrowId: intent.escrowId,
                action: 'funded',
                actor: 'system',
                details: `Escrow funded via Paystack webhook. TX: ${providerPaymentId}`,
                metadata: JSON.stringify({ providerPaymentId }),
              },
            })

            if (Math.abs(intent.escrow.amount - data.amount / 100) < 0.01) {
              await txPrisma.escrowTransaction.update({
                where: { id: intent.escrowId },
                data: { status: 'in_escrow' },
              })

              await txPrisma.escrowAuditLog.create({
                data: {
                  escrowId: intent.escrowId,
                  action: 'activated',
                  actor: 'system',
                  details: 'Escrow auto-activated after full Paystack payment.',
                },
              })
            }
          }
        }

        // Check payment link
        const ref = metadata.reference || providerPaymentId
        const link = await txPrisma.paymentLink.findFirst({
          where: { linkRef: ref },
        })

        if (link) {
          // Idempotency: check for duplicate payment link payment
          const existingLinkPayment = await txPrisma.paymentLinkPayment.findFirst({
            where: { paymentLinkId: link.id, providerTxId: providerPaymentId },
          })

          if (!existingLinkPayment) {
            await txPrisma.paymentLink.update({
              where: { id: link.id },
              data: {
                paymentCount: { increment: 1 },
                totalCollected: { increment: data.amount / 100 },
                ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments
                  ? { status: 'depleted' }
                  : {}),
              },
            })

            await txPrisma.paymentLinkPayment.create({
              data: {
                paymentLinkId: link.id,
                payerName: data.customer?.first_name
                  ? `${data.customer.first_name} ${data.customer.last_name || ''}`.trim()
                  : null,
                payerEmail: data.customer?.email,
                amount: data.amount / 100,
                currency: data.currency,
                paymentMethod: data.channel || 'card',
                provider: 'paystack',
                status: 'completed',
                feeAmount: data.fees ? data.fees / 100 : null,
                netAmount: data.amount / 100 - (data.fees || 0) / 100,
                providerTxId: providerPaymentId,
                completedAt: new Date(data.paid_at),
              },
            })
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
            provider: 'paystack',
            providerRef: providerPaymentId,
            eventType: event,
            status: 'success',
            rawPayload: { reference: providerPaymentId, amount: data.amount, currency: data.currency },
          })
        } catch (err) {
          console.error('[Paystack Webhook] State machine sync failed:', err)
        }

        // ─── Emit realtime event ────────────────────────────
        let paystackTenantId: string | undefined
        if (tx.intentId) {
          try {
            const psIntent = await db.paymentIntent.findUnique({ where: { id: tx.intentId }, select: { fromBusinessId: true } })
            if (psIntent?.fromBusinessId) {
              const biz = await db.business.findUnique({ where: { id: psIntent.fromBusinessId }, select: { tenantId: true } })
              paystackTenantId = biz?.tenantId
            }
          } catch { /* non-fatal */ }
        }
        emitPaymentCompleted({
          id: tx.id, txRef: tx.txRef, providerTxId: tx.providerTxId,
          provider: tx.provider, amount: tx.amount, currency: tx.currency,
          status: 'settled', intentId: tx.intentId,
          settledAt: data.paid_at ? new Date(data.paid_at).toISOString() : new Date().toISOString(),
        }, paystackTenantId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Paystack Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
