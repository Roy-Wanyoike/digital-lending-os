import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

const createComplianceDocSchema = z.object({
  passportId: z.string().min(1, 'passportId is required'),
  docType: z.string().min(1, 'docType is required'),
  docName: z.string().min(1, 'docName is required'),
  docUrl: z.string().optional(),
  expiresAt: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const passportId = searchParams.get('passportId') || ''
    const docType = searchParams.get('docType') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = {
      passport: { business: { tenantId: user.tenantId } },
    }

    if (passportId) {
      where.passportId = passportId
    }
    if (docType) {
      where.docType = docType
    }
    if (status) {
      where.status = status
    }

    const [documents, total] = await Promise.all([
      db.complianceDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      }),
      db.complianceDocument.count({ where }),
    ])

    return NextResponse.json({
      data: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing compliance documents:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to list compliance documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const parsed = createComplianceDocSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { passportId, docType, docName, docUrl, expiresAt } = parsed.data

    // Check passport exists and belongs to tenant
    const passport = await db.commercePassport.findUnique({
      where: { id: passportId },
      include: { business: { select: { tenantId: true } } },
    })

    if (!passport || passport.business.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Commerce passport not found' }, { status: 404 })
    }

    const document = await db.complianceDocument.create({
      data: {
        passportId,
        docType,
        docName,
        docUrl,
        expiresAt,
        status: 'pending',
      },
    })

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    console.error('Error creating compliance document:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to create compliance document' }, { status: 500 })
  }
}
