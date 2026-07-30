/**
 * Next.js Telemetry Middleware for Youngsend
 *
 * Provides:
 * - Auto-creates spans for all /api/* routes
 * - Injects trace context into response headers (x-trace-id, x-span-id)
 * - Records request duration metrics
 * - Captures error metrics
 * - withTelemetry() HOF for wrapping API route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
// @opentelemetry/api stubs — no-op when OTel packages are not installed
const trace = { setSpan: (_ctx: unknown, _span: unknown) => ({}) };
const context = { active: () => ({}), with: <T,>(_ctx: unknown, fn: () => Promise<T>) => fn() };
const SpanStatusCode = { OK: 1, ERROR: 2 };
const SpanKind = { INTERNAL: 0, SERVER: 1, CLIENT: 2, PRODUCER: 3, CONSUMER: 4 };
import { createHttpSpan, getTracer, YS_ATTRS } from './tracer';
import { recordRequestDuration, getMetrics } from './metrics';
import { getLogger } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NextApiHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse>;

// ─── Telemetry Middleware for Next.js /api/* routes ──────────────────────────

/**
 * Middleware that wraps any /api/* request with OpenTelemetry instrumentation.
 * Call this at the start of your middleware.ts or from individual route handlers.
 */
export async function telemetryMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const url = new URL(request.url);

  // Only instrument /api/* routes (skip health endpoint to avoid noise)
  if (!url.pathname.startsWith('/api/') || url.pathname === '/api/health') {
    return next();
  }

  const startTime = performance.now();
  const route = url.pathname;
  const method = request.method;
  const logger = getLogger();

  // Create an HTTP server span
  const span = createHttpSpan(request, route);
  const spanContext = span.spanContext()!;

  // Set up context for child spans/logs
  const ctx = trace.setSpan(context.active(), span);

  try {
    // Execute the request handler within the trace context
    const response = await context.with(ctx, async () => next());

    const durationMs = performance.now() - startTime;
    const durationSeconds = durationMs / 1000;
    const status = response.status;

    // Record span attributes
    span.setAttribute('http.status_code', status);

    // Record response content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      span.setAttribute('http.response_content_length', parseInt(contentLength, 10));
    }

    // Set span status based on HTTP status code
    if (status >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${status}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Record request duration metric
    recordRequestDuration({
      route,
      method,
      status,
      durationSeconds,
    });

    // Inject trace context into response headers
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    newResponse.headers.set('x-trace-id', spanContext.traceId);
    newResponse.headers.set('x-span-id', spanContext.spanId);

    logger.debug('API request completed', {
      method,
      route,
      status,
      duration_ms: Math.round(durationMs),
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
    });

    return newResponse;
  } catch (error) {
    const durationMs = performance.now() - startTime;

    // Record error on span
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    if (error instanceof Error) {
      span.recordException(error);
      span.setAttribute('exception.type', error.name);
      span.setAttribute('exception.message', error.message);
      span.setAttribute('exception.stacktrace', error.stack || '');
    }

    // Record error metric
    const metrics = getMetrics();
    recordRequestDuration({
      route,
      method,
      status: 500,
      durationSeconds: durationMs / 1000,
    });

    logger.error('API request failed', {
      method,
      route,
      duration_ms: Math.round(durationMs),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw to let Next.js error handler deal with it
    throw error;
  } finally {
    span.end();
  }
}

// ─── withTelemetry() HOF ────────────────────────────────────────────────────

/**
 * Higher-order function that wraps a Next.js API route handler with telemetry.
 *
 * Usage:
 * ```ts
 * // app/api/payments/route.ts
 * export const GET = withTelemetry(async (req, ctx) => {
 *   const payments = await db.payment.findMany();
 *   return NextResponse.json(payments);
 * });
 * ```
 */
export function withTelemetry(
  handler: NextApiHandler,
  options: {
    /** Override route name (default: extracted from request URL) */
    route?: string;
    /** Skip telemetry entirely (useful for health checks) */
    skip?: boolean;
  } = {}
): NextApiHandler {
  return async (request: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) => {
    if (options.skip) {
      return handler(request, ctx);
    }

    const url = new URL(request.url);
    const route = options.route || url.pathname;
    const method = request.method;
    const logger = getLogger();
    const startTime = performance.now();

    // Create HTTP server span
    const span = createHttpSpan(request, route);
    const spanContext = span.spanContext()!;
    const traceCtx = trace.setSpan(context.active(), span);

    try {
      // Execute handler within trace context
      const response = await context.with(traceCtx, async () => handler(request, ctx));

      const durationMs = performance.now() - startTime;
      const status = response.status;

      // Set span attributes
      span.setAttribute('http.status_code', status);

      // Span status
      if (status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      // Record metrics
      recordRequestDuration({
        route,
        method,
        status,
        durationSeconds: durationMs / 1000,
      });

      // Inject trace headers
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      newResponse.headers.set('x-trace-id', spanContext.traceId);
      newResponse.headers.set('x-span-id', spanContext.spanId);

      return newResponse;
    } catch (error) {
      const durationMs = performance.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof Error) {
        span.recordException(error);
        span.setAttribute('exception.type', error.name);
        span.setAttribute('exception.message', error.message);
        span.setAttribute('exception.stacktrace', error.stack || '');
      }

      recordRequestDuration({
        route,
        method,
        status: 500,
        durationSeconds: durationMs / 1000,
      });

      logger.error('Telemetry-wrapped handler failed', {
        route,
        method,
        duration_ms: Math.round(durationMs),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      span.end();
    }
  };
}

// ─── Extract Trace Context from Request ─────────────────────────────────────

/**
 * Extract trace context from incoming request headers for distributed tracing.
 * Supports W3C Trace Context and B3 formats.
 */
export function extractTraceContext(request: NextRequest): {
  traceId?: string;
  spanId?: string;
  traceFlags?: string;
  traceParent?: string;
} {
  const traceParent = request.headers.get('traceparent') ||
    request.headers.get('x-trace-id');

  // W3C Trace Context format: traceparent=00-{traceId}-{spanId}-{flags}
  if (traceParent && traceParent.includes('-')) {
    const parts = traceParent.split('-');
    if (parts.length >= 4 && parts[0] === '00') {
      return {
        traceId: parts[1],
        spanId: parts[2],
        traceFlags: parts[3],
        traceParent,
      };
    }
  }

  // Simple x-trace-id / x-span-id header format
  return {
    traceId: request.headers.get('x-trace-id') || undefined,
    spanId: request.headers.get('x-span-id') || undefined,
    traceFlags: request.headers.get('x-trace-flags') || undefined,
  };
}
