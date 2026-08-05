/**
 * Custom Metrics for Youngsend Fintech Platform
 *
 * In-process in-memory metrics implementation (no @opentelemetry/sdk-metrics dependency).
 * Metrics:
 * - youngsend_payment_total: Counter (provider, status, currency)
 * - youngsend_payment_amount: Histogram (provider, currency, custom buckets)
 * - youngsend_request_duration: Histogram (route, method, status)
 * - youngsend_active_sessions: UpDownCounter
 * - youngsend_cache_hit_ratio: Gauge
 * - youngsend_kafka_consumer_lag: Gauge (topic, consumer_group)
 * - youngsend_fraud_alerts: Counter (severity, type)
 *
 * Provides getMetricsSnapshot() / resetMetrics() for testing and debugging.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

type MeterProvider = { shutdown(): Promise<void> };
type UpDownCounter = { add(value: number, attrs?: Record<string, string>): void };
type Histogram = { record(value: number, attrs?: Record<string, string>): void };
type Counter = { add(value: number, attrs?: Record<string, string>): void };
type ObservableGauge = { addCallback(cb: (result: { observe(value: number, attrs: Record<string, string>): void }) => void): void };
type Meter = {
  createCounter(name: string, opts?: Record<string, unknown>): Counter;
  createHistogram(name: string, opts?: Record<string, unknown>): Histogram;
  createUpDownCounter(name: string, opts?: Record<string, unknown>): UpDownCounter;
  createObservableGauge(name: string, opts?: Record<string, unknown>): ObservableGauge;
};

// ─── Snapshot Types ─────────────────────────────────────────────────────────

export interface CounterSnapshot {
  name: string;
  type: 'counter';
  values: Array<{ attrs: Record<string, string>; value: number }>;
}

export interface HistogramSnapshot {
  name: string;
  type: 'histogram';
  values: Array<{ attrs: Record<string, string>; values: number[] }>;
}

export interface UpDownCounterSnapshot {
  name: string;
  type: 'up_down_counter';
  values: Array<{ attrs: Record<string, string>; value: number }>;
}

export interface GaugeSnapshot {
  name: string;
  type: 'gauge';
  values: Array<{ attrs: Record<string, string>; value: number }>;
}

export type MetricSnapshot = CounterSnapshot | HistogramSnapshot | UpDownCounterSnapshot | GaugeSnapshot;

// ─── In-Memory Metric Storage ───────────────────────────────────────────────

const allMetrics: Map<string, { type: string; data: Map<string, unknown> }> = new Map();

function attrsKey(attrs?: Record<string, string>): string {
  if (!attrs || Object.keys(attrs).length === 0) return '__default__';
  return JSON.stringify(attrs, Object.keys(attrs).sort());
}

function getOrCreateMetric(name: string, type: string): Map<string, unknown> {
  if (!allMetrics.has(name)) {
    allMetrics.set(name, { type, data: new Map() });
  }
  return (allMetrics.get(name)!).data;
}

// ─── In-Memory Implementations ──────────────────────────────────────────────

class InMemoryCounter implements Counter {
 constructor(private readonly _name: string) {}
  add(value: number, attrs?: Record<string, string>): void {
    const data = getOrCreateMetric(this._name, 'counter');
    const key = attrsKey(attrs);
    data.set(key, (data.get(key) as number || 0) + value);
  }
}

class InMemoryHistogram implements Histogram {
  private readonly _name: string;
  private readonly maxSamplesPerKey: number;
  constructor(name: string, maxSamplesPerKey: number = 10_000) {
    this._name = name;
    this.maxSamplesPerKey = maxSamplesPerKey;
  }
  record(value: number, attrs?: Record<string, string>): void {
    const data = getOrCreateMetric(this._name, 'histogram');
    const key = attrsKey(attrs);
    let arr = data.get(key) as number[] | undefined;
    if (!arr) {
      arr = [];
      data.set(key, arr);
    }
    // Cap array size to prevent unbounded memory growth
    if (arr.length >= this.maxSamplesPerKey) {
      // Downsample: keep every other element when hitting the cap
      const downsampled: number[] = [];
      for (let i = 0; i < arr.length; i += 2) downsampled.push(arr[i]);
      downsampled.push(value);
      data.set(key, downsampled);
    } else {
      arr.push(value);
    }
  }
}

class InMemoryUpDownCounter implements UpDownCounter {
  constructor(private readonly _name: string) {}
  add(value: number, attrs?: Record<string, string>): void {
    const data = getOrCreateMetric(this._name, 'up_down_counter');
    const key = attrsKey(attrs);
    data.set(key, (data.get(key) as number || 0) + value);
  }
}

class InMemoryObservableGauge implements ObservableGauge {
  private readonly _callbacks: Array<(result: { observe(value: number, attrs: Record<string, string>): void }) => void> = [];
  constructor(private readonly _name: string) {}
  addCallback(cb: (result: { observe(value: number, attrs: Record<string, string>): void }) => void): void {
    this._callbacks.push(cb);
  }
}

class InMemoryMeter implements Meter {
  createCounter(name: string, _opts?: Record<string, unknown>): Counter {
    return new InMemoryCounter(name);
  }
  createHistogram(name: string, _opts?: Record<string, unknown>): Histogram {
    return new InMemoryHistogram(name);
  }
  createUpDownCounter(name: string, _opts?: Record<string, unknown>): UpDownCounter {
    return new InMemoryUpDownCounter(name);
  }
  createObservableGauge(name: string, _opts?: Record<string, unknown>): ObservableGauge {
    return new InMemoryObservableGauge(name);
  }
}

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

  _meter = new InMemoryMeter();

  _metrics = {
    paymentTotal: _meter.createCounter('youngsend_payment_total'),
    paymentAmount: _meter.createHistogram('youngsend_payment_amount'),
    requestDuration: _meter.createHistogram('youngsend_request_duration'),
    activeSessions: _meter.createUpDownCounter('youngsend_active_sessions'),
    cacheHitRatio: _meter.createObservableGauge('youngsend_cache_hit_ratio'),
    kafkaConsumerLag: _meter.createObservableGauge('youngsend_kafka_consumer_lag'),
    fraudAlerts: _meter.createCounter('youngsend_fraud_alerts'),
  };

  _meterProvider = { shutdown: async () => { allMetrics.clear(); } } as MeterProvider;

  return _meterProvider;
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
 * Return a snapshot of all recorded metrics (useful for testing and debugging).
 */
