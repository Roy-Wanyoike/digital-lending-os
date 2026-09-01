import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  withErrorHandler,
} from "@/backend/lib/api-response";
import { getApiUser, requireAdmin } from "@/lib/auth/api-helpers";
import { withApiTelemetry } from "@/backend/lib/telemetry/api-wrapper";

// ── Types ─────────────────────────────────────────────────────────────────

interface StoredRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  expiresAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

// ── In-memory rate store ──────────────────────────────────────────────────
//
// Keyed by `${fromCurrency}-${toCurrency}` (both uppercased).
// Admins populate this via POST. The GET handler only reads from here.

const rateStore = new Map<string, StoredRate>();

// ── Lazy-loaded cache manager ─────────────────────────────────────────────

let _cacheManager: any = undefined;
let _cacheAttempted = false;
async function getCache() {
  if (_cacheAttempted) return _cacheManager;
  _cacheAttempted = true;
  try {
    const mod = await import("@/backend/lib/cache/cache-manager");
    _cacheManager = mod.default;
  } catch {
    _cacheManager = undefined;
  }
  return _cacheManager;
}

// ── Zod schemas ───────────────────────────────────────────────────────────

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

const upsertRateSchema = z.object({
  fromCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CURRENCY_CODE_RE, "fromCurrency must be a 3-letter ISO 4217 code"),
  toCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CURRENCY_CODE_RE, "toCurrency must be a 3-letter ISO 4217 code"),
  rate: z
    .number({ message: "rate must be a number" })
    .positive("rate must be greater than 0"),
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO 8601 datetime" })
    .transform((v) => new Date(v)),
});

// ── Helpers ───────────────────────────────────────────────────────────────

function rateKey(from: string, to: string) {
  return `${from}-${to}`;
}

/** Return non-expired entries as plain objects (no Date refs in JSON). */
function listActiveRates(): {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  expiresAt: string;
  updatedAt: string;
}[] {
  const now = Date.now();
  const results: StoredRate[] = [];

  for (const entry of Array.from(rateStore.values())) {
    if (entry.expiresAt.getTime() > now) {
      results.push(entry);
    }
  }

  return results.map((r) => ({
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: r.rate,
    expiresAt: r.expiresAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// ── GET: Read rates from the in-memory store ──────────────────────────────

const getHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase();
  const to = searchParams.get("to")?.toUpperCase();

  const cacheManager = await getCache();
  const cacheKey = `payment-rates:${from || "all"}:${to || "all"}`;

  const fetchRates = async () => {
    const now = new Date();

    // Same-currency shortcut
    if (from && to && from === to) {
      return {
        rates: [{ fromCurrency: from, toCurrency: to, rate: 1.0, expiresAt: now.toISOString(), updatedAt: now.toISOString() }],
        timestamp: now.toISOString(),
      };
    }

    // Specific pair lookup
    if (from && to) {
      const key = rateKey(from, to);
      const stored = rateStore.get(key);

      if (stored && stored.expiresAt.getTime() > Date.now()) {
        return {
          rates: [
            {
              fromCurrency: stored.fromCurrency,
              toCurrency: stored.toCurrency,
              rate: stored.rate,
              expiresAt: stored.expiresAt.toISOString(),
              updatedAt: stored.updatedAt.toISOString(),
            },
          ],
          timestamp: now.toISOString(),
        };
      }

      // No stored (or expired) rate for this pair
      return { rates: [], timestamp: now.toISOString() };
    }

    // No filters — return all active rates
    const rates = listActiveRates();
    return { rates, timestamp: now.toISOString() };
  };

  const cached = cacheManager
    ? await cacheManager.getOrSet(cacheKey, fetchRates, { ttl: 300_000 })
    : await fetchRates();

  return ok(cached.rates, { timestamp: cached.timestamp });
});

// ── POST: Admin-only rate upsert ──────────────────────────────────────────

const postHandler = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAdmin(request);

  const body = await request.json();
  const parsed = upsertRateSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    })));
  }

  const { fromCurrency, toCurrency, rate, expiresAt } = parsed.data;
  const key = rateKey(fromCurrency, toCurrency);
  const now = new Date();

  // Reject rates that are already expired at creation time
  if (expiresAt.getTime() <= Date.now()) {
    return badRequest("expiresAt must be in the future");
  }

  rateStore.set(key, {
    fromCurrency,
    toCurrency,
    rate,
    expiresAt,
    updatedAt: now,
    updatedBy: user.id,
  });

  return created({
    fromCurrency,
    toCurrency,
    rate,
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString(),
  });
});

// ── Exports ───────────────────────────────────────────────────────────────

export const GET = withApiTelemetry(withErrorHandler(getHandler), "/api/payments/rates");
export const POST = withApiTelemetry(withErrorHandler(postHandler), "/api/payments/rates");
