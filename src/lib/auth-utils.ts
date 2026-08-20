/**
 * Digital Lending OS - Server-Side Authentication & Authorization Utilities
 * 
 * This module provides utilities for:
 * - Extracting and validating authentication tokens
 * - Checking user roles and permissions
 * - Getting tenant context from requests
 * - Creating audit log entries
 * - API route wrappers with built-in auth checks
 * 
 * Usage in API routes:
 * ```typescript
 * import { withAuth, withRoles, getAuthenticatedUser } from '@/lib/auth-utils'
 * 
 * export const GET = withAuth(async (req, ctx, { user, tenant }) => {
 *   // User is guaranteed to be authenticated
 *   return Response.json({ data: '...' })
 * })
 * 
 * export const PUT = withRoles(['TENANT_ADMIN', 'MANAGER'])(async (req, ctx, { user, tenant }) => {
 *   // User is authenticated AND has required role
 *   return Response.json({ data: '...' })
 * })
 * ```
 */

import { db } from '@/lib/db'
import type {
  User,
  Tenant,
  UserRole,
  Permission,
  AuditLogEntry,
  TokenPayload,
} from '@/lib/auth-types'
import { ROLE_HIERARCHY } from '@/lib/auth-types'
import type { NextRequest } from 'next/server'

// ============================================================
// Type Definitions
// ============================================================

/**
 * Result of authentication check.
 */
export interface AuthResult {
  /** Authenticated user (null if not authenticated) */
  user: User | null
  /** User's tenant (null if not authenticated) */
  tenant: Tenant | null
  /** Error message if authentication failed */
  error: string | null
  /** Error code for client handling */
  errorCode?: string
}

/**
 * Context passed to wrapped API handlers.
 */
export interface AuthContext {
  /** Authenticated user */
  user: User
  /** User's tenant */
  tenant: Tenant
  /** Original request (for additional context) */
  request: Request
}

/**
 * Parameters for creating audit log entries.
 */
export interface AuditLogParams {
  userId: string
  tenantId: string
  action: string
  entityType: string
  entityId?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

// ============================================================
// Token Extraction & Validation
// ============================================================

/**
 * Extract token from request.
 * Checks Authorization header first, then cookies.
 */
export function extractTokenFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // For NextRequest, check cookies
  if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
    const nextReq = request as NextRequest
    const sessionCookie = nextReq.cookies.get('auth-token')?.value
    if (sessionCookie) {
      return sessionCookie
    }
    const sessionId = nextReq.cookies.get('session-id')?.value
    if (sessionId) {
      return sessionId
    }
  }
  
  // Check x-auth-token header (alternative)
  const altToken = request.headers.get('x-auth-token')
  if (altToken) {
    return altToken
  }
  
  // Check headers set by middleware (for server-side calls)
  const middlewareToken = request.headers.get('x-session-token')
  if (middlewareToken) {
    return middlewareToken
  }
  
  return null
}

/**
 * Decode and validate JWT token.
 * Returns token payload or null if invalid.
 */
export function decodeJWTToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // Decode payload
    const payload = parts[1]
    const decoded = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, "/"),
      'base64'
    ).toString('utf-8')
    
    const parsed = JSON.parse(decoded)
    
    // Validate structure
    if (!parsed.sub || !parsed.email || !parsed.role || !parsed.exp) {
      return null
    }
    
    // Check expiration
    if (parsed.exp * 1000 < Date.now()) {
      return null
    }
    
    return {
      sub: parsed.sub,
      email: parsed.email,
      role: parsed.role as UserRole,
      tenantId: parsed.tenantId || '',
      iat: parsed.iat || 0,
      exp: parsed.exp,
      jti: parsed.jti,
    }
  } catch {
    return null
  }
}

