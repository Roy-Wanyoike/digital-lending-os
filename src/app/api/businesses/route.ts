import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, requireAuth } from '@/lib/auth/api-helpers';
import { ok, created, badRequest, unauthorized, forbidden, withErrorHandler } from '@/backend/lib/api-response';
import { businessCreateSchema } from '@/backend/lib/validation/schemas';
import { getLogger } from '@/backend/lib/telemetry/logger';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const log = getLogger().withContext({ route: '/api/businesses' });

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

const getBusinessesHandler = withErrorHandler(async (req: NextRequest) => {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

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

  return ok(businesses);
});

export const GET = withApiTelemetry(withErrorHandler(getBusinessesHandler), '/api/businesses');

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  if (user.role !== 'admin') return forbidden();

  const body = await req.json();
  const parsed = businessCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Validation failed', parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  }

  const data = parsed.data;
  const business = await db.business.create({
    data: {
      name: data.name,
      description: data.description,
      industry: data.industry,
      website: data.website,
      logoUrl: data.logoUrl,
      country: data.country,
      tenantId: user.tenantId,
    },
  });

  log.info('Business created', { businessId: business.id, tenantId: user.tenantId });
  return created(business);
});
