# Youngsend Caching Layer

## Architecture

The caching layer provides a multi-tiered, production-grade caching system for the Youngsend fintech platform.

```
┌─────────────────────────────────────────────┐
│              Application Code               │
├─────────────────────────────────────────────┤
│         CacheManager (typed API)            │
│   get<T> / set<T> / singleflight / SWR     │
├─────────────────────────────────────────────┤
│         Cache Strategies (domain config)    │
│  DashboardStats │ UserProfile │ ExchangeRate │
├──────────────┬──────────────────────────────┤
│  Redis       │    In-Memory LRU Fallback   │
│  (ioredis)   │    (circuit breaker)        │
├──────────────┴──────────────────────────────┤
│  Rate Limiter    │    Cache Pub/Sub         │
│  (sliding/token/ │    (cross-instance       │
│   fixed window)  │     invalidation)        │
└──────────────────┴─────────────────────────┘
```

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Client | `client.ts` | Redis connection with circuit breaker, health checks, LRU fallback |
| Cache Manager | `cache-manager.ts` | Typed cache API with singleflight, SWR, cache tags |
| Strategies | `strategies.ts` | Predefined TTL/tag configs for each domain |
| Rate Limiter | `rate-limiter.ts` | Sliding window, token bucket, fixed window rate limiting |
| Pub/Sub | `pubsub.ts` | Cross-instance cache invalidation via Redis Pub/Sub |

## Quick Start

```typescript
import { getCacheManager, dashboardStatsStrategy } from '@/lib/cache';

const cache = getCacheManager();
const strategy = dashboardStatsStrategy();

// Get or set with stampede protection
const stats = await cache.getOrSet(
  strategy.keyGenerator({ tenantId: 't1', role: 'admin', period: '7d' }),
  () => fetchDashboardStats('t1'),
  strategy.toOptions({ tenantId: 't1' })
);
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | *(none)* | Redis connection URL. Comma-separated for cluster mode. |
| `REDIS_PASSWORD` | *(none)* | Redis password |
| `REDIS_DB` | `0` | Redis database index |
| `LRU_CACHE_CAPACITY` | `500` | In-memory fallback cache size |
| `CACHE_CIRCUIT_FAILURE_THRESHOLD` | `5` | Failures before circuit breaker opens |
| `CACHE_CIRCUIT_RESET_MS` | `30000` | Circuit breaker reset timeout |

### Redis URL Formats

```
# Single node
REDIS_URL=redis://localhost:6379

# TLS
REDIS_URL=rediss://user:pass@host:6379

# Cluster (comma-separated)
REDIS_URL=redis://node1:6379,redis://node2:6379,redis://node3:6379
```

When `REDIS_URL` is not set, the system automatically falls back to an in-memory LRU cache.

## Strategy Guide

### Built-in Strategies

| Strategy | TTL | SWR Grace | Key Pattern | Tags |
|----------|-----|-----------|-------------|------|
| `DashboardStatsStrategy` | 30s | - | `stats:{tenantId}:{role}` | `dashboard`, `stats`, `tenant:{id}` |
| `UserProfileStrategy` | 5m | - | `profile:{userId}` | `user`, `profile`, `user:{id}` |
| `ExchangeRateStrategy` | 60s | 5m | `rates:{base}:{target}` | `fx`, `rates`, `exchange` |
| `PaymentMethodsStrategy` | 10m | - | `methods:{tenantId}:{currency}` | `payment`, `methods`, `tenant:{id}` |
| `FraudRulesStrategy` | 5m | - | `rules:{tenantId}:{ruleType}` | `fraud`, `rules`, `compliance` |
| `SessionCacheStrategy` | 30m | - | `session:{userId}` | `session`, `user:{id}` |
| `RateLimitStrategy` | 1m | - | `{userId|ip}:{endpoint}` | `ratelimit` |

### Using a Strategy

```typescript
import { getCacheManager, userProfileStrategy } from '@/lib/cache';

const cache = getCacheManager();
const strategy = userProfileStrategy();

const profile = await cache.getOrSet(
  strategy.keyGenerator({ userId: 'u123' }),
  () => db.user.findUnique({ where: { id: 'u123' } }),
  strategy.toOptions({ userId: 'u123', tenantId: 't1' })
);
```

### Stale-While-Revalidate

The `ExchangeRateStrategy` supports SWR. When the TTL expires, stale data is served
while a background revalidation refreshes the cache:

```typescript
const rates = await cache.get(
  strategy.keyGenerator({ baseCurrency: 'USD', targetCurrency: 'KES' }),
  {
    staleWhileRevalidate: true,
    staleGraceMs: 5 * 60_000, // 5 minute grace
    revalidate: () => fetchLiveRates('USD', 'KES'),
    namespace: 'fx:rates',
  }
);
```

### Custom Strategy

```typescriptn
import { CacheStrategy, StrategyContext, registerCustomStrategy } from '@/lib/cache';

