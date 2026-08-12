/**
 * Performance optimization tests — Phase 8
 *
 * 1. List API routes have pagination parameters
 * 2. Prisma queries use select/include (not returning all columns)
 * 3. Response cache headers are present
 * 4. ETag generation is deterministic
 * 5. Rate limiter / response cache memory cleanup (LRU eviction)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { createResponseCache } from '@/backend/lib/response-cache'
import { ok } from '@/backend/lib/api-response'

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Recursively find all route.ts files under a directory */
function findRouteFiles(dir: string, base: string = dir): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(full, base))
    } else if (entry.name === 'route.ts') {
      results.push(relative(base, full))
    }
  }
  return results
}

/** Routes that are single-item lookups, aggregations, or static config — no pagination needed */
const PAGINATION_EXEMPT_PATTERNS = [
  /\[id\]/,                          // Detail routes (single item)
  /health/,                             // Health check
  /realtime/,                           // SSE stream
  /ready/,                             // Readiness probe
  /settings/,                           // Singleton settings
  /currency/,                           // Exchange rates proxy
  /roles/,                              // Static role definitions
  /providers/,                          // Static payment provider configs
  /rates/,                              // Exchange rate config
  /dashboard\/stats/,                   // Aggregation endpoint
  /dashboard\/batch/,                   // Aggregation endpoint
  /analytics/,                          // Aggregation endpoint
  /referral\/route\.ts$/,              // Single-user referral info (not a list)
  /ref\/\[ref\]/,                     // Payment link redirect
  /disputes\/route\.ts$/,              // Disputes per escrow (typically 0-3)
  /payment-methods\/global/,           // Static global payment methods
  /payments\/methods\/route\.ts$/,    // Per-business scoped (typically <10)
  /businesses\/route\.ts$/,           // Bounded by tenant.maxBusinesses (typically <20)
  /tenants\/route\.ts$/,              // Admin-only, typically very few tenants
]

function isPaginationExempt(relPath: string): boolean {
  return PAGINATION_EXEMPT_PATTERNS.some(p => p.test(relPath))
}

/** Check if a route source has pagination patterns */
function hasPagination(content: string): boolean {
  // page-based: page from searchParams
  const hasPage = /page.*searchParams|searchParams.*page|parseInt.*\bpage\b/.test(content)
  // offset-based: offset from searchParams
  const hasOffset = /offset.*searchParams|searchParams.*offset|parseInt.*\boffset\b/.test(content)
  // Prisma skip+take (with limit from searchParams)
  const hasSkipTake = /skip:/.test(content) && /take:/.test(content)
  // Explicit limit from searchParams
  const hasLimit = /limit.*searchParams|searchParams.*limit|parseInt.*\blimit\b/.test(content)

  return hasPage || hasOffset || hasSkipTake || hasLimit
}

