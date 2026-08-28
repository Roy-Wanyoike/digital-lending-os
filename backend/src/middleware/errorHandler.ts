/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and returns standardized error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
// Note: We use a dynamic import for Prisma to avoid issues when Prisma client is not generated
import { logger } from '../utils/logger';
import { ApiResponse, errorResponse, serverErrorResponse, validationErrorResponse } from '../utils/response';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

// Check if error looks like a Prisma known request error
function isPrismaError(err: Error): err is Error & { code: string; meta?: Record<string, unknown> } {
  return 'code' in err && typeof (err as any).code === 'string';
}

export async function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<Response<ApiResponse> | void> {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any)?.user?.id,
  });

  // Prisma errors - check by code pattern
  if (isPrismaError(err) && err.code && err.code.startsWith('P')) {
    return handlePrismaError(err, res);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return handleZodError(err, res);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token', 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token has expired', 'TOKEN_EXPIRED');
  }

  // Custom app errors with status code
  if (err.statusCode) {
    return errorResponse(
      res,
      err.statusCode,
      err.message,
      err.code || 'APP_ERROR',
      err.details
    );
  }

  // Default server error
  return serverErrorResponse(
    res,
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
}

function handlePrismaError(
  err: Error & { code: string; meta?: Record<string, unknown> },
  res: Response
): Response<ApiResponse> {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const target = (err.meta?.target as string[]) || ['field'];
      return errorResponse(
        res,
        409,
        `A record with this ${target.join(', ')} already exists`,
        'DUPLICATE_ENTRY',
        { field: target[0] }
      );

    case 'P2025':
      // Record not found
      return errorResponse(
        res,
        404,
        'Record not found',
        'NOT_FOUND'
      );

    case 'P2003':
      // Foreign key constraint failed
      return errorResponse(
        res,
        400,
        'Related record not found',
        'FOREIGN_KEY_ERROR',
        { relation: err.meta?.field_name }
      );

    case 'P2014':
      // Relation conflict
      return errorResponse(
        res,
        409,
        'Relation conflict - cannot perform this operation',
        'RELATION_CONFLICT'
      );

    default:
      return errorResponse(
        res,
        500,
        'Database operation failed',
        'DATABASE_ERROR',
        process.env.NODE_ENV === 'development' ? { prismaCode: err.code } : undefined
      );
  }
}

function handleZodError(err: ZodError, res: Response): Response<ApiResponse> {
  const errors = err.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));

  return validationErrorResponse(res, errors);
}
