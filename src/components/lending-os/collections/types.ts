// Collections Module - Shared Types

// Summary data for collections dashboard
export interface CollectionSummary {
  dueToday: {
    amount: number
    count: number
  }
  collectedToday: {
    amount: number
    count: number
  }
  overdueTotal: {
    amount: number
    count: number
  }
  par: {
    par1: number
    par7: number
    par30: number
    par90: number
  }
  totalPortfolio: number
}

// Aging bucket for overdue loan distribution
export interface AgingBucket {
  bucket: string // e.g., "1-7 days", "8-30 days"
  count: number
  amount: number
  minDays: number
  maxDays: number | null
  severity: 'low' | 'medium' | 'high' | 'critical' | 'severe'
}

// Overdue loan item (simplified for table display)
export interface OverdueLoan {
  id: string
  loanNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  principal: number
  outstandingBalance: number
  totalRepaid: number
  daysInArrears: number
  status: string
  arrearsStatus: string
  assignedCollectorId?: string | null
  collectorName?: string | null
  nextPaymentDue?: string | null
  disbursementDate?: string | null
  maturityDate?: string | null
  productName?: string
  productCategory?: string
  lastCollectionAt?: Date | null
  riskLevel?: string
}

// Collection agent/user
export interface CollectionAgent {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  assignedCount?: number
}

// Promise to Pay record
export interface PromiseToPayRecord {
  id: string
  loanId: string
  customerId: string
  tenantId: string
  promisedAmount: number
  promisedDate: string
  confidenceLevel: 'high' | 'medium' | 'low'
  notes?: string
  status: 'PENDING' | 'KEPT' | 'BROKEN' | 'PARTIAL' | 'CANCELLED'
  actualPaidAmount?: number
  keptDate?: string
  brokenDate?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  loanNumber?: string
  customerName?: string
}

// Contact attempt record
export interface ContactAttempt {
  id: string
  loanId: string
  contactMethod: 'sms' | 'call' | 'whatsapp' | 'email'
  contactOutcome: 'reached' | 'no_answer' | 'busy' | 'wrong_number' | 'callback_requested' | 'promised_to_pay'
  notes?: string
  contactedAt: string
  contactedBy: string
  contactedByName?: string
}

// Payment arrangement record
export interface PaymentArrangement {
  id: string
  loanId: string
  arrangementAmount: number
  arrangementStartDate: string
  arrangementFrequency: 'weekly' | 'bi_weekly' | 'monthly'
  arrangementInstallments: number
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED'
  notes?: string
  createdAt: string
  createdBy: string
}

// Escalation record
export interface EscalationRecord {
  id: string
  loanId: string
  escalationReason: string
  escalationLevel: 'supervisor' | 'management' | 'legal' | 'external_agency'
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED'
  escalatedAt: string
  escalatedBy: string
  resolvedAt?: string
  resolutionNotes?: string
}

// Collection action types (for API)
export type CollectionActionType = 
  | 'promise_to_pay' 
  | 'contact_attempt' 
  | 'payment_arrangement' 
  | 'escalate' 
  | 'write_off'

export interface CollectionActionPayload {
  action: CollectionActionType
  loanId: string
  tenantId?: string
  notes?: string
  // For promise_to_pay
  promisedAmount?: number
  promisedDate?: string
  confidenceLevel?: 'high' | 'medium' | 'low'
  // For contact_attempt
  contactMethod?: 'sms' | 'call' | 'whatsapp' | 'email'
  contactOutcome?: string
  // For payment_arrangement
  arrangementAmount?: number
  arrangementStartDate?: string
  arrangementFrequency?: 'weekly' | 'bi_weekly' | 'monthly'
  arrangementInstallments?: number
  // For escalate
  escalationReason?: string
  escalationLevel?: string
  // For write_off
  writeOffReason?: string
  writeOffCategory?: string
}

// Agent performance metrics
export interface AgentPerformance {
  agentId: string
  agentName: string
  period: {
    from: string
    to: string
  }
  metrics: {
    loansAssigned: number
    callsMade: number
    callsConnected: number
    smsSent: number
    emailsSent: number
    promisesReceived: number
    promisesKept: number
    promisesBroken: number
    amountsRecovered: number
    recoveryRate: number
  }
  dailyActivity: DailyActivity[]
}

// Daily activity for agent
export interface DailyActivity {
  date: string
  callsMade: number
  smsSent: number
  promisesReceived: number
  amountsRecovered: number
}

// API response types
export interface CollectionsDashboardResponse {
  success: boolean
  data: {
    summary: CollectionSummary
    agingBuckets: AgingBucket[]
    overdueLoans: OverdueLoan[]
    collectionAgents: CollectionAgent[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface CollectionsLoansResponse {
  success: boolean
  data: OverdueLoan[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  filters: Record<string, string | null>
}

// SMS Campaign Types
export type SMSCampaignRecipientType = 
  | 'all_overdue' 
  | 'by_bucket' 
  | 'manual' 
  | 'saved_segment'

export type SMSCampaignScheduleType = 'now' | 'scheduled'

export interface SMSMessageTemplate {
  id: string
  name: string
  content: string
  variables: string[]
}

export interface SMSCampaign {
  id: string
  name: string
  recipientType: SMSCampaignRecipientType
  selectedBucket?: string
  selectedSegment?: string
  manualRecipients: string[]
  message: string
  scheduleType: SMSCampaignScheduleType
  scheduledAt?: string
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  estimatedCost: number
  actualCost?: number
  recipientCount: int
  sentCount?: int
  deliveredCount?: int
  failedCount?: int
  createdBy: string
  createdAt: string
  sentAt?: string
  completedAt?: string
}

export interface SavedSegment {
  id: string
  name: string
  description?: string
  criteria: Record<string, unknown>
  count: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Call History Types
export type CallOutcome = 
  | 'contacted' 
  | 'no_answer' 
  | 'busy' 
  | 'wrong_number' 
  | 'callback_requested' 
  | 'promised_to_pay'
  | 'broken_promise'
  | 'refused_payment'
  | 'payment_arrangement'

export interface CallRecord {
  id: string
  loanId: string
  customerId: string
  customerName: string
  customerPhone: string
  agentId: string
  agentName: string
  contactMethod: 'call' | 'sms' | 'whatsapp' | 'email'
  callOutcome: CallOutcome
  duration?: number // in seconds
  notes?: string
  promiseAmount?: number
  promiseDate?: string
  recordingUrl?: string
  contactedAt: Date
  createdAt: Date
}

// Collection Queue Types
export type QueueItemStatus = 'pending' | 'called' | 'promised' | 'paid' | 'broken_promise'

export interface QueueItem {
  id: string
  loanId: string
  loanNumber: string
  customerName: string
  customerPhone: string
  amountDue: number
  originalAmount: number
  promiseDate?: string
  promiseAmount?: number
  notes: string
  status: QueueItemStatus
  lastContactDate?: string
  callAttempts: number
  priority: 'high' | 'medium' | 'low'
  order: number
}

// PAR Calculator Types
export interface PARData {
  par1: number      // PAR >1 day
  par7: number      // PAR >7 days
  par30: number     // PAR >30 days (main regulatory metric)
  par60: number     // PAR >60 days
  par90: number     // PAR >90 days
  par180: number    // PAR >180 days
  totalPortfolio: number
  overdueAmount: number
}

export interface PARBenchmark {
  name: string
  par30: {
    excellent: number
    good: number
    average: number
    poor: number
    critical: number
  }
  description: string
}
