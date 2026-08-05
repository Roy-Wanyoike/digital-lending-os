/**
 * Kafka Event Topics and Schemas
 *
 * Defines all topic names (with 'ys.' prefix) and TypeScript interfaces
 * for each event type. Used by the producer, consumer, and event bridge.
 */

// ── Topic Name Constants ─────────────────────────────────────────────────────

export const TOPICS = {
  PAYMENT_EVENTS: 'ys.payment.events',
  WALLET_EVENTS: 'ys.wallet.events',
  ESCROW_EVENTS: 'ys.escrow.events',
  FRAUD_EVENTS: 'ys.fraud.events',
  COMPLIANCE_EVENTS: 'ys.compliance.events',
  AUDIT_EVENTS: 'ys.audit.events',
  NOTIFICATION_EVENTS: 'ys.notification.events',
} as const

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS]

// ── Admin Topic Creation Config ──────────────────────────────────────────────

export interface TopicConfig {
  topic: string
  numPartitions: number
  replicationFactor: number
  config?: Record<string, string>
}

/**
 * Topic configurations for admin creation.
 * Use `getKafkaAdmin().createTopics({ topics: TOPIC_CONFIGS })`.
 */
export const TOPIC_CONFIGS: TopicConfig[] = [
  {
    topic: TOPICS.PAYMENT_EVENTS,
    numPartitions: 6,
    replicationFactor: 1,
    config: {
      'retention.ms': '604800000', // 7 days
      'cleanup.policy': 'delete',
    },
  },
  {
    topic: TOPICS.WALLET_EVENTS,
    numPartitions: 6,
    replicationFactor: 1,
    config: {
      'retention.ms': '604800000',
      'cleanup.policy': 'delete',
    },
  },
  {
    topic: TOPICS.ESCROW_EVENTS,
    numPartitions: 3,
    replicationFactor: 1,
    config: {
      'retention.ms': '604800000',
      'cleanup.policy': 'delete',
    },
  },
  {
    topic: TOPICS.FRAUD_EVENTS,
    numPartitions: 3,
    replicationFactor: 1,
    config: {
      'retention.ms': '2592000000', // 30 days (audit trail)
      'cleanup.policy': 'delete',
    },
  },
  {
    topic: TOPICS.COMPLIANCE_EVENTS,
    numPartitions: 3,
    replicationFactor: 1,
    config: {
      'retention.ms': '2592000000',
      'cleanup.policy': 'delete',
    },
  },
  {
    topic: TOPICS.AUDIT_EVENTS,
    numPartitions: 3,
    replicationFactor: 1,
    config: {
      'retention.ms': '2592000000',
      'cleanup.policy': 'compact,delete',
    },
  },
  {
    topic: TOPICS.NOTIFICATION_EVENTS,
    numPartitions: 3,
    replicationFactor: 1,
    config: {
      'retention.ms': '86400000', // 1 day
      'cleanup.policy': 'delete',
    },
  },
]

// ── Event Schema Interfaces ──────────────────────────────────────────────────

/** Base fields shared by all Kafka events */
export interface BaseKafkaEvent {
  eventId: string
  eventType: string
  timestamp: string // ISO 8601
  version: string
  tenantId?: string
  traceId?: string
  source: string
}

// ── Payment Events ───────────────────────────────────────────────────────────

export interface PaymentCreatedEvent extends BaseKafkaEvent {
  eventType: 'payment.created'
  data: {
    paymentIntentId: string
    paymentLinkId?: string
    amount: number
    currency: string
    payerEmail: string
    payerName: string
    provider: string
    status: string
  }
}

export interface PaymentCompletedEvent extends BaseKafkaEvent {
  eventType: 'payment.completed'
  data: {
    paymentIntentId: string
    paymentLinkId?: string
    amount: number
    currency: string
    provider: string
    providerRef?: string
    fees?: number
    netAmount?: number
  }
}

export interface PaymentFailedEvent extends BaseKafkaEvent {
  eventType: 'payment.failed'
  data: {
    paymentIntentId: string
    amount: number
    currency: string
    provider: string
    errorCode?: string
    errorMessage?: string
  }
}

export interface PaymentRefundedEvent extends BaseKafkaEvent {
  eventType: 'payment.refunded'
  data: {
    paymentIntentId: string
    refundId: string
    amount: number
    currency: string
    reason?: string
  }
}

export type PaymentEvent =
  | PaymentCreatedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent

// ── Wallet Events ────────────────────────────────────────────────────────────

export interface WalletDepositedEvent extends BaseKafkaEvent {
  eventType: 'wallet.deposited'
  data: {
    walletId: string
    amount: number
    currency: string
    reference: string
    balanceBefore: number
    balanceAfter: number
  }
}

export interface WalletWithdrawnEvent extends BaseKafkaEvent {
  eventType: 'wallet.withdrawn'
  data: {
    walletId: string
    withdrawalId: string
    amount: number
    currency: string
    reference: string
    balanceBefore: number
    balanceAfter: number
  }
}

