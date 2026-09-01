/**
 * Notification Controller
 * 
 * Handles HTTP requests for notification management operations.
 */

import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export class NotificationController {
  /**
   * POST /api/v1/notifications/send
   * Send a single notification
   */
  async send(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenantId, to, channel, message, subject, templateId, templateData } = req.body;

      if (!tenantId || !to || !channel || !message) {
        return badRequestResponse(res, 'tenantId, to, channel, and message are required');
      }

      const result = await notificationService.send({
        tenantId: req.user?.tenantId || tenantId,
        to,
        channel,
        message,
        subject,
        templateId,
        templateData,
      });

      if (result.success) {
        return createdResponse(res, {
          notificationId: result.notificationId,
          externalId: result.externalId,
          channel: result.channel,
        }, 'Notification sent successfully');
      } else {
        return errorResponse(res, 500, `Failed to send notification: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
      return errorResponse(res, 500, 'Failed to send notification');
    }
  }

  /**
   * POST /api/v1/notifications/bulk-send
   * Send bulk notifications
   */
  async bulkSend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenantId, recipients, channel, subject, templateId, commonData, scheduledFor } = req.body;

      if (!tenantId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return badRequestResponse(res, 'tenantId and recipients array are required');
      }

      if (!templateId && !req.body.message) {
        return badRequestResponse(res, 'templateId or message is required');
      }

      const result = await notificationService.bulkSend({
        tenantId: req.user?.tenantId || tenantId,
        recipients: recipients.map((r: any) => ({
          id: r.id,
          contact: r.contact || r.to || r.phone || r.email,
          type: r.type || 'CUSTOMER',
          data: r.data,
        })),
        channel: channel || 'SMS',
        subject,
        templateId: templateId || 'sms-general',
        commonData: commonData || { message: req.body.message },
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      });

      return createdResponse(res, {
        total: result.total,
        success: result.success,
        failed: result.failed,
        results: result.results.map(r => ({
          success: r.success,
          notificationId: r.notificationId,
          error: r.error,
        })),
      }, `Bulk send completed: ${result.success}/${result.total} successful`);
    } catch (error) {
      logger.error('Error in bulk send:', error);
      return errorResponse(res, 500, 'Failed to send bulk notifications');
    }
  }

  /**
   * GET /api/v1/notifications
   * List user/tenant notifications with filtering and pagination
   */
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = getQueryNumber(req.query, "page", 1) || 1;
      const limit = getQueryNumber(req.query, "limit", 20) || 20;
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const recipientId = getQueryString(req.query, "recipientId") || req.user?.id;
      const unreadOnly = req.query.unreadOnly === 'true' || req.query.unread === 'true';

      const result = await notificationService.listUserNotifications({
        tenantId,
        recipientId,
        recipientType: req.query.recipientType as string | undefined,
        channel: req.query.channel as any,
        status: req.query.status as any,
        type: req.query.type as any,
        unreadOnly,
        page,
        limit,
        sortBy: (req.query.sortBy as any) || 'createdAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      });

      return paginatedResponse(
        res,
        result.items,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      logger.error('Error listing notifications:', error);
      return errorResponse(res, 500, 'Failed to fetch notifications');
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count for current user
   */
  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
      const recipientId = getQueryString(req.query, "recipientId") || req.user?.id;

      if (!tenantId || !recipientId) {
        return badRequestResponse(res, 'tenantId and recipientId are required');
      }

      const result = await notificationService.getUnreadCount(recipientId, tenantId);

      return successResponse(res, result);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return errorResponse(res, 500, 'Failed to get unread count');
    }
  }

  /**
   * PUT /api/v1/notifications/:id/read
   * Mark a specific notification as read
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      // Verify notification exists
      const notification = await notificationService.listUserNotifications({
        tenantId: req.user?.tenantId || '',
        recipientId: req.user?.id,
        limit: 1,
      });

      await notificationService.markAsRead(id);

      return successResponse(res, { id, readAt: new Date() }, 'Notification marked as read');
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return errorResponse(res, 500, 'Failed to mark notification as read');
    }
  }

  /**
   * PUT /api/v1/notifications/read-all
   * Mark all notifications as read for current user
   */
  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.body.tenantId || req.user?.tenantId;
      const recipientId = req.body.recipientId || req.user?.id;

      if (!tenantId || !recipientId) {
        return badRequestResponse(res, 'tenantId and recipientId are required');
      }

      const count = await notificationService.markAllAsRead(recipientId, tenantId);

      return successResponse(res, { count }, `${count} notifications marked as read`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return errorResponse(res, 500, 'Failed to mark all notifications as read');
    }
  }

  /**
   * GET /api/v1/notifications/templates
   * List all available notification templates
   */
  async listTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const templates = await notificationService.listTemplates();
      return successResponse(res, templates);
    } catch (error) {
      logger.error('Error listing templates:', error);
      return errorResponse(res, 500, 'Failed to list templates');
    }
  }

  /**
   * GET /api/v1/notifications/templates/:templateId
   * Get a specific template
   */
  async getTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const templateId = String(req.params.templateId);
      const template = await notificationService.getTemplate(templateId);
      return successResponse(res, template);
    } catch (error) {
      logger.error('Error getting template:', error);
      return notFoundResponse(res, 'Template');
    }
  }

  /**
   * POST /api/v1/notifications/templates/:templateId/render
   * Render a template with provided data (preview)
   */
  async renderTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const templateId = String(req.params.templateId);
      const data = req.body.data || req.body;

      const result = await notificationService.renderTemplate(templateId, data);

      if (result.success) {
        return successResponse(res, {
          rendered: result.rendered,
          subject: result.subject,
          missingVariables: result.missingVariables,
        });
      } else {
        return badRequestResponse(res, `Failed to render template: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error rendering template:', error);
      return errorResponse(res, 500, 'Failed to render template');
    }
  }

  /**
   * POST /api/v1/notifications/in-app
   * Create an in-app notification
   */
  async createInAppNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, type, title, body, metadata, actionUrl, icon, priority } = req.body;

      if (!userId || !type || !title || !body) {
        return badRequestResponse(res, 'userId, type, title, and body are required');
      }

      const notification = await notificationService.createNotification(
        userId,
        type,
        title,
        body,
        metadata
      );

      return createdResponse(res, notification, 'In-app notification created successfully');
    } catch (error) {
      logger.error('Error creating in-app notification:', error);
      return errorResponse(res, 500, 'Failed to create notification');
    }
  }

  /**
   * POST /api/v1/notifications/process-scheduled
   * Process scheduled notifications (admin/cron endpoint)
   */
  async processScheduled(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Only allow admins or system calls
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'TENANT_ADMIN') {
        return badRequestResponse(res, 'Admin access required');
      }

      const count = await notificationService.processScheduledNotifications();
      return successResponse(res, { processed: count }, `Processed ${count} scheduled notifications`);
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
      return errorResponse(res, 500, 'Failed to process scheduled notifications');
    }
  }
}

// Export singleton instance
export const notificationController = new NotificationController();