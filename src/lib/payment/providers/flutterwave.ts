// ─── Flutterwave Payment Provider ─────────────────────
import Flutterwave from 'flutterwave-node-v3'
import crypto from 'crypto'
import type { PaymentProvider, InitializePaymentInput, InitializePaymentResult, VerifyPaymentResult, VerifyPaymentInput, PaymentProviderCode } from '../types'
import { getProviderConfig } from '../config'

export class FlutterwaveProvider implements PaymentProvider {
  code: PaymentProviderCode = 'flutterwave'
  name = 'Flutterwave'
  isActive: boolean
  private flw: Flutterwave | null = null
  private webhookSecret = ''

  constructor() {
    const config = getProviderConfig('flutterwave')
    this.isActive = config?.isActive || false
    if (config?.secretKey && config?.publicKey) {
      this.flw = new Flutterwave(config.publicKey, config.secretKey)
      this.webhookSecret = config.webhookSecret
    }
  }

  private ensureClient(): Flutterwave {
    if (!this.flw) throw new Error('Flutterwave is not configured')
    return this.flw
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const flw = this.ensureClient()

    const payload = {
      tx_ref: input.reference,
      amount: input.amount / 100, // Flutterwave uses decimal amounts
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: {
        email: input.email,
        name: [input.firstName, input.lastName].filter(Boolean).join(' ') || input.email,
        phonenumber: input.phone || '',
      },
      customizations: {
        title: 'Youngsend Payment',
        description: `Payment ${input.reference}`,
        logo: '',
      },
      payment_options: this.mapMethods(input.paymentMethods),
      meta: {
        reference: input.reference,
        provider: 'flutterwave',
        referenceType: input.metadata?.referenceType || '',
        referenceId: input.metadata?.referenceId || '',
      },
    }

    try {
      const response = await flw.Charge.card(payload)

      // If the response contains a payment link
      if ((response as any).data?.link) {
        return {
          success: true,
          providerPaymentId: (response as any).data?.id || input.reference,
          checkoutUrl: (response as any).data.link,
        }
      }

      // Standard hosted payment page
      const hostRes = await flw.Charge.card(payload)
      if ((hostRes as any).data?.link) {
        return {
          success: true,
          providerPaymentId: (hostRes as any).data?.id || input.reference,
          checkoutUrl: (hostRes as any).data.link,
        }
      }

      return { success: false, providerPaymentId: input.reference }
    } catch (error: any) {
      console.error('[Flutterwave] Initialize error:', error)
      return { success: false, providerPaymentId: input.reference }
    }
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const flw = this.ensureClient()

    try {
      const response = await flw.Transaction.verify({ id: input.providerPaymentId }) as any

      if (!response?.data) {
        return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
      }

      const data = response.data
      const isCompleted = data.status === 'successful'

      return {
        success: isCompleted,
        status: isCompleted ? 'completed' : data.status === 'failed' ? 'failed' : 'pending',
        amount: data.amount ? Math.round(data.amount * 100) : 0,
        currency: (data.currency || 'NGN').toUpperCase(),
        fee: data.app_fee ? Math.round(data.app_fee * 100) : undefined,
        paidAt: isCompleted ? new Date().toISOString() : undefined,
        providerPaymentId: input.providerPaymentId,
      }
    } catch (error) {
      return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const config = getProviderConfig('flutterwave')
    if (!config?.webhookSecret) {
      if (config?.testMode) return true
      return false
    }
    try {
      const hash = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex')
      return hash === signature
    } catch {
      return false
    }
  }

  private mapMethods(methods?: string[]): string {
    if (!methods || methods.length === 0) return 'card,mobilemoney,ussd'
    const map: Record<string, string> = {
      card: 'card',
      mobile_money: 'mobilemoney',
      bank_transfer: 'bank_transfer',
      ussd: 'ussd',
      mpesa: 'mpesa',
      digital_wallet: 'mobilemoney',
    }
    return methods.map(m => map[m] || m).filter(Boolean).join(',')
  }

  getSupportedMethods() { return getProviderConfig('flutterwave')?.supportedMethods || [] }
  getSupportedCurrencies() { return getProviderConfig('flutterwave')?.supportedCurrencies || [] }
  getSupportedCountries() { return getProviderConfig('flutterwave')?.supportedCountries || [] }
}
