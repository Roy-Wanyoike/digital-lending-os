/**
 * Redis Client — Youngsend Caching Layer
 *
 * Factory pattern returning either a real ioredis client (cluster-aware)
 * or an in-memory LRU fallback when REDIS_URL is absent or Redis is down.
 *
 * Features:
 *  - Connection pooling via ioredis cluster config
 *  - Automatic reconnection with exponential back-off
 *  - Circuit breaker pattern (open after N consecutive failures)
 *  - Health check endpoint
 *  - In-memory LRU fallback when Redis is unavailable
 *  - Connection metrics (latency, hit/miss, error counts)
 */

import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latencyMs: number;
  lastError: string | null;
  lastErrorAt: number | null;
  circuitBreakerOpen: boolean;
  fallbackActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'fallback';
  poolSize: number;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  increment(key: string): Promise<number>;
  decrement(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  ping(): Promise<string>;
  healthCheck(): Promise<HealthCheckResult>;
  getMetrics(): CacheMetrics;
  isAvailable(): boolean;
  quit(): Promise<void>;
  on(event: string, fn: (...args: any[]) => void): void;
  off(event: string, fn: (...args: any[]) => void): void;
  /** Subscriber-only client (needed for pub/sub) */
  duplicate(): CacheClient;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  error?: string;
  timestamp: number;
  memoryUsage?: string;
  connectedClients?: number;
}

// ─── LRU Cache Implementation ────────────────────────────────────────────────

class LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;
  expiresAt: number;

  constructor(key: string, value: T, ttlMs: number) {
    this.key = key;
    this.value = value;
    this.expiresAt = ttlMs > 0 ? Date.now() + ttlMs : Infinity;
  }
}

class LRUCache {
  private capacity: number;
  private map = new Map<string, LRUNode<string>>();
  private head: LRUNode<string> | null = null;
  private tail: LRUNode<string> | null = null;

  constructor(capacity = 1000) {
    this.capacity = capacity;
  }

  get(key: string): string | null {
    const node = this.map.get(key);
    if (!node) return null;
    if (node.expiresAt < Date.now()) {
      this.removeNode(node);
      this.map.delete(key);
      return null;
    }
    this.moveToHead(node);
    return node.value;
  }

  set(key: string, value: string, ttlMs = 0): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = ttlMs > 0 ? Date.now() + ttlMs : Infinity;
      this.moveToHead(existing);
      return;
    }

    const node = new LRUNode(key, value, ttlMs);
    this.map.set(key, node);
    this.addToHead(node);

    if (this.map.size > this.capacity) {
      const tail = this.tail!;
      this.removeNode(tail);
      this.map.delete(tail.key);
    }
  }

  delete(key: string): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  keys(): string[] {
    const now = Date.now();
    const result: string[] = [];
    for (const [key, node] of this.map) {
      if (node.expiresAt > now) {
        result.push(key);
      }
    }
    return result;
  }

  has(key: string): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (node.expiresAt < Date.now()) {
      this.removeNode(node);
      this.map.delete(key);
      return false;
    }
    return true;
  }

  size(): number {
    return this.map.size;
  }

  private addToHead(node: LRUNode<string>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: LRUNode<string>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: LRUNode<string>): void {
    this.removeNode(node);
    this.addToHead(node);
  }
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    halfOpenSuccessThreshold = 2
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
  }

  canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
          this.state = CircuitState.HALF_OPEN;
          this.successCount = 0;
          return true;
        }
        return false;
      case CircuitState.HALF_OPEN:
        return true;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  getState(): string {
    return this.state;
  }
}

// ─── Connection Metrics ──────────────────────────────────────────────────────

class ConnectionMetrics {
  private _hits = 0;
  private _misses = 0;
  private _errors = 0;
  private _totalLatencyMs = 0;
  private _operationCount = 0;
  private _lastError: string | null = null;
  private _lastErrorAt: number | null = null;

  recordHit(): void {
    this._hits++;
  }

  recordMiss(): void {
    this._misses++;
  }

