// ─── IntaSend Payment Provider ──────────────────────────
import crypto from 'crypto'
import type { PaymentProvider, InitializePaymentInput, InitializePaymentResult, VerifyPaymentResult, VerifyPaymentInput, PaymentProviderCode } from '../types'
import { getProviderConfig } from '../config'

export class IntaSendProvider implements PaymentProvider {
  code: PaymentProviderCode = 'intasend'
  name = 'IntaSend'
  isActive: boolean
  private publicKey = ''
  private secretKey = ''
  private baseUrl = 'https://payment.intasend.com/api/v1'

  constructor() {
    const config = getProviderConfig('intasend')
    this.isActive = config?.isActive || false
    if (config) {
      this.publicKey = config.publicKey
      this.secretKey = config.secretKey
    }
  }

  private getAuth(): string {
    return Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')
  }

  private async request(method: string, path: string, body?: Record<string, unknown>) {
    const url = `${this.baseUrl}${path}`
    const opts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.getAuth()}`,
        'Content-Type': 'application/json',
      },
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(url, opts)
    return res.json()
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    // IntaSend uses collection API for hosted checkout
    const response = await this.request('POST', '/payment/collection/', {
      public_key: this.publicKey,
      amount: input.amount / 100, // IntaSend uses decimal amounts
      currency: input.currency,
      email: input.email,
      first_name: input.firstName || '',
      last_name: input.lastName || '',
      phone_number: input.phone || '',
      api_ref: input.reference,
      redirect_url: input.redirectUrl,
      webhook_url: input.callbackUrl,
      method: this.mapMethod(input.paymentMethods?.[0]),
      comment: input.metadata?.referenceType || 'Youngsend Payment',
    })

    if (!response.invoice_id && !response.url) {
      return { success: false, providerPaymentId: input.reference }
    }

    return {
      success: true,
      providerPaymentId: String(response.invoice_id || response.id || input.reference),
      checkoutUrl: response.url || response.hosted_url,
    }
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    try {
      const response = await this.request('GET', `/payment/collection/${input.providerPaymentId}`)

      // IntaSend invoice/collection status
      const state = response.state || response.status || ''
      const isCompleted = state.toLowerCase() === 'paid' || state.toUpperCase() === 'COMPLETED'

      return {
        success: isCompleted,
        status: isCompleted ? 'completed' : state.toLowerCase() === 'failed' || state.toLowerCase() === 'cancelled' ? 'failed' : 'pending',
        amount: response.amount ? Math.round(response.amount * 100) : 0,
        currency: (response.currency || 'KES').toUpperCase(),
        paidAt: isCompleted ? new Date().toISOString() : undefined,
        providerPaymentId: input.providerPaymentId,
      }
    } catch (error) {
      return { success: false, status: 'failed', providerPaymentId: input.providerPaymentId }
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const config = getProviderConfig('intasend')
    if (!config?.webhookSecret) {
      if (config?.testMode) return true
      return false
    }
    if (!signature) return false
    try {
      const hash = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex')
      // Constant-time compare to prevent timing attacks
      if (hash.length !== signature.length) return false
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
    } catch {
      return false
    }
  }

  private mapMethod(method?: string): string {
    const map: Record<string, string> = {
      card: 'card',
      mobile_money: 'mpesa',
      mpesa: 'mpesa',
      bank_transfer: 'bank',
      digital_wallet: 'wallet',
    }
    return map[method || ''] || 'card-payment'
  }

  getSupportedMethods() { return getProviderConfig('intasend')?.supportedMethods || [] }
  getSupportedCurrencies() { return getProviderConfig('intasend')?.supportedCurrencies || [] }
  getSupportedCountries() { return getProviderConfig('intasend')?.supportedCountries || [] }
}
