import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getApiUser, AuthError } from '@/lib/auth/api-helpers';

const updateTwinSchema = z.object({
  healthScore: z.number().min(0).max(100).optional(),
  cashFlowHealth: z.number().min(0).max(100).optional(),
  riskAppetite: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  creditWorthiness: z.number().min(0).max(100).optional(),
  liquidityScore: z.number().min(0).max(100).optional(),
  growthTrajectory: z.enum(['declining', 'stable', 'growing', 'rapid_growth']).optional(),
});

// GET /api/twin/profiles/[id] — Get single digital twin with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;

    const twin = await db.financialDigitalTwin.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            country: true,
            industry: true,
            status: true,
            createdAt: true,
            tenantId: true,
          },
        },
        metrics: {
          take: 10,
          orderBy: { periodDate: 'desc' },
        },
        predictions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        snapshots: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!twin) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }
    if (twin.business.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(twin);
  } catch (error) {
    console.error('Error fetching digital twin:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: 'Failed to fetch digital twin' },
      { status: 500 }
    );
  }
}

// PUT /api/twin/profiles/[id] — Update digital twin fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTwinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    // Verify twin exists and belongs to tenant
    const existing = await db.financialDigitalTwin.findUnique({
      where: { id },
      include: { business: { select: { tenantId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }
    if (existing.business.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Digital twin not found' },
        { status: 404 }
      );
    }

    const twin = await db.financialDigitalTwin.update({
      where: { id },
      data: parsed.data,
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

    return NextResponse.json(twin);
  } catch (error) {
    console.error('Error updating digital twin:', error);
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error: 'Failed to update digital twin' },
      { status: 500 }
    );
  }
}
