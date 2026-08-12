import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, forbidden, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().min(1, 'Body is required').max(5000),
  type: z.enum(['info', 'warning', 'error', 'success']).optional().default('info'),
  category: z.string().max(100).optional(),
  actionUrl: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).optional(),
  targetAccountIds: z.array(z.string()).optional(),
});

const updateNotificationSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});
async function getHandler(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return unauthorized('Authentication required');

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const type = url.searchParams.get('type');

  const baseWhere: any = { accountId: user.id };
  if (type) baseWhere.type = type;

  const where = unreadOnly ? { ...baseWhere, isRead: false } : baseWhere;

  const [notifications, unreadCount, totalCount] = await Promise.all([
    db.notification.findMany({
      where,
      select: { id: true, title: true, body: true, type: true, category: true, isRead: true, readAt: true, actionUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    unreadOnly ? undefined : db.notification.count({ where: { accountId: user.id, isRead: false } }),
    db.notification.count({ where: baseWhere }),
  ]);

  // When unreadOnly=true, unreadCount equals totalCount
  const finalUnreadCount = unreadOnly ? totalCount : (unreadCount ?? 0);

  return ok(notifications, { unreadCount: finalUnreadCount, totalCount, limit, offset });
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth(req);

  const body = await req.json();
  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { title, body: notifBody, type, category, actionUrl, metadata, targetAccountIds } = parsed.data;

  // If targetAccountIds provided (admin creating for others), validate admin role
  let accountIds: string[];
  if (targetAccountIds && Array.isArray(targetAccountIds)) {
    if (user.role !== 'admin') return forbidden('Only admins can create notifications for other users');
    // Verify all target accounts are in the same tenant
    const validAccounts = await db.account.findMany({
      where: { id: { in: targetAccountIds }, tenantId: user.tenantId },
      select: { id: true },
    });
    accountIds = validAccounts.map((a: any) => a.id);
  } else {
    accountIds = [user.id];
  }

  const notifications = await db.notification.createMany({
    data: accountIds.map(accountId => ({
      accountId,
      title,
      body: notifBody,
      type: type || 'info',
      category: category || 'general',
      actionUrl: actionUrl || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })),
  });

  return created({ created: notifications.count });
}

// Mark notifications as read
async function patchHandler(req: NextRequest) {
  const user = await requireAuth(req);

  const body = await req.json();
  const parsed = updateNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { ids, markAll } = parsed.data;

  if (markAll) {
    await db.notification.updateMany({
      where: { accountId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return ok({ marked: 'all' });
  }

  if (ids && Array.isArray(ids)) {
    await db.notification.updateMany({
      where: { id: { in: ids }, accountId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return ok({ marked: ids.length });
  }

  return badRequest('Provide ids or markAll');
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/notifications');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/notifications');

export const PATCH = withApiTelemetry(withErrorHandler(patchHandler), '/api/notifications');
