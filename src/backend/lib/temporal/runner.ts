import { getTemporalClient, isTemporalAvailable } from './client'
import { DLO_TASK_QUEUE } from './workflows'
import * as activities from './activities'

/**
 * Run a workflow: attempt Temporal first, fall back to direct execution.
 * This is the core abstraction that makes every workflow gracefully degrade
 * when Temporal server is unavailable (e.g. dev / demo environments).
 */
export async function runWorkflow<T>(
  workflowName: string,
  input: any,
  directFn: () => Promise<T>
): Promise<T> {
  // Try Temporal first
  try {
    const available = await isTemporalAvailable()
    if (available) {
      const client = await getTemporalClient()
      if (client) {
        const result = await client.workflow.start(workflowName, {
          taskQueue: DLO_TASK_QUEUE,
          args: [input],
          workflowId: `${workflowName}-${Date.now()}`,
        })
        return (await result.result()) as T
      }
    }
  } catch (err) {
    console.warn(
      `[Temporal] Workflow ${workflowName} failed, falling back to direct execution:`,
      err
    )
  }

  // Fallback: direct execution
  return directFn()
}

// ─── Convenience Functions ──────────────────────────────────────────────────

export async function runEscrowFunding(escrowId: string) {
  return runWorkflow(
    'escrow-funding',
    { escrowId },
    () => activities.fundEscrow(escrowId)
  )
}

export async function runEscrowActivation(escrowId: string) {
  return runWorkflow(
    'escrow-activation',
    { escrowId },
    () => activities.activateEscrow(escrowId)
  )
}

export async function runMilestoneRelease(escrowId: string, milestoneSequence: number) {
  return runWorkflow(
    'milestone-release',
    { escrowId, milestoneSequence },
    () => activities.releaseMilestone(escrowId, milestoneSequence)
  )
}

export async function runPaymentProcessing(
  paymentLinkId: string,
  amount: number,
  payerEmail: string,
  payerName: string,
  provider: string
) {
  return runWorkflow(
    'payment-processing',
    { paymentLinkId, amount, payerEmail, payerName, provider },
    () => activities.processPaymentLink(paymentLinkId, amount, payerEmail, payerName, provider)
  )
}

export async function runWalletCredit(
  walletId: string,
  amount: number,
  refType: string,
  refId: string,
  desc: string
) {
  return runWorkflow(
    'wallet-credit',
    { walletId, amount, refType, refId, desc },
    () => activities.creditWallet(walletId, amount, refType, refId, desc)
  )
}

export async function runWalletDebit(
  walletId: string,
  amount: number,
  refType: string,
  refId: string,
  desc: string
) {
  return runWorkflow(
    'wallet-debit',
    { walletId, amount, refType, refId, desc },
    () => activities.debitWallet(walletId, amount, refType, refId, desc)
  )
}

export async function runComplianceScreening(businessId: string, txType: string, txId: string) {
  return runWorkflow(
    'compliance-screening',
    { businessId, txType, txId },
    () => activities.runComplianceScreening(businessId, txType, txId)
  )
}

export async function runCollectionReminder(caseId: string, channel: string, template: string) {
  return runWorkflow(
    'collection-reminder',
    { caseId, channel, template },
    () => activities.sendCollectionReminder(caseId, channel, template)
  )
}
