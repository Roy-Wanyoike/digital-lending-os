/**
 * Caching Strategies — Digital Lending OS Caching Layer
 *
 * Predefined strategies for common fintech cache domains.
 * Each strategy implements CacheStrategy interface providing:
 *  - keyGenerator: deterministic key from context params
 *  - ttl: time-to-live in milliseconds
 *  - staleWhileRevalidate: grace period in ms
 *  - tags: list of cache tags for bulk invalidation
 */

import { SetOptions } from './cache-manager';

// ─── Strategy Interface ──────────────────────────────────────────────────────

export interface CacheStrategy {
  /** Unique strategy identifier */
  readonly name: string;
  /** Generate a cache key from the given context */
  keyGenerator: (ctx: StrategyContext) => string;
  /** TTL in milliseconds */
  readonly ttl: number;
  /** Stale-while-revalidate grace period in ms (0 = disabled) */
  readonly staleWhileRevalidate: number;
  /** Tags to attach for bulk invalidation */
  tags: (ctx: StrategyContext) => string[];
  /** Convert strategy to SetOptions for CacheManager */
  toOptions: (ctx: StrategyContext) => SetOptions;
}

export interface StrategyContext {
  tenantId?: string;
  userId?: string;
  role?: string;
  ip?: string;
  endpoint?: string;
  currency?: string;
  baseCurrency?: string;
  targetCurrency?: string;
  deviceId?: string;
  ruleType?: string;
  period?: string;
  [key: string]: string | undefined;
}

// ─── Base Strategy ───────────────────────────────────────────────────────────

abstract class BaseStrategy implements CacheStrategy {
  abstract readonly name: string;
  abstract readonly ttl: number;
  abstract readonly staleWhileRevalidate: number;

  abstract keyGenerator(ctx: StrategyContext): string;
  abstract tags(ctx: StrategyContext): string[];

  toOptions(ctx: StrategyContext): SetOptions {
    return {
      ttl: this.ttl,
      tags: this.tags(ctx),
      namespace: this.name,
    };
  }
}

// ─── DashboardStatsStrategy ──────────────────────────────────────────────────

/**
 * Dashboard statistics: 30s TTL, cached per tenant+role.
 * Very short TTL since dashboard data is time-sensitive.
 */
export class DashboardStatsStrategy extends BaseStrategy {
  readonly name = 'dashboard:stats';
  readonly ttl = 30_000; // 30 seconds
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    const parts = ['stats'];
    if (ctx.tenantId) parts.push(ctx.tenantId);
    if (ctx.role) parts.push(ctx.role);
    if (ctx.period) parts.push(ctx.period);
    return parts.join(':');
  }

  tags(ctx: StrategyContext): string[] {
    const tags = ['dashboard', 'stats'];
    if (ctx.tenantId) tags.push(`tenant:${ctx.tenantId}`);
    return tags;
  }
}

// ─── UserProfileStrategy ─────────────────────────────────────────────────────

/**
 * User profile data: 5min TTL.
 * Moderate TTL since profiles change infrequently.
 */
export class UserProfileStrategy extends BaseStrategy {
  readonly name = 'user:profile';
  readonly ttl = 5 * 60_000; // 5 minutes
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    if (!ctx.userId) throw new Error('UserProfileStrategy requires userId');
    return `profile:${ctx.userId}`;
  }

  tags(ctx: StrategyContext): string[] {
    const tags = ['user', 'profile'];
    if (ctx.userId) tags.push(`user:${ctx.userId}`);
    if (ctx.tenantId) tags.push(`tenant:${ctx.tenantId}`);
    return tags;
  }
}

// ─── ExchangeRateStrategy ────────────────────────────────────────────────────

/**
 * Exchange rates: 60s TTL with 5min stale-while-revalidate grace.
 * Rates are eventually consistent — stale data is acceptable.
 */
export class ExchangeRateStrategy extends BaseStrategy {
  readonly name = 'fx:rates';
  readonly ttl = 60_000; // 60 seconds
  readonly staleWhileRevalidate = 5 * 60_000; // 5 min grace

  keyGenerator(ctx: StrategyContext): string {
    const base = ctx.baseCurrency || 'USD';
    const target = ctx.targetCurrency || 'all';
    return `rates:${base}:${target}`;
  }

  tags(ctx: StrategyContext): string[] {
    return ['fx', 'rates', 'exchange'];
  }
}

// ─── PaymentMethodsStrategy ──────────────────────────────────────────────────

