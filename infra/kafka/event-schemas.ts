/**
 * Youngsend Kafka Event Schemas
 *
 * Strict Zod schemas for every event type. Each event includes:
 * - eventId: UUID v4 — unique identifier for this event
 * - eventType: String discriminator matching the topic event type
 * - timestamp: ISO 8601 datetime of event creation
 * - version: Semantic version of the event schema (e.g. "1.0.0")
 * - correlationId: UUID linking all events in a single business transaction
 * - causationId: UUID linking this event to the parent event that triggered it
 * - sourceService: Name of the producing microservice
 * - payload: Domain-specific data (strictly typed per event type)
 * - metadata: Optional key-value pairs for tracing, feature flags, etc.
 */

import { z } from "zod";

// ─── Base Event Envelope ───────────────────────────────────────────────────────

export const EventMetadataSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .default({});

export const BaseEventSchema = z.object({
  /** UUID v4 — globally unique event identifier */
  eventId: z.string().uuid(),
  /** Discriminator matching the event type (e.g. "payment_initiated") */
  eventType: z.string(),
  /** ISO 8601 datetime string */
  timestamp: z.string().datetime({ offset: true }),
  /** Semantic version of this event schema */
  version: z.string(),
  /** Links all events belonging to the same business transaction */
  correlationId: z.string().uuid(),
  /** Links this event to the parent event that caused it */
  causationId: z.string().uuid().optional().default("00000000-0000-0000-0000-000000000000"),
  /** Name of the originating microservice */
  sourceService: z.string(),
  /** Domain-specific payload */
  payload: z.unknown(),
  /** Optional metadata for tracing, feature flags, etc. */
  metadata: EventMetadataSchema,
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// ─── Payment Event Payloads ─────────────────────────────────────────────────────

export const PaymentInitiatedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  payeeId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.enum(["card", "bank_transfer", "mobile_money", "wallet", "payment_link"]),
  provider: z.enum(["paystack", "stripe", "flutterwave", "intasend", "paya"]),
  description: z.string().optional(),
  reference: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PaymentProcessingPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  providerReference: z.string().optional(),
  status: z.enum(["authorized", "pending_verification", "processing"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PaymentCompletedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  fee: z.number().nonnegative(),
  netAmount: z.number().positive(),
  provider: z.enum(["paystack", "stripe", "flutterwave", "intasend", "paya"]),
  providerPaymentId: z.string().optional(),
  settledAt: z.string().datetime({ offset: true }).optional(),
});

export const PaymentFailedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  provider: z.enum(["paystack", "stripe", "flutterwave", "intasend", "paya"]),
  errorCode: z.string(),
  errorMessage: z.string(),
  retryable: z.boolean(),
});

export const PaymentRefundedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid(),
  refundId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  reason: z.string().optional(),
  initiatedBy: z.string().uuid(),
  providerRefundId: z.string().optional(),
});

// ─── Full Payment Events ──────────────────────────────────────────────────────

export const PaymentInitiatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment_initiated"),
  payload: PaymentInitiatedPayloadSchema,
});

export const PaymentProcessingEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment_processing"),
  payload: PaymentProcessingPayloadSchema,
});

export const PaymentCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment_completed"),
  payload: PaymentCompletedPayloadSchema,
});

export const PaymentFailedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment_failed"),
  payload: PaymentFailedPayloadSchema,
});

export const PaymentRefundedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment_refunded"),
  payload: PaymentRefundedPayloadSchema,
});

export const AnyPaymentEventSchema = z.discriminatedUnion("eventType", [
  PaymentInitiatedEventSchema,
  PaymentProcessingEventSchema,
  PaymentCompletedEventSchema,
  PaymentFailedEventSchema,
  PaymentRefundedEventSchema,
]);

// ─── Wallet Event Payloads ────────────────────────────────────────────────────

export const WalletDepositedPayloadSchema = z.object({
  walletId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  source: z.enum(["payment", "transfer", "deposit", "refund"]),
  referenceId: z.string().uuid().optional(),
});

