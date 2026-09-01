/**
 * M-Pesa Utility Functions
 * Digital Lending OS - Kenyan DCP Payment Gateway
 * 
 * Core utilities for Safaricom Daraja API integration:
 * - Password generation for API authentication
 * - Timestamp formatting
 * - Phone number normalization & validation
 * - Security credential generation
 */

import crypto from 'crypto';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface MpesaConfig {
  /** Safaricom Developer Portal Consumer Key */
  consumerKey: string;
  /** Safaricom Developer Portal Consumer Secret */
  consumerSecret: string;
  /** Business Passkey (from Safaricom portal) */
  passkey: string;
  /** Business Short Code / Paybill Number / Till Number */
  shortCode: string;
  /** Initiator password (for B2C operations) */
  initiatorPassword: string;
  /** Encrypted security credential (for B2C operations) */
  securityCredential: string;
  /** Environment: sandbox or production */
  environment: 'sandbox' | 'production';
  /** Base URL for callback webhooks */
  callbackBaseUrl: string;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/** Default configuration values (can be overridden via environment variables) */
export const defaultMpesaConfig: MpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  passkey: process.env.MPESA_PASSKEY || '',
  shortCode: process.env.MPESA_SHORT_CODE || '174379',
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD || '',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  callbackBaseUrl: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/payments',
};

// =============================================================================
// TIMESTAMP UTILITIES
// =============================================================================

/**
 * Generate current timestamp in the format required by Safaricom API.
 * Format: YYYYMMDDHHmmss (e.g., 20260820153045)
 * 
 * @returns Formatted timestamp string
 * 
 * @example
 * ```typescript
 * const timestamp = getTimestamp(); // "20260820153045"
 * ```
 */
export function getTimestamp(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Parse a Safaricom timestamp string into a JavaScript Date object.
 * 
 * @param timestamp - Timestamp in YYYYMMDDHHmmss format
 * @returns Parsed Date object
 */
export function parseTimestamp(timestamp: string): Date {
  // Handle YYYYMMDDHHmmss format
  if (/^\d{14}$/.test(timestamp)) {
    return new Date(
      parseInt(timestamp.substring(0, 4)),       // year
      parseInt(timestamp.substring(4, 6)) - 1,   // month (0-indexed)
      parseInt(timestamp.substring(6, 8)),       // day
      parseInt(timestamp.substring(8, 10)),      // hours
      parseInt(timestamp.substring(10, 12)),     // minutes
      parseInt(timestamp.substring(12, 14))      // seconds
    );
  }
  
  // Fallback to standard date parsing
  return new Date(timestamp);
}

// =============================================================================
// PASSWORD GENERATION
// =============================================================================

/**
 * Generate the base64-encoded password required for STK Push authentication.
 * The password is created by encoding: ShortCode + PassKey + Timestamp
 * 
 * @param shortCode - Business short code / paybill / till number
 * @param passkey - Business passkey from Daraja portal
 * @param timestamp - Timestamp in YYYYMMDDHHmmss format (use getTimestamp())
 * @returns Base64-encoded password string
 * 
 * @example
 * ```typescript
 * const timestamp = getTimestamp();
 * const password = generatePassword('174379', 'your_passkey', timestamp);
 * ```
 */
export function generatePassword(
  shortCode: string,
  passkey: string,
  timestamp: string
): string {
  const rawPassword = `${shortCode}${passkey}${timestamp}`;
  return Buffer.from(rawPassword).toString('base64');
}

/**
 * Generate OAuth access token for Safaricom API authentication.
 * In production, this calls the Safaricom OAuth endpoint.
 * For development/sandbox, returns a mock token.
 * 
 * @param consumerKey - Developer portal consumer key
 * @param consumerSecret - Developer portal consumer secret
 * @param environment - 'sandbox' or 'production'
 * @returns Promise resolving to the access token string
 */
export async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  environment: 'sandbox' | 'production'
): Promise<string> {
  // In production, make actual API call:
  // const url = environment === 'production'
  //   ? 'https://api.safaricom.co.ke/oauth/v1/generate-grant?grant_type=client_credentials'
  //   : 'https://sandbox.safaricom.co.ke/oauth/v1/generate-grant?grant_type=client_credentials';
  
  // const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  // const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  // const data = await response.json();
  // return data.access_token;
  
  // For development/return mock token
  return `mock_access_token_${Date.now()}`;
}

