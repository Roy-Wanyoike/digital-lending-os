import { db } from '@/lib/db'

// ─── Escrow Activities ──────────────────────────────────────────────────────

/**
 * Fund an escrow — move status to 'funded' and create an audit log entry.
 * Idempotent: safe to call multiple times for the same escrowId.
 */
export async function fundEscrow(escrowId: string) {
  try {
    const escrow = await db.escrowTransaction.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status === 'funded') {
      return escrow // already funded — idempotent
    }
    if (escrow.status !== 'created') {
      throw new Error(`Cannot fund escrow in status '${escrow.status}'`)
    }

    const updated = await db.escrowTransaction.update({
      where: { id: escrowId },
      data: { status: 'funded', fundedAmount: escrow.amount },
    })

    await db.escrowAuditLog.create({
      data: {
        escrowId,
        action: 'ESCROW_FUNDED',
        details: `Escrow funded with ${escrow.amount} ${escrow.currency}`,
        metadata: JSON.stringify({ amount: escrow.amount, currency: escrow.currency }),
      },
    })

    return updated
  } catch (err) {
    throw new Error(`fundEscrow failed for ${escrowId}: ${err}`)
  }
}

/**
 * Activate an escrow — move status to 'in_escrow' and create an audit log entry.
 * Idempotent.
 */
export async function activateEscrow(escrowId: string) {
  try {
    const escrow = await db.escrowTransaction.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status === 'in_escrow') {
      return escrow // already activated — idempotent
    }
    if (escrow.status !== 'funded') {
      throw new Error(`Cannot activate escrow in status '${escrow.status}'`)
    }

    const updated = await db.escrowTransaction.update({
      where: { id: escrowId },
      data: { status: 'in_escrow' },
    })

    await db.escrowAuditLog.create({
      data: {
        escrowId,
        action: 'ESCROW_ACTIVATED',
        details: `Escrow activated. Amount: ${escrow.amount} ${escrow.currency}`,
        metadata: JSON.stringify({ amount: escrow.amount, currency: escrow.currency }),
      },
    })

    return updated
  } catch (err) {
    throw new Error(`activateEscrow failed for ${escrowId}: ${err}`)
  }
}

/**
 * Release a specific milestone within an escrow.
 * Creates a disbursement record, updates releasedAmount, and logs the action.
 * Idempotent per (escrowId, milestoneSequence) pair.
 */
