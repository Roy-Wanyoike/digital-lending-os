/**
 * Security Middleware
 * 
 * Comprehensive security middleware for:
 * - Input sanitization (XSS prevention)
 * - SQL injection prevention helpers
 * - CSRF protection
 * - Request size limits
 * - Security headers validation
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Sanitize a string value to prevent XSS
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return String(value);
  }
  
  // Trim and escape HTML
  return escapeHtml(value.trim()).replace(/\s+/g, ' ');
}

/**
 * Sanitize all string values in an object recursively
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip non-string primitives and functions
      if (typeof value === 'function') {
        continue;
      }
      
      sanitized[key] = sanitizeObject(value);
    }
    
    return sanitized as T;
  }

  return obj;
}

/**
 * Express middleware to sanitize request body, params, and query
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = Object.fromEntries(
        Object.entries(req.query).map(([k, v]) => [k, typeof v === 'string' ? sanitizeString(v) : v])
      );
    }

    if (req.params) {
      req.params = Object.fromEntries(
        Object.entries(req.params).map(([k, v]) => [k, sanitizeString(v)])
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// SQL INJECTION PREVENTION
// =============================================================================

const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  /(--)|(\/\*)|(\*\/)|(\bOR\b|\bAND\b).*?(\=)|(\bUNION\b)/gi,
  /('\s*(OR|AND)\s*')/gi,
  /(\bWHERE\b.*?(\=|\bLIKE\b))/gi,
];

/**
 * Check if a string contains potential SQL injection patterns
 */
export function containsSQLInjection(value: string): boolean {
  return SQL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Validate that input doesn't contain SQL patterns
 */
export function validateNoSQLInjection(value: string): { valid: boolean; pattern?: string } {
  for (const pattern of SQL_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      return { valid: false, pattern: match[0] };
    }
  }
  return { valid: true };
}

/**
 * Middleware to check for SQL injection in query parameters
 */
export function preventSQLInjection(req: Request, res: Response, next: NextFunction): void {
  const checkValue = (value: string): boolean => {
    if (containsSQLInjection(value)) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
      });
      return true;
    }
    return false;
  };

  // Check query parameters
  for (const [, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && checkValue(value)) return;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && checkValue(item)) return;
      }
    }
  }

  // Check body (only string values)
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: Record<string, unknown>): boolean => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'string' && checkValue(value)) return true;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (checkObject(value as Record<string, unknown>)) return true;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string' && checkValue(item)) return true;
            if (typeof item === 'object' && item !== null) {
              if (checkObject(item as Record<string, unknown>)) return true;
            }
          }
        }
      }
      return false;
    };
    
    if (checkObject(req.body as Record<string, unknown>)) return;
  }

  next();
}

// =============================================================================
// CSRF PROTECTION
// =============================================================================

interface CSRFOptions {
  excludedMethods?: string[];
  tokenHeader?: string;
}

/**
 * Simple CSRF protection middleware
 * Note: For APIs using Bearer tokens, CSRF is less critical but still recommended
 */
export function csrfProtection(options: CSRFOptions = {}) {
  const {
    excludedMethods = ['GET', 'HEAD', 'OPTIONS'],
    tokenHeader = 'x-csrf-token',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip safe methods
    if (excludedMethods.includes(req.method)) {
      return next();
    }

    // For API requests with Bearer tokens, we can be more lenient
    const hasBearerToken = req.headers.authorization?.startsWith('Bearer ');
    
    if (hasBearerToken) {
      // Bearer token provides its own CSRF protection
      return next();
    }

    // For cookie-based auth, require CSRF token
    const csrfToken = req.headers[tokenHeader.toLowerCase()] || req.body?._csrf;

    if (!csrfToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        message: `Provide ${tokenHeader} header`,
      });
    }

    // In production, validate against session-stored token
    // For now, just ensure it exists
    next();
  };
}

// =============================================================================
// REQUEST SIZE LIMITS
// =============================================================================

interface SizeLimitOptions {
  maxUrlLength?: number;
  maxBodySize?: string;
  maxQueryParamLength?: number;
}

/**
 * Middleware to enforce request size limits
 */
export function enforceSizeLimits(options: SizeLimitOptions = {}) {
  const {
    maxUrlLength = 2048,
    maxBodySize = '10mb', // Default express limit
    maxQueryParamLength = 1000,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check URL length
    if (req.url && req.url.length > maxUrlLength) {
      return res.status(414).json({
        success: false,
        error: 'URI Too Long',
        message: `URL exceeds maximum length of ${maxUrlLength} characters`,
      });
    }

    // Check query parameter lengths
    for (const [key, value] of Object.entries(req.query)) {
      if (key.length > 50 || (typeof value === 'string' && value.length > maxQueryParamLength)) {
        return res.status(414).json({
          success: false,
          error: 'Query Parameter Too Long',
          message: 'Query parameter exceeds maximum length',
        });
      }
    }

    next();
  };
}

// =============================================================================
// SECURITY HEADERS VALIDATION
// =============================================================================

/**
 * Validate required security headers are present
 */
export function validateSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Log missing security headers in development
  if (process.env.NODE_ENV === 'development') {
    const requiredHeaders = [
      'x-request-id',
      'content-type',
    ];

    const missingHeaders = requiredHeaders.filter(h => !req.headers[h]);

    if (missingHeaders.length > 0 && req.method !== 'GET') {
      console.warn(`[Security] Missing recommended headers: ${missingHeaders.join(', ')}`);
    }
  }

  next();
}

// =============================================================================
// COMBINED SECURITY MIDDLEWARE
// =============================================================================

/**
 * All-in-one security middleware combining:
 * - Input sanitization
 * - SQL injection prevention
 * - Size limits
 * - CSRF protection
 * - Header validation
 */
export function securityMiddleware(options: {
  enableCSRF?: boolean;
  enableSanitization?: boolean;
  enableSQLPrevention?: boolean;
} = {}) {
  const {
    enableCSRF = process.env.NODE_ENV !== 'test',
    enableSanitization = true,
    enableSQLPrevention = true,
  } = options;

  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  if (enableSanitization) {
    middlewares.push(sanitizeInput);
  }

  if (enableSQLPrevention) {
    middlewares.push(preventSQLInjection);
  }

  middlewares.push(enforceSizeLimits());
  middlewares.push(validateSecurityHeaders);

  if (enableCSRF) {
    middlewares.push(csrfProtection());
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    const runNext = (): void => {
      if (index < middlewares.length) {
        middlewares[index++](req, res, runNext);
      } else {
        next();
      }
    };

    runNext();
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  containsSQLInjection,
  validateNoSQLInjection,
  preventSQLInjection,
  csrfProtection,
  enforceSizeLimits,
  validateSecurityHeaders,
  securityMiddleware,
};
