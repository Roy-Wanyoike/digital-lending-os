/**
 * Tenant Business IDs Cache
 *
 * Many API routes query `db.business.findMany({ tenantId })` to get the list of
 * business IDs for a tenant. This happens on every single API call for that tenant.
 * With SQLite, this is a fast query, but it still adds ~1-2ms per request.
 *
 * This module provides an in-memory cache with short TTL (5s) that eliminates
 * the redundant DB round-trip. The TTL is short enough that new businesses
 * appear almost immediately, but long enough to batch multiple API calls.
 */

const CACHE_TTL_MS = 5_000; // 5 seconds
const MAX_CACHE_ENTRIES = 500; // Prevent unbounded growth with many tenants

interface CacheEntry {
  ids: string[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function now(): number {
  return Date.now();
}

function evictExpired(): void {
  const n = now();
  for (const [key, entry] of cache) {
    if (n >= entry.expiresAt) cache.delete(key);
  }
}

function evictOldestIfFull(): void {
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
    else break;
  }
}

/**
 * Get business IDs for a tenant. Uses a short-lived in-memory cache.
 * Falls back to direct DB query if cache misses.
 *
 * @param tenantId The tenant ID to look up businesses for
 * @param db The Prisma client instance (lazy proxy)
 * @returns Array of business ID strings
 */
export async function getTenantBusinessIds(
  tenantId: string,
  db: any
): Promise<string[]> {
  // Lazy eviction — runs at most once per call
  evictExpired();

  const cached = cache.get(tenantId);
  if (cached && now() < cached.expiresAt) {
    return cached.ids;
  }

  // Cache miss — fetch from DB
  const businesses = await db.business.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const ids = businesses.map((b: { id: string }) => b.id);

  // Store in cache (evict oldest if at capacity)
  cache.set(tenantId, {
    ids,
    expiresAt: now() + CACHE_TTL_MS,
  });
  evictOldestIfFull();

  return ids;
}

/**
 * Invalidate the cache for a specific tenant.
 * Call this after creating/deleting a business.
 */
export function invalidateTenantCache(tenantId: string): void {
  cache.delete(tenantId);
}

/**
 * Invalidate all tenant caches (e.g., after bulk operations).
 */
export function invalidateAllTenantCaches(): void {
  cache.clear();
}
