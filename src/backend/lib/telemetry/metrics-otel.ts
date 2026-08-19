/**
 * OpenTelemetry Metrics for Youngsend Fintech Platform
 *
 * Provides a `metrics` object that:
 * - Uses real OTel instruments when the SDK is configured
 * - Falls back to in-memory instruments when OTel is not configured
 *
 * Pre-defined standard metrics:
 * - http_requests_total (counter)
 * - http_request_duration_ms (histogram)
 * - db_query_duration_ms (histogram)
 * - active_websocket_connections (gauge)
 * - cache_hit_total (counter)
 * - cache_miss_total (counter)
 */

import { metrics as otelMetrics, ValueType } from '@opentelemetry/api';
import { isOtelConfigured } from './otel-config';

// ─── Re-export existing types from metrics.ts ───────────────────────────

export type { MetricsConfig, MetricSnapshot, CounterSnapshot, HistogramSnapshot, UpDownCounterSnapshot, GaugeSnapshot } from './metrics';
export {
  getMetrics,
  getMeter,
  getMeterProvider,
  createMeterProvider,
  recordPayment,
  recordRequestDuration,
  recordSessionDelta,
  recordFraudAlert,
  registerCacheHitRatioCallback,
  registerKafkaConsumerLagCallback,
  getMetricsSnapshot,
  resetMetrics,
  shutdownMetrics,
} from './metrics';

// ─── OTel Instrument Types ───────────────────────────────────────────────

import type { Counter as OTelCounter, Histogram as OTelHistogram, UpDownCounter as OTelUpDownCounter, ObservableGauge as OTelObservableGauge } from '@opentelemetry/api';

// In-memory instrument types (from existing metrics.ts)
import { getMeter as getInMemoryMeter } from './metrics';
type IMCounter = ReturnType<ReturnType<typeof getInMemoryMeter>['createCounter']>;
type IMHistogram = ReturnType<ReturnType<typeof getInMemoryMeter>['createHistogram']>;
type IMUpDownCounter = ReturnType<ReturnType<typeof getInMemoryMeter>['createUpDownCounter']>;

type AnyCounter = OTelCounter | IMCounter;
type AnyHistogram = OTelHistogram | IMHistogram;
type AnyUpDownCounter = OTelUpDownCounter | IMUpDownCounter;
type AnyObservableGauge = OTelObservableGauge;

// ─── Unified Metrics Interface ───────────────────────────────────────────

const useOtel = isOtelConfigured();

/** Attributes for metric operations */
export type MetricAttributes = Record<string, string | number | boolean>;

/** Options for creating instruments */
export interface CreateInstrumentOptions {
  description?: string;
  unit?: string;
  /** Explicit bucket boundaries for histograms */
  buckets?: number[];
}

/**
 * The unified metrics object.
 */
