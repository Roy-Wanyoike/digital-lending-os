import { NextRequest } from 'next/server';import { getApiUser } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
import {
  DEFAULT_FIAT_RATES,
  DEFAULT_CRYPTO_PRICES_USD,
  DEFAULT_FIAT_TO_USD,
  DEFAULT_NETWORK_FEES,
  CRYPTO_NETWORKS,
  CONVERSION_FEE_PERCENT,
  WITHDRAWAL_PERCENT_FEE,
  WITHDRAWAL_FLAT_FEE,
  CRYPTO_WITHDRAWAL_FEE_PERCENT,
  CRYPTO_WITHDRAWAL_MIN_FEE,
} from '@/backend/config/financial-config';

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined
let _cacheAttempted = false
async function getCache() {
  if (_cacheAttempted) return _cacheManager
  _cacheAttempted = true
  try {
    const mod = await import('@/backend/lib/cache/cache-manager')
    _cacheManager = mod.default
  } catch {
    _cacheManager = undefined
  }
  return _cacheManager
}

async function getHandler(req: NextRequest) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('Authentication required')

  const cacheManager = await getCache()
  const fetchRates = () => ({
    fiatRates: DEFAULT_FIAT_RATES,
    cryptoPrices: DEFAULT_CRYPTO_PRICES_USD,
    fiatToUsd: DEFAULT_FIAT_TO_USD,
    networkFees: DEFAULT_NETWORK_FEES,
    cryptoNetworks: CRYPTO_NETWORKS,
    conversionFeePercent: CONVERSION_FEE_PERCENT,
    withdrawalFeePercent: WITHDRAWAL_PERCENT_FEE,
    withdrawalFlatFee: WITHDRAWAL_FLAT_FEE,
    cryptoWithdrawalFeePercent: CRYPTO_WITHDRAWAL_FEE_PERCENT,
    cryptoWithdrawalMinFee: CRYPTO_WITHDRAWAL_MIN_FEE,
  })

  const data = cacheManager
    ? await cacheManager.getOrSet('exchange-rates:all', fetchRates, { ttl: 300_000 })
    : fetchRates()

  return ok(data)
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets/rates');