export interface WalletBalanceLockedEvent extends BaseKafkaEvent {
  eventType: 'wallet.balance.locked'
  data: {
    walletId: string
    amount: number
    currency: string
    escrowId: string
    balanceBefore: number
    balanceAfter: number
    lockedBalanceBefore: number
    lockedBalanceAfter: number
  }
}

export interface WalletBalanceUnlockedEvent extends BaseKafkaEvent {
  eventType: 'wallet.balance.unlocked'
  data: {
    walletId: string
    amount: number
    currency: string
    escrowId: string
  }
}

export type WalletEvent =
  | WalletDepositedEvent
  | WalletWithdrawnEvent
  | WalletBalanceLockedEvent
  | WalletBalanceUnlockedEvent

// ── Escrow Events ────────────────────────────────────────────────────────────

export interface EscrowCreatedEvent extends BaseKafkaEvent {
  eventType: 'escrow.created'
  data: {
    escrowId: string
    totalAmount: number
    currency: string
    milestoneCount: number
    senderWalletId: string
    recipientWalletId: string
  }
}

export interface MilestoneReleasedEvent extends BaseKafkaEvent {
  eventType: 'escrow.milestone.released'
  data: {
    escrowId: string
    milestoneId: string
    milestoneSequence: number
    amount: number
    currency: string
  }
}

export interface EscrowCompletedEvent extends BaseKafkaEvent {
  eventType: 'escrow.completed'
  data: {
    escrowId: string
    totalAmount: number
    currency: string
  }
}

export interface EscrowDisputedEvent extends BaseKafkaEvent {
  eventType: 'escrow.disputed'
  data: {
    escrowId: string
    milestoneId?: string
    reason: string
  }
}

export type EscrowEvent =
  | EscrowCreatedEvent
  | MilestoneReleasedEvent
  | EscrowCompletedEvent
  | EscrowDisputedEvent

// ── Fraud Events ─────────────────────────────────────────────────────────────

export interface FraudAlertEvent extends BaseKafkaEvent {
  eventType: 'fraud.alert'
  data: {
    entityType: string
    entityId: string
    riskScore: number
    ruleId?: string
    ruleName?: string
    details: Record<string, unknown>
  }
}

export interface FraudReviewEvent extends BaseKafkaEvent {
  eventType: 'fraud.review'
  data: {
    alertId: string
    decision: 'approve' | 'reject' | 'escalate'
  }
}

export type FraudEvent = FraudAlertEvent | FraudReviewEvent

// ── Compliance Events ────────────────────────────────────────────────────────

export interface ComplianceScreeningEvent extends BaseKafkaEvent {
  eventType: 'compliance.screening'
  data: {
    businessId: string
    transactionType: string
    transactionId: string
    screeningResult: string
    riskLevel: 'low' | 'medium' | 'high'
    matchCount: number
  }
}

export interface ComplianceStatusChangedEvent extends BaseKafkaEvent {
  eventType: 'compliance.status.changed'
  data: {
    businessId: string
    oldStatus: string
    newStatus: string
    reason?: string
  }
}

export type ComplianceEvent =
  | ComplianceScreeningEvent
  | ComplianceStatusChangedEvent

// ── Audit Events ─────────────────────────────────────────────────────────────

export interface AuditLogEvent extends BaseKafkaEvent {
  eventType: 'audit.log'
  data: {
    action: string
    resource: string
    resourceId: string
    actorId: string
    actorType: string
    changes?: Record<string, { old: unknown; new: unknown }>
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
}

export type AuditEvent = AuditLogEvent

// ── Notification Events ──────────────────────────────────────────────────────

export interface NotificationEvent extends BaseKafkaEvent {
  eventType: 'notification.send'
  data: {
    recipientId: string
    recipientType: 'user' | 'business'
    channel: 'email' | 'sms' | 'push' | 'in_app'
    templateId: string
    templateData: Record<string, unknown>
    subject?: string
  }
}

// ── Union Types ──────────────────────────────────────────────────────────────

export type AllKafkaEvent =
  | PaymentEvent
  | WalletEvent
  | EscrowEvent
  | FraudEvent
  | ComplianceEvent
  | AuditEvent
  | NotificationEvent

// ── Event → Topic Mapping ────────────────────────────────────────────────────

/** Maps an event type prefix to its Kafka topic */
export function eventTypeToTopic(eventType: string): string {
  if (eventType.startsWith('payment.')) return TOPICS.PAYMENT_EVENTS
  if (eventType.startsWith('wallet.')) return TOPICS.WALLET_EVENTS
  if (eventType.startsWith('escrow.')) return TOPICS.ESCROW_EVENTS
  if (eventType.startsWith('fraud.')) return TOPICS.FRAUD_EVENTS
  if (eventType.startsWith('compliance.')) return TOPICS.COMPLIANCE_EVENTS
  if (eventType.startsWith('audit.')) return TOPICS.AUDIT_EVENTS
  if (eventType.startsWith('notification.')) return TOPICS.NOTIFICATION_EVENTS
  // Default to audit for unknown events
  return TOPICS.AUDIT_EVENTS
}