/**
 * Get authenticated user from request.
 * 
 * This function:
 * 1. Extracts token from request
 * 2. Decodes and validates the token
 * 3. Fetches full user and tenant data from database
 * 4. Returns complete auth context
 * 
 * @param request - The incoming HTTP request
 * @returns Auth result with user, tenant, or error info
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthResult> {
  try {
    // Extract token
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return {
        user: null,
        tenant: null,
        error: 'No authentication token provided',
        errorCode: 'NO_TOKEN',
      }
    }
    
    // Decode token
    const payload = decodeJWTToken(token)
    
    if (!payload) {
      return {
        user: null,
        tenant: null,
        error: 'Invalid or expired token',
        errorCode: 'INVALID_TOKEN',
      }
    }
    
    // Fetch user from database
    const dbUser = await db.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: true,
      },
    })
    
    if (!dbUser) {
      return {
        user: null,
        tenant: null,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      }
    }
    
    // Check if user is active
    if (!dbUser.isActive) {
      return {
        user: null,
        tenant: null,
        error: 'User account is deactivated',
        errorCode: 'ACCOUNT_DEACTIVATED',
      }
    }
    
    // Check if tenant is active
    if (dbUser.tenant && dbUser.tenant.status !== 'ACTIVE') {
      return {
        user: null,
        tenant: null,
        error: 'Tenant account is not active',
        errorCode: 'TENANT_INACTIVE',
      }
    }
    
    // Build user object
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as UserRole,
      tenantId: dbUser.tenantId,
      tenantSlug: dbUser.tenant?.slug ?? null,
      isActive: dbUser.isActive,
      avatarUrl: dbUser.avatarUrl,
      lastLoginAt: dbUser.lastLoginAt,
    }
    
    // Build tenant object
    const tenant: Tenant | null = dbUser.tenant ? {
      id: dbUser.tenant.id,
      slug: dbUser.tenant.slug,
      name: dbUser.tenant.name,
      companyName: dbUser.tenant.companyName,
      plan: dbUser.tenant.plan,
      status: dbUser.tenant.status,
      licenseNumber: dbUser.tenant.licenseNumber,
    } : null
    
    return { user, tenant, error: null }
  } catch (error) {
    console.error('Error authenticating user:', error)
    return {
      user: null,
      tenant: null,
      error: 'Authentication failed due to server error',
      errorCode: 'AUTH_ERROR',
    }
  }
}

// ============================================================
// Role & Permission Checks
// ============================================================

/**
 * Check if user has a specific role or higher (based on hierarchy).
 * 
 * @param user - The user to check
 * @param roles - Array of allowed roles (any one match is sufficient)
 * @returns True if user has any of the allowed roles
 */
export function requireRole(user: User, roles: UserRole[]): boolean {
  if (!roles || roles.length === 0) {
    return true // No restriction
  }
  
  const userLevel = ROLE_HIERARCHY[user.role] ?? 0
  
  // Check if user's role level meets any of the required levels
  return roles.some(requiredRole => {
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0
    return userLevel >= requiredLevel
  })
}

/**
 * Check if user has a specific permission.
 * 
 * Permissions are derived from roles. Each role has a set of associated permissions.
 * This function checks if the user's role includes the requested permission.
 * 
 * @param user - The user to check
 * @param permission - The permission to check for
 * @returns True if user has the permission
 */
export function requirePermission(user: User, permission: string): boolean {
  // SUPER_ADMIN has all permissions
  if (user.role === 'SUPER_ADMIN') {
    return true
  }
  
  // Get permissions for user's role
  const rolePermissions = getPermissionsForRole(user.role)
  return rolePermissions.includes(permission)
}

/**
 * Check if user has ALL specified permissions.
 * 
 * @param user - The user to check
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export function requireAllPermissions(user: User, permissions: string[]): boolean {
  return permissions.every(permission => requirePermission(user, permission))
}

/**
 * Check if user has ANY of the specified permissions.
 * 
 * @param user - The user to check
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 */
export function requireAnyPermission(user: User, permissions: string[]): boolean {
  if (permissions.length === 0) {
    return true
  }
  return permissions.some(permission => requirePermission(user, permission))
}

/**
 * Get all permissions associated with a role.
 * 
 * @param role - The user role
 * @returns Array of permission strings
 */
