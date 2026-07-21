import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createComplianceRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ruleType: z.string().min(1, 'Rule type is required'),
  condition: z.string().min(1, 'Condition is required'),
  action: z.string().min(1, 'Action is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('ruleType') || ''
    const isActive = searchParams.get('isActive')
    const severity = searchParams.get('severity') || ''

    const where: Record<string, unknown> = {}

    if (ruleType) where.ruleType = ruleType
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (severity) where.severity = severity

    const rules = await db.complianceRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: rules })
  } catch (error) {
    console.error('Error listing compliance rules:', error)
    return NextResponse.json({ error: 'Failed to list compliance rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createComplianceRuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validate condition is valid JSON
    try {
      JSON.parse(data.condition)
    } catch {
      return NextResponse.json({ error: 'Condition must be a valid JSON string' }, { status: 400 })
    }

    const rule = await db.complianceRule.create({
      data: {
        name: data.name,
        description: data.description,
        ruleType: data.ruleType,
        condition: data.condition,
        action: data.action,
        severity: data.severity,
        isActive: true,
      },
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating compliance rule:', error)
    return NextResponse.json({ error: 'Failed to create compliance rule' }, { status: 500 })
  }
}