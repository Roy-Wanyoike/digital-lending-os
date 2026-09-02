// Lightweight event publisher that lazily loads Kafka producer
// Falls back to console.log when Kafka is not available (dev mode)

import { send } from './kafka/producer'

interface PublishEventParams {
  topic: string
  key: string
  event: Record<string, unknown>
  partitionKey?: string
}

export async function publishEvent(params: PublishEventParams): Promise<void> {
  try {
    // Retain for dev debugging
    console.log(`[Event] ${params.topic}: ${params.key}`, params.event)

    // Wired to real Kafka when KAFKA_BROKERS env var is set.
    // The producer internally checks isKafkaAvailable() and falls back
    // to a no-op log when Kafka is not configured, so this is safe to
    // call in all environments.
    try {
      await send(params.topic, params.key, params.event)
    } catch (kafkaErr) {
      // Graceful degradation — log but never throw from Kafka failures
      console.error(`[Event] Kafka publish failed for ${params.topic}:`, kafkaErr)
    }
  } catch (e) {
    // Never let event publishing break the business operation
    console.error(`[Event] Failed to publish to ${params.topic}:`, e)
  }
}
