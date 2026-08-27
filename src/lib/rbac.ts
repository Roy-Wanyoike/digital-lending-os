/**
 * Digital Lending OS - RBAC + ABAC Permission Engine
 * 
 * Implements Role-Based Access Control (RBAC) combined with
 * Attribute-Based Access Control (ABAC) for fine-grained permissions.
 */

import type { 
  UserRole, 
  User, 
  AbacAttributes,
  PortalType 
} from './auth-types';

import { ROLE_HIERARCHY } from './auth-types';

// ============================================
// PERMISSION DEFINITIONS
// ============================================

/** Permission format: resource:action or resource:* for all actions */
export type Permission = string;

/**
 * Complete role-permission mapping.
 * SUPER_ADMIN has wildcard access (*).
 * Other roles have specific permission sets.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Platform-level admin - full access to everything
  SUPER_ADMIN: ['*'],
  
  // Tenant administrator - full control within their tenant
  TENANT_ADMIN: [
    // Tenant management
    'tenant:read',
    'tenant:update',
    'tenant:billing:read',
    
    // Customer management
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'customer:*',  // Wildcard for customer sub-resources
    
    // Loan management
    'loan:read',
    'loan:create',
    'loan:approve',
    'loan:disburse',
    'loan:write-off',
    'loan:restructure',
    'loan:*',
    
    // Application management
    'application:read',
    'application:create',
    'application:review',
    'application:approve',
    'application:reject',
    'application:*',
    
    // Repayment management
    'repayment:read',
    'repayment:create',
    'repayment:reverse',
    'repayment:*',
    
    // Staff management
    'staff:read',
    'staff:create',
    'staff:update',
    'staff:deactivate',
    'staff:manage',
    
    // Reports and analytics
    'reports:view',
    'reports:export',
    'reports:sensitive',  // PII-containing reports
    
    // Settings
    'settings:manage',
    'settings:branding',
    'settings:integrations',
    
    // Audit
    'audit:read',
    
    // Collections
    'collection:read',
    'collection:manage',
  ],
  
  // Manager - loan operations with approval authority
  MANAGER: [
    // Customer access
    'customer:read',
    'customer:create',
    'customer:update',
    
    // Loan operations
    'loan:read',
    'loan:approve',      // With ABAC limits on amount
    'loan:view-sensitive',
    
    // Application review
    'application:read',
    'application:review',
    'application:approve',
    'application:request-info',
    
    // Repayment viewing
    'repayment:read',
    
    // Reports
    'reports:view',
    'reports:export',
    
    // Limited staff view
    'staff:read',
    
    // Collections oversight
    'collection:read',
  ],
  
  // Regular staff - basic operations (TENANT_STAFF)
  TENANT_STAFF: [
    // Customer access (read-only mostly)
    'customer:read',
    'customer:create',
    
    // Loan viewing
    'loan:read',
    
    // Application handling
    'application:read',
    'application:create',
    'application:update-status',
    
    // Basic repayment info
    'repayment:read',
  ],
  
  // Field agent - collections focused (TENANT_AGENT)
  TENANT_AGENT: [
    // Customer identification
    'customer:read',
    'customer:view-contact',
    
    // Collection operations
    'collection:read',
    'collection:update',
    'collection:record-payment',
    'collection:schedule-visit',
    
    // Basic loan info for collections
    'loan:read',
    
    // Repayment recording
    'repayment:read',
    'repayment:create',
  ],
  
  // Customer - self-service only
  CUSTOMER: [
    // Own profile
    'own:profile:read',
    'own:profile:update',
    'own:profile:upload-docs',
    
    // Own loans
    'own:loan:read',
    'own:loan:apply',
    'own:loan:view-details',
    
    // Own repayments
    'own:repayment:read',
    'own:repayment:create',
    'own:repayment:view-schedule',
    
    // Own applications
    'own:application:read',
    'own:application:create',
    'own:application:withdraw',
    
    // Own documents
    'own:documents:read',
    'own:documents:upload',
  ],
};

// ============================================
// ROLE HIERARCHY
// ============================================

/**
 * Defines which roles inherit from which.
 * Higher roles implicitly have permissions of lower roles.
 */
