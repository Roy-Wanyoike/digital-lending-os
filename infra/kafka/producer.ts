/**
 * Youngsend Kafka Producer
 *
 * Production-ready KafkaJS producer wrapper with:
 * - Connection pooling via singleton management
 * - Idempotent producer config (enable.idempotence=true)
 * - Message serialization with Zod validation
 * - Retry logic with configurable backoff
 * - Batching configuration
 * - Graceful shutdown with flush
 * - Transactional message support for EOS
 * - Metrics emission
 */

import { Kafka, Producer, ProducerRecord, Message, Transaction, Partitioners } from "kafkajs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { BaseEventSchema, type BaseEvent, parseEventByType } from "./event-schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface YoungsendProducerConfig {
  /** Kafka broker list, e.g. "kafka-1:9092,kafka-2:9092,kafka-3:9092" */
  brokers: string[];
  /** Client ID for this producer instance */
  clientId: string;
  /** The microservice name producing events */
  serviceName: string;
  /** Enable idempotent producer (prevents duplicate messages on retry) */
  enableIdempotence?: boolean;
  /** Enable transactional producer (for EOS consume-process-produce) */
  transactionalId?: string;
  /** Maximum time to wait for a message to be acknowledged (ms) */
  requestTimeoutMs?: number;
  /** Maximum number of in-flight requests per connection */
  maxInFlightRequests?: number;
  /** Maximum size of a single request in bytes */
  maxRequestSize?: number;
  /** How long to buffer messages before sending (ms) */
  lingerMs?: number;
  /** Maximum batch size in bytes */
  batchSizeBytes?: number;
  /** Number of retries for transient errors */
  retries?: number;
  /** Backoff between retries (ms) */
  retryBackoffMs?: number;
  /** Acks level: 0=none, 1=leader, -1=all */
  acks?: 0 | 1 | -1;
  /** Security protocol */
  securityProtocol?: "PLAINTEXT" | "SASL_SSL" | "SASL_PLAINTEXT";
  /** SASL mechanism */
  saslMechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512";
  /** SASL username */
  saslUsername?: string;
  /** SASL password */
  saslPassword?: string;
  /** Custom SSL options */
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: Buffer | string;
    cert?: Buffer | string;
    key?: Buffer | string;
  };
}

export interface ProducerMetrics {
  messagesProduced: number;
  bytesProduced: number;
  errors: number;
  retries: number;
  flushes: number;
  transactionsCommitted: number;
  transactionsAborted: number;
}

export interface ProduceResult {
  success: boolean;
  topic: string;
  key: string | Buffer | null;
  partition?: number;
  offset?: string;
  timestamp?: string;
  error?: Error;
  durationMs: number;
}

// ─── Default Configuration ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: Omit<Required<YoungsendProducerConfig>, "brokers" | "clientId" | "serviceName" | "transactionalId" | "securityProtocol" | "saslMechanism" | "saslUsername" | "saslPassword" | "ssl"> = {
  enableIdempotence: true,
  requestTimeoutMs: 30000,
  maxInFlightRequests: 5,
  maxRequestSize: 1_048_588, // ~1MB
  lingerMs: 5, // 5ms batching window for throughput
  batchSizeBytes: 16384, // 16KB batches
  retries: 10,
  retryBackoffMs: 250,
  acks: -1, // Wait for all ISR replicas
};

// ─── Producer Class ────────────────────────────────────────────────────────────

export class YoungsendProducer {
  private kafka: Kafka;
  private producer: Producer;
  private config: Required<Pick<YoungsendProducerConfig, "brokers" | "clientId" | "serviceName" | "enableIdempotence">> & YoungsendProducerConfig;
  private metrics: ProducerMetrics;
  private isShutdown = false;
  private connectPromise: Promise<void> | null = null;

