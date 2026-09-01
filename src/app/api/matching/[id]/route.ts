import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, error, notFound, ok, validationError, withErrorHandler } from '@/backend/lib/api-response';
import { publishEvent } from '@/backend/lib/event-publisher';
import { TOPICS } from '@/backend/lib/kafka/topics';

// ─── Valid Status Transitions ────────────────────────────────────────
//
// suggested ──→ accepted | rejected | expired
// contacted  ──→ accepted | rejected | expired
// interested  ──→ accepted | rejected | expired
// declined    ──→ (terminal)
// engaged     ──→ (terminal)
// accepted    ──→ engaged
// rejected    ──→ (terminal)
// expired     ──→ (terminal)

const VALID_TRANSITIONS: Record<string, string[]> = {
  suggested:  ['accepted', 'rejected', 'expired', 'contacted', 'interested', 'declined'],
  contacted:  ['accepted', 'rejected', 'expired', 'interested', 'declined'],
  interested: ['accepted', 'rejected', 'expired'],
  accepted:   ['engaged'],
  declined:   [],
  engaged:    [],
  rejected:   [],
  expired:    [],
}

// ─── Schema ──────────────────────────────────────────────────────────

const updateMatchSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'expired', 'contacted', 'interested', 'declined', 'engaged'] as const),
  seekerResponse: z.string().optional(),
  candidateResponse: z.string().optional(),
  rejectionReason: z.string().optional(),
})

// ─── Notification Helper ─────────────────────────────────────────────

async function createNotification(
  accountId: string,
  title: string,
  body: string,
  type: string,
  category: string,
  metadata: Record<string, unknown>,
) {
  try {
    await db.notification.create({
      data: {
        accountId,
        title,
        body,
        type,
        category,
        metadata: JSON.stringify(metadata),
        actionUrl: `/dashboard/matching`,
      },
    })
  } catch (err) {
    // Never let notification creation break the main flow
    console.error('[Notification] Failed to create notification:', err)
  }
}

/**
 * Find account IDs associated with a business (via User table fallback + Account table).
 */
async function getAccountIdsForBusiness(businessId: string): Promise<string[]> {
  // Primary: accounts with businessId set
  const accounts = await db.account.findMany({
    where: { businessId },
    select: { id: true },
  })
  const ids = accounts.map((a: { id: string }) => a.id)

  if (ids.length > 0) return ids

  // Fallback: users with businessId set
  const users = await db.user.findMany({
    where: { businessId },
    select: { id: true },
  })
  // Users map to accounts — use their ID as a best-effort lookup
  // In practice, account has the FK, so this is a safety net
  return users.map((u: { id: string }) => u.id)
}

