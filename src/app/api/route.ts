import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Youngsend API",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth/*",
      dashboard: "/api/dashboard/stats",
      businesses: "/api/businesses",
      escrow: "/api/escrow/transactions",
      payments: "/api/payments/intents",
      wallets: "/api/wallets",
      referral: "/api/referral",
      twin: "/api/twin/profiles",
    },
  });
}
