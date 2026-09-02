// Workflow interfaces for Digital Lending OS business processes

// ─── Escrow Workflow ─────────────────────────────────────────────────────────

export interface EscrowMilestone {
  title: string
  amount: number
}

export interface EscrowWorkflowInput {
  escrowId: string
  buyerId: string
  sellerId: string
  amount: number
  currency: string
  milestones: EscrowMilestone[]
  tenantId: string
}

export interface EscrowWorkflowOutput {
  escrowId: string
  status: string
  paymentIntentId?: string
  fundedAt?: string
  activatedAt?: string
}

// ─── Payment Processing Workflow ──────────────────────────────────────────────

export interface PaymentProcessingInput {
  paymentLinkId: string
  amount: number
  currency: string
  payerEmail: string
  payerName: string
  provider: string
  tenantId: string
}

export interface PaymentProcessingOutput {
  paymentId: string
  status: string
  providerTxId?: string
  checkoutUrl?: string
}

// ─── Wallet Transfer Workflow ────────────────────────────────────────────────

export interface WalletTransferInput {
  fromWalletId: string
  toWalletId: string
  amount: number
  currency: string
  tenantId: string
}

export interface WalletTransferOutput {
  transactionId: string
  status: string
}

// ─── Compliance Screening Workflow ───────────────────────────────────────────

export interface ComplianceScreeningInput {
  businessId: string
  transactionType: string
  transactionId: string
  tenantId: string
}

export interface ComplianceScreeningOutput {
  screeningId: string
  result: string
  riskLevel: string
}

// ─── Collection Workflow ─────────────────────────────────────────────────────

export interface CollectionWorkflowInput {
  caseId: string
  tenantId: string
}

export interface CollectionWorkflowOutput {
  caseId: string
  status: string
  remindersSent: number
}

// ─── Task Queue ──────────────────────────────────────────────────────────────

/** Temporal task queue name for all Digital Lending OS workflows */
export const DLO_TASK_QUEUE = 'dlo-queue'
