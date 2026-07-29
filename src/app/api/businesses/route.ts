import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: any = undefined;
let _cacheAttempted = false;
async function getCache() {
  if (_cacheAttempted) return _cacheManager;
  _cacheAttempted = true;
  try {
    const mod = await import('@/backend/lib/cache/cache-manager');
    _cacheManager = mod.default;
  } catch {
    _cacheManager = undefined;
  }
  return _cacheManager;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const cacheManager = await getCache();
    const fetchBusinesses = () => db.business.findMany({
      where: { tenantId: user.tenantId },
      include: {
        passport: { select: { credentialLevel: true, kycStatus: true, amlStatus: true, riskRating: true } },
        trustScore: { select: { overallScore: true } },
        digitalTwin: { select: { healthScore: true, growthTrajectory: true, riskAppetite: true } },
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

    const businesses = cacheManager
      ? await cacheManager.getOrSet(`businesses:${user.tenantId}`, fetchBusinesses, { ttl: 5 * 60_000 })
      : await fetchBusinesses();

    return successResponse(businesses);
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
