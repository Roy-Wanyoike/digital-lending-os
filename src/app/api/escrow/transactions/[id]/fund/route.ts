import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── POST: Fund an escrow transaction ─────────────────────────
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const escrow = await db.escrowTransaction.findUnique({
      where: { id },
      include: { buyer: { select: { id: true, name: true } } },
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

    // Create PaymentIntent record first
    const paymentIntent = await db.paymentIntent.create({
      data: {
        intentRef: `PAY-${escrow.txRef.replace("ESC-", "")}`,
        escrowId: id,
        fromBusinessId: escrow.buyerId,
        toBusinessId: escrow.sellerId,
        sourceAmount: escrow.amount,
        sourceCurrency: escrow.currency,
        targetAmount: escrow.amount,
        targetCurrency: escrow.currency,
        exchangeRate: 1.0,
        status: "processing",
        routingProvider: "stripe",
        routingScore: 0.95,
        estimatedFee: parseFloat((escrow.amount * 0.015).toFixed(2)),
        estimatedTime: 5,
      },
    });

    // Update escrow
    const updated = await db.escrowTransaction.update({
      where: { id },
      data: {
        status: "funded",
        fundedAmount: escrow.amount,
        paymentIntentId: paymentIntent.id,
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: true,
        disbursements: true,
      },
    });

    // Create audit log
    await db.escrowAuditLog.create({
      data: {
        escrowId: id,
        action: "funded",
        actor: escrow.buyerId,
        details: `Escrow ${escrow.txRef} funded with ${escrow.amount} ${escrow.currency}. Payment intent ${paymentIntent.intentRef} created.`,
        metadata: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          fundedAmount: escrow.amount,
        }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error funding escrow transaction:", error);
    return NextResponse.json(
      { error: "Failed to fund escrow transaction" },
      { status: 500 }
    );
  }
}