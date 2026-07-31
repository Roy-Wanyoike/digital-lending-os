import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";
import { processPayment } from "@/backend/services/temporal-bridge";
import { withPaymentIdempotency, recordPaymentTransition } from "@/backend/lib/payment/route-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── Lazy-loaded payment infrastructure (avoids crashes if modules have issues) ──
let _stateMachine: any = null;
let _idempotencyGuard: any = null;
let _auditTrail: any = null;

async function getStateMachine() {
  if (!_stateMachine) {
    try {
      const mod = await import('@/backend/lib/payment/state-machine');
      _stateMachine = mod.getPaymentStateMachine();
    } catch { /* state machine unavailable */ }
  }
  return _stateMachine;
}

async function getIdempotencyGuard() {
  if (!_idempotencyGuard) {
    try {
      const mod = await import('@/backend/lib/payment/idempotency');
      _idempotencyGuard = mod.getIdempotencyGuard();
    } catch { /* idempotency guard unavailable */ }
  }
  return _idempotencyGuard;
}

async function getAuditTrail() {
  if (!_auditTrail) {
    try {
      const mod = await import('@/backend/lib/payment/audit-trail');
      _auditTrail = mod.getAuditTrail();
    } catch { /* audit trail unavailable */ }
  }
  return _auditTrail;
}

// ── Zod Schema ───────────────────────────────────────────────
const createIntentSchema = z.object({
  fromBusinessId: z.string().min(1, "From business ID is required"),
  toBusinessId: z.string().min(1, "To business ID is required"),
  sourceAmount: z.number().positive("Source amount must be positive"),
  sourceCurrency: z.string().min(1, "Source currency is required"),
  targetCurrency: z.string().min(1, "Target currency is required"),
});

// ── Mock exchange rates ─────────────────────────────────────
const MOCK_RATES: Record<string, number> = {
  "USD-EUR": 0.92,
  "EUR-USD": 1.087,
  "USD-GBP": 0.79,
  "GBP-USD": 1.266,
  "USD-CNY": 7.24,
  "CNY-USD": 0.138,
  "USD-JPY": 149.5,
  "JPY-USD": 0.00669,
  "EUR-GBP": 0.858,
  "GBP-EUR": 1.166,
};

function getMockRate(from: string, to: string): number {
  if (from === to) return 1.0;
  const key = `${from}-${to}`;
  if (MOCK_RATES[key]) return MOCK_RATES[key];
  const fromUsd = MOCK_RATES[`${from}-USD`] ?? 1.0;
  const usdTo = MOCK_RATES[`USD-${to}`] ?? 1.0;
  return fromUsd * usdTo;
}

const PROVIDERS = ["wise", "stripe", "paypal", "local_bank"] as const;

function generateIntentRef(): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `PAY-${dateStr}-${rand}`;
}

// ── GET: List payment intents ───────────────────────────────
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const fromBusinessId = searchParams.get("fromBusinessId") || undefined;
    const toBusinessId = searchParams.get("toBusinessId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const where: Record<string, unknown> = {
      OR: [
        { fromBusiness: { tenantId: user.tenantId } },
        { toBusiness: { tenantId: user.tenantId } },
      ],
    };
    if (status) where.status = status;
    if (fromBusinessId) where.fromBusinessId = fromBusinessId;
    if (toBusinessId) where.toBusinessId = toBusinessId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [intents, total] = await Promise.all([
      db.paymentIntent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          escrow: {
            select: { id: true, txRef: true, status: true, amount: true, currency: true },
          },
        },
      }),
      db.paymentIntent.count({ where }),
    ]);

    return NextResponse.json({
      data: intents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing payment intents:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to list payment intents" },
      { status: 500 }
    );
  }
}

