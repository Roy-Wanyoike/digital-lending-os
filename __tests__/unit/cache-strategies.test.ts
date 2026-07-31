/**
 * Unit tests for cache strategies — no server required.
 * Tests key generation, TTL values, tags, and toOptions output.
 */
import { describe, it, expect } from 'vitest'
import {
  DashboardStatsStrategy,
  UserProfileStrategy,
  ExchangeRateStrategy,
  PaymentMethodsStrategy,
  FraudRulesStrategy,
  SessionCacheStrategy,
  RateLimitStrategy,
  getStrategyNames,
} from '@/backend/lib/cache/strategies'
import type { StrategyContext } from '@/backend/lib/cache/strategies'

describe('Cache Strategies', () => {
  // ── DashboardStatsStrategy ──────────────────────────────────────
  describe('DashboardStatsStrategy', () => {
    const strategy = new DashboardStatsStrategy()

    it('has 30s TTL', () => {
      expect(strategy.ttl).toBe(30_000)
    })

    it('has no stale-while-revalidate', () => {
      expect(strategy.staleWhileRevalidate).toBe(0)
    })

    it('generates key with tenant, role, and period', () => {
      const ctx: StrategyContext = { tenantId: 't1', role: 'admin', period: '7d' }
      expect(strategy.keyGenerator(ctx)).toBe('stats:t1:admin:7d')
    })

    it('generates key with only tenant', () => {
      const ctx: StrategyContext = { tenantId: 't2' }
      expect(strategy.keyGenerator(ctx)).toBe('stats:t2')
    })

    it('returns correct tags', () => {
      const tags = strategy.tags({ tenantId: 't1' })
      expect(tags).toContain('dashboard')
      expect(tags).toContain('stats')
      expect(tags).toContain('tenant:t1')
    })
  })

  // ── UserProfileStrategy (user-scoped) ──────────────────────────
  describe('UserProfileStrategy', () => {
    const strategy = new UserProfileStrategy()

    it('has 5min TTL', () => {
      expect(strategy.ttl).toBe(5 * 60_000)
    })

    it('generates user-scoped key', () => {
      const ctx: StrategyContext = { userId: 'u42' }
      expect(strategy.keyGenerator(ctx)).toBe('profile:u42')
    })

    it('throws when userId is missing', () => {
      expect(() => strategy.keyGenerator({})).toThrow(/requires userId/)
    })

    it('returns user + tenant tags', () => {
      const tags = strategy.tags({ userId: 'u1', tenantId: 't1' })
      expect(tags).toContain('user')
      expect(tags).toContain('profile')
      expect(tags).toContain('user:u1')
      expect(tags).toContain('tenant:t1')
    })
  })

  // ── ExchangeRateStrategy (SWR) ──────────────────────────────────
  describe('ExchangeRateStrategy', () => {
    const strategy = new ExchangeRateStrategy()

    it('has 60s TTL', () => {
      expect(strategy.ttl).toBe(60_000)
    })

    it('has 5min stale-while-revalidate grace', () => {
      expect(strategy.staleWhileRevalidate).toBe(5 * 60_000)
    })

    it('generates key with default USD base', () => {
      const ctx: StrategyContext = {}
      expect(strategy.keyGenerator(ctx)).toBe('rates:USD:all')
    })

    it('generates key with explicit pair', () => {
      const ctx: StrategyContext = { baseCurrency: 'NGN', targetCurrency: 'KES' }
      expect(strategy.keyGenerator(ctx)).toBe('rates:NGN:KES')
    })

    it('toOptions includes correct TTL and namespace', () => {
      const opts = strategy.toOptions({ baseCurrency: 'USD' })
      expect(opts.ttl).toBe(60_000)
      expect(opts.namespace).toBe('fx:rates')
    })
  })

  // ── PaymentMethodsStrategy ──────────────────────────────────────
  describe('PaymentMethodsStrategy', () => {
    const strategy = new PaymentMethodsStrategy()

    it('has 10min TTL', () => {
      expect(strategy.ttl).toBe(10 * 60_000)
    })

    it('generates key with tenant and currency', () => {
      const ctx: StrategyContext = { tenantId: 't1', currency: 'NGN' }
      expect(strategy.keyGenerator(ctx)).toBe('methods:t1:NGN')
    })
  })

  // ── FraudRulesStrategy ──────────────────────────────────────────
  describe('FraudRulesStrategy', () => {
    const strategy = new FraudRulesStrategy()

    it('has 5min TTL', () => {
      expect(strategy.ttl).toBe(5 * 60_000)
    })

    it('includes compliance tag', () => {
      const tags = strategy.tags({ tenantId: 't1' })
      expect(tags).toContain('compliance')
      expect(tags).toContain('fraud')
      expect(tags).toContain('rules')
    })
  })

  // ── RateLimitStrategy ───────────────────────────────────────────
  describe('RateLimitStrategy', () => {
    const strategy = new RateLimitStrategy()

    it('has 60s TTL', () => {
      expect(strategy.ttl).toBe(60_000)
    })

    it('uses userId for key', () => {
      const ctx: StrategyContext = { userId: 'u1', endpoint: '/api/pay' }
      expect(strategy.keyGenerator(ctx)).toBe('u1:/api/pay')
    })

    it('falls back to ip for anonymous users', () => {
      const ctx: StrategyContext = { ip: '1.2.3.4', endpoint: '/api/pay' }
      expect(strategy.keyGenerator(ctx)).toBe('1.2.3.4:/api/pay')
    })
  })

  // ── Registry ────────────────────────────────────────────────────
  describe('strategy registry', () => {
    it('includes all 7 built-in strategies', () => {
      const names = getStrategyNames()
      expect(names).toContain('dashboard:stats')
      expect(names).toContain('user:profile')
      expect(names).toContain('fx:rates')
      expect(names).toContain('payment:methods')
      expect(names).toContain('fraud:rules')
      expect(names).toContain('session')
      expect(names).toContain('ratelimit')
      expect(names).toHaveLength(7)
    })
  })
})
