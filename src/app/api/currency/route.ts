import { NextRequest } from 'next/server'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { getApiUser } from '@/lib/auth/api-helpers'
import { ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response'

// ── Supported Currency Metadata ──────────────────────────────────────────
//
// Centralised list of currencies the platform supports.
// Frontends use this to populate currency selectors with code, name, and symbol.

interface CurrencyInfo {
  code: string
  name: string
  symbol: string
}

const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar',          symbol: '$'   },
  { code: 'EUR', name: 'Euro',                symbol: '€'   },
  { code: 'GBP', name: 'British Pound',       symbol: '£'   },
  { code: 'NGN', name: 'Nigerian Naira',      symbol: '₦'   },
  { code: 'KES', name: 'Kenyan Shilling',     symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi',       symbol: '₵'   },
  { code: 'UGX', name: 'Ugandan Shilling',    symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling',  symbol: 'TSh' },
  { code: 'ZAR', name: 'South African Rand',  symbol: 'R'   },
  { code: 'JPY', name: 'Japanese Yen',        symbol: '¥'   },
  { code: 'CNY', name: 'Chinese Yuan',        symbol: '¥'   },
  { code: 'INR', name: 'Indian Rupee',        symbol: '₹'   },
  { code: 'BRL', name: 'Brazilian Real',      symbol: 'R$'  },
  { code: 'CAD', name: 'Canadian Dollar',     symbol: 'C$'  },
  { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$'  },
  { code: 'CHF', name: 'Swiss Franc',         symbol: 'CHF' },
  { code: 'AED', name: 'UAE Dirham',          symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar',    symbol: 'S$'  },
]

// ── GET Handler ──────────────────────────────────────────────────────────

/**
 * GET /api/currency
 *
 * Returns the full list of supported currencies with metadata (code, name, symbol).
 * Replaces the old proxy-to-rates approach with a purpose-built endpoint that
 * frontends can use for currency selectors and display formatting.
 */
async function getHandler(req: NextRequest) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  return ok(SUPPORTED_CURRENCIES, { total: SUPPORTED_CURRENCIES.length }, { maxAge: 300, swr: 600 })
}

// ── Export ───────────────────────────────────────────────────────────────

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/currency')
