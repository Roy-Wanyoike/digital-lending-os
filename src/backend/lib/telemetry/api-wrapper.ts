/**
 * Lightweight API Telemetry Wrapper — ZERO external dependencies
 *
 * A thin HOF that wraps Next.js route handlers with:
 *   A) x-request-id generation via crypto.randomUUID() (forwarded from upstream if present)
 *   B) Start-time recording (high-resolution via performance.now())
 *   C) Handler execution
 *   D) Duration calculation (ms)
 *   E) x-request-id + x-response-time headers on every response
 *   F) Response compression via CompressionStream (gzip) for JSON/text payloads
 *   G) Structured JSON log to console (one line per request)
 *   H) Error path: logs with stack trace, still sets headers, does NOT swallow
 *
 * This is intentionally decoupled from the heavier @opentelemetry stack so
 * routes can get basic request-level telemetry without pulling in OTel.
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ApiTelemetryLogEntry {
  timestamp: string;
  level: 'info' | 'error';
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  request_id: string;
  error?: string;
  stack?: string;
}

// Next.js 16 route handler context shape
export interface RouteContext<TParams = Record<string, string>> {
  params: Promise<TParams>;
}

// ─── Response Compression (zero-dependency, Node.js 18+) ──────────────────
// Uses the Web CompressionStream API to gzip JSON/text responses inline.
// Falls back to uncompressed if CompressionStream is unavailable.

const HAS_COMPRESSION = typeof CompressionStream !== 'undefined';

function maybeCompressResponse(response: Response, req: NextRequest): Response {
  if (!HAS_COMPRESSION || !response.body) return response;

  const acceptEncoding = req.headers.get('accept-encoding') || '';
  if (!acceptEncoding.includes('gzip')) return response;

  // Skip already-compressed or non-compressible responses
  if (response.headers.get('content-encoding')) return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json') && !contentType.includes('text/')) return response;

  try {
    const gzipStream = new CompressionStream('gzip');
    const compressedBody = response.body.pipeThrough(gzipStream);

    const headers = new Headers(response.headers);
    headers.set('Content-Encoding', 'gzip');
    headers.delete('Content-Length');

    // Merge Vary: Accept-Encoding with any existing Vary header
    const vary = headers.get('Vary') || '';
    if (!vary.includes('Accept-Encoding')) {
      headers.set('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
    }

    return new Response(compressedBody, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    // CompressionStream unavailable or failed — return uncompressed
    return response;
  }
}

// ─── Structured JSON Logger ────────────────────────────────────────────────

function logStructured(entry: ApiTelemetryLogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(json);
  } else {
    console.log(json);
  }
}

// ─── withApiTelemetry HOF ─────────────────────────────────────────────────

/**
 * Wraps a Next.js 16 App Router route handler with lightweight telemetry.
 *
 * Two overloads:
 *  1. Static routes: handler takes `(req: NextRequest) => Response`
 *  2. Dynamic routes: handler takes `(req: NextRequest, ctx: RouteContext<T>) => Response`
 *
 * Usage:
 * ```ts
 * // Static route
 * async function getHandler(req: NextRequest) {
 *   return NextResponse.json({ ok: true });
 * }
 * export const GET = withApiTelemetry(getHandler, '/api/wallets');
 *
 * // Dynamic route
 * async function getHandler(req: NextRequest, ctx: RouteContext<{ id: string }>) {
 *   const { id } = await ctx.params;
 *   return NextResponse.json({ ok: true, id });
 * }
 * export const GET = withApiTelemetry(getHandler, '/api/users/[id]');
 * ```
 */

// Overload 1: Static routes (handler ignores context)
export function withApiTelemetry(
  handler: (req: NextRequest) => Promise<Response>,
  routeName?: string,
): (req: NextRequest, context: RouteContext<Record<string, string>>) => Promise<Response>;

// Overload 2: Dynamic routes (handler uses context)
export function withApiTelemetry<TParams extends Record<string, string>>(
  handler: (req: NextRequest, context: RouteContext<TParams>) => Promise<Response>,
  routeName?: string,
): (req: NextRequest, context: RouteContext<TParams>) => Promise<Response>;

// Implementation
export function withApiTelemetry(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  routeName?: string,
): (req: NextRequest, context: any) => Promise<Response> {
  return async (req: NextRequest, context?: any): Promise<Response> => {
    // A) Generate or forward x-request-id
    const requestId =
      req.headers.get('x-request-id') || crypto.randomUUID();

    // B) Record start time
    const startTime = performance.now();

    // Resolve route name from request URL if not provided
    const route = routeName || new URL(req.url).pathname;
    const method = req.method;

    try {
      // C) Call the handler — always forward context (it may be undefined for static routes, which is fine)
      const response = await handler(req, context);

      // D) Calculate duration
      const durationMs = performance.now() - startTime;

      // E) Set headers on the response (clone to avoid mutating shared headers)
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      newResponse.headers.set('x-request-id', requestId);
      newResponse.headers.set('x-response-time', `${Math.round(durationMs)}ms`);

      // F) Log structured JSON (success)
      logStructured({
        timestamp: new Date().toISOString(),
        level: 'info',
        route,
        method,
        status: response.status,
        duration_ms: Math.round(durationMs),
        request_id: requestId,
      });

      // G) Apply response compression for JSON/text payloads
      return maybeCompressResponse(newResponse, req);
    } catch (error) {
      // D) Calculate duration on error path
      const durationMs = performance.now() - startTime;

      // H) Log with stack, still set headers
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      logStructured({
        timestamp: new Date().toISOString(),
        level: 'error',
        route,
        method,
        status: 500,
        duration_ms: Math.round(durationMs),
        request_id: requestId,
        error: message,
        stack,
      });

      // Re-throw so Next.js error boundary / withErrorHandler can handle it
      throw error;
    }
  };
}
