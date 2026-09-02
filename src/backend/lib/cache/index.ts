/**
 * Digital Lending OS Caching Layer — Public API
 *
 * Re-exports all modules:
 *  - client: Redis client factory, circuit breaker, LRU fallback
 *  - cache-manager: Typed CacheManager, singleflight, SWR
 *  - strategies: Predefined caching strategies
 *  - rate-limiter: Distributed rate limiter
 *  - pubsub: Cache invalidation Pub/Sub
 */

// ─── Client ────────────────────────────────────────────────────────────────
export {
  createCacheClient,
  getCacheClient,
} from './client';
export type {
  CacheClient,
  CacheMetrics,
  HealthCheckResult,
} from './client';

// ─── Cache Manager ──────────────────────────────────────────────────────────
export {
  CacheManager,
  getCacheManager,
  createCacheManager,
} from './cache-manager';
export type {
  Cacheable,
  CacheEntry,
  SetOptions,
  GetOptions,
  IncrementOptions,
  CacheManagerConfig,
} from './cache-manager';

// ─── Strategies ─────────────────────────────────────────────────────────────
export {
  DashboardStatsStrategy,
  UserProfileStrategy,
  ExchangeRateStrategy,
  PaymentMethodsStrategy,
  FraudRulesStrategy,
  SessionCacheStrategy,
  RateLimitStrategy,
  dashboardStatsStrategy,
  userProfileStrategy,
  exchangeRateStrategy,
  paymentMethodsStrategy,
  fraudRulesStrategy,
  sessionCacheStrategy,
  rateLimitStrategy,
  getStrategy,
  getStrategyNames,
  registerCustomStrategy,
} from './strategies';
export type {
  CacheStrategy,
  StrategyContext,
} from './strategies';

// ─── Rate Limiter ───────────────────────────────────────────────────────────
export {
  RateLimiter,
  createApiLimiter,
  createAuthLimiter,
  createPaymentLimiter,
  createWebhookLimiter,
  createGlobalLimiter,
} from './rate-limiter';
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitAlgorithm,
  RateLimitIdentifier,
} from './rate-limiter';

// ─── Pub/Sub ────────────────────────────────────────────────────────────────
export {
  CachePubSub,
  getCachePubSub,
} from './pubsub';
export type {
  InvalidationMessage,
  InvalidationHandler,
  PubSubConfig,
} from './pubsub';
