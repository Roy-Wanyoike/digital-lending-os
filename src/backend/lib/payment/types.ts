// ─── Payment Provider Types ──────────────────────────────────────

export type PaymentProviderCode = 'stripe' | 'paystack' | 'intasend' | 'flutterwave' | 'paya'

export type PaymentMethod =
  | 'card'
  | 'mobile_money'
  | 'bank_transfer'
  | 'ussd'
  | 'apple_pay'
  | 'google_pay'
  | 'crypto'
  | 'digital_wallet'
  | 'mpesa'
  | 'upi'
  | 'pix'

export interface ProviderConfig {
  code: PaymentProviderCode
  name: string
  publicKey: string
  secretKey: string
  webhookSecret: string
  isActive: boolean
  supportedCurrencies: string[]
  supportedCountries: string[]
  supportedMethods: PaymentMethod[]
  feePercent: number   // e.g. 1.5 means 1.5%
  fixedFee: number     // e.g. $0.30 per tx
  testMode: boolean
}

export interface InitializePaymentInput {
  amount: number           // in smallest unit (cents/cents equivalent)
  currency: string         // ISO 4217, e.g. USD, NGN, KES
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  paymentMethods?: PaymentMethod[]
  reference: string        // unique reference for this payment
  callbackUrl?: string
  redirectUrl?: string
  metadata?: Record<string, string | number | boolean>
}

export interface InitializePaymentResult {
  success: boolean
  providerPaymentId: string
  checkoutUrl?: string
  authorizationUrl?: string
  clientSecret?: string      // for Stripe PaymentIntent confirmation
  [key: string]: unknown
}

export interface VerifyPaymentInput {
  providerPaymentId: string
  provider: PaymentProviderCode
  reference?: string
}

export interface VerifyPaymentResult {
  success: boolean
  status: 'completed' | 'pending' | 'failed'
  amount?: number          // in smallest unit
  currency?: string
  fee?: number             // in smallest unit
  paidAt?: string          // ISO datetime
  providerPaymentId: string
  [key: string]: unknown
}

export interface FeeBreakdown {
  provider: PaymentProviderCode
  providerName: string
  percentFee: number
  fixedFee: number
  totalFee: number
  netAmount: number
}

export interface PaymentProvider {
  code: PaymentProviderCode
  name: string
  isActive: boolean
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>
  validateWebhookSignature(payload: string, signature: string): boolean
  getSupportedMethods(): PaymentMethod[]
  getSupportedCurrencies(): string[]
  getSupportedCountries(): string[]
}
