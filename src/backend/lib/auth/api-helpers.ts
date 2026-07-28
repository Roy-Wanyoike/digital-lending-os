import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { csrfGuard } from '@/backend/middleware/csrf';

export interface ApiUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  businessId: string;
}

/**
 * Extract the authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getApiUser(req: NextRequest): Promise<ApiUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const user = session.user as any;
    if (!user?.id) return null;

    return {
      id: user.id,
      email: user.email || '',
      role: user.role || 'USER',
      tenantId: user.tenantId || '',
      businessId: user.businessId || '',
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication + CSRF verification for state-changing requests.
 * Returns 401 if not logged in, 403 if CSRF fails.
 */
export async function requireAuth(req: NextRequest): Promise<ApiUser> {
  const user = await getApiUser(req);
  if (!user) {
    throw new AuthError(401, 'Authentication required');
  }

  // CSRF check for state-changing methods (POST/PUT/PATCH/DELETE)
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = csrfGuard(req);
    if (!csrf.valid) {
      throw new AuthError(403, csrf.error || 'CSRF validation failed');
    }
  }

  return user;
}

/**
 * Require a specific role — returns 403 if wrong role.
 */
export async function requireRole(req: NextRequest, roles: string[]): Promise<ApiUser> {
  // requireAuth already handles CSRF for POST/PUT/PATCH/DELETE
  const user = await getApiUser(req);
  if (!user) {
    throw new AuthError(401, 'Authentication required');
  }
  if (!roles.includes(user.role)) {
    throw new AuthError(403, 'Insufficient permissions');
  }
  return user;
}

/**
 * Require admin role.
 */
export async function requireAdmin(req: NextRequest): Promise<ApiUser> {
  return requireRole(req, ['admin']);
}

/**
 * Add tenant isolation to a Prisma query.
 * Call this to get the where clause for tenant filtering.
 */
export function tenantScope(tenantId: string, extraWhere: any = {}) {
  return {
    tenantId,
    ...extraWhere,
  };
}

/**
 * Auth error class for clean error handling.
 */
export class AuthError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Helper to create a standard error response.
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Helper to create a standard success response.
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
