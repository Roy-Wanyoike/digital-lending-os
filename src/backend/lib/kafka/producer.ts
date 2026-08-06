/**
 * Kafka Producer Adapter
 *
 * High-level producer with:
 *  - JSON serialization
 *  - Automatic retry on transient errors (3 retries)
 *  - Standard headers (traceId, timestamp, eventType, version)
 *  - Fallback to console.log when Kafka is unavailable
 *  - bridgeToEventBus() to forward EventBus events to Kafka
 */

import type { ProducerRecord, Message } from 'kafkajs'
import { getKafkaProducer, isKafkaAvailable } from './kafka-manager'
import { eventTypeToTopic } from './topics'
import type { RealtimeEvent } from '@/backend/services/event-bus'

// ── Types ────────────────────────────────────────────────────────────────────

export interface KafkaMessageHeaders {
  traceId?: string
  timestamp?: string
  eventType?: string
  version?: string
  [key: string]: string | undefined
}

export interface SendMessageParams {
  topic: string
  key: string // tenant ID or entity ID
  value: Record<string, unknown>
  headers?: KafkaMessageHeaders
}

export interface BatchMessage extends SendMessageParams {
  partition?: number
}

// ── Helper: Generate Event ID ────────────────────────────────────────────────

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// ── Retry Helper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const RETRY_DELAY_BASE_MS = 100

function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('timeout') ||
      msg.includes('not connected') ||
      msg.includes('connection refused') ||
      msg.includes('leader not available') ||
      msg.includes('broker') ||
      msg.includes('network')
    )
  }
  return false
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// ── Build Headers ────────────────────────────────────────────────────────────

function buildHeaders(custom?: KafkaMessageHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ...custom,
  }
  // Remove undefined values
  for (const key of Object.keys(headers)) {
    if (headers[key] === undefined) {
      delete headers[key]
    }
  }
  return headers
}

// ── Producer API ─────────────────────────────────────────────────────────────

/**
 * Send a single message to Kafka.
 * Falls back to console.log when Kafka is unavailable.
 */
export async function send(
  topic: string,
  key: string,
  value: Record<string, unknown>,
  headers?: KafkaMessageHeaders,
): Promise<void> {
  const serializedValue = JSON.stringify(value)
  const builtHeaders = buildHeaders(headers)

  if (!isKafkaAvailable()) {
    console.log(
      `[KafkaProducer:noop] ${topic} key=${key} headers=${JSON.stringify(builtHeaders)} payload=${serializedValue}`,
    )
    return
  }

  try {
    const producer = await getKafkaProducer()
    await withRetry(() =>
      producer.send({
        topic,
        messages: [
          {
            key,
            value: serializedValue,
            headers: builtHeaders,
          },
        ],
      } as ProducerRecord),
    )
  } catch (err) {
    // Fallback to console on failure — never break the caller
    console.error(`[KafkaProducer] Failed to send to ${topic}:`, (err as Error).message)
    console.log(
      `[KafkaProducer:fallback] ${topic} key=${key} payload=${serializedValue}`,
    )
  }
}

/**
 * Send a batch of messages to Kafka.
 * Falls back to console.log when Kafka is unavailable.
 */
export async function sendBatch(messages: BatchMessage[]): Promise<void> {
  if (messages.length === 0) return

  if (!isKafkaAvailable()) {
    for (const msg of messages) {
      const serialized = JSON.stringify(msg.value)
      const builtHeaders = buildHeaders(msg.headers)
      console.log(
        `[KafkaProducer:noop:batch] ${msg.topic} key=${msg.key} headers=${JSON.stringify(builtHeaders)} payload=${serialized}`,
      )
    }
    return
  }

  try {
    const producer = await getKafkaProducer()

    // Group by topic
    const topicMessagesMap = new Map<string, Message[]>()
    for (const msg of messages) {
      const builtHeaders = buildHeaders(msg.headers)
      const kafkaMsg: Message = {
        key: msg.key,
        value: JSON.stringify(msg.value),
        headers: builtHeaders,
      }
      if (msg.partition !== undefined) {
        kafkaMsg.partition = msg.partition
      }
      let arr = topicMessagesMap.get(msg.topic)
      if (!arr) {
        arr = []
        topicMessagesMap.set(msg.topic, arr)
      }
      arr.push(kafkaMsg)
    }

    await withRetry(() =>
      producer.sendBatch({
        topicMessages: Array.from(topicMessagesMap.entries()).map(
          ([topic, msgs]) => ({ topic, messages: msgs }),
        ),
      }),
    )
  } catch (err) {
    console.error('[KafkaProducer] Batch send failed:', (err as Error).message)
    // Fallback: log each message individually
    for (const msg of messages) {
      console.log(
        `[KafkaProducer:fallback:batch] ${msg.topic} key=${msg.key} payload=${JSON.stringify(msg.value)}`,
      )
    }
  }
}

// ── Convenience: Send with auto-wrapped event envelope ───────────────────────

export interface SendEventParams {
  topic: string
  key: string
  eventType: string
  data: Record<string, unknown>
  tenantId?: string
  traceId?: string
}

/**
 * Send a fully-formed event with standard envelope.
 */
export async function sendEvent(params: SendEventParams): Promise<void> {
  const envelope: Record<string, unknown> = {
    eventId: generateEventId(),
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    source: 'youngsend-api',
    tenantId: params.tenantId,
    traceId: params.traceId,
    data: params.data,
  }

  return send(params.topic, params.key, envelope, {
    eventType: params.eventType,
    traceId: params.traceId,
  })
}

// ── EventBus Bridge ──────────────────────────────────────────────────────────

/** Minimal shape of EventBus needed for the bridge */
export interface EventBusLike {
  on<T = unknown>(
    event: string,
    callback: (event: RealtimeEvent<T>) => void,
  ): string
  off(event: string, callback: (event: RealtimeEvent) => void): void
}

/**
 * Bridge the given EventBus to Kafka.
 * Subscribes to the specified event names and forwards each to the
 * appropriate Kafka topic. Returns an unsubscribe function.
 *
 * NOTE: The EventBus does not support wildcards, so callers must
 * enumerate the event names to subscribe to. For a complete solution
 * that auto-discovers events, see event-bridge.ts.
 */
export function bridgeToEventBus(
  bus: EventBusLike,
  eventNames: string[],
): () => void {
  const handler = (realtimeEvent: RealtimeEvent) => {
    const topic = eventTypeToTopic(realtimeEvent.event)
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

  // Subscribe to each event name individually
  for (const name of eventNames) {
    bus.on(name, handler as (e: RealtimeEvent) => void)
  }

  // Return unsubscribe
  return () => {
    for (const name of eventNames) {
      bus.off(name, handler as (e: RealtimeEvent) => void)
    }
  }
}

// ── Exported Object API ──────────────────────────────────────────────────────

export const kafkaProducer = {
  send,
  sendBatch,
  sendEvent,
  bridgeToEventBus,
} as const