export const ROLE_INHERITANCE: Record<UserRole, UserRole[]> = {
  SUPER_ADMIN: [],                              // Top of hierarchy
  TENANT_ADMIN: ['MANAGER', 'TENANT_STAFF', 'TENANT_AGENT'],
  MANAGER: ['TENANT_STAFF', 'TENANT_AGENT'],
  TENANT_STAFF: [],
  TENANT_AGENT: [],
  CUSTOMER: [],                               // Separate hierarchy
};

// ============================================
// APPROVAL LIMITS BY ROLE (ABAC)
// ============================================

/** Default approval limits in Kenyan Shillings (KES) */
export const DEFAULT_APPROVAL_LIMITS: Record<UserRole, number> = {
  SUPER_ADMIN: Infinity,                        // Unlimited
  TENANT_ADMIN: Infinity,                       // Unlimited within tenant
  MANAGER: 500000,                             // KES 500,000
  TENANT_STAFF: 0,                            // Cannot approve
  TENANT_AGENT: 0,                            // Cannot approve
  CUSTOMER: 0,                                // N/A for customers
};

// ============================================
// PORTAL-ROLE MAPPING
// ============================================

/** Which roles are allowed in each portal */
export const PORTAL_ROLES: Record<PortalType, UserRole[]> = {
  admin: ['SUPER_ADMIN'],
  lender: ['TENANT_ADMIN', 'MANAGER', 'TENANT_STAFF', 'TENANT_AGENT'],
  customer: ['CUSTOMER'],
  architecture: ['SUPER_ADMIN', 'TENANT_ADMIN'],
};

// ============================================
// RBAC FUNCTIONS
// ============================================

/**
 * Check if a user role has a specific permission.
 * Supports wildcard matching (e.g., 'loan:*' matches 'loan:approve')
 * 
 * @param userRole - The user's role
 * @param permission - The permission to check
 * @returns Whether the user has this permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  
  if (!rolePermissions) {
    return false;
  }
  
  // Super admin has all permissions
  if (rolePermissions.includes('*')) {
    return true;
  }
  
  // Check exact match
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check wildcard patterns
  const [resource] = permission.split(':');
  const wildcardPermission = `${resource}:*`;
  
  if (rolePermissions.includes(wildcardPermission)) {
    return true;
  }
  
  // Check inherited roles
  const inheritedRoles = ROLE_INHERITANCE[userRole] || [];
  for (const inheritedRole of inheritedRoles) {
    if (hasPermission(inheritedRole, permission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a user has ANY of the specified roles.
 * 
 * @param userRole - The user's current role
 * @param roles - Array of roles to check against
 * @returns True if user's role is in the list
 */
export function hasAnyRole(userRole: UserRole, roles: UserRole[]): boolean {
  return roles.includes(userRole);
}

/**
 * Check if a user has ALL of the specified roles.
 * Note: A user can only have one role at a time,
 * so this only returns true if roles contains exactly one entry matching userRole.
 * 
 * @param userRole - The user's current role
 * @param roles - Array of roles that must all be held
 * @returns True if user has all specified roles
 */
export function hasAllRoles(userRole: UserRole, roles: UserRole[]): boolean {
  if (roles.length === 0) return true;
  if (roles.length === 1) return roles[0] === userRole;
  // User can only have one role, so can't have "all" of multiple different roles
  return false;
}

/**
 * Check if user's role is at least the specified minimum level.
 * Uses ROLE_HIERARCHY for comparison.
 * 
 * @param userRole - The user's current role
 * @param minimumRole - The minimum required role level
 * @returns True if user's role >= minimum role
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Get all effective permissions for a role including inherited ones.
 * 
 * @param userRole - The user's role
 * @returns Set of all effective permissions
 */
export function getEffectivePermissions(userRole: UserRole): Set<Permission> {
  const permissions = new Set<Permission>();
  
  // Add direct permissions
  const directPermissions = ROLE_PERMISSIONS[userRole] || [];
  directPermissions.forEach(p => permissions.add(p));
  
  // Add inherited permissions
  const inheritedRoles = ROLE_INHERITANCE[userRole] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPerms = getEffectivePermissions(inheritedRole);
    inheritedPerms.forEach(p => permissions.add(p));
  }
  
  return permissions;
}

// ============================================
// ABAC FUNCTIONS
// ============================================

/**
 * ABAC constraint check result
 */
