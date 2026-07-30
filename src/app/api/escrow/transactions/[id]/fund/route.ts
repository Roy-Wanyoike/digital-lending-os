import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { providerRegistry, getProvidersForCurrency, calculateFee, getProviderName, type PaymentProviderCode } from "@/lib/payment";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";
import { recordPaymentTransition } from "@/backend/lib/payment/route-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
// ── Zod Schema ───────────────────────────────────────────────
const fundSchema = z.object({
  provider: z.enum(["stripe", "paystack", "intasend", "flutterwave"]).optional(),
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  // If no provider specified, auto-select from available
});

// ── POST: Fund an escrow transaction via payment provider ─────
async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params;
    const body = await request.json();
    const parsed = fundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const escrow = await db.escrowTransaction.findFirst({
      where: {
        id,
        OR: [
          { buyer: { tenantId: user.tenantId } },
          { seller: { tenantId: user.tenantId } },
        ],
      },
      include: {
        buyer: { select: { id: true, name: true, country: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    if (escrow.status !== "created") {
      return NextResponse.json(
        {
          error: `Cannot fund escrow with status '${escrow.status}'. Only 'created' escrows can be funded.`,
        },
        { status: 409 }
      );
    }

    // ─── Provider Selection ────────────────────────────────────
    let providerCode: PaymentProviderCode | null = data.provider || null;
    if (!providerCode) {
      const candidates = getProvidersForCurrency(escrow.currency);
      if (escrow.buyer?.country) {
        const { getProvidersForCountry } = await import("@/lib/payment");
        const countryCandidates = getProvidersForCountry(escrow.buyer.country);
        const filtered = candidates.filter((c) => countryCandidates.includes(c));
        providerCode = filtered[0] || candidates[0] || null;
      } else {
        providerCode = candidates[0] || null;
      }
    }

    if (!providerCode) {
      return NextResponse.json(
        { error: `No active payment provider available for ${escrow.currency}. Configure provider keys in .env` },
        { status: 400 }
      );
    }

    const provider = providerRegistry.getProvider(providerCode);
    if (!provider) {
      return NextResponse.json(
        { error: `Payment provider '${providerCode}' is not configured or active` },
        { status: 400 }
      );
    }

    // ─── Fee Calculation ───────────────────────────────────────
    const feeBreakdown = calculateFee(escrow.amount, providerCode, escrow.currency);

    // ─── Create PaymentIntent ──────────────────────────────────
    const paymentIntent = await db.paymentIntent.create({
      data: {
        intentRef: `PAY-${escrow.txRef.replace("ESC-", "")}`,
        escrowId: id,
        fromBusinessId: escrow.buyerId,
        toBusinessId: escrow.sellerId,
        sourceAmount: escrow.amount,
        sourceCurrency: escrow.currency,
        targetAmount: feeBreakdown.netAmount,
        targetCurrency: escrow.currency,
        exchangeRate: 1.0,
        status: "processing",
        paymentMethod: "card",
        routingProvider: providerCode,
        routingScore: 0.9,
        estimatedFee: feeBreakdown.totalFee,
        estimatedTime: 5,
      },
    });

    // ─── Initialize Payment with Provider ─────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || "";
    const amountInCents = Math.round(escrow.amount * 100);

    const initResult = await provider.initialize({
      amount: amountInCents,
      currency: escrow.currency,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      reference: escrow.txRef,
      callbackUrl: `${baseUrl}/api/payments/webhooks/${providerCode}`,
      redirectUrl: `${baseUrl}/escrow/${escrow.txRef}?provider=${providerCode}`,
      metadata: {
        referenceType: "escrow",
        referenceId: id,
        paymentIntentId: paymentIntent.id,
        escrowRef: escrow.txRef,
      },
    });

    if (!initResult.success) {
      // Update intent to failed
      await db.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: { status: "failed" },
      });
      return NextResponse.json(
        { error: `Failed to initialize payment with ${getProviderName(providerCode)}` },
        { status: 502 }
      );
    }

    // ─── Create PaymentTransaction record ─────────────────────
    const paymentTx = await db.paymentTransaction.create({
      data: {
        intentId: paymentIntent.id,
        txRef: `PTX-${escrow.txRef}`,
        provider: providerCode,
        providerTxId: initResult.providerPaymentId,
        amount: escrow.amount,
        currency: escrow.currency,
        status: "processing",
        metadata: JSON.stringify({
          referenceType: "escrow",
          referenceId: id,
          escrowRef: escrow.txRef,
        }),
      },
    });

    // ─── Audit Log ─────────────────────────────────────────────
    await db.escrowAuditLog.create({
      data: {
        escrowId: id,
        action: "payment_initiated",
        actor: escrow.buyerId,
        details: `Payment initiated via ${getProviderName(providerCode)} for ${escrow.amount} ${escrow.currency}. Checkout URL generated.`,
        metadata: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          paymentTransactionId: paymentTx.id,
          provider: providerCode,
          providerPaymentId: initResult.providerPaymentId,
          feeBreakdown,
        }),
      },
    });

    // ── State machine: record payment transition (fund) ───────
    void recordPaymentTransition(paymentIntent.id, 'CREATED', 'PENDING_PROVIDER', user.email || user.id || 'authenticated');

    // ─── Return checkout info ─────────────────────────────────
    return NextResponse.json({
      data: {
        escrowId: id,
        escrowRef: escrow.txRef,
        paymentIntentId: paymentIntent.id,
        paymentTransactionId: paymentTx.id,
        provider: providerCode,
        providerName: getProviderName(providerCode),
        checkoutUrl: initResult.checkoutUrl || initResult.authorizationUrl,
        fee: feeBreakdown,
        status: "awaiting_payment",
      },
    });
  } catch (error) {
    console.error("Error funding escrow transaction:", error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: "Failed to initiate escrow funding" },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry(postHandler, '/api/escrow/transactions/[id]/fund');
