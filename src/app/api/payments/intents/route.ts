import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, requireAuth } from "@/lib/auth/api-helpers";
import { processPayment } from "@/backend/services/temporal-bridge";
import { withPaymentIdempotency, recordPaymentTransition } from "@/backend/lib/payment/route-helpers";
import { getProvidersForCountry, getProvidersForCurrency, calculateFee, getProviderConfig, getActiveProviderConfigs } from "@/backend/lib/payment/config";
import type { PaymentProviderCode } from "@/backend/lib/payment/types";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, conflict, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
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
  paymentMethod: z.string().min(1, "Payment method is required"),
  provider: z.string().optional(),
});

// ── Provider resolution helper ────────────────────────────────
function resolveProvider(country: string, currency: string, preferredProvider?: string): { provider: PaymentProviderCode; reason: string } {
  // If caller explicitly requested a provider, validate it's active and supports the currency
  if (preferredProvider) {
    const code = preferredProvider as PaymentProviderCode;
    const config = getProviderConfig(code);
    if (config && config.supportedCurrencies.includes(currency.toUpperCase())) {
      return { provider: code, reason: 'explicit_request' };
    }
  }

  // Try to find a provider that supports both the country and currency
  const countryProviders = getProvidersForCountry(country);
  for (const code of countryProviders) {
    const config = getProviderConfig(code);
    if (config && config.supportedCurrencies.includes(currency.toUpperCase())) {
      return { provider: code, reason: 'country_currency_match' };
    }
  }

  // Fall back to any provider that supports the currency
  const currencyProviders = getProvidersForCurrency(currency);
  if (currencyProviders.length > 0) {
    return { provider: currencyProviders[0], reason: 'currency_fallback' };
  }

  // Last resort: try any active provider
  const active = getActiveProviderConfigs();
  if (active.length > 0) {
    return { provider: active[0].code, reason: 'active_fallback' };
  }

  return { provider: 'stripe' as PaymentProviderCode, reason: 'hardcoded_fallback' };
}

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
async function getHandler(request: NextRequest, _ctx?: { params?: Promise<Record<string, string>> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required')
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

    return ok(intents, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Error listing payment intents:", err);return error("Failed to list payment intents");
  }
}

// ── POST: Create payment intent (inner handler, wrapped with idempotency) ──
async function createPaymentIntent(request: NextRequest, _ctx?: { params?: Promise<Record<string, string>> }) {
  try {
    const user = await requireAuth(request);

    // ── Idempotency check ─────────────────────────────────────
    const idempotencyKey = request.headers.get('idempotency-key');
    const guard = await getIdempotencyGuard();
    if (idempotencyKey && guard) {
      const existing = guard.getCachedResponse(idempotencyKey);
      if (existing && existing.status === 'completed') {
        // Return cached response for already-processed request
        return created(existing.response.data);
      }
      const acquireResult = guard.acquire(idempotencyKey);
      if (acquireResult.alreadyProcessing) {
        return conflict('Request already in progress');
      }
    }

    const body = await request.json();
    const parsed = createIntentSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Validation failed", parsed.error.issues);
    }

    const data = parsed.data;

    // Verify both businesses belong to tenant
    const [fromBiz, toBiz] = await Promise.all([
      db.business.findUnique({ where: { id: data.fromBusinessId }, select: { tenantId: true, country: true } }),
      db.business.findUnique({ where: { id: data.toBusinessId }, select: { tenantId: true } }),
    ]);
    if (!fromBiz || fromBiz.tenantId !== user.tenantId || !toBiz || toBiz.tenantId !== user.tenantId) {
      return notFound("Business not found");
    }

    // ── FX rate from database ──────────────────────────────────
    let exchangeRate: number;
    if (data.sourceCurrency === data.targetCurrency) {
      exchangeRate = 1.0;
    } else {
      const rateRecord = await db.currencyRate.findFirst({
        where: {
          fromCurrency: data.sourceCurrency,
          toCurrency: data.targetCurrency,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!rateRecord) {
        return validationError(
          `No exchange rate configured for ${data.sourceCurrency} → ${data.targetCurrency}. Please configure rates via /api/payments/rates first.`,
          { fromCurrency: data.sourceCurrency, toCurrency: data.targetCurrency },
        );
      }
      exchangeRate = rateRecord.rate;
    }

    const targetAmount = parseFloat(
      (data.sourceAmount * exchangeRate).toFixed(2)
    );

    // ── Provider resolution via payment config ───────────────
    const senderCountry = fromBiz.country || '';
    const { provider: routingProvider, reason: providerReason } = resolveProvider(
      senderCountry,
      data.sourceCurrency,
      data.provider,
    );

    // ── Fee calculation via provider config ──────────────────
    const feeBreakdown = calculateFee(data.sourceAmount, routingProvider, data.sourceCurrency);
    const estimatedFee = feeBreakdown.totalFee;

    // Deterministic routing score based on match quality
    const routingScoreMap: Record<string, number> = {
      explicit_request: 0.98,
      country_currency_match: 0.95,
      currency_fallback: 0.80,
      active_fallback: 0.60,
      hardcoded_fallback: 0.40,
    };
    const routingScore = routingScoreMap[providerReason] ?? 0.50;
    const estimatedTime = providerReason === 'country_currency_match' || providerReason === 'explicit_request' ? 5 : 30;

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
        paymentMethod: data.paymentMethod,
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

    return created(intent);
  } catch (err: any) {
    console.error("Error creating payment intent:", err);return error("Failed to create payment intent");
  }
}

// ── Wrap POST with payment idempotency guard ──────────────
export async function POST(request: NextRequest) {
  return withPaymentIdempotency(createPaymentIntent)(request);
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/payments/intents');
