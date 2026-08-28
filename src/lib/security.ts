/**
 * Digital Lending OS - Security Utilities
 * 
 * Comprehensive security helper functions for a financial application.
 * Provides input sanitization, data masking, and validation utilities.
 * 
 * Features:
 * - XSS prevention through input sanitization
 * - Phone number validation (Kenyan format)
 * - KRA PIN format validation
 * - Financial amount bounds checking
 * - Sensitive data hashing for logging
 * - Data masking for display (phone, account numbers)
 * - SQL injection pattern detection
 * 
 * @module security
 */

import crypto from 'crypto';

// ============================================================
// Constants & Configuration
// ============================================================

/**
 * Security configuration constants.
 */
export const SECURITY_CONFIG = {
  /** Maximum string length for user inputs */
  MAX_INPUT_LENGTH: 10000,
  
  /** Characters allowed in alphanumeric fields (beyond basic) */
  SAFE_CHARS: {
    name: "a-zA-Z'-. ", // For names
    address: "a-zA-Z0-9'-.# ,/", // For addresses
    general: "a-zA-Z0-9 _-.,@:+", // General text
  },
  
  /** Masking patterns */
  MASKING: {
    /** How many characters to show at start of phone */
    PHONE_PREFIX_VISIBLE: 4,
    /** How many characters to show at end of phone */
    PHONE_SUFFIX_VISIBLE: 3,
    /** Mask character to use */
    CHAR: '*',
    /** Account number prefix/suffix visible chars */
    ACCOUNT_VISIBLE: 4,
  },
  
  /** Hash algorithm for sensitive data */
  HASH_ALGORITHM: 'sha256',
  
  /** IP blocking configuration */
  RATE_LIMIT: {
    /** Max failed attempts before temporary block */
    MAX_FAILED_ATTEMPTS: 5,
    /** Block duration in minutes */
    BLOCK_DURATION_MINUTES: 15,
  },
} as const;

// ============================================================
// Input Sanitization
// ============================================================

/**
 * XSS attack patterns to detect and remove.
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
  /<iframe[\s\S]*?>/gi, // Iframe tags
  /<object[\s\S]*?>/gi, // Object tags
  /<embed[\s\S]*?>/gi, // Embed tags
  /expression\s*\(/gi, // CSS expressions
  /vbscript:/gi, // VBScript protocol
  /data:\s*text\/html/gi, // Data URI with HTML
];

/**
 * SQL injection patterns to detect.
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION)\b)/gi,
  /(--|#)(\s|$)/gm, // SQL comments
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/gi, // Statement chaining
  /'\s*(OR|AND)\s*'/gi, // Boolean injection
  /\bor\s+\d+\s*=\s*\d+/gi, // Always-true conditions
  /1\s*=\s*1/gi, // Tautology
  /'\s*OR\s*'[^']*'\s*=\s*'/gi, // String-based injection
];

/**
 * Sanitize a string input to prevent XSS attacks.
 * Removes or neutralizes potentially dangerous content.
 * 
 * @param input - The raw string input to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string safe for rendering/storage
 * 
 * @example
 * ```typescript
 * const clean = sanitizeInput('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 * ```
 */
