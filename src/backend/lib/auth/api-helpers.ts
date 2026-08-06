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
 *
 * JWT decryption errors (e.g. stale tokens, secret rotation) are
 * caught and return null — the caller gets a clean 401 instead of a 500.
 */
export async function getApiUser(req: NextRequest): Promise<ApiUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    if (!session.user.id) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      role: session.user.role || 'viewer',
      tenantId: session.user.tenantId || '',
      businessId: session.user.businessId || '',
    };
  } catch (err: any) {
    // Gracefully handle JWT decryption failures (JWEDecryptionFailed, etc.)
    // and any other session retrieval errors.
    // Log at warn level so ops can detect token rotation issues.
    if (err?.code === 'JWEDecryptionFailed' ||
        err?.name === 'JWEDecryptionFailed' ||
        err?.message?.includes('decrypt')) {
      console.warn('[auth] JWT decryption failed — possibly stale token:', err.message);
    } else {
      console.error('[auth] Unexpected error in getApiUser:', err);
    }
    return null;
  }
}

/**
 * Require authentication for any request.
 * For state-changing methods (POST/PUT/PATCH/DELETE), also enforces CSRF.
 * Throws AuthError(401) if not authenticated, AuthError(403) if CSRF fails.
 *
 * This is the SINGLE canonical auth gate for all API routes.
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
 * Require a specific role — enforces auth + CSRF (via requireAuth) then checks role.
 * Throws AuthError(401) if not authenticated, AuthError(403) if wrong role or CSRF fails.
 */
export async function requireRole(req: NextRequest, roles: string[]): Promise<ApiUser> {
  // Go through requireAuth to ensure CSRF is checked for mutations
  const user = await requireAuth(req);
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
 * Exposes both `statusCode` (canonical) and `status` (alias) for
 * backward compatibility with existing catch blocks.
 */
export class AuthError extends Error {
  statusCode: number;
  get status(): number { return this.statusCode; }
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
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
 * Wraps payload in `{ data }` envelope for consistent API shape.
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json({ data }, { status });
}
