// ─── Standard API Response Helpers ──────────────────────────────────────
//
// All API routes MUST use these helpers to ensure a consistent response
// envelope. The canonical shape is:
//
//   Success: { data, meta? }
//   Error:   { error: { message, code?, details? } }
//
// The `withErrorHandler` HOF wraps any route handler in try-catch and
// normalises AuthError, ZodError, and unknown errors into the standard
// error envelope.
//

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from '@/lib/auth/api-helpers'
import { getLogger } from '@/backend/lib/telemetry/logger'

const log = getLogger().withContext({ module: 'api-response' })

// ─── Response Envelope Types ─────────────────────────────────────────────

export interface ApiSuccessEnvelope<T = unknown> {
  data: T
  meta?: Record<string, unknown>
}

export interface ApiErrorEnvelope {
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

// ─── Success Helpers ────────────────────────────────────────────────────

/** 200 OK */
export function ok<T = unknown>(data: T, meta?: Record<string, unknown>) {
  const body: ApiSuccessEnvelope<T> = { data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status: 200 })
}

/** 201 Created */
export function created<T = unknown>(data: T) {
  return NextResponse.json({ data } as ApiSuccessEnvelope<T>, { status: 201 })
}

/** 204 No Content */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}

// ─── Error Helpers ──────────────────────────────────────────────────────

/** 400 Bad Request */
export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: { message, code: 'BAD_REQUEST', details } } satisfies ApiErrorEnvelope,
    { status: 400 },
  )
}

/** 401 Unauthorized */
export function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    { error: { message, code: 'UNAUTHORIZED' } } satisfies ApiErrorEnvelope,
    { status: 401 },
  )
}

/** 403 Forbidden */
export function forbidden(message = 'Insufficient permissions') {
  return NextResponse.json(
    { error: { message, code: 'FORBIDDEN' } } satisfies ApiErrorEnvelope,
    { status: 403 },
  )
}

/** 404 Not Found */
export function notFound(message = 'Resource not found') {
  return NextResponse.json(
    { error: { message, code: 'NOT_FOUND' } } satisfies ApiErrorEnvelope,
    { status: 404 },
  )
}

/** 409 Conflict */
export function conflict(message: string) {
  return NextResponse.json(
    { error: { message, code: 'CONFLICT' } } satisfies ApiErrorEnvelope,
    { status: 409 },
  )
}

/** 422 Unprocessable Entity (validation failure) */
export function validationError(message: string, details?: unknown) {
  return NextResponse.json(
    { error: { message, code: 'VALIDATION_ERROR', details } } satisfies ApiErrorEnvelope,
    { status: 422 },
  )
}

/** 429 Too Many Requests */
export function tooManyRequests(message = 'Rate limit exceeded') {
  return NextResponse.json(
    { error: { message, code: 'RATE_LIMITED' } } satisfies ApiErrorEnvelope,
    { status: 429 },
  )
}

/** Generic error with custom status (500 default) */
export function error(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { error: { message, code: code || 'INTERNAL_ERROR' } } satisfies ApiErrorEnvelope,
    { status },
  )
}

// ─── Error Code Mapping ─────────────────────────────────────────────────

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
}

// ─── withErrorHandler HOF ──────────────────────────────────────────────

/**
 * Wraps a Next.js route handler in a try-catch that normalises all errors
 * into the standard `{ error: { message, code, details? } }` envelope.
 *
 * Handles:
 *  - AuthError → statusCode from the exception
 *  - ZodError → 422 with field-level details
 *  - Error with numeric `.statusCode` → passthrough
 *  - Everything else → 500
 *
 * Usage:
 *   export const GET = withErrorHandler(async (req) => { ... })
 */
export function withErrorHandler<T extends (...args: any[]) => any>(
  handler: T,
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (err: unknown) {
      // --- AuthError (from api-helpers) ---
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: { message: err.message, code: STATUS_CODE_MAP[err.statusCode] || 'UNAUTHORIZED' } },
          { status: err.statusCode },
        )
      }

      // --- Zod validation errors ---
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: err.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
              })),
            },
          },
          { status: 422 },
        )
      }

      // --- Error with statusCode property ---
      if (err instanceof Error && 'statusCode' in err && typeof (err as any).statusCode === 'number') {
        const status = (err as any).statusCode as number
        log.error('Handled error with status', {
          status,
          message: err.message,
          code: STATUS_CODE_MAP[status],
        })
        return NextResponse.json(
          { error: { message: err.message, code: STATUS_CODE_MAP[status] || 'INTERNAL_ERROR' } },
          { status },
        )
      }

      // --- Unknown errors ---
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      log.error('Unhandled error in route handler', {
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      })
      return NextResponse.json(
        { error: { message, code: 'INTERNAL_ERROR' } },
        { status: 500 },
      )
    }
  }) as T
}