export function sanitizeInput(
  input: string,
  options: {
    /** Remove all HTML (default: true) */
    stripHtml?: boolean;
    /** Maximum length (default: 10000) */
    maxLength?: number;
    /** Allow certain safe characters */
    allowChars?: string;
  } = {}
): string {
  const { stripHtml = true, maxLength = SECURITY_CONFIG.MAX_INPUT_LENGTH } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Truncate to max length first
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  if (stripHtml) {
    // Remove XSS patterns
    for (const pattern of XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // HTML entity encode special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return sanitized.trim();
}

/**
 * Sanitize an object by recursively sanitizing all string values.
 * 
 * @param obj - Object to sanitize
 * @returns New object with sanitized strings
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeInput(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Check if a string contains potential SQL injection patterns.
 * Does NOT modify the string - only detects issues.
 * 
 * @param input - String to check
 * @returns True if suspicious patterns detected
 */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a string contains potential XSS patterns.
 * 
 * @param input - String to check
 * @returns True if XSS patterns detected
 */
export function containsXssPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

// ============================================================
// Phone Number Validation
// ============================================================

/**
 * Validate Kenyan phone number format.
 * Accepts multiple formats:
 * - International: +254712345678 or +254112345678
 * - E.164: 254712345678
 * - Local: 0712345678 or 0112345678
 * 
 * @param phone - Phone number to validate
 * @returns True if valid Kenyan phone number
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = phone.replace(/[+\s-]/g, '');
  
  // International format with +
  if (/^\+254[17]\d{8}$/.test(phone.trim())) {
    return true;
  }
  
  // E.164 format without +
  if (/^254[17]\d{8}$/.test(cleaned)) {
    return true;
  }
  
  // Local format (07XX/01XX)
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Normalize phone number to international format (+254...).
 * 
 * @param phone - Phone number in any accepted format
 * @returns Normalized phone number in +254 format, or null if invalid
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!isValidPhoneNumber(phone)) {
    return null;
  }

  const cleaned = phone.replace(/[+\s-]/g, '');
  
  // Already international format
  if (cleaned.startsWith('254')) {
    return '+254' + cleaned.slice(3);
  }
  
  // Local format - convert
  if (cleaned.startsWith('0')) {
    return '+254' + cleaned.slice(1);
  }

  return '+' + cleaned;
}

/**
 * Mask a phone number for display purposes.
 * Shows prefix and suffix, masks middle characters.
 * 
 * Format: +254712***567
 * 
 * @param phone - Phone number to mask (any format)
 * @returns Masked phone number suitable for display
 * 
 * @example
 * ```typescript
 * maskPhone('+254712345678'); // '+254712***678'
 * maskPhone('0712345678');   // '+254712***678'
 * ```
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || !isValidPhoneNumber(phone)) {
    return '***';
  }

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return '***';
  }

  const { PHONE_PREFIX_VISIBLE, PHONE_SUFFIX_VISIBLE, CHAR } = SECURITY_CONFIG.MASKING;
  const digits = normalized.replace(/\D/g, ''); // Remove non-digits
  
  if (digits.length <= PHONE_PREFIX_VISIBLE + PHONE_SUFFIX_VISIBLE) {
    return CHAR.repeat(digits.length);
  }

  const prefix = digits.slice(0, PHONE_PREFIX_VISIBLE);
  const suffix = digits.slice(-PHONE_SUFFIX_VISIBLE);
  const maskedLength = digits.length - PHONE_PREFIX_VISIBLE - PHONE_SUFFIX_VISIBLE;
  const masked = CHAR.repeat(maskedLength);

  // Reconstruct with original formatting
  return `+${prefix}${masked}${suffix}`;
}

// ============================================================
// KRA PIN Validation
// ============================================================

/**
 * Validate KRA PIN (Personal Identification Number) format.
 * 
 * KRA PIN format: A followed by 9 alphanumeric characters, ending with a letter
 * Example: A123456789X
 * 
 * Note: Newer formats may vary slightly.
 * 
 * @param pin - KRA PIN to validate
 * @returns True if valid KRA PIN format
 */
export function isValidKRAPIN(pin: string | null | undefined): boolean {
  if (!pin || typeof pin !== 'string') {
    return false;
  }

  const cleaned = pin.trim().toUpperCase();
  
  // Standard KRA PIN format: A + 9 alphanumeric + letter
  return /^[A-Z]\d{9}[A-Z]$/.test(cleaned);
}

/**
 * Mask KRA PIN for display.
 * Shows only first and last characters.
 * 
 * @param pin - KRA PIN to mask
 * @returns Masked PIN (e.g., A********X)
 */
export function maskKRAPIN(pin: string | null | undefined): string {
  if (!pin || !isValidKRAPIN(pin)) {
    return '***';
  }

  const cleaned = pin.trim().toUpperCase();
  if (cleaned.length < 4) {
    return '***';
  }

  return `${cleaned[0]}${SECURITY_CONFIG.MASKING.CHAR.repeat(cleaned.length - 2)}${cleaned[cleaned.length - 1]}`;
}

// ============================================================
// Financial Amount Validation
// ============================================================

/**
 * Validate a monetary amount for financial operations.
 * Checks that the amount is positive, finite, and within bounds.
 * 
 * @param amount - Amount to validate
 * @param options - Validation constraints
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```typescript
 * const result = validateAmount(150000);
 * if (!result.valid) {
 *   console.error(result.error); // 'Amount exceeds maximum limit...'
 * }
 * ```
 */
export function validateAmount(
  amount: number | string | null | undefined,
  options: {
    /** Minimum allowed amount (default: 0.01) */
    min?: number;
    /** Maximum allowed amount (default: 10,000,000) */
    max?: number;
    /** Whether zero is allowed (default: false) */
    allowZero?: boolean;
    /** Maximum decimal places (default: 2) */
    maxDecimals?: number;
  } = {}
): { valid: boolean; error?: string; normalized?: number } {
  const {
    min = 0.01,
    max = 10000000,
    allowZero = false,
    maxDecimals = 2,
  } = options;

  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Amount is required' };
  }

  // Convert string to number
  let numValue: number;
  if (typeof amount === 'string') {
    numValue = parseFloat(amount);
    if (isNaN(numValue)) {
      return { valid: false, error: 'Invalid numeric format' };
    }
  } else {
    numValue = amount;
  }

  // Check for NaN or Infinity
  if (!Number.isFinite(numValue)) {
    return { valid: false, error: 'Amount must be a finite number' };
  }

  // Check for negative
  if (numValue < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  // Check for zero
  if (numValue === 0 && !allowZero) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  // Check minimum
  if (numValue < min) {
    return { valid: false, error: `Minimum amount is ${min.toLocaleString()}` };
  }

  // Check maximum
  if (numValue > max) {
    return { valid: false, error: `Maximum amount is ${max.toLocaleString()}` };
  }

  // Check decimal places
  const decimalStr = numValue.toString().split('.')[1];
  if (decimalStr && decimalStr.length > maxDecimals) {
    return { valid: false, error: `Amount cannot exceed ${maxDecimals} decimal places` };
  }

  // Round to specified decimal places
  const multiplier = Math.pow(10, maxDecimals);
  const normalized = Math.round(numValue * multiplier) / multiplier;

  return { valid: true, normalized };
}

// ============================================================
// Data Masking Utilities
// ============================================================

/**
 * Mask an account number for display.
 * Shows first 4 and last 4 characters.
 * 
 * @param account - Account number to mask
 * @returns Masked account number (e.g., '1234****5678')
 */
export function maskAccount(account: string | null | undefined): string {
  if (!account || typeof account !== 'string') {
    return '***';
  }

  const cleaned = account.replace(/\s/g, '');
  const { ACCOUNT_VISIBLE, CHAR } = SECURITY_CONFIG.MASKING;

  if (cleaned.length <= ACCOUNT_VISIBLE * 2) {
    return CHAR.repeat(cleaned.length);
  }

  const prefix = cleaned.slice(0, ACCOUNT_VISIBLE);
  const suffix = cleaned.slice(-ACCOUNT_VISIBLE);
  const maskedLength = cleaned.length - ACCOUNT_VISIBLE * 2;

  return `${prefix}${CHAR.repeat(maskedLength)}${suffix}`;
}

/**
 * Mask an email address for display.
 * Shows first character before @ and domain.
 * 
 * @param email - Email address to mask
 * @returns Masked email (e.g., 'j***n@example.com')
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***@***.***';
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    return `${CHAR.repeat(localPart.length)}@${domain}`;
  }

  return `${localPart[0]}${CHAR.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

const CHAR = SECURITY_CONFIG.MASKING.CHAR;

/**
 * Mask ID number (National ID, Passport, etc.)
 * 
 * @param id - ID to mask
 * @returns Masked ID (e.g., '1234****89')
 */
export function maskId(id: string | null | undefined): string {
  if (!id || typeof id !== 'string') {
    return '***';
  }

  const cleaned = id.replace(/\s/g, '');
  
  if (cleaned.length <= 4) {
    return CHAR.repeat(cleaned.length);
  }

  const prefix = cleaned.slice(0, 2);
  const suffix = cleaned.slice(-2);
  
  return `${prefix}${CHAR.repeat(cleaned.length - 4)}${suffix}`;
}

// ============================================================
// Hashing for Logging
// ============================================================

/**
 * Hash sensitive data for secure logging.
 * Uses SHA-256 to create one-way hash of sensitive values.
 * 
 * Use this when you need to log data for debugging but can't
 * store the actual values (PII compliance).
 * 
 * @param data - Data to hash (string or object)
 * @param salt - Optional salt for additional security
 * @returns SHA-256 hash of the data
 * 
 * @example
 * ```typescript
 * console.log('Processing payment for:', hashSensitiveData('0712345678'));
 * // Output: Processing payment for: a1b2c3d4e5f6...
 * ```
 */
export function hashSensitiveData(
  data: string | object | null | undefined,
  salt: string = 'lending-os-salt'
): string {
  if (data === null || data === undefined) {
    return hashSensitiveData('null', salt);
  }

  const strData = typeof data === 'string' ? data : JSON.stringify(data);
  
  return crypto
    .createHash(SECURITY_CONFIG.HASH_ALGORITHM)
    .update(`${salt}:${strData}`)
    .digest('hex');
}

/**
 * Create a partial reveal of sensitive data for logging.
 * Shows enough to identify records but not full PII.
 * 
 * @param data - Original sensitive data
 * @param visibleChars - Number of characters to show at each end
 * @returns Partially masked string
 */
export function partialReveal(
  data: string | null | undefined,
  visibleChars: number = 3
): string {
  if (!data || typeof data !== 'string') {
    return '***';
  }

  if (data.length <= visibleChars * 2) {
    return CHAR.repeat(data.length);
  }

  return `${data.slice(0, visibleChars)}${CHAR.repeat(data.length - visibleChars * 2)}${data.slice(-visibleChars)}`;
}

// ============================================================
// IP Address Utilities
// ============================================================

/**
 * List of blocked IP addresses (known bad actors).
 * In production, this should be loaded from database/config service.
 */
const BLOCKED_IPS: Set<string> = new Set([
  // Example blocked IPs - add actual threats here
]);

/**
 * Check if an IP address is blocked.
 * 
 * @param ip - IP address to check
 * @returns True if IP is blocked
 */
export function isIPBlocked(ip: string | null | undefined): boolean {
  if (!ip) {
    return false;
  }

  const trimmedIp = ip.trim();
  
  // Check exact match
  if (BLOCKED_IPS.has(trimmedIp)) {
    return true;
  }

  // Check CIDR ranges could be added here
  
  return false;
}

/**
 * Extract client IP from request headers.
 * Handles various proxy/load balancer scenarios.
 * 
 * @param headers - Request headers object
 * @returns Client IP address or 'unknown'
 */
export function extractClientIP(headers: {
  get: (name: string) => string | null;
}): string {
  // Try common headers in order of reliability
  const headerPriority = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'x-cluster-client-ip',
  ];

  for (const header of headerPriority) {
    const value = headers.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
      if (header.toLowerCase() === 'x-forwarded-for') {
        return value.split(',')[0].trim();
      }
      return value.trim();
    }
  }

  return 'unknown';
}

