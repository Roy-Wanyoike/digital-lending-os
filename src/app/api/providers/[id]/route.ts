import { NextRequest, NextResponse } from "next/server";
import { getProviderDetails, generateHistoricalData, getIncidents, getDependencyGraph } from "@/lib/provider-health";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("history") === "true";
    const historyPeriod = (searchParams.get("period") as "1h" | "6h" | "24h" | "7d" | "30d") || "24h";
    const includeIncidents = searchParams.get("incidents") === "true";
    const includeDependencies = searchParams.get("dependencies") === "true";

    // Get provider details
    const provider = getProviderDetails(id);
    
    if (!provider) {
      return NextResponse.json(
        { success: false, error: `Provider '${id}' not found` },
        { status: 404 }
      );
    }

    const response: Record<string, unknown> = {
      success: true,
      data: provider,
    };

    // Include historical data if requested
    if (includeHistory) {
      try {
        response.history = generateHistoricalData(id, historyPeriod);
      } catch (error) {
        console.error("Error generating historical data:", error);
        response.history = null;
      }
    }

    // Include incidents if requested
    if (includeIncidents) {
      response.incidents = getIncidents({ providerId: id });
    }

    // Include dependency graph if requested
    if (includeDependencies) {
      response.dependencies = getDependencyGraph();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching provider ${id} details:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch provider details" },
      { status: 500 }
    );
  }
}
