import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/backend/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { badRequest, error, notFound, validationError, withErrorHandler } from '@/backend/lib/api-response'
import { db } from '@/lib/db'

// ── Validation Schema ────────────────────────────────────────────────────

const convertAliasSchema = z.object({
  fromWalletId: z.string().min(1, 'fromWalletId is required'),
  toWalletId: z.string().min(1, 'toWalletId is required'),
  amount: z
    .number({ message: 'amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount exceeds maximum limit of 10,000,000'),
})

// ── POST Handler ─────────────────────────────────────────────────────────

/**
 * POST /api/convert
 *
 * Validated alias for /api/wallets/convert.
 * Adds auth, Zod validation, and wallet-ownership checks before forwarding
 * the request to the canonical conversion endpoint.
 *
 * Accepts { fromWalletId, toWalletId, amount } and maps `amount` → `fromAmount`
 * to match the canonical endpoint's schema.
 */
async function postHandler(req: NextRequest) {
  // 1. Auth
  const user = await requireAuth(req)

  // 2. Parse & validate body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return validationError('Request body must be valid JSON')
  }

  const parsed = convertAliasSchema.safeParse(body)
  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map((i) => i.message).join(', '),
      parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    )
  }

  const { fromWalletId, toWalletId, amount } = parsed.data

  // 3. Same-wallet guard
  if (fromWalletId === toWalletId) {
    return badRequest('Source and destination wallets must be different')
  }

  // 4. Validate wallets exist and belong to the user's tenant
  const [fromWallet, toWallet] = await Promise.all([
    db.wallet.findFirst({
      where: { id: fromWalletId, business: { tenantId: user.tenantId } },
      select: { id: true, status: true, currency: true },
    }),
    db.wallet.findFirst({
      where: { id: toWalletId, business: { tenantId: user.tenantId } },
      select: { id: true, status: true, currency: true },
    }),
  ])

  if (!fromWallet || !toWallet) {
    return notFound('One or both wallets not found')
  }

  if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
    return badRequest('Both wallets must be active')
  }

  // 5. Forward to canonical /api/wallets/convert with mapped field names
  const forwardUrl = new URL('/api/wallets/convert', req.url)
  try {
    const res = await fetch(forwardUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        fromWalletId,
        toWalletId,
        fromAmount: amount,
      }),
    })

    // Forward the canonical response as-is to preserve status code & envelope
    const data = await res.json()
    return new NextResponse(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[/api/convert] Forward to /api/wallets/convert failed:', err)
    return error('Conversion request failed')
  }
}

// ── Export ───────────────────────────────────────────────────────────────

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/convert')
