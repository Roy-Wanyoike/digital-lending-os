/**
 * Not Found Handler Middleware
 * 
 * Returns 404 for unmatched routes.
 */

import { Request, Response } from 'express';
import { errorResponse } from '../utils/response';

export function notFoundHandler(req: Request, res: Response): Response {
  return errorResponse(
    res,
    404,
    `Route ${req.method} ${req.path} not found`,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.path,
      availableRoutes: {
        base: '/api',
        docs: '/api/docs',
        health: '/api/health',
        v1: '/api/v1',
      },
    }
  );
}
