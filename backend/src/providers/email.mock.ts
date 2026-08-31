/**
 * Email Mock Provider
 * 
 * Development provider that logs emails instead of actually sending.
 * In production, this would be replaced with SendGrid, AWS SES, or SMTP.
 */

import { logger } from '../utils/logger';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProviderConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  from?: string;
  fromName?: string;
  sendgridApiKey?: string;
  sesRegion?: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface BulkEmailResult {
  total: number;
  success: number;
  failed: number;
  results: EmailResult[];
}

/**
 * Mock Email Provider for development
 * Logs all email messages instead of sending them
 */
export class EmailMockProvider {
  private config: EmailProviderConfig;
  private messageLog: Array<EmailMessage & { id: string; timestamp: Date }> = [];

  constructor(config?: Partial<EmailProviderConfig>) {
    this.config = {
      smtpHost: config?.smtpHost || 'smtp.mock.local',
      smtpPort: config?.smtpPort || 587,
      smtpUser: config?.smtpUser || 'mock@digitallendingos.com',
      smtpPass: config?.smtpPass || 'mock-password',
      from: config?.from || 'noreply@digitallendingos.com',
      fromName: config?.fromName || 'Digital Lending OS',
    };
  }

  /**
   * Send a single email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const messageId = `EMAIL-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const from = message.from || `${this.config.fromName} <${this.config.from}>`;

    // Log the message for debugging
    const logEntry = { ...message, id: messageId, timestamp: new Date() };
    this.messageLog.push(logEntry);

    logger.info('[EMAIL MOCK] Email sent', {
      messageId,
      to: message.to,
      subject: message.subject,
      hasHtml: !!message.html,
      hasAttachments: (message.attachments?.length || 0) > 0,
    });

    console.log('\n========== EMAIL MOCK OUTPUT ==========');
    console.log(`To: ${message.to}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Message ID: ${messageId}`);
    if (message.cc) console.log(`CC: ${message.cc.join(', ')}`);
    if (message.bcc) console.log(`BCC: ${message.bcc.join(', ')}`);
    console.log('--- HTML Preview ---');
    console.log(message.html || message.body);
    console.log('========================================\n');

    return {
      success: true,
      messageId,
      provider: 'mock',
    };
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(messages: Array<{
    to: string;
    subject: string;
    body: string;
    html?: string;
  }>): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];

    for (const msg of messages) {
      const result = await this.sendEmail(msg);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    logger.info('[EMAIL MOCK] Bulk send completed', {
      total: messages.length,
      success: successCount,
      failed: failedCount,
    });

    return {
      total: messages.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Track email open (simulated in mock)
   */
  async trackOpen(messageId: string): Promise<{ opened: boolean; openedAt: Date }> {
    logger.info('[EMAIL MOCK] Open tracked', { messageId });
    return { opened: true, openedAt: new Date() };
  }

  /**
   * Track email click (simulated in mock)
   */
  async trackClick(messageId: string, linkUrl: string): Promise<{ clicked: boolean; clickedAt: Date; link: string }> {
    logger.info('[EMAIL MOCK] Click tracked', { messageId, linkUrl });
    return { clicked: true, clickedAt: new Date(), link: linkUrl };
  }

  /**
   * Handle bounce (simulated in mock)
   */
  async handleBounce(messageId: string, reason: string): Promise<{ bounced: boolean; bounceReason: string }> {
    logger.warn('[EMAIL MOCK] Bounce recorded', { messageId, reason });
    return { bounced: true, bounceReason: reason };
  }

  /**
   * Get message log (useful for testing)
   */
  getMessageLog(): typeof this.messageLog {
    return [...this.messageLog];
  }

  /**
   * Clear message log
   */
  clearLog(): void {
    this.messageLog = [];
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string; type: string; config: Partial<EmailProviderConfig> } {
    return {
      name: 'Email Mock Provider',
      type: 'mock',
      config: { ...this.config, smtpPass: '***', sendgridApiKey: '***' },
    };
  }
}

// Export singleton instance
export const emailMockProvider = new EmailMockProvider();