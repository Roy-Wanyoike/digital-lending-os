import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { processWithdrawal } from '@/backend/services/temporal-bridge'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const withdrawalSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['bank_transfer', 'mobile_money', 'external']),
  provider: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankCode: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/wallets/withdrawal — Initiate a fiat withdrawal
async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const parsed = withdrawalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    const wallet = await db.wallet.findUnique({ where: { id: data.walletId } })
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (!wallet.businessId) {
      return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    }
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (wallet.status !== 'active') {
      return NextResponse.json({ error: 'Wallet is not active' }, { status: 400 })
    }

    // Calculate fee first to check total debit against available balance
    const flatFee = 2.5
    const percentFee = data.amount * 0.005
    const feeAmount = Math.max(flatFee, percentFee)
    const totalDebit = Math.round((data.amount + feeAmount) * 100) / 100

    if (wallet.availableBalance < totalDebit) {
      return NextResponse.json({ error: `Insufficient available balance. Required: ${data.amount} + ${feeAmount.toFixed(2)} fee = ${totalDebit.toFixed(2)}, Available: ${wallet.availableBalance.toFixed(2)}` }, { status: 400 })
    }

    const withdrawalRef = `WDR-${randomUUID().slice(0, 8).toUpperCase()}`
    const netAmount = Math.round((data.amount - feeAmount) * 100) / 100

    // Demo auto-complete
    const isAutoComplete = data.provider === 'demo'

    const withdrawal = await db.$transaction(async (tx) => {
      const wdr = await tx.withdrawal.create({
        data: {
          withdrawalRef,
          walletId: data.walletId,
          amount: data.amount,
          currency: wallet.currency,
          paymentMethod: data.paymentMethod,
          provider: data.provider || null,
          bankName: data.bankName || null,
          bankAccount: data.bankAccount || null,
          bankCode: data.bankCode || null,
          recipientName: data.recipientName || null,
          feeAmount,
          netAmount,
          notes: data.notes || null,
          status: isAutoComplete ? 'completed' : 'pending',
          completedAt: isAutoComplete ? new Date() : null,
        },
      })

      if (isAutoComplete) {
        const balanceBefore = wallet.balance
        const balanceAfter = Math.round((balanceBefore - data.amount) * 100) / 100
        const availBefore = wallet.availableBalance
        const availAfter = Math.round((availBefore - data.amount) * 100) / 100

        await tx.walletTransaction.create({
          data: {
            walletId: data.walletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'withdrawal',
            amount: data.amount,
            balanceBefore,
            balanceAfter,
            currency: wallet.currency,
            description: `Withdrawal to ${data.bankName || data.paymentMethod}${data.recipientName ? ` (${data.recipientName})` : ''} — Fee: ${feeAmount.toFixed(2)}`,
            referenceType: 'withdrawal',
            referenceId: wdr.id,
            status: 'completed',
          },
        })

        // Also record the fee
        if (feeAmount > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: data.walletId,
              txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
              type: 'fee',
              amount: feeAmount,
              balanceBefore: balanceAfter,
              balanceAfter: Math.round((balanceAfter - feeAmount) * 100) / 100,
              currency: wallet.currency,
              description: `Withdrawal fee for ${withdrawalRef}`,
              referenceType: 'withdrawal',
              referenceId: wdr.id,
              status: 'completed',
            },
          })
        }

        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            balance: Math.round((balanceAfter - feeAmount) * 100) / 100,
            availableBalance: Math.round((availAfter - feeAmount) * 100) / 100,
          },
        })
      } else {
        // For non-demo, freeze the funds in pendingBalance
        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            availableBalance: Math.round((wallet.availableBalance - data.amount) * 100) / 100,
            pendingBalance: Math.round((wallet.pendingBalance + data.amount) * 100) / 100,
          },
        })
      }

      return wdr
    })

    // Wire to Temporal workflow (falls back to direct execution if Temporal is unavailable)
    void processWithdrawal({ walletId: data.walletId, withdrawalId: withdrawal.id, withdrawalRef, amount: data.amount, currency: wallet.currency, tenantId: user.tenantId });

    // ── Publish Kafka event ────────────────────────────────
    try {
      const { publishEvent } = await import('@/backend/lib/event-publisher')
      await publishEvent({
        topic: 'wallet.events.wallet_withdrawn',
        key: withdrawal.id,
        event: { eventType: 'wallet.withdrawal.created', withdrawalId: withdrawal.id, walletId: data.walletId, amount: withdrawal.amount, currency: withdrawal.currency, tenantId: user.tenantId, timestamp: new Date().toISOString() },
      })
    } catch (e) { console.error('Event publish failed:', e) }

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'withdrawal.create', resource: 'withdrawal', resourceId: withdrawal.id, userId: user.id, tenantId: user.tenantId, details: { amount: withdrawal.amount, currency: withdrawal.currency, paymentMethod: withdrawal.paymentMethod, feeAmount: withdrawal.feeAmount, status: withdrawal.status } })
    } catch (e) { console.error('Audit log failed:', e) }

    return NextResponse.json({ data: withdrawal }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating withdrawal:', error)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}

// GET /api/wallets/withdrawal?walletId=xxx — List withdrawals for a wallet
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const status = searchParams.get('status') || ''
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    if (!wallet.businessId) return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { walletId }
    if (status) where.status = status

    const withdrawals = await db.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: withdrawals })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing withdrawals:', error)
    return NextResponse.json({ error: 'Failed to list withdrawals' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/wallets/withdrawal');

export const POST = withApiTelemetry(postHandler, '/api/wallets/withdrawal');
