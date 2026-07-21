import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit', 'transfer_in', 'transfer_out', 'conversion', 'fee', 'refund']),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const wallet = await db.wallet.findUnique({ where: { id } })
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { walletId: id }
    if (type) where.type = type
    if (status) where.status = status

    const transactions = await db.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: transactions })
  } catch (error) {
    console.error('Error listing wallet transactions:', error)
    return NextResponse.json({ error: 'Failed to list wallet transactions' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    const transaction = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id } })
      if (!wallet) {
        throw new Error('Wallet not found')
      }
      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active')
      }

      const isCredit = data.type === 'credit' || data.type === 'transfer_in' || data.type === 'refund'
      const balanceBefore = wallet.balance
      const balanceAfter = isCredit
        ? Math.round((balanceBefore + data.amount) * 100) / 100
        : Math.round((balanceBefore - data.amount) * 100) / 100

      // Check sufficient balance for debits
      if (!isCredit && balanceAfter < 0) {
        throw new Error('Insufficient wallet balance')
      }

      const newTx = await tx.walletTransaction.create({
        data: {
          walletId: id,
          txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
          type: data.type,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
          currency: wallet.currency,
          description: data.description,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          status: 'completed',
        },
      })

      await tx.wallet.update({
        where: { id },
        data: { balance: balanceAfter },
      })

      return newTx
    })

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create wallet transaction'
    if (message === 'Wallet not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message === 'Wallet is not active' || message === 'Insufficient wallet balance') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Error creating wallet transaction:', error)
    return NextResponse.json({ error: 'Failed to create wallet transaction' }, { status: 500 })
  }
}