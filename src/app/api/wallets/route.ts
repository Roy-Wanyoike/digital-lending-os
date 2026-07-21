import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createWalletSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  currency: z.string().min(1, 'Currency is required'),
  isDefault: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const wallets = await db.wallet.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    })

    // Attach transaction count
    const walletsWithCount = await Promise.all(
      wallets.map(async (wallet) => {
        const transactionCount = await db.walletTransaction.count({
          where: { walletId: wallet.id },
        })
        return { ...wallet, _transactionCount: transactionCount }
      })
    )

    return NextResponse.json({ data: walletsWithCount })
  } catch (error) {
    console.error('Error listing wallets:', error)
    return NextResponse.json({ error: 'Failed to list wallets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createWalletSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check no existing wallet for same business+currency
    const existing = await db.wallet.findFirst({
      where: { businessId: data.businessId, currency: data.currency.toUpperCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: `A wallet for ${data.currency.toUpperCase()} already exists for this business` },
        { status: 409 }
      )
    }

    const currency = data.currency.toUpperCase()

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.wallet.updateMany({
        where: { businessId: data.businessId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const wallet = await db.wallet.create({
      data: {
        businessId: data.businessId,
        currency,
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        frozenBalance: 0,
        isDefault: data.isDefault,
        status: 'active',
      },
    })

    return NextResponse.json({ data: wallet }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'A wallet for this currency already exists for this business' },
        { status: 409 }
      )
    }
    console.error('Error creating wallet:', error)
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
  }
}