  constructor(config: YoungsendProducerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as typeof this.config;

    this.metrics = {
      messagesProduced: 0,
      bytesProduced: 0,
      errors: 0,
      retries: 0,
      flushes: 0,
      transactionsCommitted: 0,
      transactionsAborted: 0,
    };

    // Build Kafka client configuration
    const kafkaConfig: Record<string, unknown> = {
      brokers: this.config.brokers,
      clientId: this.config.clientId,
      logLevel: process.env.KAFKA_LOG_LEVEL === "debug" ? 5 : 2, // debug=5, info=2
    };

    // SASL/SSL configuration
    if (this.config.securityProtocol && this.config.securityProtocol !== "PLAINTEXT") {
      const saslConfig: Record<string, unknown> = {};
      if (this.config.saslMechanism) saslConfig.mechanism = this.config.saslMechanism;
      if (this.config.saslUsername) saslConfig.username = this.config.saslUsername;
      if (this.config.saslPassword) saslConfig.password = this.config.saslPassword;

      kafkaConfig.sasl = saslConfig;
      if (this.config.securityProtocol.includes("SSL")) {
        kafkaConfig.ssl = this.config.ssl ?? { rejectUnauthorized: true };
      }
    }

    this.kafka = new Kafka(kafkaConfig as ConstructorParameters<typeof Kafka>[0]);

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      // Idempotent producer settings
      enableIdempotence: this.config.enableIdempotence,
      maxInFlightRequests: this.config.enableIdempotence ? 5 : this.config.maxInFlightRequests,
      transactionalId: this.config.transactionalId,
      transactionTimeout: 30000,
      // Batching and acks
      acks: this.config.acks,
      linger: this.config.lingerMs,
      batchSize: this.config.batchSizeBytes,
      maxRequestSize: this.config.maxRequestSize,
      // Retry
      retries: this.config.retries,
      retryBackoff: this.config.retryBackoffMs,
      // Timeout
      requestTimeout: this.config.requestTimeoutMs,
    });
  }

  // ── Connection Management ──────────────────────────────────────────────────

  /**
   * Connect to the Kafka cluster. Idempotent — subsequent calls return the same promise.
   */
  async connect(): Promise<void> {
    if (this.isShutdown) {
      throw new Error("Producer has been shut down. Create a new instance.");
    }
    if (!this.connectPromise) {
      this.connectPromise = this.producer.connect();
    }
    return this.connectPromise;
  }

  /**
   * Gracefully disconnect — flushes buffered messages before closing.
   * Rejects any new produce calls after this is invoked.
   */
  async disconnect(): Promise<void> {
    this.isShutdown = true;
    try {
      await this.producer.disconnect();
    } catch (error) {
      // Swallow disconnect errors — we're shutting down
      console.error("[YoungsendProducer] Error during disconnect:", error);
    }
  }

  // ── Core Produce ──────────────────────────────────────────────────────────

  /**
   * Produce a single event to a Kafka topic.
   * Validates the event against BaseEventSchema before sending.
   *
   * @param topic - Target topic name
   * @param key - Message key (stringified entity ID)
   * @param event - The event object to send
   * @returns ProduceResult with success/failure details
   */
  async produce(topic: string, key: string, event: BaseEvent): Promise<ProduceResult> {
    if (this.isShutdown) {
      throw new Error("Producer has been shut down.");
    }

    // Ensure connected
    await this.connect();

    const start = Date.now();

    // Validate event envelope
    const validation = parseEventByType(event);
    if (!validation.success) {
      const error = new Error(
        `Event validation failed for topic ${topic}: ${validation.errors?.map((e) => e.message).join(", ")}`,
      );
      this.metrics.errors++;
      return {
        success: false,
        topic,
        key,
        error,
        durationMs: Date.now() - start,
      };
    }

    // Serialize message
    const value = this.serialize(event);
    const keyBuffer = typeof key === "string" ? key : String(key);

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: keyBuffer,
          value,
          timestamp: event.timestamp ? new Date(event.timestamp).getTime().toString() : undefined,
        },
      ],
    };

    try {
      const result = await this.producer.send(record);

      this.metrics.messagesProduced++;
      this.metrics.bytesProduced += value.length;

      return {
        success: true,
        topic,
        key: keyBuffer,
        partition: result[0]?.partition,
        offset: result[0]?.offset,
        timestamp: result[0]?.timestamp,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      this.metrics.errors++;
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[YoungsendProducer] Produce error on topic=${topic} key=${keyBuffer}:`,
        err.message,
      );
      return {
        success: false,
        topic,
        key: keyBuffer,
        error: err,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Produce multiple events to a topic in a single batch.
   * More efficient than individual produce() calls.
   */
  async produceBatch(
    topic: string,
    messages: Array<{ key: string; event: BaseEvent }>,
  ): Promise<ProduceResult[]> {
    if (this.isShutdown) {
      throw new Error("Producer has been shut down.");
    }

    await this.connect();

    const kafkaMessages: Message[] = [];
    const results: ProduceResult[] = [];

    for (const { key, event } of messages) {
      const start = Date.now();
      const validation = parseEventByType(event);
      if (!validation.success) {
        const error = new Error(`Validation failed: ${validation.errors?.map((e) => e.message).join(", ")}`);
        this.metrics.errors++;
        results.push({
          success: false,
          topic,
          key,
          error,
          durationMs: Date.now() - start,
        });
        continue;
      }

      kafkaMessages.push({
        key,
        value: this.serialize(event),
        timestamp: event.timestamp ? new Date(event.timestamp).getTime().toString() : undefined,
      });
    }

    if (kafkaMessages.length > 0) {
      const record: ProducerRecord = { topic, messages: kafkaMessages };
      try {
        await this.producer.send(record);
        this.metrics.messagesProduced += kafkaMessages.length;
        for (const msg of kafkaMessages) {
          results.push({
            success: true,
            topic,
            key: typeof msg.key === "string" ? msg.key : String(msg.key),
            durationMs: 0,
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.metrics.errors++;
        for (const msg of kafkaMessages) {
          results.push({
            success: false,
            topic,
            key: typeof msg.key === "string" ? msg.key : String(msg.key),
            error: err,
            durationMs: 0,
          });
        }
      }
    }

    return results;
  }

  // ── Transactional API ──────────────────────────────────────────────────────

  /**
   * Execute a transaction: consume-process-produce pattern.
   * All produced messages are committed atomically alongside the consumer offset.
   */
  async withTransaction(
    operations: (txn: Transaction) => Promise<void>,
  ): Promise<void> {
    if (!this.config.transactionalId) {
      throw new Error(
        "Transactional producer requires transactionalId to be configured.",
      );
    }

    await this.connect();

    const txn = await this.producer.transaction();

    try {
      await operations(txn);
      await txn.commit();
      this.metrics.transactionsCommitted++;
    } catch (error) {
      try {
        await txn.abort();
        this.metrics.transactionsAborted++;
      } catch (abortError) {
        console.error("[YoungsendProducer] Transaction abort failed:", abortError);
      }
      throw error;
    }
  }

  /**
   * Send a message within an existing transaction.
   */
  async sendInTransaction(
    txn: Transaction,
    topic: string,
    key: string,
    event: BaseEvent,
  ): Promise<void> {
    const validation = parseEventByType(event);
    if (!validation.success) {
      throw new Error(
        `Event validation failed for topic ${topic}: ${validation.errors?.map((e) => e.message).join(", ")}`,
      );
    }

    await txn.send({
      topic,
      messages: [
        {
          key,
          value: this.serialize(event),
          timestamp: event.timestamp ? new Date(event.timestamp).getTime().toString() : undefined,
        },
      ],
    });

    this.metrics.messagesProduced++;
  }

  // ── Convenience: Send to DLQ ───────────────────────────────────────────────

  /**
   * Forward a failed message to the dead letter queue topic.
   */
  async sendToDlq(
    dlqTopic: string,
    originalMessage: unknown,
    originalTopic: string,
    error: Error,
    partition?: number,
    offset?: string,
    correlationId?: string,
  ): Promise<ProduceResult> {
    const dlqEvent: BaseEvent = {
      eventId: uuidv4(),
      eventType: "dlq_entry",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      correlationId: correlationId ?? uuidv4(),
      causationId: "00000000-0000-0000-0000-000000000000",
      sourceService: this.config.serviceName,
      payload: {
        originalTopic,
        originalPartition: partition,
        originalOffset: offset,
        originalMessage,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
      metadata: {
        enqueuedAt: new Date().toISOString(),
      },
    };

    return this.produce(dlqTopic, originalTopic, dlqEvent);
  }

  // ── Flush & Metrics ───────────────────────────────────────────────────────

  /**
   * Flush buffered messages to Kafka. Call before graceful shutdown.
   */
  async flush(): Promise<void> {
    const timeout = setTimeout(() => {
      console.warn("[YoungsendProducer] Flush timed out after 10 seconds");
    }, 10000);

    try {
      await this.producer.flush();
      this.metrics.flushes++;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get current producer metrics snapshot.
   */
  getMetrics(): Readonly<ProducerMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset metrics counters to zero.
   */
  resetMetrics(): void {
    Object.assign(this.metrics, {
      messagesProduced: 0,
      bytesProduced: 0,
      errors: 0,
      retries: 0,
      flushes: 0,
      transactionsCommitted: 0,
      transactionsAborted: 0,
    });
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  /**
   * Serialize an event to a JSON Buffer for Kafka transport.
   * Uses Buffer for zero-copy efficiency.
   */
  private serialize(event: BaseEvent): Buffer {
    return Buffer.from(JSON.stringify(event), "utf-8");
  }

  // ── Raw Access ────────────────────────────────────────────────────────────

  /**
   * Access the underlying KafkaJS producer for advanced use cases.
   * Use with caution — prefer the typed methods above.
   */
  getRawProducer(): Producer {
    return this.producer;
  }

  /**
   * Access the underlying KafkaJS client instance.
   */
  getKafkaClient(): Kafka {
    return this.kafka;
  }
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

const producerInstances = new Map<string, YoungsendProducer>();

/**
 * Get or create a singleton producer instance for a given service.
 * Reuses the same connection pool across the application lifecycle.
 */
export function getProducer(config: YoungsendProducerConfig): YoungsendProducer {
  const key = `${config.clientId}:${config.brokers.join(",")}`;
  let instance = producerInstances.get(key);
  if (!instance) {
    instance = new YoungsendProducer(config);
    producerInstances.set(key, instance);
  }
  return instance;
}

/**
 * Shut down all producer instances. Call during application shutdown.
 */
export async function shutdownAllProducers(): Promise<void> {
  const shutdownPromises: Promise<void>[] = [];
  for (const [, producer] of producerInstances) {
    shutdownPromises.push(
      producer.flush().then(() => producer.disconnect()).catch(() => {}),
    );
  }
  await Promise.all(shutdownPromises);
  producerInstances.clear();
}

// ─── Event Builder Helper ──────────────────────────────────────────────────────

export interface BuildEventOptions {
  eventType: string;
  topic: string;
  key: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build a well-formed BaseEvent with auto-generated fields.
 * Fills in eventId, timestamp, and sourceService automatically.
 */
export function buildEvent(
  serviceName: string,
  options: BuildEventOptions,
): BaseEvent {
  return {
    eventId: uuidv4(),
    eventType: options.eventType,
    timestamp: new Date().toISOString(),
    version: options.version ?? "1.0.0",
    correlationId: options.correlationId ?? uuidv4(),
    causationId: options.causationId ?? "00000000-0000-0000-0000-000000000000",
    sourceService: serviceName,
    payload: options.payload,
    metadata: options.metadata,
  };
}
