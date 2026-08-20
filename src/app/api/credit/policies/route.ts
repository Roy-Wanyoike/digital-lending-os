// ============================================
// Credit Policies CRUD API
// GET/PUT /api/credit/policies
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { type CreditPolicy, DEFAULT_CREDIT_POLICY } from '@/lib/credit-engine'

// In-memory storage for policies (in production, use database)
let currentPolicy: CreditPolicy = { ...DEFAULT_CREDIT_POLICY }

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: currentPolicy,
      metadata: {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        isDefault: currentPolicy.tenantId === 'default'
      }
    })
  } catch (error) {
    console.error('Error fetching credit policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit policy' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    if (body.minCreditScore !== undefined && (body.minCreditScore < 300 || body.minCreditScore > 700)) {
      return NextResponse.json(
        { error: 'minCreditScore must be between 300 and 700' },
        { status: 400 }
      )
    }

    if (body.autoApproveThreshold !== undefined && (body.autoApproveThreshold < 500 || body.autoApproveThreshold > 800)) {
      return NextResponse.json(
        { error: 'autoApproveThreshold must be between 500 and 800' },
        { status: 400 }
      )
    }

    if (body.maxDtiRatio !== undefined && (body.maxDtiRatio < 0.2 || body.maxDtiRatio > 0.8)) {
      return NextResponse.json(
        { error: 'maxDtiRatio must be between 0.2 and 0.8' },
        { status: 400 }
      )
    }

    // Update policy with provided values
    const previousPolicy = { ...currentPolicy }
    
    currentPolicy = {
      ...currentPolicy,
      ...body,
      tenantId: body.tenantId || currentPolicy.tenantId,
      interestRateAdjustments: {
        ...currentPolicy.interestRateAdjustments,
        ...body.interestRateAdjustments
      },
      loanLimitsByGrade: {
        ...currentPolicy.loanLimitsByGrade,
        ...body.loanLimitsByGrade
      }
    }

    // Log changes for audit
    console.log('Credit Policy Updated:', {
      previous: previousPolicy,
      updated: currentPolicy,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: currentPolicy,
      message: 'Credit policy updated successfully',
      changes: getChanges(previousPolicy, currentPolicy),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating credit policy:', error)
    return NextResponse.json(
      { error: 'Failed to update credit policy', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper to track changes
function getChanges(previous: CreditPolicy, updated: CreditPolicy): string[] {
  const changes: string[] = []
  
  if (previous.minCreditScore !== updated.minCreditScore) {
    changes.push(`minCreditScore: ${previous.minCreditScore} → ${updated.minCreditScore}`)
  }
  if (previous.autoApproveThreshold !== updated.autoApproveThreshold) {
    changes.push(`autoApproveThreshold: ${previous.autoApproveThreshold} → ${updated.autoApproveThreshold}`)
  }
  if (previous.maxDtiRatio !== updated.maxDtiRatio) {
    changes.push(`maxDtiRatio: ${previous.maxDtiRatio} → ${updated.maxDtiRatio}`)
  }
  if (previous.requireKyc !== updated.requireKyc) {
    changes.push(`requireKyc: ${previous.requireKyc} → ${updated.requireKyc}`)
  }
  if (previous.requireEmployment !== updated.requireEmployment) {
    changes.push(`requireEmployment: ${previous.requireEmployment} → ${updated.requireEmployment}`)
  }
  
  return changes
}

// Reset to default policy
export async function DELETE() {
  currentPolicy = { ...DEFAULT_CREDIT_POLICY }
  
  return NextResponse.json({
    success: true,
    data: currentPolicy,
    message: 'Credit policy reset to defaults',
    timestamp: new Date().toISOString()
  })
}
