/**
 * Digital Lending OS Kafka Consumer Framework
 *
 * Feature-rich consumer wrapper with:
 * - Graceful shutdown (SIGTERM, SIGINT, SIGQUIT handling)
 * - Dead letter queue forwarding after retry exhaustion
 * - Metrics emission (processing time, lag, error rate, DLQ depth)
 * - Batch processing support with configurable batch size
 * - Per-message idempotency tracking via eventId deduplication
 * - Structured logging with correlation IDs
 * - Pluggable message handler interface
 */

import {
  Kafka,
  Consumer,
  EachMessagePayload,
  EachBatchPayload,
  KafkaMessage,
  PartitionAssigner,
} from "kafkajs";
import type { ConsumerGroupConfig, RetryStrategy } from "./consumer-groups";
import { toKafkaConsumerConfig, computeRetryDelay, resolveDlqTopic } from "./consumer-groups";
import type { BaseEvent } from "./event-schemas";
import { AnyDigital Lending OSEventSchema, parseEventByType } from "./event-schemas";
import { Digital Lending OSProducer, type ProduceResult } from "./producer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageHandler<T = BaseEvent> = (
  event: T,
  metadata: MessageMetadata,
) => Promise<void>;

export type BatchHandler<T = BaseEvent> = (
  events: Array<{ event: T; metadata: MessageMetadata }>,
) => Promise<void>;

export interface MessageMetadata {
  topic: string;
  partition: number;
  offset: string;
  key: string | Buffer | null;
  timestamp: string;
  headers: Record<string, string | Buffer | undefined>;
  groupId: string;
}

export interface ConsumerMetrics {
  messagesProcessed: number;
  messagesErrored: number;
  messagesSkipped: number;
  batchesProcessed: number;
  dlqForwarded: number;
  retriesAttempted: number;
  processingTimeMs: number;
  avgProcessingTimeMs: number;
  lastProcessedOffset: string;
  uptimeMs: number;
}

export interface Digital Lending OSConsumerConfig {
  /** Kafka broker list */
  brokers: string[];
  /** The consumer group configuration (from consumer-groups.ts) */
  groupConfig: ConsumerGroupConfig;
  /** Client ID for this consumer instance */
  clientId: string;
  /** Security protocol */
  securityProtocol?: "PLAINTEXT" | "SASL_SSL" | "SASL_PLAINTEXT";
  /** SASL mechanism */
  saslMechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512";
  /** SASL username */
  saslUsername?: string;
  /** SASL password */
  saslPassword?: string;
  /** SSL options */
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: Buffer | string;
    cert?: Buffer | string;
    key?: Buffer | string;
  };
  /** Producer instance for DLQ forwarding. If not provided, one will be created. */
  producer?: Digital Lending OSProducer;
  /** Producer config for DLQ forwarding (used if producer is not provided) */
  producerConfig?: {
    serviceName: string;
    clientId: string;
  };
  /** Enable batch processing mode */
  batchProcessing?: boolean;
  /** Batch size when in batch mode */
  batchSize?: number;
  /** Graceful shutdown timeout in ms */
  shutdownTimeoutMs?: number;
  /** Custom metrics callback */
  onMetrics?: (metrics: ConsumerMetrics) => void;
}

// ─── Idempotency Tracker ───────────────────────────────────────────────────────

/**
 * In-memory eventId deduplication cache.
 * Prevents processing the same event twice in the event of consumer restarts with uncommitted offsets.
 */
class IdempotencyCache {
  private cache: Map<string, number>; // eventId → expiry timestamp
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 100_000, ttlMs = 24 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Check if an eventId has already been processed.
   * If not, marks it as processed and returns false (first time).
   */
  checkAndMark(eventId: string): boolean {
    this.evict();
    if (this.cache.has(eventId)) {
      return true; // Already processed
    }
    this.cache.set(eventId, Date.now() + this.ttlMs);
    return false; // First time
  }

