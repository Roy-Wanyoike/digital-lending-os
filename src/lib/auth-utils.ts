/**
 * Digital Lending OS - Authentication Utilities
 * 
 * Server-side authentication utilities for API routes and middleware.
 * Provides withAuth(), withRoles() wrappers and helper functions.
 */

import type { UserRole, User, AuthContext } from './auth-types';
import { hasPermission as checkPermission, getEffectivePermissions, hasAnyRole } from './rbac';
import { NextRequest, NextResponse } from 'next/server';

// Re-export AuthContext for convenience
export type { AuthContext } from './auth-types';

/**
 * Authentication context interface for request handlers
 */
export interface AuthResult {
  authenticated: boolean;
  user?: User;
  tenantId?: string;
  error?: string;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Create an audit log entry (placeholder for now)
 * In production, this would write to database or logging service
 */
export function createAuditLog(
  action: string,
  userId: string | null,
  details: Record<string, unknown>,
  ipAddress: string = 'unknown'
): void {
  // Placeholder implementation - in production, log to DB or external service
  console.log(`[AUDIT] ${action} by ${userId || 'anonymous'} from ${ipAddress}`, details);
}

/**
 * Route handler context for Next.js 16 dynamic routes
 */
export interface RouteContext {
  params: Promise<{ [key: string]: string | string[] }>;
}

/**
 * Helper to extract a single param value from route params
 * Handles the case where params might be string | string[]
 */
export function getParam(params: { [key: string]: string | string[] }, name: string): string {
  const value = params[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Internal handler type that receives auth context as third parameter
 */
export type AuthenticatedHandler<T extends unknown[] = []> = (
  request: NextRequest,
  context: RouteContext,
  authContext: AuthContext,
  ...extraArgs: T
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap API handlers with authentication check
 * Compatible with Next.js 16 route handler signature.
 * 
 * @param handler - The API route handler to protect (receives request, route context, and auth context)
 * @returns Wrapped handler that checks for valid authentication
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, { params }, context) => {
 *   const { id } = await params;
 *   // User is authenticated, context.user is available
 *   return NextResponse.json({ data: 'secret' });
 * });
 * ```
 */
export function withAuth<T extends unknown[] = []>(handler: AuthenticatedHandler<T>) {
  return async (request: NextRequest, context: RouteContext): Promise<NextResponse> => {
    const token = extractToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please provide a valid Bearer token' },
        { status: 401 }
      );
    }

    // In production, validate token against database/session store
    // For now, accept any non-empty token as valid (demo mode)
    // TODO: Implement proper JWT/session validation
    
    // Create a basic auth context from token
    // In production, decode JWT and fetch user from DB
    const authContext: AuthContext = {
      user: {
        id: 'demo-user',
        email: 'demo@lendingos.com',
        name: 'Demo User',
        role: 'TENANT_ADMIN',
        tenantId: 'demo-tenant',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tenantId: 'demo-tenant',
      isAuthenticated: true,
      permissions: getEffectivePermissions('TENANT_ADMIN'),
    };

    return handler(request, context, authContext);
  };
}

/**
 * Higher-order function to wrap API handlers with role-based access control
 * Compatible with Next.js 16 route handler signature.
 * Supports both curried and non-curried usage patterns.
 * 
 * @param allowedRoles - Array of roles that can access this route
 * @param handler - (Optional) The API route handler to protect
 * @returns Wrapped handler that checks user role before executing, or a function that accepts the handler
 * 
 * @example Curried usage (recommended):
 * ```typescript
 * export const GET = withRoles(['SUPER_ADMIN', 'TENANT_ADMIN'])(async (request, { params }, context) => {
 *   // User has required role
 *   return NextResponse.json({ data: 'admin-only' });
 * });
 * ```
 * 
 * @example Direct usage:
 * ```typescript
 * export const GET = withRoles(['SUPER_ADMIN', 'TENANT_ADMIN'], async (request, { params }, context) => {
 *   // User has required role
 *   return NextResponse.json({ data: 'admin-only' });
 * });
 * ```
 */
export function withRoles<T extends unknown[] = []>(
  allowedRoles: UserRole[]
): (handler: AuthenticatedHandler<T>) => ReturnType<typeof withAuth<T>>;
export function withRoles<T extends unknown[] = []>(
  allowedRoles: UserRole[],
  handler: AuthenticatedHandler<T>
): ReturnType<typeof withAuth<T>>;
export function withRoles<T extends unknown[] = []>(
  allowedRoles: UserRole[],
  handler?: AuthenticatedHandler<T>
) {
  // Create an intermediate handler that adds role checking after auth
  const roleCheckedHandler: AuthenticatedHandler<T> = async (
    request: NextRequest,
    context: RouteContext,
    authContext: AuthContext,
    ...extraArgs: T
  ): Promise<NextResponse> => {
    // Check if user has required role using the authenticated user's role
    const userRole = authContext.user.role;
    
    if (!hasAnyRole(userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions', 
          message: `Required roles: ${allowedRoles.join(', ')}`,
          currentRole: userRole 
        },
        { status: 403 }
      );
    }

    // Call original handler with all arguments
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return handler!(request, context, authContext, ...extraArgs);
  };

  // If handler provided, return wrapped result directly
  if (handler) {
    return withAuth(roleCheckedHandler);
  }

  // Otherwise return a function that accepts the handler (curried pattern)
  return (h: AuthenticatedHandler<T>) => withAuth(roleCheckedHandler ?? h);
}

/**
 * Get all permissions for a role as an array.
 * 
 * @param role - The user's role
 * @returns Array of permission strings
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return Array.from(getEffectivePermissions(role));
}

/**
 * Check if a user has a specific permission.
 * 
 * @param user - The user object (must have role property)
 * @param permission - The permission string to check
 * @returns Whether the user has this permission
 */
export function requirePermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return checkPermission(user.role, permission);
}

/**
 * Check if a user has ALL of the specified permissions.
 * 
 * @param user - The user object
 * @param permissions - Array of required permissions
 * @returns Whether the user has all permissions
 */
export function requireAllPermissions(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  if (permissions.length === 0) return true;
  return permissions.every(perm => checkPermission(user.role, perm));
}

/**
 * Check if a user has ANY of the specified permissions.
 * 
 * @param user - The user object
 * @param permissions - Array of permissions to check
 * @returns Whether the user has at least one permission
 */
export function requireAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  if (permissions.length === 0) return true;
  return permissions.some(perm => checkPermission(user.role, perm));
}

/**
 * Get user's effective permissions as a Set for fast lookup.
 * 
 * @param role - The user's role
 * @returns Set of all effective permissions including inherited ones
 */
export function getUserPermissions(role: UserRole): Set<string> {
  return getEffectivePermissions(role);
}
