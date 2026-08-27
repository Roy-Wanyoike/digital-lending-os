/**
 * Digital Lending OS - WithAuth HOC (Higher-Order Component)
 * 
 * A Higher-Order Component wrapper that provides authentication context
 * to any component. This is useful for:
 * - Class-like patterns where hooks can't be used directly
 * - Adding auth requirements to existing components without modification
 * - Creating reusable authenticated component wrappers
 * 
 * Usage Examples:
 * ```tsx
 * // 1. Basic usage - require authentication
 * const ProtectedDashboard = WithAuth(DashboardComponent)
 * 
 * // 2. With role requirement
 * const AdminPanel = WithAuth(SettingsPanel, { allowedRoles: ['SUPER_ADMIN', 'TENANT_ADMIN'] })
 * 
 * // 3. With custom loading and fallback UI
 * const SecureReport = WithAuth(ReportViewer, {
 *   loadingFallback: <ReportSkeleton />,
 *   fallback: <UpgradePrompt />,
 * })
 * 
 * // 4. With permission check
 * const ApproveButton = WithAuth(ApproveButtonBase, {
 *   requiredPermissions: ['loan:approve'],
 * })
 * 
 * // 5. In a page component
 * export default WithAdminAuth(MyPage)
 * ```
 */

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole, User } from '@/lib/auth-types'
import { getPermissionsForRole } from '@/lib/auth-utils'

// ============================================================
// Types
// ============================================================

interface WithAuthOptions {
  /** Roles allowed to access the wrapped component */
  allowedRoles?: UserRole[]
  /** Specific permissions required */
  requiredPermissions?: string[]
  /** Custom loading component */
  loadingFallback?: React.ReactNode
  /** Fallback when unauthorized */
  fallback?: React.ReactNode
  /** Redirect path on unauthorized */
  redirectTo?: string
  /** Whether to redirect on unauthorized (default: true) */
  redirectOnUnauthorized?: boolean
  /** Custom authorization check */
  customCheck?: (user: User | null) => boolean | Promise<boolean>
}

interface AuthInjectedProps {
  /** Current authenticated user */
  user: User | null
  /** Whether authentication is still being verified */
  isLoading: boolean
  /** Whether user is authenticated */
  isAuthenticated: boolean
}

// ============================================================
// Default Components
// ============================================================

function DefaultLoading(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )
}

function DefaultUnauthorized(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-8 text-slate-500">
      <p>Access denied</p>
    </div>
  )
}

// ============================================================
// Auth Hook
// ============================================================

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' })
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
        
        setState({ user: null, isLoading: false, isAuthenticated: false })
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
    }

    checkAuth()
  }, [])

  return state
}

// ============================================================
// Authorization Check
// ============================================================

function checkAuthorization(
  user: User | null,
  options: WithAuthOptions
): boolean {
  if (!user) return false

  // Check roles
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(user.role)) {
      return false
    }
  }

  // Check permissions
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const userPermissions = getPermissionsForRole(user.role)
    const hasAll = options.requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    )
    if (!hasAll) return false
  }

  return true
}

// ============================================================
// Main HOC Function
// ============================================================

/**
 * WithAuth - Higher-Order Component for adding authentication.
 * 
 * Wraps a component with authentication checks and provides
 * auth context as props.
 * 
 * @param Component - The component to wrap
 * @param options - Authentication options
 * @returns Wrapped component with auth protection
 */
