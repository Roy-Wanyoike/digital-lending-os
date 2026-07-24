import { NextResponse } from 'next/server'

// Demo exchange rates — used by convert endpoint and the UI preview
const RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, NGN: 1550, KES: 153.5, GHS: 15.2, UGX: 3750, TZS: 2650, ZAR: 18.2, JPY: 149.5, CNY: 7.24, INR: 83.5, BRL: 5.0, CAD: 1.37, AUD: 1.53, CHF: 0.88, AED: 3.67, SGD: 1.34 },
  EUR: { USD: 1.087, GBP: 0.858, NGN: 1685, KES: 167, GHS: 16.5, UGX: 4075, TZS: 2880, ZAR: 19.8, JPY: 162.5, CNY: 7.87, INR: 90.8, BRL: 5.43, CAD: 1.49, AUD: 1.66, CHF: 0.956, AED: 3.99, SGD: 1.46 },
  GBP: { USD: 1.267, EUR: 1.165, NGN: 1963, KES: 194.5, GHS: 19.25, UGX: 4750, TZS: 3355, ZAR: 23.05, JPY: 189.3, CNY: 9.17, INR: 105.7, BRL: 6.33, CAD: 1.735, AUD: 1.936, CHF: 1.114, AED: 4.65, SGD: 1.70 },
  KES: { USD: 0.00652, EUR: 0.00599, GBP: 0.00514, NGN: 10.09, UGX: 24.43, TZS: 17.26, ZAR: 0.1185, JPY: 0.974, CNY: 0.0472, INR: 0.544, BRL: 0.0326, CAD: 0.00893, AUD: 0.00996, CHF: 0.00574, AED: 0.0239, SGD: 0.00874 },
  NGN: { USD: 0.000645, EUR: 0.000593, GBP: 0.000509, KES: 0.0991, UGX: 2.42, TZS: 1.71, ZAR: 0.01174, JPY: 0.0965, CNY: 0.00467, INR: 0.0539, BRL: 0.00323, CAD: 0.000884, AUD: 0.000987, CHF: 0.000568, AED: 0.00237, SGD: 0.000866 },
}

const CRYPTO_PRICES_USD: Record<string, number> = {
  USDT: 1.0, USDC: 1.0, BTC: 67500, ETH: 3450, SOL: 172, BNB: 580,
}

const FIAT_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.087, GBP: 1.267, NGN: 0.000645, KES: 0.00652,
  GHS: 0.0658, UGX: 0.000267, TZS: 0.000377, ZAR: 0.0549,
  JPY: 0.00669, CNY: 0.138, INR: 0.01198, BRL: 0.20,
  CAD: 0.73, AUD: 0.653, CHF: 1.136, AED: 0.272, SGD: 0.746,
}

const NETWORK_FEES: Record<string, number> = {
  trc20: 1.0, erc20: 2.5, bsc: 0.1, solana: 0.00025, bitcoin: 0.0001, bep2: 0.0005,
}

const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ['trc20', 'erc20', 'bsc', 'solana'],
  USDC: ['trc20', 'erc20', 'bsc', 'solana'],
  BTC: ['bitcoin'],
  ETH: ['erc20'],
  SOL: ['solana'],
  BNB: ['bsc', 'bep2'],
}

export async function GET() {
  return NextResponse.json({
    data: {
      fiatRates: RATES,
      cryptoPrices: CRYPTO_PRICES_USD,
      fiatToUsd: FIAT_TO_USD,
      networkFees: NETWORK_FEES,
      cryptoNetworks: CRYPTO_NETWORKS,
      conversionFeePercent: 0.5,
      withdrawalFeePercent: 0.5,
      withdrawalFlatFee: 2.5,
      cryptoWithdrawalFeePercent: 1.0,
      cryptoWithdrawalMinFee: 1.0,
    },
  })
}