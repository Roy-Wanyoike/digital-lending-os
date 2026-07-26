import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

const createTwinSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
});

// GET /api/twin/profiles — List financial digital twins
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const minHealthScore = searchParams.get('minHealthScore');
    const growthTrajectory = searchParams.get('growthTrajectory');

    const where: Record<string, unknown> = { business: { tenantId: user.tenantId } };

    if (businessId) {
      where.businessId = businessId;
    }
    if (minHealthScore) {
      where.healthScore = { gte: parseFloat(minHealthScore) };
    }
    if (growthTrajectory) {
      where.growthTrajectory = growthTrajectory;
    }

    const twins = await db.financialDigitalTwin.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            country: true,
            industry: true,
          },
        },
        metrics: {
          orderBy: { periodDate: 'asc' },
          take: 6,
        },
        predictions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(twins);
  } catch (error) {
    console.error('Error listing digital twins:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json(
      { error: 'Failed to list digital twins' },
      { status: 500 }
    );
  }
}

// POST /api/twin/profiles — Create a financial digital twin
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const body = await request.json();
    const parsed = createTwinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { businessId } = parsed.data;

    // Check business exists and belongs to tenant
    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check business doesn't already have a twin
    const existingTwin = await db.financialDigitalTwin.findUnique({
      where: { businessId },
    });

    if (existingTwin) {
      return NextResponse.json(
        { error: 'This business already has a financial digital twin' },
        { status: 409 }
      );
    }

    const twin = await db.financialDigitalTwin.create({
      data: {
        businessId,
        healthScore: 50.0,
        cashFlowHealth: 50.0,
        riskAppetite: 'moderate',
        creditWorthiness: 50.0,
        liquidityScore: 50.0,
        growthTrajectory: 'stable',
        aiModelVersion: 'v1.0',
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            country: true,
            industry: true,
          },
        },
      },
    });

    return NextResponse.json(twin, { status: 201 });
  } catch (error) {
    console.error('Error creating digital twin:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json(
      { error: 'Failed to create digital twin' },
      { status: 500 }
    );
  }
}
