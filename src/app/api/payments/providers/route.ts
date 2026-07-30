import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveProviderConfigs,
  getProvidersForCurrency,
  getProvidersForCountry,
  getProviderName,
  getProviderLogo,
  PROVIDER_METHOD_MAP,
} from '@/lib/payment'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { getLogger } from '@/backend/lib/telemetry/logger'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const log = getLogger().withContext({ route: '/api/payments/providers' })

// --- GET: List available payment providers ---
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 },
      )
    }
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || ''
    const country = searchParams.get('country') || ''

    let providers = getActiveProviderConfigs()

    if (currency) {
      const currencyProviders = getProvidersForCurrency(currency)
      providers = providers.filter(p => currencyProviders.includes(p.code))
    }

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
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { message: error.message, code: 'UNAUTHORIZED' } },
        { status: error.statusCode },
      )
    }
    log.error('Failed to list payment providers', { error: String(error) })
    return NextResponse.json(
      { error: { message: 'Failed to list payment providers', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}

export const GET = withApiTelemetry(getHandler, '/api/payments/providers');
