// ============================================
// Credit Rules CRUD API
// GET/POST /api/credit/rules
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { type CreditRule, createDefaultRules, CreditRuleEngine } from '@/lib/credit-engine'

// In-memory rule engine instance
const ruleEngine = new CreditRuleEngine()

// Initialize with default rules
createDefaultRules().forEach(rule => ruleEngine.addRule(rule))

// GET all rules or a specific rule
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')

    if (ruleId) {
      const rules = ruleEngine.getRules()
      const rule = rules.find(r => r.id === ruleId)
      
      if (!rule) {
        return NextResponse.json(
          { error: `Rule with ID '${ruleId}' not found` },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: rule
      })
    }

    const allRules = ruleEngine.getRules()

    return NextResponse.json({
      success: true,
      data: allRules,
      count: allRules.length,
      activeCount: allRules.filter(r => r.isActive).length,
      metadata: {
        engineVersion: '2.0.0',
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching credit rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit rules' },
      { status: 500 }
    )
  }
}

// POST - Create new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, action, actionValue, priority, conditionType, ...conditionConfig } = body

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Rule name is required' },
        { status: 400 }
      )
    }

    if (!action || !['APPROVE', 'REVIEW', 'DECLINE', 'ADJUST_SCORE', 'ADJUST_LIMIT'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action required: APPROVE, REVIEW, DECLINE, ADJUST_SCORE, ADJUST_LIMIT' },
        { status: 400 }
      )
    }

    // Build condition function based on type
    let conditionFn: (input: any, output: any) => boolean

    switch (conditionType) {
      case 'score_threshold':
        const minScore = conditionConfig.minScore || 0
        const maxScore = conditionConfig.maxScore || 850
        conditionFn = (_, output) => output.score >= minScore && output.score <= maxScore
        break
        
      case 'arrears_days':
        const maxArrears = conditionConfig.maxArrears || 0
        conditionFn = (input) => (input.daysInArrears || 0) > maxArrears
        break
        
      case 'employment_status':
        const statuses: string[] = conditionConfig.statuses || []
        conditionFn = (input) => statuses.includes(input.employmentStatus?.toUpperCase())
        break
        
      case 'kyc_status':
        const requireKyc = conditionConfig.required ?? true
        conditionFn = (input) => input.kycVerified === requireKyc
        break
        
      case 'dti_ratio':
        const maxDti = conditionConfig.maxDti || 0.5
        conditionFn = (_, output) => output.affordability.dtiRatio > (maxDti * 100)
        break
        
      case 'custom':
        // For custom conditions, we'd need a more sophisticated approach
        // For now, create a simple passthrough that always evaluates false
        // In production, this would use a safe expression evaluator
        conditionFn = () => false
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid condition type: ${conditionType}. Use: score_threshold, arrears_days, employment_status, kyc_status, dti_ratio, custom` },
          { status: 400 }
        )
    }

    const newRule: CreditRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || '',
      condition: conditionFn,
      action,
      actionValue,
      priority: typeof priority === 'number' ? priority : 50,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: new Date()
    }

    ruleEngine.addRule(newRule)

    return NextResponse.json({
      success: true,
      data: newRule,
      message: 'Credit rule created successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error creating credit rule:', error)
    return NextResponse.json(
      { error: 'Failed to create credit rule', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update existing rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required for updates' },
        { status: 400 }
      )
    }

    const rules = ruleEngine.getRules()
    const ruleIndex = rules.findIndex(r => r.id === id)

    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: `Rule with ID '${id}' not found` },
        { status: 404 }
      )
    }

    // Remove old rule and add updated one
    ruleEngine.removeRule(id)
    
    const updatedRule: CreditRule = {
      ...rules[ruleIndex],
      ...updates,
      id // Preserve original ID
    }

    ruleEngine.addRule(updatedRule)

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: 'Credit rule updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating credit rule:', error)
    return NextResponse.json(
      { error: 'Failed to update credit rule' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const rules = ruleEngine.getRules()
    const ruleExists = rules.some(r => r.id === id)

    if (!ruleExists) {
      return NextResponse.json(
        { error: `Rule with ID '${id}' not found` },
        { status: 404 }
      )
    }

    ruleEngine.removeRule(id)

    return NextResponse.json({
      success: true,
      message: `Rule '${id}' deleted successfully`,
      remainingRules: ruleEngine.getRules().length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error deleting credit rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete credit rule' },
      { status: 500 }
    )
  }
}
