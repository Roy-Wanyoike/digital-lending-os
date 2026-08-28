/**
 * API Response Helpers
 * 
 * Standardized response format for all API endpoints.
 */

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: Record<string, unknown>;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Success response with data
 */
export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

/**
 * Success response with pagination
 */
export function paginatedResponse<T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response<ApiResponse<PaginatedData<T>>> {
  const pages = Math.ceil(total / limit);
  
  // Set pagination headers
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Pages', pages.toString());
  res.setHeader('X-Limit', limit.toString());

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages },
    },
    ...(message && { message }),
  });
}

/**
 * Created response (201)
 */
export function createdResponse<T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response<ApiResponse<T>> {
  return res.status(201).json({
    success: true,
    data,
    message,
  });
}

/**
 * No content response (204)
 */
export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}

/**
 * Error response
 */
export function errorResponse(
  res: Response,
  statusCode: number,
  error: string,
  code?: string,
  details?: unknown
): Response<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error,
  };
  
  if (code) {
    response.code = code;
  }
  if (details) {
    response.meta = details as Record<string, unknown>;
  }

  return res.status(statusCode).json(response);
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(
  res: Response,
  error: string,
  code = 'BAD_REQUEST',
  details?: unknown
): Response<ApiResponse> {
  return errorResponse(res, 400, error, code, details);
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(
  res: Response,
  error = 'Unauthorized',
  code = 'UNAUTHORIZED'
): Response<ApiResponse> {
  return errorResponse(res, 401, error, code);
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(
  res: Response,
  error = 'Forbidden',
  code = 'FORBIDDEN'
): Response<ApiResponse> {
  return errorResponse(res, 403, error, code);
}

/**
 * Not found response (404)
 */
export function notFoundResponse(
  res: Response,
  resource = 'Resource'
): Response<ApiResponse> {
  return errorResponse(res, 404, `${resource} not found`, 'NOT_FOUND');
}

/**
 * Conflict response (409)
 */
export function conflictResponse(
  res: Response,
  error: string,
  code = 'CONFLICT'
): Response<ApiResponse> {
  return errorResponse(res, 409, error, code);
}

/**
 * Validation error response (422)
 */
export function validationErrorResponse(
  res: Response,
  errors: Array<{ field: string; message: string }>
): Response<ApiResponse> {
  return errorResponse(res, 422, 'Validation failed', 'VALIDATION_ERROR', {
    errors,
  });
}

/**
 * Too many requests response (429)
 */
export function tooManyRequestsResponse(
  res: Response,
  retryAfterSeconds = 60
): Response<ApiResponse> {
  res.setHeader('Retry-After', retryAfterSeconds.toString());
  return errorResponse(res, 429, 'Too many requests', 'RATE_LIMIT_EXCEEDED');
}

/**
 * Server error response (500)
 */
export function serverErrorResponse(
  res: Response,
  error = 'Internal server error'
): Response<ApiResponse> {
  return errorResponse(res, 500, error, 'INTERNAL_ERROR');
}
