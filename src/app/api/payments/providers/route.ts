import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveProviderConfigs,
  getProvidersForCurrency,
  getProvidersForCountry,
  getProviderName,
  getProviderLogo,
  calculateFee,
  PROVIDER_METHOD_MAP,
  type PaymentProviderCode,
} from '@/lib/payment'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

// ─── GET: List available payment providers ──────────────────
export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const currency = searchParams.get('currency') || ''
  const country = searchParams.get('country') || ''

  let providers = getActiveProviderConfigs()

  // Filter by currency if provided
  if (currency) {
    const currencyProviders = getProvidersForCurrency(currency)
    providers = providers.filter(p => currencyProviders.includes(p.code))
  }

  // Filter by country if provided
  if (country) {
    const countryProviders = getProvidersForCountry(country)
    providers = providers.filter(p => countryProviders.includes(p.code))
  }

  const data = providers.map(p => ({
    code: p.code,
    name: getProviderName(p.code),
    logo: getProviderLogo(p.code),
    supportedCurrencies: p.supportedCurrencies,
    supportedCountries: p.supportedCountries,
    supportedMethods: PROVIDER_METHOD_MAP[p.code] || [],
    feePercent: p.feePercent,
    fixedFee: p.fixedFee,
    isActive: p.isActive,
  }))

  return NextResponse.json({
    data,
    meta: {
      total: data.length,
      currency: currency || undefined,
      country: country || undefined,
    },
  })
}
