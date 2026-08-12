import { NextRequest } from 'next/server';import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';

/** Cache-Control header for wallet transaction lists (5s stale-while-revalidate). */
const CACHE_CONTROL = 'private, max-age=2, stale-while-revalidate=5';
const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit', 'transfer_in', 'transfer_out', 'conversion', 'fee', 'refund']),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
})

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request)
    if (!user) return unauthorized('Authentication required')
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    // Single query: verify wallet exists and belongs to tenant
    const wallet = await db.wallet.findFirst({
      where: { id, business: { tenantId: user.tenantId } },
    })
    if (!wallet) {
      return notFound('Wallet not found')
    }

    const where: Record<string, unknown> = { walletId: id }
    if (type) where.type = type
    if (status) where.status = status

    const [transactions, total] = await Promise.all([
      db.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.walletTransaction.count({ where }),
    ])

    return ok({ transactions, pagination: { limit, offset, total, hasMore: offset + limit < total } }, undefined, { maxAge: 2, swr: 5 })
  } catch (err: any) {
    console.error('Error listing wallet transactions:', err)
    return error('Failed to list wallet transactions')
  }
}

async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error.issues.map(i => i.message).join(', '))
    }

    const data = parsed.data

    const transaction = await db.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({ where: { id } })
      if (!wallet) {
        throw new Error('Wallet not found')
      }
      // Verify tenant ownership
      if (wallet.businessId) {
        const biz = await tx.business.findUnique({ where: { id: wallet.businessId }, select: { tenantId: true } })
        if (!biz || biz.tenantId !== user.tenantId) {
          throw new Error('Wallet not found')
        }
      }
      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active')
      }

      const isCredit = data.type === 'credit' || data.type === 'transfer_in' || data.type === 'refund'
      const balanceBefore = wallet.balance
      const balanceAfter = isCredit
        ? Math.round((balanceBefore + data.amount) * 100) / 100
        : Math.round((balanceBefore - data.amount) * 100) / 100

      // Check sufficient balance for debits
      if (!isCredit && balanceAfter < 0) {
        throw new Error('Insufficient wallet balance')
      }

      const newTx = await tx.walletTransaction.create({
        data: {
          walletId: id,
          txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
          type: data.type,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
          currency: wallet.currency,
          description: data.description,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          status: 'completed',
        },
      })

      await tx.wallet.update({
        where: { id },
        data: { balance: balanceAfter },
      })

      return newTx
    })

    return created(transaction)
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Failed to create wallet transaction'
    if (message === 'Wallet not found') {
      return notFound(message)
    }
    if (message === 'Wallet is not active' || message === 'Insufficient wallet balance') {
      return badRequest(message)
    }console.error('Error creating wallet transaction:', err)
    return error('Failed to create wallet transaction')
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/wallets/[id]/transactions');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/wallets/[id]/transactions');