// ─── PUT Handler ──────────────────────────────────────────────────────

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateMatchSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const existing = await db.businessMatch.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Match not found')
    }

    // Verify tenant access: check if seeker or candidate business belongs to tenant
    const [seekerBiz, candidateBiz] = await Promise.all([
      db.business.findUnique({ where: { id: existing.seekerId }, select: { tenantId: true, name: true } }),
      db.business.findUnique({ where: { id: existing.candidateId }, select: { tenantId: true, name: true } }),
    ])
    const seekerOk = seekerBiz?.tenantId === user.tenantId
    const candidateOk = candidateBiz?.tenantId === user.tenantId
    if (!seekerOk && !candidateOk) {
      return notFound('Match not found')
    }

    const data = parsed.data
    const newStatus = data.status
    const oldStatus = existing.status as string

    // ── Validate status transition ────────────────────────────────────
    const allowedTransitions = VALID_TRANSITIONS[oldStatus]
    if (!allowedTransitions) {
      return badRequest(`Cannot transition from status '${oldStatus}'`)
    }
    if (!allowedTransitions.includes(newStatus)) {
      return badRequest(
        `Invalid transition: '${oldStatus}' → '${newStatus}'. Allowed: ${allowedTransitions.join(', ')}`,
      )
    }

    // ── On 'accepted': create BusinessRelationship ────────────────────
    if (newStatus === 'accepted') {
      // Check if a relationship already exists between these businesses
      const existingRel = await db.businessRelationship.findFirst({
        where: {
          OR: [
            { fromBusinessId: existing.seekerId, toBusinessId: existing.candidateId, type: existing.matchType },
            { fromBusinessId: existing.candidateId, toBusinessId: existing.seekerId, type: existing.matchType },
          ],
        },
      })

      if (!existingRel) {
        await db.businessRelationship.create({
          data: {
            fromBusinessId: existing.seekerId,
            toBusinessId: existing.candidateId,
            type: existing.matchType,
            trustLevel: (existing.matchScore / 100) * 100, // Initialize from match score
            metadata: JSON.stringify({
              sourceMatchId: existing.id,
              matchScore: existing.matchScore,
              acceptedAt: new Date().toISOString(),
              acceptedBy: user.id,
            }),
          },
        })
      }

      // Notify the other party
      const recipientBizId = seekerOk ? existing.candidateId : existing.seekerId
      const recipientName = seekerOk ? candidateBiz?.name : seekerBiz?.name
      const [recipientAccountIds] = await Promise.all([
        getAccountIdsForBusiness(recipientBizId),
      ])

      await Promise.all(
        recipientAccountIds.map(accountId =>
          createNotification(
            accountId,
            'Match Accepted',
            `A business match has been accepted by ${seekerBiz?.name ?? 'a partner'}. A new business relationship has been established.`,
            'success',
            'match_accepted',
            {
              matchId: id,
              seekerId: existing.seekerId,
              candidateId: existing.candidateId,
              matchType: existing.matchType,
              matchScore: existing.matchScore,
            },
          ),
        ),
      )

      // Publish match accepted event
      await publishEvent({
        topic: TOPICS.NOTIFICATION_EVENTS,
        key: `match-accepted:${id}`,
        event: {
          eventId: `match-accepted-${id}`,
          eventType: 'notification.send',
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'matching',
          data: {
            recipientId: recipientBizId,
            recipientType: 'business',
            channel: 'in_app',
            templateId: 'match_accepted',
            templateData: {
              matchId: id,
              seekerName: seekerBiz?.name,
              candidateName: candidateBiz?.name,
              matchType: existing.matchType,
              matchScore: existing.matchScore,
            },
            subject: 'Match Accepted',
          },
        },
      })

      // Publish audit event
      await publishEvent({
        topic: TOPICS.AUDIT_EVENTS,
        key: `match-transition:${id}`,
        event: {
          eventId: `match-accepted-${Date.now()}`,
          eventType: 'audit.log',
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'matching',
          data: {
            action: 'match.accepted',
            resource: 'BusinessMatch',
            resourceId: id,
            actorId: user.id,
            actorType: 'user',
            changes: {
              status: { old: oldStatus, new: newStatus },
            },
            metadata: {
              seekerId: existing.seekerId,
              candidateId: existing.candidateId,
              matchType: existing.matchType,
              seekerResponse: data.seekerResponse,
              candidateResponse: data.candidateResponse,
            },
          },
        },
      })
    }

    // ── On 'rejected': record rejection reason ────────────────────────
    if (newStatus === 'rejected') {
      const rejectionReason = data.rejectionReason || 'No reason provided'

      // Notify the other party
      const recipientBizId = seekerOk ? existing.candidateId : existing.seekerId
      const [recipientAccountIds] = await Promise.all([
        getAccountIdsForBusiness(recipientBizId),
      ])

      await Promise.all(
        recipientAccountIds.map(accountId =>
          createNotification(
            accountId,
            'Match Declined',
            `A business match with ${seekerBiz?.name ?? 'a partner'} has been declined.`,
            'warning',
            'match_rejected',
            {
              matchId: id,
              seekerId: existing.seekerId,
              candidateId: existing.candidateId,
              matchType: existing.matchType,
              rejectionReason,
            },
          ),
        ),
      )

      // Publish match rejected event
      await publishEvent({
        topic: TOPICS.NOTIFICATION_EVENTS,
        key: `match-rejected:${id}`,
        event: {
          eventId: `match-rejected-${id}`,
          eventType: 'notification.send',
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'matching',
          data: {
            recipientId: recipientBizId,
            recipientType: 'business',
            channel: 'in_app',
            templateId: 'match_rejected',
            templateData: {
              matchId: id,
              seekerName: seekerBiz?.name,
              candidateName: candidateBiz?.name,
              matchType: existing.matchType,
              rejectionReason,
            },
            subject: 'Match Declined',
          },
        },
      })

      // Publish audit event
      await publishEvent({
        topic: TOPICS.AUDIT_EVENTS,
        key: `match-transition:${id}`,
        event: {
          eventId: `match-rejected-${Date.now()}`,
          eventType: 'audit.log',
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'matching',
          data: {
            action: 'match.rejected',
            resource: 'BusinessMatch',
            resourceId: id,
            actorId: user.id,
            actorType: 'user',
            changes: {
              status: { old: oldStatus, new: newStatus },
            },
            metadata: {
              seekerId: existing.seekerId,
              candidateId: existing.candidateId,
              matchType: existing.matchType,
              rejectionReason,
              seekerResponse: data.seekerResponse,
              candidateResponse: data.candidateResponse,
            },
          },
        },
      })
    }

    // ── Perform the status update ─────────────────────────────────────
    const updateData: Record<string, unknown> = {
      status: newStatus,
      ...(data.seekerResponse !== undefined ? { seekerResponse: data.seekerResponse } : {}),
      ...(data.candidateResponse !== undefined ? { candidateResponse: data.candidateResponse } : {}),
    }

    // Store rejection reason in metadata for the rejected case
    if (newStatus === 'rejected' && data.rejectionReason) {
      const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {}
      updateData.metadata = JSON.stringify({
        ...existingMeta,
        rejectionReason: data.rejectionReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.id,
      })
    }

    const match = await db.businessMatch.update({
      where: { id },
      data: updateData,
    })

    return ok(match)
  } catch (error: any) {
    console.error('Error updating match:', error)
    return error('Failed to update match')
  }
}

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/matching/[id]');
