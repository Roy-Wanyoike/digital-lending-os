// ============================================
// Full Credit Assessment API
// GET /api/credit/assessment?applicationId=xxx
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  calculateCreditScore, 
  generateSampleInput,
  formatCurrency,
  getGradeColor,
  getGradeLabel,
  type CreditScoreInput,
  type CreditScoreOutput,
  DEFAULT_CREDIT_POLICY
} from '@/lib/credit-engine'

// Mock application data store
const mockApplications = new Map<string, {
  id: string
  customerId: string
  customerName: string
  requestedAmount: number
  termDays: number
  purpose: string
  submittedAt: Date
  status: string
}>()

// Initialize with sample data
function initializeSampleData() {
  if (mockApplications.size === 0) {
    mockApplications.set('APP-001', {
      id: 'APP-001',
      customerId: 'CUST-001',
      customerName: 'John Kamau Mwangi',
      requestedAmount: 75000,
      termDays: 90,
      purpose: 'Business expansion - inventory purchase',
      submittedAt: new Date('2026-08-18T10:30:00Z'),
      status: 'UNDER_REVIEW'
    })
    
    mockApplications.set('APP-002', {
      id: 'APP-002',
      customerId: 'CUST-002',
      customerName: 'Grace Wanjiku Njeri',
      requestedAmount: 150000,
      termDays: 120,
      purpose: 'School fees payment',
      submittedAt: new Date('2026-08-19T14:15:00Z'),
      status: 'SUBMITTED'
    })
    
    mockApplications.set('APP-003', {
      id: 'APP-003',
      customerId: 'CUST-003',
      customerName: 'Peter Odhiambo Ochieng',
      requestedAmount: 25000,
      termDays: 30,
      purpose: 'Emergency medical expenses',
      submittedAt: new Date('2026-08-20T09:45:00Z'),
      status: 'SUBMITTED'
    })
  }
}

interface ComparableLoan {
  customerId: string
  score: number
  grade: string
  amount: number
  tenure: number
  decision: string
  outcome?: string
}

