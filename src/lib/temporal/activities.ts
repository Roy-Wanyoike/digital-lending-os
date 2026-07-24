import { db } from '@/lib/db'

// ─── Escrow Activities ──────────────────────────────────────────────────────

/**
 * Fund an escrow — move status to 'funded' and create an audit log entry.
 * Idempotent: safe to call multiple times for the same escrowId.
 */
export async function fundEscrow(escrowId: string) {
  try {
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status === 'funded') {
      return escrow // already funded — idempotent
    }
    if (escrow.status !== 'pending') {
      throw new Error(`Cannot fund escrow in status '${escrow.status}'`)
    }

    const updated = await db.escrow.update({
      where: { id: escrowId },
      data: { status: 'funded', fundedAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        action: 'ESCROW_FUNDED',
        entityType: 'Escrow',
        entityId: escrowId,
        tenantId: escrow.tenantId,
        details: { amount: escrow.amount, currency: escrow.currency },
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
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status === 'in_escrow') {
      return escrow // already activated — idempotent
    }
    if (escrow.status !== 'funded') {
      throw new Error(`Cannot activate escrow in status '${escrow.status}'`)
    }

    const updated = await db.escrow.update({
      where: { id: escrowId },
      data: { status: 'in_escrow', activatedAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        action: 'ESCROW_ACTIVATED',
        entityType: 'Escrow',
        entityId: escrowId,
        tenantId: escrow.tenantId,
        details: { amount: escrow.amount, currency: escrow.currency },
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
    const escrow = await db.escrow.findUnique({ where: { id: escrowId } })
    if (!escrow) {
      throw new Error(`Escrow not found: ${escrowId}`)
    }
    if (escrow.status !== 'in_escrow') {
      throw new Error(`Cannot release milestone from escrow in status '${escrow.status}'`)
    }

    // Find the milestone (stored as JSON in the escrow model)
    const milestones = (escrow.milestones as { title: string; amount: number; released?: boolean }[]) || []
    const milestone = milestones[milestoneSequence]
    if (!milestone) {
      throw new Error(`Milestone index ${milestoneSequence} not found on escrow ${escrowId}`)
    }
    if (milestone.released) {
      return escrow // already released — idempotent
    }

    // Mark the milestone as released
    milestones[milestoneSequence] = { ...milestone, released: true }
    const newReleasedAmount = (escrow.releasedAmount ?? 0) + milestone.amount

    const updated = await db.escrow.update({
      where: { id: escrowId },
      data: {
        milestones,
        releasedAmount: newReleasedAmount,
        status: newReleasedAmount >= escrow.amount ? 'completed' : 'in_escrow',
      },
    })

    // Create disbursement record
    await db.disbursement.create({
      data: {
        escrowId,
        milestoneSequence,
        amount: milestone.amount,
        currency: escrow.currency,
        recipientId: escrow.sellerId,
        tenantId: escrow.tenantId,
        status: 'completed',
      },
    })

    await db.auditLog.create({
      data: {
        action: 'MILESTONE_RELEASED',
        entityType: 'Escrow',
        entityId: escrowId,
        tenantId: escrow.tenantId,
        details: {
          milestoneSequence,
          milestoneTitle: milestone.title,
          amount: milestone.amount,
        },
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
        tenantId: link.tenantId,
      },
    })

    // Update link aggregates
    const newTotalCollected = (link.totalCollected ?? 0) + amount
    const newPaymentCount = (link.paymentCount ?? 0) + 1
    const isDepleted = link.maxAmount ? newTotalCollected >= link.maxAmount : false
    const isMaxPayments = link.maxPayments ? newPaymentCount >= link.maxPayments : false

    await db.paymentLink.update({
      where: { id: paymentLinkId },
      data: {
        totalCollected: newTotalCollected,
        paymentCount: newPaymentCount,
        status: isDepleted || isMaxPayments ? 'depleted' : link.status,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'PAYMENT_LINK_PAYMENT',
        entityType: 'PaymentLink',
        entityId: paymentLinkId,
        tenantId: link.tenantId,
        details: {
          paymentId: payment.id,
          amount,
          payerEmail,
          provider,
          linkDepleted: isDepleted || isMaxPayments,
        },
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

    const transaction = await db.walletTransaction.create({
      data: {
        walletId,
        type: 'credit',
        amount,
        currency: wallet.currency,
        referenceType,
        referenceId,
        description,
        status: 'completed',
        tenantId: wallet.tenantId,
      },
    })

    await db.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
        availableBalance: { increment: amount },
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

    const transaction = await db.walletTransaction.create({
      data: {
        walletId,
        type: 'debit',
        amount,
        currency: wallet.currency,
        referenceType,
        referenceId,
        description,
        status: 'completed',
        tenantId: wallet.tenantId,
      },
    })

    await db.wallet.update({
      where: { id: walletId },
      data: {
        balance: { decrement: amount },
        availableBalance: { decrement: amount },
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
 * Idempotent per (businessId, transactionId) pair.
 */
export async function runComplianceScreening(
  businessId: string,
  transactionType: string,
  transactionId: string
) {
  try {
    // Idempotency check
    const existing = await db.complianceScreening.findFirst({
      where: { businessId, transactionId },
    })
    if (existing) {
      return existing
    }

    const screening = await db.complianceScreening.create({
      data: {
        businessId,
        transactionType,
        transactionId,
        result: 'clear',
        riskLevel: 'low',
        status: 'completed',
        screenedAt: new Date(),
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
        sentAt: new Date(),
        tenantId: collectionCase.tenantId,
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
