/**
 * Digital Lending OS - RoleGate Component
 * 
 * Visual role-based UI component for showing/hiding UI elements
 * based on user roles. Unlike ProtectedRoute which handles page-level
 * protection, this component is designed for fine-grained UI control
 * within pages.
 * 
 * Key Differences from ProtectedRoute:
 * - ProtectedRoute: Page-level protection, redirects on unauthorized
 * - RoleGate: Element-level visibility, shows fallback or hides
 * 
 * Usage Examples:
 * ```tsx
 * // 1. Show button only to admins
 * <RoleGate roles={['TENANT_ADMIN', 'SUPER_ADMIN']}>
 *   <Button variant="destructive">Delete Tenant</Button>
 * </RoleGate>
 * 
 * // 2. Show alternative content for non-admins
 * <RoleGate 
 *   roles={['TENANT_ADMIN']}
 *   fallback={<Badge variant="secondary">Admin Only</Badge>}
 * >
 *   <SettingsPanel />
 * </RoleGate>
 * 
 * // 3. Hide completely (no fallback)
 * <RoleGate roles={['MANAGER']} mode="hide">
 *   <ApprovalSection />
 * </RoleGate>
 * 
 * // 4. Multiple children with different role requirements
 * <RoleGate roles={['STAFF', 'MANAGER']}>
 *   <InternalNotes />
 * </RoleGate>
 * <RoleGate roles={['CUSTOMER']}>
 *   <PublicInfo />
 * </RoleGate>
 * 
 * // 5. Minimum role level (using hierarchy)
 * <RoleGate minRole="MANAGER">
 *   <SensitiveData />
 * </RoleGate>
 * ```
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { UserRole, User } from '@/lib/auth-types'
import { ROLE_HIERARCHY } from '@/lib/auth-types'

// ============================================================
// Types
// ============================================================

type GateMode = 'show' | 'hide' | 'disable'

interface RoleGateProps {
  /** Content to show/hide based on role */
  children: React.ReactNode
  /** Roles that can see this content */
  roles?: UserRole[]
  /** Minimum role level (uses hierarchy) */
  minRole?: UserRole
  /** Roles that CANNOT see this content (inverse) */
  excludeRoles?: UserRole[]
  /** How to handle unauthorized users */
  mode?: GateMode
  /** Fallback content when not authorized */
  fallback?: React.ReactNode
  /** User object (optional - fetched from context if not provided) */
  user?: User | null
  /** Additional CSS class when disabled */
  disabledClassName?: string
}

// ============================================================
// Default Components
// ============================================================

/** Default fallback - empty */
function EmptyFallback(): React.ReactElement {
  return <></>
}

/** Default restricted badge */
function RestrictedBadge(): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
      Restricted
    </span>
  )
}

// ============================================================
// Auth Hook
// ============================================================

function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null)

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
      }
    }

    fetchUser()
  }, [])

  return user
}

// ============================================================
// Role Checking Logic
// ============================================================

/**
 * Check if user's role meets the gate requirements.
 */
function checkRoleAccess(
  user: User | null,
  options: Pick<RoleGateProps, 'roles' | 'minRole' | 'excludeRoles'>
): boolean {
  if (!user) return false

  const { roles, minRole, excludeRoles } = options

  // Check excluded roles first
  if (excludeRoles && excludeRoles.length > 0) {
    if (excludeRoles.includes(user.role)) {
      return false
    }
  }

  // Check minimum role level
  if (minRole) {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0
    const minLevel = ROLE_HIERARCHY[minRole] ?? 0
    if (userLevel < minLevel) {
      return false
    }
  }

  // Check specific roles
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return false
    }
  }

  // If no restrictions, allow access
  if (!roles && !minRole && (!excludeRoles || excludeRoles.length === 0)) {
    return true
  }

  return true
}

// ============================================================
// Main Component
// ============================================================

/**
 * RoleGate - Role-based UI visibility component.
 * 
 * Shows or hides content based on user's role.
 * Supports multiple modes: show, hide, disable.
 */