export const WalletWithdrawnPayloadSchema = z.object({
  walletId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  destination: z.enum(["bank_account", "mobile_money", "external_wallet"]),
  withdrawalId: z.string().uuid(),
});

export const WalletConvertedPayloadSchema = z.object({
  walletId: z.string().uuid(),
  userId: z.string().uuid(),
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  fromAmount: z.number().positive(),
  toAmount: z.number().positive(),
  exchangeRate: z.number().positive(),
  providerRate: z.string().optional(),
});

export const WalletFrozenPayloadSchema = z.object({
  walletId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.enum(["fraud_investigation", "compliance_hold", "user_request", "admin_action"]),
  frozenBy: z.string().uuid(),
  note: z.string().optional(),
});

export const WalletUnfrozenPayloadSchema = z.object({
  walletId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.enum(["fraud_cleared", "compliance_released", "user_request", "admin_action"]),
  unfrozenBy: z.string().uuid(),
  note: z.string().optional(),
});

// ─── Full Wallet Events ───────────────────────────────────────────────────────

export const WalletDepositedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("wallet_deposited"),
  payload: WalletDepositedPayloadSchema,
});

export const WalletWithdrawnEventSchema = BaseEventSchema.extend({
  eventType: z.literal("wallet_withdrawn"),
  payload: WalletWithdrawnPayloadSchema,
});

export const WalletConvertedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("wallet_converted"),
  payload: WalletConvertedPayloadSchema,
});

export const WalletFrozenEventSchema = BaseEventSchema.extend({
  eventType: z.literal("wallet_frozen"),
  payload: WalletFrozenPayloadSchema,
});

export const WalletUnfrozenEventSchema = BaseEventSchema.extend({
  eventType: z.literal("wallet_unfrozen"),
  payload: WalletUnfrozenPayloadSchema,
});

export const AnyWalletEventSchema = z.discriminatedUnion("eventType", [
  WalletDepositedEventSchema,
  WalletWithdrawnEventSchema,
  WalletConvertedEventSchema,
  WalletFrozenEventSchema,
  WalletUnfrozenEventSchema,
]);

// ─── Escrow Event Payloads ─────────────────────────────────────────────────────

export const EscrowCreatedPayloadSchema = z.object({
  escrowId: z.string().uuid(),
  transactionId: z.string().uuid(),
  sellerId: z.string().uuid(),
  buyerId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string(),
  conditions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime({ offset: true }),
});

export const EscrowFundedPayloadSchema = z.object({
  escrowId: z.string().uuid(),
  transactionId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentId: z.string().uuid(),
  fundedBy: z.string().uuid(),
});

export const EscrowReleasedPayloadSchema = z.object({
  escrowId: z.string().uuid(),
  transactionId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  releasedTo: z.string().uuid(),
  releasedBy: z.string().uuid(),
  walletCreditId: z.string().uuid().optional(),
});

export const EscrowDisputedPayloadSchema = z.object({
  escrowId: z.string().uuid(),
  transactionId: z.string().uuid(),
  disputedBy: z.string().uuid(),
  disputeReason: z.string(),
  evidence: z.array(z.string()).optional(),
  disputeId: z.string().uuid(),
});

export const EscrowCancelledPayloadSchema = z.object({
  escrowId: z.string().uuid(),
  transactionId: z.string().uuid(),
  cancelledBy: z.string().uuid(),
  reason: z.string(),
  refundAmount: z.number().positive(),
  currency: z.string().length(3),
  refundedTo: z.string().uuid(),
});

// ─── Full Escrow Events ───────────────────────────────────────────────────────

export const EscrowCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("escrow_created"),
  payload: EscrowCreatedPayloadSchema,
});

export const EscrowFundedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("escrow_funded"),
  payload: EscrowFundedPayloadSchema,
});

export const EscrowReleasedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("escrow_released"),
  payload: EscrowReleasedPayloadSchema,
});

export const EscrowDisputedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("escrow_disputed"),
  payload: EscrowDisputedPayloadSchema,
});