// =============================================================================
// PHONE NUMBER UTILITIES
// =============================================================================

/** Valid M-Pesa phone number prefixes for Kenya */
const VALID_MPESA_PREFIXES = ['2547', '2541', '+2547', '+2541', '07', '01', '7', '1'];

/** Regex pattern for validating Kenyan phone numbers */
const KENYAN_PHONE_REGEX = /^(\+?254|0)?(7|1)\d{8}$/;

/**
 * Format/normalize a phone number to the standard M-Pesa format (254XXXXXXXXX).
 * Handles various input formats:
 * - +254712345678 → 254712345678
 * - 0712345678 → 254712345678
 * - 712345678 → 254712345678
 * - 254712345678 → 254712345678
 * 
 * @param phone - Phone number in any common format
 * @returns Normalized phone number in 254XXXXXXXXX format
 * 
 * @example
 * ```typescript
 * formatPhoneNumber('0712345678');    // "254712345678"
 * formatPhoneNumber('+254712345678'); // "254712345678"
 * formatPhoneNumber('712345678');     // "254712345678"
 * ```
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s\-\.()]/g, '');
  
  // Handle +254 prefix
  if (cleaned.startsWith('+254')) {
    cleaned = cleaned.replace('+', '');
    return cleaned;
  }
  
  // Handle 254 prefix (without +)
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  
  // Handle 0 prefix (local format)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  
  // Handle raw 9-digit number starting with 7 or 1
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return '254' + cleaned;
  }
  
  // Return as-is if already in correct format or unknown format
  return cleaned;
}

/**
 * Validate if a phone number is a valid Kenyan M-Pesa number.
 * Checks format and prefix validity.
 * 
 * @param phone - Phone number to validate
 * @returns true if valid M-Pesa phone number, false otherwise
 * 
 * @example
 * ```typescript
 * isValidMpesaPhone('254712345678'); // true
 * isValidMpesaPhone('0712345678');   // true
 * isValidMpesaPhone('123456789');   // false
 * ```
 */
export function isValidMpesaPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Normalize first
  const normalized = formatPhoneNumber(phone);
  
  // Check length (must be 12 digits after normalization)
  if (normalized.length !== 12) return false;
  
  // Must be all digits
  if (!/^\d+$/.test(normalized)) return false;
  
  // Must start with 254 followed by 7 or 1
  if (!normalized.startsWith('2547') && !normalized.startsWith('2541')) return false;
  
  return true;
}

/**
 * Mask a phone number for display purposes.
 * Shows only the first 5 and last 3 digits.
 * 
 * @param phone - Phone number to mask
 * @returns Masked phone number (e.g., "25471***678")
 * 
 * @example
 * ```typescript
 * maskPhoneNumber('254712345678'); // "25471***678"
 * ```
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 9) return phone || '';
  return phone.substring(0, 5) + '***' + phone.slice(-3);
}

/**
 * Format a phone number for display with proper spacing.
 * 
 * @param phone - Phone number in any format
 * @returns Nicely formatted phone number (e.g., "+254 712 345 678")
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = formatPhoneNumber(phone);
  if (normalized.length !== 12) return phone;
  
  return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
}

// =============================================================================
// SECURITY CREDENTIAL GENERATION (for B2C)
// =============================================================================

/**
 * Generate security credential for B2C API operations.
 * This is the base64 encoded version of the initiator password.
 * In production, use the actual Security Credential from the portal.
 * 
 * @param initiatorPassword - Initiator user's password
 * @returns Base64-encoded security credential
 */
export function generateSecurityCredential(initiatorPassword: string): string {
  return Buffer.from(initiatorPassword).toString('base64');
}

// =============================================================================
// TRANSACTION REFERENCE GENERATORS
// =============================================================================

/**
 * Generate a unique transaction reference number.
 * Format: TXN-YYYYMMDD-HHMMSS-RANDOM
 * 
 * @returns Unique transaction reference string
 */
export function generateTransactionRef(): string {
  const now = new Date();
  const datePart = now.toISOString().split('T')[0].replace(/-/g, '');
  const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `TXN-${datePart}-${timePart}-${random}`;
}

/**
 * Generate a unique CheckoutRequestID for STK Push.
 * 
 * @returns Unique checkout request ID
 */
