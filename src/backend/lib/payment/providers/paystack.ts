// ─── Paystack Payment Provider ───────────────────────────
import crypto from 'crypto'
import type { PaymentProvider, InitializePaymentInput, InitializePaymentResult, VerifyPaymentResult, VerifyPaymentInput, PaymentProviderCode } from '../types'
import { getProviderConfig } from '../config'

export class PaystackProvider implements PaymentProvider {
  code: PaymentProviderCode = 'paystack'
  name = 'Paystack'
  isActive: boolean
  private secretKey = ''
  private baseUrl = 'https://api.paystack.co'

  constructor() {
    const config = getProviderConfig('paystack')
    this.isActive = config?.isActive || false
    if (config?.secretKey) {
      this.secretKey = config.secretKey
      this.baseUrl = config.testMode ? 'https://api.paystack.co' : 'https://api.paystack.co'
    }
  }

  private async request(method: string, path: string, body?: Record<string, unknown>) {
    const url = `${this.baseUrl}${path}`
    const opts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(url, opts)
    return res.json()
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const config = getProviderConfig('paystack')!
    const response = await this.request('POST', '/transaction/initialize', {
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: this.mapMethods(input.paymentMethods),
      metadata: {
        reference: input.reference,
        provider: 'paystack',
        referenceType: input.metadata?.referenceType || '',
        referenceId: input.metadata?.referenceId || '',
        payerName: input.metadata?.payerName || '',
        payerCountry: input.metadata?.payerCountry || '',
        cancel_url: input.redirectUrl,
      },
    })

    if (!response.status || response.status !== true) {
      return { success: false, providerPaymentId: input.reference }
    }

    return {
      success: true,
      providerPaymentId: response.data.reference,
      checkoutUrl: response.data.authorization_url,
      authorizationUrl: response.data.authorization_url,
    }
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const response = await this.request('GET', `/transaction/verify/${input.providerPaymentId}`)

    if (!response.status || !response.data) {
      return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
    }

    const data = response.data
    const isCompleted = data.status === 'success'

    return {
      success: isCompleted,
      status: isCompleted ? 'completed' : data.status === 'failed' ? 'failed' : 'pending',
      amount: data.amount,
      currency: data.currency,
      fee: data.fees,
      paidAt: data.paid_at,
      providerPaymentId: input.providerPaymentId,
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const config = getProviderConfig('paystack')
    if (!config?.secretKey) {
      if (config?.testMode) return true
      return false
    }
    try {
      const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex')
      return hash === signature
    } catch {
      return false
    }
  }

  private mapMethods(methods?: string[]): string[] {
    if (!methods || methods.length === 0) return ['card']
    const map: Record<string, string> = {
      card: 'card',
      bank_transfer: 'bank',
      mobile_money: 'mobile_money',
      ussd: 'ussd',
    }
    return methods.map(m => map[m] || m).filter(Boolean)
  }

  getSupportedMethods() { return getProviderConfig('paystack')?.supportedMethods || [] }
  getSupportedCurrencies() { return getProviderConfig('paystack')?.supportedCurrencies || [] }
  getSupportedCountries() { return getProviderConfig('paystack')?.supportedCountries || [] }
}
