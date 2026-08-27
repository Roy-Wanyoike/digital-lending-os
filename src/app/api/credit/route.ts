// ============================================
// Credit Score Calculation API
// POST /api/credit
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { 
  calculateCreditScore, 
  generateSampleInput,
  type CreditScoreInput, 
  type CreditScoreOutput,
  DEFAULT_CREDIT_POLICY,
  createDefaultRules,
  CreditRuleEngine
} from '@/lib/credit-engine'

// In-memory storage for demo purposes
const creditCache = new Map<string, { result: CreditScoreOutput; timestamp: number }>()
const ruleEngine = new CreditRuleEngine()

// Initialize default rules
createDefaultRules().forEach(rule => ruleEngine.addRule(rule))

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, loanAmount, tenureDays, profileType, ...inputData } = body

    // If profileType is provided (for demo/testing), use sample data
    let creditInput: CreditScoreInput
    
    if (profileType && ['excellent', 'good', 'fair', 'poor', 'veryPoor'].includes(profileType)) {
      creditInput = generateSampleInput(profileType as 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor')
      // Merge with any additional input data provided
      Object.assign(creditInput, inputData)
    } else {
      // Use provided input data directly
      creditInput = inputData as CreditScoreInput
    }

    // Validate required fields
    if (typeof creditInput.kycVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'kycVerified is required and must be a boolean' },
        { status: 400 }
      )
    }

    // Check cache first (5 minute TTL)
    const cacheKey = customerId || JSON.stringify(creditInput)
    const cached = creditCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return NextResponse.json({
        success: true,
        data: cached.result,
        cached: true,
        timestamp: new Date().toISOString()
      })
    }

    // Calculate credit score
    let result = calculateCreditScore(creditInput, DEFAULT_CREDIT_POLICY)

    // Apply custom rules if configured
    const rulesResult = ruleEngine.evaluateRules(creditInput, result)
    result = rulesResult

    // Adjust for specific loan request if provided
    if (loanAmount && loanAmount > result.maxLoanAmount) {
      result.decision = 'REVIEW'
      result.reasons.negative.push({
        factor: `Requested amount exceeds recommended limit`,
        points: -10
      })
    }

    if (tenureDays && tenureDays > result.maxTenureDays) {
      result.decision = 'REVIEW'
      result.reasons.negative.push({
        factor: `Requested term exceeds maximum allowed`,
        points: -5
      })
    }

    // Cache the result
    creditCache.set(cacheKey, { result, timestamp: Date.now() })

    return NextResponse.json({
      success: true,
      data: result,
      requestId: `CR-${Date.now()}`,
      cached: false,
      timestamp: new Date().toISOString(),
      metadata: {
        policyVersion: '1.0.0',
        engineVersion: '2.0.0',
        rulesApplied: ruleEngine.getRules().filter(r => r.isActive).length
      }
    })

  } catch (error) {
    console.error('Credit score calculation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate credit score',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving cached scores or sample calculations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const profileType = searchParams.get('profileType') as 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor' | null

    if (customerId) {
      // Return cached score if available
      const cached = creditCache.get(customerId)
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.result,
          cached: true,
          timestamp: new Date(cached.timestamp).toISOString()
        })
      }
      
      return NextResponse.json(
        { error: 'No cached score found for this customer', suggestion: 'Use POST to calculate a new score' },
        { status: 404 }
      )
    }

    if (profileType) {
      // Return sample calculation for demo purposes
      const sampleInput = generateSampleInput(profileType)
      const result = calculateCreditScore(sampleInput, DEFAULT_CREDIT_POLICY)
      
      return NextResponse.json({
        success: true,
        data: result,
        sampleProfile: profileType,
        input: sampleInput,
        timestamp: new Date().toISOString()
      })
    }

    // Return available endpoints info
    return NextResponse.json({
      message: 'Credit Scoring API',
      version: '2.0.0',
      endpoints: {
        'POST /api/credit': 'Calculate credit score',
        'GET /api/credit?customerId=xxx': 'Get cached score',
        'GET /api/credit?profileType=excellent': 'Get sample calculation',
        'GET /api/credit/policies': 'Get credit policies',
        'PUT /api/credit/policies': 'Update credit policies',
        'GET /api/credit/assessment?applicationId=xxx': 'Full assessment',
        'GET /api/credit/rules': 'List credit rules',
        'POST /api/credit/rules': 'Create credit rule'
      },
      availableProfiles: ['excellent', 'good', 'fair', 'poor', 'veryPoor']
    })

  } catch (error) {
    console.error('Credit API GET error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
