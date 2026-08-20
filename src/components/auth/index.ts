/**
 * Digital Lending OS - Auth Components Barrel Export
 * 
 * Re-export all authentication and authorization components
 * from a single entry point for convenient imports.
 */

// Main components
export { ProtectedRoute, default as ProtectedRouteDefault } from './ProtectedRoute'
export type { ProtectedRouteProps } from './ProtectedRoute'

export { ConditionalRender, If, Switch, Case, Default } from './ConditionalRender'
export type { ConditionalRenderProps, ConditionFn } from './ConditionalRender'

export { WithAuth, WithSuperAdmin, WithTenantAdmin, WithManager, WithDcpStaff, WithCustomer } from './WithAuth'
export type { WithAuthOptions, AuthInjectedProps } from './WithAuth'

export { RequirePermission, Can, Cannot } from './RequirePermission'
export type { RequirePermissionProps, PermissionMode } from './RequirePermission'

export { RoleGate, AdminOnly, StaffOnly, ManagerUp, RoleSwitch } from './RoleGate'
export type { RoleGateProps, GateMode } from './RoleGate'
