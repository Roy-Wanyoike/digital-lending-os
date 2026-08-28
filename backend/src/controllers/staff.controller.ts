/**
 * Staff Controller
 * 
 * Handles HTTP requests for user/staff management operations.
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../prisma/client';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  conflictResponse,
  badRequestResponse,
  forbiddenResponse,
} from '../utils/response';
import { AuthRequest, UserRole } from '../types';

export class StaffController {
  /**
   * GET /api/v1/staff
   * List staff members (filtered by tenant)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const role = req.query.role as UserRole | undefined;
      const status = req.query.status as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      // Only SUPER_ADMIN or TENANT_ADMIN can list all staff
      if (!['SUPER_ADMIN', 'TENANT_ADMIN'].includes(req.user!.role)) {
        return forbiddenResponse(res, 'Insufficient permissions to list staff');
      }

      const where: Record<string, unknown> = { tenantId };
      
      // Exclude CUSTOMER role from staff listing
      where.role = { not: 'CUSTOMER' };
      
      if (role) where.role = role;
      if (status === 'active') where.isActive = true;
      else if (status === 'inactive') where.isActive = false;

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        db.user.count({ where }),
      ]);

      return paginatedResponse(res, users, page, limit, total);
    } catch (error) {
      logger.error('Error fetching staff:', error);
      return errorResponse(res, 500, 'Failed to fetch staff');
    }
  }

  /**
   * GET /api/v1/staff/workspace
   * Get current user's workspace configuration
   */
  async getWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        // This shouldn't happen due to auth middleware
        return require('../utils/response').unauthorizedResponse(res);
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, plan: true },
          },
        },
      });

      if (!user) {
        return notFoundResponse(res, 'User');
      }

      // Determine workspace type based on role
      let workspaceType: string;
      switch (user.role) {
        case 'SUPER_ADMIN':
          workspaceType = 'super_admin';
          break;
        case 'TENANT_ADMIN':
          workspaceType = 'tenant_admin';
          break;
        case 'MANAGER':
          workspaceType = 'manager';
          break;
        case 'LOAN_OFFICER':
          workspaceType = 'loan_officer';
          break;
        case 'COLLECTION_AGENT':
        case 'AGENT':
          workspaceType = 'collections_agent';
          break;
        case 'FINANCE_OFFICER':
          workspaceType = 'finance_officer';
          break;
        case 'VIEWER':
          workspaceType = 'viewer';
          break;
        default:
          workspaceType = 'staff';
      }

      return successResponse(res, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant: user.tenant,
        },
        workspaceType,
        permissions: this.getRolePermissions(user.role as UserRole),
        features: this.getWorkspaceFeatures(workspaceType),
        quickStats: await this.getQuickStats(user.tenantId!, user.role as UserRole),
      });
    } catch (error) {
      logger.error('Error fetching workspace:', error);
      return errorResponse(res, 500, 'Failed to fetch workspace');
    }
  }

  /**
   * POST /api/v1/staff/actions
   * Perform staff management actions (invite, deactivate, change role)
   */
  async performAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { action, userId, ...data } = req.body;

      if (!action || !userId) {
        return badRequestResponse(res, 'action and userId are required');
      }

      const targetUser = await db.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return notFoundResponse(res, 'User');
      }

      // Check tenant access
      if (req.user!.role !== 'SUPER_ADMIN' && targetUser.tenantId !== req.user!.tenantId) {
        return forbiddenResponse(res, 'Cannot manage users from another tenant');
      }

      let result;

      switch (action) {
        case 'deactivate':
          result = await db.user.update({
            where: { id: userId },
            data: { isActive: false },
          });
          return successResponse(res, result, 'User deactivated successfully');

        case 'activate':
          result = await db.user.update({
            where: { id: userId },
            data: { isActive: true },
          });
          return successResponse(res, result, 'User activated successfully');

        case 'change_role':
          if (!data.role || !Object.values(UserRole).includes(data.role)) {
            return badRequestResponse(res, `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`);
          }
          
          if (data.role === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
            return forbiddenResponse(res, 'Cannot assign SUPER_ADMIN role');
          }

          result = await db.user.update({
            where: { id: userId },
            data: { role: data.role },
          });
          return successResponse(res, result, 'User role updated successfully');

        case 'reset_password':
          const tempPassword = Math.random().toString(36).slice(-12);
          const hashedPassword = await bcrypt.hash(tempPassword, 12);
          
          result = await db.user.update({
            where: { id: userId },
            data: { 
              passwordHash: hashedPassword,
              mustChangePassword: true,
            },
          });

          logger.info('Password reset', { userId, performedBy: req.user!.id });

          return successResponse(
            res,
            { 
              userId: result.id, 
              temporaryPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined 
            },
            'Password reset successfully'
          );

        default:
          return badRequestResponse(res, `Invalid action: ${action}. Valid actions: deactivate, activate, change_role, reset_password`);
      }
    } catch (error) {
      logger.error('Error performing staff action:', error);
      return errorResponse(res, 500, 'Staff action failed');
    }
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  private getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      SUPER_ADMIN: ['*'],
      TENANT_ADMIN: [
        'tenants:manage', 'users:manage', 'customers:crud', 'loans:crud',
        'applications:approve', 'reports:view', 'settings:manage',
      ],
      MANAGER: [
        'customers:view', 'loans:view', 'applications:approve',
        'collections:manage', 'reports:view',
      ],
      LOAN_OFFICER: ['customers:view', 'applications:create', 'loans:view'],
      COLLECTION_AGENT: ['customers:view', 'collections:manage'],
      FINANCE_OFFICER: ['finance:manage', 'payments:process', 'reports:view'],
      STAFF: ['customers:view', 'loans:view'],
      VIEWER: ['view_only'],
      CUSTOMER: ['own_profile', 'own_loans', 'own_payments'],
    };

    return permissions[role] || [];
  }

  private getWorkspaceFeatures(workspaceType: string): string[] {
    const features: Record<string, string[]> = {
      super_admin: [
        'tenant_management', 'system_settings', 'audit_logs', 'provider_monitoring',
        'all_reports', 'user_management', 'billing',
      ],
      tenant_admin: [
        'dashboard', 'customer_management', 'loan_management', 'application_processing',
        'collections', 'finance', 'reports', 'staff_management', 'settings',
      ],
      manager: [
        'dashboard', 'customer_view', 'loan_view', 'application_review',
        'collections', 'reports', 'team_performance',
      ],
      loan_officer: [
        'dashboard', 'customer_view', 'application_processing', 'loan_status',
      ],
      collections_agent: [
        'dashboard', 'collection_queue', 'customer_contact', 'payment_tracking',
      ],
      finance_officer: [
        'dashboard', 'transactions', 'ledger', 'reconciliation', 'disbursements',
        'financial_reports',
      ],
      viewer: ['dashboard', 'read_only_reports'],
      staff: ['basic_dashboard'],
    };

    return features[workspaceType] || [];
  }

  private async getQuickStats(tenantId: string, role: UserRole): Promise<Record<string, number>> {
    switch (role) {
      case 'COLLECTION_AGENT':
      case 'AGENT': {
        const [assignedLoans, todayCalls] = await Promise.all([
          db.loan.count({ where: { tenantId, assignedCollector: req.user?.id, daysInArrears: { gt: 0 } } }),
          db.collectionActivity.count({
            where: {
              agentId: req.user!.id,
              createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          }),
        ]);
        return { assignedOverdueLoans: assignedLoans, callsToday: todayCalls };
      }

      case 'LOAN_OFFICER': {
        const [pendingApps, processedToday] = await Promise.all([
          db.loanApplication.count({ where: { tenantId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
          db.loanApplication.count({
            where: {
              tenantId,
              reviewedBy: req.user!.id,
              reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          }),
        ]);
        return { pendingApplications: pendingApps, processedToday };
      }

      case 'FINANCE_OFFICER': {
        const [pendingDisbursements, pendingReconciliations] = await Promise.all([
          db.loan.count({ where: { tenantId, status: 'PENDING_DISBURSEMENT' } }),
          db.transaction.count({ where: { tenantId, reconciled: false } }),
        ]);
        return { pendingDisbursements, pendingReconciliations };
      }

      default: {
        const [totalCustomers, activeLoans] = await Promise.all([
          db.customer.count({ where: { tenantId } }),
          db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
        ]);
        return { totalCustomers, activeLoans };
      }
    }
  }
}

// Export singleton instance
export const staffController = new StaffController();
