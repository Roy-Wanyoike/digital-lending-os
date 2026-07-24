import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'

const updateComplianceSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'expired'], {
    errorMap: () => ({ message: 'Status must be one of: pending, approved, rejected, expired' }),
  }),
  rejectionReason: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateComplianceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { status, rejectionReason } = parsed.data

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

    // If rejected, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a compliance document' },
        { status: 400 }
      )
    }

    const updated = await db.complianceDocument.update({
      where: { id },
      data: {
        status,
        rejectionReason,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating compliance document:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update compliance document' }, { status: 500 })
  }
}
