import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getRequestBaseUrl } from '@/lib/utils'
import { db } from '@/lib/db'
import { providerRegistry, getProvidersForCurrency, calculateFee, getProviderName, type PaymentProviderCode } from '@/lib/payment'
import { requireAuth } from '@/lib/auth/api-helpers'
import { ok, badRequest, notFound, validationError, error as apiErr, withErrorHandler } from '@/backend/lib/api-response'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'

const paySchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payerName: z.string().min(1, 'Payer name is required'),
  payerEmail: z.string().email('Invalid payer email'),
  payerCountry: z.string().min(1, 'Payer country is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  provider: z.enum(['stripe', 'paystack', 'intasend', 'flutterwave']).optional(),
})

// ─── POST: Pay via a payment link using real provider ───────
const postHandler = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireAuth(request)
  const { id } = await params
  const body = await request.json()
  const parsed = paySchema.safeParse(body)

  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map((i) => i.message).join(', '),
      parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    )
  }

  const data = parsed.data

  // Fetch the payment link
  const link = await db.paymentLink.findUnique({ where: { id } })
  if (!link) {
    return notFound('Payment link not found')
  }
  const biz = await db.business.findUnique({ where: { id: link.businessId }, select: { tenantId: true } })
  if (!biz || biz.tenantId !== user.tenantId) {
    return notFound('Payment link not found')
  }

  if (link.status !== 'active') {
    return badRequest('Payment link is not active')
  }

  if (link.expiresAt && new Date() > link.expiresAt) {
    return badRequest('Payment link has expired')
  }

  if (link.amount > 0 && data.amount < link.amount) {
    return badRequest(`Amount must be at least ${link.amount} ${link.currency}`)
  }

  if (link.maxPayments > 0 && link.paymentCount >= link.maxPayments) {
    return badRequest('Payment link has reached its maximum number of payments')
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
    return ok(payment, { warning: 'No active payment provider available. Payment recorded as pending.' })
  }

  const provider = providerRegistry.getProvider(providerCode)
  if (!provider) {
    return badRequest(`Provider '${providerCode}' is not active`)
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
    return apiErr(`Failed to initialize payment with ${getProviderName(providerCode)}`, 502, 'BAD_GATEWAY')
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
  return ok({
    paymentIntentId: paymentIntent.id,
    provider: providerCode,
    providerName: getProviderName(providerCode),
    checkoutUrl: initResult.checkoutUrl || initResult.authorizationUrl,
    fee: feeBreakdown,
    status: 'awaiting_payment',
  })
})

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/payment-links/[id]/pay');