export async function GET(request: NextRequest) {
  try {
    initializeSampleData()
    
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')
    const profileType = searchParams.get('profileType') as 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor' | null

    if (!applicationId && !profileType) {
      return NextResponse.json({
        error: 'applicationId or profileType parameter required',
        availableProfiles: ['excellent', 'good', 'fair', 'poor', 'veryPoor'],
        sampleApplicationIds: Array.from(mockApplications.keys())
      }, { status: 400 })
    }

    let creditInput: CreditScoreInput
    let applicationData
    
    if (applicationId && mockApplications.has(applicationId)) {
      applicationData = mockApplications.get(applicationId)!
      
      // Generate appropriate input based on application
      switch (applicationId) {
        case 'APP-001':
          creditInput = generateSampleInput('good')
          break
        case 'APP-002':
          creditInput = generateSampleInput('excellent')
          break
        case 'APP-003':
          creditInput = generateSampleInput('fair')
          break
        default:
          creditInput = generateSampleInput('fair')
      }
    } else if (profileType) {
      creditInput = generateSampleInput(profileType)
      applicationData = {
        id: `DEMO-${profileType}`,
        customerId: `DEMO-CUST-${profileType}`,
        customerName: `Demo ${profileType.charAt(0).toUpperCase() + profileType.slice(1)} Profile`,
        requestedAmount: profileType === 'excellent' ? 200000 : 
                         profileType === 'good' ? 100000 :
                         profileType === 'fair' ? 50000 : 25000,
        termDays: 90,
        purpose: 'Demo assessment',
        submittedAt: new Date(),
        status: 'SUBMITTED'
      }
    } else {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Calculate full credit score
    const scoreResult = calculateCreditScore(creditInput, DEFAULT_CREDIT_POLICY)

    // Generate comparable loans data
    const comparableLoans: ComparableLoan[] = generateComparableLoans(scoreResult.score, scoreResult.grade)

    // Build full assessment response
    const assessment = {
      // Application Info
      application: applicationData,
      
      // Core Score Result
      scoreResult: {
        score: scoreResult.score,
        grade: scoreResult.grade,
        gradeLabel: getGradeLabel(scoreResult.grade),
        gradeColor: getGradeColor(scoreResult.grade),
        riskLevel: scoreResult.riskLevel,
        decision: scoreResult.decision,
        confidenceLevel: scoreResult.confidenceLevel
      },

      // Detailed Score Breakdown
      scoreBreakdown: scoreResult.scoreBreakdown.map(item => ({
        category: item.category,
        factor: item.factor,
        points: item.points,
        weight: `${item.weight}%`,
        description: item.description
      })),

      // Factors Summary
      factors: {
        positive: scoreResult.reasons.positive.map(r => ({
          factor: r.factor,
          points: r.points
        })),
        negative: scoreResult.reasons.negative.map(r => ({
          factor: r.factor,
          points: r.points
        }))
      },

      // Affordability Analysis
      affordability: {
        monthlyIncome: formatCurrency(scoreResult.affordability.monthlyIncome),
        existingObligations: formatCurrency(scoreResult.affordability.existingObligations),
        proposedPayment: formatCurrency(scoreResult.affordability.recommendedMonthlyPayment),
        dtiRatio: `${scoreResult.affordability.dtiRatio}%`,
        maxDtiRatio: `${(DEFAULT_CREDIT_POLICY.maxDtiRatio * 100).toFixed(0)}%`,
        disposableIncome: formatCurrency(scoreResult.affordability.disposableIncome),
        affordable: scoreResult.affordability.affordable,
        status: scoreResult.affordability.affordable ? 'AFFORDABLE' : 'NOT AFFORDABLE'
      },

      // Recommended Terms
      recommendedTerms: {
        maxLoanAmount: formatCurrency(scoreResult.maxLoanAmount),
        maxTenureDays: scoreResult.maxTenureDays,
        interestRateMultiplier: scoreResult.interestRateMultiplier,
        rateAdjustment: scoreResult.interestRateMultiplier <= 1 
          ? `${((1 - scoreResult.interestRateMultiplier) * 100).toFixed(0)}% discount`
          : `${((scoreResult.interestRateMultiplier - 1) * 100).toFixed(0)}% premium`
      },

      // Decision with Reasoning
      decision: {
        recommendation: scoreResult.decision,
        reasoning: generateDecisionReasoning(scoreResult, applicationData.requestedAmount),
        conditions: generateConditions(scoreResult),
        nextSteps: generateNextSteps(scoreResult)
      },

      // Comparable Loans Analysis
      comparableLoans: {
        count: comparableLoans.length,
        averageScore: Math.round(comparableLoans.reduce((sum, l) => sum + l.score, 0) / comparableLoans.length),
        approvalRate: Math.round((comparableLoans.filter(l => l.decision === 'APPROVE').length / comparableLoans.length) * 100),
        loans: comparableLoans.slice(0, 5) // Top 5 most similar
      },

      // Risk Flags
      riskFlags: identifyRiskFlags(scoreResult, creditInput),

      // Timestamps
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Valid for 24 hours
    }

    return NextResponse.json({
      success: true,
      data: assessment,
      metadata: {
        engineVersion: '2.0.0',
        policyVersion: '1.0.0',
        processingTime: '< 50ms'
      }
    })

  } catch (error) {
    console.error('Assessment generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate assessment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function generateComparableLoans(currentScore: number, currentGrade: string): ComparableLoan[] {
  // Generate mock comparable loans with similar profiles
  return [
    { customerId: 'CUST-SIM-001', score: currentScore + 15, grade: currentGrade, amount: 80000, tenure: 90, decision: 'APPROVE', outcome: 'REPAID' },
    { customerId: 'CUST-SIM-002', score: currentScore + 5, grade: currentGrade, amount: 65000, tenure: 60, decision: 'APPROVE', outcome: 'ACTIVE' },
    { customerId: 'CUST-SIM-003', score: currentScore - 10, grade: currentGrade, amount: 55000, tenure: 45, decision: 'REVIEW', outcome: 'ACTIVE' },
    { customerId: 'CUST-SIM-004', score: currentScore - 25, grade: currentGrade === 'A' ? 'B' : currentGrade, amount: 45000, tenure: 30, decision: 'APPROVE', outcome: 'REPAID' },
    { customerId: 'CUST-SIM-005', score: currentScore + 30, grade: currentGrade, amount: 95000, tenure: 120, decision: 'APPROVE', outcome: 'REPAID' },
  ]
}

function generateDecisionReasoning(result: CreditScoreOutput, requestedAmount: number): string[] {
  const reasons: string[] = []
  
  reasons.push(`Credit score of ${result.score} places applicant in Grade ${result.grade} (${getGradeLabel(result.grade)})`)
  
  if (requestedAmount > result.maxLoanAmount) {
    reasons.push(`Requested amount exceeds maximum recommended by ${formatCurrency(requestedAmount - result.maxLoanAmount)}`)
  } else {
    reasons.push(`Requested amount within approved limits for Grade ${result.grade}`)
  }
  
  if (result.affordability.affordable) {
    reasons.push(`DTI ratio of ${result.affordability.dtiRatio}% is acceptable (threshold: ${(DEFAULT_CREDIT_POLICY.maxDtiRatio * 100).toFixed(0)}%)`)
  } else {
    reasons.push(`DTI ratio of ${result.affordability.dtiRatio}% exceeds threshold - affordability concern`)
  }
  
  if (result.confidenceLevel >= 80) {
    reasons.push(`High confidence (${result.confidenceLevel}%) in score accuracy due to complete data`)
  } else {
    reasons.push(`Moderate confidence (${result.confidenceLevel}%) - additional verification may help`)
  }
  
  return reasons
}

function generateConditions(result: CreditScoreOutput): string[] {
  const conditions: string[] = []
  
  if (result.decision === 'APPROVE') {
    conditions.push('Standard terms apply')
    if (result.interestRateMultiplier < 1) {
      conditions.push('Eligible for preferential interest rate')
    }
  } else if (result.decision === 'REVIEW') {
    conditions.push('Manual review required before approval')
    conditions.push('Additional documentation may be requested')
    if (result.riskLevel === 'HIGH') {
      conditions.push('Consider partial approval or reduced amount')
    }
  } else {
    conditions.push('Does not meet minimum criteria')
    conditions.push('Recommend re-application after 30 days with improved profile')
  }
  
  return conditions
}

function generateNextSteps(result: CreditScoreOutput): string[] {
  const steps: string[] = []
  
  switch (result.decision) {
    case 'APPROVE':
      steps.push('Proceed to document signing')
      steps.push('Schedule disbursement')
      steps.push('Set up repayment reminders')
      break
    case 'REVIEW':
      steps.push('Assign to credit officer for manual review')
      steps.push('Verify income documents')
      steps.push('Check employment status')
      steps.push('Manager approval required')
      break
    case 'DECLINE':
      steps.push('Generate decline letter with reasons')
      steps.push('Offer alternative products if applicable')
      steps.push('Schedule follow-up in 30 days')
      break
  }
  
  return steps
}

function identifyRiskFlags(result: CreditScoreOutput, input: CreditScoreInput): Array<{ level: 'info' | 'warning' | 'critical'; message: string }> {
  const flags: Array<{ level: 'info' | 'warning' | 'critical'; message: string }> = []
  
  if (!input.kycVerified) {
    flags.push({ level: 'critical', message: 'KYC not completed - identity not verified' })
  }
  
  if ((input.daysInArrears || 0) > 30) {
    flags.push({ level: 'critical', message: `Significant arrears history: ${input.daysInArrears} days` })
  } else if ((input.daysInArrears || 0) > 0) {
    flags.push({ level: 'warning', message: `Current arrears: ${input.daysInArrears} day(s)` })
  }
  
  if (input.employmentStatus?.toUpperCase() === 'UNEMPLOYED') {
    flags.push({ level: 'warning', message: 'No verifiable employment' })
  }
  
  if (result.affordability.dtiRatio > 0.5) {
    flags.push({ level: 'warning', message: `High DTI ratio: ${result.affordability.dtiRatio}%` })
  }
  
  if (result.score < 450) {
    flags.push({ level: 'warning', message: 'Below average credit score' })
  }
  
  if ((input.declinedApplicationsCount || 0) > 2) {
    flags.push({ level: 'info', message: 'Multiple previous declined applications' })
  }
  
  if (flags.length === 0) {
    flags.push({ level: 'info', message: 'No significant risk flags identified' })
  }
  
  return flags
}
