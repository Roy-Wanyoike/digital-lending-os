/**
 * Role-Based Access Control (RBAC)
 * 
 * Comprehensive permission system for Digital Lending OS.
 * Defines roles, permissions, and access control logic.
 */

import { Request, Response } from 'express';
import { UserRole } from '../types';

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

export enum Permission {
  // Tenant Management
  TENANT_READ = 'tenant:read',
  TENANT_WRITE = 'tenant:write',
  TENANT_DELETE = 'tenant:delete',
  TENANT_MANAGE = 'tenant:manage',

  // User Management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE = 'user:manage',

  // Customer Management
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',
  CUSTOMER_EXPORT = 'customer:export',
  CUSTOMER_MANAGE = 'customer:manage',

  // Loan Management
  LOAN_READ = 'loan:read',
  LOAN_CREATE = 'loan:create',
  LOAN_UPDATE = 'loan:update',
  LOAN_APPROVE = 'loan:approve',
  LOAN_DISBURSE = 'loan:disburse',
  LOAN_WRITE_OFF = 'loan:write_off',
  LOAN_MANAGE = 'loan:manage',

  // Application Management
  APPLICATION_READ = 'application:read',
  APPLICATION_CREATE = 'application:create',
  APPLICATION_REVIEW = 'application:review',
  APPLICATION_APPROVE = 'application:approve',
  APPLICATION_REJECT = 'application:reject',
  APPLICATION_MANAGE = 'application:manage',

  // Payment Operations
  PAYMENT_READ = 'payment:read',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_DISBURSE = 'payment:disburse',
  PAYMENT_MANAGE = 'payment:manage',

  // Collection Management
  COLLECTION_READ = 'collection:read',
  COLLECTION_ACTION = 'collection:action',
  COLLECTION_MANAGE = 'collection:manage',

  // Financial Operations
  FINANCE_READ = 'finance:read',
  FINANCE_RECONCILE = 'finance:reconcile',
  FINANCE_SETTLE = 'finance:settle',
  FINANCE_MANAGE = 'finance:manage',

  // Reports
  REPORT_READ = 'report:read',
  REPORT_GENERATE = 'report:generate',
  REPORT_EXPORT = 'report:export',

  // Credit & Risk
  CREDIT_ASSESS = 'credit:assess',
  CREDIT_RULES_MANAGE = 'credit:rules_manage',
  CREDIT_POLICY_MANAGE = 'credit:policy_manage',

  // Notifications
  NOTIFICATION_SEND = 'notification:send',
  NOTIFICATION_MANAGE = 'notification:manage',

  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_ADMIN = 'dashboard:admin',

  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_AUDIT = 'system:audit',
  SYSTEM_ADMIN = 'system:admin',
}