export function WithAuth<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>,
  options: WithAuthOptions = {}
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  const {
    allowedRoles,
    requiredPermissions,
    loadingFallback,
    fallback,
    redirectTo,
    redirectOnUnauthorized = true,
    customCheck,
  } = options

  const WrappedComponent: React.ComponentType<Omit<P, keyof AuthInjectedProps>> = (props) => {
    const router = useRouter()
    const { user, isLoading, isAuthenticated } = useAuthState()
    const [asyncResult, setAsyncResult] = useState<boolean | null>(null)
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

    // Determine base authorization status
    const baseAuthorized = useMemo(() => 
      checkAuthorization(user, options), 
      [user]
    )

    // Determine final authorization status
    const isAuthorized = customCheck
      ? asyncResult ?? baseAuthorized
      : baseAuthorized

    // Compute all conditions before any returns (hooks must be called unconditionally)
    const showLoading = isLoading || (customCheck && asyncResult === null && user)
    const needsAuthRedirect = !isAuthenticated && (redirectTo || redirectOnUnauthorized)
    const needsUnauthRedirect = isAuthenticated && !isAuthorized && !fallback && (redirectTo || redirectOnUnauthorized)
    
    // Compute target redirect URL
    const targetRedirectUrl = useMemo(() => {
      if (!isAuthenticated && (redirectTo || redirectOnUnauthorized)) {
        return redirectTo || '/login'
      }
      if (isAuthenticated && !isAuthenticated && !fallback && (redirectTo || redirectOnUnauthorized)) {
        return '/unauthorized'
      }
      return null
    }, [isAuthenticated, isAuthorized, redirectTo, redirectOnUnauthorized, fallback])

    // Handle async custom checks - always called
    useEffect(() => {
      let isMounted = true

      if (user && customCheck && baseAuthorized) {
        const result = customCheck(user)

        if (result instanceof Promise) {
          result.then((passed) => {
            if (isMounted) setAsyncResult(passed)
          }).catch(() => {
            if (isMounted) setAsyncResult(false)
          })
        }
      }

      return () => {
        isMounted = false
      }
    }, [user])

    // Handle redirects - always called, only redirects when needed
    useEffect(() => {
      if (targetRedirectUrl) {
        const path = targetRedirectUrl === '/login' || targetRedirectUrl === '/unauthorized'
          ? `${targetRedirectUrl}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`
          : targetRedirectUrl
        router.push(path)
      }
    }, [router, targetRedirectUrl])

    // Loading state
    if (showLoading) {
      return <>{loadingFallback ?? <DefaultLoading />}</>
    }

    // Not authenticated
    if (!isAuthenticated) {
      if (needsAuthRedirect) {
        return <DefaultLoading />
      }

      return <>{fallback ?? <DefaultUnauthorized />}</>
    }

    // Not authorized
    if (!isAuthorized) {
      if (fallback) {
        return <>{fallback}</>
      }

      if (needsUnauthRedirect) {
        return <DefaultLoading />
      }

      return <DefaultUnauthorized />
    }

    // Authorized - render component with injected props
    return <Component {...(props as P)} user={user} isLoading={isLoading} isAuthenticated={isAuthenticated} />
  }

  // Set display name for debugging
  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `WithAuth(${displayName})`

  return WrappedComponent
}

// ============================================================
// Pre-configured HOC Variants
// ============================================================

/**
 * HOC that requires Super Admin role.
 */
export function WithSuperAdmin<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  return WithAuth(Component, { allowedRoles: ['SUPER_ADMIN'] })
}

/**
 * HOC that requires Tenant Admin or higher role.
 */
export function WithTenantAdmin<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  return WithAuth(Component, { allowedRoles: ['SUPER_ADMIN', 'TENANT_ADMIN'] })
}

/**
 * HOC that requires Manager or higher role.
 */
export function WithManager<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  return WithAuth(Component, { allowedRoles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'] })
}

/**
 * HOC that requires DCP Staff role (any staff role).
 */
export function WithDcpStaff<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  return WithAuth(Component, {
    allowedRoles: ['TENANT_ADMIN', 'MANAGER', 'TENANT_STAFF', 'TENANT_AGENT'],
  })
}

/**
 * HOC for customer-only content.
 */
export function WithCustomer<P extends object>(
  Component: React.ComponentType<P & AuthInjectedProps>
): React.ComponentType<Omit<P, keyof AuthInjectedProps>> {
  return WithAuth(Component, { allowedRoles: ['CUSTOMER'] })
}

// ============================================================
// Exports
// ============================================================

export default WithAuth

// Re-export types
export type { WithAuthOptions, AuthInjectedProps }