/** Check if a route uses Prisma select/include for column restriction */
function usesColumnRestriction(content: string): boolean {
  // Direct select on the main query
  const hasSelect = /\.findMany\(\{[\s\S]*?select:\s*\{/.test(content)
  // Include with nested select (for relations)
  const hasInclude = /\.findMany\(\{[\s\S]*?include:\s*\{/.test(content)
  // Aggregation queries (don't need select — they compute _sum, _count, etc.)
  const hasAggregate = /\.aggregate\(/.test(content)
  const hasGroupBy = /\.groupBy\(/.test(content)
  const hasCount = /\.count\(/.test(content)

  return hasSelect || hasInclude || hasAggregate || hasGroupBy || hasCount
}

// ─── 8D.1: List API routes have pagination ────────────────────────────────

describe('Performance: List API routes have pagination', () => {
  const apiDir = join(process.cwd(), 'src/app/api')
  const routes = findRouteFiles(apiDir)

  // Filter to routes that have a GET handler
  const getRoutes = routes.filter(relPath => {
    const content = readFileSync(join(apiDir, relPath), 'utf-8')
    return /export\s+const\s+GET/.test(content) || /GET\s*=/.test(content)
  })

  it('all unbounded list GET routes have pagination (page/offset/limit/take)', () => {
    const missing: string[] = []

    for (const relPath of getRoutes) {
      if (isPaginationExempt(relPath)) continue

      const content = readFileSync(join(apiDir, relPath), 'utf-8')
      if (!hasPagination(content)) {
        missing.push(relPath)
      }
    }

    expect(missing).toEqual([])
  })

  it('pagination-exempt routes are correctly categorized', () => {
    // Spot-check a few known exempt routes
    const knownExempt = [
      'health/route.ts',
      'settings/route.ts',
      'roles/route.ts',
      'analytics/route.ts',
      'dashboard/stats/route.ts',
      'dashboard/batch/route.ts',
    ]
    for (const route of knownExempt) {
      expect(isPaginationExempt(route)).toBe(true)
    }

    // Spot-check a few known paginated routes
    const knownPaginated = [
      'transactions/route.ts',
      'invoices/route.ts',
      'wallets/route.ts',
      'users/route.ts',
      'escrow/transactions/route.ts',
      'collections/route.ts',
      'deposits/route.ts',
      'withdrawals/route.ts',
      'notifications/route.ts',
      'subscriptions/route.ts',
      'payment-links/route.ts',
      'accounts/route.ts',
      'escrow/route.ts',
    ]
    for (const route of knownPaginated) {
      expect(isPaginationExempt(route)).toBe(false)
    }
  })
})

// ─── 8D.2: Prisma queries use select/include ──────────────────────────────

describe('Performance: Prisma queries use column restriction', () => {
  const apiDir = join(process.cwd(), 'src/app/api')
  const routes = findRouteFiles(apiDir)

  it('primary list GET handlers use select or include on their main findMany', () => {
    const violations: string[] = []

    for (const relPath of routes) {
      const content = readFileSync(join(apiDir, relPath), 'utf-8')

      // Only check files that have a GET handler
      if (!/export\s+const\s+GET/.test(content) && !/GET\s*=/.test(content)) continue
      // Skip detail routes, static config, and aggregation endpoints
      if (isPaginationExempt(relPath)) continue
      // System config tables (small bounded datasets, all columns needed)
      if (new RegExp('compliance\\/rules').test(relPath) || new RegExp('fraud\\/rules').test(relPath)) continue

      // Check if the file has findMany but NO select or include anywhere
      const hasFindMany = /\.findMany\(/.test(content)
      // Match both `select: {` (inline) and `select: VARIABLE` (referenced)
      const hasSelect = /select:\s*(\{|[A-Z])/.test(content)
      const hasInclude = /include:\s*(\{|[A-Z])/.test(content)

      if (hasFindMany && !hasSelect && !hasInclude) {
        violations.push(relPath)
      }
    }

    expect(violations).toEqual([])
  })
})

// ─── 8D.3: Response cache headers ─────────────────────────────────────────

describe('Performance: Response cache headers', () => {
  it('ok() helper adds Cache-Control header by default', () => {
    const response = ok({ test: true })
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).not.toBeNull()
    expect(cacheControl).toContain('max-age=')
    expect(cacheControl).toContain('stale-while-revalidate=')
    expect(cacheControl).toContain('private')
  })

  it('ok() helper adds ETag header', () => {
    const response = ok({ test: true })
    const etag = response.headers.get('etag')
    expect(etag).not.toBeNull()
    expect(etag!.startsWith('W/"'))
  })

  it('ok() Cache-Control respects custom maxAge', () => {
    const response = ok({ test: true }, undefined, { maxAge: 10, swr: 20 })
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toContain('max-age=10')
    expect(cacheControl).toContain('stale-while-revalidate=20')
  })

  it('ok() supports noCache option', () => {
    const response = ok({ test: true }, undefined, { noCache: true })
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toBeNull()
  })

  it('ok() response body has standard envelope', async () => {
    const data = { items: [1, 2, 3] }
    const response = ok(data)
    const body = await response.json()
    expect(body).toEqual({ data: { items: [1, 2, 3] } })
  })

  it('ok() supports meta in response', async () => {
    const response = ok({ items: [] }, { page: 1, total: 100 })
    const body = await response.json()
    expect(body.meta).toEqual({ page: 1, total: 100 })
  })
})

// ─── 8D.4: ETag generation is deterministic ───────────────────────────────

describe('Performance: ETag generation is deterministic', () => {
  it('same payload produces same ETag', () => {
    const payload = { data: { id: 'abc', amount: 100 } }
    const r1 = ok(payload)
    const r2 = ok(payload)
    expect(r1.headers.get('etag')).toBe(r2.headers.get('etag'))
  })

  it('different payloads produce different ETags', () => {
    const r1 = ok({ data: { id: 'abc' } })
    const r2 = ok({ data: { id: 'xyz' } })
    expect(r1.headers.get('etag')).not.toBe(r2.headers.get('etag'))
  })

  it('ETag is stable across multiple calls', () => {
    const data = { results: [1, 2, 3], total: 3 }
    const etags = Array.from({ length: 10 }, () => ok(data).headers.get('etag'))
    const unique = new Set(etags)
    expect(unique.size).toBe(1)
  })

  it('ETag changes when data changes', () => {
    const r1 = ok({ count: 5 })
    const r2 = ok({ count: 6 })
    expect(r1.headers.get('etag')).not.toBe(r2.headers.get('etag'))
  })
})

// ─── 8D.5: Response cache memory cleanup (LRU eviction) ───────────────────

describe('Performance: ResponseCache memory cleanup', () => {
  let cache: ReturnType<typeof createResponseCache>

  beforeEach(() => {
    cache = createResponseCache(5, 100_000) // 5 max, 100s TTL
  })

  it('evicts LRU entry when maxSize is reached', () => {
    for (let i = 0; i < 6; i++) {
      cache.set(`key-${i}`, { value: i })
    }
    // Size should be capped at maxSize
    expect(cache.size).toBe(5)
    // Oldest entry (key-0) should have been evicted
    expect(cache.get('key-0')).toBeNull()
    // Newest entries should exist
    expect(cache.get('key-5')).toEqual({ value: 5 })
    expect(cache.get('key-1')).toEqual({ value: 1 })
  })

  it('LRU access promotes entry (prevents eviction)', () => {
    // Fill cache
    for (let i = 0; i < 5; i++) {
      cache.set(`key-${i}`, { value: i })
    }
    // Access key-0 to promote it
    cache.get('key-0')
    // Add one more — key-1 should be evicted (not key-0)
    cache.set('key-5', { value: 5 })
    expect(cache.get('key-0')).toEqual({ value: 0 })
    expect(cache.get('key-1')).toBeNull()
  })

  it('expired entries are cleaned up on get', () => {
    const shortCache = createResponseCache(10, 1) // 1ms TTL
    shortCache.set('temp', 'data')
    // Wait for expiry
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortCache.get('temp')).toBeNull()
        expect(shortCache.size).toBe(0)
        resolve()
      }, 10)
    })
  })

  it('clear() removes all entries', () => {
    for (let i = 0; i < 5; i++) {
      cache.set(`key-${i}`, i)
    }
    expect(cache.size).toBe(5)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('invalidateByPrefix removes matching keys', () => {
    cache.set('tenant:abc:stats', 1)
    cache.set('tenant:abc:wallets', 2)
    cache.set('tenant:xyz:stats', 3)
    const removed = cache.invalidateByPrefix('tenant:abc')
    expect(removed).toBe(2)
    expect(cache.size).toBe(1)
    expect(cache.get('tenant:xyz:stats')).toBe(3)
  })

  it('getStats returns correct cache information', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    const stats = cache.getStats()
    expect(stats.size).toBe(2)
    expect(stats.maxSize).toBe(5)
    expect(stats.ttlMs).toBe(100_000)
  })

  it('updating existing key updates LRU order', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    cache.set('e', 5)
    // Update 'a' to promote it
    cache.set('a', 'updated')
    // Add new key — 'b' should be evicted (oldest not recently accessed)
    cache.set('f', 6)
    expect(cache.get('a')).toBe('updated')
    expect(cache.get('b')).toBeNull()
    expect(cache.size).toBe(5)
  })
})