export function getPermissionsForRole(role: UserRole): string[] {
  const permissionMap: Record<UserRole, string[]> = {
    SUPER_ADMIN: [
      // Tenant management
      'tenant:create', 'tenant:read', 'tenant:update', 'tenant:delete', 'tenant:manage',
      // User management
      'user:create', 'user:read', 'user:update', 'user:delete', 'user:manage',
      // All lending operations
      'customer:create', 'customer:read', 'customer:update', 'customer:delete',
      'loan:create', 'loan:read', 'loan:update', 'loan:delete', 'loan:approve', 'loan:reject',
      'application:create', 'application:read', 'application:update', 'application:approve', 'application:reject',
      'product:create', 'product:read', 'product:update', 'product:delete',
      'repayment:read', 'repayment:process', 'repayment:reverse',
      // Reports & audit
      'report:read', 'report:export', 'report:manage',
      'audit:read',
      // Settings
      'settings:read', 'settings:update', 'settings:manage',
      // Dashboard
      'dashboard:read',
    ],
    TENANT_ADMIN: [
      // Limited user management (own tenant)
      'user:create', 'user:read', 'user:update', 'user:manage',
      // Customer operations
      'customer:create', 'customer:read', 'customer:update', 'customer:delete',
      // Loan operations (except delete)
      'loan:create', 'loan:read', 'loan:update', 'loan:approve', 'loan:reject',
      'application:create', 'application:read', 'application:update', 'application:approve', 'application:reject',
      // Product management
      'product:create', 'product:read', 'product:update',
      // Repayments
      'repayment:read', 'repayment:process',
      // Reports
      'report:read', 'report:export',
      // Settings (own tenant)
      'settings:read', 'settings:update',
      // Dashboard
      'dashboard:read',
    ],
    MANAGER: [
      // Read users
      'user:read',
      // Customer operations
      'customer:read', 'customer:create', 'customer:update',
      // Loan operations (with approval authority)
      'loan:read', 'loan:create', 'loan:approve', 'loan:reject',
      'application:read', 'application:update', 'application:approve', 'application:reject',
      // Products (read only)
      'product:read',
      // Repayments
      'repayment:read', 'repayment:process',
      // Reports
      'report:read', 'report:export',
      // Dashboard
      'dashboard:read',
    ],
    STAFF: [
      // Basic read access
      'user:read',
      // Customer operations (no delete)
      'customer:read', 'customer:create', 'customer:update',
      // Loans (no approval/rejection)
      'loan:read', 'loan:create',
      'application:read', 'application:create', 'application:update',
      // Products (read only)
      'product:read',
      // Repayments (read only)
      'repayment:read',
      // Dashboard
      'dashboard:read',
    ],
    AGENT: [
      // Limited customer access
      'customer:read', 'customer:create',
      // Create applications only
      'application:read', 'application:create',
      'loan:read',
      // Dashboard (limited)
      'dashboard:read',
    ],
    VIEWER: [
      // Read-only access
      'customer:read',
      'loan:read',
      'application:read',
      'product:read',
      'repayment:read',
      'dashboard:read',
      'report:read',
    ],
    CUSTOMER: [
      // Own data only (enforced at handler level)
      'loan:read',
      'application:read',
      'application:create',
      'repayment:read',
      'dashboard:read',
    ],
  }
  
  return permissionMap[role] || []
}

// ============================================================
// Tenant Extraction
// ============================================================

/**
 * Get tenant ID from request.
 * 
 * Checks multiple sources in order of priority:
 * 1. X-Tenant-ID header (explicit)
 * 2. tenant query parameter
 * 3. User's tenant (from auth context)
 * 
 * @param request - The incoming request
 * @param authTenantId - Tenant ID from authentication context (optional)
 * @returns Tenant ID or null if not found
 */
export function getRequestTenant(
  request: Request,
  authTenantId?: string | null
): string | null {
  // Check header first
  const headerTenant = request.headers.get('x-tenant-id')
  if (headerTenant && headerTenant.length > 0) {
    return headerTenant
  }
  
  // Check query parameter (for GET requests)
  try {
    const url = new URL(request.url)
    const queryTenant = url.searchParams.get('tenantId')
    if (queryTenant && queryTenant.length > 0) {
      return queryTenant
    }
  } catch {
    // Invalid URL, continue
  }
  
  // Use authenticated user's tenant
  if (authTenantId) {
    return authTenantId
  }
  
  // Check body for POST/PUT requests (would need to parse body separately)
  // Note: This is handled by individual route handlers
  
  return null
}

