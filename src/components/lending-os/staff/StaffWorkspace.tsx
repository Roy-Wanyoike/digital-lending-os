'use client'

import React from 'react'
import type { UserRole } from '@/lib/auth-types'
import { TenantAdminWorkspace } from './TenantAdminWorkspace'
import { ManagerWorkspace } from './ManagerWorkspace'
import { LoanOfficerWorkspace } from './LoanOfficerWorkspace'
import { CollectionsAgentWorkspace } from './CollectionsAgentWorkspace'
import { FinanceOfficerWorkspace } from './FinanceOfficerWorkspace'
import { ComplianceWorkspace } from './ComplianceWorkspace'
import { SupportWorkspace } from './SupportWorkspace'
import { ViewerWorkspace } from './ViewerWorkspace'

export interface StaffWorkspaceProps {
  userRole: UserRole
  tenantId: string
  userId: string
  userName?: string
  tenantName?: string
}

// Role to department mapping for more granular workspaces
interface RoleConfig {
  label: string
  icon: string
  color: string
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  SUPER_ADMIN: { label: 'Super Admin', icon: '🛡️', color: 'text-slate-600' },
  TENANT_ADMIN: { label: 'Tenant Admin', icon: '🏢', color: 'text-emerald-600' },
  MANAGER: { label: 'Manager', icon: '👨‍💼', color: 'text-blue-600' },
  TENANT_STAFF: { label: 'Loan Officer', icon: '📋', color: 'text-orange-600' },
  TENANT_AGENT: { label: 'Collections Agent', icon: '📞', color: 'text-purple-600' },
  CUSTOMER: { label: 'Customer', icon: '👤', color: 'text-gray-600' },
}

/**
 * StaffWorkspace - Main router component that renders role-specific workspace
 * Falls back to VIEWER workspace if role is unknown or customer
 */
export function StaffWorkspace({ 
  userRole, 
  tenantId, 
  userId,
  userName,
  tenantName 
}: StaffWorkspaceProps) {
  
  const renderWorkspace = () => {
    switch (userRole) {
      case 'TENANT_ADMIN':
      case 'SUPER_ADMIN':
        return (
          <TenantAdminWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
            tenantName={tenantName}
          />
        )
      
      case 'MANAGER':
        return (
          <ManagerWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
          />
        )
      
      case 'TENANT_STAFF':
        return (
          <LoanOfficerWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
          />
        )
      
      case 'TENANT_AGENT':
        return (
          <CollectionsAgentWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
          />
        )
      
      // For finance officers (using STAFF role with department)
      // In a real app, this would be determined by department field
      case 'CUSTOMER':
        return (
          <ViewerWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
          />
        )
      
      default:
        return (
          <ViewerWorkspace 
            tenantId={tenantId}
            userId={userId}
            userName={userName}
          />
        )
    }
  }

  return (
    <div className="workspace-container">
      {renderWorkspace()}
    </div>
  )
}

// Export all workspace components for direct use if needed
export {
  TenantAdminWorkspace,
  ManagerWorkspace,
  LoanOfficerWorkspace,
  CollectionsAgentWorkspace,
  FinanceOfficerWorkspace,
  ComplianceWorkspace,
  SupportWorkspace,
  ViewerWorkspace,
}

export default StaffWorkspace
