import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

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
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
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
    if (wallet.availableBalance < data.amount) {
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 })
    }

    const withdrawalRef = `WDR-${randomUUID().slice(0, 8).toUpperCase()}`
    // Flat fee per withdrawal: $2.50 or 0.5% whichever is higher
    const flatFee = 2.5
    const percentFee = data.amount * 0.005
    const feeAmount = Math.max(flatFee, percentFee)
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

    return NextResponse.json({ data: withdrawal }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating withdrawal:', error)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}

// GET /api/wallets/withdrawal?walletId=xxx — List withdrawals for a wallet
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const status = searchParams.get('status') || ''
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
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
