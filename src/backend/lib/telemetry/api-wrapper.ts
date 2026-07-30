/**
 * Lightweight API Telemetry Wrapper — ZERO external dependencies
 *
 * A thin HOF that wraps Next.js route handlers with:
 *   A) x-request-id generation via crypto.randomUUID() (forwarded from upstream if present)
 *   B) Start-time recording (high-resolution via performance.now())
 *   C) Handler execution
 *   D) Duration calculation (ms)
 *   E) x-request-id + x-response-time headers on every response
 *   F) Structured JSON log to console (one line per request)
 *   G) Error path: logs with stack trace, still sets headers, does NOT swallow
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

// ─── Structured JSON Logger ────────────────────────────────────────────────

function logStructured(entry: ApiTelemetryLogEntry): void {
  // Use console.log for info, console.error for errors so log aggregation
  // tools can apply severity-based filtering.
  const json = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(json);
  } else {
    console.log(json);
  }
}

// ─── withApiTelemetry HOF ─────────────────────────────────────────────────

/**
 * Wraps a Next.js App Router GET handler with lightweight telemetry.
 *
 * ```ts
 * import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
 *
 * async function getHandler(req: NextRequest) {
 *   return NextResponse.json({ ok: true });
 * }
 *
 * export const GET = withApiTelemetry(getHandler, '/api/wallets');
 * ```
 *
 * Guarantees:
 * - Every response (success or error) gets `x-request-id` and `x-response-time`.
 * - One structured JSON line per request in console output.
 * - Errors are logged with stack trace but re-thrown (Next.js error boundary handles them).
 */
export function withApiTelemetry(
  handler: (req: NextRequest) => Promise<NextResponse>,
  routeName?: string,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    // A) Generate or forward x-request-id
    const requestId =
      req.headers.get('x-request-id') || crypto.randomUUID();

    // B) Record start time
    const startTime = performance.now();

    // Resolve route name from request URL if not provided
    const route = routeName || new URL(req.url).pathname;
    const method = req.method;

    try {
      // C) Call the handler
      const response = await handler(req);

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

      return newResponse;
    } catch (error) {
      // D) Calculate duration on error path
      const durationMs = performance.now() - startTime;

      // G) Log with stack, still set headers
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
