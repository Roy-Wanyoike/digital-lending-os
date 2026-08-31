/**
 * Authentication Middleware
 * 
 * Complete JWT-based authentication middleware with:
 * - Bearer token extraction from Authorization header
 * - JWT signature and expiry verification
 * - User object attachment to request
 * - Graceful token refresh handling
 * - Proper 401/403 error responses
 * - Role-based access control (RBAC)
 * - Tenant isolation enforcement
 * - CSRF protection support
 * - Request logging for audit trail
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JWTPayload, UserRole } from '../types';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { logger } from '../utils/logger';

// ============================================
// TOKEN EXTRACTION
// ============================================

/**
 * Extract Bearer token from Authorization header
 * Also supports token from query param (for WebSocket upgrades)
 */
export function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter (for non-browser clients)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }

  // Try custom header (for API clients)
  const customToken = req.headers['x-access-token'] as string;
  if (customToken) {
    return customToken;
  }

  return null;
}

/**
 * Extract CSRF token from headers
 */
function extractCsrfToken(req: Request): string | null {
  return req.headers['x-csrf-token'] as string || null;
}

// ============================================
// CORE AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Verify JWT payload and get user details
 * This is used internally by other middleware functions
 */
async function verifyAndGetUser(token: string): Promise<{
  user: AuthRequest['user'];
  error?: { status: number; code: string; message: string };
}> {
  try {
    // Verify JWT signature and expiry
    const payload = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

    // Validate issuer and audience for additional security
    if (payload.iss !== 'digital-lending-os' || payload.aud !== 'digital-lending-os-api') {
      return {
        user: undefined,
        error: {
          status: 401,
          code: 'INVALID_TOKEN',
          message: 'Invalid token issuer or audience',
        },
      };
    }

    // Build user object from payload
    const user: NonNullable<AuthRequest['user']> = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      isActive: true,
      lastLoginAt: new Date(),
      name: null,
    };

    return { user };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        user: undefined,
        error: {
          status: 401,
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        user: undefined,
        error: {
          status: 401,
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      };
    }

    if (error instanceof jwt.NotBeforeError) {
      return {
        user: undefined,
        error: {
          status: 401,
          code: 'TOKEN_NOT_ACTIVE',
          message: 'Token is not yet active',
        },
      };
    }

    logger.error('Unexpected token verification error:', error);
    return {
      user: undefined,
      error: {
        status: 500,
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    };
  }
}

/**
 * Main authentication middleware
 * 
 * Extracts Bearer token from Authorization header, verifies JWT signature
 * and expiry, attaches user object to request.
 * 
 * Returns proper 401 errors with appropriate codes:
 * - NO_TOKEN: No authentication token provided
 * - TOKEN_EXPIRED: Token has expired (client should refresh)
 * - INVALID_TOKEN: Token is malformed or signature invalid
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  // Extract token
  const token = extractToken(req);

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return unauthorizedResponse(res, 'Authentication required. Please provide a valid token.', 'NO_TOKEN');
  }

  // Verify token
  verifyAndGetUser(token).then(({ user, error }) => {
    if (error || !user) {
      logger.warn('Authentication failed', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        errorCode: error?.code,
      });

      return unauthorizedResponse(res, error?.message || 'Authentication failed', error?.code);
    }

    // Attach user to request
    req.user = user;

    // Log successful authentication (debug level to avoid noise)
    logger.debug('Request authenticated', {
      userId: user.id,
      role: user.role,
      path: req.path,
      method: req.method,
    });

    next();
  }).catch((err) => {
    logger.error('Authentication middleware error:', err);
    return unauthorizedResponse(res, 'Authentication failed', 'AUTH_ERROR');
  });
}

/**
 * Optional authentication middleware
 * Doesn't fail if no token present, but attaches user if valid token found.
 * Useful for endpoints that have different responses for auth/non-auth users.
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  
  if (!token) {
    return next(); // Continue without auth
  }

  verifyAndGetUser(token).then(({ user }) => {
    if (user) {
      req.user = user;
    }
    next();
  }).catch(() => {
    // Ignore errors for optional auth
    next();
  });
}

// ============================================
// ROLE-BASED ACCESS CONTROL
// ============================================

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role(s)
 * 
 * @param allowedRoles - Array of roles that can access this route
 * 
 * Example usage:
 * ```typescript
 * router.post('/admin', authenticate, requireRoles(['SUPER_ADMIN']), adminHandler);
 * ```
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    // Check if user is authenticated
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
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
 * Permission check helper function
 * Can be used in route handlers for fine-grained control
 * 
 * @param userRole - The user's current role
 * @param requiredPermission - The permission to check
 * @returns boolean indicating if user has permission
 */
export function hasPermission(userRole: UserRole, requiredPermission: string): boolean {
  // Define permission matrix per role
  const rolePermissions: Partial<Record<UserRole, string[]>> = {
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
    AGENT: [
      'customers:read',
      'loans:read',
      'collections:read', 'collections:write',
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
  
  // Super admins have all permissions
  if (permissions.includes('*')) {
    return true;
  }
  
  // Check for resource wildcard (e.g., "customers:*")
  const [resource] = requiredPermission.split(':');
  if (permissions.includes(`${resource}:*`)) {
    return true;
  }
  
  // Check exact permission
  return permissions.includes(requiredPermission);
}

/**
 * Permission-based authorization middleware factory
 * Checks if user has a specific permission
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    if (!hasPermission(req.user.role, permission)) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        role: req.user.role,
        requiredPermission: permission,
        path: req.path,
      });

      return forbiddenResponse(
        res,
        `Permission denied: ${permission}`,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
}

// ============================================
// TENANT ISOLATION
// ============================================

/**
 * Tenant isolation middleware
 * Ensures users can only access their own tenant's data
 * Super admins can access any tenant data.
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

  // Get requested tenant ID from various sources
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

// ============================================
// COMBINED MIDDLEWARE HELPERS
// ============================================

/**
 * Combined authentication + roles middleware
 * Convenience function for common pattern of requiring auth + specific roles
 * 
 * Example:
 * ```typescript
 * router.get('/admin-data', ...authenticateWithRoles(['SUPER_ADMIN', 'TENANT_ADMIN']), adminDataHandler);
 * ```
 */
export function authenticateWithRoles(allowedRoles: UserRole[]) {
  return [authenticate, requireRoles(allowedRoles)];
}

/**
 * Combined authentication + permission middleware
 */
export function authenticateWithPermission(permission: string) {
  return [authenticate, requirePermission(permission)];
}

/**
 * Combined authentication + tenant isolation middleware
 */
export function authenticateWithTenantAccess() {
  return [authenticate, requireTenantAccess];
}

// ============================================
// CSRF PROTECTION (Optional)
// ============================================

/**
 * CSRF protection middleware for state-changing requests
 * Compares X-CSRF-Token header against expected value
 * Note: Only needed for cookie-based auth; Bearer tokens are inherently protected
 */
export function csrfProtection(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  // Skip for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip if using Bearer token (already secure)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-based auth, validate CSRF token
  const csrfToken = extractCsrfToken(req);
  const sessionCsrfToken = (req as any).session?.csrfToken;

  if (!csrfToken || csrfToken !== sessionCsrfToken) {
    logger.warn('CSRF validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return forbiddenResponse(res, 'CSRF validation failed', 'CSRF_INVALID');
  }

  next();
}
