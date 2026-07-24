import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const createWalletSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  currency: z.string().min(1, 'Currency is required'),
  isDefault: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Fetch business IDs belonging to the tenant
    const tenantBusinessIds = (await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    })).map(b => b.id)

    const where: Record<string, unknown> = {
      businessId: { in: tenantBusinessIds },
    }
    if (businessId) {
      if (!tenantBusinessIds.includes(businessId)) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }
      where.businessId = businessId
    }

    const wallets = await db.wallet.findMany({
      where,
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
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error listing wallets:', error)
    return NextResponse.json({ error: 'Failed to list wallets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = createWalletSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify business belongs to tenant
    const biz = await db.business.findFirst({
      where: { id: data.businessId, tenantId: user.tenantId },
    })
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

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
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
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