/**
 * Add an IP to the blocklist.
 * 
 * @param ip - IP address to block
 * @param reason - Reason for blocking (for logging)
 */
export function blockIP(ip: string, reason: string = 'Manual block'): void {
  BLOCKED_IPS.add(ip.trim());
  console.warn(`[Security] IP blocked: ${ip}. Reason: ${reason}`);
}

/**
 * Remove an IP from the blocklist.
 * 
 * @param ip - IP address to unblock
 */
export function unblockIP(ip: string): void {
  BLOCKED_IPS.delete(ip.trim());
  console.log(`[Security] IP unblocked: ${ip}`);
}

// ============================================================
// CSRF Protection
// ============================================================

/**
 * Generate a CSRF token for state-changing operations.
 * In production, this should be cryptographically secure and
 * stored server-side with session binding.
 * 
 * @returns Random CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify a CSRF token against expected value.
 * 
 * @param token - Token from request
 * @param expectedToken - Expected token (from session)
 * @returns True if tokens match
 */
export function verifyCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}

// ============================================================
// Request Validation Helpers
// ============================================================

/**
 * Comprehensive input validation for API requests.
 * Combines multiple security checks into single call.
 * 
 * @param fieldName - Name of field being validated (for error messages)
 * @param value - Value to validate
 * @param rules - Validation rules to apply
 * @returns Validation result
 */
