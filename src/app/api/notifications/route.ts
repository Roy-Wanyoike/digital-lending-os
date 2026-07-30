import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const type = url.searchParams.get('type');

    const where: any = { accountId: user.id };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

    const [notifications, unreadCount, totalCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where: { accountId: user.id, isRead: false } }),
      db.notification.count({ where: { accountId: user.id } }),
    ]);

    return successResponse({
      data: notifications,
      unreadCount,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    return errorResponse('Failed to fetch notifications', 500);
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const body = await req.json();
    const { title, body: notifBody, type, category, actionUrl, metadata, targetAccountIds } = body;

    if (!title || !notifBody) return errorResponse('Title and body are required', 400);

    // If targetAccountIds provided (admin creating for others), validate admin role
    let accountIds: string[];
    if (targetAccountIds && Array.isArray(targetAccountIds)) {
      if (user.role !== 'admin') return errorResponse('Only admins can create notifications for other users', 403);
      // Verify all target accounts are in the same tenant
      const validAccounts = await db.account.findMany({
        where: { id: { in: targetAccountIds }, tenantId: user.tenantId },
        select: { id: true },
      });
      accountIds = validAccounts.map(a => a.id);
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

    return successResponse({ created: notifications.count }, 201);
  } catch (error: any) {
    console.error('Notifications POST error:', error);
    return errorResponse('Failed to create notification', 500);
  }
}

// Mark notifications as read
async function patchHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const body = await req.json();
    const { ids, markAll } = body;

    if (markAll) {
      await db.notification.updateMany({
        where: { accountId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return successResponse({ marked: 'all' });
    }

    if (ids && Array.isArray(ids)) {
      await db.notification.updateMany({
        where: { id: { in: ids }, accountId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
      return successResponse({ marked: ids.length });
    }

    return errorResponse('Provide ids or markAll', 400);
  } catch (error: any) {
    console.error('Notifications PATCH error:', error);
    return errorResponse('Failed to mark notifications', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/notifications');

export const POST = withApiTelemetry(postHandler, '/api/notifications');

export const PATCH = withApiTelemetry(patchHandler, '/api/notifications');
