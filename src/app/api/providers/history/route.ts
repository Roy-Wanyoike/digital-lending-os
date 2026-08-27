import { NextRequest, NextResponse } from "next/server";
import { generateHistoricalData } from "@/lib/provider-health";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: provider" },
        { status: 400 }
      );
    }

    const period = (searchParams.get("period") as "1h" | "6h" | "24h" | "7d" | "30d") || "24h";

    // Validate period
    const validPeriods = ["1h", "6h", "24h", "7d", "30d"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid period. Must be one of: ${validPeriods.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const historyData = generateHistoricalData(provider, period);

    return NextResponse.json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