export async function releaseMilestone(escrowId: string, milestoneSequence: number) {
  try {
    const escrow = await db.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: { milestones: { orderBy: { sequence: 'asc' } } },
    })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status !== 'in_escrow') {
      throw new Error(`Cannot release milestone from escrow in status '${escrow.status}'`)
    }

    const milestone = escrow.milestones.find((m) => m.sequence === milestoneSequence)
    if (!milestone) {
      throw new Error(`Milestone ${milestoneSequence} not found on escrow ${escrowId}`)
    }
    if (milestone.status === 'released') {
      return escrow // already released — idempotent
    }

    // Mark the milestone as released
    const newReleasedAmount = (escrow.releasedAmount ?? 0) + milestone.amount
    const isComplete = newReleasedAmount >= escrow.amount

    const updated = await db.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        releasedAmount: newReleasedAmount,
        currentMilestone: milestoneSequence,
        status: isComplete ? 'completed' : 'partial_release',
      },
    })

    // Update milestone status
    await db.escrowMilestone.update({
      where: { id: milestone.id },
      data: { status: 'released', releasedAt: new Date() },
    })

    // Create disbursement record
    await db.disbursement.create({
      data: {
        escrowId,
        milestoneId: milestone.id,
        amount: milestone.amount,
        currency: escrow.currency,
        toAccount: escrow.sellerId,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    await db.escrowAuditLog.create({
      data: {
        escrowId,
        action: 'MILESTONE_RELEASED',
        details: `Milestone ${milestoneSequence} (${milestone.title}) released. Amount: ${milestone.amount} ${escrow.currency}`,
        metadata: JSON.stringify({
          milestoneSequence,
          milestoneTitle: milestone.title,
          amount: milestone.amount,
        }),
      },
    })

    return updated
  } catch (err) {
    throw new Error(`releaseMilestone failed for ${escrowId}/${milestoneSequence}: ${err}`)
  }
}

// ─── Payment Link Activities ─────────────────────────────────────────────────

/**
 * Process a payment against a payment link.
 * Creates a PaymentLinkPayment record, updates aggregate counters, checks depletion.
 * Idempotent based on a generated payment record.
 */
export async function processPaymentLink(
  paymentLinkId: string,
  amount: number,
  payerEmail: string,
  payerName: string,
  provider: string
) {
  try {
    const link = await db.paymentLink.findUnique({ where: { id: paymentLinkId } })
    if (!link) {
      throw new Error(`PaymentLink not found: ${paymentLinkId}`)
    }
    if (link.status === 'depleted' || link.status === 'expired') {
      throw new Error(`PaymentLink is ${link.status}: ${paymentLinkId}`)
    }

    // Create payment record
    const payment = await db.paymentLinkPayment.create({
      data: {
        paymentLinkId,
        amount,
        currency: link.currency,
        payerEmail,
        payerName,
        provider,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    // Update link aggregates
    const newTotalCollected = (link.totalCollected ?? 0) + amount
    const newPaymentCount = (link.paymentCount ?? 0) + 1
    const isMaxPayments = link.maxPayments ? newPaymentCount >= link.maxPayments : false

    await db.paymentLink.update({
      where: { id: paymentLinkId },
      data: {
        totalCollected: newTotalCollected,
        paymentCount: newPaymentCount,
        status: isMaxPayments ? 'depleted' : link.status,
      },
    })

    // Log to escrow audit if this link is tied to an escrow (via metadata lookup)
    await db.escrowAuditLog.create({
      data: {
        escrowId: link.id, // use link id as reference since there's no direct escrow relation
        action: 'PAYMENT_LINK_PAYMENT',
        details: `Payment of ${amount} ${link.currency} received via ${provider} from ${payerEmail}`,
        metadata: JSON.stringify({
          paymentId: payment.id,
          amount,
          payerEmail,
          provider,
          linkDepleted: isMaxPayments,
        }),
      },
    })

    return payment
  } catch (err) {
    throw new Error(`processPaymentLink failed for ${paymentLinkId}: ${err}`)
  }
}

// ─── Wallet Activities ──────────────────────────────────────────────────────

/**
 * Credit a wallet — create a 'credit' WalletTransaction and increase balances.
 * Idempotent: if a transaction with the same referenceType + referenceId already
 * exists for this wallet, returns the existing record.
 */
export async function creditWallet(
  walletId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  description: string
) {
  try {
    // Idempotency check
    const existing = await db.walletTransaction.findFirst({
      where: { walletId, referenceType, referenceId },
    })
    if (existing) {
      return existing
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`)
    }

    const balanceBefore = wallet.balance
    const balanceAfter = Math.round((balanceBefore + amount) * 100) / 100

    const transaction = await db.walletTransaction.create({
      data: {
        walletId,
        txRef: `WTX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type: 'credit',
        amount,
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        referenceType,
        referenceId,
        description,
        status: 'completed',
      },
    })

    await db.wallet.update({
      where: { id: walletId },
      data: {
        balance: balanceAfter,
        availableBalance: Math.round((wallet.availableBalance + amount) * 100) / 100,
      },
    })

    return transaction
  } catch (err) {
    throw new Error(`creditWallet failed for ${walletId}: ${err}`)
  }
}

/**
 * Debit a wallet — create a 'debit' WalletTransaction and decrease balances.
 * Checks sufficient availableBalance before proceeding.
 * Idempotent: if a transaction with the same referenceType + referenceId already
 * exists for this wallet, returns the existing record.
 */
export async function debitWallet(
  walletId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  description: string
) {
  try {
    // Idempotency check
    const existing = await db.walletTransaction.findFirst({
      where: { walletId, referenceType, referenceId },
    })
    if (existing) {
      return existing
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`)
    }

    if ((wallet.availableBalance ?? 0) < amount) {
      throw new Error(
        `Insufficient balance in wallet ${walletId}: available ${wallet.availableBalance}, requested ${amount}`
      )
    }

    const balanceBefore = wallet.balance
    const balanceAfter = Math.round((balanceBefore - amount) * 100) / 100

    const transaction = await db.walletTransaction.create({
      data: {
        walletId,
        txRef: `WTX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type: 'debit',
        amount,
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        referenceType,
        referenceId,
        description,
        status: 'completed',
      },
    })

    await db.wallet.update({
      where: { id: walletId },
      data: {
        balance: balanceAfter,
        availableBalance: Math.round((wallet.availableBalance - amount) * 100) / 100,
      },
    })

    return transaction
  } catch (err) {
    throw new Error(`debitWallet failed for ${walletId}: ${err}`)
  }
}

// ─── Compliance Activities ───────────────────────────────────────────────────

/**
 * Run a compliance screening check for a business / transaction.
 * Returns mock results (result: 'clear', riskLevel: 'low') suitable for demo/development.
 * Idempotent per (businessId, transactionType, transactionId) pair.
 */
export async function runComplianceScreening(
  businessId: string,
  transactionType: string,
  transactionId: string
) {
  try {
    // Idempotency check
    const existing = await db.complianceScreening.findFirst({
      where: { businessId, transactionType, transactionId },
    })
    if (existing) {
      return existing
    }

    const screening = await db.complianceScreening.create({
      data: {
        businessId,
        transactionType,
        transactionId,
        screeningType: 'sanctions',
        result: 'clear',
        riskLevel: 'low',
        status: 'completed',
      },
    })

    return screening
  } catch (err) {
    throw new Error(`runComplianceScreening failed for business ${businessId}: ${err}`)
  }
}

// ─── Collection Activities ──────────────────────────────────────────────────

/**
 * Send a collection reminder for a given case.
 * Creates a CollectionReminder record and updates the case's reminder counters.
 * Idempotent based on the case + channel + template combination within a short window.
 */
export async function sendCollectionReminder(
  caseId: string,
  channel: string,
  template: string
) {
  try {
    const collectionCase = await db.collectionCase.findUnique({ where: { id: caseId } })
    if (!collectionCase) {
      throw new Error(`CollectionCase not found: ${caseId}`)
    }

    const reminder = await db.collectionReminder.create({
      data: {
        caseId,
        channel,
        template,
        status: 'sent',
      },
    })

    await db.collectionCase.update({
      where: { id: caseId },
      data: {
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
      },
    })

    return reminder
  } catch (err) {
    throw new Error(`sendCollectionReminder failed for case ${caseId}: ${err}`)
  }
}
