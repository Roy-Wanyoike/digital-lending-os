# ADR-006: Threat Model - Dashboard Frontend

## STRIDE Analysis

### S - Spoofing

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Unauthorized dashboard access | Medium | High | JWT authentication via `getApiUser()`; unauthenticated requests redirect to /login | Low |
| Session token theft via XSS | Medium | Critical | HttpOnly, Secure, SameSite=Lax cookies; CSP headers prevent script injection | Low |
| CSRF on tab mutations | Medium | High | Double-submit cookie via `requireAuth()` on all POST/PUT/DELETE | Low |
| Stolen JWT used from different device | Low | High | 24h maxAge limits window; IP-based anomaly detection (future) | Medium |

### T - Tampering

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| XSS via user-generated content (business names, reviews) | Medium | Critical | React auto-escapes JSX; `dangerouslySetInnerHTML` banned in lint rules; CSP `script-src 'self'` | Low |
| XSS via notification messages | Medium | High | React auto-escapes; notification content is server-rendered | Very Low |
| Client-side state manipulation (React DevTools) | Low | Low | All mutations go through API routes with server-side validation; client state is display-only | Very Low |
| DOM manipulation to bypass UI restrictions | Low | Low | Server enforces all authorization; hiding a button doesn't grant access | Very Low |
| Bundle tampering (supply chain attack) | Low | Critical | Subresource Integrity (SRI) on CDN scripts; `npm audit` in CI; lockfile integrity | Medium |

### R - Repudiation

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| User denies performing a dashboard action | Medium | Medium | All mutations go through `requireAuth()` which logs the actor; server-side audit logs | Low |
| No evidence of which tab was accessed | Low | Low | Next.js middleware logs page access; `x-request-id` on all API responses | Low |

### I - Information Disclosure

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Cross-tenant data visible in dashboard | Low | Critical | All API routes filter by `tenantId` from JWT; React components only display API-returned data | Low |
| Sensitive data in browser localStorage | Low | High | No sensitive data stored in localStorage; JWT is in HttpOnly cookie | Very Low |
| API error messages leak internal details | Medium | Medium | `withErrorHandler` returns generic messages; Zod field errors are safe (field names, not values) | Low |
| Network tab exposes API responses | Inherent | Medium | HTTPS encrypts all traffic; no sensitive fields in URL params | Accepted |
| `x-request-id` and `x-response-time` headers | Inherent | Low | Request IDs are for debugging; not sensitive | Accepted |
| Bundle contains sensitive data (API keys, secrets) | Low | Critical | `NEXTAUTH_SECRET` and provider keys are server-side env vars; never bundled in client JS | Very Low |

### D - Denial of Service

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| Client-side infinite loop (bad useEffect) | Low | Low | React strict mode catches effect bugs; error boundary catches infinite render | Very Low |
| Large data response crashes tab | Medium | Medium | Pagination on all list APIs (max 100 per page); `maxBodyLength` on server | Low |
| WebSocket connection exhaustion (SSE) | Medium | Medium | One SSE connection per user; stale connections cleaned on tab close | Low |
| Excessive tab switching (memory leak) | Low | Low | `next/dynamic` unmounts inactive tabs; React garbage collection | Low |

### E - Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| User accesses admin-only tab via URL | Medium | High | Server-side `requireRole()` check on all admin endpoints; tab visibility is UI-only gate | Low |
| Manipulate `useApi` to call admin endpoints | Low | Critical | Server validates role on every request; client-side role check is UX convenience only | Very Low |
| Bypass ErrorBoundary to crash shell | Very Low | Low | ErrorBoundary is a class component; React catches all render errors at the boundary | Very Low |
| Supply chain: compromised npm package sends data | Low | Critical | `npm audit` in CI; lockfile integrity; minimal dependencies; periodic dependency review | Medium |

---

## Attack Trees

### Attack Tree 1: XSS via User Content

```
XSS via User Content
+-- 1.1 Business name with <script> tag
|   +-- Mitigated: React JSX auto-escapes
|   +-- Mitigated: CSP header blocks inline scripts
|   +-- Risk: dangerouslySetInnerHTML in custom components
|       +-- Mitigated: ESLint rule bans dangerouslySetInnerHTML
+-- 1.2 Review text with HTML injection
|   +-- Mitigated: React auto-escapes
+-- 1.3 Notification message with script
|   +-- Mitigated: React auto-escapes
+-- 1.4 URL parameter injection (reflected XSS)
    +-- Mitigated: Next.js App Router escapes URL params in RSC
    +-- Mitigated: CSP script-src 'self' prevents inline scripts
```

### Attack Tree 2: CSRF on State Mutations

```
CSRF Attack
+-- 2.1 POST /api/wallets/withdraw from external site
|   +-- Mitigated: requireAuth() enforces x-csrf-token header
|   +-- Mitigated: SameSite=Lax cookie blocks cross-site POST
+-- 2.2 GET /api/... (read-only, no mutation)
|   +-- Mitigated: GET endpoints use getApiUser (no CSRF needed)
+-- 2.3 Flash-based CSRF (bypass SameSite)
    +-- Mitigated: SameSite=Lax blocks flash POST
    +-- Mitigated: CSRF token must match double-submit cookie
```

### Attack Tree 3: Supply Chain Attack

```
Supply Chain Attack
+-- 3.1 Compromised npm package
|   +-- Mitigated: npm audit in CI pipeline
|   +-- Mitigated: package-lock.json ensures deterministic installs
|   +-- Mitigated: Dependabot/security alerts for vulnerable packages
|   +-- Risk: Zero-day in popular package (e.g., react, next)
|       +-- Mitigated: Pin exact versions; review changelogs before upgrade
+-- 3.2 Malicious code in useApi hook
|   +-- Mitigated: Hook is internal code; reviewed in PR
|   +-- Mitigated: Code is auditable (no minified third-party code)
+-- 3.3 CDN script injection
    +-- Mitigated: No external CDN scripts in dashboard
    +-- Mitigated: All JS is bundled by Next.js (content-hashed)
    +-- Mitigated: Subresource Integrity if external scripts are added
```

### Attack Tree 4: Client-Side Data Leakage

```
Data Leakage
+-- 4.1 Sensitive data in JavaScript bundle
|   +-- Mitigated: Server env vars (NEXTAUTH_SECRET, provider keys) not in client bundle
|   +-- Mitigated: next/dynamic ensures only active tab JS is loaded
|   +-- Risk: API response data cached in useApi in-memory store
|       +-- Mitigated: In-memory store is per-session, cleared on navigation
+-- 4.2 Data exposed via browser DevTools
|   +-- Accepted: Client-side data is what the user is authorized to see
|   +-- Mitigated: Server enforces all authorization; DevTools can only see what API returned
+-- 4.3 Data in browser history / URL
    +-- Mitigated: No sensitive data in URL params
    +-- Mitigated: Next.js client-side routing doesn't expose data in URLs
```

## Risk Summary

| Risk | Level | Key Gap |
|------|-------|----------|
| XSS via user content | LOW | React auto-escape + CSP provide defense in depth |
| CSRF on mutations | LOW | Double-submit cookie + SameSite=Lax |
| Cross-tenant data leakage | LOW | tenantId filtering on every API route |
| Supply chain attack | MEDIUM | No runtime integrity checks; relies on CI npm audit |
| Client-side data in memory | LOW | Per-session, cleared on navigation |
| Admin tab unauthorized access | LOW | Server-side role check on all endpoints |

**Top priority:** Implement CSP headers (Content-Security-Policy) with `script-src 'self'` to provide an additional XSS defense layer beyond React auto-escaping.