/**
 * Authentication Middleware
 * 
 * JWT-based authentication with role-based access control (RBAC).
 * Supports multi-tenant isolation.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JWTPayload, UserRole } from '../types';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path,
      });
      return unauthorizedResponse(res, 'No authentication token provided');
    }

    const payload = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      isActive: true,
      lastLoginAt: new Date(),
      name: null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication failed: Token expired', {
        ip: req.ip,
        path: req.path,
      });
      return unauthorizedResponse(res, 'Token has expired', 'TOKEN_EXPIRED');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        path: req.path,
      });
      return unauthorizedResponse(res, 'Invalid token', 'INVALID_TOKEN');
    }

    logger.error('Authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
}

/**
 * Optional authentication - doesn't fail if no token present
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next(); // Continue without auth
    }

    const payload = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      isActive: true,
      lastLoginAt: new Date(),
      name: null,
    };

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role(s)
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return unauthorizedResponse(res);
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      return forbiddenResponse(
        res,
        `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  };
}

/**
 * Tenant isolation middleware
 * Ensures users can only access their own tenant's data
 */
export function requireTenantAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  // Super admins can access any tenant
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  // Get tenant ID from query params or request body
  const requestedTenantId =
    req.query.tenantId as string ||
    req.body?.tenantId ||
    req.headers['x-tenant-id'] as string;

  // If requesting specific tenant, check access
  if (requestedTenantId && req.user?.tenantId !== requestedTenantId) {
    logger.warn('Tenant access denied', {
      userId: req.user?.id,
      userTenantId: req.user?.tenantId,
      requestedTenantId,
      path: req.path,
    });
    return forbiddenResponse(
      res,
      'Cannot access other tenant data',
      'TENANT_ACCESS_DENIED'
    );
  }

  // Auto-set tenant ID from authenticated user if not provided
  if (!requestedTenantId && req.user?.tenantId) {
    req.query.tenantId = req.user.tenantId;
  }

  next();
}

/**
 * Permission check helper
 * Can be used in route handlers for fine-grained control
 */
export function hasPermission(userRole: UserRole, requiredPermission: string): boolean {
  const rolePermissions: Record<UserRole, string[]> = {
    SUPER_ADMIN: ['*'],
    TENANT_ADMIN: [
      'tenants:read', 'tenants:write',
      'customers:read', 'customers:write', 'customers:delete',
      'loans:read', 'loans:write', 'loans:approve',
      'applications:read', 'applications:write', 'applications:approve',
      'payments:read', 'payments:process',
      'collections:read', 'collections:write',
      'finance:read', 'finance:write',
      'reports:read', 'reports:generate',
      'staff:read', 'staff:write', 'staff:manage',
      'settings:read', 'settings:write',
    ],
    MANAGER: [
      'customers:read', 'customers:write',
      'loans:read', 'loans:write',
      'applications:read', 'applications:write', 'applications:approve',
      'payments:read',
      'collections:read', 'collections:write',
      'finance:read',
      'reports:read',
      'staff:read',
    ],
    LOAN_OFFICER: [
      'customers:read', 'customers:write',
      'loans:read', 'loans:write',
      'applications:read', 'applications:write',
      'payments:read',
    ],
    COLLECTION_AGENT: [
      'customers:read',
      'loans:read',
      'collections:read', 'collections:write',
      'payments:read',
    ],
    FINANCE_OFFICER: [
      'finance:read', 'finance:write',
      'payments:read', 'payments:process',
      'reports:read',
    ],
    STAFF: [
      'customers:read',
      'loans:read',
      'payments:read',
    ],
    VIEWER: [
      'customers:read',
      'loans:read',
      'reports:read',
    ],
    CUSTOMER: [
      'own_profile:read', 'own_profile:write',
      'own_loans:read',
      'own_payments:read', 'own_payments:write',
    ],
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes('*') || permissions.includes(requiredPermission);
}

/**
 * Combined authentication + roles middleware
 */
export function authenticateWithRoles(allowedRoles: UserRole[]) {
  return [
    authenticate,
    requireRoles(allowedRoles),
  ];
}
