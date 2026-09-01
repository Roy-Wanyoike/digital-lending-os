import { NextRequest } from 'next/server'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { ok, withErrorHandler } from '@/backend/lib/api-response'

async function getHandler(_req: NextRequest) {
  return ok(
    {
      name: 'Youngsend API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth/*',
        dashboard: '/api/dashboard/stats',
        businesses: '/api/businesses',
        escrow: '/api/escrow/transactions',
        payments: '/api/payments/intents',
        wallets: '/api/wallets',
        referral: '/api/referral',
        twin: '/api/twin/profiles',
      },
    },
    undefined,
    { noCache: true },
  )
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api')
