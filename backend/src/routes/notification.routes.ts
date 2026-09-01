/**
 * Notification Routes
 * 
 * API endpoints for notification management:
 * - Send notifications (SMS, Email, In-App)
 * - List and manage notifications
 * - Template management
 */

import { Router } from 'express';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import { notificationController } from '../controllers/notification.controller';

export const notificationRoutes = Router();

// All notification routes require authentication
notificationRoutes.use(authenticate);
notificationRoutes.use(requireTenantAccess);

/**
 * POST /api/v1/notifications/send
 * Send a single notification
 */
notificationRoutes.post('/send', async (req, res, next) => {
  await notificationController.send(req, res, next);
});

/**
 * POST /api/v1/notifications/bulk-send
 * Send bulk notifications to multiple recipients
 */
notificationRoutes.post('/bulk-send', async (req, res, next) => {
  await notificationController.bulkSend(req, res, next);
});

/**
 * GET /api/v1/notifications
 * List notifications with filtering and pagination
 * Query params: page, limit, recipientId, channel, status, type, unreadOnly, sortBy, sortOrder, dateFrom, dateTo
 */
notificationRoutes.get('/', async (req, res, next) => {
  await notificationController.list(req, res, next);
});

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count for current user/recipient
 */
notificationRoutes.get('/unread-count', async (req, res, next) => {
  await notificationController.getUnreadCount(req, res, next);
});

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read for current user
 */
notificationRoutes.put('/read-all', async (req, res, next) => {
  await notificationController.markAllAsRead(req, res, next);
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
notificationRoutes.put('/:id/read', async (req, res, next) => {
  await notificationController.markAsRead(req, res, next);
});

/**
 * POST /api/v1/notifications/in-app
 * Create an in-app notification
 */
notificationRoutes.post('/in-app', async (req, res, next) => {
  await notificationController.createInAppNotification(req, res, next);
});

/**
 * GET /api/v1/notifications/templates
 * List all available notification templates
 */
notificationRoutes.get('/templates', async (req, res, next) => {
  await notificationController.listTemplates(req, res, next);
});

/**
 * GET /api/v1/notifications/templates/:templateId
 * Get a specific template by ID
 */
notificationRoutes.get('/templates/:templateId', async (req, res, next) => {
  await notificationController.getTemplate(req, res, next);
});

/**
 * POST /api/v1/notifications/templates/:templateId/render
 * Render a template with data (for preview purposes)
 */
notificationRoutes.post('/templates/:templateId/render', async (req, res, next) => {
  await notificationController.renderTemplate(req, res, next);
});

/**
 * POST /api/v1/notifications/process-scheduled
 * Process scheduled notifications (admin only)
 */
notificationRoutes.post('/process-scheduled', 
  requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (req, res, next) => {
    await notificationController.processScheduled(req, res, next);
  }
);