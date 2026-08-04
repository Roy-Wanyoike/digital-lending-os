import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getApiUser, AuthError } from '@/lib/auth/api-helpers'
import { eventBus } from '@/backend/services/event-bus'

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
const REFERRAL_BONUS_AMOUNT = 100.00
const REFERRAL_BONUS_CURRENCY = 'USD'

const depositSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['bank_transfer', 'card', 'mobile_money', 'payment_link', 'external']),
  provider: z.string().optional(),
  providerTxId: z.string().optional(),
  bankName: z.string().optional(),
  bankRef: z.string().optional(),
  cardLast4: z.string().max(4).optional(),
  notes: z.string().optional(),
})

// POST /api/wallets/deposit — Initiate a deposit
async function postHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const parsed = depositSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify wallet belongs to tenant
    const wallet = await db.wallet.findUnique({ where: { id: data.walletId } })
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (!wallet.businessId) {
      return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    }
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (wallet.status !== 'active') {
      return NextResponse.json({ error: 'Wallet is not active' }, { status: 400 })
    }

    const depositRef = `DEP-${randomUUID().slice(0, 8).toUpperCase()}`

    // In production, this would call the payment provider.
    // For demo, if provider is 'demo' we auto-complete the deposit.
    const isAutoComplete = data.provider === 'demo'

    // Check if this user has a referrer (for referral bonus)
    const account = await db.account.findUnique({
      where: { id: user.id },
      select: { referredBy: true },
    })
    const hasReferrer = !!account?.referredBy

    // Check if the referrer already got a bonus for this referee
    let bonusAlreadyGiven = false
    if (hasReferrer) {
      const existingBonus = await db.referralBonus.findFirst({
        where: { refereeId: user.id },
      })
      bonusAlreadyGiven = !!existingBonus
    }

    const deposit = await db.$transaction(async (tx: any) => {
      // Read wallet inside transaction to get latest balance (prevents race conditions)
      const freshWallet = await tx.wallet.findUnique({ where: { id: data.walletId } })
      if (!freshWallet) throw new Error('Wallet not found')

      const dep = await tx.deposit.create({
        data: {
          depositRef,
          walletId: data.walletId,
          amount: data.amount,
          currency: wallet.currency,
          paymentMethod: data.paymentMethod,
          provider: data.provider || null,
          providerTxId: data.providerTxId || null,
          bankName: data.bankName || null,
          bankRef: data.bankRef || null,
          cardLast4: data.cardLast4 || null,
          notes: data.notes || null,
          status: isAutoComplete ? 'completed' : 'pending',
          completedAt: isAutoComplete ? new Date() : null,
        },
      })

      if (isAutoComplete) {
        const balanceBefore = freshWallet.balance
        const balanceAfter = Math.round((balanceBefore + data.amount) * 100) / 100

        await tx.walletTransaction.create({
          data: {
            walletId: data.walletId,
            txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
            type: 'deposit',
            amount: data.amount,
            balanceBefore,
            balanceAfter,
            currency: freshWallet.currency,
            description: `Deposit via ${data.paymentMethod}${data.provider ? ` (${data.provider})` : ''}${data.notes ? ` — ${data.notes}` : ''}`,
            referenceType: 'deposit',
            referenceId: dep.id,
            status: 'completed',
          },
        })

        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            balance: balanceAfter,
            availableBalance: Math.round((freshWallet.availableBalance + data.amount) * 100) / 100,
          },
        })

        // ---- REFERRAL BONUS: Credit $100 to referrer on referee's first deposit ----
        if (hasReferrer && !bonusAlreadyGiven && account!.referredBy) {
          // Find the referrer's USD wallet
          const referrerBusiness = await tx.account.findUnique({
            where: { id: account!.referredBy },
            select: { businessId: true, tenantId: true },
          })
          if (referrerBusiness?.businessId) {
            const referrerWallet = await tx.wallet.findFirst({
              where: {
                businessId: referrerBusiness.businessId,
                currency: REFERRAL_BONUS_CURRENCY,
                status: 'active',
              },
            })
            if (referrerWallet) {
              const balBefore = referrerWallet.balance
              const balAfter = Math.round((balBefore + REFERRAL_BONUS_AMOUNT) * 100) / 100

              // Credit the referrer's wallet
              await tx.wallet.update({
                where: { id: referrerWallet.id },
                data: {
                  balance: balAfter,
                  availableBalance: Math.round((referrerWallet.availableBalance + REFERRAL_BONUS_AMOUNT) * 100) / 100,
                },
              })

              // Record the bonus transaction
              await tx.walletTransaction.create({
                data: {
                  walletId: referrerWallet.id,
                  txRef: `WTX-${randomUUID().slice(0, 8).toUpperCase()}`,
                  type: 'bonus',
                  amount: REFERRAL_BONUS_AMOUNT,
                  balanceBefore: balBefore,
                  balanceAfter: balAfter,
                  currency: REFERRAL_BONUS_CURRENCY,
                  description: `Referral bonus: ${user.email} made their first deposit`,
                  referenceType: 'referral_bonus',
                  referenceId: dep.id,
                  status: 'completed',
                },
              })

              // Create the referral bonus record
              await tx.referralBonus.create({
                data: {
                  bonusRef: `RFB-${randomUUID().slice(0, 8).toUpperCase()}`,
                  referrerId: account!.referredBy,
                  refereeId: user.id,
                  depositId: dep.id,
                  walletId: referrerWallet.id,
                  bonusAmount: REFERRAL_BONUS_AMOUNT,
                  bonusCurrency: REFERRAL_BONUS_CURRENCY,
                  status: 'credited',
                },
              })
            }
          }
        }
      }

      return dep
    })

    // Check if referral bonus was just credited
    let referralBonusCredited = false
    if (isAutoComplete && hasReferrer && !bonusAlreadyGiven) {
 const newBonus = await db.referralBonus.findFirst({
        where: { refereeId: user.id, depositId: deposit.id },
      })
      referralBonusCredited = !!newBonus
    }

    // ─── Emit realtime event ────────────────────────────
    if (isAutoComplete) {
      try {
        eventBus.emit('wallet.deposit', {
          id: deposit.id,
          depositRef,
          walletId: data.walletId,
          amount: data.amount,
          currency: wallet.currency,
          paymentMethod: data.paymentMethod,
          provider: data.provider,
          status: 'completed',
        }, user.tenantId)
      } catch (err) {
        console.error('[wallet.deposit] emit failed:', err)
      }
    }

    // ── Publish Kafka event ────────────────────────────────
    try {
      const { publishEvent } = await import('@/backend/lib/event-publisher')
      await publishEvent({
        topic: 'wallet.events.wallet_deposited',
        key: deposit.id,
        event: { eventType: 'wallet.deposit.created', depositId: deposit.id, walletId: data.walletId, amount: deposit.amount, currency: deposit.currency, tenantId: user.tenantId, timestamp: new Date().toISOString() },
      })
    } catch (e) { console.error('Event publish failed:', e) }

  // ─── Audit trail ────────────────────────────────
    try {
      const { auditLog } = await import('@/backend/lib/audit-helper')
      await auditLog({ action: 'deposit.create', resource: 'deposit', resourceId: deposit.id, userId: user.id, tenantId: user.tenantId, details: { amount: deposit.amount, currency: deposit.currency, paymentMethod: deposit.paymentMethod, status: deposit.status } })
    } catch (e) { console.error('Audit log failed:', e) }

    return NextResponse.json({
      data: deposit,
      referralBonus: referralBonusCredited ? {
        amount: REFERRAL_BONUS_AMOUNT,
        currency: REFERRAL_BONUS_CURRENCY,
        message: `$${REFERRAL_BONUS_AMOUNT} referral bonus credited to your referrer's wallet!`,
      } : undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error('Error creating deposit:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}

// GET /api/wallets/deposit?walletId=xxx — List deposits for a wallet
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const status = searchParams.get('status') || ''
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 })
    }

    // Verify tenant access
    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    if (!wallet.businessId) return NextResponse.json({ error: 'Wallet has no business association' }, { status: 400 })
    const biz = await db.business.findUnique({
      where: { id: wallet.businessId },
      select: { tenantId: true },
    })
    if (!biz || biz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { walletId }
    if (status) where.status = status

    const deposits = await db.deposit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: deposits })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error('Error listing deposits:', error)
    return NextResponse.json({ error: 'Failed to list deposits' }, { status: 500 })
  }
}

export const GET = withApiTelemetry(getHandler, '/api/wallets/deposit');

export const POST = withApiTelemetry(postHandler, '/api/wallets/deposit');
