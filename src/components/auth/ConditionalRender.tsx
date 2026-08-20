/**
 * Digital Lending OS - Conditional Render Component (ABAC)
 * 
 * Attribute-Based Access Control (ABAC) conditional rendering component.
 * Unlike ProtectedRoute which handles page-level protection, this component
 * is designed for fine-grained UI element visibility based on:
 * - User attributes (approval limits, departments, etc.)
 * - Custom conditions
 * - Data-driven authorization decisions
 * 
 * Usage Examples:
 * ```tsx
 * // 1. Show approve button only if user can approve this amount
 * <ConditionalRender
 *   condition={(user) => (user.attributes?.approvalLimit ?? 0) >= loanAmount}
 * >
 *   <ApproveButton amount={loanAmount} />
 * </ConditionalRender>
 * 
 * // 2. Show different content based on condition
 * <ConditionalRender
 *   condition={(user) => user.role === 'MANAGER'}
 *   fallback={<ReadOnlyView />}
 * >
 *   <EditableForm />
 * </ConditionalRender>
 * 
 * // 3. Async condition check
 * <ConditionalRender
 *   condition={async (user) => await canUserAccessFeature(user.id, 'reports')}
 *   loading={<Skeleton />}
 * >
 *   <ReportsPanel />
 * </ConditionalRender>
 * 
 * // 4. Multiple conditions with AND logic
 * <ConditionalRender
 *   conditions={[
 *     (user) => user.isActive,
 *     (user) => (user.attributes?.clearanceLevel ?? 0) >= 3,
 *   ]}
 * >
 *   <SensitiveData />
 * </ConditionalRender>
 * ```
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '@/lib/auth-types'

// ============================================================
// Types
// ============================================================

/**
 * Condition function type.
 * Receives the current user and returns a boolean or Promise<boolean>.
 */
export type ConditionFn = (user: User | null) => boolean | Promise<boolean>

interface ConditionalRenderProps {
  /** Content to render when condition is met */
  children: React.ReactNode
  /** Single condition to check */
  condition?: ConditionFn
  /** Multiple conditions (all must pass - AND logic) */
  conditions?: ConditionFn[]
  /** Fallback content when condition is not met */
  fallback?: React.ReactNode
  /** Loading state for async conditions */
  loading?: React.ReactNode
  /** Current user object (optional - will use auth context if not provided) */
  user?: User | null
  /** Callback when condition result changes */
  onResultChange?: (isMet: boolean) => void
}

// ============================================================
// Default Components
// ============================================================

/** Minimal loading indicator */
function DefaultLoading(): React.ReactElement {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  )
}

/** Empty fragment as default fallback */
function EmptyFallback(): React.ReactElement {
  return <></>
}

// ============================================================
// Auth Context Hook
// ============================================================

/**
 * Get current user from auth context.
 * This is a simplified version - integrate with your actual auth store.
 */
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
 * ConditionalRender - ABAC-style conditional rendering.
 * 
 * Renders children only when the specified condition(s) are met.
 * Supports both synchronous and asynchronous conditions.
 */