export function getMetricsSnapshot(): MetricSnapshot[] {
  const result: MetricSnapshot[] = [];
  for (const [name, entry] of allMetrics) {
    if (entry.type === 'counter' || entry.type === 'up_down_counter') {
      const values: Array<{ attrs: Record<string, string>; value: number }> = [];
      for (const [key, val] of entry.data) {
        values.push({
          attrs: key === '__default__' ? {} : JSON.parse(key),
          value: val as number,
        });
      }
      result.push({ name, type: entry.type as 'counter' | 'up_down_counter', values });
    } else if (entry.type === 'histogram') {
      const values: Array<{ attrs: Record<string, string>; values: number[] }> = [];
      for (const [key, val] of entry.data) {
        values.push({
          attrs: key === '__default__' ? {} : JSON.parse(key),
          values: [...(val as number[])],
        });
      }
      result.push({ name, type: 'histogram', values });
    } else if (entry.type === 'gauge') {
      const values: Array<{ attrs: Record<string, string>; value: number }> = [];
      for (const [key, val] of entry.data) {
        values.push({
          attrs: key === '__default__' ? {} : JSON.parse(key),
          value: val as number,
        });
      }
      result.push({ name, type: 'gauge', values });
    }
  }
  return result;
}

/**
 * Clear all recorded metric data.
 */
export function resetMetrics(): void {
  allMetrics.clear();
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
