import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/applications/[id] - Get a specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId query parameter is required' },
        { status: 400 }
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
}

// PUT /api/applications/[id] - Update application (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tenantId = body.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
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

    // Handle approval/rejection actions
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
        decisionBy: decisionBy || null,
        decisionNotes: decisionNotes || null,
        currentStep: 'DISBURSEMENT_PREPARATION'
      }

      // Update step history
      const stepHistory = JSON.parse(existingApplication.stepHistory || '[]')
      stepHistory.push({
        step: 'MANAGER_APPROVAL',
        enteredAt: new Date().toISOString(),
        exitedAt: new Date().toISOString(),
        by: decisionBy || 'system'
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

      return NextResponse.json({ 
        success: true, 
        data: application,
        message: 'Application has been approved successfully'
      })
    }

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
        decisionBy: decisionBy || null,
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
        by: decisionBy || 'system',
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

      return NextResponse.json({ 
        success: true, 
        data: application,
        message: 'Application has been rejected'
      })
    }

    // General update for other fields
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

    return NextResponse.json({ success: true, data: application })
  } catch (error) {
    console.error('Error updating loan application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update loan application' },
      { status: 500 }
    )
  }
}