  recordError(error: Error): void {
    this._errors++;
    this._lastError = error.message;
    this._lastErrorAt = Date.now();
  }

  recordLatency(ms: number): void {
    this._totalLatencyMs += ms;
    this._operationCount++;
  }

  get avgLatencyMs(): number {
    return this._operationCount > 0 ? this._totalLatencyMs / this._operationCount : 0;
  }

  get hits(): number {
    return this._hits;
  }

  get misses(): number {
    return this._misses;
  }

  get errors(): number {
    return this._errors;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get lastErrorAt(): number | null {
    return this._lastErrorAt;
  }
}

// ─── Redis Client Implementation ─────────────────────────────────────────────

class RedisCacheClient implements CacheClient {
  private client: Redis | Cluster;
  private circuitBreaker: CircuitBreaker;
  private metrics: ConnectionMetrics;
  private _isAvailable = true;
  private _fallback: LRUCache;
  private _status: 'connected' | 'disconnected' | 'fallback' = 'connected';

  constructor(redisUrl?: string) {
    this.circuitBreaker = new CircuitBreaker(
      parseInt(process.env.CACHE_CIRCUIT_FAILURE_THRESHOLD || '5', 10),
      parseInt(process.env.CACHE_CIRCUIT_RESET_MS || '30000', 10),
      2
    );
    this.metrics = new ConnectionMetrics();
    this._fallback = new LRUCache(
      parseInt(process.env.LRU_CACHE_CAPACITY || '500', 10)
    );

    this.client = this.createClient(redisUrl);
    this.setupEventHandlers();
  }

  private createClient(redisUrl?: string): Redis | Cluster {
    const url = redisUrl || process.env.REDIS_URL;

    // Cluster mode detection: comma-separated URLs
    if (url && url.includes(',')) {
      const nodes = url.split(',').map(
        (u) =>
          ({
            host: new URL(u.trim()).hostname,
            port: parseInt(new URL(u.trim()).port || '6379', 10),
          } as RedisOptions)
      );

      const clusterOptions: ClusterOptions = {
        clusterRetryStrategy: (times) => {
          const delay = Math.min(times * 200, 5000);
          return delay;
        },
        enableReadyCheck: true,
        scaleReads: 'slave',
        maxRedirections: 16,
        retryDelayOnClusterDown: 500,
        retryDelayOnFailover: 200,
        slotsRefreshTimeout: 2000,
        slotsRefreshInterval: 15000,
        natMap: null,
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          tls: url.startsWith('rediss:') ? {} : undefined,
          connectTimeout: 5000,
          commandTimeout: 3000,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          lazyConnect: true,
        },
      };

      const cluster = new Cluster(nodes, clusterOptions);
      cluster.connect().catch(() => {
        /* handled by event handlers */
      });
      return cluster;
    }

