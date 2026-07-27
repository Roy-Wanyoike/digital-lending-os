// ─── Payment Provider Configuration ──────────────────────────
// Reads from environment variables. Set these in .env
// Keys are never exposed to the client.

import type { PaymentProviderCode, ProviderConfig } from './types'

function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

function getEnvBool(key: string, fallback = false): boolean {
  const val = process.env[key]
  if (!val) return fallback
  return ['true', '1', 'yes'].includes(val.toLowerCase())
}

export function getProviderConfigs(): Record<PaymentProviderCode, ProviderConfig> {
  return {
    stripe: {
      code: 'stripe',
      name: 'Stripe',
      publicKey: getEnv('STRIPE_PUBLIC_KEY', ''),
      secretKey: getEnv('STRIPE_SECRET_KEY', ''),
      webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', ''),
      isActive: !!getEnv('STRIPE_SECRET_KEY'),
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'BRL', 'SGD', 'AUD', 'CAD', 'JPY', 'INR', 'AED'],
      supportedCountries: ['US', 'GB', 'DE', 'FR', 'BR', 'SG', 'AU', 'CA', 'JP', 'IN', 'AE', 'NG', 'KE', 'ZA', 'GH', 'UG', 'TZ'],
      supportedMethods: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'digital_wallet'],
      feePercent: 2.9,
      fixedFee: 0.30,
      testMode: getEnvBool('STRIPE_TEST_MODE', true),
    },
    paystack: {
      code: 'paystack',
      name: 'Paystack',
      publicKey: getEnv('PAYSTACK_PUBLIC_KEY', ''),
      secretKey: getEnv('PAYSTACK_SECRET_KEY', ''),
      webhookSecret: getEnv('PAYSTACK_SECRET_KEY', ''), // Paystack uses secret key for verification
      isActive: !!getEnv('PAYSTACK_SECRET_KEY'),
      supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'KES', 'UGX', 'TZS', 'USD'],
      supportedCountries: ['NG', 'GH', 'ZA', 'KE', 'UG', 'TZ', 'US'],
      supportedMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
      feePercent: 1.5,
      fixedFee: 0,
      testMode: getEnvBool('PAYSTACK_TEST_MODE', true),
    },
    intasend: {
      code: 'intasend',
      name: 'IntaSend',
      publicKey: getEnv('INTASEND_PUBLIC_KEY', ''),
      secretKey: getEnv('INTASEND_SECRET_KEY', ''),
      webhookSecret: getEnv('INTASEND_WEBHOOK_SECRET', ''),
      isActive: !!getEnv('INTASEND_PUBLIC_KEY'),
      supportedCurrencies: ['KES', 'USD', 'TZS', 'UGX'],
      supportedCountries: ['KE', 'TZ', 'UG'],
      supportedMethods: ['card', 'mobile_money', 'bank_transfer', 'digital_wallet', 'mpesa'],
      feePercent: 1.5,
      fixedFee: 0,
      testMode: getEnvBool('INTASEND_TEST_MODE', true),
    },
    flutterwave: {
      code: 'flutterwave',
      name: 'Flutterwave',
      publicKey: getEnv('FLW_PUBLIC_KEY', ''),
      secretKey: getEnv('FLW_SECRET_KEY', ''),
      webhookSecret: getEnv('FLW_WEBHOOK_SECRET', ''),
      isActive: !!getEnv('FLW_SECRET_KEY'),
      supportedCurrencies: ['NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'USD', 'EUR', 'GBP', 'BRL', 'XOF', 'XAF', 'RWF', 'BIF', 'EGP', 'MWK'],
      supportedCountries: ['NG', 'GH', 'KE', 'UG', 'TZ', 'ZA', 'US', 'GB', 'DE', 'FR', 'BR', 'RW', 'BI', 'EG', 'MW'],
      supportedMethods: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'mpesa', 'digital_wallet'],
      feePercent: 1.4,
      fixedFee: 0,
      testMode: getEnvBool('FLW_TEST_MODE', true),
    },
    paya: {
      code: 'paya',
      name: 'Paya',
      publicKey: '',
      secretKey: getEnv('PAYA_API_KEY', ''),
      webhookSecret: getEnv('PAYA_WEBHOOK_SECRET', ''),
      isActive: !!(getEnv('PAYA_API_KEY') || (getEnv('PAYA_EMAIL') && getEnv('PAYA_PASSWORD'))),
      supportedCurrencies: ['NGN', 'KES'],
      supportedCountries: ['NG', 'KE'],
      supportedMethods: ['bank_transfer', 'mobile_money', 'digital_wallet'],
      feePercent: 1.5,
      fixedFee: 0,
      testMode: getEnvBool('PAYA_TEST_MODE', true),
    },
  }
}

