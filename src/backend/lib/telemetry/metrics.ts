/**
 * OpenTelemetry Custom Metrics for Youngsend Fintech Platform
 *
 * Metrics:
 * - youngsend_payment_total: Counter (provider, status, currency)
 * - youngsend_payment_amount: Histogram (provider, currency, custom buckets)
 * - youngsend_request_duration: Histogram (route, method, status)
 * - youngsend_active_sessions: Gauge
 * - youngsend_cache_hit_ratio: Gauge (cache_type)
 * - youngsend_kafka_consumer_lag: Gauge (topic, consumer_group)
 * - youngsend_fraud_alerts: Counter (severity, type)
 *
 * Uses @opentelemetry/sdk-metrics with OTLP export.
 */

import {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { UpDownCounter, Histogram, Counter, ObservableGauge, Meter } from '@opentelemetry/api';

// ─── Metric Singleton ───────────────────────────────────────────────────────

let _meterProvider: MeterProvider | null = null;
let _meter: Meter | null = null;

export interface MetricsConfig {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  otlpEndpoint?: string;
  exportIntervalMs?: number;
}

// ─── Metric Instruments ────────────────────────────────────────────────────

export interface YoungsendMetrics {
  /** Counter: Total payment count by provider, status, currency */
  paymentTotal: Counter;
  /** Histogram: Payment amounts with fintech-aware buckets */
  paymentAmount: Histogram;
  /** Histogram: Request duration in seconds by route, method, status */
  requestDuration: Histogram;
  /** UpDownCounter: Currently active user sessions */
  activeSessions: UpDownCounter;
  /** ObservableGauge: Cache hit ratio (0-1) by cache_type */
  cacheHitRatio: ObservableGauge;
  /** ObservableGauge: Kafka consumer lag by topic, consumer_group */
  kafkaConsumerLag: ObservableGauge;
  /** Counter: Fraud alerts by severity, type */
  fraudAlerts: Counter;
}

let _metrics: YoungsendMetrics | null = null;

// ─── Observable Gauge Callbacks ─────────────────────────────────────────────

const cacheHitRatioCallbacks: Array<() => Record<string, number>> = [];
const kafkaConsumerLagCallbacks: Array<() => Record<string, number>> = [];

/**
 * Register a callback that provides cache hit ratio observations.
 * Each callback should return { [cacheType]: hitRatio (0-1) }.
 */
export function registerCacheHitRatioCallback(
  callback: () => Record<string, number>
): void {
  cacheHitRatioCallbacks.push(callback);
}

/**
 * Register a callback that provides Kafka consumer lag observations.
 * Each callback should return { "topic:consumer_group": lag }.
 */
export function registerKafkaConsumerLagCallback(
  callback: () => Record<string, number>
): void {
  kafkaConsumerLagCallbacks.push(callback);
}

// ─── Meter Provider Setup ───────────────────────────────────────────────────

export function createMeterProvider(config: MetricsConfig = {}): MeterProvider {
  if (_meterProvider) {
    return _meterProvider;
  }

  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'youngsend-api';
  const serviceVersion = config.serviceVersion || process.env.npm_package_version || '0.1.0';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const exportIntervalMs = config.exportIntervalMs || 30000;

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: environment,
    'host.id': process.env.HOSTNAME || process.env.HOST_ID || 'unknown',
    'service.namespace': 'youngsend',
  });

  const readers: PeriodicExportingMetricReader[] = [];

  if (otlpEndpoint) {
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: otlpEndpoint,
        }),
        exportIntervalMillis: exportIntervalMs,
        exportTimeoutMillis: 30000,
      })
    );
  }

  // Console exporter in development
  if (environment === 'development') {
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 60000,
      })
    );
  }

  const provider = new MeterProvider({ resource, readers });
  _meterProvider = provider;

  // Create meter and instruments
  const meter = meterProvider.meter as Meter || provider.getMeter(serviceName, serviceVersion);
  _meter = meter;

  _metrics = createInstruments(meter);

  return provider;
}

