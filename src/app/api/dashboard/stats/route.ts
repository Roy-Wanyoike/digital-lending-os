import { NextRequest } from 'next/server';
import { getApiUser, requireAuth, AuthError } from '@/lib/auth/api-helpers';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
import { dashboardStatsCache } from '@/backend/lib/response-cache';
import { badRequest, error, ok, unauthorized, withErrorHandler } from '@/backend/lib/api-response';
import { fetchDashboardStats } from '@/backend/lib/dashboard-stats-helper';
import type { CacheManager } from '@/backend/lib/cache/cache-manager';

// Lazy-load cache manager — graceful fallback if Redis/OTel not installed
let _cacheManager: CacheManager | undefined = undefined;
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

// GET /api/dashboard/stats — Dashboard aggregation stats
async function getHandler(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user || !user.tenantId) {
      return unauthorized('Authentication required');
    }

    const cacheManager = await getCache();

    const fetchStats = () => fetchDashboardStats(user.tenantId);

    // First-level: synchronous in-memory cache (2s TTL) — zero async overhead
    const memKey = `stats:${user.tenantId}`;
    const memCached = dashboardStatsCache.get(memKey);
    if (memCached) {
      return ok(memCached , undefined, { noCache: true })
    }

    // Second-level: Redis-backed cache (30s TTL) with singleflight stampede protection
    const data = cacheManager
      ? await cacheManager.getOrSet(`dashboard:stats:${user.tenantId}`, fetchStats as unknown as () => Promise<import('@/backend/lib/cache/cache-manager').Cacheable>, { ttl: 30_000 })
      : await fetchStats();

    // Populate first-level cache for subsequent requests within 2s
    dashboardStatsCache.set(memKey, data);

    return ok(data, undefined, { maxAge: 5, swr: 10 });
  } catch (err: any) {console.error('Error fetching dashboard stats:', err);
    return error('Failed to fetch dashboard stats');
  }
}

// POST /api/dashboard/stats — Force-refresh cached stats
async function postHandler(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user.tenantId) {
      return badRequest('Tenant ID required');
    }

    // Invalidate both cache layers
    dashboardStatsCache.invalidate(`stats:${user.tenantId}`);
    const cacheManager = await getCache();
    const cacheKey = `dashboard:stats:${user.tenantId}`;
    if (cacheManager) {
      await cacheManager.delete(cacheKey);
    }

    return ok({ message: 'Cache invalidated' })
  } catch (error: any) {console.error('Error invalidating dashboard stats cache:', error);
    return error('Failed to invalidate cache');
  }
}

export const GET = withApiTelemetry(withErrorHandler(getHandler), '/api/dashboard/stats');
export const POST = withApiTelemetry(withErrorHandler(postHandler), '/api/dashboard/stats');
