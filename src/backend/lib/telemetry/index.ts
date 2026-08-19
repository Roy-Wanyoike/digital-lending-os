/**
 * OpenTelemetry Observability — Re-exports & Initialization
 *
 * Single entrypoint for the Youngsend telemetry stack.
 * Call `initTelemetry()` once at application startup (e.g., instrumentation.ts).
 *
 * Re-exports:
 * - Tracer: getTracer(), createTracerProvider(), startFintechSpan(), withFintechSpan(), createHttpSpan(), shutdownTracer()
 * - Metrics: getMeter(), getMeterProvider(), getMetrics(), recordPayment(), recordRequestDuration(), recordSessionDelta(), recordFraudAlert(), shutdownMetrics()
 * - Logger: getLogger(), initLogger(), YoungsendLogger, shutdownLogger()
 * - Middleware: telemetryMiddleware(), withTelemetry()
 * - Health: performHealthChecks(), healthCheckHandler(), markStartupComplete()
 */

// ─── Tracer ──────────────────────────────────────────────────────────────────

export {
  createTracerProvider,
  getTracer,
  startFintechSpan,
  withFintechSpan,
  createHttpSpan,
  shutdownTracer,
  YS_ATTRS,
  type TracerConfig,
  type FintechSpanOptions,
} from './tracer';

// ─── Metrics ─────────────────────────────────────────────────────────────────

export {
  createMeterProvider,
  getMeterProvider,
  getMeter,
  getMetrics,
  registerCacheHitRatioCallback,
  registerKafkaConsumerLagCallback,
  recordPayment,
  recordRequestDuration,
  recordSessionDelta,
  recordFraudAlert,
  shutdownMetrics,
  type MetricsConfig,
  type YoungsendMetrics,
} from './metrics';

// ─── Logger ──────────────────────────────────────────────────────────────────

export {
  getLogger,
  initLogger,
  YoungsendLogger,
  shutdownLogger,
  LogLevel,
  type LoggerConfig,
  type LogEntry,
} from './logger';

// ─── Middleware ─────────────────────────────────────────────────────────────

export {
  telemetryMiddleware,
  withTelemetry,
  extractTraceContext,
  type NextApiHandler,
} from './middleware';

// ─── Health ─────────────────────────────────────────────────────────────────

export {
  performHealthChecks,
  healthCheckHandler,
  markStartupComplete,
  type HealthReport,
  type HealthCheckResult,
  type ComponentHealth,
  type HealthStatus,
} from './health';

// ─── Initialization ─────────────────────────────────────────────────────────

import { createTracerProvider, shutdownTracer } from './tracer';
import { createMeterProvider, shutdownMetrics } from './metrics';
import { initLogger, shutdownLogger, LogLevel } from './logger';
import { markStartupComplete } from './health';
import { parseLogLevel } from './logger';

export interface TelemetryInitConfig {
  /** Service name (default: youngsend-api) */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** Deployment environment (default: NODE_ENV) */
  environment?: string;
  /** OTLP endpoint for traces & metrics (OTEL_EXPORTER_OTLP_ENDPOINT) */
  otlpEndpoint?: string;
  /** OTLP endpoint for logs (OTEL_EXPORTER_OTLP_ENDPOINT_LOGS) */
  otlpEndpointLogs?: string;
  /** Trace sample rate for non-error spans (default: 0.1) */
  traceSampleRate?: number;
  /** Minimum log level (default: INFO) */
  logLevel?: LogLevel | string;
  /** Whether to skip telemetry entirely (default: false) */
  disabled?: boolean;
}

/**
 * Initialize the complete OpenTelemetry observability stack.
 * Call this exactly once at application startup (e.g., Next.js instrumentation.ts).
 *
 * Sets up:
 * - Tracer provider with OTLP export and error-aware sampling
 * - Meter provider with OTLP export
 * - Structured logger with trace correlation
 *
 * Returns a shutdown function to call on process termination.
 */
export function initTelemetry(config: TelemetryInitConfig = {}): () => Promise<void> {
  // Check if telemetry is disabled
  const disabled = config.disabled ?? process.env.OTEL_SDK_DISABLED === 'true';
  if (disabled) {
    console.log('[telemetry] OpenTelemetry is disabled via OTEL_SDK_DISABLED=true');
    return async () => {};
  }

  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'youngsend-api';
  const serviceVersion = config.serviceVersion || process.env.npm_package_version || '0.1.0';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
  const otlpEndpointLogs = config.otlpEndpointLogs || process.env.OTEL_EXPORTER_OTLP_ENDPOINT_LOGS || '';
  const traceSampleRate = config.traceSampleRate ?? parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '0.1');
  const logLevel = typeof config.logLevel === 'string'
    ? parseLogLevel(config.logLevel)
    : config.logLevel ?? parseLogLevel(process.env.LOG_LEVEL || 'info');

  // ── 1. Initialize Tracer ──────────────────────────────────────────────
  createTracerProvider({
    serviceName,
    serviceVersion,
    environment,
    otlpEndpoint: otlpEndpoint || undefined,
    sampleRate: traceSampleRate,
  });

  // ── 2. Initialize Metrics ─────────────────────────────────────────────
  createMeterProvider({
    serviceName,
    serviceVersion,
    environment,
    otlpEndpoint: otlpEndpoint || undefined,
    exportIntervalMs: 30000,
  });

  // ── 3. Initialize Logger ──────────────────────────────────────────────
  initLogger({
    serviceName,
    minLevel: logLevel,
    otlpEndpoint: otlpEndpointLogs || otlpEndpoint || undefined,
  });

  // Mark startup as complete (for health checks)
  markStartupComplete();

  const logger = initLogger({ serviceName, minLevel: logLevel });
  logger.info('OpenTelemetry initialized', {
    service: serviceName,
    version: serviceVersion,
    environment,
    otlp_endpoint: otlpEndpoint || 'none',
    trace_sample_rate: traceSampleRate,
  });

  // ── Return shutdown function ──────────────────────────────────────────
  return async () => {
    logger.info('Shutting down OpenTelemetry...');
    await Promise.all([
      shutdownTracer(),
      shutdownMetrics(),
      shutdownLogger(),
    ]);
  };
}
