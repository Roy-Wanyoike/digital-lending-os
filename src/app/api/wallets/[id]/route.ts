import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updateWalletSchema = z.object({
  status: z.enum(['active', 'frozen', 'closed']),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const wallet = await db.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const transactions = await db.walletTransaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ data: { ...wallet, transactions } })
  } catch (error) {
    console.error('Error fetching wallet:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateWalletSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.wallet.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = await db.wallet.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ data: wallet })
  } catch (error) {
    console.error('Error updating wallet:', error)
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
  }
}