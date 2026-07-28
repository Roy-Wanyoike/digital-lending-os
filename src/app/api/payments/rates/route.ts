import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/auth/api-helpers";

// ── Hardcoded popular rates ────────────────────────────────
const POPULAR_RATES: { from: string; to: string; rate: number }[] = [
  { from: "USD", to: "EUR", rate: 0.92 },
  { from: "USD", to: "GBP", rate: 0.79 },
  { from: "USD", to: "CNY", rate: 7.24 },
  { from: "USD", to: "JPY", rate: 149.5 },
  { from: "EUR", to: "GBP", rate: 0.858 },
];

const ALL_RATES: Record<string, number> = {
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
  "EUR-CNY": 7.87,
  "CNY-EUR": 0.127,
  "GBP-CNY": 9.17,
  "CNY-GBP": 0.109,
  "EUR-JPY": 162.5,
  "JPY-EUR": 0.00615,
  "GBP-JPY": 189.3,
  "JPY-GBP": 0.00528,
  "CNY-JPY": 20.65,
  "JPY-CNY": 0.0484,
};

// ── GET: Get exchange rates ─────────────────────────────────
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.toUpperCase();
    const to = searchParams.get("to")?.toUpperCase();

    let rates: { from: string; to: string; rate: number }[] = [];

    if (from && to) {
      if (from === to) {
        rates = [{ from, to, rate: 1.0 }];
      } else {
        const key = `${from}-${to}`;
        const rate = ALL_RATES[key];
        if (rate) {
          rates = [{ from, to, rate }];
        } else {
          // Try to compute via USD
          const fromUsd = ALL_RATES[`${from}-USD`] ?? 1.0;
          const usdTo = ALL_RATES[`USD-${to}`] ?? 1.0;
          const computed = parseFloat((fromUsd * usdTo).toFixed(6));
          rates = [{ from, to, rate: computed }];
        }
      }
    } else {
      // Return popular rates
      rates = POPULAR_RATES;
    }

    // Upsert currency rates into the database for querying
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

    for (const r of rates) {
      await db.currencyRate.upsert({
        where: {
          fromCurrency_toCurrency_provider_createdAt: {
            fromCurrency: r.from,
            toCurrency: r.to,
            provider: "mock",
            createdAt: now,
          },
        },
        create: {
          fromCurrency: r.from,
          toCurrency: r.to,
          rate: r.rate,
          provider: "mock",
          source: "internal_rates",
          expiresAt,
        },
        update: {
          rate: r.rate,
          expiresAt,
        },
      });
    }

    return NextResponse.json({
      data: rates,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
