import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const businesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: {
            sentInvoices: true,
            receivedInvoices: true,
            verifications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ businesses });
  } catch (error: any) {
    console.error('Businesses GET error:', error);
    return errorResponse('Failed to fetch businesses', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    if (user.role !== 'admin') {
      return errorResponse('Insufficient permissions', 403);
    }

    const body = await req.json();
    const { name, description, industry, website, logoUrl, country } = body;

    if (!name) return errorResponse('Business name is required', 400);

    const business = await db.business.create({
      data: {
        name,
        description: description || '',
        industry: industry || '',
        website: website || '',
        logoUrl: logoUrl || '',
        country: country || 'US',
        tenantId: user.tenantId,
      },
    });

    return successResponse(business, 201);
  } catch (error: any) {
    console.error('Businesses POST error:', error);
    return errorResponse('Failed to create business', 500);
  }
}
