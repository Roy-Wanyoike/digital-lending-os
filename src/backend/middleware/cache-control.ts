/**
 * Cache-Control header middleware for Digital Lending OS.
 *
 * Resource types:
 *   - static    → 1 year, immutable (hashed _next/static assets)
 *   - api-stats → 30 s max-age (dashboard stats, fast-changing aggregates)
 *   - api-data  → 60 s max-age (exchange rates, reference data)
 *   - api-auth  → no-store (session, tokens, sensitive endpoints)
 *   - html      → no-cache (RSC HTML shells — always revalidate)
 */

export type CacheResourceType = 'static' | 'api-stats' | 'api-data' | 'api-auth' | 'html'

/**
 * Returns the appropriate Cache-Control (and related) headers for a given resource type.
 * Designed to be spread directly into a NextResponse or Response init.
 */
export function getCacheHeaders(resourceType: CacheResourceType): Record<string, string> {
  switch (resourceType) {
    // ── Immutable static assets (_next/static/*) ──────────────────────
    case 'static':
      return {
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Vary on nothing — content-addressed by hash
      }

    // ── Dashboard stats — 30 s ────────────────────────────────────────
    case 'api-stats':
      return {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60, must-revalidate',
        'Vary': 'Authorization',
      }

    // ── General API data — 60 s ───────────────────────────────────────
    case 'api-data':
      return {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        'Vary': 'Authorization',
      }

    // ── Auth endpoints — never cache ──────────────────────────────────
    case 'api-auth':
      return {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }

    // ── RSC HTML shells — validate on every request ───────────────────
    case 'html':
      return {
        'Cache-Control': 'private, no-cache, must-revalidate',
        'Vary': 'Authorization, Accept-Encoding',
      }
  }
}
