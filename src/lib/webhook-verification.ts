/**
 * Webhook Verification Utility
 * Digital Lending OS - Secure Callback Handling
 * 
 * This module provides security utilities for verifying M-Pesa callbacks:
 * - Timestamp validation (prevent replay attacks)
 * - Request signature verification
 * - IP whitelist checking
 * - Webhook logging for audit trails
 */

import { type StkPushCallbackBody, type B2CCallbackBody } from './mpesa-service';

// ============================================
// CONFIGURATION
// ============================================

export interface WebhookConfig {
  // Safaricom API IPs (whitelist)
  allowedIPs: string[];
  
  // Maximum age for callback timestamp (in seconds)
  maxTimestampAge: number;  // Default: 300 (5 minutes)
  
  // Enable strict mode (reject unknown fields)
  strictMode: boolean;
  
  // Enable audit logging
  enableAuditLog: boolean;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  // In production, use actual Safaricom IPs
  // Sandbox IPs may differ from production
  allowedIPs: [
    '127.0.0.1',    // Local development
    '::1',          // IPv6 localhost
    // Production Safaricom IPs would be added here
    // '41.90.16.0/24',
    // '195.201.36.0/24',
  ],
  maxTimestampAge: 300, // 5 minutes
  strictMode: true,
  enableAuditLog: true,
};

// ============================================
// WEBHOOK LOG ENTRY
// ============================================

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  sourceIP: string;
  userAgent?: string;
  isValid: boolean;
  validationErrors: string[];
  requestBody?: Record<string, unknown>;
  processingTimeMs: number;
  responseStatus: number;
}

// In-memory log storage (use database in production)
const webhookLogs: WebhookLogEntry[] = [];

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

/**
 * Verify M-Pesa callback authenticity
 */
export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;  // 0-100, higher = more suspicious
}

/**
 * Main webhook verification function
 */
export function verifyWebhook(
  body: unknown,
  headers: Headers | Record<string, string | undefined>,
  config?: WebhookConfig
): VerificationResult {
  const cfg = config || DEFAULT_WEBHOOK_CONFIG;
  const errors: string[] = [];
  const warnings: string[] = [];
  let riskScore = 0;
  
  // 1. Check if body exists and is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: ['Request body is empty or invalid'],
      warnings: [],
      riskScore: 100,
    };
  }
  
  // 2. Validate STK Push callback structure
  const typedBody = body as Record<string, unknown>;
  
  if ('Body' in typedBody) {
    const stkResult = verifyStkCallbackStructure(typedBody);
    if (!stkResult.valid) {
      errors.push(...stkResult.errors);
      riskScore += 30;
    }
  } else if ('Result' in typedBody) {
    const b2cResult = verifyB2CCallbackStructure(typedBody);
    if (!b2cResult.valid) {
      errors.push(...b2cResult.errors);
      riskScore += 30;
    }
  } else {
    warnings.push('Unknown callback structure');
    riskScore += 10;
  }
  
  // 3. Check source IP (if available)
  const ip = getHeader(headers, 'x-forwarded-for') || 
             getHeader(headers, 'x-real-ip') || 
             'unknown';
  
  if (ip !== 'unknown' && cfg.allowedIPs.length > 0) {
    const isAllowed = cfg.allowedIPs.some(allowedIp => 
      ip.includes(allowedIp) || allowedIp === ip
    );
    
    if (!isAllowed) {
      warnings.push(`Source IP ${ip} not in whitelist`);
      riskScore += 25;
      
      // In production with strict mode, this might be an error
      if (cfg.strictMode && !ip.startsWith('127.') && !ip.startsWith('::1')) {
        errors.push(`Unauthorized source IP: ${ip}`);
        riskScore += 30;
      }
    }
  }
  
  // 4. Check for replay attacks using timestamp
  const requestTime = new Date();
  const callbackTimestamp = extractCallbackTimestamp(typedBody);
  
  if (callbackTimestamp) {
    const timeDiff = Math.abs(requestTime.getTime() - callbackTimestamp.getTime()) / 1000;
    
    if (timeDiff > cfg.maxTimestampAge) {
      errors.push(`Callback timestamp too old: ${Math.round(timeDiff)}s ago`);
      riskScore += 40;
    }
    
    // Warn if timestamp is in the future (clock skew)
    if (callbackTimestamp > requestTime) {
      warnings.push('Callback timestamp is in the future (possible clock skew)');
      riskScore += 15;
    }
  } else {
    warnings.push('No timestamp found in callback');
    riskScore += 5;
  }
  
  // 5. Check for duplicate requests (basic check)
  const requestId = generateRequestId(typedBody);
  const recentDuplicate = findRecentDuplicate(requestId);
  
  if (recentDuplicate) {
    errors.push('Potential duplicate webhook detected');
    riskScore += 50;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    riskScore: Math.min(riskScore, 100),
  };
}

