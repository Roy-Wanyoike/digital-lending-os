import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { providerRegistry, type PaymentProviderCode } from '@/lib/payment'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const verifySchema = z.object({
  providerPaymentId: z.string().min(1, 'Provider payment ID is required'),
  provider: z.enum(['stripe', 'paystack', 'intasend', 'flutterwave']),
  paymentIntentId: z.string().optional(),
})

// ─── POST: Verify a payment with the provider ──────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
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
      const intent = await db.paymentIntent.findFirst({
        where: {
          id: paymentIntentId,
          OR: [
            { fromBusiness: { tenantId: user.tenantId } },
            { toBusiness: { tenantId: user.tenantId } },
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

    // ─── Update PaymentIntent ────────────────────────────────
    if (paymentIntentId) {
      const updateData: Record<string, unknown> = {
        status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'processing',
      }
      if (result.fee) updateData.actualFee = result.fee / 100
      if (result.status === 'completed') updateData.completedAt = new Date()

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
