/**
 * Youngsend Kafka Topic Definitions
 *
 * All topics organized by domain. Each topic definition includes:
 * - key type (the entity ID used for partition routing)
 * - partition count recommendation
 * - retention policy (time + size)
 * - compaction strategy (delete, compact, or both)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopicConfig {
  /** Full topic name, e.g. "payment.events.payment_initiated" */
  name: string;
  /** Human-readable label */
  label: string;
  /** Domain this topic belongs to */
  domain: TopicDomain;
  /** The entity ID used as the Kafka message key for partition routing */
  keyType: string;
  /** Recommended number of partitions */
  partitions: number;
  /** Replication factor (production minimum = 3) */
  replicationFactor: number;
  /** Retention duration (ms). -1 = infinite */
  retentionMs: number;
  /** Maximum size before old segments are deleted (bytes) */
  retentionBytes: number;
  /** Compaction strategy */
  compaction: CompactionStrategy;
  /** EOS tier: 1 = transactional, 2 = idempotent consumer, 3 = fire-and-forget */
  eosTier: 1 | 2 | 3;
  /** Corresponding DLQ topic name */
  dlqTopic: string;
}

export type TopicDomain =
  | "payment"
  | "wallet"
  | "escrow"
  | "trust"
  | "fraud"
  | "compliance"
  | "notification"
  | "audit";

export type CompactionStrategy = "delete" | "compact" | "delete,compact";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** 7 days in ms */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
/** 30 days in ms */
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
/** 90 days in ms */
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
/** 1 GB */
const ONE_GB = 1_073_741_824;
/** -1 means no size limit */
const UNLIMITED = -1;

// ─── Topic Definitions ─────────────────────────────────────────────────────────

// ── Payment Events ─────────────────────────────────────────────────────────────

export const paymentTopics: TopicConfig[] = [
  {
    name: "payment.events.payment_initiated",
    label: "Payment Initiated",
    domain: "payment",
    keyType: "paymentId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 1,
    dlqTopic: "dlq.payment.events.payment_initiated",
  },
  {
    name: "payment.events.payment_processing",
    label: "Payment Processing",
    domain: "payment",
    keyType: "paymentId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 1,
    dlqTopic: "dlq.payment.events.payment_processing",
  },
  {
    name: "payment.events.payment_completed",
    label: "Payment Completed",
    domain: "payment",
    keyType: "paymentId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.payment.events.payment_completed",
  },
  {
    name: "payment.events.payment_failed",
    label: "Payment Failed",
    domain: "payment",
    keyType: "paymentId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete",
    eosTier: 1,
    dlqTopic: "dlq.payment.events.payment_failed",
  },
  {
    name: "payment.events.payment_refunded",
    label: "Payment Refunded",
    domain: "payment",
    keyType: "paymentId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.payment.events.payment_refunded",
  },
];

// ── Wallet Events ───────────────────────────────────────────────────────────────

export const walletTopics: TopicConfig[] = [
  {
    name: "wallet.events.wallet_deposited",
    label: "Wallet Deposited",
    domain: "wallet",
    keyType: "walletId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.wallet.events.wallet_deposited",
  },
  {
    name: "wallet.events.wallet_withdrawn",
    label: "Wallet Withdrawn",
    domain: "wallet",
    keyType: "walletId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.wallet.events.wallet_withdrawn",
  },
  {
    name: "wallet.events.wallet_converted",
    label: "Wallet Converted",
    domain: "wallet",
    keyType: "walletId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 1,
    dlqTopic: "dlq.wallet.events.wallet_converted",
  },
  {
    name: "wallet.events.wallet_frozen",
    label: "Wallet Frozen",
    domain: "wallet",
    keyType: "walletId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.wallet.events.wallet_frozen",
  },
  {
    name: "wallet.events.wallet_unfrozen",
    label: "Wallet Unfrozen",
    domain: "wallet",
    keyType: "walletId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.wallet.events.wallet_unfrozen",
  },
];

// ── Escrow Events ──────────────────────────────────────────────────────────────

export const escrowTopics: TopicConfig[] = [
  {
    name: "escrow.events.escrow_created",
    label: "Escrow Created",
    domain: "escrow",
    keyType: "escrowId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.escrow.events.escrow_created",
  },
  {
    name: "escrow.events.escrow_funded",
    label: "Escrow Funded",
    domain: "escrow",
    keyType: "escrowId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.escrow.events.escrow_funded",
  },
  {
    name: "escrow.events.escrow_released",
    label: "Escrow Released",
    domain: "escrow",
    keyType: "escrowId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.escrow.events.escrow_released",
  },
  {
    name: "escrow.events.escrow_disputed",
    label: "Escrow Disputed",
    domain: "escrow",
    keyType: "escrowId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.escrow.events.escrow_disputed",
  },
  {
    name: "escrow.events.escrow_cancelled",
    label: "Escrow Cancelled",
    domain: "escrow",
    keyType: "escrowId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete,compact",
    eosTier: 1,
    dlqTopic: "dlq.escrow.events.escrow_cancelled",
  },
];

// ── Trust Events ───────────────────────────────────────────────────────────────

export const trustTopics: TopicConfig[] = [
  {
    name: "trust.events.trust_score_updated",
    label: "Trust Score Updated",
    domain: "trust",
    keyType: "userId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.trust.events.trust_score_updated",
  },
  {
    name: "trust.events.trust_review_submitted",
    label: "Trust Review Submitted",
    domain: "trust",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.trust.events.trust_review_submitted",
  },
  {
    name: "trust.events.trust_relationship_created",
    label: "Trust Relationship Created",
    domain: "trust",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.trust.events.trust_relationship_created",
  },
  {
    name: "trust.events.trust_verification_completed",
    label: "Trust Verification Completed",
    domain: "trust",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: NINETY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.trust.events.trust_verification_completed",
  },
];

