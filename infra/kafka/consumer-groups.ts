/**
 * Digital Lending OS Kafka Consumer Group Configurations
 *
 * Defines all consumer groups with:
 * - Group ID
 * - Subscribed topics
 * - Concurrency settings
 * - Processing guarantee (at-least-once vs exactly-once)
 * - Retry strategy with exponential backoff
 * - DLQ topic mapping
 */

import type { TopicConfig } from "./topics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProcessingGuarantee = "at-least-once" | "exactly-once";

export interface RetryStrategy {
  /** Maximum number of retry attempts before forwarding to DLQ */
  maxAttempts: number;
  /** Initial backoff delay in milliseconds */
  initialDelayMs: number;
  /** Multiplier applied to the delay after each attempt */
  multiplier: number;
  /** Maximum backoff cap in milliseconds */
  maxDelayMs: number;
  /** Whether to add jitter to prevent thundering herd */
  jitter: boolean;
}

export interface DlqConfig {
  /** Whether DLQ forwarding is enabled for this consumer group */
  enabled: boolean;
  /** Custom DLQ topic prefix override (defaults to "dlq.") */
  prefix?: string;
  /** Whether to include the consumer group name in the DLQ topic */
  includeGroupId: boolean;
}

export interface ConsumerGroupConfig {
  /** Unique consumer group ID */
  groupId: string;
  /** Human-readable description */
  description: string;
  /** Topics this consumer group subscribes to */
  topics: string[];
  /** Number of concurrent consumer instances to run */
  concurrency: number;
  /** Maximum number of records per poll cycle */
  maxPollRecords: number;
  /** Maximum time to wait in a poll cycle (ms) */
  maxWaitMs: number;
  /** Session timeout (ms) */
  sessionTimeoutMs: number;
  /** Heartbeat interval (ms) */
  heartbeatIntervalMs: number;
  /** Processing guarantee */
  processingGuarantee: ProcessingGuarantee;
  /** Whether to auto-commit offsets */
  autoCommit: boolean;
  /** Auto-commit interval (ms) — only when autoCommit is true */
  autoCommitIntervalMs: number;
  /** Where to start reading if no committed offsets */
  autoOffsetReset: "earliest" | "latest";
  /** Isolation level for reading committed/transactional messages */
  isolationLevel: "read_committed" | "read_uncommitted";
  /** Retry strategy */
  retry: RetryStrategy;
  /** Dead letter queue configuration */
  dlq: DlqConfig;
}

// ─── Default Configurations ─────────────────────────────────────────────────────

/** Standard retry strategy with exponential backoff */
export const STANDARD_RETRY: RetryStrategy = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
  jitter: true,
};

/** Aggressive retry for high-priority domains (payment, wallet) */
export const AGGRESSIVE_RETRY: RetryStrategy = {
  maxAttempts: 5,
  initialDelayMs: 500,
  multiplier: 2,
  maxDelayMs: 16000,
  jitter: true,
};

/** Lenient retry for non-critical domains (notifications, audit) */
export const LENIENT_RETRY: RetryStrategy = {
  maxAttempts: 3,
  initialDelayMs: 2000,
  multiplier: 3,
  maxDelayMs: 30000,
  jitter: true,
};

/** Standard DLQ configuration */
export const STANDARD_DLQ: DlqConfig = {
  enabled: true,
  includeGroupId: false,
};

// ─── Consumer Group Definitions ────────────────────────────────────────────────

