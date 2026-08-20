import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRoles, withPermission, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// GET /api/applications/[id] - Get a specific application
// Requires authentication
export const GET = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || user.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot access other tenant data', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const application = await db.loanApplication.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        product: true,
        loan: true,
        documents: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    // Parse step history JSON
    let stepHistory = []
    try {
      stepHistory = JSON.parse(application.stepHistory || '[]')
    } catch (e) {
      stepHistory = []
    }

    // Audit log for application view
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'application:read',
      entityType: 'LoanApplication',
      entityId: id,
      ipAddress: getClientIP(request),
    })

    return NextResponse.json({
      success: true,
      data: {
        ...application,
        parsedStepHistory: stepHistory
      }
    })
  } catch (error) {
    console.error('Error fetching loan application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan application' },
      { status: 500 }
    )
  }
})

// PUT /api/applications/[id] - Update application (approve/reject)
// For approve/reject actions, requires MANAGER+ role and application:approve permission
export const PUT = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const { id } = await params
    const body = await request.json()
    const tenantId = body.tenantId || user.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Ensure tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot modify other tenant data', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Check if application exists and belongs to tenant
    const existingApplication = await db.loanApplication.findFirst({
      where: { id, tenantId },
      include: { customer: true, product: true }
    })

    if (!existingApplication) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    const { action, decisionBy, decisionNotes, approvedAmount } = body

    // Handle approval/rejection actions - require MANAGER+ role
    if (action === 'approve' || action === 'reject') {
      // Role check for approval/rejection
      const canApproveReject = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(user.role)
      
      if (!canApproveReject) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions: Only Managers and above can approve or reject applications',
            code: 'FORBIDDEN',
            requiredRoles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'],
            currentRole: user.role,
          },
          { status: 403 }
        )
      }
    }

    // Handle approval action
    if (action === 'approve') {
      // Check current status allows approval
      if (!['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(existingApplication.status)) {
        return NextResponse.json(
          { success: false, error: `Cannot approve application in ${existingApplication.status} status` },
          { status: 400 }
        )
      }

      const updateData = {
        status: 'APPROVED',
        approvedAmount: approvedAmount || existingApplication.requestedAmount,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        decisionBy: decisionBy || user.name || user.email,
        decisionNotes: decisionNotes || null,
        currentStep: 'DISBURSEMENT_PREPARATION'
      }

      // Update step history
      const stepHistory = JSON.parse(existingApplication.stepHistory || '[]')
      stepHistory.push({
        step: 'MANAGER_APPROVAL',
        enteredAt: new Date().toISOString(),
        exitedAt: new Date().toISOString(),
        by: decisionBy || user.email || 'system'
      })
      stepHistory.push({
        step: 'DISBURSEMENT_PREPARATION',
        enteredAt: new Date().toISOString(),
        by: 'system'
      })

      const application = await db.loanApplication.update({
        where: { id },
        data: {
          ...updateData,
          stepHistory: JSON.stringify(stepHistory)
        }
      })

      // Critical audit log for approval
      await createAuditLog({
        userId: user.id,
        tenantId: user.tenantId,
        action: 'application:approve',
        entityType: 'LoanApplication',
        entityId: id,
        ipAddress: getClientIP(request),
        metadata: {
          previousStatus: existingApplication.status,
          newStatus: 'APPROVED',
          approvedAmount: updateData.approvedAmount,
          decisionNotes,
        },
      })

      return NextResponse.json({ 
        success: true, 
        data: application,
        message: 'Application has been approved successfully'
      })
    }

    // Handle rejection action
    if (action === 'reject') {
      // Check current status allows rejection
      if (['REJECTED', 'CANCELLED', 'DISBURSED', 'COMPLETED'].includes(existingApplication.status)) {
        return NextResponse.json(
          { success: false, error: `Cannot reject application in ${existingApplication.status} status` },
          { status: 400 }
        )
      }

      const rejectionReason = body.rejectionReason || decisionNotes || 'Not specified'

      const updateData = {
        status: 'REJECTED',
        rejectedAt: new Date(),
        reviewedAt: new Date(),
        decisionBy: decisionBy || user.name || user.email,
        decisionNotes: decisionNotes || null,
        rejectionReason,
        currentStep: 'CANCELLED'
      }

      // Update step history
      const stepHistory = JSON.parse(existingApplication.stepHistory || '[]')
      stepHistory.push({
        step: existingApplication.currentStep,
        enteredAt: new Date().toISOString(),
        exitedAt: new Date().toISOString(),
        by: decisionBy || user.email || 'system',
        reason: rejectionReason
      })
      stepHistory.push({
        step: 'CANCELLED',
        enteredAt: new Date().toISOString(),
        by: 'system'
      })

      const application = await db.loanApplication.update({
        where: { id },
        data: {
          ...updateData,
          stepHistory: JSON.stringify(stepHistory)
        }
      })

      // Critical audit log for rejection
      await createAuditLog({
        userId: user.id,
        tenantId: user.tenantId,
        action: 'application:reject',
        entityType: 'LoanApplication',
        entityId: id,
        ipAddress: getClientIP(request),
        metadata: {
          previousStatus: existingApplication.status,
          newStatus: 'REJECTED',
          rejectionReason,
        },
      })

      return NextResponse.json({ 
        success: true, 
        data: application,
        message: 'Application has been rejected'
      })
    }

    // General update for other fields - requires STAFF+
    const canUpdate = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STAFF'].includes(user.role)
    
    if (!canUpdate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to update applications',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      )
    }

    const allowedFields = [
      'status', 'currentStep', 'creditScore', 'affordabilityScore', 
      'riskRating', 'autoApproved', 'autoDecisionReason', 'purpose'
    ]

    const updateData: Record<string, unknown> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const application = await db.loanApplication.update({
      where: { id },
      data: updateData
    })

    // Audit log for general updates
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'application:update',
      entityType: 'LoanApplication',
      entityId: id,
      ipAddress: getClientIP(request),
      metadata: { updatedFields: Object.keys(updateData) },
    })

    return NextResponse.json({ success: true, data: application })
  } catch (error) {
    console.error('Error updating loan application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update loan application' },
      { status: 500 }
    )
  }
})
