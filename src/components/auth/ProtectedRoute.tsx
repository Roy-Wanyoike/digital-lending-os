/**
 * Digital Lending OS - Protected Route Component
 * 
 * Client-side route protection component that:
 * - Checks if user is authenticated
 * - Validates user roles against allowed roles
 * - Validates required permissions
 * - Shows fallback UI or redirects when unauthorized
 * - Supports portal-type restrictions
 * 
 * Usage Examples:
 * ```tsx
 * // 1. Only super admins can see this content
 * <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
 *   <SuperAdminPanel />
 * </ProtectedRoute>
 * 
 * // 2. Require specific permission
 * <ProtectedRoute requiredPermissions={['loan:approve']}>
 *   <ApprovalButton />
 * </ProtectedRoute>
 * 
 * // 3. DCP staff only (multiple roles)
 * <ProtectedRoute portalType='dcp_staff'>
 *   <LenderDashboard />
 * </ProtectedRoute>
 * 
 * // 4. Custom unauthorized component
 * <ProtectedRoute 
 *   allowedRoles={['TENANT_ADMIN']}
 *   unauthorizedComponent={<UpgradePrompt />}
 * >
 *   <AdminSettings />
 * </ProtectedRoute>
 * ```
 */

'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole, PortalType, User } from '@/lib/auth-types'
import { getPermissionsForRole } from '@/lib/auth-utils'

// ============================================================
// Types
// ============================================================

interface ProtectedRouteProps {
  /** Content to protect */
  children: React.ReactNode
  /** Roles allowed to access this content */
  allowedRoles?: UserRole[]
  /** Specific permissions required */
  requiredPermissions?: string[]
  /** Portal type restriction */
  portalType?: PortalType
  /** Loading state component (shown while checking auth) */
  loadingFallback?: React.ReactNode
  /** Fallback when user doesn't meet role requirements */
  fallback?: React.ReactNode
  /** Redirect path when unauthorized (overrides default behavior) */
  unauthorizedRedirect?: string
  /** Custom component to show when unauthorized */
  unauthorizedComponent?: React.ReactNode
  /** Whether to redirect on unauthorized (default: true) */
  redirectOnUnauthorized?: boolean
  /** Custom authorization check function for complex scenarios */
  customCheck?: (user: User | null) => boolean | Promise<boolean>
}

// Default portal role mappings
const PORTAL_ROLES: Record<PortalType, UserRole[]> = {
  super_admin: ['SUPER_ADMIN'],
  dcp_staff: ['TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT', 'VIEWER'],
  customer: ['CUSTOMER'],
  api: [],
}

// ============================================================
// Default Components
// ============================================================

/** Default loading spinner */
function DefaultLoadingSpinner(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-8" data-testid="auth-loading">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Verifying access...</p>
      </div>
    </div>
  )
}

/** Default unauthorized message */
function DefaultUnauthorizedMessage(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" data-testid="auth-unauthorized">
      <div className="mb-4 rounded-full bg-amber-100 p-4">
        <svg
          className="h-8 w-8 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">Access Denied</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        You don&apos;t have permission to access this content. Please contact your administrator
        if you believe this is an error.
      </p>
    </div>
  )
}

// ============================================================
// Auth Context Hook
// ============================================================

/**
 * Get current auth state.
 * In a real app, this would connect to your auth store/context.
 * For now, we provide a hook that can be adapted to any auth system.
 */
interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

/**
 * Custom hook to get authentication state.
 * Replace this implementation with your actual auth store integration.
 */
function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    // Simulate fetching auth state
    // In production, replace with actual auth store subscription
    const checkAuth = async () => {
      try {
        // Try to fetch session from API
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setState({
              user: data.user as User,
              isLoading: false,
              isAuthenticated: true,
            })
            return
          }
        }
        
        // No valid session
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      } catch {
        // Error fetching session - assume not authenticated
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    checkAuth()
  }, [])

  return state
}

// ============================================================
// Authorization Logic
// ============================================================

interface AuthorizationResult {
  isAuthorized: boolean
  reason?: string
}

/**
 * Check if user meets all authorization requirements.
 */
function checkAuthorization(
  user: User | null,
  props: Pick<
    ProtectedRouteProps,
    | 'allowedRoles'
    | 'requiredPermissions'
    | 'portalType'
    | 'customCheck'
  >
): AuthorizationResult {
  // Must be authenticated
  if (!user) {
    return { isAuthorized: false, reason: 'not_authenticated' }
  }

  // Check portal type restriction
  if (props.portalType) {
    const portalRoles = PORTAL_ROLES[props.portalType]
    if (!portalRoles.includes(user.role)) {
      return { isAuthorized: false, reason: 'invalid_portal' }
    }
  }

  // Check role restrictions
  if (props.allowedRoles && props.allowedRoles.length > 0) {
    if (!props.allowedRoles.includes(user.role)) {
      return { isAuthorized: false, reason: 'insufficient_role' }
    }
  }

  // Check permission restrictions
  if (props.requiredPermissions && props.requiredPermissions.length > 0) {
    const userPermissions = getPermissionsForRole(user.role)
    const hasAllPermissions = props.requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    )

    if (!hasAllPermissions) {
      return { isAuthorized: false, reason: 'missing_permission' }
    }
  }

  // Check custom authorization logic (sync only here - async handled in component)
  if (props.customCheck) {
    const result = props.customCheck(user)
    
    // Handle async custom checks - defer to component
    if (result instanceof Promise) {
      return { isAuthorized: true } // Temporary, will be rechecked
    }
    
    if (!result) {
      return { isAuthorized: false, reason: 'custom_check_failed' }
    }
  }

  return { isAuthorized: true }
}

