// ─── Stripe Payment Provider ──────────────────────────────
import Stripe from 'stripe'
import type { PaymentProvider, InitializePaymentInput, InitializePaymentResult, VerifyPaymentResult, VerifyPaymentInput, PaymentProviderCode } from '../types'
import { getProviderConfig } from '../config'

export class StripeProvider implements PaymentProvider {
  code: PaymentProviderCode = 'stripe'
  name = 'Stripe'
  isActive: boolean
  private client: Stripe | null = null
  private webhookSecret = ''

  constructor() {
    const config = getProviderConfig('stripe')
    this.isActive = config?.isActive || false
    if (config?.secretKey) {
      this.client = new Stripe(config.secretKey, {
        apiVersion: '2026-06-24.dahlia',
      })
      this.webhookSecret = config.webhookSecret
    }
  }

  private ensureClient(): Stripe {
    if (!this.client) throw new Error('Stripe is not configured')
    return this.client
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const stripe = this.ensureClient()

    const params: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: (input.paymentMethods || ['card']) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: {
              name: `Digital Lending OS Payment - ${input.reference}`,
              description: `Payment ${input.reference}`,
            },
            unit_amount: input.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${input.redirectUrl || ''}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.redirectUrl || ''}&cancelled=true`,
      customer_email: input.email,
      metadata: {
        reference: input.reference,
        provider: 'stripe',
        ...(input.metadata || {}),
      },
    }

    const session = await stripe.checkout.sessions.create(params)

    return {
      success: true,
      providerPaymentId: session.id,
      checkoutUrl: session.url || undefined,
    }
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const stripe = this.ensureClient()

    // Checkout session
    if (input.providerPaymentId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(input.providerPaymentId)
      const pi = session.payment_intent
        ? await stripe.paymentIntents.retrieve(session.payment_intent as string)
        : null

      return {
        success: session.payment_status === 'paid',
        status: session.payment_status === 'paid' ? 'completed' : session.status === 'expired' ? 'failed' : 'pending',
        amount: pi?.amount || session.amount_total || 0,
        currency: (pi?.currency || session.currency || 'usd').toUpperCase(),
        paidAt: pi?.created ? new Date(pi.created * 1000).toISOString() : undefined,
        providerPaymentId: input.providerPaymentId,
      }
    }

    // Payment intent
    if (input.providerPaymentId.startsWith('pi_')) {
      const pi = await stripe.paymentIntents.retrieve(input.providerPaymentId)
      return {
        success: pi.status === 'succeeded',
        status: pi.status === 'succeeded' ? 'completed' : pi.status === 'canceled' ? 'failed' : 'pending',
        amount: pi.amount,
        currency: pi.currency.toUpperCase(),
        paidAt: pi.created ? new Date(pi.created * 1000).toISOString() : undefined,
        providerPaymentId: input.providerPaymentId,
      }
    }

    return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const config = getProviderConfig('stripe')
    if (!config?.webhookSecret) {
      if (config?.testMode) return true
      return false
    }
    try {
      const event = Stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)
      return !!event
    } catch {
      return false
    }
  }

  getSupportedMethods() { return getProviderConfig('stripe')?.supportedMethods || [] }
  getSupportedCurrencies() { return getProviderConfig('stripe')?.supportedCurrencies || [] }
  getSupportedCountries() { return getProviderConfig('stripe')?.supportedCountries || [] }
}
