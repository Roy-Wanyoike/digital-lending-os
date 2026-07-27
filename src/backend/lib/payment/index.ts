// ─── Payment Provider Registry ──────────────────────────
// Central hub for all payment providers.
// Providers are lazy-initialized (instantiated) on first use; the class
// modules themselves are imported eagerly so Next.js can tree-shake and
// bundle them at build time.

import type { PaymentProvider, PaymentProviderCode } from './types'
import { getProviderConfig } from './config'
import { StripeProvider } from './providers/stripe'
import { PaystackProvider } from './providers/paystack'
import { IntaSendProvider } from './providers/intasend'
import { FlutterwaveProvider } from './providers/flutterwave'
import { PayaProvider } from './providers/paya'
import { eventBus } from '@/backend/services/event-bus'

// Lazy-instantiated provider singletons
let _stripe: StripeProvider | null = null
let _paystack: PaystackProvider | null = null
let _intasend: IntaSendProvider | null = null
let _flutterwave: FlutterwaveProvider | null = null
let _paya: PayaProvider | null = null

function getStripe() {
  if (!_stripe) _stripe = new StripeProvider()
  return _stripe
}

function getPaystack() {
  if (!_paystack) _paystack = new PaystackProvider()
  return _paystack
}

function getIntaSend() {
  if (!_intasend) _intasend = new IntaSendProvider()
  return _intasend
}

function getFlutterwave() {
  if (!_flutterwave) _flutterwave = new FlutterwaveProvider()
  return _flutterwave
}

function getPaya() {
  if (!_paya) _paya = new PayaProvider()
  return _paya
}

const providerMap: Record<PaymentProviderCode, () => PaymentProvider> = {
  stripe: getStripe,
  paystack: getPaystack,
  intasend: getIntaSend,
  flutterwave: getFlutterwave,
  paya: getPaya,
}

export const providerRegistry = {
  getProvider(code: PaymentProviderCode): PaymentProvider | null {
    const factory = providerMap[code]
    if (!factory) return null
    const provider = factory()
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

// ─── Realtime Event Emission Helpers ───────────────────────────
// Centralized so webhook routes can fire a single call after a successful
// (or failed) payment. The event bus forwards these to connected SSE clients.

export interface PaymentEventData {
  id: string
  txRef: string
  providerTxId?: string | null
  provider: string
  amount: number
  currency: string
  status: string
  intentId?: string
  settledAt?: string | null
}

/**
 * Emit a `payment.completed` event after a payment webhook confirms settlement.
 * Pass the tenantId when known so SSE clients filtered by tenant receive it.
 */
export function emitPaymentCompleted(payment: PaymentEventData, tenantId?: string): void {
  try {
    eventBus.emit(
      'payment.completed',
      {
        ...payment,
        event: 'payment.completed',
      },
      tenantId,
    )
  } catch (err) {
    // Never let event emission break the webhook response
    console.error('[payment] emitPaymentCompleted failed:', err)
  }
}

/**
 * Emit a `payment.failed` event after a payment webhook reports a failure.
 */
export function emitPaymentFailed(payment: PaymentEventData, tenantId?: string): void {
  try {
    eventBus.emit(
      'payment.failed',
      {
        ...payment,
        event: 'payment.failed',
      },
      tenantId,
    )
  } catch (err) {
    console.error('[payment] emitPaymentFailed failed:', err)
  }
}