// ============================================================
// Main Component
// ============================================================

/**
 * ProtectedRoute - Client-side route protection component.
 * 
 * Wraps content that requires authentication and/or specific roles/permissions.
 * Handles loading states and unauthorized access gracefully.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermissions,
  portalType,
  loadingFallback,
  fallback,
  unauthorizedRedirect,
  unauthorizedComponent,
  redirectOnUnauthorized = true,
  customCheck,
}: ProtectedRouteProps): React.ReactElement {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuthState()
  const [asyncAuthResult, setAsyncAuthResult] = useState<boolean | null>(null)
  const [shouldRedirectTo, setShouldRedirectTo] = useState<string | null>(null)

  // Memoize authorization check result
  const authResult = useMemo<AuthorizationResult>(() => {
    return checkAuthorization(user, {
      allowedRoles,
      requiredPermissions,
      portalType,
      customCheck,
    })
  }, [user, allowedRoles, requiredPermissions, portalType, customCheck])

  // Determine final authorization status
  const isAuthorized = customCheck
    ? asyncAuthResult ?? authResult.isAuthorized
    : authResult.isAuthorized

  // Compute what should happen - all hooks must be called before any returns
  const showLoading = isLoading || (customCheck && asyncAuthResult === null && user)
  const needsAuthRedirect = !isAuthenticated && (unauthorizedRedirect || redirectOnUnauthorized)
  const needsUnauthorizedRedirect = isAuthenticated && !isAuthorized && 
    !unauthorizedComponent && !fallback && (unauthorizedRedirect || redirectOnUnauthorized)

  // Build redirect URL
  const authRedirectUrl = useMemo(() => {
    if (!isAuthenticated && (unauthorizedRedirect || redirectOnUnauthorized)) {
      return unauthorizedRedirect || '/login'
    }
    if (isAuthenticated && !isAuthorized && !unauthorizedComponent && !fallback && (unauthorizedRedirect || redirectOnUnauthorized)) {
      return unauthorizedRedirect || '/unauthorized'
    }
    return null
  }, [isAuthenticated, isAuthorized, unauthorizedRedirect, redirectOnUnauthorized, unauthorizedComponent, fallback])

  // Handle async custom checks - always called
  useEffect(() => {
    let isMounted = true
    
    if (user && customCheck && authResult.isAuthorized) {
      const result = customCheck(user)
      
      if (result instanceof Promise) {
        result.then((passed) => {
          if (isMounted) {
            setAsyncAuthResult(passed)
          }
        }).catch(() => {
          if (isMounted) {
            setAsyncAuthResult(false)
          }
        })
      }
    }
    
    return () => {
      isMounted = false
    }
  }, [user, customCheck, authResult.isAuthorized])

  // Handle redirects - always called, but only redirects when needed
  useEffect(() => {
    if (authRedirectUrl) {
      const redirectPath = authRedirectUrl === '/login' || authRedirectUrl === '/unauthorized'
        ? `${authRedirectUrl}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`
        : authRedirectUrl
      
      router.push(redirectPath)
    }
  }, [router, authRedirectUrl])

  // Show loading state while checking authentication
  if (showLoading) {
    return <>{loadingFallback ?? <DefaultLoadingSpinner />}</>
  }

  // User is not authenticated
  if (!isAuthenticated) {
    // If we need to redirect, show loading while redirect happens
    if (needsAuthRedirect) {
      return <DefaultLoadingSpinner />
    }
    
    // Otherwise show fallback or unauthorized message
    return <>{fallback ?? <DefaultUnauthorizedMessage />}</>
  }

  // User is authenticated but not authorized
  if (!isAuthorized) {
    // Use custom unauthorized component if provided
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>
    }
    
    // Use fallback if provided
    if (fallback) {
      return <>{fallback}</>
    }
    
    // If redirecting, show loading while redirect happens
    if (needsUnauthorizedRedirect) {
      return <DefaultLoadingSpinner />
    }
    
    // Default unauthorized message
    return <DefaultUnauthorizedMessage />
  }

  // User is authorized - render children
  return <>{children}</>
}

// ============================================================
// Exports
// ============================================================

export default ProtectedRoute

// Re-export types for convenience
export type { ProtectedRouteProps }
