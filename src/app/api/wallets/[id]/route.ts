import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, error, forbidden, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
const updateWalletSchema = z.object({
  status: z.enum(['active', 'frozen', 'closed']),
})

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { id } = await params
    const wallet = await db.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return notFound('Wallet not found')
    }
    if (!wallet.businessId) {
      return badRequest('Wallet has no business association')
    }
    const biz = await db.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Wallet not found')
    }

    const transactions = await db.walletTransaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return ok({ ...wallet, transactions })
  } catch (err: any) {
    console.error('Error fetching wallet:', err)
    return error('Failed to fetch wallet')
  }
}

async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    if (user.role !== 'admin') return forbidden('Only admins can update wallet status')
    const { id } = await params
    const body = await request.json()
    const parsed = updateWalletSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const existing = await db.wallet.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Wallet not found')
    }
    if (!existing.businessId) {
      return badRequest('Wallet has no business association')
    }
    const biz = await db.business.findUnique({ where: { id: existing.businessId }, select: { tenantId: true } })
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound('Wallet not found')
    }

    const wallet = await db.wallet.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    return ok(wallet)
  } catch (error: any) {
    console.error('Error updating wallet:', error)
    return error('Failed to update wallet')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets/[id]');

export const PUT = withApiTelemetry(withErrorHandler(putHandler), '/api/wallets/[id]');
