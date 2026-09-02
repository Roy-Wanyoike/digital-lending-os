import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
import { DEFAULT_FIAT_RATES, CONVERSION_FEE_PERCENT } from '@/backend/config/financial-config';
const convertSchema = z.object({
  fromWalletId: z.string().min(1),
  toWalletId: z.string().min(1),
  fromAmount: z.number().positive('Amount must be greater than 0').max(10000000, 'Amount exceeds maximum limit of 10,000,000'),
})

function getRate(from: string, to: string): number {
  if (from === to) return 1
  const direct = DEFAULT_FIAT_RATES[from]?.[to]
  if (direct) return direct
  // Inverse
  const inverse = DEFAULT_FIAT_RATES[to]?.[from]
  if (inverse) return 1 / inverse
  // Cross via USD
  const fromUsd = DEFAULT_FIAT_RATES['USD']?.[from]
  const toUsd = DEFAULT_FIAT_RATES['USD']?.[to]
  if (fromUsd && toUsd) return toUsd / fromUsd
  throw new Error(`No exchange rate available for ${from} → ${to}`)
}

// POST /api/wallets/convert — Convert between wallets
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const parsed = convertSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    if (data.fromWalletId === data.toWalletId) {
      return badRequest('Source and destination wallets must be different')
    }

    // Pre-validate wallet existence, ownership, and active status (outside tx)
    // Single query per wallet via relation navigation to avoid N+1
    const [fromWallet, toWallet] = await Promise.all([
      db.wallet.findFirst({ where: { id: data.fromWalletId, business: { tenantId: user.tenantId } } }),
      db.wallet.findFirst({ where: { id: data.toWalletId, business: { tenantId: user.tenantId } } }),
    ])

    if (!fromWallet || !toWallet) {
      return notFound('One or both wallets not found')
    }
    if (!fromWallet.businessId || !toWallet.businessId) {
      return badRequest('Wallet has no business association')
    }

    if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
      return badRequest('Both wallets must be active')
    }

    const exchangeRate = getRate(fromWallet.currency, toWallet.currency)
    const feePercent = CONVERSION_FEE_PERCENT
    const grossToAmount = data.fromAmount * exchangeRate
    const feeAmount = Math.round(grossToAmount * (feePercent / 100) * 100) / 100
    const netAmount = Math.round((grossToAmount - feeAmount) * 100) / 100
    const conversionRef = `CNV-${randomUUID().slice(0, 8).toUpperCase()}`

    // Atomic transaction with fresh wallet reads to prevent race conditions
    const conversion = await db.$transaction(async (tx: any) => {
      // Re-read wallets inside transaction for fresh balances
      const freshFrom = await tx.wallet.findUnique({ where: { id: data.fromWalletId } })
      const freshTo = await tx.wallet.findUnique({ where: { id: data.toWalletId } })
      if (!freshFrom || !freshTo) throw new Error('Wallet not found')
      if (freshFrom.availableBalance < data.fromAmount) {
        throw new Error('Insufficient available balance in source wallet')
      }
      const conv = await tx.currencyConversion.create({
        data: {
          conversionRef,
          fromWalletId: data.fromWalletId,
          toWalletId: data.toWalletId,
          fromCurrency: fromWallet.currency,
          toCurrency: toWallet.currency,
          fromAmount: data.fromAmount,
          toAmount: grossToAmount,
          exchangeRate,
          feePercent,
          feeAmount,
          netAmount,
          status: 'completed',
        },
      })

      // Debit source wallet (using fresh balances)
      const fromBalBefore = freshFrom.balance
      const fromBalAfter = Math.round((fromBalBefore - data.fromAmount) * 100) / 100
      await tx.walletTransaction.create({
        data: {
          walletId: data.fromWalletId,
          txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
          type: 'conversion',
          amount: data.fromAmount,
          balanceBefore: fromBalBefore,
          balanceAfter: fromBalAfter,
          currency: fromWallet.currency,
          description: `Convert ${data.fromAmount} ${fromWallet.currency} → ${toWallet.currency} @ ${exchangeRate} (Ref: ${conversionRef})`,
          referenceType: 'conversion',
          referenceId: conv.id,
          status: 'completed',
        },
      })
      await tx.wallet.update({
        where: { id: data.fromWalletId },
        data: {
          balance: fromBalAfter,
          availableBalance: Math.round((freshFrom.availableBalance - data.fromAmount) * 100) / 100,
        },
      })

      // Credit destination wallet (using fresh balances)
      const toBalBefore = freshTo.balance
      const toBalAfter = Math.round((toBalBefore + netAmount) * 100) / 100
      await tx.walletTransaction.create({
        data: {
          walletId: data.toWalletId,
          txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
          type: 'conversion',
          amount: netAmount,
          balanceBefore: toBalBefore,
          balanceAfter: toBalAfter,
          currency: toWallet.currency,
          description: `Received from ${fromWallet.currency} conversion (Ref: ${conversionRef})`,
          referenceType: 'conversion',
          referenceId: conv.id,
          counterpartyId: data.fromWalletId,
          status: 'completed',
        },
      })
      await tx.wallet.update({
        where: { id: data.toWalletId },
        data: {
          balance: toBalAfter,
          availableBalance: Math.round((freshTo.availableBalance + netAmount) * 100) / 100,
        },
      })

      // Record the conversion fee for audit trail (fee already deducted from gross before credit)
      if (feeAmount > 0) {
        await tx.walletTransaction.create({
          data: {
            walletId: data.toWalletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'fee',
            amount: feeAmount,
            balanceBefore: Math.round((toBalBefore + netAmount) * 100) / 100,
            balanceAfter: Math.round((toBalBefore + netAmount) * 100) / 100,
            currency: toWallet.currency,
            description: `Conversion fee ${feePercent}% on ${grossToAmount.toFixed(2)} ${toWallet.currency} (Ref: ${conversionRef})`,
            referenceType: 'conversion',
            referenceId: conv.id,
            status: 'completed',
          },
        })
      }

      return conv
    })

    return created(conversion)
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Failed to convert'
    if (message.includes('rate') || message.includes('Insufficient') || message.includes('different') || message.includes('active')) {
      return badRequest(message)
    }console.error('Error converting currency:', err)
    return error('Failed to convert currency')
  }
}

// GET /api/wallets/convert?walletId=xxx — List conversions for a wallet
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    if (!walletId) {
      return badRequest('walletId is required')
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return notFound('Wallet not found')
    if (!wallet.businessId) return badRequest('Wallet has no business association')
    const biz = await db.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Wallet not found')
    }

    const where = {
      OR: [
        { fromWalletId: walletId },
        { toWalletId: walletId },
      ],
    }

    const [conversions, total] = await Promise.all([
      db.currencyConversion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.currencyConversion.count({ where }),
    ])

    return ok(conversions, { page, limit, offset, total, pages: Math.ceil(total / limit) })
  } catch (err: any) {console.error('Error listing conversions:', err)
    return error('Failed to list conversions')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets/convert');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/wallets/convert');
