import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'
import { processWithdrawal } from '@/backend/services/temporal-bridge'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
import { WITHDRAWAL_FLAT_FEE, WITHDRAWAL_PERCENT_FEE } from '@/backend/config/financial-config';
const withdrawalSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be greater than 0').max(10000000, 'Amount exceeds maximum limit of 10,000,000'),
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
    const user = await requireAuth(request)

    const body = await request.json()
    const parsed = withdrawalSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    const wallet = await db.wallet.findUnique({ where: { id: data.walletId } })
    if (!wallet) {
      return notFound('Wallet not found')
    }
    if (!wallet.businessId) {
      return badRequest('Wallet has no business association')
    }
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Wallet not found')
    }
    if (wallet.status !== 'active') {
      return badRequest('Wallet is not active')
    }

    // Calculate fee first to check total debit against available balance
    const flatFee = WITHDRAWAL_FLAT_FEE
    const percentFee = data.amount * (WITHDRAWAL_PERCENT_FEE / 100)
    const feeAmount = Math.max(flatFee, percentFee)
    const totalDebit = Math.round((data.amount + feeAmount) * 100) / 100

    // Early rejection check (optimization; real check happens inside transaction)
    if (wallet.availableBalance < totalDebit) {
      return badRequest(`Insufficient available balance. Required: ${data.amount} + ${feeAmount.toFixed(2)} fee = ${totalDebit.toFixed(2)}, Available: ${wallet.availableBalance.toFixed(2)}`)
    }

    const withdrawalRef = `WDR-${randomUUID().slice(0, 8).toUpperCase()}`
    const netAmount = Math.round((data.amount - feeAmount) * 100) / 100

    // Demo auto-complete
    const isDemoMode = process.env.WALLET_DEMO_MODE === 'true';
    const isAutoComplete = data.provider === 'demo' && isDemoMode

    const withdrawal = await db.$transaction(async (tx: any) => {
      // Read wallet inside transaction to get latest balance (prevents race conditions)
      const freshWallet = await tx.wallet.findUnique({ where: { id: data.walletId } })
      if (!freshWallet) throw new Error('Wallet not found')

      // Real balance check inside transaction
      if (freshWallet.availableBalance < totalDebit) {
        throw new Error(`Insufficient available balance. Required: ${data.amount} + ${feeAmount.toFixed(2)} fee = ${totalDebit.toFixed(2)}, Available: ${freshWallet.availableBalance.toFixed(2)}`)
      }

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
        const balanceBefore = freshWallet.balance
        const balanceAfter = Math.round((balanceBefore - data.amount) * 100) / 100
        const availBefore = freshWallet.availableBalance
        const availAfter = Math.round((availBefore - data.amount) * 100) / 100

        await tx.walletTransaction.create({
          data: {
            walletId: data.walletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'withdrawal',
            amount: data.amount,
            balanceBefore,
            balanceAfter,
            currency: freshWallet.currency,
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
              currency: freshWallet.currency,
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
        // For non-demo, freeze the total debit (amount + fee) in pendingBalance
        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            availableBalance: Math.round((freshWallet.availableBalance - totalDebit) * 100) / 100,
            pendingBalance: Math.round((freshWallet.pendingBalance + totalDebit) * 100) / 100,
          },
        })
      }

      return wdr
    })

    // Wire to Temporal workflow (falls back to direct execution if Temporal is unavailable)
    void processWithdrawal({ walletId: data.walletId, withdrawalId: withdrawal.id, withdrawalRef, amount: data.amount, currency: wallet.currency, tenantId: user.tenantId });

    // ── Publish Kafka event ────────────────────────────────
    // A background worker (Temporal workflow or Kafka consumer) should listen
    // for 'wallet.withdrawal.created' events on the 'wallet.events.wallet_withdrawn' topic
    // to execute the payout with the payment provider, update status, and
    // emit a 'wallet.withdrawal.completed' event for downstream consumers.
    try {
      const { publishEvent } = await import('@/backend/lib/event-publisher')
      await publishEvent({
        topic: 'wallet.events.wallet_withdrawn',
        key: withdrawal.id,
        event: { eventType: 'wallet.withdrawal.created', withdrawalId: withdrawal.id, withdrawalRef, walletId: data.walletId, amount: withdrawal.amount, currency: withdrawal.currency, paymentMethod: withdrawal.paymentMethod, provider: withdrawal.provider, feeAmount: withdrawal.feeAmount, netAmount: withdrawal.netAmount, status: withdrawal.status, tenantId: user.tenantId, timestamp: new Date().toISOString() },
      })
    } catch (e) { console.error('Event publish failed:', e) }

    // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'withdrawal.create', resource: 'withdrawal', resourceId: withdrawal.id, userId: user.id, tenantId: user.tenantId, details: { amount: withdrawal.amount, currency: withdrawal.currency, paymentMethod: withdrawal.paymentMethod, feeAmount: withdrawal.feeAmount, status: withdrawal.status } })
    } catch (e) { console.error('Audit log failed:', e) }

    return created(withdrawal)
  } catch (err: any) {const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Insufficient') || msg.includes('Wallet not found')) {
      return badRequest(msg)
    }
    console.error('Error creating withdrawal:', err)
    return error('Failed to create withdrawal')
  }
}

// GET /api/wallets/withdrawal?walletId=xxx — List withdrawals for a wallet
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    if (!walletId) {
      return badRequest('walletId is required')
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return notFound('Wallet not found')
    if (!wallet.businessId) return badRequest('Wallet has no business association')
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Wallet not found')
    }

    const where: Record<string, unknown> = { walletId }
    if (status) where.status = status

    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.withdrawal.count({ where }),
    ])

    return ok(withdrawals, { page, limit, offset, total, pages: Math.ceil(total / limit) })
  } catch (err: any) {console.error('Error listing withdrawals:', err)
    return error('Failed to list withdrawals')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets/withdrawal');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/wallets/withdrawal');
