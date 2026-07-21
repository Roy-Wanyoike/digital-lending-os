import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const paySchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payerName: z.string().min(1, 'Payer name is required'),
  payerEmail: z.string().email('Invalid payer email'),
  payerCountry: z.string().min(1, 'Payer country is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = paySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Fetch the payment link
    const link = await db.paymentLink.findUnique({ where: { id } })
    if (!link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Check link is active
    if (link.status !== 'active') {
      return NextResponse.json({ error: 'Payment link is not active' }, { status: 400 })
    }

    // Check not expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ error: 'Payment link has expired' }, { status: 400 })
    }

    // Check amount >= link.amount (if fixed amount > 0)
    if (link.amount > 0 && data.amount < link.amount) {
      return NextResponse.json(
        { error: `Amount must be at least ${link.amount} ${link.currency}` },
        { status: 400 }
      )
    }

    // Check payment count < maxPayments
    if (link.maxPayments > 0 && link.paymentCount >= link.maxPayments) {
      return NextResponse.json({ error: 'Payment link has reached its maximum number of payments' }, { status: 400 })
    }

    // Check payment method is allowed
    if (link.allowedMethods) {
      const allowed: string[] = JSON.parse(link.allowedMethods)
      if (!allowed.includes(data.paymentMethod)) {
        return NextResponse.json({ error: 'Payment method is not allowed for this link' }, { status: 400 })
      }
    }

    // Calculate fee (1.5% standard)
    const feeAmount = Math.round(data.amount * 0.015 * 100) / 100
    const netAmount = Math.round((data.amount - feeAmount) * 100) / 100

    // Create the payment
    const payment = await db.$transaction(async (tx) => {
      const newPayment = await tx.paymentLinkPayment.create({
        data: {
          paymentLinkId: id,
          payerName: data.payerName,
          payerEmail: data.payerEmail,
          payerCountry: data.payerCountry,
          amount: data.amount,
          currency: link.currency,
          paymentMethod: data.paymentMethod,
          status: 'completed',
          feeAmount,
          netAmount,
          completedAt: new Date(),
        },
      })

      await tx.paymentLink.update({
        where: { id },
        data: {
          paymentCount: { increment: 1 },
          totalCollected: { increment: data.amount },
          // Auto-expire if maxPayments reached
          ...(link.maxPayments > 0 && link.paymentCount + 1 >= link.maxPayments ? { status: 'depleted' } : {}),
        },
      })

      return newPayment
    })

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}