// ── Fraud Events ──────────────────────────────────────────────────────────────

export const fraudTopics: TopicConfig[] = [
  {
    name: "fraud.events.fraud_alert_triggered",
    label: "Fraud Alert Triggered",
    domain: "fraud",
    keyType: "alertId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.fraud.events.fraud_alert_triggered",
  },
  {
    name: "fraud.events.fraud_rule_matched",
    label: "Fraud Rule Matched",
    domain: "fraud",
    keyType: "alertId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.fraud.events.fraud_rule_matched",
  },
  {
    name: "fraud.events.fraud_case_opened",
    label: "Fraud Case Opened",
    domain: "fraud",
    keyType: "caseId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete,compact",
    eosTier: 2,
    dlqTopic: "dlq.fraud.events.fraud_case_opened",
  },
  {
    name: "fraud.events.fraud_case_resolved",
    label: "Fraud Case Resolved",
    domain: "fraud",
    keyType: "caseId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: NINETY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete,compact",
    eosTier: 2,
    dlqTopic: "dlq.fraud.events.fraud_case_resolved",
  },
];

// ── Compliance Events ─────────────────────────────────────────────────────────

export const complianceTopics: TopicConfig[] = [
  {
    name: "compliance.events.compliance_screening_requested",
    label: "Compliance Screening Requested",
    domain: "compliance",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.compliance.events.compliance_screening_requested",
  },
  {
    name: "compliance.events.compliance_screening_completed",
    label: "Compliance Screening Completed",
    domain: "compliance",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.compliance.events.compliance_screening_completed",
  },
  {
    name: "compliance.events.compliance_kyc_submitted",
    label: "KYC Submitted",
    domain: "compliance",
    keyType: "userId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.compliance.events.compliance_kyc_submitted",
  },
  {
    name: "compliance.events.compliance_kyc_verified",
    label: "KYC Verified",
    domain: "compliance",
    keyType: "userId",
    partitions: 8,
    replicationFactor: 3,
    retentionMs: NINETY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "compact",
    eosTier: 2,
    dlqTopic: "dlq.compliance.events.compliance_kyc_verified",
  },
  {
    name: "compliance.events.compliance_kyc_rejected",
    label: "KYC Rejected",
    domain: "compliance",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 2,
    dlqTopic: "dlq.compliance.events.compliance_kyc_rejected",
  },
];

// ── Notification Events ───────────────────────────────────────────────────────

export const notificationTopics: TopicConfig[] = [
  {
    name: "notification.events.notification_email_sent",
    label: "Email Notification Sent",
    domain: "notification",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 3,
    dlqTopic: "dlq.notification.events.notification_email_sent",
  },
  {
    name: "notification.events.notification_push_sent",
    label: "Push Notification Sent",
    domain: "notification",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 3,
    dlqTopic: "dlq.notification.events.notification_push_sent",
  },
  {
    name: "notification.events.notification_sms_sent",
    label: "SMS Notification Sent",
    domain: "notification",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: SEVEN_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 3,
    dlqTopic: "dlq.notification.events.notification_sms_sent",
  },
  {
    name: "notification.events.notification_in_app",
    label: "In-App Notification",
    domain: "notification",
    keyType: "userId",
    partitions: 6,
    replicationFactor: 3,
    retentionMs: THIRTY_DAYS,
    retentionBytes: ONE_GB,
    compaction: "delete",
    eosTier: 3,
    dlqTopic: "dlq.notification.events.notification_in_app",
  },
];

// ── Audit Events ──────────────────────────────────────────────────────────────

export const auditTopics: TopicConfig[] = [
  {
    name: "audit.events.audit_action_logged",
    label: "Audit Action Logged",
    domain: "audit",
    keyType: "userId",
    partitions: 12,
    replicationFactor: 3,
    retentionMs: NINETY_DAYS,
    retentionBytes: UNLIMITED,
    compaction: "delete",
    eosTier: 3,
    dlqTopic: "dlq.audit.events.audit_action_logged",
  },
];

// ─── Aggregated Indexes ───────────────────────────────────────────────────────

/** All topic configs across every domain */
export const ALL_TOPICS: TopicConfig[] = [
  ...paymentTopics,
  ...walletTopics,
  ...escrowTopics,
  ...trustTopics,
  ...fraudTopics,
  ...complianceTopics,
  ...notificationTopics,
  ...auditTopics,
];

/** All topic names as a flat string array */
export const ALL_TOPIC_NAMES: string[] = ALL_TOPICS.map((t) => t.name);

/** All DLQ topic names */
export const ALL_DLQ_TOPIC_NAMES: string[] = ALL_TOPICS.map((t) => t.dlqTopic);

/** Map from topic name → config for O(1) lookups */
export const TOPIC_CONFIG_MAP: Record<string, TopicConfig> = Object.fromEntries(
  ALL_TOPICS.map((t) => [t.name, t]),
);

/** Get DLQ topic name for a given source topic */
export function getDlqTopic(sourceTopic: string): string {
  return `dlq.${sourceTopic}`;
}

/** Get all topics for a given domain */
export function getTopicsByDomain(domain: TopicDomain): TopicConfig[] {
  return ALL_TOPICS.filter((t) => t.domain === domain);
}

/** Export domain type for use in other modules */
export type { TopicConfig as TopicConfiguration };
