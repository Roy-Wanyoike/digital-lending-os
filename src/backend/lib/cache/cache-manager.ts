/**
 * Cache Manager — Youngsend Caching Layer
 *
 * High-level typed cache abstraction with:
 *  - get<T> / set<T> / delete / invalidatePattern / invalidateByPrefix / exists / increment / decrement
 *  - TTL support
 *  - Cache tags for bulk invalidation
 *  - Stale-while-revalidate (SWR) pattern
 *  - Cache stampede protection (singleflight)
 *  - JSON serialization with type safety
 */

import { getCacheClient, CacheClient, CacheMetrics } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

/** JSON-serializable types that can be cached. */
export type Cacheable = string | number | boolean | null | undefined | Cacheable[] | { [key: string]: Cacheable };

export interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: number;
  ttl: number;
  tags: string[];
  version: string;
}

export interface SetOptions {
  /** TTL in milliseconds */
  ttl?: number;
  /** Tags for bulk invalidation */
  tags?: string[];
  /** Cache namespace / prefix */
  namespace?: string;
}

export interface GetOptions {
  /** Namespace prefix */
  namespace?: string;
  /** If true, return stale data and revalidate in background */
  staleWhileRevalidate?: boolean;
  /** Grace period in ms for SWR (time after TTL expires to serve stale) */
  staleGraceMs?: number;
  /** Revalidation callback to refresh the cache */
  revalidate?: () => Promise<Cacheable>;
}

export interface IncrementOptions {
  /** Amount to increment (default: 1) */
  by?: number;
  /** TTL in ms, set only if the key doesn't exist yet */
  ttl?: number;
  /** Namespace prefix */
  namespace?: string;
}

export interface SingleflightCall<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export interface CacheManagerConfig {
  /** Default TTL in ms (default: 60_000 = 1 minute) */
  defaultTtl?: number;
  /** Default namespace prefix */
  defaultNamespace?: string;
  /** Enable singleflight (stampede protection) */
  enableSingleflight?: boolean;
  /** Cache version — bump to invalidate all caches */
  version?: string;
}

// ─── Serialization ───────────────────────────────────────────────────────────

const CACHE_PREFIX = 'ys:cache:';
const TAG_PREFIX = 'ys:tag:';

let CACHE_VERSION = 'v1';

function serialize<T>(data: T, tags: string[] = [], ttl: number = 0): string {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttl,
    tags,
    version: CACHE_VERSION,
  };
  return JSON.stringify(entry);
}

function deserialize<T>(raw: string | null): CacheEntry<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.version !== CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Cache Manager ───────────────────────────────────────────────────────────

export class CacheManager {
  private client: CacheClient;
  private config: Required<CacheManagerConfig>;
  private inflight = new Map<string, SingleflightCall<unknown>>();
  private revalidating = new Set<string>();

  constructor(client?: CacheClient, config?: CacheManagerConfig) {
    this.client = client || getCacheClient();
    this.config = {
      defaultTtl: config?.defaultTtl ?? 60_000,
      defaultNamespace: config?.defaultNamespace ?? 'default',
      enableSingleflight: config?.enableSingleflight ?? true,
      version: config?.version ?? 'v1',
    };
    CACHE_VERSION = this.config.version;
  }

