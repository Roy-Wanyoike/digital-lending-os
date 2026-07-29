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

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  Link,
  ReadableSpan,
  SpanKind,
} from '@opentelemetry/sdk-trace-base';
import { Span, SpanOptions, Tracer, trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { NextRequest } from 'next/server';

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

// ─── Error-Aware Sampling Strategy ──────────────────────────────────────────
// 100% for error spans, 10% for success spans, parent-based

class ErrorAwareSampler implements Sampler {
  private readonly ratioSampler: TraceIdRatioBasedSampler;
  private readonly parentBased: ParentBasedSampler;

  constructor(ratio: number = 0.1) {
    this.ratioSampler = new TraceIdRatioBasedSampler(ratio);
    this.parentBased = new ParentBasedSampler({
      root: this.ratioSampler,
      remoteParentSampled: this.ratioSampler,
      remoteParentNotSampled: this.ratioSampler,
    });
  }

  shouldSample(
    parentContext: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Record<string, unknown>,
    links: Link[]
  ): SamplingResult {
    // Always sample error-indicating spans
    if (
      attributes['http.status_code'] &&
      Number(attributes['http.status_code']) >= 400
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED, attributes: {} };
    }

    if (
      attributes['error'] === true ||
      attributes['exception.type'] !== undefined ||
      spanName.includes('error') ||
      spanName.includes('fail')
    ) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED, attributes: {} };
    }

    return this.parentBased.shouldSample(
      parentContext,
      traceId,
      spanName,
      spanKind,
      attributes,
      links
    );
  }

  toString(): string {
    return `ErrorAwareSampler{ratio=${0.1}}`;
  }
}

// ─── Provider Singleton ─────────────────────────────────────────────────────

let _provider: NodeTracerProvider | null = null;
let _tracer: Tracer | null = null;

export interface TracerConfig {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  otlpEndpoint?: string;
  sampleRate?: number;
}

export function createTracerProvider(config: TracerConfig = {}): NodeTracerProvider {
  const serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'youngsend-api';
  const serviceVersion = config.serviceVersion || process.env.npm_package_version || '0.1.0';
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const sampleRate = config.sampleRate ?? parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '0.1');

  if (_provider) {
    return _provider;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: environment,
    'host.id': process.env.HOSTNAME || process.env.HOST_ID || 'unknown',
    'service.namespace': 'youngsend',
    'service.instance.id': `${serviceName}-${process.pid}`,
  });

  const provider = new NodeTracerProvider({
    resource,
    sampler: new ErrorAwareSampler(sampleRate),
  });

  // Add span processors
  if (otlpEndpoint) {
    const otlpExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
    });
    provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }));
  }

  // Always add console exporter in development
  if (environment === 'development') {
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  provider.register();

  _provider = provider;
  _tracer = trace.getTracer(serviceName, serviceVersion);

  return provider;
}

export function getTracer(): Tracer {
  if (!_tracer) {
    createTracerProvider();
  }
  return _tracer!;
}

// ─── Fintech Span Helpers ───────────────────────────────────────────────────

export interface FintechSpanOptions extends SpanOptions {
  tenantId?: string;
  userId?: string;
  paymentId?: string;
  walletId?: string;
  escrowId?: string;
  provider?: string;
  currency?: string;
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
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Create an HTTP span for a Next.js API route.
 * Extracts trace context from incoming request headers.
 */
export function createHttpSpan(request: NextRequest, route: string): Span {
  const tracer = getTracer();
  const url = new URL(request.url);
  const method = request.method;

  const span = tracer.startSpan(`HTTP ${method} ${route}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': method,
      'http.url': url.href,
      'http.route': route,
      'http.host': url.host,
      'http.scheme': url.protocol.replace(':', ''),
      'http.target': url.pathname + url.search,
      'http.user_agent': request.headers.get('user-agent') || 'unknown',
      'http.client_ip': request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      'http.request_content_length': request.headers.get('content-length'),
    },
  });

  return span;
}

/**
 * Shutdown the tracer provider gracefully.
 */
export async function shutdownTracer(): Promise<void> {
  if (_provider) {
    await _provider.shutdown();
    _provider = null;
    _tracer = null;
  }
}