export const EscrowCancelledEventSchema = BaseEventSchema.extend({
  eventType: z.literal("escrow_cancelled"),
  payload: EscrowCancelledPayloadSchema,
});

export const AnyEscrowEventSchema = z.discriminatedUnion("eventType", [
  EscrowCreatedEventSchema,
  EscrowFundedEventSchema,
  EscrowReleasedEventSchema,
  EscrowDisputedEventSchema,
  EscrowCancelledEventSchema,
]);

// ─── Trust Event Payloads ─────────────────────────────────────────────────────

export const TrustScoreUpdatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  scoreBefore: z.number().min(0).max(100),
  scoreAfter: z.number().min(0).max(100),
  factors: z.array(
    z.object({
      factor: z.string(),
      weight: z.number(),
      value: z.number(),
    }),
  ),
  calculatedBy: z.enum(["system", "admin"]),
});

export const TrustReviewSubmittedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  transactionId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const TrustRelationshipCreatedPayloadSchema = z.object({
  relationshipId: z.string().uuid(),
  userId: z.string().uuid(),
  counterpartyId: z.string().uuid(),
  type: z.enum(["buyer", "seller", "peer", "business"]),
  trustLevel: z.enum(["new", "verified", "trusted", "vip"]),
  initiatedBy: z.string().uuid(),
});

export const TrustVerificationCompletedPayloadSchema = z.object({
  userId: z.string().uuid(),
  verificationType: z.enum(["identity", "phone", "email", "business", "address"]),
  status: z.enum(["passed", "failed", "expired"]),
  verifiedBy: z.string().optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

// ─── Full Trust Events ────────────────────────────────────────────────────────

export const TrustScoreUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("trust_score_updated"),
  payload: TrustScoreUpdatedPayloadSchema,
});

export const TrustReviewSubmittedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("trust_review_submitted"),
  payload: TrustReviewSubmittedPayloadSchema,
});

export const TrustRelationshipCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("trust_relationship_created"),
  payload: TrustRelationshipCreatedPayloadSchema,
});

export const TrustVerificationCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("trust_verification_completed"),
  payload: TrustVerificationCompletedPayloadSchema,
});

export const AnyTrustEventSchema = z.discriminatedUnion("eventType", [
  TrustScoreUpdatedEventSchema,
  TrustReviewSubmittedEventSchema,
  TrustRelationshipCreatedEventSchema,
  TrustVerificationCompletedEventSchema,
]);

// ─── Fraud Event Payloads ──────────────────────────────────────────────────────

export const FraudAlertTriggeredPayloadSchema = z.object({
  alertId: z.string().uuid(),
  userId: z.string().uuid(),
  alertType: z.enum(["velocity", "amount", "location", "device", "behavior", "sanction"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  triggeringEventId: z.string().uuid(),
  autoBlock: z.boolean().default(false),
});

export const FraudRuleMatchedPayloadSchema = z.object({
  alertId: z.string().uuid(),
  ruleId: z.string().uuid(),
  ruleName: z.string(),
  userId: z.string().uuid(),
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    }),
  ),
  triggeredAt: z.string().datetime({ offset: true }),
});

export const FraudCaseOpenedPayloadSchema = z.object({
  caseId: z.string().uuid(),
  alertIds: z.array(z.string().uuid()),
  userId: z.string().uuid(),
  status: z.enum(["open", "under_review", "escalated"]),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
});

export const FraudCaseResolvedPayloadSchema = z.object({
  caseId: z.string().uuid(),
  userId: z.string().uuid(),
  resolution: z.enum(["dismissed", "confirmed_fraud", "confirmed_legitimate", "escalated"]),
  resolvedBy: z.string().uuid(),
  actionsTaken: z.array(z.string()),
  sanctionsApplied: z.array(z.string()).optional(),
  note: z.string().optional(),
});

// ─── Full Fraud Events ─────────────────────────────────────────────────────────

export const FraudAlertTriggeredEventSchema = BaseEventSchema.extend({
  eventType: z.literal("fraud_alert_triggered"),
  payload: FraudAlertTriggeredPayloadSchema,
});

