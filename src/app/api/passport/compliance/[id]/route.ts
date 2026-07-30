import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const updateComplianceSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired'] as const, {
    message: 'Status must be one of: pending, approved, rejected, expired',
  }),
})

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = updateComplianceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { status } = parsed.data

    const document = await db.complianceDocument.findUnique({
      where: { id },
      include: { passport: { include: { business: { select: { tenantId: true } } } } },
    })

    if (!document) {
      return NextResponse.json({ error: 'Compliance document not found' }, { status: 404 })
    }
    if (document.passport?.business?.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Compliance document not found' }, { status: 404 })
    }

    const updated = await db.complianceDocument.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating compliance document:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update compliance document' }, { status: 500 })
  }
}

export const PUT = withApiTelemetry(putHandler, '/api/passport/compliance/[id]');
