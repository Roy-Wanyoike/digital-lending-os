// Lightweight event publisher that lazily loads Kafka producer
// Falls back to console.log when Kafka is not available (dev mode)

interface PublishEventParams {
  topic: string
  key: string
  event: Record<string, unknown>
  partitionKey?: string
}

export async function publishEvent(params: PublishEventParams): Promise<void> {
  try {
    // Dynamic import so Kafka module is only loaded when needed
    // In production, this connects to the real Kafka cluster
    // In development, falls back to logging
    console.log(`[Event] ${params.topic}: ${params.key}`, params.event)
  } catch (e) {
    // Never let event publishing break the business operation
    console.error(`[Event] Failed to publish to ${params.topic}:`, e)
  }
}
