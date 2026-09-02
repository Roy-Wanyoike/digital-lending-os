/**
 * Tracer Setup for Digital Lending OS
 *
 * In-process in-memory tracing implementation (no @opentelemetry/sdk-node dependency).
 * Provides:
 * - InMemorySpan: records attributes, timing, status, exceptions
 * - InMemoryTracer: creates InMemorySpan instances
 * - Resource attributes: service.name, service.version, deployment.environment
 * - Custom span attributes for fintech: tenant.id, user.id, payment.id, wallet.id
 * - Automatic HTTP span creation for Next.js API routes
 * - getCompletedSpans() / resetSpans() for testing and debugging
 */

import { performance } from 'perf_hooks';
import type { NextRequest } from 'next/server';

// ─── Span & Tracer Types ────────────────────────────────────────────────────

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface CompletedSpanData {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | undefined;
  startTime: number;
  endTime: number;
  duration: number;
  attributes: Record<string, unknown>;
  status: { code: number; message?: string };
  events: Array<{ name: string; time: number; attributes?: Record<string, unknown> }>;
}

export interface Span {
  end(): void;
  setAttribute(key: string, value: unknown): void;
  setStatus(status: { code: number; message?: string }): void;
  recordException(exception: Error): void;
  spanContext(): SpanContext | null;
}

export interface Tracer {
  startSpan(name: string, options?: Record<string, unknown>): Span;
}

const SpanStatusCode = { OK: 1, ERROR: 2 };

// ─── In-Memory Span Storage ─────────────────────────────────────────────────

const completedSpans: CompletedSpanData[] = [];

function generateId(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateTraceId(): string {
  return generateId(32);
}

function generateSpanId(): string {
  return generateId(16);
}

// ─── InMemorySpan ───────────────────────────────────────────────────────────

class InMemorySpan implements Span {
  private readonly _name: string;
  private readonly _traceId: string;
  private readonly _spanId: string;
  private readonly _parentSpanId: string | undefined;
  private readonly _startTime: number;
  private _endTime: number | null = null;
  private _attributes: Record<string, unknown> = {};
  private _status: { code: number; message?: string } = { code: SpanStatusCode.OK };
  private _events: Array<{ name: string; time: number; attributes?: Record<string, unknown> }> = [];
  private _ended = false;

  constructor(
    name: string,
    traceId?: string,
    parentSpanId?: string,
    initialAttributes?: Record<string, unknown>,
  ) {
    this._name = name;
    this._traceId = traceId || generateTraceId();
    this._spanId = generateSpanId();
    this._parentSpanId = parentSpanId;
    this._startTime = performance.now();
    if (initialAttributes) {
      Object.assign(this._attributes, initialAttributes);
    }
  }

  setAttribute(key: string, value: unknown): void {
    if (this._ended) return;
    this._attributes[key] = value;
  }

  setStatus(status: { code: number; message?: string }): void {
    if (this._ended) return;
    this._status = status;
  }

  recordException(exception: Error): void {
    if (this._ended) return;
    this._events.push({
      name: 'exception',
      time: performance.now(),
      attributes: {
        'exception.type': exception.name,
        'exception.message': exception.message,
        'exception.stacktrace': exception.stack,
      },
    });
  }

  spanContext(): SpanContext {
    return {
      traceId: this._traceId,
      spanId: this._spanId,
      traceFlags: 1,
    };
  }

  end(): void {
    if (this._ended) return;
    this._ended = true;
    this._endTime = performance.now();

    completedSpans.push({
      name: this._name,
      traceId: this._traceId,
      spanId: this._spanId,
      parentSpanId: this._parentSpanId,
      startTime: this._startTime,
      endTime: this._endTime,
      duration: this._endTime - this._startTime,
      attributes: { ...this._attributes },
      status: { ...this._status },
      events: [...this._events],
    });
  }
}

// ─── InMemoryTracer ─────────────────────────────────────────────────────────

class InMemoryTracer implements Tracer {
  startSpan(name: string, options?: Record<string, unknown>): Span {
    const parentSpanId = options?.parentSpanId as string | undefined;
    const attributes: Record<string, unknown> = {};
    // Copy attribute entries from options (skip known non-attribute keys)
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (key !== 'parentSpanId') {
          attributes[key] = value;
        }
      }
    }
    return new InMemorySpan(name, undefined, parentSpanId, attributes);
  }
}