export const FraudRuleMatchedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("fraud_rule_matched"),
  payload: FraudRuleMatchedPayloadSchema,
});

export const FraudCaseOpenedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("fraud_case_opened"),
  payload: FraudCaseOpenedPayloadSchema,
});

export const FraudCaseResolvedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("fraud_case_resolved"),
  payload: FraudCaseResolvedPayloadSchema,
});

export const AnyFraudEventSchema = z.discriminatedUnion("eventType", [
  FraudAlertTriggeredEventSchema,
  FraudRuleMatchedEventSchema,
  FraudCaseOpenedEventSchema,
  FraudCaseResolvedEventSchema,
]);

// ─── Compliance Event Payloads ─────────────────────────────────────────────────

export const ComplianceScreeningRequestedPayloadSchema = z.object({
  userId: z.string().uuid(),
  screeningType: z.enum(["sanction", "pep", "aml", "adverse_media"]),
  screeningProvider: z.string().optional(),
  trigger: z.enum(["user_registration", "transaction", "periodic", "manual"]),
});

export const ComplianceScreeningCompletedPayloadSchema = z.object({
  userId: z.string().uuid(),
  screeningType: z.enum(["sanction", "pep", "aml", "adverse_media"]),
  result: z.enum(["clear", "potential_match", "confirmed_match"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  screeningProvider: z.string(),
  externalReference: z.string().optional(),
  details: z.string().optional(),
});

export const ComplianceKycSubmittedPayloadSchema = z.object({
  userId: z.string().uuid(),
  kycType: z.enum(["individual", "business"]),
  documents: z.array(
    z.object({
      type: z.enum([
        "passport",
        "national_id",
        "drivers_license",
        "utility_bill",
        "business_registration",
        "tax_certificate",
        "bank_statement",
      ]),
      status: z.enum(["pending", "uploaded", "processing"]),
    }),
  ),
  submittedAt: z.string().datetime({ offset: true }),
});

export const ComplianceKycVerifiedPayloadSchema = z.object({
  userId: z.string().uuid(),
  kycLevel: z.enum(["basic", "intermediate", "advanced"]),
  verifiedFields: z.array(z.string()),
  verifiedBy: z.string().optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const ComplianceKycRejectedPayloadSchema = z.object({
  userId: z.string().uuid(),
  reasons: z.array(z.string()),
  rejectedBy: z.string().optional(),
  canResubmit: z.boolean().default(true),
  resubmitInstructions: z.string().optional(),
});

// ─── Full Compliance Events ────────────────────────────────────────────────────

export const ComplianceScreeningRequestedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("compliance_screening_requested"),
  payload: ComplianceScreeningRequestedPayloadSchema,
});

export const ComplianceScreeningCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("compliance_screening_completed"),
  payload: ComplianceScreeningCompletedPayloadSchema,
});

export const ComplianceKycSubmittedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("compliance_kyc_submitted"),
  payload: ComplianceKycSubmittedPayloadSchema,
});

export const ComplianceKycVerifiedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("compliance_kyc_verified"),
  payload: ComplianceKycVerifiedPayloadSchema,
});

export const ComplianceKycRejectedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("compliance_kyc_rejected"),
  payload: ComplianceKycRejectedPayloadSchema,
});

export const AnyComplianceEventSchema = z.discriminatedUnion("eventType", [
  ComplianceScreeningRequestedEventSchema,
  ComplianceScreeningCompletedEventSchema,
  ComplianceKycSubmittedEventSchema,
  ComplianceKycVerifiedEventSchema,
  ComplianceKycRejectedEventSchema,
]);

// ─── Notification Event Payloads ───────────────────────────────────────────────

export const NotificationEmailSentPayloadSchema = z.object({
  userId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string(),
  templateId: z.string().optional(),
  templateVariables: z.record(z.string(), z.unknown()).optional(),
  notificationId: z.string().uuid(),
  status: z.enum(["sent", "delivered", "bounced", "failed"]),
  providerMessageId: z.string().optional(),
});