// ── POST: Create payment intent (inner handler, wrapped with idempotency) ──
async function createPaymentIntent(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    // ── Idempotency check ─────────────────────────────────────
    const idempotencyKey = request.headers.get('idempotency-key');
    const guard = await getIdempotencyGuard();
    if (idempotencyKey && guard) {
      const existing = guard.getCachedResponse(idempotencyKey);
      if (existing && existing.status === 'completed') {
        // Return cached response for already-processed request
        return NextResponse.json(
          existing.response,
          { status: existing.responseStatus || 201, headers: existing.responseHeaders || {} },
        );
      }
      const acquireResult = guard.acquire(idempotencyKey);
      if (acquireResult.alreadyProcessing) {
        return NextResponse.json(
          { error: 'Request already in progress', code: 'IDEMPOTENCY_IN_PROGRESS' },
          { status: 409 },
        );
      }
    }

    const body = await request.json();
    const parsed = createIntentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify both businesses belong to tenant
    const [fromBiz, toBiz] = await Promise.all([
      db.business.findUnique({ where: { id: data.fromBusinessId }, select: { tenantId: true } }),
      db.business.findUnique({ where: { id: data.toBusinessId }, select: { tenantId: true } }),
    ]);
    if (!fromBiz || fromBiz.tenantId !== user.tenantId || !toBiz || toBiz.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const exchangeRate = getMockRate(data.sourceCurrency, data.targetCurrency);
    const targetAmount = parseFloat(
      (data.sourceAmount * exchangeRate).toFixed(2)
    );
    const estimatedFee = parseFloat(
      (data.sourceAmount * 0.015).toFixed(2)
    );
    const routingProvider =
      PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
    const routingScore = parseFloat(
      (0.7 + Math.random() * 0.29).toFixed(2)
    );
    const estimatedTime = Math.floor(Math.random() * 60) + 5;

    const intent = await db.paymentIntent.create({
      data: {
        intentRef: generateIntentRef(),
        fromBusinessId: data.fromBusinessId,
        toBusinessId: data.toBusinessId,
        sourceAmount: data.sourceAmount,
        sourceCurrency: data.sourceCurrency,
        targetAmount,
        targetCurrency: data.targetCurrency,
        exchangeRate,
        estimatedFee,
        routingProvider,
        routingScore,
        estimatedTime,
        status: "created",
      },
    });

    // ── State machine: record initial CREATED state ───────────
    const sm = await getStateMachine();
    if (sm) {
      sm.initialize(intent.id);
    }

    // ── Audit trail: record payment state transition via helpers ──
    void recordPaymentTransition(intent.id, 'NONE', 'CREATED', user.email || user.id || 'authenticated');

    // ── Audit trail: record payment creation ───────────────────
    const audit = await getAuditTrail();
    if (audit) {
      try {
        await audit.record({
          action: 'PAYMENT_CREATED',
          actor: user.email || user.id || 'authenticated',
          resourceId: intent.id,
          resourceType: 'payment_intent',
          description: `Payment intent ${intent.intentRef} created for ${data.sourceAmount} ${data.sourceCurrency} -> ${data.targetCurrency}`,
          metadata: { fromBusinessId: data.fromBusinessId, toBusinessId: data.toBusinessId, sourceAmount: data.sourceAmount, routingProvider },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'system',
        });
      } catch { /* non-fatal */ }
    }

    // Wire to Temporal workflow (falls back to direct execution if Temporal is unavailable)
    void processPayment({ paymentIntentId: intent.id, amount: data.sourceAmount, currency: data.sourceCurrency, payerEmail: user.email, payerName: user.email, provider: routingProvider, tenantId: user.tenantId });

    const responseData = { data: intent };

    // ── Store response for idempotency ─────────────────────────
    if (idempotencyKey && guard) {
      guard.complete(idempotencyKey, responseData, 201);
    }

    // ── Publish Kafka event ────────────────────────────────────
    try {
      const { publishEvent } = await import('@/backend/lib/event-publisher')
      await publishEvent({
        topic: 'payment.events.payment_initiated',
        key: intent.id,
        event: { eventType: 'payment.intent.created', intentId: intent.id, amount: data.sourceAmount, currency: data.sourceCurrency, tenantId: user.tenantId, timestamp: new Date().toISOString() },
      })
    } catch (e) { console.error('Event publish failed:', e) }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

// ── Wrap POST with payment idempotency guard ──────────────
export const POST = withPaymentIdempotency(createPaymentIntent);

export const GET = withApiTelemetry(getHandler, '/api/payments/intents');
