import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getRequestBaseUrl } from '@/lib/utils'
import { db } from '@/lib/db'
import { providerRegistry, getProvidersForCurrency, getProvidersForCountry, calculateFee, getProviderName, type PaymentProviderCode } from '@/lib/payment'
import { requireAuth } from '@/lib/auth/api-helpers'
import { ok, badRequest, validationError, error as apiErr, withErrorHandler } from '@/backend/lib/api-response'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'

// ─── Zod Schema ──────────────────────────────────────────────
const initSchema = z.object({
  provider: z.enum(['stripe', 'paystack', 'intasend', 'flutterwave', 'paya']).optional(),
  amount: z.number().positive('Amount must be positive').max(10000000, 'Amount exceeds maximum limit of 10,000,000'),
  currency: z.string().min(3).max(3).default('USD'),
  email: z.string().email('Valid email required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceType: z.enum(['escrow', 'payment_link', 'wallet_topup']).optional(),
  referenceId: z.string().optional(),
  payerName: z.string().optional(),
  payerCountry: z.string().optional(),
})

// ─── POST: Initialize a payment with a provider ──────────────
const postHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const body = await request.json()
  const parsed = initSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map(i => i.message).join(', '),
      parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    )
  }

  const data = parsed.data
  const baseUrl = getRequestBaseUrl(request, process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || '')

  // ─── Provider Selection ────────────────────────────────────
  let providerCode: PaymentProviderCode | null = data.provider || null

  if (!providerCode) {
    let candidates = getProvidersForCurrency(data.currency)

    if (data.payerCountry && candidates.length > 1) {
      const countryCandidates = getProvidersForCountry(data.payerCountry)
      candidates = candidates.filter(c => countryCandidates.includes(c))
    }

    if (data.paymentMethod && candidates.length > 1) {
      const registry = providerRegistry as any
      candidates = candidates.filter((c: string) => {
        const provider = registry.getProvider(c as PaymentProviderCode)
        return provider?.getSupportedMethods().includes(data.paymentMethod)
      })
    }

    providerCode = candidates[0] || null
  }

  if (!providerCode) {
    return badRequest('No active payment provider available for this currency/country combination')
  }

  const provider = providerRegistry.getProvider(providerCode)
  if (!provider) {
    return badRequest(`Payment provider '${providerCode}' is not configured or active`)
  }

  // ─── Determine reference for provider ─────────────────────
  let providerReference = `YS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  if (data.referenceType === 'escrow' && data.referenceId) {
    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id: data.referenceId,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
    })
    if (escrow) providerReference = escrow.txRef
  } else if (data.referenceType === 'payment_link' && data.referenceId) {
    const link = await db.paymentLink.findUnique({ where: { id: data.referenceId } })
    if (link) {
      const biz = await db.business.findUnique({ where: { id: link.businessId }, select: { tenantId: true } })
      if (biz && biz.tenantId === user.tenantId) {
        providerReference = link.linkRef
      }
    }
  }

  // ─── Initialize with provider ─────────────────────────────
  const callbackUrl = `${baseUrl}/api/payments/webhooks/${providerCode}`
  const redirectUrl = `${baseUrl}/pay/${providerReference}?provider=${providerCode}`

  const initResult = await provider.initialize({
    amount: data.amount,
    currency: data.currency,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    paymentMethods: data.paymentMethod ? [data.paymentMethod as any] : undefined,
    reference: providerReference,
    callbackUrl,
    redirectUrl,
    metadata: {
      referenceType: data.referenceType || 'general',
      referenceId: data.referenceId || '',
      payerName: data.payerName || '',
      payerCountry: data.payerCountry || '',
    },
  })

  if (!initResult.success) {
    return apiErr('Failed to initialize payment with provider', 502, 'BAD_GATEWAY')
  }

  // ─── Create PaymentIntent + PaymentTransaction records ────
  const feeBreakdown = calculateFee(data.amount / 100, providerCode, data.currency)

  const paymentIntent = await db.paymentIntent.create({
    data: {
      intentRef: `PI-${providerReference}`,
      fromBusinessId: data.referenceId || '',
      toBusinessId: data.referenceId || '',
      sourceAmount: data.amount / 100,
      sourceCurrency: data.currency,
      targetAmount: (data.amount / 100) - feeBreakdown.totalFee,
      targetCurrency: data.currency,
      exchangeRate: 1,
      status: 'processing',
      paymentMethod: data.paymentMethod,
      routingProvider: providerCode,
      routingScore: 0.9,
      estimatedFee: feeBreakdown.totalFee,
      actualFee: null,
      estimatedTime: 5,
    },
  })

  const paymentTx = await db.paymentTransaction.create({
    data: {
      intentId: paymentIntent.id,
      txRef: `PTX-${providerReference}`,
      provider: providerCode,
      providerTxId: initResult.providerPaymentId,
      amount: data.amount / 100,
      currency: data.currency,
      status: 'processing',
      metadata: JSON.stringify({
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        payerName: data.payerName,
        payerCountry: data.payerCountry,
      }),
    },
  })

  return ok({
    paymentIntentId: paymentIntent.id,
    paymentTransactionId: paymentTx.id,
    provider: providerCode,
    providerName: getProviderName(providerCode),
    providerPaymentId: initResult.providerPaymentId,
    checkoutUrl: initResult.checkoutUrl,
    reference: providerReference,
    fee: feeBreakdown,
  })
})

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/payments/initialize');
