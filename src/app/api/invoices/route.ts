import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const createInvoiceSchema = z.object({
  senderId: z.string().min(1, 'senderId is required'),
  receiverId: z.string().min(1, 'receiverId is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required').default('USD'),
  dueDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  items: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined
      try {
        const parsed = JSON.parse(val as string)
        if (!Array.isArray(parsed)) return undefined
        return JSON.stringify(parsed)
      } catch {
        return undefined
      }
    }),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const { searchParams } = new URL(request.url)
    const senderId = searchParams.get('senderId') || ''
    const receiverId = searchParams.get('receiverId') || ''
    const status = searchParams.get('status') || ''
    const currency = searchParams.get('currency') || ''

    const where: Record<string, unknown> = {
      OR: [
        { sender: { tenantId: user.tenantId } },
        { receiver: { tenantId: user.tenantId } },
      ],
    }

    if (senderId) {
      where.senderId = senderId
    }
    if (receiverId) {
      where.receiverId = receiverId
    }
    if (status) {
      where.status = status
    }
    if (currency) {
      where.currency = currency
    }

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: invoices })
  } catch (error) {
    console.error('Error listing invoices:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { senderId, receiverId, amount, currency, dueDate, items, notes } = parsed.data

    if (senderId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot create an invoice to yourself' },
        { status: 400 }
      )
    }

    // Check both businesses exist and sender belongs to tenant
    const [sender, receiver] = await Promise.all([
      db.business.findUnique({ where: { id: senderId } }),
      db.business.findUnique({ where: { id: receiverId } }),
    ])

    if (!sender || sender.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Sender business not found' }, { status: 404 })
    }
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver business not found' }, { status: 404 })
    }

    // Generate invoice reference: INV-YYYYMMDD-XXXXX
    const now = new Date()
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0')
    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString()
    const invoiceRef = `INV-${dateStr}-${randomDigits}`

    const invoice = await db.invoice.create({
      data: {
        invoiceRef,
        senderId,
        receiverId,
        amount,
        currency,
        dueDate,
        items,
        notes,
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Invoice reference collision, please retry' },
        { status: 409 }
      )
    }
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
