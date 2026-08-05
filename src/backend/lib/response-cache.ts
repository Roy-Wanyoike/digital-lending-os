/**
 * Lightweight in-memory LRU Response Cache
 *
 * Designed as a first-level synchronous cache for server-side API routes.
 * O(1) lookups with zero async overhead — no serialization, no network calls.
 *
 * Use cases:
 *  - Dashboard stats (2s TTL) — catches repeated polls/auto-refreshes
 *  - Wallet lists (5s TTL) — tenant-scoped, keyed by tenantId
 *  - Transaction lists (3s TTL) — tenant + type + pagination scoped
 *  - Analytics aggregations (5s TTL) — relieves heavy 11-query aggregation
 *  - Escrow/Invoice/Collections lists (3–5s TTL) — tenant + filters scoped
 *
 * For longer TTLs or cross-process caching, use the Redis-backed
 * CacheManager from @/backend/lib/cache.
 *
 * LRU eviction: uses Map insertion order. get() moves entries to the end
 * (most recently used). set() inserts at the end. Eviction removes from
 * the beginning (least recently used).
 */

export class ResponseCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  /**
   * Get a cached value. Returns null on miss or expiry.
   * Updates LRU order on hit (moves to end = most recently used).
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now >= entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // LRU: delete and re-insert at end to mark as most recently used
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Store a value. Evicts LRU entry if at capacity.
   */
  set(key: string, data: any): void {
    // Remove existing entry (will be re-inserted at end)
    this.cache.delete(key);

    // Evict LRU entries until under capacity
    while (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
      else break;
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl,
    });
  }

  /** Invalidate a specific key. Returns true if key existed. */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Invalidate all keys matching a prefix (e.g. tenant-scoped caches). */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Clear all entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Current cache size. */
  get size(): number {
    return this.cache.size;
  }

  /** Cache statistics. */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttl,
    };
  }
}

/**
 * Create a new ResponseCache instance.
 *
 * @param maxSize Maximum entries before LRU eviction (default: 100)
 * @param ttlMs   Time-to-live per entry in milliseconds (default: 2000)
 */
export function createResponseCache(maxSize: number = 100, ttlMs: number = 2000): ResponseCache {
  return new ResponseCache(maxSize, ttlMs);
}

// ─── Pre-configured singletons for common routes ───────────────────────────────
// Each route imports the appropriate cache instance. Module-level singletons
// are shared across all requests within the same process.

/** Dashboard stats — 2s TTL, max 100 tenants */
export const dashboardStatsCache = createResponseCache(100, 2_000);

/** Wallet list — 5s TTL, max 100 tenant×business combos */
export const walletListCache = createResponseCache(100, 5_000);

/** Transaction list — 3s TTL, max 100 tenant×type×page combos */
export const transactionListCache = createResponseCache(100, 3_000);

/** Analytics aggregation — 5s TTL, max 50 tenant×period combos */
export const analyticsCache = createResponseCache(50, 5_000);

/** Escrow transaction list — 3s TTL, max 100 tenant×filter combos */
export const escrowListCache = createResponseCache(100, 3_000);

/** Invoice list — 5s TTL, max 50 tenant×page combos */
export const invoiceListCache = createResponseCache(50, 5_000);

/** Collection case list — 3s TTL, max 100 tenant×filter combos */
export const collectionListCache = createResponseCache(100, 3_000);