export function generateCheckoutRequestID(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${timestamp}${random}`;
}

/**
 * Generate an M-Pesa receipt-style reference.
 * Format: QIK + 7 alphanumeric characters
 * 
 * @returns Receipt-like reference string
 */
export function generateMpesaReceiptNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QIK';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =============================================================================
// AMOUNT VALIDATION
// =============================================================================

/** Minimum amount for M-Pesa transactions (in KSh) */
export const MIN_AMOUNT = 10;

/** Maximum amount for STK Push transactions (in KSh) */
export const MAX_STK_PUSH_AMOUNT = 150000;

/** Maximum amount for B2C transactions (in KSh) */
export const MAX_B2C_AMOUNT = 150000;

/**
 * Validate that an amount is within acceptable range for M-Pesa transactions.
 * 
 * @param amount - Amount to validate
 * @param type - Type of transaction ('STK_PUSH' or 'B2C')
 * @returns Object with isValid flag and error message if invalid
 */
export function validateAmount(
  amount: number,
  type: 'STK_PUSH' | 'B2C' = 'STK_PUSH'
): { isValid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }
  
  if (amount < MIN_AMOUNT) {
    return { isValid: false, error: `Minimum amount is KSh ${MIN_AMOUNT.toLocaleString()}` };
  }
  
  const maxAmount = type === 'STK_PUSH' ? MAX_STK_PUSH_AMOUNT : MAX_B2C_AMOUNT;
  if (amount > maxAmount) {
    return { isValid: false, error: `Maximum amount is KSh ${maxAmount.toLocaleString()}` };
  }
  
  return { isValid: true };
}

// =============================================================================
// RESULT CODE HELPERS
// =============================================================================

/** Common M-Pesa result codes and their meanings */
export const MPESA_RESULT_CODES: Record<number, { description: string; category: 'success' | 'failed' | 'pending'; userMessage: string }> = {
  0: {
    description: 'Transaction successful',
    category: 'success',
    userMessage: 'Payment completed successfully!',
  },
  1: {
    description: 'Insufficient funds',
    category: 'failed',
    userMessage: 'You have insufficient funds in your M-Pesa account.',
  },
  2: {
    description: 'Cancelled by user',
    category: 'failed',
    userMessage: 'You cancelled this transaction.',
  },
  3: {
    description: 'Invalid amount',
    category: 'failed',
    userMessage: 'Invalid amount entered.',
  },
  4: {
    description: 'Invalid short code/paybill',
    category: 'failed',
    userMessage: 'Service configuration error. Please try again later.',
  },
  5: {
    description: 'Unable to locate account',
    category: 'failed',
    userMessage: 'Could not find your account. Please contact support.',
  },
  6: {
    description: 'Account balance is insufficient',
    category: 'failed',
    userMessage: 'Account has insufficient balance.',
  },
  7: {
    description: 'Could not debit account',
    category: 'failed',
    userMessage: 'Could not process deduction from your account.',
  },
  11: {
    description: 'Failed STK push',
    category: 'failed',
    userMessage: 'Failed to send prompt to your phone.',
  },
  15: {
    description: 'Target party is invalid',
    category: 'failed',
    userMessage: 'Recipient details are invalid.',
  },
  17: {
    description: 'Invalid security credential',
    category: 'failed',
    userMessage: 'Service temporarily unavailable.',
  },
  1017: {
    description: 'Request cancelled by user (timeout)',
    category: 'failed',
    userMessage: 'You took too long to enter your PIN. Please try again.',
  },
  1032: {
    description: 'Transaction cancelled',
    category: 'failed',
    userMessage: 'This transaction was cancelled.',
  },
  1036: {
    description: 'E-Sign failed / User is not mobile money subscribed',
    category: 'failed',
    userMessage: 'Your phone is not registered for M-Pesa.',
  },
  1037: {
    description: 'Timed out waiting for customer response',
    category: 'pending',
    userMessage: 'Transaction timed out while waiting for your response.',
  },
  2001: {
    description: 'Initiator password incorrect',
    category: 'failed',
    userMessage: 'Service configuration error.',
  },
  2003: {
    description: 'Initiator account limited',
    category: 'failed',
    userMessage: 'Service temporarily unavailable.',
  },
  2004: {
    description: 'Receiver account limited',
    category: 'failed',
    userMessage: 'Recipient account has limitations.',
  },
  2005: {
    description: 'Invalid receiver account',
    category: 'failed',
    userMessage: 'Invalid recipient details.',
  },
  2006: {
    description: 'Receiver account unavailable',
    category: 'failed',
    userMessage: 'Recipient account is currently unavailable.',
  },
  2007: {
    description: 'Duplicate transaction detected',
    category: 'failed',
    userMessage: 'This appears to be a duplicate request.',
  },
  2008: {
    description: 'Airtime exceeds daily limit',
    category: 'failed',
    userMessage: 'Daily airtime limit exceeded.',
  },
  2010: {
    description: 'Receiver not registered on M-Pesa',
    category: 'failed',
    userMessage: 'Recipient is not registered for M-Pesa.',
  },
  2011: {
    description: 'Quota exceeded',
    category: 'failed',
    userMessage: 'Transaction quota exceeded.',
  },
  2012: {
    description: 'Sender restricted from sending to receiver',
    category: 'failed',
    userMessage: 'Cannot send to this recipient due to restrictions.',
  },
  2013: {
    description: 'Rule limit reached',
    category: 'failed',
    userMessage: 'Transaction limit reached.',
  },
  2014: {
    description: 'Invalid rule setup',
    category: 'failed',
    userMessage: 'Service configuration error.',
  },
  2015: {
    description: 'Invalid reference id',
    category: 'failed',
    userMessage: 'Invalid transaction reference.',
  },
  2016: {
    description: 'Receiver unregistered for product',
    category: 'failed',
    userMessage: 'Recipient cannot receive this type of transaction.',
  },
  2017: {
    description: 'Should be float',
    category: 'failed',
    userMessage: 'Invalid amount format.',
  },
  2018: {
    description: 'Not enough funds to cover transaction',
    category: 'failed',
    userMessage: 'You have insufficient funds for this transaction.',
  },
  2024: {
    description: 'Invalid operator',
    category: 'failed',
    userMessage: 'Invalid service provider.',
  },
  2025: {
    description: 'Invalid receiver postpaid plan',
    category: 'failed',
    userMessage: 'Recipient plan does not support this transaction.',
  },
  2026: {
    description: 'Invalid currency',
    category: 'failed',
    userMessage: 'Currency not supported.',
  },
  2027: {
    description: 'Negative transaction amount',
    category: 'failed',
    userMessage: 'Invalid transaction amount.',
  },
  2028: {
    description: 'Server error',
    category: 'failed',
    userMessage: 'Service temporarily unavailable. Please try again.',
  },
  2035: {
    description: 'Unavailable receiver',
    category: 'failed',
    userMessage: 'Recipient is currently unavailable.',
  },
  2042: {
    description: 'CommandId not allowed',
    category: 'failed',
    userMessage: 'Transaction type not supported.',
  },
  2055: {
    description: 'Timeout processing request',
    category: 'pending',
    userMessage: 'Transaction timed out. Please check status later.',
  },
};

/**
 * Get human-readable information about an M-Pesa result code.
 * 
 * @param resultCode - Numeric result code from M-Pesa
 * @returns Object with description, category, and user-friendly message
 */
export function getResultCodeInfo(resultCode: number) {
  return (
    MPESA_RESULT_CODES[resultCode] || {
      description: 'Unknown error occurred',
      category: 'failed' as const,
      userMessage: 'An unexpected error occurred. Please contact support.',
    }
  );
}

// =============================================================================
// CALLBACK VALIDATION
// =============================================================================

/**
 * Validate the structure of an incoming STK Push callback.
 * Ensures all required fields are present.
 * 
 * @param body - Raw callback body from Safaricom
 * @returns Object indicating validity and any errors
 */
export function validateStkCallback(body: unknown): {
  valid: boolean;
  errors: string[];
  data?: {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResultCode: number;
    ResultDesc: string;
    CallbackMetadata?: {
      Item: Array<{ Name: string; Value: string | number }>;
    };
  };
} {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid callback body'] };
  }
  
  const callbackBody = body as Record<string, unknown>;
  
  if (!callbackBody.Body) {
    errors.push('Missing Body field');
    return { valid: false, errors };
  }
  
  const Body = callbackBody.Body as Record<string, unknown>;
  
  if (!Body.stkCallback) {
    errors.push('Missing stkCallback field');
    return { valid: false, errors };
  }
  
  const stkCallback = Body.stkCallback as Record<string, unknown>;
  
  if (!stkCallback.CheckoutRequestID) {
    errors.push('Missing CheckoutRequestID');
  }
  
  if (stkCallback.ResultCode === undefined || stkCallback.ResultCode === null) {
    errors.push('Missing ResultCode');
  }
  
  if (!stkCallback.ResultDesc) {
    errors.push('Missing ResultDesc');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    data: {
      MerchantRequestID: stkCallback.MerchantRequestID as string | undefined,
      CheckoutRequestID: stkCallback.CheckoutRequestID as string,
      ResultCode: stkCallback.ResultCode as number,
      ResultDesc: stkCallback.ResultDesc as string,
      CallbackMetadata: stkCallback.CallbackMetadata as {
        Item: Array<{ Name: string; Value: string | number }>;
      } | undefined,
    },
  };
}

/**
 * Validate the structure of a B2C result callback.
 * 
 * @param body - Raw callback body from Safaricom
 * @returns Object indicating validity and any errors
 */
export function validateB2CCallback(body: unknown): {
  valid: boolean;
  errors: string[];
  data?: {
    Result: {
      ResultType: number;
      ResultCode: number;
      ResultDesc: string;
      OriginatorConversationID: string;
      ConversationID: string;
      TransactionID: string;
      TransactionReason?: string;
      DebitAccountCurrentBalance?: string;
      CreditPartyPublicName?: string;
      DebitPartyPublicName?: string;
      TransactionAmount?: string;
      TransactionReceipt?: string;
      ReceiverItem?: {
        ReceivableType: string;
        ReceiverName: string;
        AccountNumber: string;
        ReceiverMSISDN: string;
        Amount: string;
        TransactionStatus: string;
        ReasonType: string;
        TransactionID: string;
      }[];
    };
  };
} {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid callback body'] };
  }
  
  const callbackBody = body as Record<string, unknown>;
  
  if (!callbackBody.Result) {
    errors.push('Missing Result field');
    return { valid: false, errors };
  }
  
  const Result = callbackBody.Result as Record<string, unknown>;
  
  if (!Result.ConversationID) {
    errors.push('Missing ConversationID');
  }
  
  if (Result.ResultCode === undefined || Result.ResultCode === null) {
    errors.push('Missing ResultCode');
  }
  
  if (!Result.TransactionID) {
    errors.push('Missing TransactionID');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    data: {
      Result: {
        ResultType: Result.ResultType as number,
        ResultCode: Result.ResultCode as number,
        ResultDesc: Result.ResultDesc as string,
        OriginatorConversationID: Result.OriginatorConversationID as string,
        ConversationID: Result.ConversationID as string,
        TransactionID: Result.TransactionID as string,
        TransactionReason: Result.TransactionReason as string | undefined,
        DebitAccountCurrentBalance: Result.DebitAccountCurrentBalance as string | undefined,
        CreditPartyPublicName: Result.CreditPartyPublicName as string | undefined,
        DebitPartyPublicName: Result.DebitPartyPublicName as string | undefined,
        TransactionAmount: Result.TransactionAmount as string | undefined,
        TransactionReceipt: Result.TransactionReceipt as string | undefined,
        ReceiverItem: Result.ReceiverItem as Array<{
          ReceivableType: string;
          ReceiverName: string;
          AccountNumber: string;
          ReceiverMSISDN: string;
          Amount: string;
          TransactionStatus: string;
          ReasonType: string;
          TransactionID: string;
        }> | undefined,
      },
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

const mpesaUtils = {
  getTimestamp,
  parseTimestamp,
  generatePassword,
  getAccessToken,
  formatPhoneNumber,
  isValidMpesaPhone,
  maskPhoneNumber,
  formatPhoneForDisplay,
  generateSecurityCredential,
  generateTransactionRef,
  generateCheckoutRequestID,
  generateMpesaReceiptNumber,
  validateAmount,
  getResultCodeInfo,
  validateStkCallback,
  validateB2CCallback,
  defaultMpesaConfig,
  MIN_AMOUNT,
  MAX_STK_PUSH_AMOUNT,
  MAX_B2C_AMOUNT,
  MPESA_RESULT_CODES,
};

export default mpesaUtils;
