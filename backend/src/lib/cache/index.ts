/**
 * Cache Interface & In-Memory Implementation
 * 
 * Provides a unified caching interface with:
 * - In-memory cache (default, for development)
 * - Redis cache (for production)
 * - Automatic fallback
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes)
   */
  ttl?: number;

  /**
   * Key prefix for namespacing
   */
  prefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

// =============================================================================
// CACHE INTERFACE
// =============================================================================

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<number>;
  keys(pattern?: string): Promise<string[]>;
  getStats(): CacheStats;
  disconnect?(): Promise<void>;
}

// =============================================================================
// IN-MEMORY CACHE IMPLEMENTATION
// =============================================================================

class MemoryCache implements ICache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private defaultTTL: number = 300; // 5 minutes
  private maxSize: number = 10000; // Max entries

  constructor(options?: { defaultTTL?: number; maxSize?: number; cleanupIntervalMs?: number }) {
    if (options?.defaultTTL) this.defaultTTL = options.defaultTTL;
    if (options?.maxSize) this.maxSize = options.maxSize;

    // Start cleanup interval for expired entries
    const cleanupMs = options?.cleanupIntervalMs || 60000; // Default 1 minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.size--;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || this.defaultTTL;
    
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
    };

    this.store.set(key, entry as CacheEntry<unknown>);
    this.stats.sets++;
    
    if (!this.store.has(key)) {
      this.stats.size++;
    }
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.deletes++;
      this.stats.size--;
    }
    return existed;
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(pattern?: string): Promise<number> {
    let count = 0;

    if (!pattern) {
      count = this.store.size;
      this.store.clear();
      this.stats.size = 0;
    } else {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.store.keys()) {
        if (regex.test(key)) {
          this.store.delete(key);
          count++;
        }
      }
      this.stats.size = this.store.size;
    }

    return count;
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      return Array.from(this.store.keys());
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.stats.size = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.size--;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
        this.stats.size--;
      }
    }

    if (cleaned > 0) {
      // Silent cleanup - no logging unless debugging
    }
  }
}

// =============================================================================
// REDIS CACHE IMPLEMENTATION
// =============================================================================

let RedisClient: any = null;

