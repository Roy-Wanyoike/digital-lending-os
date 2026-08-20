import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, createAuditLog, getClientIP } from '@/lib/auth-utils'
import type { AuthContext } from '@/lib/auth-utils'

// GET /api/collections/loans/:id - Full loan details with payment history and contact history
export const GET = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const { id: loanId } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || user.tenantId

    // Validate tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot access other tenant data' },
        { status: 403 }
      )
    }

    // Fetch loan with full details
    const loan = await db.loan.findFirst({
      where: {
        id: loanId,
        tenantId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            alternativePhone: true,
            email: true,
            mpesaPhone: true,
            county: true,
            city: true,
            employmentStatus: true,
            employerName: true,
            riskLevel: true,
            creditScore: true,
            crbStatus: true,
            totalBorrowed: true,
            totalRepaid: true,
            outstandingBalance: true,
            createdAt: true
          }
        },
        collector: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            interestType: true
          }
        },
        repayments: {
          orderBy: { paymentDate: 'desc' },
          take: 20
        },
        application: {
          select: {
            id: true,
            purpose: true,
            approvedAmount: true,
            approvedAt: true
          }
        }
      }
    })

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Parse repayment schedule
    let repaymentSchedule = []
    try {
      repaymentSchedule = JSON.parse(loan.repaymentSchedule || '[]')
    } catch (e) {
      repaymentSchedule = []
    }

    // Calculate collection metrics for this loan
    const collectionMetrics = {
      totalContactAttempts: 0,
      lastContactDate: null as Date | null,
      promisesMade: 0,
      promisesKept: 0,
      promisesBroken: 0,
      totalPromiseAmount: 0,
      totalCollectedFromPromises: 0
    }

    // Get recent collection actions for this loan (from audit logs or dedicated table)
    const recentActions = await db.auditLog.findMany({
      where: {
        entityId: loanId,
        entityType: 'Collection',
        action: { startsWith: 'collections:' }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'collections:loan_view',
      entityType: 'Loan',
      entityId: loanId,
      ipAddress: getClientIP(request)
    })

    return NextResponse.json({
      success: true,
      data: {
        ...loan,
        repaymentSchedule,
        collectionMetrics,
        recentActions
      }
    })
  } catch (error) {
    console.error('Error fetching loan collection details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loan details' },
      { status: 500 }
    )
  }
})

// PUT /api/collections/loans/:id - Update loan collection actions
// Supports: assignCollector, addCollectionNote, updateStatus, updateArrearsStatus
export const PUT = withAuth(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  authContext: AuthContext
) => {
  try {
    const { user } = authContext
    const { id: loanId } = await params
    const body = await request.json()
    
    const tenantId = body.tenantId || user.tenantId
    const {
      action,
      assignedCollector,
      collectionNotes,
      status,
      arrearsStatus,
      daysInArrears,
      outstandingBalance
    } = body

    // Validate tenant access
    if (user.role !== 'SUPER_ADMIN' && tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot modify other tenant data' },
        { status: 403 }
      )
    }

    // Check if loan exists and belongs to tenant
    const existingLoan = await db.loan.findFirst({
      where: { id: loanId, tenantId }
    })

    if (!existingLoan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found or does not belong to this tenant' },
        { status: 404 }
      )
    }

    // Build update data based on action
    const updateData: Record<string, unknown> = {}
    let auditAction = 'collections:loan_update'

    switch (action) {
      case 'assignCollector':
        if (assignedCollector) {
          const collector = await db.user.findFirst({
            where: { id: assignedCollector, tenantId, isActive: true }
          })
          if (!collector) {
            return NextResponse.json(
              { success: false, error: 'Collector not found or inactive' },
              { status: 400 }
            )
          }
        }
        updateData.assignedCollector = assignedCollector
        updateData.lastCollectionAt = new Date()
        auditAction = 'collections:assign_collector'
        break

      case 'addCollectionNote':
        const existingNotes = existingLoan.collectionNotes || ''
        const timestamp = new Date().toISOString()
        const noteEntry = `[${timestamp}] ${user.name}: ${collectionNotes}`
        updateData.collectionNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry
        updateData.lastCollectionAt = new Date()
        auditAction = 'collections:add_note'
        break

      case 'updateStatus':
        const validStatuses = ['APPROVED', 'ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'FULLY_PAID', 'WRITTEN_OFF', 'RESTRUCTURED']
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
            { status: 400 }
          )
        }
        updateData.status = status
        
        if (status === 'FULLY_PAID' || status === 'WRITTEN_OFF') {
          updateData.closedAt = new Date()
          if (status === 'WRITTEN_OFF') {
            updateData.closureReason = 'Written off through collections process'
            updateData.writtenOffAmount = outstandingBalance || existingLoan.outstandingBalance
          }
        }
        auditAction = 'collections:update_status'
        break

      case 'updateArrearsStatus':
        const validArrearsStatuses = ['CURRENT', 'DAYS_1_7', 'DAYS_8_30', 'DAYS_31_60', 'DAYS_61_90', 'DAYS_91_PLUS']
        if (!validArrearsStatuses.includes(arrearsStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid arrears status. Must be one of: ${validArrearsStatuses.join(', ')}` },
            { status: 400 }
          )
        }
        updateData.arrearsStatus = arrearsStatus
        if (daysInArrears !== undefined) {
          updateData.daysInArrears = daysInArrears
        }
        auditAction = 'collections:update_arrears'
        break

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}. Supported actions: assignCollector, addCollectionNote, updateStatus, updateArrearsStatus` },
          { status: 400 }
        )
    }

    // Perform update
    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        collector: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Audit log for the specific action
    await createAuditLog({
      userId: user.id,
      tenantId: user.tenantId,
      action: auditAction,
      entityType: 'Loan',
      entityId: loanId,
      ipAddress: getClientIP(request),
      oldValues: JSON.stringify({
        assignedCollector: existingLoan.assignedCollector,
        status: existingLoan.status,
        arrearsStatus: existingLoan.arrearsStatus,
        daysInArrears: existingLoan.daysInArrears
      }),
      newValues: JSON.stringify(updateData),
      metadata: { action, performedBy: user.name }
    })

    return NextResponse.json({
      success: true,
      data: updatedLoan,
      message: `Loan ${auditAction.replace('collections:', '').replace(/_/g, ' ')} completed successfully`
    })
  } catch (error) {
    console.error('Error updating loan collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update loan' },
      { status: 500 }
    )
  }
})
