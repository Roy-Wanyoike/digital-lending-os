# ADR-012: Performance & Developer Experience

**Task ID:** D12 | **Agent:** performance-dx-owner | **Status:** Accepted

---

## Context

Digital Lending OS's landing page was entirely a `'use client'` component, shipping the full
React runtime + `next-auth` + `lucide-react` + `radix` UI primitives for what is
essentially static HTML with two `signIn()` buttons. API routes lacked
request-level observability — no `x-request-id` tracing, no structured timing logs,
no response-time headers.

## Decision

### 1. Lightweight API Telemetry Wrapper

Created `src/backend/lib/telemetry/api-wrapper.ts` — a zero-dependency HOF
(`withApiTelemetry`) that wraps App Router GET handlers with:

| Step | Behavior |
|------|----------|
| A | Generate `x-request-id` via `crypto.randomUUID()` (forward if header present) |
| B | Record `performance.now()` start time |
| C | Call handler |
| D | Calculate `duration_ms` |
| E | Clone response, set `x-request-id` + `x-response-time` headers |
| F | `console.log` one structured JSON line (`timestamp`, `level`, `route`, `method`, `status`, `duration_ms`, `request_id`) |
| G | On error: log with `stack`, re-throw (does NOT swallow) |

**No @opentelemetry dependency.** This complements (does not replace) the existing
OTel stack in `src/backend/lib/telemetry/`, which provides spans, metrics, and
distributed tracing for production.

#### Wiring

Applied `withApiTelemetry` to 5 critical GET routes:

| Route | Wrapper pattern |
|-------|----------------|
| `/api/transactions` | `withApiTelemetry(getHandler, '/api/transactions')` |
| `/api/wallets` | `withApiTelemetry(getHandler, '/api/wallets')` |
| `/api/deposits` | `withApiTelemetry(withErrorHandler(getDepositsHandler), '/api/deposits')` |
| `/api/withdrawals` | `withApiTelemetry(getHandler, '/api/withdrawals')` |
| `/api/businesses` | `withApiTelemetry(withErrorHandler(getBusinessesHandler), '/api/businesses')` |

For routes already using `withErrorHandler`, the stacking order is:
`withApiTelemetry(withErrorHandler(handler))` — `withErrorHandler` normalises errors
into proper HTTP responses, then `withApiTelemetry` measures the full lifecycle and
sets headers.

### 2. Landing Page RSC Migration

Split the monolithic `'use client'` `LandingPage` into two components:

| Component | Directive | Responsibility |
|-----------|-----------|----------------|
| `LandingPageServer.tsx` | Server Component (default) | Header logo, hero text, trust badges, footer — zero JS |
| `LandingPage.tsx` → `ClientBanner` | `'use client'` | `signIn()` buttons, mobile nav `useState` |

**Result:** The landing page's static HTML (hero, badges, footer) is now
server-rendered with zero JavaScript. Only the `ClientBanner` island ships
client JS — containing just `next-auth`'s `signIn()`, a single `useState`, and
one `lucide-react` icon.

### 3. Bundle Optimization Approach

- **Server Components by default** — all new pages/components should start as RSCs.
- **Client islands only for interactivity** — extract the minimal interactive subset.
- **Dynamic imports for heavy tabs** — `DashboardShell.tsx` already lazy-loads 12 tabs via `next/dynamic`.
- **`next/dynamic` with `{ ssr: false }`** for tabs that need browser APIs only.

### 4. Streaming SSR

The existing `Suspense` boundaries in the dashboard shell enable streaming SSR.
The landing page is now fully RSC so it streams instantly.

## Consequences

### Positive
- Every critical GET response carries `x-request-id` for end-to-end tracing.
- `x-response-time` header enables client-side and CDN-level latency monitoring.
- Structured JSON logs are grep-parseable by any log aggregation tool (no OTel required).
- Landing page JS budget reduced to the `ClientBanner` island only.
- Server Component HTML is cacheable at the CDN/edge level.

### Risks
- `withApiTelemetry` clones the `NextResponse` — slight overhead from body stream
  cloning. Negligible for JSON responses; monitor for large streaming payloads.
- `crypto.randomUUID()` may not be available in very old Node versions (< 19).
  Fallback: `crypto.randomUUID` is available in Node 19+ and all modern runtimes.

### Future Work
- Extend `withApiTelemetry` to POST/PUT/DELETE handlers.
- Add `x-request-id` propagation to upstream service calls.
- Build a Grafana dashboard panel parsing the structured JSON logs.
- Consider edge-side `x-request-id` injection via Cloudflare Worker.