class RedisCache implements ICache {
  private client: any;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 };
  private prefix: string = 'dlos:';
  private enabled: boolean = true;

  constructor(options?: { url?: string; prefix?: string }) {
    if (options?.prefix) {
      this.prefix = options.prefix;
    }

    try {
      // Dynamic import for Redis (optional dependency)
      require('ioredis');
      this.enabled = true;
    } catch {
      console.warn('[Cache] Redis not available, using memory cache');
      this.enabled = false;
    }
  }

  private getClient(): any {
    if (!this.enabled || !this.client) {
      throw new Error('Redis not available');
    }
    return this.client;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      const data = await client.get(this.getKey(key));
      
      if (data === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const client = this.getClient();
      const ttl = options?.ttl || 300;
      
      await client.set(
        this.getKey(key),
        JSON.stringify(value),
        'EX',
        ttl
      );
      
      this.stats.sets++;
    } catch (error) {
      // Silently fail - cache should not break the app
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.del(this.getKey(key));
      this.stats.deletes++;
      return result > 0;
    } catch {
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.exists(this.getKey(key));
      return result > 0;
    } catch {
      return false;
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      const client = this.getClient();
      const searchPattern = pattern ? this.getKey(pattern) : `${this.prefix}*`;
      const keys = await client.keys(searchPattern);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
      
      return keys.length;
    } catch {
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const client = this.getClient();
      const searchPattern = pattern ? this.getKey(pattern) : `${this.prefix}*`;
      const keys = await client.keys(searchPattern);
      
      // Remove prefix from returned keys
      return keys.map((k: string) => k.replace(this.prefix, ''));
    } catch {
      return [];
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

// =============================================================================
// UNIFIED CACHE MANAGER
// =============================================================================

class CacheManager implements ICache {
  private primary: ICache;
  private fallback: MemoryCache;
  private useRedis: boolean;

  constructor(options?: { redisUrl?: string; prefix?: string; defaultTTL?: number; useMemoryOnly?: boolean }) {
    this.useRedis = !options?.useMemoryOnly && !!process.env.REDIS_URL;
    
    if (this.useRedis) {
      this.primary = new RedisCache({
        url: options?.redisUrl || process.env.REDIS_URL,
        prefix: options?.prefix,
      });
    } else {
      this.primary = new MemoryCache({
        defaultTTL: options?.defaultTTL,
      });
    }

    this.fallback = new MemoryCache({ defaultTTL: options?.defaultTTL });
    
    console.log(`[Cache] Initialized with ${this.useRedis ? 'Redis' : 'In-Memory'} backend`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.primary.get<T>(key);
      if (value !== null) return value;
    } catch (error) {
      // Fall back to memory cache on error
    }

    return this.fallback.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      await this.primary.set(key, value, options);
    } catch (error) {
      // Silently continue
    }

    // Always update fallback
    await this.fallback.set(key, value, options);
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.primary.delete(key);
    } catch (error) {
      // Continue
    }

    return this.fallback.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(pattern?: string): Promise<number> {
    try {
      await this.primary.clear(pattern);
    } catch (error) {
      // Continue
    }

    return this.fallback.clear(pattern);
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.primary.keys(pattern);
    } catch {
      return this.fallback.keys(pattern);
    }
  }

  getStats(): CacheStats {
    const primaryStats = this.primary.getStats();
    const fallbackStats = this.fallback.getStats();
    
    return {
      hits: primaryStats.hits + fallbackStats.hits,
      misses: primaryStats.misses + fallbackStats.misses,
      sets: primaryStats.sets + fallbackStats.sets,
      deletes: primaryStats.deletes + fallbackStats.deletes,
      size: Math.max(primaryStats.size, fallbackStats.size),
    };
  }

  async disconnect(): Promise<void> {
    try {
      if ((this.primary as any).disconnect) {
        await (this.primary as any).disconnect();
      }
    } catch (error) {
      // Continue
    }
    
    await this.fallback.disconnect();
  }
}

// =============================================================================
// PREDEFINED CACHE KEYS & HELPERS
// =============================================================================

export const CacheKeys = {
  // Tenant caches
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantBySlug: (slug: string) => `tenant:slug:${slug}`,
  
  // Customer caches
  customer: (id: string) => `customer:${id}`,
  customerList: (tenantId: string, params: string) => `customers:${tenantId}:${params}`,
  
  // Loan caches
  loan: (id: string) => `loan:${id}`,
  loanList: (tenantId: string, params: string) => `loans:${tenantId}:${params}`,
  
  // Product caches
  products: (tenantId: string) => `products:${tenantId}`,
  
  // Dashboard caches
  dashboardStats: (tenantId: string) => `dashboard:stats:${tenantId}`,
  dashboardCharts: (tenantId: string, type: string) => `dashboard:charts:${tenantId}:${type}`,
  
  // Credit score cache
  creditScore: (customerId: string) => `credit:score:${customerId}`,
  
  // Config caches
  config: (key: string) => `config:${key}`,
};

/**
 * Cache decorator for service methods
 * 
 * Usage:
 * ```typescript
 * @Cacheable(CacheKeys.customer(':id'), { ttl: 300 })
 * async getCustomer(id: string) { ... }
 * ```
 */
export function Cacheable(
  keyGenerator: (...args: unknown[]) => string,
  options?: CacheOptions
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = cacheManager;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      if (result !== undefined && result !== null) {
        await cache.set(key, result, options);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidator(
  keyGenerator: (...args: unknown[]) => string | string[]
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = cacheManager;

    descriptor.value = async function (...args: unknown[]) {
      // Execute original method first
      const result = await originalMethod.apply(this, args);
      
      // Invalidate cache(s)
      const keys = keyGenerator(...args);
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      for (const key of keyArray) {
        await cache.delete(key);
      }

      return result;
    };

    return descriptor;
  };
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const cacheManager = new CacheManager({
  redisUrl: process.env.REDIS_URL,
  prefix: 'dlos:',
  defaultTTL: 300,
});

// Export individual implementations for direct use
export { MemoryCache, RedisCache };

export default cacheManager;