/**
 * Verify that a user can access a specific tenant.
 * 
 * SUPER_ADMIN can access any tenant.
 * Other roles can only access their own tenant.
 * 
 * @param user - The authenticated user
 * @param targetTenantId - The tenant being accessed
 * @returns True if access is allowed
 */
export function canAccessTenant(
  user: User,
  targetTenantId: string
): boolean {
  // Super admins can access any tenant
  if (user.role === 'SUPER_ADMIN') {
    return true
  }
  
  // Other users can only access their own tenant
  return user.tenantId === targetTenantId
}

// ============================================================
// Audit Logging
// ============================================================

/**
 * Create an audit log entry for authorization events.
 * 
 * @param params - Audit log parameters
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        ipAddress: params.ipAddress ?? null,
        result: 'ALLOWED' as const,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log entry:', error)
    // Don't throw - audit logging shouldn't break the main flow
  }
}

/**
 * Log authorization denial for security tracking.
 * 
 * @param params - Audit log parameters
 * @param reason - Reason for denial
 */
export async function logAuthorizationDenial(
  params: Omit<AuditLogParams, 'entityType'> & {
    entityType: string
    reason: string
  }
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        action: `DENIED:${params.action}`,
        entityType: params.entityType,
        entityId: (params as AuditLogParams).entityId ?? null,
        ipAddress: params.ipAddress ?? null,
        result: 'DENIED' as const,
        metadata: JSON.stringify({
          reason: params.reason,
          ...params.metadata,
        }),
      },
    })
  } catch (error) {
    console.error('Failed to log authorization denial:', error)
  }
}

// ============================================================
// API Route Wrappers
// ============================================================

/**
 * Type for wrapped API handler functions.
 */
type AuthenticatedHandler = (
  request: Request,
  context: unknown,
  authContext: AuthContext
) => Promise<Response>

type HandlerFunction = (
  request: Request,
  context: unknown,
  authContext?: AuthContext
) => Promise<Response>

/**
 * Wrap an API handler with authentication check.
 * 
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (req, ctx, { user, tenant }) => {
 *   return Response.json({ user: user.name })
 * })
 * ```
 * 
 * @param handler - The handler function that requires authentication
 * @returns Wrapped handler that checks auth before calling original
 */
export function withAuth(handler: AuthenticatedHandler): HandlerFunction {
  return async (request: Request, context: unknown): Promise<Response> => {
    // Perform authentication
    const authResult = await getAuthenticatedUser(request)
    
    if (!authResult.user || authResult.error) {
      // Log the failed attempt
      console.warn('[AUTH] Unauthorized access attempt:', {
        path: new URL(request.url).pathname,
        errorCode: authResult.errorCode,
      })
      
      return Response.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
          code: authResult.errorCode || 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }
    
    // Call the original handler with auth context
    return handler(request, context, {
      user: authResult.user,
      tenant: authResult.tenant!,
      request,
    })
  }
}

/**
 * Create a role-restricted wrapper factory.
 * 
 * Usage:
 * ```typescript
 * export const PUT = withRoles(['TENANT_ADMIN', 'MANAGER'])(
 *   async (req, ctx, { user, tenant }) => {
 *     // User is guaranteed to have one of the specified roles
 *   }
 * )
 * ```
 * 
 * @param allowedRoles - Roles that are allowed to access this endpoint
 * @returns A wrapper function that checks both auth and roles
 */
export function withRoles(allowedRoles: UserRole[]) {
  return (handler: AuthenticatedHandler): HandlerFunction => {
    return withAuth(async (request: Request, context: unknown, authContext: AuthContext): Promise<Response> => {
      const { user } = authContext
      
      // Check role
      if (!requireRole(user, allowedRoles)) {
        // Log the denied attempt
        console.warn('[AUTH] Insufficient role permissions:', {
          path: new URL(request.url).pathname,
          userRole: user.role,
          requiredRoles: allowedRoles,
          userId: user.id,
        })
        
        // Create audit log for denial
        await logAuthorizationDenial({
          userId: user.id,
          tenantId: user.tenantId,
          action: 'API_ACCESS',
          entityType: 'api_endpoint',
          reason: `Insufficient role. Required: ${allowedRoles.join(', ')}, Has: ${user.role}`,
          ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        })
        
        return Response.json(
          {
            success: false,
            error: 'Insufficient permissions for this action',
            code: 'FORBIDDEN',
            requiredRoles: allowedRoles,
            currentRole: user.role,
          },
          { status: 403 }
        )
      }
      
      // Role check passed, call handler
      return handler(request, context, authContext)
    })
  }
}

