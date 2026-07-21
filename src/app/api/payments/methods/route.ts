import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// ── Zod Schemas ─────────────────────────────────────────────
const addMethodSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  type: z.enum(
    ["bank_account", "card", "crypto_wallet", "mobile_money", "digital_wallet"],
    {
      errorMap: () => ({
        message:
          "Type must be one of: bank_account, card, crypto_wallet, mobile_money, digital_wallet",
      }),
    }
  ),
  provider: z.string().min(1, "Provider is required"),
  label: z.string().min(1, "Label is required"),
  identifier: z.string().min(1, "Identifier (masked) is required"),
  currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
});

// ── GET: List payment methods for a business ────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "Query parameter 'businessId' is required" },
        { status: 400 }
      );
    }

    const methods = await db.paymentMethod.findMany({
      where: { businessId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: methods });
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return NextResponse.json(
      { error: "Failed to list payment methods" },
      { status: 500 }
    );
  }
}

// ── POST: Add payment method ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = addMethodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If this is set as default, unset other defaults
    const existingDefaults = await db.paymentMethod.findMany({
      where: {
        businessId: data.businessId,
        isDefault: true,
      },
    });

    if (existingDefaults.length > 0) {
      await db.paymentMethod.updateMany({
        where: {
          businessId: data.businessId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const method = await db.paymentMethod.create({
      data: {
        businessId: data.businessId,
        type: data.type,
        provider: data.provider,
        label: data.label,
        identifier: data.identifier,
        currency: data.currency,
        country: data.country,
        isDefault: existingDefaults.length === 0,
        status: "active",
      },
    });

    return NextResponse.json({ data: method }, { status: 201 });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Failed to add payment method" },
      { status: 500 }
    );
  }
}
