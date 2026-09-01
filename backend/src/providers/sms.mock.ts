/**
 * SMS Mock Provider
 * 
 * Development provider that logs SMS instead of actually sending.
 * In production, this would be replaced with Africa's Talking, Twilio, or InfoBip.
 */

import { logger } from '../utils/logger';

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  provider: string;
}

export interface SmsProviderConfig {
  apiKey?: string;
  username?: string;
  from?: string;
  shortCode?: string;
}

interface SmsMessage {
  to: string;
  message: string;
  from?: string;
}

interface BulkSmsResult {
  total: number;
  success: number;
  failed: number;
  results: SmsResult[];
}

/**
 * Mock SMS Provider for development
 * Logs all SMS messages instead of sending them
 */
export class SmsMockProvider {
  private config: SmsProviderConfig;
  private messageLog: Array<SmsMessage & { id: string; timestamp: Date }> = [];

  constructor(config?: Partial<SmsProviderConfig>) {
    this.config = {
      apiKey: config?.apiKey || 'mock-api-key',
      username: config?.username || 'mock-user',
      from: config?.from || 'DLOS',
      shortCode: config?.shortCode || '20501',
    };
  }

  /**
   * Send a single SMS message
   */
  async sendSms(message: SmsMessage): Promise<SmsResult> {
    const messageId = `SMS-MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const from = message.from || this.config.from;

    // Log the message for debugging
    const logEntry = { ...message, id: messageId, timestamp: new Date() };
    this.messageLog.push(logEntry);

    logger.info('[SMS MOCK] Message sent', {
      messageId,
      to: message.to,
      from,
      messageLength: message.message.length,
      messagePreview: message.message.substring(0, 100),
    });

    console.log('\n========== SMS MOCK OUTPUT ==========');
    console.log(`To: ${message.to}`);
    console.log(`From: ${from}`);
    console.log(`Message ID: ${messageId}`);
    console.log(`Message: ${message.message}`);
    console.log('======================================\n');

    return {
      success: true,
      messageId,
      cost: 0,
      provider: 'mock',
    };
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSms(messages: Array<{ to: string; message: string }>): Promise<BulkSmsResult> {
    const results: SmsResult[] = [];

    for (const msg of messages) {
      const result = await this.sendSms(msg);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    logger.info('[SMS MOCK] Bulk send completed', {
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
   * Check delivery status of a message
   */
  async checkDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'failed' | 'pending';
    deliveredAt?: Date;
    error?: string;
  }> {
    // In mock mode, we always return delivered
    return {
      status: 'delivered',
      deliveredAt: new Date(),
    };
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
  getProviderInfo(): { name: string; type: string; config: Partial<SmsProviderConfig> } {
    return {
      name: 'SMS Mock Provider',
      type: 'mock',
      config: { ...this.config, apiKey: '***' },
    };
  }
}

// Export singleton instance
export const smsMockProvider = new SmsMockProvider();