// =============================================================================
// ROLE-PERMISSION MAPPING
// =============================================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    ...Object.values(Permission),
  ],

  [UserRole.TENANT_ADMIN]: [
    Permission.TENANT_READ, Permission.TENANT_WRITE, Permission.TENANT_MANAGE,
    Permission.USER_READ, Permission.USER_CREATE, Permission.USER_UPDATE, Permission.USER_MANAGE,
    Permission.CUSTOMER_READ, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE, Permission.CUSTOMER_EXPORT, Permission.CUSTOMER_MANAGE,
    Permission.LOAN_READ, Permission.LOAN_CREATE, Permission.LOAN_UPDATE,
    Permission.LOAN_APPROVE, Permission.LOAN_DISBURSE, Permission.LOAN_WRITE_OFF, Permission.LOAN_MANAGE,
    Permission.APPLICATION_READ, Permission.APPLICATION_CREATE, Permission.APPLICATION_REVIEW,
    Permission.APPLICATION_APPROVE, Permission.APPLICATION_REJECT, Permission.APPLICATION_MANAGE,
    Permission.PAYMENT_READ, Permission.PAYMENT_PROCESS, Permission.PAYMENT_REFUND,
    Permission.PAYMENT_DISBURSE, Permission.PAYMENT_MANAGE,
    Permission.COLLECTION_READ, Permission.COLLECTION_ACTION, Permission.COLLECTION_MANAGE,
    Permission.FINANCE_READ, Permission.FINANCE_RECONCILE, Permission.FINANCE_SETTLE, Permission.FINANCE_MANAGE,
    Permission.REPORT_READ, Permission.REPORT_GENERATE, Permission.REPORT_EXPORT,
    Permission.CREDIT_ASSESS, Permission.CREDIT_RULES_MANAGE, Permission.CREDIT_POLICY_MANAGE,
    Permission.NOTIFICATION_SEND, Permission.NOTIFICATION_MANAGE,
    Permission.DASHBOARD_VIEW, Permission.DASHBOARD_ADMIN,
    Permission.SYSTEM_AUDIT,
  ],

  [UserRole.MANAGER]: [
    Permission.TENANT_READ,
    Permission.USER_READ,
    Permission.CUSTOMER_READ, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE, Permission.CUSTOMER_EXPORT,
    Permission.LOAN_READ, Permission.LOAN_CREATE, Permission.LOAN_UPDATE, Permission.LOAN_APPROVE, Permission.LOAN_DISBURSE,
    Permission.APPLICATION_READ, Permission.APPLICATION_CREATE, Permission.APPLICATION_REVIEW,
    Permission.APPLICATION_APPROVE, Permission.APPLICATION_REJECT,
    Permission.PAYMENT_READ, Permission.PAYMENT_PROCESS, Permission.PAYMENT_DISBURSE,
    Permission.COLLECTION_READ, Permission.COLLECTION_ACTION,
    Permission.FINANCE_READ,
    Permission.REPORT_READ, Permission.REPORT_GENERATE, Permission.REPORT_EXPORT,
    Permission.CREDIT_ASSESS,
    Permission.NOTIFICATION_SEND,
    Permission.DASHBOARD_VIEW, Permission.DASHBOARD_ADMIN,
  ],

  [UserRole.STAFF]: [
    Permission.TENANT_READ, Permission.USER_READ,
    Permission.CUSTOMER_READ, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE,
    Permission.LOAN_READ, Permission.LOAN_CREATE,
    Permission.APPLICATION_READ, Permission.APPLICATION_CREATE,
    Permission.PAYMENT_READ,
    Permission.COLLECTION_READ,
    Permission.FINANCE_READ,
    Permission.REPORT_READ,
    Permission.DASHBOARD_VIEW,
  ],

  [UserRole.AGENT]: [
    Permission.CUSTOMER_READ,
    Permission.LOAN_READ,
    Permission.COLLECTION_READ, Permission.COLLECTION_ACTION,
    Permission.APPLICATION_CREATE,
    Permission.DASHBOARD_VIEW,
  ],

  [UserRole.VIEWER]: [
    Permission.TENANT_READ, Permission.CUSTOMER_READ, Permission.LOAN_READ,
    Permission.APPLICATION_READ, Permission.PAYMENT_READ, Permission.COLLECTION_READ,
    Permission.FINANCE_READ, Permission.REPORT_READ, Permission.DASHBOARD_VIEW,
  ],

  // Extended roles (mapped to base roles for compatibility)
  [UserRole.LOAN_OFFICER as string]: [
    ...ROLE_PERMISSIONS[UserRole.MANAGER].filter(p => 
      p.startsWith('LOAN_') || p.startsWith('APPLICATION_') || p.startsWith('CUSTOMER_')
    ),
    Permission.CUSTOMER_READ, Permission.LOAN_READ, Permission.APPLICATION_READ,
    Permission.DASHBOARD_VIEW,
  ],
  [UserRole.COLLECTION_AGENT as string]: ROLE_PERMISSIONS[UserRole.AGENT],
  [UserRole.FINANCE_OFFICER as string]: [
    Permission.FINANCE_READ, Permission.FINANCE_RECONCILE, Permission.FINANCE_SETTLE,
    Permission.PAYMENT_READ, Permission.REPORT_READ, Permission.DASHBOARD_VIEW,
  ],
  [UserRole.CUSTOMER as string]: [], // Customers have no API permissions
};

// =============================================================================
// RBAC CLASS
// =============================================================================

class RBACService {
  hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  }

  hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(role, p));
  }

  hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(role, p));
  }

  getPermissions(role: UserRole): Permission[] {
    return [...(ROLE_PERMISSIONS[role] || [])];
  }

  getRolesWithPermission(permission: Permission): UserRole[] {
    const roles: UserRole[] = [];
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (perms.includes(permission)) {
        roles.push(role as UserRole);
      }
    }
    return roles;
  }

  isValidPermission(permission: string): boolean {
    return Object.values(Permission).includes(permission as Permission);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const rbac = new RBACService();

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: () => void) => {
    const userRole = (req as any).user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!rbac.hasPermission(userRole as UserRole, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${permission}`,
      });
    }

    next();
  };
}

export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: () => void) => {
    const userRole = (req as any).user?.role;

    if (!userRole) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!rbac.hasAnyPermission(userRole as UserRole, permissions)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
      });
    }

    next();
  };
}

export default rbac;
