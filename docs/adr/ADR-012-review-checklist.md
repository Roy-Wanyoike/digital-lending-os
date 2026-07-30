# ADR-012 Review Checklist — Performance & Developer Experience

**Task ID:** D12 | **Agent:** performance-dx-owner

---

## 1. Telemetry API Wrapper

- [x] `src/backend/lib/telemetry/api-wrapper.ts` created
- [x] Zero external dependencies (no @opentelemetry import)
- [x] `withApiTelemetry(handler, routeName?)` exported
- [x] Generates `x-request-id` via `crypto.randomUUID()` if not in headers
- [x] Records start time with `performance.now()`
- [x] Calculates `duration_ms` after handler execution
- [x] Sets `x-request-id` and `x-response-time` headers on response
- [x] Logs structured JSON to `console.log` (info) / `console.error` (error)
- [x] Error path: logs with `stack`, re-throws (does NOT swallow)
- [x] Clones `NextResponse` to avoid mutating shared headers

## 2. Route Wiring

- [x] `src/app/api/transactions/route.ts` — GET wrapped with `withApiTelemetry`
- [x] `src/app/api/wallets/route.ts` — GET wrapped with `withApiTelemetry`
- [x] `src/app/api/deposits/route.ts` — GET wrapped with `withApiTelemetry` (outside `withErrorHandler`)
- [x] `src/app/api/withdrawals/route.ts` — GET wrapped with `withApiTelemetry`
- [x] `src/app/api/businesses/route.ts` — GET wrapped with `withApiTelemetry` (outside `withErrorHandler`)
- [ ] **OPEN:** Verify all 5 routes return `x-request-id` and `x-response-time` headers in integration tests
- [ ] **OPEN:** Extend telemetry to POST/PUT/DELETE handlers on these routes

## 3. Landing Page RSC Migration

- [x] `src/app/LandingPageServer.tsx` created — Server Component wrapper
- [x] `src/app/LandingPage.tsx` refactored to `ClientBanner` — `'use client'` island
- [x] `ClientBanner` contains ONLY: `signIn()` buttons, `useState` for mobile nav, `Menu` icon
- [x] `LandingPageServer.tsx` renders: header logo, hero text, trust badges, footer (zero JS)
- [x] `src/app/page.tsx` imports from `LandingPageServer` (not the old client file)
- [ ] **OPEN:** Verify landing page renders without JS (curl / text browser)
- [ ] **OPEN:** Measure JS bundle size delta with `@next/bundle-analyzer`

## 4. Bundle Optimization

- [x] Server Components by default policy documented in ADR
- [x] Client islands principle documented
- [ ] **OPEN:** Run `@next/bundle-analyzer` and record baseline JS sizes
- [ ] **OPEN:** Audit remaining `'use client'` pages for RSC conversion candidates
- [ ] **OPEN:** Verify `DashboardShell.tsx` dynamic imports are `ssr: false` where appropriate

## 5. Streaming SSR

- [x] Existing Suspense boundaries in dashboard shell documented
- [ ] **OPEN:** Add Suspense boundaries to data-fetching dashboard pages
- [ ] **OPEN:** Test streaming behavior with slow upstream APIs

## 6. Documentation

- [x] ADR-012-performance-dx.md written and filed
- [x] ADR-012-review-checklist.md written and filed (this file)
- [ ] **OPEN:** Worklog updated with task D12
