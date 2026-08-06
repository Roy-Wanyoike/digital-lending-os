/**
 * Event Bridge: EventBus → Kafka
 *
 * Listens to all relevant events from the in-memory EventBus
 * and publishes them to the appropriate Kafka topic.
 * Includes tenant isolation via message keys.
 *
 * Usage:
 *   import { activateBridge, deactivateBridge } from '@/backend/lib/kafka/event-bridge'
 *   activateBridge()
 *   // ... later
 *   deactivateBridge()
 */

import { eventBus, type RealtimeEvent } from '@/backend/services/event-bus'
import { sendEvent } from './producer'
import { eventTypeToTopic } from './topics'

// ── Event Names to Subscribe To ──────────────────────────────────────────────

/**
 * All event names from the EventBus that should be bridged to Kafka.
 * These correspond to the domain prefixes defined in topics.ts.
 */
const BRIDGED_EVENTS: string[] = [
  // Payment
  'payment.created',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'payment.processing',
  'payment.cancelled',
  // Wallet
  'wallet.deposit',
  'wallet.withdrawn',
  'wallet.balance.locked',
  'wallet.balance.unlocked',
  'wallet.created',
  'wallet.updated',
  // Escrow
  'escrow.created',
  'escrow.milestone.released',
  'escrow.completed',
  'escrow.disputed',
  'escrow.cancelled',
  // Fraud
  'fraud.alert',
  'fraud.review',
  'fraud.block',
  // Compliance
  'compliance.screening',
  'compliance.status.changed',
  'compliance.kyc.verified',
  'compliance.kyc.rejected',
  // Audit
  'audit.log',
  'audit.access',
  // Notification
  'notification.send',
  'notification.delivered',
  'notification.failed',
]

// ── Bridge State ─────────────────────────────────────────────────────────────

let isActive = false
let unsubscriber: (() => void) | null = null

// ── Handler ──────────────────────────────────────────────────────────────────

function handleEvent(realtimeEvent: RealtimeEvent): void {
  const topic = eventTypeToTopic(realtimeEvent.event)
  // Use tenantId as the key for partition routing — ensures per-tenant ordering
  const key = realtimeEvent.tenantId || 'system'

  sendEvent({
    topic,
    key,
    eventType: realtimeEvent.event,
    data: realtimeEvent.data as Record<string, unknown>,
    tenantId: realtimeEvent.tenantId,
  }).catch(() => {
    // Errors are already logged inside sendEvent
  })
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Activate the EventBus → Kafka bridge.
 * Subscribes to all known event names on the EventBus.
 * Safe to call multiple times (idempotent).
 */
export function activateBridge(): void {
  if (isActive) return

  const handler = handleEvent as (e: RealtimeEvent) => void

  // Subscribe to each event name on the EventBus
  for (const name of BRIDGED_EVENTS) {
    eventBus.on(name, handler)
  }

  // Create unsubscribe function
  unsubscriber = () => {
    for (const name of BRIDGED_EVENTS) {
      eventBus.off(name, handler)
    }
  }

  isActive = true
  console.log(`[EventBridge] Activated — bridging ${BRIDGED_EVENTS.length} event types to Kafka`)
}

/**
 * Deactivate the EventBus → Kafka bridge.
 * Removes all EventBus subscriptions.
 */
export function deactivateBridge(): void {
  if (!isActive || !unsubscriber) return

  unsubscriber()
  unsubscriber = null
  isActive = false
  console.log('[EventBridge] Deactivated')
}

/**
 * Check if the bridge is currently active.
 */
export function isBridgeActive(): boolean {
  return isActive
}

/**
 * Get the list of event names being bridged.
 */
export function getBridgedEventNames(): string[] {
  return [...BRIDGED_EVENTS]
}

/**
 * Get the topic mapping for a given event type.
 */
export function getTopicForEvent(eventType: string): string {
  return eventTypeToTopic(eventType)
}

/**
 * Ensure all Kafka topics exist. Call during startup.
 * No-op when Kafka is not available.
 */
export async function ensureTopics(): Promise<void> {
  const { getKafkaAdmin } = await import('./kafka-manager')
  const { TOPIC_CONFIGS } = await import('./topics')

  const admin = await getKafkaAdmin()
  if (!admin) {
    console.log('[EventBridge] Kafka not available — skipping topic creation')
    return
  }

  try {
    await admin.createTopics({
      topics: TOPIC_CONFIGS.map((tc) => ({
        topic: tc.topic,
        numPartitions: tc.numPartitions,
        replicationFactor: tc.replicationFactor,
        configEntries: tc.config
          ? Object.entries(tc.config).map(([name, value]) => ({ name, value }))
          : undefined,
      })),
      waitForLeaders: true,
      timeout: 10000,
    })
    console.log(`[EventBridge] Topics ensured: ${TOPIC_CONFIGS.length} topics`)
  } catch (err) {
    console.warn('[EventBridge] Failed to create topics:', (err as Error).message)
  }
}