  // ── Key Building ──────────────────────────────────────────────────────

  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.config.defaultNamespace;
    return `${CACHE_PREFIX}${ns}:${key}`;
  }

  private buildTagKey(tag: string): string {
    return `${TAG_PREFIX}${tag}:keys`;
  }

  // ── Core Methods ──────────────────────────────────────────────────────

  /**
   * Get a typed value from cache.
   */
  async get<T extends Cacheable>(key: string, options?: GetOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);
    const raw = await this.client.get(fullKey);

    if (!raw) return null;

    const entry = deserialize<T>(raw);
    if (!entry) return null;

    const age = Date.now() - entry.cachedAt;
    const isExpired = entry.ttl > 0 && age > entry.ttl;
    const graceMs = options?.staleGraceMs ?? 0;

    if (!isExpired) {
      return entry.data;
    }

    // Stale-while-revalidate
    if (options?.staleWhileRevalidate && graceMs > 0 && age < entry.ttl + graceMs) {
      if (options.revalidate && !this.revalidating.has(fullKey)) {
        this.revalidating.add(fullKey);
        options
          .revalidate()
          .then((freshData) =>
            this.set(key, freshData as T, {
              ttl: entry.ttl,
              tags: entry.tags,
              namespace: options?.namespace,
            })
          )
          .catch(() => { /* stale data remains */ })
          .finally(() => this.revalidating.delete(fullKey));
      }
      return entry.data;
    }

    return null;
  }

  /**
   * Get with cache stampede protection (singleflight).
   * If multiple callers request the same key simultaneously,
   * only one fetch function is executed.
   */
  async getOrSet<T extends Cacheable>(
    key: string,
    fetch: () => Promise<T>,
    options?: SetOptions & GetOptions
  ): Promise<T> {
    if (this.config.enableSingleflight) {
      const fullKey = this.buildKey(key, options?.namespace);
      const existing = this.inflight.get(fullKey);
      if (existing) {
        return existing.promise as Promise<T>;
      }

      let resolve!: (value: T) => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      this.inflight.set(fullKey, { promise, resolve, reject } as SingleflightCall<unknown>);

      try {
        const cached = await this.get<T>(key, options);
        if (cached !== null) {
          resolve(cached);
          return promise;
        }

        const data = await fetch();
        await this.set(key, data, options);
        resolve(data);
        return promise;
      } catch (error) {
        reject(error as Error);
        return promise;
      } finally {
        this.inflight.delete(fullKey);
      }
    }

    const cached = await this.get<T>(key, options);
    if (cached !== null) return cached;

    const data = await fetch();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Set a typed value in cache.
   */
  async set<T extends Cacheable>(key: string, value: T, options?: SetOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);
    const ttl = options?.ttl ?? this.config.defaultTtl;
    const tags = options?.tags ?? [];

    const serialized = serialize(value, tags, ttl);
    await this.client.set(fullKey, serialized, ttl);

    // Register keys under each tag
    if (tags.length > 0) {
      await Promise.all(
        tags.map(async (tag) => {
          const tagKey = this.buildTagKey(tag);
          const existing = await this.client.get(tagKey);
          const members: string[] = existing ? JSON.parse(existing) : [];
          if (!members.includes(fullKey)) {
            members.push(fullKey);
            await this.client.set(tagKey, JSON.stringify(members), ttl * 2);
          }
        })
      );
    }
  }

  /**
   * Delete one or more keys from cache.
   */
  async delete(key: string | string[], namespace?: string): Promise<number> {
    const keys = (Array.isArray(key) ? key : [key]).map((k) =>
      this.buildKey(k, namespace)
    );
    return this.client.del(keys);
  }

  /**
   * Check if a key exists.
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    return this.client.exists(fullKey);
  }

  /**
   * Increment a counter key.
   */
  async increment(key: string, options?: IncrementOptions): Promise<number> {
    const fullKey = this.buildKey(key, options?.namespace);
    let result = 0;
    const by = options?.by ?? 1;

    for (let i = 0; i < by; i++) {
      result = await this.client.increment(fullKey);
    }

    if (options?.ttl && result === by) {
      await this.client.expire(fullKey, options.ttl);
    }

    return result;
  }

  /**
   * Decrement a counter key.
   */
  async decrement(key: string, options?: IncrementOptions): Promise<number> {
    const fullKey = this.buildKey(key, options?.namespace);
    let result = 0;
    const by = options?.by ?? 1;

    for (let i = 0; i < by; i++) {
      result = await this.client.decrement(fullKey);
    }

    if (options?.ttl && result === -by) {
      await this.client.expire(fullKey, options.ttl);
    }

    return result;
  }

  /**
   * Invalidate all cache entries matching a glob pattern.
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<number> {
    const fullPattern = this.buildKey(pattern, namespace);
    const matchedKeys = await this.client.keys(fullPattern);
    if (matchedKeys.length === 0) return 0;
    return this.client.del(matchedKeys);
  }

  /**
   * Invalidate all cache entries with a given prefix.
   */
  async invalidateByPrefix(prefix: string, namespace?: string): Promise<number> {
    return this.invalidatePattern(`${prefix}*`, namespace);
  }

  /**
   * Invalidate all cache entries tagged with a specific tag.
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = this.buildTagKey(tag);
    const raw = await this.client.get(tagKey);

    if (!raw) return 0;

    let members: string[];
    try {
      members = JSON.parse(raw);
    } catch {
      return 0;
    }

    if (members.length === 0) return 0;

    await this.client.del(tagKey);
    return this.client.del(members);
  }

  /**
   * Invalidate multiple tags at once.
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const results = await Promise.all(tags.map((t) => this.invalidateByTag(t)));
    return results.reduce((sum, n) => sum + n, 0);
  }

  /**
   * Clear all cache entries with the configured namespace prefix.
   */
  async clear(namespace?: string): Promise<number> {
    return this.invalidatePattern('*', namespace);
  }

  /**
   * Get cache metrics from the underlying client.
   */
  getMetrics(): CacheMetrics {
    return this.client.getMetrics();
  }

  /**
   * Check the health of the cache backend.
   */
  async healthCheck() {
    return this.client.healthCheck();
  }

  /**
   * Get the underlying raw client (for advanced use cases).
   */
  getRawClient(): CacheClient {
    return this.client;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _manager: CacheManager | null = null;

/**
 * Get the default CacheManager singleton.
 */
export function getCacheManager(config?: CacheManagerConfig): CacheManager {
  if (!_manager) {
    _manager = new CacheManager(undefined, config);
  }
  return _manager;
}

/**
 * Create a named CacheManager instance (for isolating different cache domains).
 */
export function createCacheManager(config?: CacheManagerConfig): CacheManager {
  return new CacheManager(undefined, config);
}

export default getCacheManager();

