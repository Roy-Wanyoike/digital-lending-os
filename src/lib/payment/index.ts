// ─── Payment Provider Registry ──────────────────────────
// Central hub for all payment providers.
// Providers are lazy-initialized on first use.

import type { PaymentProvider, PaymentProviderCode } from './types'
import { getProviderConfig } from './config'

// Lazy-loaded provider singletons
let _stripe: InstanceType<typeof import('./providers/stripe').StripeProvider> | null = null
let _paystack: InstanceType<typeof import('./providers/paystack').PaystackProvider> | null = null
let _intasend: InstanceType<typeof import('./providers/intasend').IntaSendProvider> | null = null
let _flutterwave: InstanceType<typeof import('./providers/flutterwave').FlutterwaveProvider> | null = null

function getStripe() {
  if (!_stripe) {
    const { StripeProvider } = require('./providers/stripe')
    _stripe = new StripeProvider()
  }
  return _stripe
}

function getPaystack() {
  if (!_paystack) {
    const { PaystackProvider } = require('./providers/paystack')
    _paystack = new PaystackProvider()
  }
  return _paystack
}

function getIntaSend() {
  if (!_intasend) {
    const { IntaSendProvider } = require('./providers/intasend')
    _intasend = new IntaSendProvider()
  }
  return _intasend
}

function getFlutterwave() {
  if (!_flutterwave) {
    const { FlutterwaveProvider } = require('./providers/flutterwave')
    _flutterwave = new FlutterwaveProvider()
  }
  return _flutterwave
}

const providerMap: Record<PaymentProviderCode, () => PaymentProvider | null> = {
  stripe: getStripe,
  paystack: getPaystack,
  intasend: getIntaSend,
  flutterwave: getFlutterwave,
}

export const providerRegistry = {
  getProvider(code: PaymentProviderCode): PaymentProvider | null {
    const factory = providerMap[code]
    if (!factory) return null
    const provider = factory()
    if (!provider) return null
    return provider.isActive ? provider : null
  },

  getAllProviders(): PaymentProvider[] {
    return (Object.keys(providerMap) as PaymentProviderCode[])
      .map(code => providerRegistry.getProvider(code))
      .filter((p): p is PaymentProvider => p !== null)
  },
}

// Re-export everything for convenience
export type { PaymentProviderCode, PaymentMethod, InitializePaymentInput, InitializePaymentResult, VerifyPaymentInput, VerifyPaymentResult, FeeBreakdown, PaymentProvider } from './types'
export { getProviderConfig, getActiveProviderConfigs, getProvidersForCurrency, getProvidersForCountry, getProviderName, getProviderLogo, calculateFee, PROVIDER_METHOD_MAP, ALL_PROVIDER_CODES } from './config'
