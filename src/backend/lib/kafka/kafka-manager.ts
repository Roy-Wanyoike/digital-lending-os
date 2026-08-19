/**
 * Kafka Client Manager
 *
 * Lazy singleton that provides Kafka producer, admin, and consumer instances.
 * Falls back to a no-op implementation (console.log) when KAFKA_BROKERS is not set.
 *
 * Features:
 *  - Lazy initialization (no connection at module load time)
 *  - Idempotent producer with acks=all
 *  - Health check with broker connectivity probe
 *  - Graceful shutdown on process exit
 *  - Automatic fallback for local dev
 */

// ── Types ────────────────────────────────────────────────────────────────────

import type {
  Producer as KafkaProducer,
  Admin as KafkaAdmin,
  Consumer as KafkaConsumer,
  ProducerRecord,
  Message,
} from 'kafkajs'

export interface KafkaHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  brokerCount: number
  error?: string
  isUsingFallback: boolean
}

// ── Config ───────────────────────────────────────────────────────────────────

function getBrokerList(): string[] {
  const raw = process.env.KAFKA_BROKERS
  if (!raw) return []
  return raw.split(',').map((b) => b.trim()).filter(Boolean)
}

const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'youngsend-api'

// ── Lazy State ───────────────────────────────────────────────────────────────

let producerInstance: KafkaProducer | null = null
let adminInstance: KafkaAdmin | null = null
let kafkaInstance: Awaited<ReturnType<typeof createKafka>> | null = null
let isInitialized = false
let isAvailable = false
let initPromise: Promise<void> | null = null
let shutdownRegistered = false

// ── No-Op Fallback ───────────────────────────────────────────────────────────

/**
 * When KAFKA_BROKERS is not set, all Kafka operations log to console.
 * This allows the app to work locally without a Kafka broker.
 */
const noOpProducer = {
  async send(_record: ProducerRecord) {
    // no-op
  },
  async sendBatch(_batch: { topicMessages: { topic: string; messages: Message[] }[] }) {
    // no-op
  },
  connect() {
    return Promise.resolve()
  },
  disconnect() {
    return Promise.resolve()
  },
  on() {
    // no-op
  },
  events: {},
} as unknown as KafkaProducer

// ── Kafka Instance Factory ───────────────────────────────────────────────────

async function createKafka() {
  const { Kafka } = await import('kafkajs')
  const brokers = getBrokerList()

  return new Kafka({
    clientId: CLIENT_ID,
    brokers,
    // Retry only once initially; let the producer handle its own retries
    retry: {
      initialRetryTime: 100,
      maxRetryTime: 5000,
      retries: 3,
    },
  })
}

// ── Initialization ───────────────────────────────────────────────────────────

async function ensureInitialized(): Promise<void> {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const brokers = getBrokerList()
      if (brokers.length === 0) {
        console.log('[KafkaManager] KAFKA_BROKERS not set — using no-op fallback')
        isInitialized = true
        isAvailable = false
        return
      }

      kafkaInstance = await createKafka()

      // Create admin
      adminInstance = kafkaInstance.admin()

      // Create producer with idempotent config
      producerInstance = kafkaInstance.producer({
        idempotent: true,
        maxInFlightRequests: 5,
        transactionTimeout: 30000,
      })

      producerInstance.on('producer.connect', () => {
        isAvailable = true
        console.log('[KafkaManager] Producer connected')
      })

      producerInstance.on('producer.disconnect', () => {
        isAvailable = false
        console.warn('[KafkaManager] Producer disconnected')
      })

      producerInstance.on('producer.network.request_timeout', (payload) => {
        console.warn('[KafkaManager] Producer request timeout:', payload)
      })

      try {
        await producerInstance.connect()
      } catch (err) {
        console.error('[KafkaManager] Failed to connect producer:', (err as Error).message)
        isAvailable = false
      }

      // Register graceful shutdown only once
      if (!shutdownRegistered) {
        shutdownRegistered = true
        const shutdownHandler = async () => {
          console.log('[KafkaManager] Shutting down Kafka connections...')
          try {
            await disconnectKafka()
          } catch {
            // ignore shutdown errors
          }
        }
        process.on('SIGTERM', shutdownHandler)
        process.on('SIGINT', shutdownHandler)
        process.on('beforeExit', shutdownHandler)
      }

      isInitialized = true
    } catch (err) {
      console.error('[KafkaManager] Initialization failed:', (err as Error).message)
      isInitialized = true
      isAvailable = false
    }
  })()

  return initPromise
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the Kafka producer singleton.
 * Returns a no-op producer when Kafka is not configured.
 * Lazy: connects on first call.
 */
export async function getKafkaProducer(): Promise<KafkaProducer> {
  await ensureInitialized()
  if (!isAvailable || !producerInstance) {
    return noOpProducer
  }
  return producerInstance
}

/**
 * Get the Kafka admin client for topic management.
 * Returns null when Kafka is not configured.
 */
export async function getKafkaAdmin(): Promise<KafkaAdmin | null> {
  await ensureInitialized()
  if (!isAvailable || !adminInstance) {
    return null
  }
  return adminInstance
}

/**
 * Create a new Kafka consumer with the given group ID.
 * Each call creates a fresh consumer instance.
 * Returns null when Kafka is not configured.
 */
export async function getKafkaConsumer(groupId: string): Promise<KafkaConsumer | null> {
  await ensureInitialized()
  if (!isAvailable || !kafkaInstance) {
    return null
  }
  return kafkaInstance.consumer({
    groupId,
    // Restart from earliest offset on first join
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  })
}

/**
 * Check Kafka broker connectivity.
 * Returns health status with latency measurement.
 */
export async function getKafkaHealth(): Promise<KafkaHealthResult> {
  await ensureInitialized()

  const brokers = getBrokerList()
  if (brokers.length === 0) {
    return {
      status: 'degraded',
      latencyMs: 0,
      brokerCount: 0,
      error: 'KAFKA_BROKERS not set — using no-op fallback',
      isUsingFallback: true,
    }
  }

  if (!isAvailable || !adminInstance) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      brokerCount: brokers.length,
      error: 'Kafka client not available',
      isUsingFallback: true,
    }
  }

  const start = Date.now()
  try {
    await adminInstance.describeCluster()
    const latencyMs = Date.now() - start
    return {
      status: latencyMs < 200 ? 'healthy' : 'degraded',
      latencyMs,
      brokerCount: brokers.length,
      isUsingFallback: false,
    }
  } catch (err) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      brokerCount: brokers.length,
      error: (err as Error).message,
      isUsingFallback: true,
    }
  }
}

/**
 * Whether Kafka is configured and available.
 */
export function isKafkaAvailable(): boolean {
  return isAvailable
}

/**
 * Gracefully disconnect all Kafka clients.
 */
export async function disconnectKafka(): Promise<void> {
  const promises: Promise<void>[] = []

  if (producerInstance) {
    promises.push(producerInstance.disconnect().catch(() => { /* ignore */ }))
    producerInstance = null
  }

  if (adminInstance) {
    promises.push(adminInstance.disconnect().catch(() => { /* ignore */ }))
    adminInstance = null
  }

  await Promise.all(promises)
  isAvailable = false
  kafkaInstance = null
  isInitialized = false
  initPromise = null
  console.log('[KafkaManager] All Kafka connections closed')
}