export function getActiveProviderConfigs(): ProviderConfig[] {
  const all = getProviderConfigs()
  return Object.values(all).filter(c => c.isActive)
}

export function getProviderConfig(code: PaymentProviderCode): ProviderConfig | null {
  const all = getProviderConfigs()
  return all[code]?.isActive ? all[code] : null
}

export function getProvidersForCurrency(currency: string): PaymentProviderCode[] {
  return getActiveProviderConfigs()
    .filter(c => c.supportedCurrencies.includes(currency.toUpperCase()))
    .map(c => c.code)
}

export function getProvidersForCountry(country: string): PaymentProviderCode[] {
  return getActiveProviderConfigs()
    .filter(c => c.supportedCountries.includes(country.toUpperCase()))
    .map(c => c.code)
}

export function getProviderName(code: PaymentProviderCode): string {
  return getProviderConfigs()[code]?.name || code
}

export function getProviderLogo(code: PaymentProviderCode): string {
  const logos: Record<PaymentProviderCode, string> = {
    stripe: '/providers/stripe.svg',
    paystack: '/providers/paystack.svg',
    intasend: '/providers/intasend.svg',
    flutterwave: '/providers/flutterwave.svg',
    paya: '/providers/paya.svg',
  }
  return logos[code]
}

export function calculateFee(
  amount: number,
  provider: PaymentProviderCode,
  currency: string
): { provider: string; providerName: string; percentFee: number; fixedFee: number; totalFee: number; netAmount: number } {
  const config = getProviderConfigs()[provider]
  if (!config) {
    return { provider, providerName: provider, percentFee: 0, fixedFee: 0, totalFee: 0, netAmount: amount }
  }
  // Fixed fee is typically in USD; for non-USD currencies, try to estimate
  let fixedFee = config.fixedFee
  if (currency !== 'USD' && fixedFee > 0) {
    // rough conversion for common currencies
    const rates: Record<string, number> = { NGN: 1600, KES: 154, GHS: 15, ZAR: 18, UGX: 3700, TZS: 2600, EUR: 0.92, GBP: 0.79, BRL: 4.97 }
    const rate = rates[currency] || 1
    fixedFee = config.fixedFee * rate
  }
  const percentFee = Math.round(amount * (config.feePercent / 100) * 100) / 100
  const totalFee = Math.round((percentFee + fixedFee) * 100) / 100
  const netAmount = Math.round((amount - totalFee) * 100) / 100
  return {
    provider,
    providerName: config.name,
    percentFee,
    fixedFee,
    totalFee,
    netAmount: Math.max(0, netAmount),
  }
}

// Method map per provider
export const PROVIDER_METHOD_MAP: Record<PaymentProviderCode, string[]> = {
  stripe: ['card', 'apple_pay', 'google_pay', 'bank_transfer'],
  paystack: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
  intasend: ['card', 'mobile_money', 'bank_transfer', 'mpesa'],
  flutterwave: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'mpesa'],
  paya: ['bank_transfer', 'mobile_money', 'digital_wallet'],
}

export const ALL_PROVIDER_CODES: PaymentProviderCode[] = ['stripe', 'paystack', 'intasend', 'flutterwave', 'paya']
