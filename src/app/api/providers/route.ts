import { NextRequest, NextResponse } from "next/server";
import { performHealthCheck } from "@/lib/provider-health";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    
    const healthResult = performHealthCheck(tenantId);
    
    return NextResponse.json({
      success: true,
      data: healthResult,
    });
  } catch (error) {
    console.error("Error fetching provider health:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch provider health" },
      { status: 500 }
    );
  }
}
