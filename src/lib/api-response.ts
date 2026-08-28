/**
 * Digital Lending OS - API Response Standardization
 * 
 * Standard response wrappers for all API endpoints.
 * Ensures consistent response format across the entire application.
 * 
 * Response Format:
 * ```json
 * {
 *   "success": true|false,
 *   "data": {...},           // On success
 *   "error": "...",          // On error
 *   "code": "ERROR_CODE",    // Machine-readable error code
 *   "message": "...",        // Human-readable message
 *   "meta": {...},           // Pagination, timing info
 *   "details": [...]         // Validation errors
 * }
 * ```
 * 
 * @module api-response
 */

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

// ============================================================
// Types & Interfaces
// ============================================================

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: ApiResponseMeta;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  message?: string;
  details?: ValidationErrorDetail[];
  meta?: ApiResponseMeta;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = unknown> extends SuccessResponse<T[]> {
  meta: ApiResponseMeta & PaginationMeta;
}

/**
 * Validation error detail for field-level errors
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: unknown;
}

/**
 * Metadata included in responses
 */
export interface ApiResponseMeta {
  /** Request ID for tracing */
  requestId?: string;
  /** Server timestamp (ISO 8601) */
  timestamp: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** API version */
  version?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items matching query */
  total: number;
  /** Total pages */
  pages: number;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPrevPage: boolean;
}

/**
 * Error codes used across the API
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'BAD_REQUEST'
  | 'ENTITY_NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_STATE'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_PENDING'
  | 'EXTERNAL_SERVICE_ERROR';

// ============================================================
// Response Builder Class
// ============================================================

/**
 * API Response builder for creating standardized responses.
 * Provides fluent interface for building complex responses.
 * 
 * @example
 * ```typescript
 * import { ApiResponse } from '@/lib/api-response';
 * 
 * // Simple success
 * return ApiResponse.success({ id: 1, name: 'Test' });
 * 
 * // With metadata
 * return ApiResponse.success(data)
 *   .withRequestId('abc-123')
 *   .withProcessingTime(45);
 * 
 * // Paginated
 * return ApiResponse.paginated(items, page, limit, total);
 * 
 * // Error with details
 * return ApiResponse.validationError(errors).build();
 * ```
 */
export class ApiResponse {
  private static readonly DEFAULT_VERSION = '1.0.0';

