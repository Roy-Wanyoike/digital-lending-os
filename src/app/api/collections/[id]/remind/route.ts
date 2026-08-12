import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { created, error, notFound, validationError, withErrorHandler } from '@/backend/lib/api-response';
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

async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = remindSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    const collectionCase = await db.collectionCase.findUnique({ where: { id } })
    if (!collectionCase) {
      return notFound('Collection case not found')
    }

    // Verify tenant access
    const biz = await db.business.findUnique({
      where: { id: collectionCase.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Collection case not found')
    }

    const now = new Date()
    const intervalDays = REMIND_INTERVAL_DAYS[data.template]
    const nextReminderDue = intervalDays === 0
      ? now
      : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

    const reminder = await db.$transaction(async (tx: any) => {
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

    return created(reminder)
  } catch (error: any) {
    console.error('Error sending collection reminder:', error)
    return error('Failed to send collection reminder')
  }
}

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/collections/[id]/remind');