function createInstruments(meter: Meter): YoungsendMetrics {
  // ── youngsend_payment_total ─────────────────────────────────────────
  const paymentTotal = meter.createCounter('youngsend_payment_total', {
    description: 'Total count of payment transactions',
    unit: '1',
    valueType: 'int',
  });

  // ── youngsend_payment_amount ─────────────────────────────────────────
  const paymentAmount = meter.createHistogram('youngsend_payment_amount', {
    description: 'Payment amount in base currency units',
    unit: 'USD',
    valueType: 'double',
    advice: {
      explicitBucketBoundaries: [1, 10, 100, 1000, 10000, 100000],
    },
  });

  // ── youngsend_request_duration ───────────────────────────────────────
  const requestDuration = meter.createHistogram('youngsend_request_duration', {
    description: 'HTTP request duration in seconds',
    unit: 's',
    valueType: 'double',
    advice: {
      explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    },
  });

  // ── youngsend_active_sessions ───────────────────────────────────────
  const activeSessions = meter.createUpDownCounter('youngsend_active_sessions', {
    description: 'Number of currently active user sessions',
    unit: '1',
    valueType: 'int',
  });

  // ── youngsend_cache_hit_ratio ────────────────────────────────────────
  const cacheHitRatio = meter.createObservableGauge('youngsend_cache_hit_ratio', {
    description: 'Cache hit ratio (0-1) by cache type',
    unit: '1',
    valueType: 'double',
  });

  cacheHitRatio.addCallback((observableResult) => {
    for (const cb of cacheHitRatioCallbacks) {
      try {
        const observations = cb();
        for (const [cacheType, hitRatio] of Object.entries(observations)) {
          observableResult.observe(hitRatio, { cache_type: cacheType });
        }
      } catch {
        // Callback errors should not propagate to the meter
      }
    }
  });

  // ── youngsend_kafka_consumer_lag ──────────────────────────────────────
  const kafkaConsumerLag = meter.createObservableGauge('youngsend_kafka_consumer_lag', {
    description: 'Kafka consumer group lag by topic and consumer group',
    unit: '1',
    valueType: 'int',
  });

  kafkaConsumerLag.addCallback((observableResult) => {
    for (const cb of kafkaConsumerLagCallbacks) {
      try {
        const observations = cb();
        for (const [key, lag] of Object.entries(observations)) {
          const [topic, consumerGroup] = key.split(':');
          if (topic && consumerGroup) {
            observableResult.observe(lag, { topic, consumer_group: consumerGroup });
          }
        }
      } catch {
        // Callback errors should not propagate to the meter
      }
    }
  });

  // ── youngsend_fraud_alerts ───────────────────────────────────────────
  const fraudAlerts = meter.createCounter('youngsend_fraud_alerts', {
    description: 'Count of fraud alerts triggered',
    unit: '1',
    valueType: 'int',
  });

  return {
    paymentTotal,
    paymentAmount,
    requestDuration,
    activeSessions,
    cacheHitRatio,
    kafkaConsumerLag,
    fraudAlerts,
  };
}

// ─── Accessors ──────────────────────────────────────────────────────────────

export function getMeterProvider(): MeterProvider {
  if (!_meterProvider) {
    createMeterProvider();
  }
  return _meterProvider!;
}

export function getMeter(): Meter {
  if (!_meter) {
    createMeterProvider();
  }
  return _meter!;
}

export function getMetrics(): YoungsendMetrics {
  if (!_metrics) {
    createMeterProvider();
  }
  return _metrics!;
}

/**
 * Shutdown the meter provider gracefully, flushing pending exports.
 */
export async function shutdownMetrics(): Promise<void> {
  if (_meterProvider) {
    await _meterProvider.shutdown();
    _meterProvider = null;
    _meter = null;
    _metrics = null;
  }
}

// ─── Convenience Recording Functions ────────────────────────────────────────

/**
 * Record a payment metric (increments counter + records amount histogram).
 */
export function recordPayment(params: {
  provider: string;
  status: string;
  currency: string;
  amount: number;
}): void {
  const m = getMetrics();
  m.paymentTotal.add(1, {
    provider: params.provider,
    status: params.status,
    currency: params.currency,
  });
  m.paymentAmount.record(params.amount, {
    provider: params.provider,
    currency: params.currency,
  });
}

/**
 * Record an HTTP request duration metric.
 */
export function recordRequestDuration(params: {
  route: string;
  method: string;
  status: number;
  durationSeconds: number;
}): void {
  getMetrics().requestDuration.record(params.durationSeconds, {
    route: params.route,
    method: params.method,
    status: String(params.status),
  });
}

/**
 * Increment or decrement active sessions.
 */
export function recordSessionDelta(delta: number): void {
  getMetrics().activeSessions.add(delta);
}

/**
 * Record a fraud alert.
 */
export function recordFraudAlert(params: {
  severity: string;
  type: string;
}): void {
  getMetrics().fraudAlerts.add(1, {
    severity: params.severity,
    type: params.type,
  });
}