export const NotificationPushSentPayloadSchema = z.object({
  userId: z.string().uuid(),
  deviceToken: z.string(),
  title: z.string(),
  body: z.string(),
  notificationId: z.string().uuid(),
  status: z.enum(["sent", "delivered", "failed"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const NotificationSmsSentPayloadSchema = z.object({
  userId: z.string().uuid(),
  phoneNumber: z.string(),
  message: z.string(),
  notificationId: z.string().uuid(),
  status: z.enum(["sent", "delivered", "failed"]),
  providerMessageId: z.string().optional(),
});

export const NotificationInAppPayloadSchema = z.object({
  userId: z.string().uuid(),
  notificationId: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  category: z.enum(["payment", "escrow", "wallet", "trust", "fraud", "compliance", "system"]),
  actionUrl: z.string().optional(),
  read: z.boolean().default(false),
};

// ─── Full Notification Events ──────────────────────────────────────────────────

export const NotificationEmailSentEventSchema = BaseEventSchema.extend({
  eventType: z.literal("notification_email_sent"),
  payload: NotificationEmailSentPayloadSchema,
});

export const NotificationPushSentEventSchema = BaseEventSchema.extend({
  eventType: z.literal("notification_push_sent"),
  payload: NotificationPushSentPayloadSchema,
});

export const NotificationSmsSentEventSchema = BaseEventSchema.extend({
  eventType: z.literal("notification_sms_sent"),
  payload: NotificationSmsSentPayloadSchema,
});

export const NotificationInAppEventSchema = BaseEventSchema.extend({
  eventType: z.literal("notification_in_app"),
  payload: NotificationInAppPayloadSchema,
});

export const AnyNotificationEventSchema = z.discriminatedUnion("eventType", [
  NotificationEmailSentEventSchema,
  NotificationPushSentEventSchema,
  NotificationSmsSentEventSchema,
  NotificationInAppEventSchema,
]);

// ─── Audit Event Payloads ──────────────────────────────────────────────────────

export const AuditActionLoggedPayloadSchema = z.object({
  userId: z.string().uuid(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
  previousState: z.record(z.string(), z.unknown()).optional(),
  newState: z.record(z.string(), z.unknown()).optional(),
});

export const AuditActionLoggedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("audit_action_logged"),
  payload: AuditActionLoggedPayloadSchema,
});

// ─── DLQ Envelope ──────────────────────────────────────────────────────────────

export const DeadLetterEnvelopeSchema = z.object({
  /** The DLQ entry ID */
  dlqEntryId: z.string().uuid(),
  /** Original topic where the message was published */
  originalTopic: z.string(),
  /** Original partition */
  originalPartition: z.number(),
  /** Original offset */
  originalOffset: z.number(),
  /** The original event (or raw message if parsing failed) */
  originalMessage: z.unknown(),
  /** Error information */
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }),
  /** Timestamps of each failed attempt */
  failureAttempts: z.array(
    z.object({
      attempt: z.number(),
      timestamp: z.string().datetime({ offset: true }),
      error: z.string(),
    }),
  ),
  /** When this DLQ entry was created */
  enqueuedAt: z.string().datetime({ offset: true }),
  /** Correlation ID from original message, if available */
  correlationId: z.string().uuid().optional(),
});

export type DeadLetterEnvelope = z.infer<typeof DeadLetterEnvelopeSchema>;

// ─── Super Union: Any Event ────────────────────────────────────────────────────

export const AnyYoungsendEventSchema = z.union([
  AnyPaymentEventSchema,
  AnyWalletEventSchema,
  AnyEscrowEventSchema,
  AnyTrustEventSchema,
  AnyFraudEventSchema,
  AnyComplianceEventSchema,
  AnyNotificationEventSchema,
  AuditActionLoggedEventSchema,
]);

export type AnyYoungsendEvent = z.infer<typeof AnyYoungsendEventSchema>;

// ─── Validation Helpers ────────────────────────────────────────────────────────

/**
 * Parse and validate a raw event against a specific schema.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function parseEvent<T>(schema: z.ZodSchema<T>, raw: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Parse an event against its eventType discriminator.
 * Routes to the correct schema based on the eventType field.
 */
export function parseEventByType(raw: unknown): {
  success: boolean;
  data?: AnyYoungsendEvent;
  errors?: z.ZodError;
} {
  return parseEvent(AnyYoungsendEventSchema, raw);
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

// Type exports for all payloads
export type PaymentInitiatedPayload = z.infer<typeof PaymentInitiatedPayloadSchema>;
export type PaymentProcessingPayload = z.infer<typeof PaymentProcessingPayloadSchema>;
export type PaymentCompletedPayload = z.infer<typeof PaymentCompletedPayloadSchema>;
export type PaymentFailedPayload = z.infer<typeof PaymentFailedPayloadSchema>;
export type PaymentRefundedPayload = z.infer<typeof PaymentRefundedPayloadSchema>;

export type WalletDepositedPayload = z.infer<typeof WalletDepositedPayloadSchema>;
export type WalletWithdrawnPayload = z.infer<typeof WalletWithdrawnPayloadSchema>;
export type WalletConvertedPayload = z.infer<typeof WalletConvertedPayloadSchema>;
export type WalletFrozenPayload = z.infer<typeof WalletFrozenPayloadSchema>;
export type WalletUnfrozenPayload = z.infer<typeof WalletUnfrozenPayloadSchema>;

export type EscrowCreatedPayload = z.infer<typeof EscrowCreatedPayloadSchema>;
export type EscrowFundedPayload = z.infer<typeof EscrowFundedPayloadSchema>;
export type EscrowReleasedPayload = z.infer<typeof EscrowReleasedPayloadSchema>;
export type EscrowDisputedPayload = z.infer<typeof EscrowDisputedPayloadSchema>;
export type EscrowCancelledPayload = z.infer<typeof EscrowCancelledPayloadSchema>;

export type TrustScoreUpdatedPayload = z.infer<typeof TrustScoreUpdatedPayloadSchema>;
export type TrustReviewSubmittedPayload = z.infer<typeof TrustReviewSubmittedPayloadSchema>;
export type TrustRelationshipCreatedPayload = z.infer<typeof TrustRelationshipCreatedPayloadSchema>;
export type TrustVerificationCompletedPayload = z.infer<typeof TrustVerificationCompletedPayloadSchema>;

export type FraudAlertTriggeredPayload = z.infer<typeof FraudAlertTriggeredPayloadSchema>;
export type FraudRuleMatchedPayload = z.infer<typeof FraudRuleMatchedPayloadSchema>;
export type FraudCaseOpenedPayload = z.infer<typeof FraudCaseOpenedPayloadSchema>;
export type FraudCaseResolvedPayload = z.infer<typeof FraudCaseResolvedPayloadSchema>;

export type ComplianceScreeningRequestedPayload = z.infer<typeof ComplianceScreeningRequestedPayloadSchema>;
export type ComplianceScreeningCompletedPayload = z.infer<typeof ComplianceScreeningCompletedPayloadSchema>;
export type ComplianceKycSubmittedPayload = z.infer<typeof ComplianceKycSubmittedPayloadSchema>;
export type ComplianceKycVerifiedPayload = z.infer<typeof ComplianceKycVerifiedPayloadSchema>;
export type ComplianceKycRejectedPayload = z.infer<typeof ComplianceKycRejectedPayloadSchema>;

export type NotificationEmailSentPayload = z.infer<typeof NotificationEmailSentPayloadSchema>;
export type NotificationPushSentPayload = z.infer<typeof NotificationPushSentPayloadSchema>;
export type NotificationSmsSentPayload = z.infer<typeof NotificationSmsSentPayloadSchema>;
export type NotificationInAppPayload = z.infer<typeof NotificationInAppPayloadSchema>;

export type AuditActionLoggedPayload = z.infer<typeof AuditActionLoggedPayloadSchema>;
