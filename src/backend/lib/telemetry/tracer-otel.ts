/**
 * OpenTelemetry Tracer for Digital Lending OS
 *
 * Provides a `tracer` object that:
 * - Uses real OTel spans when the SDK is configured (OTEL_EXPORTER_OTLP_ENDPOINT set)
 * - Falls back to in-memory spans when OTel is not configured
 *
 * API:
 *   tracer.startSpan(name, options?)
 *   tracer.endSpan(span, status?)
 *   tracer.getActiveSpan()
 *   tracer.getTraceId()
 *   tracer.getTraceContext()
 *   tracer.recordException(span, error)
 *   tracer.setAttributes(span, attrs)
 *   tracer.createChildSpan(parent, name)
 */

import { trace, context, SpanStatusCode, type Span, type SpanOptions, type Context, type Tracer as OTelTracer, type Attributes } from '@opentelemetry/api';
import { isOtelConfigured } from './otel-config';

// ─── Re-export the existing in-memory types from tracer.ts ───────────────

export type { SpanContext, CompletedSpanData, Span as InMemorySpan, Tracer, FintechSpanOptions, TracerConfig } from './tracer';
export { YS_ATTRS, startFintechSpan, withFintechSpan, createHttpSpan, getCompletedSpans, resetSpans, shutdownTracer, getTracer, createTracerProvider } from './tracer';

// ─── Unified Span type ───────────────────────────────────────────────────

/** A span that is either a real OTel span or an in-memory span */
export type AnySpan = Span;

/** Status passed to endSpan */
export interface SpanEndStatus {
  code: SpanStatusCode;
  message?: string;
}

/** Trace context returned by getTraceContext */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

/** Options for startSpan */
export interface StartSpanOptions {
  attributes?: Attributes;
  kind?: number;
  parentContext?: Context;
  startTime?: number;
}

// ─── In-memory fallback (reuses existing InMemoryTracer) ──────────────────

import { getTracer as getInMemoryTracer } from './tracer';
import type { Span as InMemorySpanType } from './tracer';

const useOtel = isOtelConfigured();

/**
 * The unified tracer object.
 *
 * When OTel is configured (OTEL_EXPORTER_OTLP_ENDPOINT set), operations
 * use the real @opentelemetry/api. Otherwise, they fall back to the
 * in-memory implementation from tracer.ts.
 */
export const tracer = {
  /**
   * Start a new span.
   * When OTel is active, the span is managed by the global context.
   * When OTel is not active, returns an in-memory span.
   */
  startSpan(name: string, options?: StartSpanOptions): AnySpan {
    if (useOtel) {
      const otelTracer: OTelTracer = trace.getTracer('dlo-api');
      const spanOptions: SpanOptions = {};
      if (options?.attributes) {
        spanOptions.attributes = options.attributes;
      }
      if (options?.kind !== undefined) {
        spanOptions.kind = options.kind;
      }
      if (options?.parentContext) {
        return otelTracer.startSpan(name, spanOptions, options.parentContext);
      }
      return otelTracer.startSpan(name, spanOptions);
    }
    // Fallback: in-memory
    return getInMemoryTracer().startSpan(name, options as Record<string, unknown>) as unknown as AnySpan;
  },

  /**
   * End a span with optional status.
   */
  endSpan(span: AnySpan, status?: { code: number; message?: string }): void {
    if (useOtel) {
      if (status && status.code !== undefined) {
        span.setStatus({
          code: status.code as SpanStatusCode,
          message: status.message,
        });
      }
      span.end();
    } else {
      // In-memory span
      const memSpan = span as unknown as InMemorySpanType;
      if (status) {
        memSpan.setStatus({
          code: status.code,
          message: status.message,
        });
      }
      memSpan.end();
    }
  },

  /**
   * Get the currently active span from context.
   */
  getActiveSpan(): AnySpan | undefined {
    if (useOtel) {
      return trace.getSpan(context.active());
    }
    return undefined;
  },

  /**
   * Get the current trace ID from the active span.
   */
  getTraceId(): string | undefined {
    const span = this.getActiveSpan();
    if (!span) return undefined;
    const sc = span.spanContext();
    return sc?.traceId;
  },

  /**
   * Get the full trace context (traceId, spanId, traceFlags).
   */
  getTraceContext(): TraceContext | undefined {
    const span = this.getActiveSpan();
    if (!span) return undefined;
    const sc = span.spanContext();
    if (!sc) return undefined;
    return {
      traceId: sc.traceId,
      spanId: sc.spanId,
      traceFlags: sc.traceFlags,
    };
  },

  /**
   * Record an exception on a span.
   */
  recordException(span: AnySpan, error: Error): void {
    if (useOtel) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    } else {
      const memSpan = span as unknown as InMemorySpanType;
      memSpan.recordException(error);
    }
  },

  /**
   * Set attributes on a span.
   */
  setAttributes(span: AnySpan, attrs: Attributes): void {
    if (useOtel) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined) {
          span.setAttribute(key, value);
        }
      }
    } else {
      const memSpan = span as unknown as InMemorySpanType;
      for (const [key, value] of Object.entries(attrs)) {
        memSpan.setAttribute(key, value);
      }
    }
  },

  /**
   * Create a child span from a parent span.
   */
  createChildSpan(parent: AnySpan, name: string): AnySpan {
    if (useOtel) {
      const otelTracer: OTelTracer = trace.getTracer('dlo-api');
      const ctx = trace.setSpan(context.active(), parent);
      return otelTracer.startSpan(name, undefined, ctx);
    }
    // In-memory fallback — use parentSpanId
    return getInMemoryTracer().startSpan(name, {
      parentSpanId: (parent as unknown as InMemorySpanType).spanContext()?.spanId,
    }) as unknown as AnySpan;
  },

  /**
   * Run a function within a new span context.
   */
  withSpan<T>(name: string, fn: (span: AnySpan) => T, options?: StartSpanOptions): T {
    const span = this.startSpan(name, options);
    try {
      if (useOtel) {
        const ctx = trace.setSpan(context.active(), span);
        return context.with(ctx, () => fn(span));
      }
      return fn(span);
    } catch (err) {
      if (err instanceof Error) {
        this.recordException(span, err);
      }
      throw err;
    } finally {
      this.endSpan(span);
    }
  },
};
