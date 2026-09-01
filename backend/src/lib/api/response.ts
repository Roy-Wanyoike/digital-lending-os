/**
 * Enhanced API Response Utilities
 * 
 * Standardized response format for all API endpoints.
 * Provides consistent structure with metadata, pagination, and error handling.
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: ResponseMeta;
  errors?: ApiError[];
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta: ResponseMeta & { pagination?: PaginationMeta };
}

export interface ErrorResponse {
  success: false;
  errors: ApiError[];
  meta: ResponseMeta;
}

// =============================================================================
// RESPONSE BUILDER CLASS
// =============================================================================

export class ApiResponseBuilder {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  /**
   * Build base metadata for all responses
   */
  private buildMeta(pagination?: PaginationMeta): ResponseMeta {
    return {
      requestId: this.getHeader('x-request-id') || uuidv4(),
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      ...(pagination && { pagination }),
    };
  }

  /**
   * Get header from request
   */
  private getHeader(name: string): string | undefined {
    return this.req.headers[name] as string | undefined;
  }

  /**
   * Success response with data
   */
  success<T>(res: Response, data: T, options?: { message?: string; pagination?: PaginationMeta }): void {
    const statusCode = options?.message ? 200 : 200;
    
    const response: SuccessResponse<T> = {
      success: true,
      data,
      meta: this.buildMeta(options?.pagination),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  created<T>(res: Response, data: T, message = 'Resource created successfully'): void {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      meta: this.buildMeta(),
    };

    res.status(201).json(response);
  }

  /**
   * No content response (204)
   */
  noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Paginated response
   */
  paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): void {
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Add pagination headers
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Pages', totalPages);
    res.setHeader('X-Has-Next', String(page < totalPages));
    res.setHeader('X-Has-Prev', String(page > 1));

    // Add Link header for RFC 8288 pagination
    const baseUrl = this.req.originalUrl.split('?')[0];
    const links: string[] = [];

    if (page > 1) {
      links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
    }
    if (page < totalPages) {
      links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    }
    if (totalPages > 0) {
      links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
      links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);
    }

    if (links.length > 0) {
      res.setHeader('Link', links.join(', '));
    }

    this.success(res, data, { pagination });
  }

  /**
   * Error response
   */
  error(
    res: Response,
    statusCode: number,
    errors: ApiError | ApiError[]
  ): void {
    const errorArray = Array.isArray(errors) ? errors : [errors];

    const response: ErrorResponse = {
      success: false,
      errors: errorArray,
      meta: this.buildMeta(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Bad request error (400)
   */
  badRequest(
    res: Response,
    message: string,
    field?: string,
    details?: Record<string, unknown>
  ): void {
    this.error(res, 400, {
      code: 'BAD_REQUEST',
      message,
      field,
      details,
    });
  }

  /**
   * Unauthorized error (401)
   */
  unauthorized(res: Response, message = 'Authentication required'): void {
    this.error(res, 401, {
      code: 'UNAUTHORIZED',
      message,
    });
  }

  /**
   * Forbidden error (403)
   */
  forbidden(res: Response, message = 'Access denied'): void {
    this.error(res, 403, {
      code: 'FORBIDDEN',
      message,
    });
  }

  /**
   * Not found error (404)
   */
  notFound(res: Response, resource = 'Resource'): void {
    this.error(res, 404, {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    });
  }

  /**
   * Conflict error (409)
   */
  conflict(res: Response, message: string, code = 'CONFLICT'): void {
    this.error(res, 409, {
      code,
      message,
    });
  }

  /**
   * Validation error (422)
   */
  validationError(
    res: Response,
    errors: Array<{ field: string; message: string }>
  ): void {
    const apiErrors: ApiError[] = errors.map(e => ({
      code: 'VALIDATION_ERROR',
      message: e.message,
      field: e.field,
    }));

    this.error(res, 422, apiErrors);
  }

  /**
   * Too many requests (429)
   */
  tooManyRequests(
    res: Response,
    retryAfter: number = 60,
    message = 'Rate limit exceeded'
  ): void {
    res.setHeader('Retry-After', String(retryAfter));
    this.error(res, 429, {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      details: { retryAfter },
    });
  }

  /**
   * Server error (500)
   */
  serverError(
    res: Response,
    message = 'Internal server error'
  ): void {
    this.error(res, 500, {
      code: 'INTERNAL_ERROR',
      message,
    });
  }

  /**
   * Service unavailable (503)
   */
  serviceUnavailable(
    res: Response,
    message = 'Service temporarily unavailable'
  ): void {
    this.error(res, 503, {
      code: 'SERVICE_UNAVAILABLE',
      message,
    });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a response builder for the current request
 */
export function createResponse(req: Request): ApiResponseBuilder {
  return new ApiResponseBuilder(req);
}

/**
 * Quick success response helper
 */
export function successResponse<T>(
  res: Response,
  req: Request,
  data: T,
  message?: string
): void {
  createResponse(req).success(res, data, { message });
}

/**
 * Quick created response helper
 */
export function createdResponse<T>(
  res: Response,
  req: Request,
  data: T,
  message?: string
): void {
  createResponse(req).created(res, data, message);
}

/**
 * Quick error response helper
 */
export function errorResponse(
  res: Response,
  req: Request,
  statusCode: number,
  code: string,
  message: string,
  field?: string
): void {
  createResponse(req).error(res, statusCode, { code, message, field });
}

/**
 * Quick not found response helper
 */
export function notFoundResponse(
  res: Response,
  req: Request,
  resource?: string
): void {
  createResponse(req).notFound(res, resource);
}

/**
 * Quick paginated response helper
 */
export function paginatedResponse<T>(
  res: Response,
  req: Request,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  createResponse(req).paginated(res, data, page, limit, total);
}

// =============================================================================
// BATCH OPERATION HELPERS
// =============================================================================

export interface BatchResult<T> {
  success: boolean;
  data?: T;
  errors?: ApiError[];
}

export interface BatchOperationResult<T> {
  results: BatchResult<T>[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export function createBatchResponse<T>(
  res: Response,
  req: Request,
  results: BatchResult<T>[],
  statusCode: number = 207 // Multi-status
): void {
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const response = {
    success: failed === 0,
    data: results.map(r => r.data),
    errors: results.flatMap(r => r.errors || []),
    meta: {
      ...createResponse(req).buildMeta(),
      batch: {
        total: results.length,
        succeeded,
        failed,
      },
    },
  };

  res.status(failed === 0 ? 200 : statusCode).json(response);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ApiResponseBuilder;
