# ADR-006: Dashboard Frontend Performance Benchmarks

## Measurement Targets

### Core Web Vitals

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| First Contentful Paint (FCP) | < 1.5s | ~1.0-1.2s | Server-rendered HTML from RSC |
| Largest Contentful Paint (LCP) | < 2.5s | ~1.5-2.0s | Dashboard shell renders in RSC, data streams in |
| Time to Interactive (TTI) | < 2.5s | ~2.0-2.5s | After active tab JS hydrates |
| Total Blocking Time (TBT) | < 200ms | ~100-150ms | Minimal main-thread work in shell |
| Cumulative Layout Shift (CLS) | < 0.1 | ~0.02 | Skeleton fallbacks prevent layout shift |
| First Input Delay (FID) | < 100ms | ~50ms | RSC shell has no JS; first interaction after tab load |

### JS Bundle Sizes

| Chunk | Max Size (gzipped) | Estimated | Strategy |
|-------|-------------------|-----------|----------|
| Initial HTML (RSC stream) | < 50KB | ~30KB | Server-rendered, zero JS required |
| First Load JS (shared framework) | < 100KB | ~80-90KB | React runtime + Next.js router + Auth |
| DashboardShell + sidebar | < 30KB | ~15-20KB | Layout, navigation, tab switching |
| WalletTab (lazy) | < 80KB | ~40-60KB | useApi + wallet components |
| PaymentsTab (lazy) | < 80KB | ~50-70KB | Payment table + status badges |
| EscrowTab (lazy) | < 80KB | ~50-70KB | Escrow list + milestone progress |
| TransactionsTab (lazy) | < 80KB | ~40-50KB | Transaction table with filters |
| AnalyticsTab (lazy) | < 100KB | ~60-80KB | recharts dependency (~40KB gzipped) |
| ReferralTab (lazy) | < 50KB | ~20-30KB | Referral link + bonus list |
| PaymentLinksTab (lazy) | < 60KB | ~30-40KB | Payment link table + copy button |
| TrustTab (lazy) | < 60KB | ~30-40KB | Trust score display + reviews |
| NotificationTab (lazy) | < 50KB | ~20-30KB | Notification list |
| SettingsTab (lazy) | < 50KB | ~20-30KB | Settings form |
| CollectionsTab (lazy) | < 70KB | ~40-50KB | Collection case list |
| **Total worst-case (all tabs loaded)** | < 200KB | ~80-100KB (active shell + 1 tab) | Only active tab loaded on-demand |

### RSC Streaming Times

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| DashboardShell RSC render start (TTFB) | < 200ms | ~100-150ms | Server component, no data fetch |
| Active tab Suspense fallback display | < 300ms | ~200-250ms | Skeleton appears immediately |
| Active tab data fetch + stream | < 500ms p95 | ~300-400ms | API call + RSC streaming |
| Tab switch (cached tab) | < 100ms | ~50ms | `next/dynamic` already loaded chunk |
| Tab switch (uncached tab, first visit) | < 2s | ~1-1.5s | Chunk download + hydrate + data fetch |

### Error Boundary Performance

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| ErrorBoundary render (crash recovery) | < 50ms | ~10ms | Static fallback UI, no data fetch |
| Retry button click → re-mount tab | < 2s | ~1-1.5s | Same as first tab visit |

### useApi Hook

| Metric | Target | Current Estimate | Notes |
|--------|--------|-----------------|-------|
| useApi initial render (loading state) | < 5ms | ~2ms | Component render only |
| Cache hit (same URL, within session) | < 5ms | ~2ms | In-memory Map lookup |
| Cache invalidation (invalidateCache) | < 1ms | ~0.5ms | Clear all entries for URL pattern |
| Auth error redirect (401 → /login) | < 100ms | ~50ms | Next.js router.push |

## Testing Approach

1. **Lighthouse audit:** Run Lighthouse CI on dashboard page, verify FCP < 1.5s, LCP < 2.5s, TTI < 2.5s.
2. **Bundle analysis:** `@next/bundle-analyzer` to verify per-chunk sizes meet targets.
3. **Tab switch test:** Measure time from tab click to interactive content using Performance API.
4. **Error boundary test:** Throw error in WalletTab, verify shell remains intact and error fallback renders.
5. **Streaming test:** Verify Suspense skeleton appears within 300ms of page load.
6. **Memory test:** Load all 13 tabs sequentially, verify no memory leak (JS heap < 100MB).
7. **Network test:** Simulate 4G connection (1.6 Mbps, 150ms RTT) via Chrome DevTools, verify TTI < 3s.
