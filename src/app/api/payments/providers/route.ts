import { NextRequest } from 'next/server'
import {
  getActiveProviderConfigs,
  getProvidersForCurrency,
  getProvidersForCountry,
  getProviderName,
  getProviderLogo,
  PROVIDER_METHOD_MAP,
} from '@/lib/payment'
import { getApiUser } from '@/lib/auth/api-helpers'
import { ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response'
import { getLogger } from '@/backend/lib/telemetry/logger'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const log = getLogger().withContext({ route: '/api/payments/providers' })

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined;
let _cacheAttempted = false;
async function getCache() {
  if (_cacheAttempted) return _cacheManager;
  _cacheAttempted = true;
  try {
    const mod = await import('@/backend/lib/cache/cache-manager');
    _cacheManager = mod.default;
  } catch {
    _cacheManager = undefined;
  }
  return _cacheManager;
}

// --- GET: List available payment providers ---
const getHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await getApiUser(request)
  if (!user) {
    return unauthorized()
  }

  const { searchParams } = new URL(request.url)
  const currency = searchParams.get('currency') || ''
  const country = searchParams.get('country') || ''

  const cacheManager = await getCache()

  const fetchProviders = () => {
    let providers = getActiveProviderConfigs()

    if (currency) {
      const currencyProviders = getProvidersForCurrency(currency)
      providers = providers.filter(p => currencyProviders.includes(p.code))
    }

    if (country) {
      const countryProviders = getProvidersForCountry(country)
      providers = providers.filter(p => countryProviders.includes(p.code))
    }

    return providers.map(p => ({
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
  }

  const cacheKey = 'payment-providers:all'
  const data = cacheManager
    ? await cacheManager.getOrSet(cacheKey, fetchProviders, { ttl: 600_000 })
    : fetchProviders()

  return ok(data, {
    total: data.length,
    currency: currency || undefined,
    country: country || undefined,
  })
})

export const GET = withApiTelemetry(getHandler, '/api/payments/providers');
