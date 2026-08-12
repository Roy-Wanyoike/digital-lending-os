import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getApiUser, requireAuth, AuthError } from "@/lib/auth/api-helpers";

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { badRequest, created, error, notFound, ok, unauthorized, validationError, withErrorHandler } from '@/backend/lib/api-response';
// ── Zod Schemas ─────────────────────────────────────────────
const addMethodSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  type: z.enum(
    ["bank_account", "card", "crypto_wallet", "mobile_money", "digital_wallet"] as const,
    {
      message:
        "Type must be one of: bank_account, card, crypto_wallet, mobile_money, digital_wallet",
    }
  ),
  provider: z.string().min(1, "Provider is required"),
  label: z.string().min(1, "Label is required"),
  identifier: z.string().min(1, "Identifier (masked) is required"),
  currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
});

// ── GET: List payment methods for a business ────────────────
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized('Authentication required')
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return badRequest("Query parameter 'businessId' is required");
    }

    // Verify business belongs to tenant
    const biz = await db.business.findUnique({ where: { id: businessId }, select: { tenantId: true } });
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound("Business not found");
    }

    const methods = await db.paymentMethod.findMany({
      where: { businessId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return ok(methods);
  } catch (err: any) {
    console.error("Error listing payment methods:", err);return error("Failed to list payment methods");
  }
}

// ── POST: Add payment method ────────────────────────────────
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = addMethodSchema.safeParse(body);

    if (!parsed.success) {
      return validationError("Validation failed", parsed.error.issues);
    }

    const data = parsed.data;

    // Verify business belongs to tenant
    const biz = await db.business.findUnique({ where: { id: data.businessId }, select: { tenantId: true } });
    if (!biz || biz.tenantId !== user.tenantId) {
      return notFound("Business not found");
    }

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

    return created(method);
  } catch (err: any) {
    console.error("Error adding payment method:", err);return error("Failed to add payment method");
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/payments/methods');

export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/payments/methods');
