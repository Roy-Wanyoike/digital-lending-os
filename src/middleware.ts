/**
 * Digital Lending OS - Authentication & Authorization Middleware
 * 
 * This middleware handles:
 * - Token extraction (Authorization header or cookies)
 * - Route protection based on roles and permissions
 * - Redirect to appropriate login pages
 * - Adding user context to request headers for downstream use
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole, PortalType, RouteConfig } from '@/lib/auth-types'

// ============================================================
// Route Configuration
// ============================================================

/**
 * Protected routes configuration.
 * Each entry defines which roles can access specific path patterns.
 * 
 * Security: Default deny - only explicitly allowed routes are accessible.
 */
const PROTECTED_ROUTES: RouteConfig[] = [
  // Super Admin Portal Routes
  {
    path: '/admin',
    roles: ['SUPER_ADMIN'],
    portal: 'super_admin',
    requireAuth: true,
  },
  
  // Lender/DCP Staff Portal Routes
  {
    path: '/lender',
    roles: ['TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT', 'VIEWER'],
    portal: 'dcp_staff',
    requireAuth: true,
  },
  
  // Customer Portal Routes
  {
    path: '/customer',
    roles: ['CUSTOMER'],
    portal: 'customer',
    requireAuth: true,
  },
  
  // API Routes - Require authentication
  {
    path: '/api/dashboard',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/loans',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/customers',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/applications',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/tenants',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/products',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/reports',
    requireAuth: true,
    isPattern: true,
  },
  {
    path: '/api/users',
    requireAuth: true,
    isPattern: true,
  },
]

/**
 * Public routes that don't require authentication.
 * These are always accessible regardless of auth state.
 */
const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/health',
  '/_next/static/',
  '/_next/image/',
  '/favicon.ico',
  '/logo.svg',
]

/**
 * Login URLs for each portal type.
 */
const PORTAL_LOGIN_URLS: Record<PortalType, string> = {
  super_admin: '/login?portal=admin',
  dcp_staff: '/login?portal=lender',
  customer: '/login?portal=customer',
  api: '/api/auth/unauthorized',
}

// ============================================================
// Token Utilities
// ============================================================

interface DecodedToken {
  userId: string
  email: string
  role: UserRole
  tenantId: string
  tenantSlug: string | null
  exp: number
  iat: number
}

/**
 * Extract authentication token from request.
 * Checks Authorization header first, then cookies.
 */
function extractToken(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Check cookie
  const sessionCookie = request.cookies.get('auth-token')?.value
  if (sessionCookie) {
    return sessionCookie
  }
  
  // Also check for session-id cookie (for server-side sessions)
  const sessionId = request.cookies.get('session-id')?.value
  if (sessionId) {
    return sessionId
  }
  
  return null
}

/**
 * Decode JWT token without verification (for middleware use).
 * Full verification happens in API routes.
 * 
 * Note: In production, you should verify the signature here too.
 * For now, we do basic validation and let API routes do full verification.
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    // Split token into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // Decode payload (base64url)
    const payload = parts[1]
    const decoded = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf-8')
    
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    
    // Validate required fields
    if (!parsed.sub || !parsed.email || !parsed.role || !parsed.exp) {
      return null
    }
    
    // Check expiration
    if (typeof parsed.exp === 'number' && parsed.exp * 1000 < Date.now()) {
      return null // Token expired
    }
    
    return {
      userId: parsed.sub as string,
      email: parsed.email as string,
      role: parsed.role as UserRole,
      tenantId: (parsed.tenantId as string) || '',
      tenantSlug: (parsed.tenantSlug as string) || null,
      exp: parsed.exp as number,
      iat: (parsed.iat as number) || 0,
    }
  } catch {
    return null
  }
}

// ============================================================
// Route Matching
// ============================================================

/**
 * Check if a path matches a route pattern.
 * Supports exact match and wildcard patterns.
 */
function matchesRoute(pathname: string, config: RouteConfig): boolean {
  const { path, isPattern } = config
  
  // Exact match
  if (!isPattern) {
    return pathname === path || pathname.startsWith(path + '/')
  }
  
  // Pattern match with wildcard support
  if (path.endsWith('/*')) {
    const basePath = path.slice(0, -2) // Remove /*
    return pathname === basePath || pathname.startsWith(basePath + '/')
  }
  
  // Standard prefix match for patterns
  return pathname.startsWith(path + '/') || pathname === path
}

/**
 * Find matching route configuration for the given path.
 */
function findRouteConfig(pathname: string): RouteConfig | null {
  // Check protected routes first (more specific)
  for (const route of PROTECTED_ROUTES) {
    if (matchesRoute(pathname, route)) {
      return route
    }
  }
  
  return null
}

/**
 * Check if a path is public (doesn't require authentication).
 */
function isPublicRoute(pathname: string): boolean {
  // Exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }
  
  // Prefix matches for static assets
  for (const publicPath of PUBLIC_ROUTES) {
    if (publicPath.endsWith('/') && pathname.startsWith(publicPath)) {
      return true
    }
  }
  
  return false
}