export interface AbacCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'APPROVAL_LIMIT_EXCEEDED' 
        | 'TENANT_ACCESS_DENIED' 
        | 'DEPARTMENT_ACCESS_DENIED'
        | 'IP_RESTRICTED'
        | 'MFA_REQUIRED'
        | 'SESSION_EXPIRED'
        | 'USER_INACTIVE'
        | 'RESOURCE_OWNER_MISMATCH';
}

/**
 * Check ABAC constraints for an action on a resource.
 * Combines multiple attribute checks for fine-grained authorization.
 * 
 * @param user - The user attempting the action
 * @param action - The action being attempted (e.g., 'loan:approve')
 * @param resource - The resource being acted upon with its attributes
 * @param attributes - The user's ABAC attributes
 * @returns Result indicating if action is allowed and why
 */
export function checkAbacConstraint(
  user: User,
  action: string,
  resource: Record<string, unknown>,
  attributes?: Partial<AbacAttributes>
): AbacCheckResult {
  const attrs = { 
    approvalLimit: DEFAULT_APPROVAL_LIMITS[user.role],
    tenantIds: [user.tenantId],
    departments: [],
    permissions: [],
    ipRestriction: null,
    mfaRequired: false,
    lastActivityAt: new Date(),
    ...attributes 
  };
  
  // 1. Check user is active
  if (!user.isActive) {
    return {
      allowed: false,
      reason: 'User account is inactive',
      code: 'USER_INACTIVE',
    };
  }
  
  // 2. Check approval limit for loan approvals
  if (action === 'loan:approve' || action.includes('approve')) {
    const amount = resource.amount as number | undefined;
    if (amount && attrs.approvalLimit < amount) {
      return {
        allowed: false,
        reason: `Approval limit exceeded. Limit: KES ${attrs.approvalLimit.toLocaleString()}, Requested: KES ${amount.toLocaleString()}`,
        code: 'APPROVAL_LIMIT_EXCEEDED',
      };
    }
  }
  
  // 3. Check tenant access
  if (resource.tenantId && !attrs.tenantIds.includes(resource.tenantId as string)) {
    return {
      allowed: false,
      reason: 'Access denied to this tenant',
      code: 'TENANT_ACCESS_DENIED',
    };
  }
  
  // 4. Check department access
  if (resource.department && attrs.departments.length > 0) {
    if (!attrs.departments.includes(resource.department as string)) {
      return {
        allowed: false,
        reason: 'Access denied to this department',
        code: 'DEPARTMENT_ACCESS_DENIED',
      };
    }
  }
  
  // 5. Check MFA requirement for sensitive actions
  const sensitiveActions = ['loan:approve', 'loan:disburse', 'loan:write-off', 'staff:deactivate'];
  if (sensitiveActions.some(a => action.includes(a)) && attrs.mfaRequired) {
    // In real implementation, would check if MFA was recently verified
    return {
      allowed: false,
      reason: 'Multi-factor authentication required for this action',
      code: 'MFA_REQUIRED',
    };
  }
  
  // 6. Check resource ownership for customer actions
  if (user.role === 'CUSTOMER' && action.startsWith('own:')) {
    if (resource.customerId && resource.customerId !== user.id) {
      return {
        allowed: false,
        reason: 'Can only access own resources',
        code: 'RESOURCE_OWNER_MISMATCH',
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if a user can approve a loan of a given amount.
 * Combines RBAC (role check) with ABAC (amount limit check).
 * 
 * @param user - The user attempting to approve
 * @param amount - The loan amount in KES
 * @param approvalLimit - Optional override for approval limit
 * @returns Whether the approval is allowed
 */
export function canApproveLoan(
  user: User,
  amount: number,
  approvalLimit?: number
): boolean {
  // First check RBAC: does role allow approving?
  if (!hasPermission(user.role, 'loan:approve')) {
    return false;
  }
  
  // Then check ABAC: is amount within limit?
  const limit = approvalLimit ?? DEFAULT_APPROVAL_LIMITS[user.role];
  return amount <= limit;
}

/**
 * Check if a user can access a specific tenant.
 * 
 * @param user - The user attempting access
 * @param tenantId - The tenant ID to check
 * @param accessibleTenantIds - List of accessible tenant IDs
 * @returns Whether access is allowed
 */
export function canAccessTenant(
  user: User,
  tenantId: string,
  accessibleTenantIds?: string[]
): boolean {
  // Super admins can access any tenant
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }
  
  // Tenant users can access their own tenant
  if (user.tenantId === tenantId) {
    return true;
  }
  
  // Check explicit tenant access list
  if (accessibleTenantIds?.includes(tenantId)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can perform actions in a department.
 * 
 * @param departments - User's departments
 * @param requiredDepartment - Department being accessed
 * @returns Whether access is allowed
 */
export function canAccessDepartment(
  departments: string[],
  requiredDepartment: string
): boolean {
  // Empty departments means no restriction
  if (departments.length === 0) {
    return true;
  }
  
  return departments.includes(requiredDepartment);
}

/**
 * Validate IP address against restriction.
 * 
 * @param ipRestriction - CIDR notation or IP range
 * @param clientIp - Client IP address
 * @returns Whether IP is allowed
 */
export function validateIpRestriction(
  ipRestriction: string | null,
  clientIp: string
): boolean {
  if (!ipRestriction) {
    return true; // No restriction
  }
  
  // Simple IP match (in production, use proper CIDR library)
  if (ipRestriction === clientIp) {
    return true;
  }
  
  // TODO: Implement proper CIDR range checking
  // For now, just check exact match
  
  return false;
}

// ============================================
// PERMISSION CATEGORIES (for UI organization)
// ============================================

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

/** Organized permission categories for UI display */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'tenant',
    name: 'Tenant Management',
    description: 'Manage organization settings and configuration',
    permissions: ['tenant:read', 'tenant:update', 'tenant:billing:read'],
  },
  {
    id: 'customers',
    name: 'Customer Management',
    description: 'View and manage borrower information',
    permissions: ['customer:read', 'customer:create', 'customer:update', 'customer:delete'],
  },
  {
    id: 'loans',
    name: 'Loan Operations',
    description: 'Process and manage loans',
    permissions: ['loan:read', 'loan:create', 'loan:approve', 'loan:disburse', 'loan:write-off'],
  },
  {
    id: 'applications',
    name: 'Applications',
    description: 'Review and process loan applications',
    permissions: ['application:read', 'application:create', 'application:review', 'application:approve', 'application:reject'],
  },
  {
    id: 'repayments',
    name: 'Repayments',
    description: 'Track and process repayments',
    permissions: ['repayment:read', 'repayment:create', 'repayment:reverse'],
  },
  {
    id: 'collections',
    name: 'Collections',
    description: 'Manage debt collection activities',
    permissions: ['collection:read', 'collection:update', 'collection:manage'],
  },
  {
    id: 'staff',
    name: 'Staff Management',
    description: 'Manage users within the organization',
    permissions: ['staff:read', 'staff:create', 'staff:update', 'staff:deactivate', 'staff:manage'],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'View and export reports',
    permissions: ['reports:view', 'reports:export', 'reports:sensitive'],
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'System configuration and integrations',
    permissions: ['settings:manage', 'settings:branding', 'settings:integrations'],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format a permission for display
 * e.g., 'loan:approve' -> 'Approve Loans'
 */
export function formatPermissionForDisplay(permission: Permission): string {
  const [resource, action] = permission.split(':');
  
  const resourceNames: Record<string, string> = {
    tenant: 'Tenant',
    customer: 'Customer',
    loan: 'Loan',
    application: 'Application',
    repayment: 'Repayment',
    collection: 'Collection',
    staff: 'Staff',
    report: 'Report',
    setting: 'Setting',
    audit: 'Audit',
    own: 'Own Account',
  };
  
  const actionNames: Record<string, string> = {
    read: 'View',
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    approve: 'Approve',
    reject: 'Reject',
    review: 'Review',
    disburse: 'Disburse',
    'write-off': 'Write Off',
    restructure: 'Restructure',
    manage: 'Manage',
    export: 'Export',
    upload: 'Upload',
    withdraw: 'Withdraw',
  };
  
  const resourceName = resourceNames[resource] || resource;
  const actionName = actionNames[action] || action;
  const isWildcard = action === '*';
  
  if (isWildcard) {
    return `All ${resourceName} Actions`;
  }
  
  return `${actionName} ${resourceName}`;
}

/**
 * Get all permissions for a role as a formatted list
 */
export function getFormattedPermissions(userRole: UserRole): Array<{ permission: string; label: string }> {
  const perms = getEffectivePermissions(userRole);
  return Array.from(perms).map(permission => ({
    permission,
    label: formatPermissionForDisplay(permission),
  }));
}
