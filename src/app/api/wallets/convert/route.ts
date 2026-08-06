import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const convertSchema = z.object({
  fromWalletId: z.string().min(1),
  toWalletId: z.string().min(1),
  fromAmount: z.number().positive('Amount must be greater than 0').max(10000000, 'Amount exceeds maximum limit of 10,000,000'),
})

// Demo exchange rates (in production, use CurrencyRate table or external API)
const DEMO_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, NGN: 1550, KES: 153.5, GHS: 15.2, UGX: 3750, TZS: 2650, ZAR: 18.2, JPY: 149.5, CNY: 7.24, INR: 83.5, BRL: 5.0, CAD: 1.37, AUD: 1.53, CHF: 0.88, AED: 3.67, SGD: 1.34 },
  EUR: { USD: 1.087, GBP: 0.858, NGN: 1685, KES: 167, GHS: 16.5, UGX: 4075, TZS: 2880, ZAR: 19.8, JPY: 162.5, CNY: 7.87, INR: 90.8, BRL: 5.43, CAD: 1.49, AUD: 1.66, CHF: 0.956, AED: 3.99, SGD: 1.46 },
  GBP: { USD: 1.267, EUR: 1.165, NGN: 1963, KES: 194.5, GHS: 19.25, UGX: 4750, TZS: 3355, ZAR: 23.05, JPY: 189.3, CNY: 9.17, INR: 105.7, BRL: 6.33, CAD: 1.735, AUD: 1.936, CHF: 1.114, AED: 4.65, SGD: 1.70 },
  KES: { USD: 0.00652, EUR: 0.00599, GBP: 0.00514, NGN: 10.09, UGX: 24.43, TZS: 17.26, ZAR: 0.1185, JPY: 0.974, CNY: 0.0472, INR: 0.544, BRL: 0.0326, CAD: 0.00893, AUD: 0.00996, CHF: 0.00574, AED: 0.0239, SGD: 0.00874 },
  NGN: { USD: 0.000645, EUR: 0.000593, GBP: 0.000509, KES: 0.0991, UGX: 2.42, TZS: 1.71, ZAR: 0.01174, JPY: 0.0965, CNY: 0.00467, INR: 0.0539, BRL: 0.00323, CAD: 0.000884, AUD: 0.000987, CHF: 0.000568, AED: 0.00237, SGD: 0.000866 },
}

function getRate(from: string, to: string): number {
  if (from === to) return 1
  const direct = DEMO_RATES[from]?.[to]
  if (direct) return direct
  // Inverse
  const inverse = DEMO_RATES[to]?.[from]
  if (inverse) return 1 / inverse
  // Cross via USD
  const fromUsd = DEMO_RATES['USD']?.[from]
  const toUsd = DEMO_RATES['USD']?.[to]
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
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.fromWalletId === data.toWalletId) {
      return NextResponse.json({ error: 'Source and destination wallets must be different' }, { status: 400 })
    }

    // Pre-validate wallet existence, ownership, and active status (outside tx)
    // Single query per wallet via relation navigation to avoid N+1
    const [fromWallet, toWallet] = await Promise.all([
      db.wallet.findFirst({ where: { id: data.fromWalletId, business: { tenantId: user.tenantId } } }),
      db.wallet.findFirst({ where: { id: data.toWalletId, business: { tenantId: user.tenantId } } }),
    ])

    if (!fromWallet || !toWallet) {
      return NextResponse.json({ error: 'One or both wallets not found' }, { status: 404 })
    }
    if (!fromWallet.businessId || !toWallet.businessId) {
      return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    }

    if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
      return NextResponse.json({ error: 'Both wallets must be active' }, { status: 400 })
    }

    const exchangeRate = getRate(fromWallet.currency, toWallet.currency)
    const feePercent = 0.5
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

    return NextResponse.json({ data: conversion }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert'
    if (message.includes('rate') || message.includes('Insufficient') || message.includes('different') || message.includes('active')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error converting currency:', error)
    return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 })
  }
}

// GET /api/wallets/convert?walletId=xxx — List conversions for a wallet
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    if (!wallet.businessId) return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    const biz = await db.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
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

    return NextResponse.json({ data: conversions, pagination: { page, limit, offset, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing conversions:', error)
    return NextResponse.json({ error: 'Failed to list conversions' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/wallets/convert');

export const POST = withApiTelemetry(postHandler, '/api/wallets/convert');