  /**
   * Create a successful response with data.
   * 
   * @param data - Response payload
   * @param options - Optional configuration
   * @returns NextResponse with standardized format
   * 
   * @example
   * ```typescript
   * return ApiResponse.success({ user: userData }, { message: 'User created' });
   * ```
   */
  static success<T = unknown>(
    data: T,
    options: {
      /** Human-readable success message */
      message?: string;
      /** Custom status code (default: 200) */
      statusCode?: number;
      /** Additional metadata */
      meta?: Partial<ApiResponseMeta>;
      /** Request ID for tracing */
      requestId?: string;
      /** Processing time in ms */
      processingTimeMs?: number;
    } = {}
  ): NextResponse {
    const {
      message,
      statusCode = 200,
      meta,
      requestId,
      processingTimeMs,
    } = options;

    const body: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        version: this.DEFAULT_VERSION,
        ...meta,
        ...(requestId && { requestId }),
        ...(processingTimeMs !== undefined && { processingTimeMs }),
      },
    };

    return NextResponse.json(body, { status: statusCode });
  }

  /**
   * Create an error response.
   * 
   * @param message - Human-readable error message
   * @param options - Error configuration
   * @returns NextResponse with error format
   * 
   * @example
   * ```typescript
   * return ApiResponse.error('Not found', {
   *   statusCode: 404,
   *   code: 'NOT_FOUND',
   *   details: [{ field: 'id', message: 'User not found', code: 'NOT_FOUND' }]
   * });
   * ```
   */
  static error(
    message: string,
    options: {
      /** HTTP status code (default: 500) */
      statusCode?: number;
      /** Machine-readable error code */
      code?: ErrorCode;
      /** Field-level validation errors */
      details?: ValidationErrorDetail[];
      /** Request ID for tracing */
      requestId?: string;
      /** Original error for logging (not exposed to client) */
      originalError?: Error | unknown;
      /** Whether to log the error */
      logError?: boolean;
    } = {}
  ): NextResponse {
    const {
      statusCode = 500,
      code = 'INTERNAL_ERROR',
      details,
      requestId,
      originalError,
      logError = true,
    } = options;

    // Log error if requested and error provided
    if (logError && originalError) {
      console.error(`[API Error] ${code}:`, {
        message,
        originalError: originalError instanceof Error ? {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        } : originalError,
        requestId,
      });
    }

    const body: ErrorResponse = {
      success: false,
      error: message,
      code,
      ...(details && { details }),
      meta: {
        timestamp: new Date().toISOString(),
        version: this.DEFAULT_VERSION,
        ...(requestId && { requestId }),
      },
    };

    return NextResponse.json(body, { status: statusCode });
  }

  /**
   * Create a paginated response.
   * 
   * @param data - Array of items
   * @param page - Current page (1-based)
   * @param limit - Items per page
   * @param total - Total items matching query
   * @param options - Additional options
   * @returns NextResponse with pagination metadata
   * 
   * @example
   * ```typescript
   * const [customers, total] = await db.customer.findManyAndCount(...);
   * return ApiResponse.paginated(customers, page, limit, total);
   * ```
   */
  static paginated<T = unknown>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    options: {
      /** Request ID for tracing */
      requestId?: string;
      /** Processing time in ms */
      processingTimeMs?: number;
      /** Base URL for generating links */
      baseUrl?: string;
    } = {}
  ): NextResponse {
    const { requestId, processingTimeMs, baseUrl } = options;
    
    const pages = Math.ceil(total / limit);
    const hasNextPage = page < pages;
    const hasPrevPage = page > 1;

    const body: PaginatedResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.DEFAULT_VERSION,
        ...(requestId && { requestId }),
        ...(processingTimeMs !== undefined && { processingTimeMs }),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNextPage,
          hasPrevPage,
          ...(baseUrl && {
            nextPage: hasNextPage ? `${baseUrl}?page=${page + 1}&limit=${limit}` : undefined,
            prevPage: hasPrevPage ? `${baseUrl}?page=${page - 1}&limit=${limit}` : undefined,
          }),
        },
      },
    };

    return NextResponse.json(body);
  }

  /**
   * Create a "created" response (201).
   * 
   * @param data - Created resource
   * @param options - Options including Location header
   * @returns 201 Created response
   * 
   * @example
   * ```typescript
   * const newUser = await db.user.create({ data });
   * return ApiResponse.created(newUser, { location: `/api/users/${newUser.id}` });
   * ```
   */
  static created<T = unknown>(
    data: T,
    options: {
      /** Location header value for new resource */
      location?: string;
      /** Success message */
      message?: string;
      /** Request ID */
      requestId?: string;
    } = {}
  ): NextResponse {
    const { location, message, requestId } = options;

    const headers: Record<string, string> = {};
    if (location) {
      headers['Location'] = location;
    }

    const body: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        timestamp: new Date().toISOString(),
        version: this.DEFAULT_VERSION,
        ...(requestId && { requestId }),
      },
    };

    return NextResponse.json(body, {
      status: 201,
      headers,
    });
  }

  /**
   * Create a "no content" response (204).
   * Used for successful DELETE operations or updates with no return body.
   * 
   * @returns 204 No Content response
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Create a validation error response (400/422).
   * 
   * @param errors - Array of validation error details
   * @param options - Additional options
   * @returns Validation error response
   * 
   * @example
   * ```typescript
   * try {
   *   const validated = schema.parse(body);
   * } catch (error) {
   *   if (error instanceof z.ZodError) {
   *     return ApiResponse.validationError(
   *       error.issues.map(issue => ({
   *         field: issue.path.join('.'),
   *         message: issue.message,
   *         code: issue.code,
   *       }))
   *     );
   *   }
   * }
   * ```
   */
  static validationError(
    errors: ValidationErrorDetail[],
    options: {
      /** General error message */
      message?: string;
      /** Request ID */
      requestId?: string;
    } = {}
  ): NextResponse {
    const { message = 'Validation failed', requestId } = options;

    return this.error(message, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      details: errors,
      requestId,
    });
  }

  /**
   * Convert ZodError to validation error response.
   * Convenience method for common pattern.
   * 
   * @param error - ZodError from parse/safeParse
   * @param options - Additional options
   * @returns Validation error response
   */
  static zodError(
    error: ZodError,
    options: {
      message?: string;
      requestId?: string;
    } = {}
  ): NextResponse {
    const errors: ValidationErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: issue.received,
    }));

    return this.validationError(errors, options);
  }

  // ============================================================
  // Common Error Responses
  // ============================================================

  /**
   * 401 Unauthorized - Authentication required.
   */
  static unauthorized(options: {
    message?: string;
    requestId?: string;
  } = {}): NextResponse {
    return this.error(options.message || 'Authentication required', {
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      requestId: options.requestId,
    });
  }

  /**
   * 401 Unauthorized - Invalid or expired token.
   */
  static invalidToken(options: {
    message?: string;
    requestId?: string;
  } = {}): NextResponse {
    return this.error(options.message || 'Invalid or expired token', {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      requestId: options.requestId,
    });
  }

  /**
   * 403 Forbidden - Insufficient permissions.
   */
  static forbidden(options: {
    message?: string;
    requiredRoles?: string[];
    currentRole?: string;
    requestId?: string;
  } = {}): NextResponse {
    const details: ValidationErrorDetail[] = [];
    
    if (options.requiredRoles || options.currentRole) {
      details.push({
        field: 'role',
        message: `Required: ${options.requiredRoles?.join(', ') || 'N/A'}, Current: ${options.currentRole || 'none'}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return this.error(options.message || 'Insufficient permissions', {
      statusCode: 403,
      code: 'FORBIDDEN',
      details: details.length > 0 ? details : undefined,
      requestId: options.requestId,
    });
  }

  /**
   * 404 Not Found.
   */
  static notFound(options: {
    entityType?: string;
    entityId?: string;
    message?: string;
    requestId?: string;
  } = {}): NextResponse {
    const message = options.message || 
      `${options.entityType || 'Resource'}${options.entityId ? ` ${options.entityId}` : ''} not found`;
    
    return this.error(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      requestId: options.requestId,
    });
  }

  /**
   * 409 Conflict - Duplicate entry.
   */
  static conflict(options: {
    message?: string;
    field?: string;
    requestId?: string;
  } = {}): NextResponse {
    const details = options.field ? [{
      field: options.field,
      message: options.message || 'A record with this value already exists',
      code: 'DUPLICATE_ENTRY',
    }] : undefined;

    return this.error(options.message || 'Resource conflict', {
      statusCode: 409,
      code: 'CONFLICT',
      details,
      requestId: options.requestId,
    });
  }

  /**
   * 429 Too Many Requests - Rate limited.
   */
  static rateLimited(options: {
    retryAfterSeconds?: number;
    message?: string;
    requestId?: string;
  } = {}): NextResponse {
    const retryAfter = options.retryAfterSeconds || 60;
    const message = options.message || 
      `Too many requests. Please try again after ${retryAfter} seconds.`;

    const headers: Record<string, string> = {
      'Retry-After': String(retryAfter),
    };

    const body: ErrorResponse = {
      success: false,
      error: message,
      code: 'RATE_LIMITED',
      meta: {
        timestamp: new Date().toISOString(),
        version: this.DEFAULT_VERSION,
        ...(options.requestId && { requestId: options.requestId }),
      },
    };

    return NextResponse.json(body, {
      status: 429,
      headers,
    });
  }

  /**
   * 500 Internal Server Error.
   */
  static internalError(options: {
    message?: string;
    originalError?: Error | unknown;
    requestId?: string;
    logError?: boolean;
  } = {}): NextResponse {
    return this.error(
      options.message || 'An internal server error occurred',
      {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        originalError: options.originalError,
        requestId: options.requestId,
        logError: options.logError ?? true,
      }
    );
  }

  /**
   * 503 Service Unavailable.
   */
  static serviceUnavailable(options: {
    message?: string;
    service?: string;
    retryAfterSeconds?: number;
    requestId?: string;
  } = {}): NextResponse {
    const message = options.message || 
      `Service temporarily unavailable${options.service ? `: ${options.service}` : ''}`;
    
    const headers: Record<string, string> = {};
    if (options.retryAfterSeconds) {
      headers['Retry-After'] = String(options.retryAfterSeconds);
    }

    return this.error(message, {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      requestId: options.requestId,
    });
  }

  // ============================================================
  // Specialized Responses
  // ============================================================

  /**
   * Payment failed response.
   */
  static paymentFailed(options: {
    reason: string;
    errorCode?: string;
    customerMessage?: string;
    suggestions?: string[];
    requestId?: string;
  }): NextResponse {
    return this.error('Payment processing failed', {
      statusCode: 400,
      code: 'PAYMENT_FAILED',
      details: [
        {
          field: 'payment',
          message: options.reason,
          code: options.errorCode || 'PAYMENT_ERROR',
        },
        ...(options.suggestions ? [{
          field: 'suggestions',
          message: options.suggestions.join('; '),
          code: 'SUGGESTIONS',
        }] : []),
      ],
      requestId: options.requestId,
      logError: false,
    });
  }

  /**
   * Payment pending/waiting response.
   */
  static paymentPending(options: {
    checkoutRequestID?: string;
    estimatedWaitTime?: string;
    pollingEndpoint?: string;
    requestId?: string;
  }): NextResponse {
    return this.success(
      {
        status: 'PENDING',
        ...(options.checkoutRequestID && { checkoutRequestID: options.checkoutRequestID }),
        ...(options.estimatedWaitTime && { estimatedWaitTime: options.estimatedWaitTime }),
        ...(options.pollingEndpoint && { pollingEndpoint: options.pollingEndpoint }),
      },
      {
        statusCode: 200,
        message: 'Payment initiated successfully. Waiting for customer confirmation.',
        requestId: options.requestId,
      }
    );
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate a unique request ID for tracing.
 * Uses crypto.randomUUID() or falls back to timestamp-based ID.
 * 
 * @returns Unique request identifier
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req-${timestamp}-${random}`;
}

/**
 * Wrap an async handler with timing and error handling.
 * Automatically adds processing time to response.
 * 
 * @param handler - The async handler function
 * @returns Wrapped handler with timing
 * 
 * @example
 * ```typescript
 * export const GET = withTiming(async (request) => {
 *   const data = await fetchData();
 *   return ApiResponse.success(data);
 * });
 * ```
 */
export function withTiming<THandler extends (...args: never[]) => Promise<NextResponse>>(
  handler: THandler
): THandler {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    
    try {
      const response = await handler(...args as Parameters<THandler>);
      
      // Add timing header to response
      const processingTime = Date.now() - startTime;
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        headers: response.headers,
      });
      newResponse.headers.set('X-Processing-Time', `${processingTime}ms`);
      
      return newResponse as NextResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return ApiResponse.internalError({
        originalError: error,
        requestId: generateRequestId(),
      });
    }
  }) as THandler;
}

/**
 * Create CORS headers for cross-origin requests.
 * 
 * @param origin - Allowed origin(s)
 * @param methods - Allowed HTTP methods
 * @param headers - Allowed request headers
 * @returns Headers object for CORS
 */
export function createCorsHeaders(
  origin: string | string[] = '*',
  methods: string = 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  headers: string = 'Content-Type, Authorization, X-Request-ID'
): Record<string, string> {
  const allowedOrigin = Array.isArray(origin) ? origin.join(', ') : origin;
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Create preflight OPTIONS response for CORS.
 * 
 * @param origin - Allowed origin(s)
 * @returns 204 No Content response with CORS headers
 */
export function corsPreflightResponse(
  origin: string | string[] = '*'
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(origin),
  });
}

// Export types
export type {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  ValidationErrorDetail,
  ApiResponseMeta,
  PaginationMeta,
  ErrorCode,
};
