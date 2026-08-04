import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, requireAuth, AuthError } from "@/lib/auth/api-helpers";
import { getPaymentStateMachine as getSM, recordPaymentTransition } from '@/backend/lib/payment/route-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

// ── DB ↔ State Machine status mapping ─────────────────────────────
function dbStatusToStateMachineState(dbStatus: string | null): string {
  if (!dbStatus) return 'CREATED'
  const upper = dbStatus.toUpperCase().replace(/-/g, '_')
  const validStates = ['CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'COMPLETED',
    'FAILED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'DISPUTED']
  if (validStates.includes(upper)) return upper
  const aliasMap: Record<string, string> = { 'PENDING': 'PENDING_PROVIDER' }
  return aliasMap[dbStatus.toUpperCase()] ?? 'CREATED'
}

function stateMachineStateToDbStatus(state: string): string {
  const map: Record<string, string> = {
    CREATED: 'created', PENDING_PROVIDER: 'pending', PROCESSING: 'processing',
    COMPLETED: 'completed', FAILED: 'failed', REFUNDING: 'refunding',
    REFUNDED: 'refunded', CANCELLED: 'cancelled', DISPUTED: 'disputed',
  }
  return map[state] ?? state.toLowerCase()
}

// ── Zod Schema ───────────────────────────────────────────────
const updateIntentSchema = z.object({
  status: z.enum(["created", "processing", "completed", "failed", "cancelled"] as const, {
    message: "Status must be one of: created, processing, completed, failed, cancelled",
  }),
  action: z.enum(["cancel"] as const).optional(),
});

// ── Helper ───────────────────────────────────────────────────
async function getTenantBusinessIds(tenantId: string): Promise<string[]> {
  const businesses = await db.business.findMany({
    where: { tenantId },
    select: { id: true },
  });
  return businesses.map((b: any) => b.id);
}

// ── GET: Single payment intent ──────────────────────────────
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params;
    const bizIds = await getTenantBusinessIds(user.tenantId);

    const intent = await db.paymentIntent.findFirst({
      where: {
        id,
        OR: [
          { fromBusinessId: { in: bizIds } },
          { toBusinessId: { in: bizIds } },
        ],
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Payment intent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: intent });
  } catch (error) {
    console.error("Error fetching payment intent:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to fetch payment intent" },
      { status: 500 }
    );
  }
}

// ── PUT: Update payment intent status ───────────────────────
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateIntentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const bizIds = await getTenantBusinessIds(user.tenantId);
    const existing = await db.paymentIntent.findFirst({
      where: {
        id,
        OR: [
          { fromBusinessId: { in: bizIds } },
          { toBusinessId: { in: bizIds } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment intent not found" },
        { status: 404 }
      );
    }

    // ── State machine validation ──────────────────────────────────
    const sm = await getSM()
    let validatedStatus: string = parsed.data.status
    let smTransitionApplied = false

    if (sm) {
      try {
        // Rehydrate state machine if not tracking this payment
        if (!sm.getState(id)) {
          sm.initialize(id)
          if (existing.status && existing.status !== 'created') {
            const hydrated = dbStatusToStateMachineState(existing.status)
            if (hydrated !== 'CREATED') {
              await sm.transition(id, hydrated, { reason: 'Rehydrated from DB on status update' })
            }
          }
        }

        // Determine target state machine state
        let targetState: string
        if (parsed.data.action === 'cancel') {
          targetState = 'CANCELLED'
        } else {
          targetState = dbStatusToStateMachineState(parsed.data.status)
        }

        const currentSmState = sm.getState(id)
        const actor = user?.email || user?.id || 'authenticated'

        if (currentSmState && !sm.canTransition(currentSmState, targetState)) {
          const legalTargets = sm.getLegalTransitions(currentSmState).map((t: any) => t.to)
          return NextResponse.json(
            {
              error: `Illegal state transition: ${currentSmState} → ${targetState}`,
              code: 'INVALID_STATE_TRANSITION',
              currentState: currentSmState,
              legalTransitions: legalTargets,
            },
            { status: 409 },
          )
        }

        const transitionResult = await sm.transition(id, targetState, {
          actorId: actor,
          reason: parsed.data.action ? `Action: ${parsed.data.action}` : `Status update to ${targetState}`,
        })

        validatedStatus = stateMachineStateToDbStatus(transitionResult.newState)
        smTransitionApplied = true
        void recordPaymentTransition(id, transitionResult.previousState, transitionResult.newState, actor)
      } catch (err) {
        if (err instanceof Error && err.message.includes('Illegal transition')) {
          return NextResponse.json(
            { error: err.message, code: 'INVALID_STATE_TRANSITION' },
            { status: 409 },
          )
        }
        // State machine errors are non-fatal — fall back to direct DB update
        console.warn('[Payments/Intents/[id]] State machine error (non-fatal):', err)
      }
    }

    const updateData: Record<string, unknown> = {
      status: validatedStatus,
    };

    if (validatedStatus === "completed") {
      updateData.completedAt = new Date();
    }

    const updated = await db.paymentIntent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating payment intent:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to update payment intent" },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry(getHandler, '/api/payments/intents/[id]');

export const PUT = withApiTelemetry(putHandler, '/api/payments/intents/[id]');