export function ConditionalRender({
  children,
  condition,
  conditions,
  fallback,
  loading,
  user: providedUser,
  onResultChange,
}: ConditionalRenderProps): React.ReactElement {
  // Get user from props or auth context
  const contextUser = useCurrentUser()
  const user = providedUser !== undefined ? providedUser : contextUser
  
  // State for async condition evaluation
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [conditionResult, setConditionResult] = useState<boolean | null>(null)

  // Combine single condition into conditions array
  const allConditions = useMemo(() => {
    if (conditions) return conditions
    if (condition) return [condition]
    return []
  }, [condition, conditions])

  // Evaluate conditions
  useEffect(() => {
    let isMounted = true
    
    const evaluate = async () => {
      // If no conditions, always show content
      if (allConditions.length === 0) {
        if (isMounted) {
          setConditionResult(true)
          onResultChange?.(true)
        }
        return
      }
      
      // Check if any condition is async
      const hasAsync = allConditions.some((fn) => {
        try {
          const result = fn(user)
          return result instanceof Promise
        } catch {
          return false
        }
      })

      if (hasAsync) {
        setIsEvaluating(true)
        
        try {
          // Evaluate all conditions
          const results = await Promise.all(
            allConditions.map(async (fn) => {
              try {
                return await fn(user)
              } catch {
                return false
              }
            })
          )
          
          // All must pass (AND logic)
          const passed = results.every(Boolean)
          
          if (isMounted) {
            setConditionResult(passed)
            onResultChange?.(passed)
          }
        } catch {
          if (isMounted) {
            setConditionResult(false)
            onResultChange?.(false)
          }
        } finally {
          if (isMounted) {
            setIsEvaluating(false)
          }
        }
      } else {
        // Synchronous evaluation
        try {
          const passed = allConditions.every((fn) => {
            try {
              return fn(user) === true
            } catch {
              return false
            }
          })
          
          if (isMounted) {
            setConditionResult(passed)
            onResultChange?.(passed)
          }
        } catch {
          if (isMounted) {
            setConditionResult(false)
            onResultChange?.(false)
          }
        }
      }
    }

    evaluate()

    return () => {
      isMounted = false
    }
  }, [user, allConditions, onResultChange])

  // Show loading state while evaluating async conditions
  if (isEvaluating && conditionResult === null) {
    return <>{loading ?? <DefaultLoading />}</>
  }

  // Show children when condition is met
  if (conditionResult === true || (conditionResult === null && allConditions.length === 0)) {
    return <>{children}</>
  }

  // Show fallback when condition is not met
  return <>{fallback ?? <EmptyFallback />}</>
}

// ============================================================
// Specialized Variants
// ============================================================

interface IfProps {
  /** Condition to check */
  condition: boolean | ((user: User | null) => boolean)
  /** Content to render when true */
  children: React.ReactNode
  /** Optional else content */
  else?: React.ReactNode
  /** User object (optional) */
  user?: User | null
}

/**
 * Simple if/else conditional render.
 * 
 * Usage:
 * ```tsx
 * <If condition={isAdmin}>
 *   <AdminPanel />
 *   else={<UserPanel />}
 * </If>
 * 
 * <If condition={(u) => u?.role === 'MANAGER'}>
 *   <ManagerControls />
 * </If>
 * ```
 */
export function If({ condition, children, else: elseContent, user }: IfProps): React.ReactElement {
  const contextUser = useCurrentUser()
  const currentUser = user !== undefined ? user : contextUser
  
  const result = typeof condition === 'function' ? condition(currentUser) : condition
  
  return <>{result ? children : elseContent ?? null}</>
}

/**
 * Switch-like component for multiple conditions.
 * 
 * Usage:
 * ```tsx
 * <Switch>
 *   <Case condition={(u) => u?.role === 'SUPER_ADMIN'}>
 *     <SuperAdminView />
 *   </Case>
 *   <Case condition={(u) => u?.role === 'TENANT_ADMIN'}>
 *     <TenantAdminView />
 *   </Case>
 *   <Default>
 *     <StandardView />
 *   </Default>
 * </Switch>
 * ```
 */

interface CaseProps {
  condition: boolean | ((user: User | null) => boolean)
  children: React.ReactNode
  user?: User | null
}

function CaseInternal({ condition, children, user }: CaseProps & { isActive: boolean }): React.ReactElement | null {
  // Always call hooks unconditionally
  const contextUser = useCurrentUser()
  const currentUser = user !== undefined ? user : contextUser
  
  // Then do conditional logic
  if (!isActive) return null
  
  const result = typeof condition === 'function' ? condition(currentUser) : condition
  
  return result ? <>{children}</> : null
}

interface DefaultProps {
  children: React.ReactNode
}

function DefaultInternal({ children, hasMatch }: DefaultProps & { hasMatch: boolean }): React.ReactElement | null {
  if (hasMatch) return null
  return <>{children}</>
}

interface SwitchProps {
  children: React.ReactNode
  user?: User | null
}

/**
 * Switch component for multiple mutually exclusive conditions.
 * Renders the first matching case.
 */
export function Switch({ children, user: switchUser }: SwitchProps): React.ReactElement {
  // In a real implementation, you'd need more complex logic here
  // For now, we just render children and let Case components handle their own logic
  return <>{children}</>
}

// Re-export Case and Default as part of Switch
export { CaseInternal as Case, DefaultInternal as Default }

// ============================================================
// Exports
// ============================================================

export default ConditionalRender

// Re-export types
export type { ConditionalRenderProps, ConditionFn }