/**
 * Create a permission-restricted wrapper factory.
 * 
 * Usage:
 * ```typescript
 * export const POST = withPermission('loan:approve')(
 *   async (req, ctx, { user, tenant }) => {
 *     // User is guaranteed to have the loan:approve permission
 *   }
 * )
 * ```
 * 
 * @param permission - Required permission
 * @returns A wrapper function that checks both auth and permission
 */
export function withPermission(permission: string) {
  return (handler: AuthenticatedHandler): HandlerFunction => {
    return withAuth(async (request: Request, context: unknown, authContext: AuthContext): Promise<Response> => {
      const { user } = authContext
      
      // Check permission
      if (!requirePermission(user, permission)) {
        console.warn('[AUTH] Missing permission:', {
          path: new URL(request.url).pathname,
          userRole: user.role,
          requiredPermission: permission,
          userId: user.id,
        })
        
        return Response.json(
          {
            success: false,
            error: `Missing required permission: ${permission}`,
            code: 'FORBIDDEN',
            requiredPermission: permission,
          },
          { status: 403 }
        )
      }
      
      // Permission check passed, call handler
      return handler(request, context, authContext)
    })
  }
}

/**
 * Create a wrapper that requires specific permissions (all must be present).
 * 
 * @param permissions - All required permissions
 * @returns A wrapper function
 */
export function withAllPermissions(permissions: string[]) {
  return (handler: AuthenticatedHandler): HandlerFunction => {
    return withAuth(async (request: Request, context: unknown, authContext: AuthContext): Promise<Response> => {
      const { user } = authContext
      
      if (!requireAllPermissions(user, permissions)) {
        return Response.json(
          {
            success: false,
            error: 'Missing one or more required permissions',
            code: 'FORBIDDEN',
            requiredPermissions: permissions,
          },
          { status: 403 }
        )
      }
      
      return handler(request, context, authContext)
    })
  }
}

/**
 * Create a wrapper for tenant-scoped endpoints.
 * Ensures the user can access the specified tenant.
 * 
 * @param options - Configuration options
 * @returns A wrapper function
 */
export function withTenantAccess(options: {
  /** Require super admin or own tenant admin */
  requireAdmin?: boolean
  /** Allow super admin to access any tenant */
  allowSuperAdminBypass?: boolean
} = {}) {
  return (handler: AuthenticatedHandler): HandlerFunction => {
    return withAuth(async (request: Request, context: unknown, authContext: AuthContext): Promise<Response> => {
      const { user, tenant } = authContext
      
      // Get target tenant from request
      const targetTenantId = getRequestTenant(request, user.tenantId)
      
      if (!targetTenantId) {
        return Response.json(
          {
            success: false,
            error: 'Tenant ID is required',
            code: 'TENANT_REQUIRED',
          },
          { status: 400 }
        )
      }
      
      // Check tenant access
      const canAccess = options.allowSuperAdminBypass !== false 
        ? canAccessTenant(user, targetTenantId)
        : user.tenantId === targetTenantId
      
      if (!canAccess) {
        return Response.json(
          {
            success: false,
            error: 'You do not have access to this tenant',
            code: 'TENANT_FORBIDDEN',
          },
          { status: 403 }
        )
      }
      
      // Additional admin check
      if (options.requireAdmin && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) {
        return Response.json(
          {
            success: false,
            error: 'Administrator access required',
            code: 'ADMIN_REQUIRED',
          },
          { status: 403 }
        )
      }
      
      return handler(request, context, authContext)
    })
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get client IP address from request.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Create a standardized error response.
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 400,
  extraData?: Record<string, unknown>
): Response {
  return Response.json(
    {
      success: false,
      error: message,
      code,
      ...extraData,
    },
    { status }
  )
}

/**
 * Create a standardized success response.
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200,
  extraData?: Record<string, unknown>
): Response {
  return Response.json(
    {
      success: true,
      data,
      ...extraData,
    },
    { status }
  )
}