class TransactionHistoryStrategy implements CacheStrategy {
  readonly name = 'tx:history';
  readonly ttl = 2 * 60_000; // 2 minutes
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    return `${ctx.userId}:page:${ctx.period}`;
  }

  tags(ctx: StrategyContext): string[] {
    return ['transactions', `user:${ctx.userId}`];
  }

  toOptions(ctx: StrategyContext) {
    return { ttl: this.ttl, tags: this.tags(ctx), namespace: this.name };
  }
}

registerCustomStrategy(new TransactionHistoryStrategy());
```

## Invalidation Patterns

### By Key

```typescript
await cache.delete('profile:u123', 'user:profile');
```

### By Pattern (Glob)

```typescript
await cache.invalidatePattern('profile:*', 'user:profile');
```

### By Prefix

```typescript
await cache.invalidateByPrefix('profile', 'user:profile');
```

### By Tag

```typescript
// Invalidate all entries tagged with a specific tenant
await cache.invalidateByTag('tenant:t1');

// Invalidate multiple tags
await cache.invalidateByTags(['tenant:t1', 'payment', 'methods']);
```

### Cross-Instance via Pub/Sub

```typescript
import { getCachePubSub } from '@/lib/cache';

const pubsub = getCachePubSub();
await pubsub.init();

// Subscribe to invalidation events
pubsub.subscribe('dashboard', async (msg) => {
  await cache.invalidateByPrefix(msg.prefix);
});

// Publish invalidation from any instance
await pubsub.invalidatePrefix('dashboard');
await pubsub.invalidateTags('payment', ['tenant:t1', 'methods']);
```

## Rate Limiting

```typescript
import { createApiLimiter } from '@/lib/cache';

const limiter = createApiLimiter(100); // 100 req/min

// In an API route
const result = await limiter.check({
  userId: currentUser.id,
  endpoint: '/api/payments',
});

if (!result.allowed) {
  // Set headers
  Object.entries(result.headers).forEach(([k, v]) =>
    response.setHeader(k, v)
  );
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
}

// Always set rate limit headers
Object.entries(result.headers).forEach(([k, v]) =>
  response.setHeader(k, v)
);
```

### Predefined Limiters

| Factory | Algorithm | Default Limit |
|---------|-----------|---------------|
| `createApiLimiter(n)` | Sliding Window | 100/min |
| `createAuthLimiter(n)` | Fixed Window | 5/min |
| `createPaymentLimiter(n)` | Sliding Window | 30/min |
| `createWebhookLimiter(n)` | Token Bucket | 1000/min |
| `createGlobalLimiter(n)` | Sliding Window | 10000/min |

## Operational Runbook

### Health Check

```typescript
import { getCacheClient } from '@/lib/cache';

const client = getCacheClient();
const health = await client.healthCheck();
console.log(health);
// { status: 'healthy', latencyMs: 2, timestamp: 1234567890, memoryUsage: '1.2M', connectedClients: 5 }
```

### Metrics

```typescript
const metrics = getCacheClient().getMetrics();
console.log(metrics);
// { hits: 1024, misses: 56, errors: 0, latencyMs: 1.2, circuitBreakerOpen: false, fallbackActive: false, ... }
```

### Circuit Breaker States

| State | Behavior |
|-------|----------|
| **Closed** | Normal operation. Requests go to Redis. |
| **Open** | All requests fall back to LRU in-memory cache. After `CACHE_CIRCUIT_RESET_MS`, transitions to half-open. |
| **Half-Open** | Allows a few test requests. If they succeed, closes the circuit. If they fail, re-opens. |

### Common Issues

**Redis connection refused:** Circuit breaker opens after 5 failures. System degrades gracefully to LRU fallback. Check `REDIS_URL` and Redis server status.

**High latency:** Check Redis memory usage (`INFO memory`). Consider adding cluster nodes. Enable `scaleReads: 'slave'` in cluster config.

**Stale data served:** If using SWR, check the grace period. Disable SWR for time-critical data. Use `invalidateByTag` on write operations.

**Cache stampede:** Enabled by default via singleflight. The first request populates the cache; subsequent concurrent requests wait for the same promise.

### Key Naming Convention

All cache keys use the prefix `ys:cache:{namespace}:{key}`. Tag indices use `ys:tag:{tag}:keys`. Rate limiters use `ys:rl:{type}:{identifier}:{endpoint}`. Pub/Sub channels use `cache:invalidate:{prefix}`.