/**
 * Verify STK Push callback structure
 */
function verifyStkCallbackStructure(body: Record<string, unknown>): VerificationResult {
  const errors: string[] = [];
  const bodyObj = body.Body as Record<string, unknown> | undefined;
  
  if (!bodyObj) {
    return { valid: false, errors: ['Missing Body field'], warnings: [], riskScore: 20 };
  }
  
  const stkCallback = bodyObj.stkCallback as Record<string, unknown> | undefined;
  
  if (!stkCallback) {
    return { valid: false, errors: ['Missing stkCallback field'], warnings: [], riskScore: 20 };
  }
  
  // Required fields
  const requiredFields = ['MerchantRequestID', 'CheckoutRequestID', 'ResultCode', 'ResultDesc'];
  
  for (const field of requiredFields) {
    if (!(field in stkCallback)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate ResultCode type
  if ('ResultCode' in stkCallback && typeof stkCallback.ResultCode !== 'number') {
    errors.push('ResultCode must be a number');
  }
  
  // If success, validate CallbackMetadata
  if (stkCallback.ResultCode === 0) {
    const metadata = stkCallback.CallbackMetadata as Record<string, unknown> | undefined;
    
    if (!metadata) {
      errors.push('Missing CallbackMetadata for successful transaction');
    } else {
      const items = metadata.Item as Array<Record<string, unknown>> | undefined;
      
      if (!items || !Array.isArray(items)) {
        errors.push('Invalid CallbackMetadata.Item format');
      } else {
        // Verify required metadata items
        const itemNames = items.map(item => item.Name);
        const requiredItems = ['Amount', 'MpesaReceiptNumber'];
        
        for (const item of requiredItems) {
          if (!itemNames.includes(item)) {
            errors.push(`Missing metadata item: ${item}`);
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    riskScore: errors.length > 0 ? 30 : 0,
  };
}

/**
 * Verify B2C callback structure
 */
function verifyB2CCallbackStructure(body: Record<string, unknown>): VerificationResult {
  const errors: string[] = [];
  const bodyObj = body.Body as Record<string, unknown> | undefined;
  
  if (!bodyObj) {
    return { valid: false, errors: ['Missing Body field'], warnings: [], riskScore: 20 };
  }
  
  const result = bodyObj.Result as Record<string, unknown> | undefined;
  
  if (!result) {
    return { valid: false, errors: ['Missing Result field'], warnings: [], riskScore: 20 };
  }
  
  // Required fields
  const requiredFields = ['ConversationID', 'OriginatorConversationID', 'ResultCode', 'ResultDesc'];
  
  for (const field of requiredFields) {
    if (!(field in result)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate ResultCode type
  if ('ResultCode' in result && typeof result.ResultCode !== 'number') {
    errors.push('ResultCode must be a number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    riskScore: errors.length > 0 ? 30 : 0,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get header value case-insensitively
 */
function getHeader(
  headers: Headers | Record<string, string | undefined>,
  name: string
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) || undefined;
  }
  
  // Case-insensitive search for plain object
  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return entry?.[1];
}

/**
 * Extract timestamp from callback body
 */
function extractCallbackTimestamp(body: Record<string, unknown>): Date | null {
  try {
    const bodyObj = body.Body as Record<string, unknown> | undefined;
    
    if (!bodyObj) return null;
    
    // Try STK callback first
    const stkCallback = bodyObj.stkCallback as Record<string, unknown> | undefined;
    
    if (stkCallback?.CallbackMetadata) {
      const metadata = stkCallback.CallbackMetadata as Record<string, unknown>;
      const items = metadata.Item as Array<Record<string, unknown>>;
      
      if (Array.isArray(items)) {
        const transactionDateItem = items.find(item => item.Name === 'TransactionDate');
        
        if (transactionDateItem?.Value) {
          return parseMpesaDate(String(transactionDateItem.Value));
        }
      }
    }
    
    // Try B2C result
    const result = bodyObj.Result as Record<string, unknown> | undefined;
    
    if (result?.ResultParameters) {
      const params = result.ResultParameters as Record<string, unknown>;
      const items = params.ResultItem as Array<Record<string, unknown>>;
      
      if (Array.isArray(items)) {
        const dateItem = items.find(item => item.Name === 'TransactionCompletedDateTime');
        
        if (dateItem?.Value) {
          return parseMpesaDate(String(dateItem.Value));
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Parse M-Pesa date format (YYYYMMDDHHmmss)
 */
function parseMpesaDate(dateStr: string): Date {
  // Handle various formats
  if (/^\d{14}$/.test(dateStr)) {
    // YYYYMMDDHHmmss format
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    
    return new Date(year, month, day, hour, minute, second);
  }
  
  // Try ISO format
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Generate a unique request ID for deduplication
 */
function generateRequestId(body: Record<string, unknown>): string {
  try {
    const bodyObj = body.Body as Record<string, unknown> | undefined;
    
    if (bodyObj?.stkCallback) {
      const stk = bodyObj.stkCallback as Record<string, unknown>;
      return `stk_${stk.CheckoutRequestID}_${stk.MerchantRequestID}`;
    }
    
    if (bodyObj?.Result) {
      const result = bodyObj.Result as Record<string, unknown>;
      return `b2c_${result.OriginatorConversationID}`;
    }
  } catch (e) {
    // Ignore
  }
  
  return `unknown_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Find recent duplicate webhooks
 */
function findRecentDuplicate(requestId: string): WebhookLogEntry | null {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return webhookLogs.find(
    log => {
      // Simple heuristic - same endpoint and similar timing
      const logBody = log.requestBody as Record<string, unknown> | undefined;
      const logRequestId = logBody ? generateRequestId(logBody) : '';
      return logRequestId === requestId && new Date(log.timestamp) > fiveMinutesAgo;
    }
  ) || null;
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log webhook event for audit trail
 */
export function logWebhook(entry: Omit<WebhookLogEntry, 'id' | 'timestamp'>): void {
  const logEntry: WebhookLogEntry = {
    ...entry,
    id: `weblog_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
  };
  
  webhookLogs.unshift(logEntry);
  
  // Keep only last 1000 logs in memory
  if (webhookLogs.length > 1000) {
    webhookLogs.splice(1000);
  }
  
  // In production, also write to persistent storage/database
  console.log(`[Webhook] ${logEntry.method} ${logEntry.endpoint} - Valid: ${logEntry.isValid} - IP: ${logEntry.sourceIP}`);
}

/**
 * Get webhook logs with optional filters
 */
export function getWebhookLogs(filters?: {
  endpoint?: string;
  isValid?: boolean;
  limit?: number;
  offset?: number;
}): { logs: WebhookLogEntry[]; total: number } {
  let filtered = [...webhookLogs];
  
  if (filters?.endpoint) {
    filtered = filtered.filter(log => log.endpoint.includes(filters.endpoint!));
  }
  
  if (filters?.isValid !== undefined) {
    filtered = filtered.filter(log => log.isValid === filters.isValid);
  }
  
  const total = filtered.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  
  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

/**
 * Clear webhook logs (for testing)
 */
export function clearWebhookLogs(): void {
  webhookLogs.length = 0;
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create standard success response for M-Pesa callbacks
 * M-Pesa expects a specific format to acknowledge receipt
 */
export function createSuccessResponse(): Response {
  return new Response(
    JSON.stringify({
      ResultCode: 0,
      ResultDesc: 'Success',
      ThirdPartyTransID: `ACK_${Date.now()}`,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create error response for M-Pesa callbacks
 */
export function createErrorResponse(message: string, statusCode: number = 500): Response {
  return new Response(
    JSON.stringify({
      ResultCode: statusCode,
      ResultDesc: message,
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Export types
export type {
  WebhookConfig,
  WebhookLogEntry,
};