    // Single-node mode
    const options: RedisOptions = {
      url: url || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      tls: url?.startsWith('rediss:') ? {} : undefined,
      connectTimeout: 5000,
      commandTimeout: 3000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 10) return null; // stop retrying after 10 attempts
        const delay = Math.min(times * 150, 3000);
        return delay;
      },
      // Connection pooling via ioredis built-in
      // ioredis manages a connection pool internally
      family: 0,
    };

    const client = new Redis(options);
    client.connect().catch(() => {
      /* handled by event handlers */
    });
    return client;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this._isAvailable = true;
      this._status = 'connected';
    });

    this.client.on('ready', () => {
      this._isAvailable = true;
      this._status = 'connected';
    });

    this.client.on('error', (err: Error) => {
      this.metrics.recordError(err);
      this.circuitBreaker.recordFailure();

      if (this.circuitBreaker.isOpen()) {
        this._isAvailable = false;
        this._status = 'fallback';
      }
    });

    this.client.on('close', () => {
      this._isAvailable = false;
      this._status = 'disconnected';
    });

    this.client.on('reconnecting', () => {
      this._status = 'disconnected';
    });

    this.client.on('end', () => {
      this._isAvailable = false;
      this._status = 'fallback';
    });
  }

  private async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      return fallback();
    }

    const start = Date.now();
    try {
      const result = await operation();
      this.circuitBreaker.recordSuccess();
      this.metrics.recordLatency(Date.now() - start);
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.metrics.recordError(error as Error);
      return fallback();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return this._fallback.get(key);
    }

    return this.withCircuitBreaker(
      () => this.client.get(key),
      () => this._fallback.get(key)
    );
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (!this.isAvailable()) {
      this._fallback.set(key, value, ttlMs);
      return;
    }

    await this.withCircuitBreaker(async () => {
      if (ttlMs && ttlMs > 0) {
        await this.client.set(key, value, 'PX', ttlMs);
      } else {
        await this.client.set(key, value);
      }
      // Also store in fallback for seamless degradation
      this._fallback.set(key, value, ttlMs);
    }, () => {
      this._fallback.set(key, value, ttlMs);
    });
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    // Always clear from fallback
    keys.forEach((k) => this._fallback.delete(k));

    if (!this.isAvailable()) return keys.length;

    return this.withCircuitBreaker(
      () => this.client.del(...keys),
      () => keys.length
    );
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return this._fallback.has(key);
    }

    return this.withCircuitBreaker(
      async () => (await this.client.exists(key)) === 1,
      () => this._fallback.has(key)
    );
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) {
      return this._fallback.keys();
    }

    return this.withCircuitBreaker(
      () => this.client.keys(pattern),
      () => this._fallback.keys()
    );
  }

  async increment(key: string): Promise<number> {
    if (!this.isAvailable()) {
      const val = this._fallback.get(key);
      const num = val ? parseInt(val, 10) + 1 : 1;
      this._fallback.set(key, String(num));
      return num;
    }

    return this.withCircuitBreaker(
      () => this.client.incr(key),
      () => {
        const val = this._fallback.get(key);
        const num = val ? parseInt(val, 10) + 1 : 1;
        this._fallback.set(key, String(num));
        return num;
      }
    );
  }

  async decrement(key: string): Promise<number> {
    if (!this.isAvailable()) {
      const val = this._fallback.get(key);
      const num = val ? parseInt(val, 10) - 1 : -1;
      this._fallback.set(key, String(num));
      return num;
    }

    return this.withCircuitBreaker(
      () => this.client.decr(key),
      () => {
        const val = this._fallback.get(key);
        const num = val ? parseInt(val, 10) - 1 : -1;
        this._fallback.set(key, String(num));
        return num;
      }
    );
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return this.withCircuitBreaker(
      async () => (await this.client.pexpire(key, ttlMs)) === 1,
      () => false
    );
  }

  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -1;
    return this.withCircuitBreaker(
      () => this.client.pttl(key),
      () => -1
    );
  }

  async ping(): Promise<string> {
    if (!this.isAvailable()) return 'PONG (fallback)';
    return this.withCircuitBreaker(
      () => this.client.ping(),
      () => 'PONG (fallback)'
    );
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const timestamp = Date.now();

    if (!this.isAvailable()) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        error: 'Using fallback LRU cache',
        timestamp,
      };
    }

    try {
      const pong = await this.client.ping();
      const latencyMs = Date.now() - start;

      let memoryUsage: string | undefined;
      let connectedClients: number | undefined;

      try {
        const info = await this.client.info('memory');
        const match = info.match(/used_memory_human:(.+)/);
        if (match) memoryUsage = match[1].trim();
      } catch {
        /* cluster mode may not support INFO on all nodes */
      }

      try {
        const info = await this.client.info('clients');
        const match = info.match(/connected_clients:(\d+)/);
        if (match) connectedClients = parseInt(match[1], 10);
      } catch {
        /* ignore */
      }

      return {
        status: latencyMs < 50 ? 'healthy' : 'degraded',
        latencyMs,
        timestamp,
        memoryUsage,
        connectedClients,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: (error as Error).message,
        timestamp,
      };
    }
  }

  getMetrics(): CacheMetrics {
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      latencyMs: this.metrics.avgLatencyMs,
      lastError: this.metrics.lastError,
      lastErrorAt: this.metrics.lastErrorAt,
      circuitBreakerOpen: this.circuitBreaker.isOpen(),
      fallbackActive: this._status === 'fallback',
      connectionStatus: this._status,
      poolSize: this._fallback.size(),
    };
  }

  isAvailable(): boolean {
    return this._isAvailable && !this.circuitBreaker.isOpen();
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // ignore cleanup errors
    }
  }

  on(event: string, fn: (...args: any[]) => void): void {
    this.client.on(event, fn);
  }

  off(event: string, fn: (...args: any[]) => void): void {
    this.client.off(event, fn);
  }

  duplicate(): CacheClient {
    // For pub/sub subscriber, return a dedicated connection
    const url = process.env.REDIS_URL;
    if (!url) {
      return new InMemoryCacheClient();
    }
    return new RedisCacheClient(url);
  }
}