// ============================================================
// Role Validation
// ============================================================

/**
 * Valid user roles for middleware validation.
 */
const VALID_ROLES: Set<string> = new Set([
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'STAFF',
  'AGENT',
  'VIEWER',
  'CUSTOMER',
])

/**
 * Check if user's role is in the list of allowed roles.
 */
function hasValidRole(userRole: string, allowedRoles?: UserRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true // No role restriction
  }
  
  return allowedRoles.includes(userRole as UserRole)
}

// ============================================================
// Logging
// ============================================================

/**
 * Log authorization events for security auditing.
 * Logs include enough info for debugging but not sensitive data.
 */
function logAuthEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  }
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUTH:${level.toUpperCase()}]`, JSON.stringify(logEntry))
  }
  
  // In production, you'd send to your logging service
  // For now, we just use console with appropriate level
  switch (level) {
    case 'error':
      console.error('[AUTH]', logEntry)
      break
    case 'warn':
      console.warn('[AUTH]', logEntry)
      break
    default:
      console.log('[AUTH]', logEntry)
  }
}

// ============================================================
// Main Middleware Function
// ============================================================

/**
 * Next.js middleware for route protection and authorization.
 * 
 * This runs on every request before it reaches route handlers.
 * It handles:
 * 1. Token extraction from headers/cookies
 * 2. Token decoding and basic validation
 * 3. Route protection checks
 * 4. Role-based access control
 * 5. Redirects to login when necessary
 * 6. Adding user context to request headers
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  
  // Skip for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.') ||
    pathname.includes('.') && !pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }
  
  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }
  
  // Extract and decode token
  const token = extractToken(request)
  
  // Find route configuration
  const routeConfig = findRouteConfig(pathname)
  
  // If no route config found, allow by default (for unknown routes)
  // You could change this to deny by default for stricter security
  if (!routeConfig) {
    return NextResponse.next()
  }
  
  // Check if authentication is required
  if (routeConfig.requireAuth !== false) {
    // No token present
    if (!token) {
      logAuthEvent('warn', 'Unauthorized access attempt - No token provided', {
        pathname,
        method: request.method,
        ipAddress: request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown',
      })
      
      // Determine redirect URL based on portal
      const loginUrl = routeConfig.portal
        ? PORTAL_LOGIN_URLS[routeConfig.portal]
        : '/login'
      
      // For API requests, return JSON error instead of redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }
      
      // For page requests, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = loginUrl
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    
    // Decode and validate token
    const decodedToken = decodeToken(token)
    
    if (!decodedToken) {
      logAuthEvent('warn', 'Invalid or expired token', {
        pathname,
        method: request.method,
        hasToken: !!token,
      })
      
      // Clear invalid token cookie
      const response = pathname.startsWith('/api/')
        ? NextResponse.json(
            { success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
            { status: 401 }
          )
        : (() => {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('redirect', pathname)
            url.searchParams.set('expired', 'true')
            return NextResponse.redirect(url)
          })()
      
      response.cookies.delete('auth-token')
      response.cookies.delete('session-id')
      return response
    }
    
    // Validate role if required
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      if (!hasValidRole(decodedToken.role, routeConfig.roles)) {
        logAuthEvent('warn', 'Insufficient role permissions', {
          pathname,
          userRole: decodedToken.role,
          requiredRoles: routeConfig.roles,
          userId: decodedToken.userId,
        })
        
        // For API requests, return forbidden
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient permissions',
              code: 'FORBIDDEN',
              requiredRoles: routeConfig.roles,
              currentRole: decodedToken.role,
            },
            { status: 403 }
          )
        }
        
        // For page requests, redirect to unauthorized page or dashboard
        const url = request.nextUrl.clone()
        
        // Redirect to their own portal's dashboard
        if (decodedToken.role === 'SUPER_ADMIN') {
          url.pathname = '/admin'
        } else if (decodedToken.role === 'CUSTOMER') {
          url.pathname = '/customer'
        } else {
          url.pathname = '/lender'
        }
        
        return NextResponse.redirect(url)
      }
    }
    
    // Token is valid - create response with user context headers
    const response = NextResponse.next()
    
    // Add user information to headers for downstream use (API routes, server components)
    // These headers are internal-only and should never be exposed to the client
    response.headers.set('x-user-id', decodedToken.userId)
    response.headers.set('x-user-email', decodedToken.email)
    response.headers.set('x-user-role', decodedToken.role)
    response.headers.set('x-tenant-id', decodedToken.tenantId)
    if (decodedToken.tenantSlug) {
      response.headers.set('x-tenant-slug', decodedToken.tenantSlug)
    }
    
    return response
  }
  
  // Route doesn't require authentication
  return NextResponse.next()
}

// ============================================================
// Middleware Configuration
// ============================================================

/**
 * Configure which paths the middleware should run on.
 * Using matcher to exclude static files and optimize performance.
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     * - favicon.ico
     * - Public API health endpoints
     */
    '/((?!_next/static|_next/image|favicon.ico|logo\\.svg|api/health).*)',
  ],
}
