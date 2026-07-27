import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry, type PaymentProviderCode, emitPaymentCompleted } from '@/lib/payment'
import { db } from '@/lib/db'

// ─── Flutterwave Webhook ─────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('verif-hash') || ''

    const provider = providerRegistry.getProvider('flutterwave')
    if (!provider) {
      return NextResponse.json({ error: 'Flutterwave provider not configured' }, { status: 500 })
    }

    if (signature && !provider.validateWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)

    if (payload.event === 'charge.completed') {
      const data = payload.data
      const providerPaymentId = String(data.id || '')
      const txRef = data.tx_ref

      // Update payment transaction
      const tx = await db.paymentTransaction.findFirst({
        where: { providerTxId: txRef, provider: 'flutterwave' },
      })

      if (tx) {
        await db.paymentTransaction.update({
          where: { id: tx.id },
          data: { status: 'settled', settledAt: new Date() },
        })

        if (tx.intentId) {
          await db.paymentIntent.update({
            where: { id: tx.intentId },
            data: {
              status: 'completed',
              actualFee: data.app_fee || null,
              completedAt: new Date(),
            },
          })

          // Handle escrow funding
          const intent = await db.paymentIntent.findUnique({
            where: { id: tx.intentId },
            include: { escrow: true },
          })

          if (intent?.escrowId && intent.escrow?.status === 'created') {
            await db.escrowTransaction.update({
              where: { id: intent.escrowId },
              data: {
                status: 'funded',
                fundedAmount: data.amount,
                paymentIntentId: intent.id,
              },
            })

            await db.escrowAuditLog.create({
              data: {
                escrowId: intent.escrowId,
                action: 'funded',
                actor: 'system',
                details: `Escrow funded via Flutterwave webhook. TX: ${txRef}`,
              },
            })

            if (Math.abs(intent.escrow.amount - data.amount) < 0.01) {
              await db.escrowTransaction.update({
                where: { id: intent.escrowId },
                data: { status: 'in_escrow' },
              })
            }
          }
        }

        // Handle payment link
        if (txRef) {
          const link = await db.paymentLink.findFirst({
            where: { linkRef: txRef },
          })

          if (link) {
            await db.paymentLink.update({
              where: { id: link.id },
              data: {
                paymentCount: { increment: 1 },
                totalCollected: { increment: data.amount },
                ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments
                  ? { status: 'depleted' }
                  : {}),
              },
            })

            await db.paymentLinkPayment.create({
              data: {
                paymentLinkId: link.id,
                payerName: data.customer?.name,
                payerEmail: data.customer?.email,
                amount: data.amount,
                currency: (data.currency || link.currency).toUpperCase(),
                paymentMethod: data.payment_type || 'card',
                provider: 'flutterwave',
                status: 'completed',
                feeAmount: data.app_fee,
                netAmount: data.amount - (data.app_fee || 0),
                providerTxId: providerPaymentId,
                completedAt: new Date(),
              },
            })
          }
        }

        // ─── Emit realtime event ────────────────────────────
        let fwTenantId: string | undefined
        if (tx.intentId) {
          try {
            const fwIntent = await db.paymentIntent.findUnique({ where: { id: tx.intentId }, select: { fromBusinessId: true } })
            if (fwIntent?.fromBusinessId) {
              const biz = await db.business.findUnique({ where: { id: fwIntent.fromBusinessId }, select: { tenantId: true } })
              fwTenantId = biz?.tenantId
            }
          } catch { /* non-fatal */ }
        }
        emitPaymentCompleted({
          id: tx.id, txRef: tx.txRef, providerTxId: tx.providerTxId,
          provider: tx.provider, amount: tx.amount, currency: tx.currency,
          status: 'settled', intentId: tx.intentId,
          settledAt: new Date().toISOString(),
        }, fwTenantId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Flutterwave Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
