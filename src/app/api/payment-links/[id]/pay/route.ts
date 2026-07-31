import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestBaseUrl } from '@/lib/utils'
import { db } from '@/lib/db'
import { providerRegistry, getProvidersForCurrency, calculateFee, getProviderName, type PaymentProviderCode } from '@/lib/payment'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const paySchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payerName: z.string().min(1, 'Payer name is required'),
  payerEmail: z.string().email('Invalid payer email'),
  payerCountry: z.string().min(1, 'Payer country is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  provider: z.enum(['stripe', 'paystack', 'intasend', 'flutterwave']).optional(),
})

// ─── POST: Pay via a payment link using real provider ───────
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = paySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Fetch the payment link
    const link = await db.paymentLink.findUnique({ where: { id } })
    if (!link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }
    const biz = await db.business.findUnique({ where: { id: link.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    if (link.status !== 'active') {
      return NextResponse.json({ error: 'Payment link is not active' }, { status: 400 })
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ error: 'Payment link has expired' }, { status: 400 })
    }

    if (link.amount > 0 && data.amount < link.amount) {
      return NextResponse.json(
        { error: `Amount must be at least ${link.amount} ${link.currency}` },
        { status: 400 }
      )
    }

    if (link.maxPayments > 0 && link.paymentCount >= link.maxPayments) {
      return NextResponse.json({ error: 'Payment link has reached its maximum number of payments' }, { status: 400 })
    }

    // ─── Provider Selection ────────────────────────────────────
    let providerCode: PaymentProviderCode | null = data.provider || null
    if (!providerCode) {
      const candidates = getProvidersForCurrency(link.currency)
      const { getProvidersForCountry } = await import('@/lib/payment')
      const countryCandidates = getProvidersForCountry(data.payerCountry)
      const filtered = candidates.filter(c => countryCandidates.includes(c))
      providerCode = filtered[0] || candidates[0] || null
    }

    if (!providerCode) {
      // Fallback: create a pending record without provider (demo mode)
      const feeAmount = Math.round(data.amount * 0.015 * 100) / 100
      const netAmount = Math.round((data.amount - feeAmount) * 100) / 100
      const payment = await db.paymentLinkPayment.create({
        data: {
          paymentLinkId: id,
          payerName: data.payerName,
          payerEmail: data.payerEmail,
          payerCountry: data.payerCountry,
          amount: data.amount,
          currency: link.currency,
          paymentMethod: data.paymentMethod,
          status: 'pending',
          feeAmount,
          netAmount,
          metadata: JSON.stringify({ note: 'No provider configured - pending manual confirmation' }),
        },
      })
      return NextResponse.json({
        data: payment,
        warning: 'No active payment provider available. Payment recorded as pending.',
      })
    }

    const provider = providerRegistry.getProvider(providerCode)
    if (!provider) {
      return NextResponse.json({ error: `Provider '${providerCode}' is not active` }, { status: 400 })
    }

    const feeBreakdown = calculateFee(data.amount, providerCode, link.currency)
    const amountInCents = Math.round(data.amount * 100)

    // ─── Create PaymentIntent ──────────────────────────────────
    const paymentIntent = await db.paymentIntent.create({
      data: {
        intentRef: `PL-${link.linkRef}-${Date.now()}`,
        fromBusinessId: link.businessId,
        toBusinessId: link.businessId,
        sourceAmount: data.amount,
        sourceCurrency: link.currency,
        targetAmount: feeBreakdown.netAmount,
        targetCurrency: link.currency,
        exchangeRate: 1,
        status: 'processing',
        paymentMethod: data.paymentMethod,
        routingProvider: providerCode,
        routingScore: 0.9,
        estimatedFee: feeBreakdown.totalFee,
        estimatedTime: 5,
      },
    })

    // ─── Initialize Payment with Provider ─────────────────────
    const baseUrl = getRequestBaseUrl(request, process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || '')

    const initResult = await provider.initialize({
      amount: amountInCents,
      currency: link.currency,
      email: data.payerEmail,
      firstName: data.payerName.split(' ')[0] || data.payerName,
      lastName: data.payerName.split(' ').slice(1).join(' ') || '',
      reference: link.linkRef,
      callbackUrl: `${baseUrl}/api/payments/webhooks/${providerCode}`,
      redirectUrl: `${baseUrl}/pay/${link.linkRef}?provider=${providerCode}`,
      paymentMethods: [data.paymentMethod as any],
      metadata: {
        referenceType: 'payment_link',
        referenceId: id,
        paymentIntentId: paymentIntent.id,
        linkRef: link.linkRef,
        payerName: data.payerName,
        payerCountry: data.payerCountry,
      },
    })

    if (!initResult.success) {
      await db.paymentIntent.update({ where: { id: paymentIntent.id }, data: { status: 'failed' } })
      return NextResponse.json(
        { error: `Failed to initialize payment with ${getProviderName(providerCode)}` },
        { status: 502 }
      )
    }

    // ─── Create PaymentTransaction ─────────────────────────────
    await db.paymentTransaction.create({
      data: {
        intentId: paymentIntent.id,
        txRef: `PTX-PL-${link.linkRef}`,
        provider: providerCode,
        providerTxId: initResult.providerPaymentId,
        amount: data.amount,
        currency: link.currency,
        status: 'processing',
        metadata: JSON.stringify({
          referenceType: 'payment_link',
          referenceId: id,
          linkRef: link.linkRef,
        }),
      },
    })

    // ─── Return checkout info ─────────────────────────────────
    return NextResponse.json({
      data: {
        paymentIntentId: paymentIntent.id,
        provider: providerCode,
        providerName: getProviderName(providerCode),
        checkoutUrl: initResult.checkoutUrl || initResult.authorizationUrl,
        fee: feeBreakdown,
        status: 'awaiting_payment',
      },
    })
  } catch (error) {
    console.error('Error processing payment link:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}

export const POST = withApiTelemetry(postHandler, '/api/payment-links/[id]/pay');
