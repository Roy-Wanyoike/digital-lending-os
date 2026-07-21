import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updatePaymentLinkSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused']).optional(),
  allowedMethods: z.array(z.string()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const link = await db.paymentLink.findUnique({
      where: { id },
    })

    if (!link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    const payments = await db.paymentLinkPayment.findMany({
      where: { paymentLinkId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: { ...link, payments } })
  } catch (error) {
    console.error('Error fetching payment link:', error)
    return NextResponse.json({ error: 'Failed to fetch payment link' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updatePaymentLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const existing = await db.paymentLink.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.allowedMethods !== undefined) updateData.allowedMethods = JSON.stringify(data.allowedMethods)

    const link = await db.paymentLink.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: link })
  } catch (error) {
    console.error('Error updating payment link:', error)
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.paymentLink.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    const link = await db.paymentLink.update({
      where: { id },
      data: { status: 'expired' },
    })

    return NextResponse.json({ data: link })
  } catch (error) {
    console.error('Error expiring payment link:', error)
    return NextResponse.json({ error: 'Failed to expire payment link' }, { status: 500 })
  }
}