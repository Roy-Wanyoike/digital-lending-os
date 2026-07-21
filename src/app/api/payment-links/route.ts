import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

function generateLinkRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'PLINK-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const DEFAULT_METHODS = ['bank_transfer', 'card', 'mobile_money', 'digital_wallet', 'upi', 'pix', 'mpesa']

const createPaymentLinkSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
  currency: z.string().default('USD'),
  allowedMethods: z.array(z.string()).optional(),
  allowedCountries: z.array(z.string()).optional(),
  maxPayments: z.number().int().min(0).default(1),
  expiresAt: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const businessId = searchParams.get('businessId') || ''
    const status = searchParams.get('status') || ''
    const currency = searchParams.get('currency') || ''

    const where: Record<string, unknown> = {}

    if (businessId) {
      where.businessId = businessId
    }
    if (status) {
      where.status = status
    }
    if (currency) {
      where.currency = currency
    }

    const [paymentLinks, total] = await Promise.all([
      db.paymentLink.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.paymentLink.count({ where }),
    ])

    // Attach payment count
    const linksWithCount = await Promise.all(
      paymentLinks.map(async (link) => {
        const paymentCount = await db.paymentLinkPayment.count({
          where: { paymentLinkId: link.id },
        })
        return { ...link, _paymentCount: paymentCount }
      })
    )

    return NextResponse.json({
      data: linksWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing payment links:', error)
    return NextResponse.json({ error: 'Failed to list payment links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createPaymentLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
    const allowedMethods = data.allowedMethods ?? DEFAULT_METHODS

    // Ensure unique linkRef
    let linkRef = generateLinkRef()
    let exists = await db.paymentLink.findUnique({ where: { linkRef } })
    while (exists) {
      linkRef = generateLinkRef()
      exists = await db.paymentLink.findUnique({ where: { linkRef } })
    }

    const paymentLink = await db.paymentLink.create({
      data: {
        linkRef,
        businessId: data.businessId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        allowedMethods: JSON.stringify(allowedMethods),
        allowedCountries: data.allowedCountries ? JSON.stringify(data.allowedCountries) : null,
        maxPayments: data.maxPayments,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        status: 'active',
      },
    })

    return NextResponse.json({ data: paymentLink }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Payment link reference collision, please retry' }, { status: 409 })
    }
    console.error('Error creating payment link:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}