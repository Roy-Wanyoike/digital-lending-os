import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const depositSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['bank_transfer', 'card', 'mobile_money', 'payment_link', 'external']),
  provider: z.string().optional(),
  providerTxId: z.string().optional(),
  bankName: z.string().optional(),
  bankRef: z.string().optional(),
  cardLast4: z.string().max(4).optional(),
  notes: z.string().optional(),
})

// POST /api/wallets/deposit — Initiate a deposit
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = depositSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify wallet belongs to tenant
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

    const depositRef = `DEP-${randomUUID().slice(0, 8).toUpperCase()}`

    // In production, this would call the payment provider.
    // For demo, if provider is 'demo' we auto-complete the deposit.
    const isAutoComplete = data.provider === 'demo'

    const deposit = await db.$transaction(async (tx) => {
      const dep = await tx.deposit.create({
        data: {
          depositRef,
          walletId: data.walletId,
          amount: data.amount,
          currency: wallet.currency,
          paymentMethod: data.paymentMethod,
          provider: data.provider || null,
          providerTxId: data.providerTxId || null,
          bankName: data.bankName || null,
          bankRef: data.bankRef || null,
          cardLast4: data.cardLast4 || null,
          notes: data.notes || null,
          status: isAutoComplete ? 'completed' : 'pending',
          completedAt: isAutoComplete ? new Date() : null,
        },
      })

      if (isAutoComplete) {
        const balanceBefore = wallet.balance
        const balanceAfter = Math.round((balanceBefore + data.amount) * 100) / 100

        await tx.walletTransaction.create({
          data: {
            walletId: data.walletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'deposit',
            amount: data.amount,
            balanceBefore,
            balanceAfter,
            currency: wallet.currency,
            description: `Deposit via ${data.paymentMethod}${data.provider ? ` (${data.provider})` : ''}${data.notes ? ` — ${data.notes}` : ''}`,
            referenceType: 'deposit',
            referenceId: dep.id,
            status: 'completed',
          },
        })

        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            balance: balanceAfter,
            availableBalance: Math.round((wallet.availableBalance + data.amount) * 100) / 100,
          },
        })
      }

      return dep
    })

    return NextResponse.json({ data: deposit }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating deposit:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}

// GET /api/wallets/deposit?walletId=xxx — List deposits for a wallet
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

    // Verify tenant access
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

    const deposits = await db.deposit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: deposits })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing deposits:', error)
    return NextResponse.json({ error: 'Failed to list deposits' }, { status: 500 })
  }
}
