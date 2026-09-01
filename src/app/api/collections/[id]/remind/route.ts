import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/api-helpers'
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper'
import { created, notFound, validationError, withErrorHandler, error } from '@/backend/lib/api-response'
import { publishEvent } from '@/backend/lib/event-publisher'
import { eventBus } from '@/backend/services/event-bus'

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

/**
 * Safely parse the aiStrategy JSON field from a collection case.
 * Returns null if the field is missing or invalid JSON.
 */
function parseAiStrategy(aiStrategy: string | null): Record<string, unknown> | null {
  if (!aiStrategy) return null
  try {
    return JSON.parse(aiStrategy) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Determine the preferred channel from the AI strategy.
 * Falls back to the user-supplied channel if the strategy doesn't specify one.
 */
function resolveStrategyChannel(
  aiStrategy: Record<string, unknown> | null,
  userChannel: string,
): string {
  const strategyChannel = aiStrategy?.channel
  if (
    typeof strategyChannel === 'string' &&
    ['email', 'sms', 'whatsapp', 'in_app'].includes(strategyChannel)
  ) {
    return strategyChannel
  }
  return userChannel
}

async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // Fetch collection case with debtor and invoice info in a single query
    const collectionCase = await db.collectionCase.findUnique({
      where: { id },
      include: {
        debtor: {
          select: { id: true, name: true, legalName: true, country: true, city: true, website: true },
        },
        business: {
          select: { id: true, tenantId: true, name: true },
        },
      },
    })
    if (!collectionCase) {
      return notFound('Collection case not found')
    }

    // Verify tenant access
    if (collectionCase.business.tenantId !== user.tenantId) {
      return notFound('Collection case not found')
    }

    // Parse AI strategy and resolve the delivery channel
    const strategy = parseAiStrategy(collectionCase.aiStrategy)
    const strategyChannel = resolveStrategyChannel(strategy, data.channel)

    // Fetch invoice details if an invoice is linked
    let invoiceDetails: Record<string, unknown> | null = null
    if (collectionCase.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: collectionCase.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          currency: true,
          dueDate: true,
          status: true,
        },
      })
      if (invoice) {
        invoiceDetails = {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          invoiceStatus: invoice.status,
        }
      }
    }

    const now = new Date()
    const intervalDays = REMIND_INTERVAL_DAYS[data.template]
    const nextReminderDue =
      intervalDays === 0
        ? now
        : new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

    const reminder = await db.$transaction(async (tx: any) => {
      // Status is 'pending' — actual delivery is delegated to background workers
      const newReminder = await tx.collectionReminder.create({
        data: {
          caseId: id,
          channel: strategyChannel,
          template: data.template,
          status: 'pending',
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

    // ── Build event payload ──────────────────────────────────────────
    const eventPayload = {
      reminderId: reminder.id,
      collectionId: id,
      caseRef: collectionCase.caseRef,
      channel: strategyChannel,
      template: data.template,
      tenantId: user.tenantId,
      userId: user.id,
      strategy,
      invoice: invoiceDetails,
      debtor: {
        id: collectionCase.debtor.id,
        name: collectionCase.debtor.name,
        legalName: collectionCase.debtor.legalName,
        country: collectionCase.debtor.country,
        city: collectionCase.debtor.city,
      },
      amount: {
        original: collectionCase.originalAmount,
        outstanding: collectionCase.outstandingAmount,
        currency: collectionCase.currency,
      },
      createdAt: now.toISOString(),
    }

    // ── Publish async event for background delivery workers ──────────
    await publishEvent({
      topic: 'collection.reminder.created',
      key: reminder.id,
      event: eventPayload,
    })

    // ── Emit real-time event for SSE subscribers (frontend updates) ──
    eventBus.emit(
      'collection.reminder.created',
      {
        reminderId: reminder.id,
        collectionId: id,
        channel: strategyChannel,
        template: data.template,
        status: 'pending',
      },
      user.tenantId,
    )

    // Audit log
    console.log(
      `[Audit] collection.reminder.created | reminderId=${reminder.id} | case=${collectionCase.caseRef} | channel=${strategyChannel} | template=${data.template} | tenantId=${user.tenantId}`,
    )

    return created(reminder)
  } catch (err: any) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return error('Unauthorized', 401)
    }
    console.error('Error sending collection reminder:', err)
    return error('Failed to send collection reminder')
  }
}

export const POST = withApiTelemetry(
  withErrorHandler(postHandler),
  '/api/collections/[id]/remind',
)