export const consumerGroups: ConsumerGroupConfig[] = [
  // ── Payment Service Consumers ──────────────────────────────────────────────

  {
    groupId: "payment-service.payment.consumer",
    description:
      "Consumes payment events for internal payment service state management, saga orchestration, and idempotency tracking.",
    topics: [
      "payment.events.payment_initiated",
      "payment.events.payment_processing",
      "payment.events.payment_completed",
      "payment.events.payment_failed",
      "payment.events.payment_refunded",
    ],
    concurrency: 4,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "exactly-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_committed",
    retry: AGGRESSIVE_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Wallet Service Consumers ───────────────────────────────────────────────

  {
    groupId: "wallet-service.payment.consumer",
    description:
      "Credits/debits wallets based on payment lifecycle events. Handles deposit and refund flows.",
    topics: [
      "payment.events.payment_completed",
      "payment.events.payment_refunded",
    ],
    concurrency: 3,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "exactly-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_committed",
    retry: AGGRESSIVE_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "wallet-service.escrow.consumer",
    description:
      "Handles wallet operations triggered by escrow lifecycle — holds, releases, refunds.",
    topics: [
      "escrow.events.escrow_funded",
      "escrow.events.escrow_released",
      "escrow.events.escrow_cancelled",
    ],
    concurrency: 2,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "exactly-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_committed",
    retry: AGGRESSIVE_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "wallet-service.compliance.consumer",
    description:
      "Freezes/unfreezes wallets based on compliance and fraud decisions.",
    topics: [
      "fraud.events.fraud_case_opened",
      "fraud.events.fraud_case_resolved",
      "compliance.events.compliance_screening_completed",
    ],
    concurrency: 2,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Escrow Service Consumers ───────────────────────────────────────────────

  {
    groupId: "escrow-service.payment.consumer",
    description:
      "Creates and manages escrow transactions based on completed payments.",
    topics: [
      "payment.events.payment_completed",
    ],
    concurrency: 3,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "exactly-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_committed",
    retry: AGGRESSIVE_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Trust Service Consumers ───────────────────────────────────────────────

  {
    groupId: "trust-service.escrow.consumer",
    description:
      "Updates trust scores based on escrow release, dispute resolution, and review activity.",
    topics: [
      "escrow.events.escrow_released",
      "escrow.events.escrow_disputed",
      "escrow.events.escrow_cancelled",
    ],
    concurrency: 2,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "trust-service.payment.consumer",
    description:
      "Recalculates trust scores based on successful payment history and volume.",
    topics: [
      "payment.events.payment_completed",
      "payment.events.payment_failed",
    ],
    concurrency: 2,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Fraud Detection Engine Consumers ───────────────────────────────────────

  {
    groupId: "fraud-engine.payment.consumer",
    description:
      "Real-time fraud screening on every payment initiation and processing event.",
    topics: [
      "payment.events.payment_initiated",
      "payment.events.payment_processing",
    ],
    concurrency: 4,
    maxPollRecords: 50,
    maxWaitMs: 1000, // Low latency for real-time screening
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: { ...STANDARD_DLQ, includeGroupId: true },
  },

  {
    groupId: "fraud-engine.wallet.consumer",
    description:
      "Monitors wallet activity for unusual patterns, velocity checks, and geographic anomalies.",
    topics: [
      "wallet.events.wallet_deposited",
      "wallet.events.wallet_withdrawn",
      "wallet.events.wallet_converted",
    ],
    concurrency: 2,
    maxPollRecords: 100,
    maxWaitMs: 3000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: { ...STANDARD_DLQ, includeGroupId: true },
  },

  // ── Compliance Service Consumers ───────────────────────────────────────────

  {
    groupId: "compliance-service.payment.consumer",
    description:
      "Triggers compliance screening when new users or high-value payments are initiated.",
    topics: [
      "payment.events.payment_initiated",
    ],
    concurrency: 2,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "compliance-service.kyc.consumer",
    description:
      "Processes KYC submissions, triggers third-party verification, and publishes results.",
    topics: [
      "compliance.events.compliance_kyc_submitted",
    ],
    concurrency: 3,
    maxPollRecords: 50,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: STANDARD_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Notification Service Consumers ─────────────────────────────────────────

  {
    groupId: "notification-service.payment.consumer",
    description:
      "Sends payment confirmations, receipts, and failure notifications.",
    topics: [
      "payment.events.payment_completed",
      "payment.events.payment_failed",
      "payment.events.payment_refunded",
    ],
    concurrency: 3,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: LENIENT_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "notification-service.escrow.consumer",
    description:
      "Sends escrow status update notifications to buyers and sellers.",
    topics: [
      "escrow.events.escrow_created",
      "escrow.events.escrow_funded",
      "escrow.events.escrow_released",
      "escrow.events.escrow_disputed",
      "escrow.events.escrow_cancelled",
    ],
    concurrency: 2,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: LENIENT_RETRY,
    dlq: STANDARD_DLQ,
  },

  {
    groupId: "notification-service.fraud.consumer",
    description:
      "Sends alerts for fraud cases and compliance actions.",
    topics: [
      "fraud.events.fraud_alert_triggered",
      "fraud.events.fraud_case_opened",
      "fraud.events.fraud_case_resolved",
      "compliance.events.compliance_kyc_verified",
      "compliance.events.compliance_kyc_rejected",
    ],
    concurrency: 2,
    maxPollRecords: 100,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 5000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: LENIENT_RETRY,
    dlq: STANDARD_DLQ,
  },

  // ── Audit Service Consumers ────────────────────────────────────────────────

  {
    groupId: "audit-service.all.consumer",
    description:
      "Consumes all events for immutable audit trail logging. Fan-out consumer that captures every domain event.",
    topics: [
      "payment.events.payment_initiated",
      "payment.events.payment_processing",
      "payment.events.payment_completed",
      "payment.events.payment_failed",
      "payment.events.payment_refunded",
      "wallet.events.wallet_deposited",
      "wallet.events.wallet_withdrawn",
      "wallet.events.wallet_converted",
      "wallet.events.wallet_frozen",
      "wallet.events.wallet_unfrozen",
      "escrow.events.escrow_created",
      "escrow.events.escrow_funded",
      "escrow.events.escrow_released",
      "escrow.events.escrow_disputed",
      "escrow.events.escrow_cancelled",
      "trust.events.trust_score_updated",
      "trust.events.trust_review_submitted",
      "trust.events.trust_relationship_created",
      "trust.events.trust_verification_completed",
      "fraud.events.fraud_alert_triggered",
      "fraud.events.fraud_rule_matched",
      "fraud.events.fraud_case_opened",
      "fraud.events.fraud_case_resolved",
      "compliance.events.compliance_screening_requested",
      "compliance.events.compliance_screening_completed",
      "compliance.events.compliance_kyc_submitted",
      "compliance.events.compliance_kyc_verified",
      "compliance.events.compliance_kyc_rejected",
    ],
    concurrency: 4,
    maxPollRecords: 500,
    maxWaitMs: 5000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "at-least-once",
    autoCommit: true,
    autoCommitIntervalMs: 1000,
    autoOffsetReset: "earliest",
    isolationLevel: "read_uncommitted",
    retry: LENIENT_RETRY,
    dlq: { enabled: false },
  },

  // ── Saga Orchestrator ──────────────────────────────────────────────────────

  {
    groupId: "saga-orchestrator.payment.consumer",
    description:
      "Saga orchestrator that coordinates payment → wallet → escrow → notification flows with compensating transactions.",
    topics: [
      "payment.events.payment_initiated",
      "payment.events.payment_completed",
      "payment.events.payment_failed",
      "escrow.events.escrow_created",
      "escrow.events.escrow_funded",
      "escrow.events.escrow_released",
      "escrow.events.escrow_disputed",
      "escrow.events.escrow_cancelled",
      "wallet.events.wallet_deposited",
      "wallet.events.wallet_withdrawn",
      "wallet.events.wallet_frozen",
    ],
    concurrency: 4,
    maxPollRecords: 50,
    maxWaitMs: 1000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
    processingGuarantee: "exactly-once",
    autoCommit: false,
    autoCommitIntervalMs: 0,
    autoOffsetReset: "earliest",
    isolationLevel: "read_committed",
    retry: AGGRESSIVE_RETRY,
    dlq: STANDARD_DLQ,
  },
];

// ─── Lookup Helpers ────────────────────────────────────────────────────────────

/** Map from group ID → config */
export const CONSUMER_GROUP_MAP: Record<string, ConsumerGroupConfig> =
  Object.fromEntries(consumerGroups.map((cg) => [cg.groupId, cg]));

/** Get consumer group config by group ID */
export function getConsumerGroup(groupId: string): ConsumerGroupConfig | undefined {
  return CONSUMER_GROUP_MAP[groupId];
}

/** Get all consumer groups subscribed to a given topic */
export function getConsumerGroupsForTopic(topic: string): ConsumerGroupConfig[] {
  return consumerGroups.filter((cg) => cg.topics.includes(topic));
}

/**
 * Compute DLQ topic name for a consumer group + source topic combination.
 */
export function resolveDlqTopic(
  sourceTopic: string,
  groupConfig: ConsumerGroupConfig,
): string {
  if (!groupConfig.dlq.enabled) {
    throw new Error(`DLQ is not enabled for consumer group: ${groupConfig.groupId}`);
  }
  const prefix = groupConfig.dlq.prefix ?? "dlq.";
  if (groupConfig.dlq.includeGroupId) {
    return `${prefix}${groupConfig.groupId}.${sourceTopic}`;
  }
  return `${prefix}${sourceTopic}`;
}

/**
 * Compute retry delay for a given attempt number using exponential backoff with optional jitter.
 */
export function computeRetryDelay(
  attempt: number,
  strategy: RetryStrategy,
): number {
  const base = Math.min(
    strategy.initialDelayMs * Math.pow(strategy.multiplier, attempt - 1),
    strategy.maxDelayMs,
  );
  if (strategy.jitter) {
    // Add ±25% jitter
    const jitterRange = base * 0.25;
    return Math.max(0, base + (Math.random() * 2 - 1) * jitterRange);
  }
  return base;
}

/**
 * Convert a ConsumerGroupConfig into a flat KafkaJS consumer config object.
 */
export function toKafkaConsumerConfig(
  config: ConsumerGroupConfig,
): Record<string, unknown> {
  return {
    "group.id": config.groupId,
    "partition.assignment.strategy": ["cooperative-sticky"],
    "max.poll.records": config.maxPollRecords,
    "max.poll.interval.ms": 300000, // 5 minutes processing timeout
    "session.timeout.ms": config.sessionTimeoutMs,
    "heartbeat.interval.ms": config.heartbeatIntervalMs,
    "enable.auto.commit": config.autoCommit,
    "auto.commit.interval.ms": config.autoCommitIntervalMs,
    "auto.offset.reset": config.autoOffsetReset,
    "isolation.level": config.isolationLevel,
  };
}
