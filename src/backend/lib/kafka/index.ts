/**
 * Kafka Module — Public API
 *
 * Re-exports from all submodules for convenient imports.
 */

// Manager
export {
  getKafkaProducer,
  getKafkaAdmin,
  getKafkaConsumer,
  getKafkaHealth,
  isKafkaAvailable,
  disconnectKafka,
} from './kafka-manager'
export type { KafkaHealthResult } from './kafka-manager'

// Topics & Schemas
export {
  TOPICS,
  TOPIC_CONFIGS,
  eventTypeToTopic,
} from './topics'
export type {
  TopicConfig,
  TopicName,
  BaseKafkaEvent,
  PaymentEvent,
  WalletEvent,
  EscrowEvent,
  FraudEvent,
  ComplianceEvent,
  AuditEvent,
  NotificationEvent,
  AllKafkaEvent,
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  WalletDepositedEvent,
  WalletWithdrawnEvent,
  WalletBalanceLockedEvent,
  WalletBalanceUnlockedEvent,
  EscrowCreatedEvent,
  MilestoneReleasedEvent,
  EscrowCompletedEvent,
  EscrowDisputedEvent,
  FraudAlertEvent,
  FraudReviewEvent,
  ComplianceScreeningEvent,
  ComplianceStatusChangedEvent,
  AuditLogEvent,
  NotificationEvent as NotificationEventType,
} from './topics'

// Producer
export {
  kafkaProducer,
  send,
  sendBatch,
  sendEvent,
  bridgeToEventBus,
} from './producer'
export type {
  KafkaMessageHeaders,
  SendMessageParams,
  BatchMessage,
  SendEventParams,
  EventBusLike,
} from './producer'

// Consumer
export {
  createConsumer,
  startAllConsumers,
  stopAllConsumers,
} from './consumer'
export type {
  ConsumerMessage,
  ConsumerHandler,
  ConsumerOptions,
} from './consumer'

// Event Bridge
export {
  activateBridge,
  deactivateBridge,
  isBridgeActive,
  getBridgedEventNames,
  getTopicForEvent,
  ensureTopics,
} from './event-bridge'
