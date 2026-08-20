import { NextRequest, NextResponse } from "next/server";
import { getIncidents, createIncident, updateIncident, Incident } from "@/lib/provider-health";

// GET /api/providers/incidents - List all incidents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || undefined;
    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;

    const incidents = getIncidents({ providerId, status, severity });

    return NextResponse.json({
      success: true,
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

// POST /api/providers/incidents - Create incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.providerId || !body.type || !body.description || !body.severity || !body.impact) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: providerId, type, description, severity, impact" 
        },
        { status: 400 }
      );
    }

    // Provider name mapping
    const providerNames: Record<string, string> = {
      mpesa: "M-Pesa STK Push",
      pesalink: "Pesalink Transfer",
      "card-gateway": "Card Payment Gateway",
      "bank-transfer": "Bank Transfer (EFT)",
      "id-verification": "ID Verification (NIDA)",
      "crb-check": "CRB Credit Check",
      biometrics: "Biometric Verification",
      "sms-gateway": "SMS Gateway (Africa's Talking)",
      "email-service": "Email Service (SendGrid)",
      "whatsapp-api": "WhatsApp Business API",
    };

    const incidentData = {
      providerId: body.providerId,
      providerName: providerNames[body.providerId] || body.providerId,
      type: body.type,
      description: body.description,
      severity: body.severity,
      status: (body.status || "active") as Incident["status"],
      impact: body.impact,
      affectedServices: body.affectedServices || [],
      rootCause: body.rootCause,
    };

    const incident = createIncident(incidentData);

    return NextResponse.json({
      success: true,
      data: incident,
      message: "Incident created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create incident" },
      { status: 500 }
    );
  }
}

// PUT /api/providers/incidents - Update incident (acknowledge/resolve)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.incidentId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: incidentId" },
        { status: 400 }
      );
    }

    const updates: Parameters<typeof updateIncident>[1] = {};
    
    if (body.action === "acknowledge") {
      updates.status = "acknowledged";
      updates.acknowledgedBy = body.acknowledgedBy || "unknown";
      updates.acknowledgedAt = new Date();
    } else if (body.action === "resolve") {
      updates.status = "resolved";
      updates.resolvedBy = body.resolvedBy || "unknown";
      updates.resolvedAt = new Date();
      updates.endTime = new Date();
      // Calculate duration
      const existingIncident = getIncidents({}).find(i => i.id === body.incidentId);
      if (existingIncident) {
        updates.duration = Math.round(
          (Date.now() - existingIncident.startTime.getTime()) / 60000
        );
      }
    }

    const updatedIncident = updateIncident(body.incidentId, updates);

    if (!updatedIncident) {
      return NextResponse.json(
        { success: false, error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedIncident,
      message: `Incident ${body.action}d successfully`,
    });
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
