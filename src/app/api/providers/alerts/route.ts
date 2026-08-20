import { NextRequest, NextResponse } from "next/server";
import { getAlerts, acknowledgeAlert } from "@/lib/provider-health";

// GET /api/providers/alerts - List active alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const acknowledged = searchParams.get("acknowledged");

    const alerts = getAlerts({ 
      providerId, 
      severity,
      acknowledged: acknowledged === "true" ? true : acknowledged === "false" ? false : undefined,
    });

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// PUT /api/providers/alerts - Acknowledge alert
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.alertId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: alertId" },
        { status: 400 }
      );
    }

    if (body.action === "acknowledge") {
      const updatedAlert = acknowledgeAlert(body.alertId, body.acknowledgedBy);

      if (!updatedAlert) {
        return NextResponse.json(
          { success: false, error: "Alert not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedAlert,
        message: "Alert acknowledged successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'acknowledge'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