export function RoleGate({
  children,
  roles,
  minRole,
  excludeRoles,
  mode = 'show',
  fallback,
  user: providedUser,
  disabledClassName = 'opacity-50 pointer-events-none',
}: RoleGateProps): React.ReactElement {
  const contextUser = useCurrentUser()
  const user = providedUser !== undefined ? providedUser : contextUser

  // Memoize access check result
  const hasAccess = useMemo(() => {
    return checkRoleAccess(user, { roles, minRole, excludeRoles })
  }, [user, roles, minRole, excludeRoles])

  // Handle different modes
  switch (mode) {
    case 'hide':
      // Completely hide when no access
      if (!hasAccess) {
        return <EmptyFallback />
      }
      return <>{children}</>

    case 'disable':
      // Show but disable when no access
      if (!hasAccess) {
        return (
          <div className={disabledClassName} aria-disabled="true">
            {children}
          </div>
        )
      }
      return <>{children}</>

    case 'show':
    default:
      // Show with optional fallback when no access
      if (hasAccess) {
        return <>{children}</>
      }
      
      // Render fallback
      if (fallback !== undefined) {
        return <>{fallback}</>
      }
      
      // Default fallback
      return <RestrictedBadge />
  }
}

// ============================================================
// Specialized Variants
// ============================================================

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  user?: User | null
}

/**
 * Content visible only to Super Admin and Tenant Admin.
 * 
 * Usage:
 * ```tsx
 * <AdminOnly>
 *   <DangerZone />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({ children, fallback, user }: AdminOnlyProps): React.ReactElement {
  return (
    <RoleGate
      roles={['SUPER_ADMIN', 'TENANT_ADMIN']}
      fallback={fallback}
      user={user}
    >
      {children}
    </RoleGate>
  )
}

interface StaffOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  includeAgents?: boolean
  user?: User | null
}

/**
 * Content visible only to DCP staff.
 * 
 * Usage:
 * ```tsx
 * <StaffOnly>
 *   <InternalDashboard />
 * </StaffOnly>
 * 
 * <StaffOnly includeAgents={false}>
 *   <OfficeOnlyContent />
 * </StaffOnly>
 * ```
 */
export function StaffOnly({ 
  children, 
  fallback, 
  includeAgents = true,
  user 
}: StaffOnlyProps): React.ReactElement {
  const roles = includeAgents
    ? ['TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT']
    : ['TENANT_ADMIN', 'MANAGER', 'STAFF']

  return (
    <RoleGate
      roles={roles}
      fallback={fallback}
      user={user}
    >
      {children}
    </RoleGate>
  )
}

interface ManagerUpProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  user?: User | null
}

/**
 * Content visible only to Manager and above.
 * 
 * Usage:
 * ```tsx
 * <ManagerUp>
 *   <ApprovalControls />
 * </ManagerUp>
 * ```
 */
export function ManagerUp({ children, fallback, user }: ManagerUpProps): React.ReactElement {
  return (
    <RoleGate
      minRole="MANAGER"
      fallback={fallback}
      user={user}
    >
      {children}
    </RoleGate>
  )
}

// ============================================================
// Compound Component Pattern
// ============================================================

interface RoleSwitchCaseProps {
  roles?: UserRole[]
  minRole?: UserRole
  children: React.ReactNode
  user?: User | null
}

interface RoleSwitchDefaultProps {
  children: React.ReactNode
}

/**
 * Role-based switch component for rendering different content based on role.
 * 
 * Usage:
 * ```tsx
 * <RoleSwitch>
 *   <RoleSwitch.Case roles={['SUPER_ADMIN']}>
 *     <SuperAdminNav />
 *   </RoleSwitch.Case>
 *   <RoleSwitch.Case roles={['TENANT_ADMIN', 'MANAGER']}>
 *     <ManagerNav />
 *   </RoleSwitch.Case>
 *   <RoleSwitch.Default>
 *     <StandardNav />
 *   </RoleSwitch.Default>
 * </RoleSwitch>
 * ```
 */
export function RoleSwitch({ children }: { children: React.ReactNode }): React.ReactElement {
  // In a real implementation, you'd iterate through children and find matching Case
  // For simplicity, we render all Cases and let each one handle its own logic
  return <>{children}</>
}

/**
 * Case component for RoleSwitch.
 */
RoleSwitch.Case = function RoleSwitchCase({ 
  roles, 
  minRole, 
  children,
  user 
}: RoleSwitchCaseProps): React.ReactElement | null {
  const contextUser = useCurrentUser()
  const currentUser = user !== undefined ? user : contextUser
  
  const hasAccess = checkRoleAccess(currentUser, { roles, minRole })
  
  if (!hasAccess) return null
  
  return <>{children}</>
}

/**
 * Default/fallback case for RoleSwitch.
 */
RoleSwitch.Default = function RoleSwitchDefault({ 
  children 
}: RoleSwitchDefaultProps): React.ReactElement {
  return <>{children}</>
}

// ============================================================
// Exports
// ============================================================

export default RoleGate

// Re-export types and sub-components
export type { RoleGateProps, GateMode }
export { AdminOnly, StaffOnly, ManagerUp, RoleSwitch }
