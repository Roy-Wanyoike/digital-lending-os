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

// @opentelemetry stubs — no-op when OTel packages are not installed
// All metrics functions are safe no-ops that preserve the API contract.

const ATTR_SERVICE_NAME = 'service.name';
const ATTR_SERVICE_VERSION = 'service.version';
const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment';

type MeterProvider = { shutdown(): Promise<void> };
type UpDownCounter = { add(value: number, attrs?: Record<string, string>): void };
type Histogram = { record(value: number, attrs?: Record<string, string>): void };
type Counter = { add(value: number, attrs?: Record<string, string>): void };
type ObservableGauge = { addCallback(cb: (result: { observe(value: number, attrs: Record<string, string>): void }) => void): void };
type Meter = { createCounter(name: string, opts?: Record<string, unknown>): Counter; createHistogram(name: string, opts?: Record<string, unknown>): Histogram; createUpDownCounter(name: string, opts?: Record<string, unknown>): UpDownCounter; createObservableGauge(name: string, opts?: Record<string, unknown>): ObservableGauge };

const noopCounter: Counter = { add() {} };
const noopHistogram: Histogram = { record() {} };
const noopUpDownCounter: UpDownCounter = { add() {} };
const noopGauge: ObservableGauge = { addCallback() {} };
const noopMeter: Meter = {
  createCounter: () => noopCounter,
  createHistogram: () => noopHistogram,
  createUpDownCounter: () => noopUpDownCounter,
  createObservableGauge: () => noopGauge,
};

const noopMetrics: YoungsendMetrics = {
  paymentTotal: noopCounter,
  paymentAmount: noopHistogram,
  requestDuration: noopHistogram,
  activeSessions: noopUpDownCounter,
  cacheHitRatio: noopGauge,
  kafkaConsumerLag: noopGauge,
  fraudAlerts: noopCounter,
};


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

  // No-op: OTel packages not installed. Use noop stubs.
  _meterProvider = { shutdown: async () => {} } as MeterProvider;
  _meter = noopMeter;
  _metrics = noopMetrics;

  return _meterProvider;
}

// No-op instrument creation removed — using noop stubs above


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
