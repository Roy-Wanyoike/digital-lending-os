import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, AuthError } from "@/lib/auth/api-helpers";

// ── Zod Schema ───────────────────────────────────────────────
const updateIntentSchema = z.object({
  status: z.enum(["created", "processing", "completed", "failed", "cancelled"] as const, {
    message: "Status must be one of: created, processing, completed, failed, cancelled",
  }),
});

// ── Helper ───────────────────────────────────────────────────
async function getTenantBusinessIds(tenantId: string): Promise<string[]> {
  const businesses = await db.business.findMany({
    where: { tenantId },
    select: { id: true },
  });
  return businesses.map((b) => b.id);
}

// ── GET: Single payment intent ──────────────────────────────
export async function GET(
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
    };

    if (parsed.data.status === "completed") {
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