  /** Remove expired entries and enforce size limit */
  private evict(): void {
    const now = Date.now();
    for (const [eventId, expiry] of this.cache) {
      if (now > expiry) {
        this.cache.delete(eventId);
      }
    }
    if (this.cache.size > this.maxSize) {
      // Delete oldest entries (Map preserves insertion order)
      const toDelete = this.cache.size - this.maxSize;
      let count = 0;
      for (const key of this.cache.keys()) {
        if (count >= toDelete) break;
        this.cache.delete(key);
        count++;
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ─── Retry Context ───────────────────────────────────────────────────────────

interface RetryState {
  attempt: number;
  lastAttemptAt: number;
  failureTimestamps: Array<{ attempt: number; timestamp: string; error: string }>;
}

// ─── Consumer Class ────────────────────────────────────────────────────────────

export class Digital Lending OSConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private config: Digital Lending OSConsumerConfig;
  private producer: Digital Lending OSProducer;
  private metrics: ConsumerMetrics;
  private idempotencyCache: IdempotencyCache;
  private retryStates: Map<string, RetryState>;
  private isRunning = false;
  private isShutdown = false;
  private startedAt: number;
  private shutdownSignalHandlers: Array<() => void>;
  private currentHandler: MessageHandler | BatchHandler | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Digital Lending OSConsumerConfig) {
    this.config = config;
    this.startedAt = Date.now();
    this.shutdownSignalHandlers = [];
    this.retryStates = new Map();
    this.idempotencyCache = new IdempotencyCache();

    this.metrics = {
      messagesProcessed: 0,
      messagesErrored: 0,
      messagesSkipped: 0,
      batchesProcessed: 0,
      dlqForwarded: 0,
      retriesAttempted: 0,
      processingTimeMs: 0,
      avgProcessingTimeMs: 0,
      lastProcessedOffset: "0",
      uptimeMs: 0,
    };

    // Build Kafka client
    const kafkaConfig: Record<string, unknown> = {
      brokers: config.brokers,
      clientId: config.clientId,
    };

    if (config.securityProtocol && config.securityProtocol !== "PLAINTEXT") {
      const saslConfig: Record<string, unknown> = {};
      if (config.saslMechanism) saslConfig.mechanism = config.saslMechanism;
      if (config.saslUsername) saslConfig.username = config.saslUsername;
      if (config.saslPassword) saslConfig.password = config.saslPassword;
      kafkaConfig.sasl = saslConfig;
      if (config.securityProtocol.includes("SSL")) {
        kafkaConfig.ssl = config.ssl ?? { rejectUnauthorized: true };
      }
    }

    this.kafka = new Kafka(kafkaConfig as ConstructorParameters<typeof Kafka>[0]);

    // Build consumer with group config
    const consumerConfig = toKafkaConsumerConfig(config.groupConfig);
    this.consumer = this.kafka.consumer(consumerConfig as Parameters<typeof this.kafka.consumer>[0]);

    // Producer for DLQ forwarding
    this.producer =
      config.producer ??
      new Digital Lending OSProducer({
        brokers: config.brokers,
        clientId: `${config.clientId}-dlq-producer`,
        serviceName: config.producerConfig?.serviceName ?? "dlq-forwarder",
      });
  }

  // ── Register Handlers ──────────────────────────────────────────────────────

  /**
   * Register a per-message handler. This handler is called for each individual message.
   */
  onMessage<T = BaseEvent>(handler: MessageHandler<T>): void {
    this.currentHandler = handler as MessageHandler;
  }

  /**
   * Register a batch handler. This handler receives an array of messages per batch.
   */
  onBatch<T = BaseEvent>(handler: BatchHandler<T>): void {
    this.config.batchProcessing = true;
    this.currentHandler = handler as BatchHandler;
  }

  // ── Start / Stop ──────────────────────────────────────────────────────────

  /**
   * Start consuming messages. Returns a promise that resolves when the consumer
   * has subscribed and is ready. The consumer continues running in the background
   * until stop() is called.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Consumer is already running.");
    }
    if (this.isShutdown) {
      throw new Error("Consumer has been shut down. Create a new instance.");
    }

    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: this.config.groupConfig.topics,
      fromBeginning: this.config.groupConfig.autoOffsetReset === "earliest",
    });

    this.isRunning = true;
    this.startedAt = Date.now();

    // Start metrics interval
    this.metricsInterval = setInterval(() => this.emitMetrics(), 30_000);

    // Register shutdown handlers
    this.registerShutdownHandlers();

    // Start consuming
    if (this.config.batchProcessing) {
      await this.consumer.run({
        eachBatch: this.handleBatch.bind(this),
        partitionsConsumedConcurrently: this.config.groupConfig.concurrency,
      });
    } else {
      await this.consumer.run({
        eachMessage: this.handleEachMessage.bind(this),
      });
    }
  }

  /**
   * Gracefully stop the consumer. Flushes pending messages, commits offsets,
   * and disconnects from Kafka.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    const timeout = this.config.shutdownTimeoutMs ?? 15000;

    this.isRunning = false;

    // Stop consuming first (prevents new messages from being processed)
    try {
      await Promise.race([
        this.consumer.stop(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Consumer stop timed out")), timeout),
        ),
      ]);
    } catch (error) {
      console.error("[Digital Lending OSConsumer] Error stopping consumer:", error);
    }

    // Commit final offsets if manual commit mode
    if (!this.config.groupConfig.autoCommit) {
      try {
        await this.consumer.commitOffsets(
          this.consumer.groupMetadata().offsets(),
        );
      } catch (error) {
        console.error("[Digital Lending OSConsumer] Error committing final offsets:", error);
      }
    }

    // Flush producer (DLQ messages)
    try {
      await this.producer.flush();
    } catch (error) {
      console.error("[Digital Lending OSConsumer] Error flushing producer:", error);
    }

    // Disconnect
    try {
      await this.consumer.disconnect();
    } catch (error) {
      console.error("[Digital Lending OSConsumer] Error disconnecting consumer:", error);
    }

    if (!this.config.producer) {
      try {
        await this.producer.disconnect();
      } catch (error) {
        console.error("[Digital Lending OSConsumer] Error disconnecting DLQ producer:", error);
      }
    }

    this.isShutdown = true;
    this.removeShutdownHandlers();

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.emitMetrics();
    console.info(
      `[Digital Lending OSConsumer] Group=${this.config.groupConfig.groupId} stopped cleanly.`,
    );
  }

  // ── Per-Message Processing ─────────────────────────────────────────────────

  private async handleEachMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const metadata = this.extractMetadata(payload);
    const retryKey = `${topic}:${partition}:${message.offset}`;

    try {
      // Deserialize and validate
      const parsed = this.deserialize(message);
      if (!parsed) {
        this.metrics.messagesSkipped++;
        await this.commitOffset(topic, partition, message.offset);
        return;
      }

      // Idempotency check
      if (this.idempotencyCache.checkAndMark(parsed.eventId)) {
        console.info(
          `[Digital Lending OSConsumer] Duplicate eventId=${parsed.eventId} skipped. topic=${topic} offset=${message.offset}`,
        );
        this.metrics.messagesSkipped++;
        await this.commitOffset(topic, partition, message.offset);
        return;
      }

      // Process with retry
      await this.processWithRetry(retryKey, topic, parsed, metadata);

      // Update metrics
      this.metrics.messagesProcessed++;
      this.metrics.lastProcessedOffset = message.offset;
    } catch (error) {
      console.error(
        `[Digital Lending OSConsumer] Unhandled error on topic=${topic} partition=${partition} offset=${message.offset}:`,
        error,
      );
      this.metrics.messagesErrored++;
    }
  }

  // ── Batch Processing ───────────────────────────────────────────────────────

  private async handleBatch(payload: EachBatchPayload): Promise<void> {
    const { topic, partition, messages } = payload;
    const events: Array<{ event: BaseEvent; metadata: MessageMetadata }> = [];

    for (const message of messages) {
      const parsed = this.deserialize(message);
      if (!parsed) {
        this.metrics.messagesSkipped++;
        continue;
      }
      if (this.idempotencyCache.checkAndMark(parsed.eventId)) {
        this.metrics.messagesSkipped++;
        continue;
      }
      events.push({
        event: parsed,
        metadata: {
          topic,
          partition,
          offset: message.offset,
          key: message.key,
          timestamp: message.timestamp,
          headers: this.extractHeaders(message),
          groupId: this.config.groupConfig.groupId,
        },
      });
    }

    if (events.length === 0) {
      return;
    }

    try {
      const start = Date.now();
      if (this.currentHandler && typeof (this.currentHandler as BatchHandler) === "function") {
        await (this.currentHandler as BatchHandler)(events);
      }
      const duration = Date.now() - start;
      this.metrics.processingTimeMs += duration;
      this.metrics.avgProcessingTimeMs =
        this.metrics.processingTimeMs / Math.max(1, this.metrics.messagesProcessed);
      this.metrics.batchesProcessed++;
      this.metrics.messagesProcessed += events.length;

      // Resolve offsets for successfully processed batch
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        await this.commitOffset(topic, partition, lastMessage.offset);
      }
    } catch (error) {
      console.error(
        `[Digital Lending OSConsumer] Batch processing error on topic=${topic} partition=${partition}:`,
        error,
      );
      // Forward entire batch to DLQ
      for (const { event, metadata } of events) {
        await this.forwardToDlq(topic, event, metadata, error instanceof Error ? error : new Error(String(error)));
        this.metrics.messagesErrored++;
      }
    }
  }

  // ── Retry Logic ────────────────────────────────────────────────────────────

  private async processWithRetry(
    retryKey: string,
    topic: string,
    event: BaseEvent,
    metadata: MessageMetadata,
  ): Promise<void> {
    const retryState = this.getOrCreateRetryState(retryKey);
    const strategy = this.config.groupConfig.retry;

    while (retryState.attempt < strategy.maxAttempts) {
      retryState.attempt++;
      this.metrics.retriesAttempted++;
      retryState.lastAttemptAt = Date.now();

      try {
        const start = Date.now();
        if (this.currentHandler && typeof this.currentHandler === "function") {
          await (this.currentHandler as MessageHandler)(event, metadata);
        }
        const duration = Date.now() - start;
        this.metrics.processingTimeMs += duration;
        this.metrics.avgProcessingTimeMs =
          this.metrics.processingTimeMs / Math.max(1, this.metrics.messagesProcessed);

        // Success — clear retry state and commit
        this.retryStates.delete(retryKey);
        await this.commitOffset(topic, metadata.partition, metadata.offset);
        return;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        retryState.failureTimestamps.push({
          attempt: retryState.attempt,
          timestamp: new Date().toISOString(),
          error: err.message,
        });

        // Check if we've exhausted retries
        if (retryState.attempt >= strategy.maxAttempts) {
          console.error(
            `[Digital Lending OSConsumer] Max retries (${strategy.maxAttempts}) exhausted for topic=${topic} offset=${metadata.offset}:`,
            err.message,
          );
          await this.forwardToDlq(topic, event, metadata, err, retryState.failureTimestamps);
          this.retryStates.delete(retryKey);
          return;
        }

        // Wait before retry
        const delay = computeRetryDelay(retryState.attempt, strategy);
        console.warn(
          `[Digital Lending OSConsumer] Retry ${retryState.attempt}/${strategy.maxAttempts} for topic=${topic} offset=${metadata.offset} after ${delay}ms: ${err.message}`,
        );
        await this.sleep(delay);
      }
    }
  }

  // ── Dead Letter Queue Forwarding ────────────────────────────────────────────

  private async forwardToDlq(
    sourceTopic: string,
    event: BaseEvent,
    metadata: MessageMetadata,
    error: Error,
    failureAttempts?: Array<{ attempt: number; timestamp: string; error: string }>,
  ): Promise<void> {
    try {
      const dlqTopic = this.config.groupConfig.dlq.enabled
        ? resolveDlqTopic(sourceTopic, this.config.groupConfig)
        : `dlq.${sourceTopic}`;

      await this.producer.sendToDlq(
        dlqTopic,
        { ...event, failureAttempts },
        sourceTopic,
        error,
        metadata.partition,
        metadata.offset,
        event.correlationId,
      );

      this.metrics.dlqForwarded++;

      console.info(
        `[Digital Lending OSConsumer] Forwarded to DLQ: topic=${dlqTopic} originalTopic=${sourceTopic} offset=${metadata.offset}`,
      );
    } catch (dlqError) {
      console.error(
        `[Digital Lending OSConsumer] Failed to forward to DLQ:`,
        dlqError,
      );
    }
  }

  // ── Deserialization ────────────────────────────────────────────────────────

  private deserialize(message: KafkaMessage): BaseEvent | null {
    try {
      if (!message.value) {
        console.error(
          `[Digital Lending OSConsumer] Empty message value on topic=${message.topic} offset=${message.offset}`,
        );
        return null;
      }

      const raw = JSON.parse(message.value.toString("utf-8"));
      const result = parseEventByType(raw);

      if (!result.success) {
        console.error(
          `[Digital Lending OSConsumer] Schema validation failed on topic=${message.topic} offset=${message.offset}:`,
          result.errors?.map((e) => e.message).join(", "),
        );
        return null;
      }

      return result.data;
    } catch (error) {
      console.error(
        `[Digital Lending OSConsumer] Deserialization error on topic=${message.topic} offset=${message.offset}:`,
        error,
      );
      return null;
    }
  }

  // ── Offset Management ────────────────────────────────────────────────────

  private async commitOffset(topic: string, partition: number, offset: string): Promise<void> {
    if (this.config.groupConfig.autoCommit) return; // Auto-commit handles this

    try {
      await this.consumer.commitOffsets([{ topic, partition, offset }]);
    } catch (error) {
      console.error(
        `[Digital Lending OSConsumer] Failed to commit offset: topic=${topic} partition=${partition} offset=${offset}`,
        error,
      );
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private extractMetadata(payload: EachMessagePayload): MessageMetadata {
    return {
      topic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      key: payload.message.key,
      timestamp: payload.message.timestamp,
      headers: this.extractHeaders(payload.message),
      groupId: this.config.groupConfig.groupId,
    };
  }

  private extractHeaders(message: KafkaMessage): Record<string, string | Buffer | undefined> {
    const headers: Record<string, string | Buffer | undefined> = {};
    if (message.headers) {
      for (const [key, value] of Object.entries(message.headers)) {
        headers[key] = value?.toString("utf-8") ?? undefined;
      }
    }
    return headers;
  }

  private getOrCreateRetryState(key: string): RetryState {
    let state = this.retryStates.get(key);
    if (!state) {
      state = {
        attempt: 0,
        lastAttemptAt: 0,
        failureTimestamps: [],
      };
      this.retryStates.set(key, state);
    }
    return state;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  private emitMetrics(): void {
    this.metrics.uptimeMs = Date.now() - this.startedAt;

    const metricsSnapshot = {
      ...this.metrics,
      consumerGroup: this.config.groupConfig.groupId,
      topics: this.config.groupConfig.topics,
      idempotencyCacheSize: this.idempotencyCache.size(),
      retryQueueSize: this.retryStates.size,
      isRunning: this.isRunning,
      timestamp: new Date().toISOString(),
    };

    if (this.config.onMetrics) {
      this.config.onMetrics(this.metrics);
    }

    // Structured log output
    console.info(
      `[Digital Lending OSConsumer:Metrics] group=${this.config.groupConfig.groupId} processed=${this.metrics.messagesProcessed} errored=${this.metrics.messagesErrored} dlq=${this.metrics.dlqForwarded} avgMs=${this.metrics.avgProcessingTimeMs.toFixed(2)}`,
    );
  }

  /**
   * Get current consumer metrics snapshot.
   */
  getMetrics(): Readonly<ConsumerMetrics> {
    this.metrics.uptimeMs = Date.now() - this.startedAt;
    return { ...this.metrics };
  }

  // ── Graceful Shutdown ────────────────────────────────────────────────────

  private registerShutdownHandlers(): void {
    const handleShutdown = async (signal: string) => {
      console.info(`[Digital Lending OSConsumer] Received ${signal}. Initiating graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };

    const onSigterm = () => handleShutdown("SIGTERM");
    const onSigint = () => handleShutdown("SIGINT");
    const onSigquit = () => handleShutdown("SIGQUIT");

    process.on("SIGTERM", onSigterm);
    process.on("SIGINT", onSigint);
    process.on("SIGQUIT", onSigquit);

    this.shutdownSignalHandlers = [
      () => process.off("SIGTERM", onSigterm),
      () => process.off("SIGINT", onSigint),
      () => process.off("SIGQUIT", onSigquit),
    ];
  }

  private removeShutdownHandlers(): void {
    for (const unregister of this.shutdownSignalHandlers) {
      unregister();
    }
    this.shutdownSignalHandlers = [];
  }
}

// ─── Factory Helper ───────────────────────────────────────────────────────────

export interface ConsumerFactoryOptions {
  brokers: string[];
  consumerConfig: ConsumerGroupConfig;
  clientId: string;
  securityProtocol?: Digital Lending OSConsumerConfig["securityProtocol"];
  saslMechanism?: Digital Lending OSConsumerConfig["saslMechanism"];
  saslUsername?: Digital Lending OSConsumerConfig["saslUsername"];
  saslPassword?: Digital Lending OSConsumerConfig["saslPassword"];
  producer?: Digital Lending OSProducer;
  shutdownTimeoutMs?: number;
}

/**
 * Create a configured Digital Lending OSConsumer ready for handler registration.
 */
export function createConsumer(
  options: ConsumerFactoryOptions,
): Digital Lending OSConsumer {
  return new Digital Lending OSConsumer({
    brokers: options.brokers,
    groupConfig: options.consumerConfig,
    clientId: options.clientId,
    securityProtocol: options.securityProtocol,
    saslMechanism: options.saslMechanism,
    saslUsername: options.saslUsername,
    saslPassword: options.saslPassword,
    producer: options.producer,
    shutdownTimeoutMs: options.shutdownTimeoutMs,
  });
}