export const metrics = {
  // ─── Instrument Factories ─────────────────────────────────────────────

  /**
   * Create a counter instrument.
   */
  counter(name: string, description?: string, unit?: string): AnyCounter {
    if (useOtel) {
      const meter = otelMetrics.getMeter('youngsend-api');
      return meter.createCounter(name, {
        description: description || '',
        unit: unit || '1',
        valueType: ValueType.INT,
      });
    }
    return getInMemoryMeter().createCounter(name, { description, unit });
  },

  /**
   * Create a histogram instrument.
   */
  histogram(name: string, description?: string, unit?: string, buckets?: number[]): AnyHistogram {
    if (useOtel) {
      const meter = otelMetrics.getMeter('youngsend-api');
      return meter.createHistogram(name, {
        description: description || '',
        unit: unit || 'ms',
        valueType: ValueType.DOUBLE,
        advice: buckets ? { explicitBucketBoundaries: buckets } : undefined,
      });
    }
    return getInMemoryMeter().createHistogram(name, { description, unit });
  },

  /**
   * Create a gauge instrument.
   */
  gauge(name: string, description?: string, unit?: string): AnyObservableGauge {
    const meter = useOtel
      ? otelMetrics.getMeter('youngsend-api')
      : getInMemoryMeter() as unknown as { createObservableGauge(n: string, o?: Record<string, unknown>): AnyObservableGauge };

    if (useOtel) {
      return otelMetrics.getMeter('youngsend-api').createObservableGauge(name, {
        description: description || '',
        unit: unit || '1',
        valueType: ValueType.DOUBLE,
      });
    }
    return (meter as unknown as { createObservableGauge(n: string, o?: Record<string, unknown>): AnyObservableGauge }).createObservableGauge(name, { description, unit });
  },

  // ─── Recording Operations ────────────────────────────────────────────

  /**
   * Increment a counter.
   */
  incrementCounter(counter: AnyCounter, value: number = 1, attributes?: MetricAttributes): void {
    if (useOtel && 'add' in counter && typeof counter.add === 'function') {
      (counter as OTelCounter).add(value, attributes);
    } else {
      // In-memory counter expects Record<string, string>
      const strAttrs = attributes ? Object.fromEntries(
        Object.entries(attributes).map(([k, v]) => [k, String(v)])
      ) : undefined;
      (counter as IMCounter).add(value, strAttrs);
    }
  },

  /**
   * Record a value in a histogram.
   */
  recordHistogram(histogram: AnyHistogram, value: number, attributes?: MetricAttributes): void {
    if (useOtel && 'record' in histogram && typeof histogram.record === 'function') {
      (histogram as OTelHistogram).record(value, attributes);
    } else {
      const strAttrs = attributes ? Object.fromEntries(
        Object.entries(attributes).map(([k, v]) => [k, String(v)])
      ) : undefined;
      (histogram as IMHistogram).record(value, strAttrs);
    }
  },

  /**
   * Record a value in a gauge.
   */
  recordGauge(gauge: AnyObservableGauge, value: number, attributes?: MetricAttributes): void {
    // ObservableGauges work via callbacks, not direct recording.
    // For in-memory gauges, we record directly.
    // For OTel, this is a no-op — use addCallback instead.
    if (!useOtel && 'observe' in gauge && typeof (gauge as unknown as { observe(v: number, a: Record<string, string>): void }).observe === 'function') {
      const strAttrs = attributes ? Object.fromEntries(
        Object.entries(attributes).map(([k, v]) => [k, String(v)])
      ) : {};
      (gauge as unknown as { observe(v: number, a: Record<string, string>): void }).observe(value, strAttrs);
    }
  },
};

// ─── Pre-defined Standard Metrics ───────────────────────────────────────

export const standardMetrics = {
  /** Total HTTP requests (counter) — attrs: method, route, status_code */
  httpRequestsTotal: metrics.counter(
    'http_requests_total',
    'Total count of HTTP requests',
    '1'
  ) as AnyCounter,

  /** HTTP request duration in milliseconds (histogram) — attrs: method, route */
  httpRequestDurationMs: metrics.histogram(
    'http_request_duration_ms',
    'HTTP request duration in milliseconds',
    'ms',
    [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
  ) as AnyHistogram,

  /** Database query duration in milliseconds (histogram) — attrs: query_type, model */
  dbQueryDurationMs: metrics.histogram(
    'db_query_duration_ms',
    'Database query duration in milliseconds',
    'ms',
    [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000]
  ) as AnyHistogram,

  /** Active WebSocket connections (gauge) */
  activeWebsocketConnections: metrics.gauge(
    'active_websocket_connections',
    'Number of active WebSocket connections',
    '1'
  ) as AnyObservableGauge,

  /** Cache hits (counter) — attrs: cache_type, operation */
  cacheHitTotal: metrics.counter(
    'cache_hit_total',
    'Total cache hits',
    '1'
  ) as AnyCounter,

  /** Cache misses (counter) — attrs: cache_type, operation */
  cacheMissTotal: metrics.counter(
    'cache_miss_total',
    'Total cache misses',
    '1'
  ) as AnyCounter,
};
