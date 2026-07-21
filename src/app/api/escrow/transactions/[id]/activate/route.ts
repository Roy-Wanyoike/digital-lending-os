import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── POST: Activate escrow (move to in_escrow) ───────────────
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const escrow = await db.escrowTransaction.findUnique({
      where: { id },
    });

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow transaction not found" },
        { status: 404 }
      );
    }

    if (escrow.status !== "funded") {
      return NextResponse.json(
        {
          error: `Cannot activate escrow with status '${escrow.status}'. Only 'funded' escrows can be activated.`,
        },
        { status: 409 }
      );
    }

    const updated = await db.escrowTransaction.update({
      where: { id },
      data: { status: "in_escrow" },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        milestones: { orderBy: { sequence: "asc" } },
        disbursements: true,
      },
    });

    await db.escrowAuditLog.create({
      data: {
        escrowId: id,
        action: "activated",
        actor: escrow.buyerId,
        details: `Escrow ${escrow.txRef} activated and moved to 'in_escrow' status. Funds are now held.`,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error activating escrow transaction:", error);
    return NextResponse.json(
      { error: "Failed to activate escrow transaction" },
      { status: 500 }
    );
  }
}