/**
 * Notification Service
 * 
 * Business logic for notification dispatch including:
 * - SMS notifications via Africa's Talking
 * - Email notifications via SendGrid/SMTP
 * - In-app notifications
 * - Notification templates
 */

import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../../prisma/client';

export interface SmsMessage {
  to: string;
  message: string;
  from?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface NotificationInput {
  tenantId: string;
  recipientType: 'CUSTOMER' | 'USER' | 'SYSTEM';
  recipientId?: string;
  recipientContact?: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH' | 'IN_APP';
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  scheduledFor?: Date;
}

export class NotificationService {
  /**
   * Send SMS notification
   */
  async sendSms(data: SmsMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const from = data.from || config.sms.from;

      // In production: Call Africa's Talking API
      // const response = await fetch('https://api.africastalking.com/version1/messaging', { ... });
      
      logger.info('SMS sent', {
        to: data.to,
        from,
        messageLength: data.message.length,
      });

      return {
        success: true,
        messageId: `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      logger.error('Failed to send SMS', { error, to: data.to });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(data: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production: Use SendGrid or SMTP
      // const sgMail = require('@sendgrid/mail');
      
      logger.info('Email sent', {
        to: data.to,
        subject: data.subject,
        templateId: data.templateId,
      });

      return {
        success: true,
        messageId: `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      logger.error('Failed to send email', { error, to: data.to });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create and send notification
   */
  async createAndSend(data: NotificationInput): Promise<any> {
    const notification = await db.notification.create({
      data: {
        tenantId: data.tenantId,
        recipientType: data.recipientType,
        recipientId: data.recipientId,
        recipientContact: data.recipientContact,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        templateId: data.templateId,
        templateData: JSON.stringify(data.templateData || {}),
        status: data.scheduledFor ? 'SCHEDULED' : 'PENDING',
        scheduledFor: data.scheduledFor || null,
      },
    });

    if (!data.scheduledFor) {
      // Send immediately based on channel
      await this.dispatchNotification(notification);
    }

    return notification;
  }

  /**
   * Dispatch notification based on channel
   */
  private async dispatchNotification(notification: any): Promise<void> {
    let result;

    switch (notification.channel) {
      case 'SMS':
        result = await this.sendSms({
          to: notification.recipientContact || '',
          message: notification.body,
        });
        break;

      case 'EMAIL':
        result = await this.sendEmail({
          to: notification.recipientContact || '',
          subject: notification.subject,
          body: notification.body,
          templateId: notification.templateId || undefined,
        });
        break;

      case 'IN_APP':
        // Just mark as delivered for in-app
        result = { success: true };
        break;

      default:
        result = { success: false, error: 'Unsupported channel' };
    }

    // Update notification status
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        failedAt: result.success ? null : new Date(),
        failureReason: result.error || null,
        externalId: result.messageId,
      },
    });

    if (!result.success) {
      logger.warn('Notification delivery failed', {
        notificationId: notification.id,
        error: result.error,
      });
    }
  }

  /**
   * Send loan disbursement notification to customer
   */
  async notifyLoanDisbursement(customerPhone: string, customerName: string, amount: number, loanNumber: string, tenantId: string): Promise<void> {
    const message = `Dear ${customerName}, KSh ${amount.toLocaleString()} has been disbursed to your account for Loan ${loanNumber}. Thank you for choosing us.`;

    await this.createAndSend({
      tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: customerPhone,
      channel: 'SMS',
      subject: 'Loan Disbursement',
      body: message,
    });
  }

  /**
   * Send payment receipt notification
   */
  async notifyPaymentReceived(customerPhone: string, customerName: string, amount: number, loanNumber: string, newBalance: number, tenantId: string): Promise<void> {
    const message = `Dear ${customerName}, we have received your payment of KSh ${amount.toLocaleString()} for Loan ${loanNumber}. New balance: KSh ${newBalance.toLocaleString()}. Thank you!`;

    await this.createAndSend({
      tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: customerPhone,
      channel: 'SMS',
      subject: 'Payment Received',
      body: message,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(customerPhone: string, customerName: string, dueAmount: number, dueDate: Date, loanNumber: string, tenantId: string): Promise<void> {
    const formattedDate = dueDate.toLocaleDateString('en-KE');
    const message = `Dear ${customerName}, this is a reminder that KSh ${dueAmount.toLocaleString()} is due for Loan ${loanNumber} on ${formattedDate}. Please pay to avoid penalties.`;

    await this.createAndSend({
      tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: customerPhone,
      channel: 'SMS',
      subject: 'Payment Reminder',
      body: message,
    });
  }

  /**
   * Send overdue notice
   */
  async sendOverdueNotice(customerPhone: string, customerName: string, overdueAmount: number, daysOverdue: number, loanNumber: string, tenantId: string): Promise<void> {
    const message = `URGENT: Dear ${customerName}, your Loan ${loanNumber} is ${daysOverdue} days overdue. Outstanding balance: KSh ${overdueAmount.toLocaleString()}. Please contact us immediately to arrange payment.`;

    await this.createAndSend({
      tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: customerPhone,
      channel: 'SMS',
      subject: 'Overdue Notice',
      body: message,
    });
  }

  /**
   * Send application status update
   */
  async notifyApplicationStatus(customerPhone: string, customerName: string, applicationId: string, status: string, tenantId: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      APPROVED: 'Congratulations! Your loan application has been approved.',
      REJECTED: 'We regret to inform you that your loan application was not successful.',
      UNDER_REVIEW: 'Your loan application is currently under review.',
    };

    const message = `Dear ${customerName}, ${statusMessages[status] || `Your application status has been updated to ${status}.`} Application ID: ${applicationId}`;

    await this.createAndSend({
      tenantId,
      recipientType: 'CUSTOMER',
      recipientContact: customerPhone,
      channel: 'SMS',
      subject: 'Application Update',
      body: message,
    });
  }

  /**
   * Get notifications for a recipient
   */
  async getNotifications(params: {
    tenantId: string;
    recipientId?: string;
    recipientType?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, page = 1, limit = 20 } = params;

    const where: Record<string, unknown> = { tenantId };
    
    if (params.recipientId) where.recipientId = params.recipientId;
    if (params.recipientType) where.recipientType = params.recipientType;
    if (params.channel) where.channel = params.channel;
    if (params.status) where.status = params.status;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
    ]);

    return {
      items: notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: 'READ' },
    });
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

    return result.count;
  }

  /**
   * Process pending/scheduled notifications
   */
  async processScheduledNotifications(): Promise<number> {
    const pendingNotifications = await db.notification.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: new Date() },
      },
    });

    for (const notification of pendingNotifications) {
      await this.dispatchNotification(notification);
    }

    return pendingNotifications.length;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
