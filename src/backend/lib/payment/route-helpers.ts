// ─── Payment Route Helpers ──────────────────────────────────────────
//
// Shared helpers for wiring the payment state machine, idempotency guard,
// and audit trail into Next.js API route handlers.
//
// All heavy imports (state-machine, idempotency, audit-trail) are lazy
// (inside functions) to avoid crashes if those modules have issues.
//

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────

type RouteHandler = (
  request: NextRequest,
  ctx?: { params?: Promise<Record<string, string>> } | undefined,
) => Promise<NextResponse>

// ── withPaymentIdempotency ────────────────────────────────────────

/**
 * Higher-order function for Next.js route handlers that checks the
 * `Idempotency-Key` header and returns a cached response if the same
 * key was already processed successfully.
 *
 * This is a read-only cache-lookup layer — it does NOT acquire locks or
 * store responses. The wrapped handler is expected to manage its own
 * acquire/complete lifecycle (see idempotency.ts). This avoids
 * double-lock conflicts when routes already contain manual idempotency
 * logic.
 *
 * If no key is provided, or the module is unavailable, the inner handler
 * runs normally (fail-open). Errors in the idempotency layer never
 * crash the route — they fall through to the handler.
 */
export function withPaymentIdempotency(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, ctx?) => {
    const idempotencyKey = request.headers.get('idempotency-key')

    // No key → pass through immediately
    if (!idempotencyKey) {
      return handler(request, ctx)
    }

    try {
      const idempotencyMod = await import('@/backend/lib/payment/idempotency')
      const { getIdempotencyGuard, IdempotencyGuard } = idempotencyMod

      // Validate key format
      if (!IdempotencyGuard.validateKey(idempotencyKey)) {
        return NextResponse.json(
          {
            error: 'Invalid Idempotency-Key format. Use alphanumeric, hyphens, underscores. Max 255 chars.',
            code: 'IDEMPOTENCY_KEY_INVALID',
          },
          { status: 400 },
        )
      }

      const guard = getIdempotencyGuard()

      // Check for a completed (cached) response — fast return for duplicates
      const cached = await guard.getCachedResponse(idempotencyKey)
      if (cached) {
        return new NextResponse(JSON.stringify(cached.response), {
          status: cached.responseStatus ?? 201,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Replayed': 'true',
            ...(cached.responseHeaders ?? {}),
          },
        })
      }

      // Check if the request is currently in-flight (in-progress dedup)
      if (await guard.isProcessing(idempotencyKey)) {
        return NextResponse.json(
          {
            error: 'Request with this Idempotency-Key is currently being processed',
            code: 'IDEMPOTENCY_CONFLICT',
          },
          {
            status: 409,
            headers: { 'Retry-After': '5' },
          },
        )
      }
    } catch (err) {
      // Idempotency module unavailable — fail open, run handler
      console.error('[withPaymentIdempotency] Idempotency layer error, falling through:', err)
    }

    // No cached result → delegate to the handler (which manages acquire/complete)
    return handler(request, ctx)
  }
}

// ── recordPaymentTransition ──────────────────────────────────────

/**
 * Record a payment state transition in the audit trail.
 *
 * This is a convenience wrapper that lazily loads the AuditTrail
 * singleton and calls `recordStateTransition`. Errors are swallowed
 * (non-fatal) so the calling route never crashes due to audit issues.
 */
export async function recordPaymentTransition(
  paymentId: string,
  fromState: string,
  toState: string,
  actorId: string,
): Promise<void> {
  try {
    const { getAuditTrail } = await import('@/backend/lib/payment/audit-trail')
    const audit = getAuditTrail()
    await audit.recordStateTransition({
      paymentId,
      fromState,
      toState,
      actor: actorId,
    })
  } catch (err) {
    // Non-fatal — audit failures must never crash a payment route
    console.error('[recordPaymentTransition] Audit trail error:', err)
  }
}

// ── getPaymentStateMachine (lazy singleton accessor) ────────────

let _cachedStateMachine: any = null

/**
 * Returns the singleton PaymentStateMachine instance.
 * Import is lazy to avoid crashes if the module has issues.
 * Returns `null` if the module cannot be loaded.
 */
export async function getPaymentStateMachine() {
  if (_cachedStateMachine) return _cachedStateMachine
  try {
    const mod = await import('@/backend/lib/payment/state-machine')
    _cachedStateMachine = mod.getPaymentStateMachine()
    return _cachedStateMachine
  } catch (err) {
    console.error('[getPaymentStateMachine] Module load error:', err)
    return null
  }
}