// ─── In-Memory Fallback Client ───────────────────────────────────────────────

class InMemoryCacheClient implements CacheClient {
  private cache: LRUCache;
  private _status: 'connected' | 'disconnected' | 'fallback' = 'fallback';
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  constructor(capacity?: number) {
    this.cache = new LRUCache(
      capacity || parseInt(process.env.LRU_CACHE_CAPACITY || '500', 10)
    );
  }

  async get(key: string): Promise<string | null> {
    return this.cache.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.cache.set(key, value, ttlMs);
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keys) {
      if (this.cache.delete(k)) count++;
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = this.cache.keys();
    if (pattern === '*') return allKeys;
    // Simple glob matching for in-memory
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return allKeys.filter((k) => regex.test(k));
  }

  async increment(key: string): Promise<number> {
    const val = this.cache.get(key);
    const num = val ? parseInt(val, 10) + 1 : 1;
    this.cache.set(key, String(num));
    return num;
  }

  async decrement(key: string): Promise<number> {
    const val = this.cache.get(key);
    const num = val ? parseInt(val, 10) - 1 : -1;
    this.cache.set(key, String(num));
    return num;
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    const val = this.cache.get(key);
    if (val !== null) {
      this.cache.set(key, val, ttlMs);
      return true;
    }
    return false;
  }

  async ttl(key: string): Promise<number> {
    // In-memory doesn't expose remaining TTL
    return -1;
  }

  async ping(): Promise<string> {
    return 'PONG (in-memory)';
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: 'degraded',
      latencyMs: 0,
      error: 'Running in-memory fallback cache (no Redis configured)',
      timestamp: Date.now(),
    };
  }

  getMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      errors: 0,
      latencyMs: 0,
      lastError: null,
      lastErrorAt: null,
      circuitBreakerOpen: false,
      fallbackActive: true,
      connectionStatus: 'fallback',
      poolSize: this.cache.size(),
    };
  }

  isAvailable(): boolean {
    return true;
  }

  async quit(): Promise<void> {
    // no-op
  }

  on(event: string, fn: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(fn);
  }

  off(event: string, fn: (...args: any[]) => void): void {
    this.eventHandlers.get(event)?.delete(fn);
  }

  duplicate(): CacheClient {
    return new InMemoryCacheClient();
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: CacheClient | null = null;

/**
 * Create a cache client. Returns an ioredis-backed client when REDIS_URL is set,
 * otherwise returns an in-memory LRU fallback.
 *
 * Singleton by default; pass `forceNew` to create a fresh instance.
 */
export function createCacheClient(forceNew = false): CacheClient {
  if (!forceNew && _instance) return _instance;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    _instance = new RedisCacheClient(redisUrl);
  } else {
    _instance = new InMemoryCacheClient();
  }

  return _instance;
}

/**
 * Get the current cache client singleton. Creates one if not yet initialized.
 */
export function getCacheClient(): CacheClient {
  return createCacheClient();
}

export { LRUCache, CircuitBreaker, InMemoryCacheClient, RedisCacheClient };
