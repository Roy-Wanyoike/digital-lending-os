import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, name: true, country: true, industry: true, tenantId: true },
        },
        receiver: {
          select: { id: true, name: true, country: true, industry: true, tenantId: true },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (invoice.sender?.tenantId !== user.tenantId && invoice.receiver?.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()

    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        sender: { select: { tenantId: true } },
        receiver: { select: { tenantId: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (existing.sender?.tenantId !== user.tenantId && existing.receiver?.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const allowedFields = [
      'status',
      'notes',
      'paidAmount',
      'dueDate',
      'items',
    ] as const

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dueDate' && typeof body[field] === 'string') {
          updateData[field] = new Date(body[field])
        } else if (field === 'items' && typeof body[field] !== 'string') {
          updateData[field] = JSON.stringify(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    // Auto-set paidAt when status changes to paid
    if (updateData.status === 'paid' && existing.status !== 'paid') {
      updateData.paidAt = new Date()
      updateData.paidAmount = existing.amount
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/invoices/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/invoices/[id]');
