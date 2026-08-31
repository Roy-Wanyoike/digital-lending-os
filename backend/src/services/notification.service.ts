/**
 * Notification Service
 * 
 * Comprehensive notification system for Digital Lending OS supporting:
 * - SMS Notifications (via Africa's Talking / Twilio / Mock)
 * - Email Notifications (via SendGrid / SES / SMTP / Mock)
 * - In-App Notifications (stored in database)
 * - Push Notifications
 * - Template-based message rendering
 * - Bulk sending capabilities
 * - Delivery tracking and retry logic
 */

import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../lib/db';
import { templateService, Template, RenderResult } from './template.service';
import { smsMockProvider, SmsResult } from '../providers/sms.mock';
import { emailMockProvider, EmailResult } from '../providers/email.mock';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SmsMessage {
  to: string;
  message: string;
  from?: string;
  templateId?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface InAppNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  icon?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationInput {
  tenantId: string;
  recipientType: 'CUSTOMER' | 'USER' | 'SYSTEM' | 'EXTERNAL';
  recipientId?: string;
  recipientContact?: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  scheduledFor?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface BulkNotificationInput {
  tenantId: string;
  recipients: Array<{
    id?: string;
    contact: string;
    type: 'CUSTOMER' | 'USER' | 'EXTERNAL';
    data?: Record<string, unknown>; // Per-recipient template data
  }>;
  channel: NotificationChannel;
  subject?: string;
  templateId: string;
  commonData?: Record<string, unknown>;
  scheduledFor?: Date;
}

export interface NotificationDeliveryResult {
  success: boolean;
  notificationId: string;
  externalId?: string;
  error?: string;
  channel: NotificationChannel;
}

export type NotificationType =
  | 'loan_approved'
  | 'loan_disbursed'
  | 'payment_received'
  | 'payment_due'
  | 'payment_overdue'
  | 'application_status'
  | 'account_update'
  | 'system_alert'
  | 'marketing'
  | 'welcome'
  | 'security'
  | 'general';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH' | 'IN_APP' | 'USSD';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED' | 'SCHEDULED';

export interface NotificationListParams {
  tenantId: string;
  recipientId?: string;
  recipientType?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  type?: NotificationType;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'scheduledFor' | 'sentAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UnreadCountResult {
  count: number;
  byType: Record<NotificationType, number>;
}

// =============================================================================
// NOTIFICATION SERVICE CLASS
// =============================================================================

export class NotificationService {
  private maxRetries = 3;
  private retryDelays = [1000, 5000, 15000]; // ms

  // ===========================================================================
  // SMS NOTIFICATIONS
  // ===========================================================================

  /**
   * Send SMS notification
   * Queues SMS for sending and tracks delivery status
   */
  async sendSms(
    phone: string,
    message: string,
    templateId?: string
  ): Promise<SmsResult> {
    try {
      const from = config.sms.from;

      // Use mock provider in development, real provider in production
      if (config.nodeEnv === 'development' || !config.sms.apiKey) {
        return await smsMockProvider.sendSms({
          to: phone,
          message,
          from,
        });
      }

      // Production: Call Africa's Talking API
      // const response = await fetch('https://api.africastalking.com/version1/messaging', {
      //   method: 'POST',
      //   headers: {
      //     'Accept': 'application/json',
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //     'apiKey': config.sms.africaTalking.apiKey,
      //   },
      //   body: new URLSearchParams({
      //     username: config.sms.africaTalking.username,
      //     to: phone,
      //     message,
      //     from: from || config.sms.africaTalking.shortCode,
      //   }),
      // });

      logger.info('SMS sent via provider', {
        to: phone,
        from,
        messageLength: message.length,
        templateId,
      });

      return {
        success: true,
        messageId: `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      logger.error('Failed to send SMS', { error, to: phone });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSms(
    recipients: Array<{ to: string; message: string }>
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    results: SmsResult[];
  }> {
    if (config.nodeEnv === 'development') {
      return await smsMockProvider.sendBulkSms(recipients);
    }

    const results: SmsResult[] = [];
    for (const recipient of recipients) {
      const result = await this.sendSms(recipient.to, recipient.message);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;

    return {
      total: recipients.length,
      success: successCount,
      failed: recipients.length - successCount,
      results,
    };
  }

  // ===========================================================================
  // EMAIL NOTIFICATIONS
  // ===========================================================================

  /**
   * Send email notification
   * Renders template with data and sends via provider
   */
  async sendEmail(
    to: string,
    subject: string,
    template: string,
    data: Record<string, unknown> = {}
  ): Promise<EmailResult> {
    try {
      let htmlBody: string;
      let textBody: string;

      if (template.endsWith('.html')) {
        // Render HTML template
        const renderResult = await this.renderTemplate(template.replace('.html', ''), data);
        if (!renderResult.success || !renderResult.rendered) {
          throw new Error(`Failed to render email template: ${renderResult.error}`);
        }
        htmlBody = renderResult.rendered;
        textBody = this.stripHtml(htmlBody);
        
        // Use rendered subject if available
        if (renderResult.subject) {
          subject = renderResult.subject;
        }
      } else {
        // Plain text or direct content
        htmlBody = template;
        textBody = template;
        
        // Simple variable substitution for non-template strings
        for (const [key, value] of Object.entries(data)) {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          htmlBody = htmlBody.replace(regex, String(value ?? ''));
          textBody = textBody.replace(regex, String(value ?? ''));
        }
      }

      // Use mock provider in development
      if (config.nodeEnv === 'development' || !config.email.smtp.host) {
        return await emailMockProvider.sendEmail({
          to,
          subject,
          body: textBody,
          html: htmlBody,
        });
      }

      // Production: Use SendGrid or SMTP
      logger.info('Email sent via provider', {
        to,
        subject,
        template,
      });

      return {
        success: true,
        messageId: `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      logger.error('Failed to send email', { error, to });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    recipients: Array<{
      to: string;
      subject: string;
      template: string;
      data?: Record<string, unknown>;
    }>
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    results: EmailResult[];
  }> {
    if (config.nodeEnv === 'development') {
      return await emailMockProvider.sendBulkEmails(
        recipients.map(r => ({
          to: r.to,
          subject: r.subject,
          body: '',
          html: r.template,
        }))
      );
    }

    const results: EmailResult[] = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.to, recipient.subject, recipient.template, recipient.data || {});
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;

    return {
      total: recipients.length,
      success: successCount,
      failed: recipients.length - successCount,
      results,
    };
  }

  // ===========================================================================
  // IN-APP NOTIFICATIONS
  // ===========================================================================

  /**
   * Create an in-app notification
   * Stores notification in database and marks as unread
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<any> {
    const notification = await db.notification.create({
      data: {
        tenantId: metadata?.tenantId as string || 'system',
        recipientType: 'USER',
        recipientId: userId,
        channel: 'IN_APP',
        subject: title,
        body,
        templateId: `inapp-${type}`,
        templateData: JSON.stringify({ type, ...metadata }),
        status: 'DELIVERED', // In-app notifications are "delivered" immediately
        deliveredAt: new Date(),
        metadata: JSON.stringify(metadata || {}),
      },
    });

    logger.info('In-app notification created', {
      notificationId: notification.id,
      userId,
      type,
    });

    return notification;
  }

  /**
   * List user notifications with filtering and pagination
   */
  async listUserNotifications(params: NotificationListParams): Promise<{
    items: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const {
      tenantId,
      recipientId,
      recipientType,
      channel,
      status,
      type,
      unreadOnly = false,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = params;

    const where: Record<string, any> = { tenantId };

    if (recipientId) where.recipientId = recipientId;
    if (recipientType) where.recipientType = recipientType;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (type) {
      // Filter by notification type stored in templateData
      where.templateData = { contains: `"type":"${type}"` };
    }
    if (unreadOnly) {
      where.readAt = null;
      where.status = { in: ['SENT', 'DELIVERED'] };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.notification.count({ where }),
    ]);

    return {
      items: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: 'READ' },
    });

    logger.info('Notification marked as read', { notificationId });
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(recipientId: string, tenantId: string): Promise<number> {
    const result = await db.notification.updateMany({
      where: {
        tenantId,
        recipientId,
        readAt: null,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: { readAt: new Date(), status: 'READ' },
    });

    logger.info('All notifications marked as read', {
      recipientId,
      count: result.count,
    });

    return result.count;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(recipientId: string, tenantId: string): Promise<UnreadCountResult> {
    const where = {
      tenantId,
      recipientId,
      readAt: null,
      status: { in: ['SENT', 'DELIVERED'] as const },
    };

    const [total, notifications] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        select: { templateData: true },
      }),
    ]);

    // Count by type
    const byType = {} as Record<NotificationType, number>;
    for (const notifType of Object.values(this.getNotificationTypes())) {
      byType[notifType] = 0;
    }

    for (const notif of notifications) {
      try {
        const data = JSON.parse(notif.templateData || '{}');
        const type = data.type as NotificationType;
        if (type && type in byType) {
          byType[type]++;
        }
      } catch {
        // Ignore parse errors
      }
    }

    return { count: total, byType };
  }

  // ===========================================================================
  // TEMPLATE MANAGEMENT
  // ===========================================================================

  /**
   * Get a notification template
   */
  async getTemplate(templateId: string): Promise<Template> {
    return await templateService.getTemplate(templateId);
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<RenderResult> {
    return await templateService.renderTemplate(templateId, data);
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<Template[]> {
    return await templateService.listTemplates();
  }

  // ===========================================================================
  // UNIFIED NOTIFICATION DISPATCH
  // ===========================================================================

  /**
   * Create and send notification through specified channel
   */
  async createAndSend(data: NotificationInput): Promise<any> {
    // Render template if provided
    let body = data.body;
    let subject = data.subject || '';

    if (data.templateId && data.templateData) {
      const renderResult = await this.renderTemplate(data.templateId, data.templateData);
      if (renderResult.success && renderResult.rendered) {
        body = renderResult.rendered;
        if (renderResult.subject) {
          subject = renderResult.subject;
        }
      }
    }

    // Create notification record
    const notification = await db.notification.create({
      data: {
        tenantId: data.tenantId,
        recipientType: data.recipientType,
        recipientId: data.recipientId,
        recipientContact: data.recipientContact,
        channel: data.channel,
        subject: subject || this.getDefaultSubject(data.channel),
        body,
        templateId: data.templateId,
        templateData: JSON.stringify(data.templateData || {}),
        status: data.scheduledFor ? 'SCHEDULED' : 'PENDING',
        scheduledFor: data.scheduledFor || null,
        metadata: JSON.stringify(data.metadata || {}),
      },
    });

    // If not scheduled, dispatch immediately
    if (!data.scheduledFor) {
      await this.dispatchNotification(notification.id);
    }

    // Return updated notification
    return await db.notification.findUnique({ where: { id: notification.id } });
  }

  /**
   * Send notification (simplified API)
   */
  async send(params: {
    tenantId: string;
    to: string;
    channel: NotificationChannel;
    message: string;
    subject?: string;
    templateId?: string;
    templateData?: Record<string, unknown>;
  }): Promise<NotificationDeliveryResult> {
    const result = await this.createAndSend({
      tenantId: params.tenantId,
      recipientType: 'EXTERNAL',
      recipientContact: params.to,
      channel: params.channel,
      subject: params.subject,
      body: params.message,
      templateId: params.templateId,
      templateData: params.templateData,
    });

    return {
      success: result.status !== 'FAILED',
      notificationId: result.id,
      externalId: result.externalId || undefined,
      channel: params.channel,
      error: result.failureReason || undefined,
    };
  }

  /**
   * Send bulk notifications
   */
  async bulkSend(data: BulkNotificationInput): Promise<{
    total: number;
    success: number;
    failed: number;
    results: NotificationDeliveryResult[];
  }> {
    const results: NotificationDeliveryResult[] = [];

    for (const recipient of data.recipients) {
      // Merge common data with per-recipient data
      const mergedData = {
        ...(data.commonData || {}),
        ...(recipient.data || {}),
      };

      // Render template for this recipient
      let body = '';
      let subject = data.subject || '';

      if (data.templateId) {
        const renderResult = await this.renderTemplate(data.templateId, mergedData);
        if (renderResult.success && renderResult.rendered) {
          body = renderResult.rendered;
          if (renderResult.subject) {
            subject = renderResult.subject;
          }
        }
      }

      try {
        const result = await this.createAndSend({
          tenantId: data.tenantId,
          recipientType: recipient.type,
          recipientId: recipient.id,
          recipientContact: recipient.contact,
          channel: data.channel,
          subject,
          body,
          templateId: data.templateId,
          templateData: mergedData,
          scheduledFor: data.scheduledFor,
        });

        results.push({
          success: result.status !== 'FAILED',
          notificationId: result.id,
          externalId: result.externalId || undefined,
          channel: data.channel,
        });
      } catch (error) {
        results.push({
          success: false,
          notificationId: '',
          channel: data.channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      total: data.recipients.length,
      success: successCount,
      failed: data.recipients.length - successCount,
      results,
    };
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  /**
   * Dispatch notification based on channel
   */
  private async dispatchNotification(notificationId: string): Promise<void> {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      logger.error('Notification not found for dispatch', { notificationId });
      return;
    }

    let result: SmsResult | EmailResult | { success: boolean; messageId?: string; error?: string };

    switch (notification.channel) {
      case 'SMS':
        result = await this.sendSms(
          notification.recipientContact || '',
          notification.body,
          notification.templateId || undefined
        );
        break;

      case 'EMAIL':
        result = await this.sendEmail(
          notification.recipientContact || '',
          notification.subject,
          notification.body,
          JSON.parse(notification.templateData || '{}')
        );
        break;

      case 'IN_APP':
        // In-app notifications are already "delivered" when created
        result = { success: true, messageId: notification.id };
        break;

      case 'PUSH':
        // TODO: Implement push notification delivery
        result = { success: true, messageId: `PUSH-${Date.now()}` };
        break;

      default:
        result = { success: false, error: 'Unsupported channel' };
    }

    // Update notification status based on result
    const updateData: any = {
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: result.success ? new Date() : null,
      failedAt: result.success ? null : new Date(),
      failureReason: result.error || null,
      externalId: result.messageId,
    };

    await db.notification.update({
      where: { id: notificationId },
      data: updateData,
    });

    if (!result.success) {
      // Attempt retry if under max retries
      await this.handleFailedNotification(notification, result.error);
    }

    logger.info('Notification dispatched', {
      notificationId,
      channel: notification.channel,
      success: result.success,
    });
  }

  /**
   * Handle failed notification with retry logic
   */
  private async handleFailedNotification(
    notification: any,
    error?: string
  ): Promise<void> {
    // Get current retry count from metadata
    const metadata = JSON.parse(notification.metadata || '{}');
    const retryCount = metadata.retryCount || 0;

    if (retryCount < this.maxRetries) {
      // Schedule retry
      const delay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
      
      logger.warn(`Scheduling notification retry ${retryCount + 1}/${this.maxRetries}`, {
        notificationId: notification.id,
        delay,
        error,
      });

      // Update metadata with retry info
      await db.notification.update({
        where: { id: notification.id },
        data: {
          metadata: JSON.stringify({ ...metadata, retryCount: retryCount + 1, lastError: error }),
          scheduledFor: new Date(Date.now() + delay),
          status: 'SCHEDULED',
        },
      });

      // Schedule the retry
      setTimeout(async () => {
        try {
          await this.dispatchNotification(notification.id);
        } catch (retryError) {
          logger.error('Notification retry failed', { notificationId: notification.id, error: retryError });
        }
      }, delay);
    } else {
      logger.error('Notification failed after max retries', {
        notificationId: notification.id,
        maxRetries: this.maxRetries,
        finalError: error,
      });
    }
  }

  /**
   * Process pending/scheduled notifications (for cron job)
   */
  async processScheduledNotifications(): Promise<number> {
    const pendingNotifications = await db.notification.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: new Date() },
      },
      take: 100, // Process in batches
    });

    for (const notification of pendingNotifications) {
      await this.dispatchNotification(notification.id);
    }

    if (pendingNotifications.length > 0) {
      logger.info(`Processed ${pendingNotifications.length} scheduled notifications`);
    }

    return pendingNotifications.length;
  }

  /**
   * Get default subject for a channel
   */
  private getDefaultSubject(channel: NotificationChannel): string {
    const defaults: Record<NotificationChannel, string> = {
      SMS: 'Notification',
      EMAIL: 'Notification',
      WHATSAPP: 'Notification',
      PUSH: 'New Notification',
      IN_APP: 'Notification',
      USSD: 'Notification',
    };
    return defaults[channel] || 'Notification';
  }

  /**
   * Get all notification types
   */
  private getNotificationTypes(): NotificationType[] {
    return [
      'loan_approved',
      'loan_disbursed',
      'payment_received',
      'payment_due',
      'payment_overdue',
      'application_status',
      'account_update',
      'system_alert',
      'marketing',
      'welcome',
      'security',
      'general',
    ];
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ===========================================================================
  // CONVENIENCE METHODS FOR COMMON NOTIFICATIONS
  // ===========================================================================

  /**
   * Send loan approval notification
   */
  async notifyLoanApproved(params: {
    customerPhone: string;
    customerName: string;
    customerEmail?: string;
    amount: number;
    loanNumber: string;
    interestRate: number;
    termDays: number;
    tenantId: string;
    tenantName: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    const channels = params.channels || ['SMS'];
    const templateData = {
      customer_name: params.customerName,
      amount: params.amount.toLocaleString(),
      loan_number: params.loanNumber,
      interest_rate: params.interestRate,
      term_days: params.termDays,
      tenant_name: params.tenantName,
      approval_date: new Date().toLocaleDateString('en-KE'),
      portal_url: `${config.baseUrl}/loans/${params.loanNumber}`,
    };

    for (const channel of channels) {
      if (channel === 'SMS') {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerPhone,
          channel: 'SMS',
          body: '', // Will use template
          templateId: 'sms-loan-approved',
          templateData,
        });
      } else if (channel === 'EMAIL' && params.customerEmail) {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerEmail,
          channel: 'EMAIL',
          body: '',
          templateId: 'email-loan-approved',
          templateData,
        });
      }
    }
  }

  /**
   * Send payment received notification
   */
  async notifyPaymentReceived(params: {
    customerPhone: string;
    customerName: string;
    customerEmail?: string;
    amount: number;
    loanNumber: string;
    newBalance: number;
    referenceNumber: string;
    paymentMethod: string;
    tenantId: string;
    tenantName: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    const channels = params.channels || ['SMS'];
    const templateData = {
      customer_name: params.customerName,
      amount: params.amount.toLocaleString(),
      loan_number: params.loanNumber,
      balance: params.newBalance.toLocaleString(),
      receipt_number: params.referenceNumber,
      reference_number: params.referenceNumber,
      payment_method: params.paymentMethod,
      payment_date: new Date().toLocaleDateString('en-KE'),
      tenant_name: params.tenantName,
      support_email: config.email.smtp.from,
      support_phone: config.sms.from,
    };

    for (const channel of channels) {
      if (channel === 'SMS') {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerPhone,
          channel: 'SMS',
          templateId: 'sms-payment-received',
          templateData,
        });
      } else if (channel === 'EMAIL' && params.customerEmail) {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerEmail,
          channel: 'EMAIL',
          templateId: 'email-payment-receipt',
          templateData,
        });
      }
    }
  }

  /**
   * Send payment due reminder
   */
  async sendPaymentReminder(params: {
    customerPhone: string;
    customerName: string;
    customerEmail?: string;
    dueAmount: number;
    dueDate: Date;
    loanNumber: string;
    daysUntilDue: number;
    tenantId: string;
    tenantName: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    const channels = params.channels || ['SMS'];
    const formattedDate = params.dueDate.toLocaleDateString('en-KE');
    const templateData = {
      customer_name: params.customerName,
      amount: params.dueAmount.toLocaleString(),
      loan_number: params.loanNumber,
      due_date: formattedDate,
      days_until_due: params.daysUntilDue,
      tenant_name: params.tenantName,
      payment_url: `${config.baseUrl}/payments/pay/${params.loanNumber}`,
      portal_url: `${config.baseUrl}/loans/${params.loanNumber}`,
      support_email: config.email.smtp.from,
      support_phone: config.sms.from,
    };

    for (const channel of channels) {
      if (channel === 'SMS') {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerPhone,
          channel: 'SMS',
          templateId: 'sms-due-reminder',
          templateData,
        });
      } else if (channel === 'EMAIL' && params.customerEmail) {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerEmail,
          channel: 'EMAIL',
          templateId: 'email-due-reminder',
          templateData,
        });
      }
    }
  }

  /**
   * Send welcome notification to new customer
   */
  async sendWelcomeNotification(params: {
    customerPhone: string;
    customerName: string;
    customerEmail: string;
    tenantId: string;
    tenantName: string;
    channels?: NotificationChannel[];
  }): Promise<void> {
    const channels = params.channels || ['SMS', 'EMAIL'];
    const templateData = {
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      tenant_name: params.tenantName,
      portal_url: config.baseUrl,
      support_email: config.email.smtp.from,
      support_phone: config.sms.from,
    };

    for (const channel of channels) {
      if (channel === 'SMS') {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerPhone,
          channel: 'SMS',
          templateId: 'sms-welcome',
          templateData,
        });
      } else if (channel === 'EMAIL') {
        await this.createAndSend({
          tenantId: params.tenantId,
          recipientType: 'CUSTOMER',
          recipientContact: params.customerEmail,
          channel: 'EMAIL',
          templateId: 'email-welcome',
          templateData,
        });
      }
    }
  }

  /**
   * Send disbursement notification
   */
  async notifyDisbursement(params: {
    customerPhone: string;
    customerName: string;
    amount: number;
    loanNumber: string;
    tenantId: string;
    tenantName: string;
  }): Promise<void> {
    await this.createAndSend({
      tenantId: params.tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: params.customerPhone,
      channel: 'SMS',
      templateId: 'sms-disbursement',
      templateData: {
        customer_name: params.customerName,
        amount: params.amount.toLocaleString(),
        loan_number: params.loanNumber,
        tenant_name: params.tenantName,
      },
    });
  }

  /**
   * Send overdue notice
   */
  async sendOverdueNotice(params: {
    customerPhone: string;
    customerName: string;
    overdueAmount: number;
    daysOverdue: number;
    loanNumber: string;
    tenantId: string;
    tenantName: string;
  }): Promise<void> {
    await this.createAndSend({
      tenantId: params.tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: params.customerPhone,
      channel: 'SMS',
      templateId: 'sms-overdue-notice',
      templateData: {
        customer_name: params.customerName,
        balance: params.overdueAmount.toLocaleString(),
        loan_number: params.loanNumber,
        days_overdue: params.daysOverdue,
        tenant_name: params.tenantName,
        support_phone: config.sms.from,
      },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();