import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const REMIND_INTERVAL_DAYS: Record<string, number> = {
  friendly: 7,
  firm: 3,
  final: 1,
  legal: 0,
}

const remindSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp', 'in_app'] as const),
  template: z.enum(['friendly', 'firm', 'final', 'legal'] as const),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    const { id } = await params
    const body = await request.json()
    const parsed = remindSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    const collectionCase = await db.collectionCase.findUnique({ where: { id } })
    if (!collectionCase) {
      return NextResponse.json({ error: 'Collection case not found' }, { status: 404 })
    }

    // Verify tenant access
    const biz = await db.business.findUnique({
      where: { id: collectionCase.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Collection case not found' }, { status: 404 })
    }

    const now = new Date()
    const intervalDays = REMIND_INTERVAL_DAYS[data.template]
    const nextReminderDue = intervalDays === 0
      ? now
      : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

    const reminder = await db.$transaction(async (tx) => {
      const newReminder = await tx.collectionReminder.create({
        data: {
          caseId: id,
          channel: data.channel,
          template: data.template,
          status: 'sent',
          sentAt: now,
        },
      })

      await tx.collectionCase.update({
        where: { id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: now,
          nextReminderDue,
          ...(data.template === 'legal' ? { status: 'escalated', priority: 'urgent' } : {}),
        },
      })

      return newReminder
    })

    return NextResponse.json({ data: reminder }, { status: 201 })
  } catch (error) {
    console.error('Error sending collection reminder:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to send collection reminder' }, { status: 500 })
  }
}
