import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createFraudRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  condition: z.string().min(1, 'Condition is required (JSON string)'),
  action: z.enum(['alert', 'block', 'require_review', 'flag']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {}
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const rules = await db.fraudRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: rules })
  } catch (error) {
    console.error('Error listing fraud rules:', error)
    return NextResponse.json({ error: 'Failed to list fraud rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createFraudRuleSchema.safeParse(body)

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

    const rule = await db.fraudRule.create({
      data: {
        name: data.name,
        description: data.description,
        condition: data.condition,
        action: data.action,
        severity: data.severity,
        isActive: true,
      },
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating fraud rule:', error)
    return NextResponse.json({ error: 'Failed to create fraud rule' }, { status: 500 })
  }
}