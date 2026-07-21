import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const createComplianceDocSchema = z.object({
  passportId: z.string().min(1, 'passportId is required'),
  docType: z.string().min(1, 'docType is required'),
  docName: z.string().min(1, 'docName is required'),
  docUrl: z.string().optional(),
  expiresAt: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const passportId = searchParams.get('passportId') || ''
    const docType = searchParams.get('docType') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (passportId) {
      where.passportId = passportId
    }
    if (docType) {
      where.docType = docType
    }
    if (status) {
      where.status = status
    }

    const documents = await db.complianceDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error listing compliance documents:', error)
    return NextResponse.json({ error: 'Failed to list compliance documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createComplianceDocSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { passportId, docType, docName, docUrl, expiresAt } = parsed.data

    // Check passport exists
    const passport = await db.commercePassport.findUnique({
      where: { id: passportId },
    })

    if (!passport) {
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
    return NextResponse.json({ error: 'Failed to create compliance document' }, { status: 500 })
  }
}