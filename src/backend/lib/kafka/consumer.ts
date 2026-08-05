/**
 * Kafka Consumer Framework
 *
 * Provides a structured way to create and manage Kafka consumers:
 *  - createConsumer() for individual consumers
 *  - Auto-commit every 5 seconds (configurable)
 *  - Manual commit via callback
 *  - Graceful shutdown on SIGTERM
 *  - startAllConsumers() / stopAllConsumers() lifecycle
 */

import type { EachMessagePayload, Consumer as KafkaConsumer, TopicPartitionOffsetAndMetadata } from 'kafkajs'
import { getKafkaConsumer, isKafkaAvailable } from './kafka-manager'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConsumerMessage {
  topic: string
  partition: number
  offset: string
  key: string | null | Buffer
  value: string | Buffer | null
  headers: Record<string, string | Buffer>
  timestamp: string
}

export interface ConsumerHandler {
  (msg: ConsumerMessage, commit: () => Promise<void>): void | Promise<void>
}

export interface ConsumerOptions {
  /** Auto-commit interval in ms. Default: 5000. Set 0 to disable (manual only). */
  autoCommitIntervalMs?: number
  /** Maximum number of messages to process concurrently per partition. Default: 1. */
  maxMessagesPerPartition?: number
  /** From beginning or latest. Default: true (from committed). */
  fromBeginning?: boolean
}

interface ManagedConsumer {
  id: string
  groupId: string
  topics: string[]
  consumer: KafkaConsumer
  running: boolean
}

// ── State ────────────────────────────────────────────────────────────────────

let consumerCounter = 0
const managedConsumers: ManagedConsumer[] = []
let shutdownRegistered = false

// ── Parse Helper ─────────────────────────────────────────────────────────────

function toConsumerMessage(payload: EachMessagePayload): ConsumerMessage {
  const { topic, partition, message } = payload
  return {
    topic,
    partition,
    offset: message.offset,
    key: message.key,
    value: message.value,
    headers: (message.headers as Record<string, string | Buffer>) ?? {},
    timestamp: message.timestamp,
  }
}

// ── createConsumer ───────────────────────────────────────────────────────────

/**
 * Create and register a Kafka consumer.
 * The consumer is not started automatically — call `startAllConsumers()`.
 *
 * @param config - Consumer configuration
 * @returns Consumer ID (string) for tracking
 */
export function createConsumer(config: {
  groupId: string
  topics: string[]
  handler: ConsumerHandler
  options?: ConsumerOptions
}): string {
  const id = `kafka-consumer-${++consumerCounter}`
  const {
    autoCommitIntervalMs = 5000,
    fromBeginning = true,
  } = config.options ?? {}

  // Defer actual consumer creation to startAllConsumers
  // Store config for lazy init
  pendingConsumerConfigs.set(id, {
    ...config,
    id,
    autoCommitIntervalMs,
    fromBeginning,
  })

  return id
}

// Store pending configs until startAllConsumers is called
interface PendingConfig {
  id: string
  groupId: string
  topics: string[]
  handler: ConsumerHandler
  autoCommitIntervalMs: number
  fromBeginning: boolean
}

const pendingConsumerConfigs = new Map<string, PendingConfig>()

// ── startAllConsumers ────────────────────────────────────────────────────────

/**
 * Start all registered consumers.
 * Should be called once during application startup.
 */
export async function startAllConsumers(): Promise<void> {
  if (!isKafkaAvailable()) {
    console.log('[KafkaConsumer] Kafka not available — consumers will run in no-op mode')
    return
  }

  for (const [id, cfg] of pendingConsumerConfigs) {
    try {
      await startSingleConsumer(cfg)
      pendingConsumerConfigs.delete(id)
    } catch (err) {
      console.error(`[KafkaConsumer] Failed to start consumer ${id}:`, (err as Error).message)
    }
  }

  console.log(`[KafkaConsumer] ${managedConsumers.length} consumer(s) running`)
}

async function startSingleConsumer(cfg: PendingConfig): Promise<void> {
  const consumer = await getKafkaConsumer(cfg.groupId)
  if (!consumer) {
    console.warn(`[KafkaConsumer] Cannot create consumer for group ${cfg.groupId} — Kafka unavailable`)
    return
  }

  const managed: ManagedConsumer = {
    id: cfg.id,
    groupId: cfg.groupId,
    topics: cfg.topics,
    consumer,
    running: false,
  }

  // Set up auto-commit timer
  let autoCommitTimer: ReturnType<typeof setInterval> | null = null
  if (cfg.autoCommitIntervalMs > 0) {
    autoCommitTimer = setInterval(() => {
      if (!managed.running) return
      consumer.commitOffsets([]).catch((err: Error) => {
        console.warn(`[KafkaConsumer:${cfg.id}] Auto-commit failed:`, err.message)
      })
    }, cfg.autoCommitIntervalMs)
    if (autoCommitTimer.unref) autoCommitTimer.unref()
  }

  // Subscribe
  await consumer.subscribe({
    topics: cfg.topics,
    fromBeginning: cfg.fromBeginning,
  })

  // Run consumer loop
  managed.running = true
  managedConsumers.push(managed)

  // Store timer reference for cleanup
  ;(managed as unknown as Record<string, unknown>).__autoCommitTimer = autoCommitTimer

  // Run the consumer — this is a long-running promise
  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const msg = toConsumerMessage(payload)
      const commit = async () => {
        const offsets: TopicPartitionOffsetAndMetadata[] = [{
          topic: payload.topic,
          partition: payload.partition,
          offset: (parseInt(payload.message.offset, 10) + 1).toString(),
        }]
        await consumer.commitOffsets(offsets)
      }

      try {
        await cfg.handler(msg, commit)
      } catch (err) {
        console.error(
          `[KafkaConsumer:${cfg.id}] Handler error on ${payload.topic}[${payload.partition}]:`,
          (err as Error).message,
        )
        // Don't rethrow — let the consumer continue processing
      }
    },
  }).catch((err: Error) => {
    // Consumer.run() rejects if the consumer disconnects
    console.error(`[KafkaConsumer:${cfg.id}] Consumer stopped:`, err.message)
    managed.running = false
  })
}

// ── stopAllConsumers ─────────────────────────────────────────────────────────

/**
 * Stop all running consumers gracefully.
 */
export async function stopAllConsumers(): Promise<void> {
  console.log(`[KafkaConsumer] Stopping ${managedConsumers.length} consumer(s)...`)

  const promises = managedConsumers.map(async (mc) => {
    // Clear auto-commit timer
    const timer = (mc as unknown as Record<string, unknown>).__autoCommitTimer as
      | ReturnType<typeof setInterval>
      | undefined
    if (timer) clearInterval(timer)

    try {
      await mc.consumer.stop()
      await mc.consumer.disconnect()
    } catch {
      // ignore
    }
    mc.running = false
  })

  await Promise.all(promises)
  managedConsumers.length = 0
  console.log('[KafkaConsumer] All consumers stopped')
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────

function registerShutdown(): void {
  if (shutdownRegistered) return
  shutdownRegistered = true

  const handler = async () => {
    await stopAllConsumers()
  }

  process.on('SIGTERM', handler)
  process.on('SIGINT', handler)
  process.on('beforeExit', handler)
}

registerShutdown()