export function validateField(
  fieldName: string,
  value: unknown,
  rules: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'amount';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: unknown) => boolean | string;
  } = {}
): { valid: boolean; error?: string; sanitized?: unknown } {
  const { required = true, type = 'string', ...constraints } = rules;

  // Check required
  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: null };
  }

  // Type-specific validation
  switch (type) {
    case 'string': {
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      
      let sanitized = sanitizeInput(value);
      
      if (constraints.minLength && sanitized.length < constraints.minLength) {
        return { valid: false, error: `${fieldName} must be at least ${constraints.minLength} characters` };
      }
      
      if (constraints.maxLength && sanitized.length > constraints.maxLength) {
        return { valid: false, error: `${fieldName} must not exceed ${constraints.maxLength} characters` };
      }
      
      if (constraints.pattern && !constraints.pattern.test(sanitized)) {
        return { valid: false, error: `${fieldName} has invalid format` };
      }
      
      // Custom validator
      if (constraints.customValidator) {
        const customResult = constraints.customValidator(sanitized);
        if (customResult !== true) {
          return { valid: false, error: typeof customResult === 'string' ? customResult : `${fieldName} validation failed` };
        }
      }
      
      // Check for injection attacks
      if (containsSqlInjection(value) || containsXssPatterns(value)) {
        console.warn(`[Security] Potential injection attempt in ${fieldName}`);
        return { valid: false, error: `${fieldName} contains invalid characters` };
      }
      
      return { valid: true, sanitized };
    }
    
    case 'number':
    case 'amount': {
      const numVal = typeof value === 'string' ? parseFloat(value) : value as number;
      
      if (typeof numVal !== 'number' || isNaN(numVal)) {
        return { valid: false, error: `${fieldName} must be a valid number` };
      }
      
      if (constraints.min !== undefined && numVal < constraints.min) {
        return { valid: false, error: `${fieldName} must be at least ${constraints.min}` };
      }
      
      if (constraints.max !== undefined && numVal > constraints.max) {
        return { valid: false, error: `${fieldName} must not exceed ${constraints.max}` };
      }
      
      if (type === 'amount') {
        const amountResult = validateAmount(numVal, {
          min: constraints.min,
          max: constraints.max,
        });
        
        if (!amountResult.valid) {
          return { valid: false, error: amountResult.error };
        }
        
        return { valid: true, sanitized: amountResult.normalized };
      }
      
      return { valid: true, sanitized: numVal };
    }
    
    case 'email': {
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a valid email` };
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid email address` };
      }
      
      return { valid: true, sanitized: value.toLowerCase().trim() };
    }
    
    case 'phone': {
      if (typeof value !== 'string' || !isValidPhoneNumber(value)) {
        return { valid: false, error: `${fieldName} must be a valid phone number` };
      }
      
      return { valid: true, sanitized: normalizePhoneNumber(value) };
    }
    
    case 'boolean': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { valid: false, error: `${fieldName} must be a boolean` };
      }
      
      const boolVal = typeof value === 'boolean' ? value : value === 'true';
      return { valid: true, sanitized: boolVal };
    }
    
    default:
      return { valid: true, sanitized: value };
  }
}

// Export types
export type {
  // Re-export commonly used types
};