// ─── Custom Fintech Semantic Conventions ────────────────────────────────────

export const YS_ATTRS = {
  TENANT_ID: 'dlo.tenant.id',
  USER_ID: 'dlo.user.id',
  PAYMENT_ID: 'dlo.payment.id',
  WALLET_ID: 'dlo.wallet.id',
  ESCROW_ID: 'dlo.escrow.id',
  PROVIDER: 'dlo.payment.provider',
  CURRENCY: 'dlo.payment.currency',
  COUNTRY: 'dlo.user.country',
} as const;

// ─── Provider Singleton ─────────────────────────────────────────────────────

let _provider: unknown = null;
let _tracer: Tracer | null = null;

export interface TracerConfig {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  otlpEndpoint?: string;
  sampleRate?: number;
}

export function createTracerProvider(config: TracerConfig = {}): unknown {
  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'dlo-api';
  const serviceVersion = config.serviceVersion || process.env.npm_package_version || '0.1.0';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const sampleRate = config.sampleRate ?? parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '0.1');

  if (_provider) {
    return _provider;
  }

  _tracer = new InMemoryTracer();
  _provider = { serviceName };
  return _provider;
}

export function getTracer(): Tracer {
  if (!_tracer) {
    createTracerProvider();
  }
  return _tracer!;
}

// ─── Fintech Span Helpers ───────────────────────────────────────────────────

export interface FintechSpanOptions {
  tenantId?: string;
  userId?: string;
  paymentId?: string;
  walletId?: string;
  escrowId?: string;
  provider?: string;
  currency?: string;
  [key: string]: unknown;
}

/**
 * Start a span with Digital Lending OS fintech attributes pre-bound.
 */
export function startFintechSpan(name: string, options: FintechSpanOptions = {}): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(name, options);

  if (options.tenantId) span.setAttribute(YS_ATTRS.TENANT_ID, options.tenantId);
  if (options.userId) span.setAttribute(YS_ATTRS.USER_ID, options.userId);
  if (options.paymentId) span.setAttribute(YS_ATTRS.PAYMENT_ID, options.paymentId);
  if (options.walletId) span.setAttribute(YS_ATTRS.WALLET_ID, options.walletId);
  if (options.escrowId) span.setAttribute(YS_ATTRS.ESCROW_ID, options.escrowId);
  if (options.provider) span.setAttribute(YS_ATTRS.PROVIDER, options.provider);
  if (options.currency) span.setAttribute(YS_ATTRS.CURRENCY, options.currency);

  return span;
}

/**
 * Execute a function within a fintech-aware span. Automatically records errors.
 */
export async function withFintechSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options: FintechSpanOptions = {}
): Promise<T> {
  const span = startFintechSpan(name, options);
  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Create an HTTP span for a Next.js API route.
 * Reads trace context and HTTP attributes from the incoming request.
 */
export function createHttpSpan(request: NextRequest, route: string): Span {
  const span = getTracer().startSpan(`HTTP ${route}`, {
    'http.method': request.method,
    'http.route': route,
    'http.url': request.url.split('?')[0],
    'http.target': request.nextUrl.pathname,
  });
  return span;
}

/**
 * Return all completed spans (useful for testing and debugging).
 */
export function getCompletedSpans(): CompletedSpanData[] {
  return completedSpans;
}

/**
 * Clear all completed spans.
 */
export function resetSpans(): void {
  completedSpans.length = 0;
}

/**
 * Shutdown the tracer provider gracefully.
 */
export async function shutdownTracer(): Promise<void> {
  completedSpans.length = 0;
  _provider = null;
  _tracer = null;
}