/**
 * Payment methods: 10min TTL.
 * Payment method configs are relatively stable.
 */
export class PaymentMethodsStrategy extends BaseStrategy {
  readonly name = 'payment:methods';
  readonly ttl = 10 * 60_000; // 10 minutes
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    const parts = ['methods'];
    if (ctx.tenantId) parts.push(ctx.tenantId);
    if (ctx.currency) parts.push(ctx.currency);
    return parts.join(':');
  }

  tags(ctx: StrategyContext): string[] {
    const tags = ['payment', 'methods'];
    if (ctx.tenantId) tags.push(`tenant:${ctx.tenantId}`);
    return tags;
  }
}

// ─── FraudRulesStrategy ──────────────────────────────────────────────────────

/**
 * Fraud detection rules: 5min TTL.
 * Rules are critical for security but can tolerate brief staleness.
 */
export class FraudRulesStrategy extends BaseStrategy {
  readonly name = 'fraud:rules';
  readonly ttl = 5 * 60_000; // 5 minutes
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    const parts = ['rules'];
    if (ctx.tenantId) parts.push(ctx.tenantId);
    if (ctx.ruleType) parts.push(ctx.ruleType);
    return parts.join(':');
  }

  tags(ctx: StrategyContext): string[] {
    const tags = ['fraud', 'rules', 'compliance'];
    if (ctx.tenantId) tags.push(`tenant:${ctx.tenantId}`);
    return tags;
  }
}

// ─── SessionCacheStrategy ────────────────────────────────────────────────────

/**
 * Session data: 30min TTL.
 * Sessions should be fresh but a 30min cache is reasonable.
 */
export class SessionCacheStrategy extends BaseStrategy {
  readonly name = 'session';
  readonly ttl = 30 * 60_000; // 30 minutes
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    if (!ctx.userId) throw new Error('SessionCacheStrategy requires userId');
    const parts = ['session', ctx.userId];
    if (ctx.deviceId) parts.push(ctx.deviceId);
    return parts.join(':');
  }

  tags(ctx: StrategyContext): string[] {
    const tags = ['session'];
    if (ctx.userId) tags.push(`user:${ctx.userId}`);
    return tags;
  }
}

// ─── RateLimitStrategy ───────────────────────────────────────────────────────

/**
 * Rate limiting: sliding window, no SWR.
 * Used by the RateLimiter class — not directly for caching.
 */
export class RateLimitStrategy extends BaseStrategy {
  readonly name = 'ratelimit';
  readonly ttl = 60_000; // 1 minute window
  readonly staleWhileRevalidate = 0;

  keyGenerator(ctx: StrategyContext): string {
    const identifier = ctx.userId || ctx.ip || 'anonymous';
    const endpoint = ctx.endpoint || 'global';
    return `${identifier}:${endpoint}`;
  }

  tags(_ctx: StrategyContext): string[] {
    return ['ratelimit'];
  }
}

// ─── Strategy Registry ───────────────────────────────────────────────────────

const strategies = new Map<string, CacheStrategy>();

function registerStrategy(strategy: CacheStrategy): void {
  strategies.set(strategy.name, strategy);
}

// Register all built-in strategies
registerStrategy(new DashboardStatsStrategy());
registerStrategy(new UserProfileStrategy());
registerStrategy(new ExchangeRateStrategy());
registerStrategy(new PaymentMethodsStrategy());
registerStrategy(new FraudRulesStrategy());
registerStrategy(new SessionCacheStrategy());
registerStrategy(new RateLimitStrategy());

/**
 * Get a registered strategy by name.
 */
export function getStrategy(name: string): CacheStrategy | undefined {
  return strategies.get(name);
}

/**
 * Get all registered strategy names.
 */
export function getStrategyNames(): string[] {
  return Array.from(strategies.keys());
}

/**
 * Register a custom strategy.
 */
export function registerCustomStrategy(strategy: CacheStrategy): void {
  registerStrategy(strategy);
}

// ─── Convenience Exports ─────────────────────────────────────────────────────

export const dashboardStatsStrategy = () => new DashboardStatsStrategy();
export const userProfileStrategy = () => new UserProfileStrategy();
export const exchangeRateStrategy = () => new ExchangeRateStrategy();
export const paymentMethodsStrategy = () => new PaymentMethodsStrategy();
export const fraudRulesStrategy = () => new FraudRulesStrategy();
export const sessionCacheStrategy = () => new SessionCacheStrategy();
export const rateLimitStrategy = () => new RateLimitStrategy();
