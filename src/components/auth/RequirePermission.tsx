/**
 * Digital Lending OS - RequirePermission Component
 * 
 * Granular permission gate component for fine-grained access control.
 * Unlike RoleGate which checks roles, this component checks specific
 * permissions that may be granted to multiple roles.
 * 
 * Usage Examples:
 * ```tsx
 * // 1. Simple permission check
 * <RequirePermission permission="loan:approve">
 *   <ApproveButton />
 * </RequirePermission>
 * 
 * // 2. Multiple permissions (all required)
 * <RequirePermission permissions={['loan:approve', 'loan:reject']}>
 *   <LoanActionsPanel />
 * </RequirePermission>
 * 
 * // 3. With fallback UI
 * <RequirePermission 
 *   permission="settings:manage"
 *   fallback={<LockIcon tooltip="Admin only" />}
 * >
 *   <SettingsButton />
 * </RequirePermission>
 * 
 * // 4. Any permission mode (at least one required)
 * <RequirePermission 
 *   permissions={['report:read', 'dashboard:read']}
 *   mode="any"
 * >
 *   <AnalyticsWidget />
 * </RequirePermission>
 * 
 * // 5. Hide completely instead of showing fallback
 * <RequirePermission permission="user:delete" mode="hide">
 *   <DeleteUserButton />
 * </RequirePermission>
 * ```
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@/lib/auth-types'
import { requirePermission, requireAllPermissions, requireAnyPermission } from '@/lib/auth-utils'

// ============================================================
// Types
// ============================================================

type PermissionMode = 'all' | 'any' | 'hide'

interface RequirePermissionProps {
  /** Content to protect */
  children: React.ReactNode
  /** Single permission required */
  permission?: string
  /** Multiple permissions */
  permissions?: string[]
  /** Permission check mode: all (AND), any (OR), hide (no fallback) */
  mode?: PermissionMode
  /** Fallback when permission is not granted */
  fallback?: React.ReactNode
  /** User object (optional - fetched from context if not provided) */
  user?: User | null
  /** Show a reason for denial in development */
  showReason?: boolean
}

// ============================================================
// Default Components
// ============================================================

/** Default locked icon fallback */
function DefaultLockedFallback({ reason }: { reason?: string }): React.ReactElement {
  return (
    <span
      className="inline-flex items-center gap-1 text-slate-400"
      title={reason ?? 'Permission required'}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      {process.env.NODE_ENV === 'development' && reason && (
        <span className="text-xs text-slate-400">({reason})</span>
      )}
    </span>
  )
}

/** Empty component for hide mode */
function NullComponent(): React.ReactElement {
  return <></>
}

// ============================================================
// Auth Hook
// ============================================================

function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user ?? null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoaded(true)
      }
    }

    fetchUser()
  }, [])

  return user
}

// ============================================================
// Main Component
// ============================================================

/**
 * RequirePermission - Granular permission gate.
 * 
 * Renders children only when the user has the required permission(s).
 * Supports single or multiple permissions with AND/OR logic.
 */
export function RequirePermission({
  children,
  permission,
  permissions,
  mode = 'all',
  fallback,
  user: providedUser,
  showReason = false,
}: RequirePermissionProps): React.ReactElement {
  const contextUser = useCurrentUser()
  const user = providedUser !== undefined ? providedUser : contextUser

  // Combine permissions
  const requiredPermissions = useMemo(() => {
    if (permissions) return permissions
    if (permission) return [permission]
    return []
  }, [permission, permissions])

  // Check permission
  const hasPermission = useMemo(() => {
    if (!user || requiredPermissions.length === 0) {
      return true // No restriction
    }

    switch (mode) {
      case 'any':
        return requireAnyPermission(user, requiredPermissions)
      case 'all':
      default:
        if (requiredPermissions.length === 1) {
          return requirePermission(user, requiredPermissions[0])
        }
        return requireAllPermissions(user, requiredPermissions)
    }
  }, [user, requiredPermissions, mode])

  // Determine missing permissions for display
  const missingPermissions = useMemo(() => {
    if (hasPermission || !user) return []
    
    return requiredPermissions.filter((perm) => !requirePermission(user, perm))
  }, [hasPermission, user, requiredPermissions])

  // Build reason string
  const denialReason = useMemo(() => {
    if (hasPermission || missingPermissions.length === 0) return undefined
    
    if (missingPermissions.length === 1) {
      return `Missing permission: ${missingPermissions[0]}`
    }
    
    return `Missing permissions: ${missingPermissions.join(', ')}`
  }, [hasPermission, missingPermissions])

  // Hide mode - render nothing without fallback
  if (mode === 'hide' && !hasPermission) {
    return <NullComponent />
  }

  // Has permission - render children
  if (hasPermission) {
    return <>{children}</>
  }

  // No permission - render fallback
  if (fallback !== undefined) {
    return <>{fallback}</>
  }

  // Default fallback with optional reason
  return <DefaultLockedFallback reason={showReason ? denialReason : undefined} />
}

// ============================================================
// Specialized Variants
// ============================================================

interface CanProps {
  /** Permission to check */
  permission: string
  /** Children to render when permission is granted */
  children: React.ReactNode
  /** Optional fallback */
  fallback?: React.ReactNode
  /** User object */
  user?: User | null
}

/**
 * Simpler "Can" component for single permission checks.
 * 
 * Usage:
 * ```tsx
 * <Can permission="loan:create">
 *   <NewLoanButton />
 * </Can>
 * ```
 */
export function Can({ permission, children, fallback, user }: CanProps): React.ReactElement {
  return (
    <RequirePermission
      permission={permission}
      fallback={fallback}
      user={user}
    >
      {children}
    </RequirePermission>
  )
}

interface CannotProps {
  /** Permission to check */
  permission: string
  /** Children to render when permission is NOT granted */
  children: React.ReactNode
  /** Fallback when permission IS granted */
  fallback?: React.ReactNode
  /** User object */
  user?: User | null
}

/**
 * Inverse of Can - renders when user does NOT have permission.
 * 
 * Usage:
 * ```tsx
 * <Cannot permission="user:delete">
 *   <p>You cannot delete users.</p>
 * </Cannot>
 * ```
 */
export function Cannot({ permission, children, fallback, user }: CannotProps): React.ReactElement {
  const contextUser = useCurrentUser()
  const currentUser = user !== undefined ? user : contextUser
  
  const lacksPermission = currentUser ? !requirePermission(currentUser, permission) : true
  
  if (lacksPermission) {
    return <>{children}</>
  }
  
  return <>{fallback ?? null}</>
}

// ============================================================
// Exports
// ============================================================

export default RequirePermission

// Re-export types
export type { RequirePermissionProps, PermissionMode }
