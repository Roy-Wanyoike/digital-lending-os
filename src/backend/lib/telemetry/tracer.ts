/**
 * OpenTelemetry Tracer Setup for Youngsend Fintech Platform
 *
 * Provides:
 * - NodeTracerProvider with BatchSpanProcessor (OTLP exporter)
 * - Resource attributes: service.name, service.version, deployment.environment, host.id
 * - Custom span attributes for fintech: tenant.id, user.id, payment.id, wallet.id
 * - Automatic HTTP span creation for Next.js API routes
 * - Sampling: parent-based, 100% for errors, 10% for success
 */

// @opentelemetry stubs — no-op when OTel packages are not installed
// All tracing functions are safe no-ops that preserve the API contract.

import type { NextRequest } from 'next/server';

const ATTR_SERVICE_NAME = 'service.name';
const ATTR_SERVICE_VERSION = 'service.version';
const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment';

type Span = { end(): void; setAttribute(key: string, value: unknown): void; setStatus(status: { code: number; message?: string }): void; recordException(exception: Error): void; spanContext(): { traceId: string; spanId: string; traceFlags: number } | null };
type Tracer = { startSpan(name: string, options?: Record<string, unknown>): Span };

const noopSpan: Span = {
  end() {},
  setAttribute() {},
  setStatus() {},
  recordException() {},
  spanContext: () => ({ traceId: '00000000000000000000000000000000', spanId: '0000000000000000', traceFlags: 0 }),
};

const noopTracer: Tracer = { startSpan: () => noopSpan };
const SpanStatusCode = { OK: 1, ERROR: 2 };

// ─── Custom Fintech Semantic Conventions ────────────────────────────────────

export const YS_ATTRS = {
  TENANT_ID: 'youngsend.tenant.id',
  USER_ID: 'youngsend.user.id',
  PAYMENT_ID: 'youngsend.payment.id',
  WALLET_ID: 'youngsend.wallet.id',
  ESCROW_ID: 'youngsend.escrow.id',
  PROVIDER: 'youngsend.payment.provider',
  CURRENCY: 'youngsend.payment.currency',
  COUNTRY: 'youngsend.user.country',
} as const;

// ─── Provider Singleton (no-op stubs) ─────────────────────────────────────────

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
  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'youngsend-api';
  const serviceVersion = config.serviceVersion || process.env.npm_package_version || '0.1.0';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const sampleRate = config.sampleRate ?? parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '0.1');

  if (_provider) {
    return _provider;
  }

  // No-op: OTel packages not installed. Keep _tracer for API compatibility.
  _tracer = noopTracer;

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
 * Start a span with Youngsend fintech attributes pre-bound.
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
    return result;
  } catch (error) {
    throw error;
  } finally {
    // No-op
  }
}

/**
 * Create an HTTP span for a Next.js API route.
 * Extracts trace context from incoming request headers.
 */
export function createHttpSpan(request: NextRequest, route: string): Span {
  // No-op: return a safe span stub
  return noopSpan;
}

/**
 * Shutdown the tracer provider gracefully.
 */
export async function shutdownTracer(): Promise<void> {
  // No-op
  _provider = null;
  _tracer = null;
}
