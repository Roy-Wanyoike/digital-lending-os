# Digital Lending OS Edge Architecture — Cloudflare

## Edge Architecture Diagram

```
                           ┌──────────────────────────────────────────────────┐
                           │              Internet (Users / Clients)            │
                           └───────────────────────┬──────────────────────────┘
                                                   │
                                                   ▼
                           ┌──────────────────────────────────────────────────┐
                           │           Cloudflare DNS (Global Anycast)         │
                           │     digital-lending-os.com → Cloudflare Edge Network      │
                           └───────────────────────┬──────────────────────────┘
                                                   │
              ┌────────────────────────────────────┼────────────────────────────┐
              │                                    │                            │
              ▼                                    ▼                            ▼
    ┌──────────────────┐              ┌──────────────────┐          ┌──────────────────┐
    │  Edge Worker      │              │  Cache Rules      │          │  Page Shield       │
    │  (digital-lending-os-edge) │              │  (cache-rules)   │          │  (page-shield)    │
    │                   │              │                   │          │                   │
    │  ┌─────────────┐  │              │  L1: CDN Cache   │          │  • CSP headers    │
    │  │ 1. Geo Block│  │              │  ├ Static: 1yr   │          │  • Inline script  │
    │  ├─────────────┤  │              │  ├ Public: 1mo   │          │    disabled       │
    │  │ 2. Bot Prot. │  │              │  ├ API: 30-10m   │          │  • HSTS           │
    │  ├─────────────┤  │              │  └ Bypass: auth  │          │  • X-Frame:DENY   │
    │  │ 3. Rate Limit│  │              │                   │          │  • Report URI     │
    │  │   (KV slide) │  │              └──────────────────┘          └──────────────────┘
    │  ├─────────────┤  │                        │                            │
    │  │ 4. JWT Valid │  │                        │                            │
    │  │   (RS256)    │  │                        │                            │
    │  ├─────────────┤  │                        │                            │
    │  │ 5. A/B Test  │  │                        │                            │
    │  │   Inject     │  │                        │                            │
    │  ├─────────────┤  │                        │                            │
    │  │ 6. Cache     │  │                        │                            │
    │  │   First/Edge │  │                        │                            │
    │  ├─────────────┤  │                        │                            │
    │  │ 7. Security  │  │                        │                            │
    │  │   Headers    │  │                        │                            │
    │  └─────────────┘  │                        │                            │
    └──────────────────┘                        │                            │
              │                                  │                            │
              └────────────────────┬─────────────┘                            │
                                   │                                          │
                                   ▼                                          │
                         ┌──────────────────────┐                             │
                         │   L1: Cloudflare CDN  │◄────────────────────────────┘
                         │   (Global Edge)      │     Cache Rules + Page Shield
                         │                      │     applied at CDN layer
                         └──────────┬───────────┘
                                    │
                                    │  MISS (origin fetch)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   L2: Redis Cache    │
                         │   (In-Cluster)       │
                         │   (src/backend/lib/  │
                         │    cache/)           │
                         │                      │
                         │   Strategies:         │
                         │   • DashboardStats    │
                         │   • ExchangeRates     │
                         │   • PaymentMethods    │
                         │   • UserProfile       │
                         │   • FraudRules        │
                         │   • RateLimit         │
                         │                      │
                         │   Features:           │
                         │   • Stale-While-      │
                         │     Revalidate        │
                         │   • Stampede Prot.    │
                         │   • Pub/Sub Invalid.  │
                         └──────────┬───────────┘
                                    │
                                    │  MISS (cache stampede protection)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   L3: Next.js Origin │
                         │   (K8s Cluster)      │
                         │                      │
                         │   ┌────────────────┐ │
                         │   │ Next.js App    │ │
                         │   │ (RSC + API)    │ │
                         │   └───────┬────────┘ │
                         │           │          │
                         │   ┌───────▼────────┐ │
                         │   │ PostgreSQL     │ │
                         │   │ (Primary +     │ │
                         │   │  Read Replica) │ │
                         │   └────────────────┘ │
                         └──────────────────────┘
```

## Cache Tier Strategy

Digital Lending OS uses a **three-tier cache hierarchy** to minimize origin hits and provide sub-millisecond response times:

### L1: Cloudflare CDN (Global Edge)

| Resource | Strategy | Edge TTL | Browser TTL | SWR | Key |
|----------|----------|----------|-------------|-----|-----|
| `/_next/static/*` | Cache-first, immutable | 1 year | 1 year | 1 day | Path only |
| `/public/*.{png,jpg,svg,...}` | Cache-first | 1 month | 1 month | 1 day | Path only |
| `/api/dashboard/stats` | Stale-while-revalidate | 30s | 0s | 60s | Path + query + auth |
| `/api/currency` | Stale-while-revalidate | 60s | 0s | 120s | Path + query |
| `/api/wallets/rates` | Stale-while-revalidate | 60s | 0s | 120s | Path + query |
| `/api/payment-methods/global` | Stale-while-revalidate | 10 min | 0s | 20 min | Path + query |
| `/api/payments/rates` | Stale-while-revalidate | 60s | 0s | 120s | Path + query |
| `/api/auth/*` | **Bypass** | — | — | — | — |
| `/api/payments/*` | **Bypass** | — | — | — | — |
| All POST/PUT/DELETE | **Bypass** | — | — | — | — |

### L2: Redis Cache (In-Cluster)

| Strategy | TTL | SWR Grace | Cache Key | Tags |
|----------|-----|-----------|-----------|------|
| DashboardStats | 30s | 60s | `ys:dash:{tenantId}:{role}` | `dash:{tenantId}` |
| ExchangeRates | 60s | 5 min | `ys:fx:*` | `currency` |
| PaymentMethods | 10 min | 20 min | `ys:pm:{tenantId}:{currency}` | `pm:{tenantId}` |
| UserProfile | 5 min | 10 min | `ys:u:{userId}` | `user:{userId}` |
| FraudRules | 5 min | 10 min | `ys:fr:{tenantId}:{type}` | `fraud:{tenantId}` |
| SessionCache | 30 min | 0 | `ys:sess:{userId}:{device}` | `session:{userId}` |
| RateLimit | 1 min | 0 | `ys:rl:{key}:{window}` | — |

### L3: Origin (Next.js / PostgreSQL)

- **Last resort**: Full request processing through Next.js
- **RSC streaming**: Server Components stream HTML progressively
- **Read replica routing**: Dashboard queries hit PostgreSQL read replicas
- **Write-through cache**: Origin updates propagate up through cache tiers

## Cache Invalidation Strategy

### By Tag (Surrogate Keys)

Each cached response includes `Surrogate-Key` headers. The Cloudflare API supports purging by tag:

```bash
# Purge all dashboard stats for tenant "t123"
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_tags" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"tags":["api-dashboard","dash:t123"]}'

# Purge all static assets
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_tags" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"tags":["static-assets","hashed-assets"]}'
```

### By URL

```bash
# Purge specific API response
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_url" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"urls":["https://digital-lending-os.com/api/currency?base=NGN"]}'
```

### By Prefix (Wildcard)

```bash
# Purge all payment-related caches
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_url" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"prefix":"https://digital-lending-os.com/api/dashboard/"}'
```

### Redis Pub/Sub Invalidation (L2)

When the origin mutates data, it publishes invalidation events:

```
# Origin writes to Kafka → consumer publishes to Redis Pub/Sub
PUBLISH cache:invalidate:dash {"prefix":"ys:dash:", "tags":["dash:t123"]}

# All Redis instances receive and flush matching keys
# Edge cache purged via API call (scheduled batch or event-driven)
```

## Workers KV Usage

| Namespace | Purpose | Key Pattern | TTL |
|-----------|---------|-------------|-----|
| `RATE_LIMIT_KV` | Sliding window rate limiting | `rl:{category}:{ip}` | window + 60s |
| `CACHE_KV` | Edge-side cache augmentation | `cache:{hash}` | Per-endpoint TTL |
| `AB_TEST_KV` | A/B test sticky assignments | `ab:{experiment}:{userId}` | 30 days |

### Rate Limiting Categories

| Category | Max Requests | Window | Applies To |
|----------|-------------|--------|-----------|
| global | 300/min | 60s | All requests |
| auth | 10/min | 60s | `/api/auth/*` |
| api | 100/min | 60s | `/api/*` |
| payment | 30/min | 60s | `/api/payments/*`, `/api/withdrawals/*` |
| webhook | 1000/min | 60s | Webhook endpoints |
| static | 600/min | 60s | Static assets |

## Security Features

### Bot Protection

- Suspicious user agent detection via regex patterns (curl, wget, python-requests, etc.)
- Search engine whitelist (Googlebot, Bingbot, DuckDuckBot, etc.)
- Managed challenge response for flagged requests
- Challenge returns 403 with CF-Challenge header

### JWT Edge Validation

- RSA signature verification using `crypto.subtle.verify()`
- Supports RS256 and RS512 algorithms
- Expiration (`exp`) and not-before (`nbf`) checks
- **Fail-open**: On validation error, request passes to origin for reliability
- Skips validation on public endpoints

### Geo-Blocking / Geo-Routing

- Configurable blocked countries via `BLOCKED_COUNTRIES` env var
- Automatic region routing based on Cloudflare's `cf.country` and `cf.continent`
- Geo headers injected: `X-Geo-Country`, `X-Geo-Continent`, `X-Geo-City`, `X-Nearest-Region`

### Page Shield (CSP)

- Strict Content Security Policy with nonce support
- Inline scripts disabled
- Allowlisted external scripts: Stripe, jsDelivr
- Allowlisted connections: Stripe, Paystack, Flutterwave, IntaSend, Paya
- CSP violation reporting to `/api/security/csp-report`
- HSTS with preload, X-Frame-Options: DENY

## A/B Testing

Three pre-configured experiments with deterministic hash-based assignment:

| Experiment | Variants | Traffic % | Sticky Duration |
|------------|----------|-----------|----------------|
| checkout-flow | control, variant-a, variant-b | 30% | 30 days |
| pricing-display | control, variant-a | 20% | 30 days |
| onboarding-wizard | control, variant-a | 50% | 30 days |

Assignment is:
1. Deterministic (same user always gets same variant)
2. Sticky via KV persistence
3. Injected as headers: `X-AB-{experiment-name}` and `X-AB-Experiment`

## Deployment Pipeline

```
┌───────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────────────┐
│  Git Push  │───▶│  GitHub    │───▶│  Wrangler   │───▶│  Cloudflare      │
│  (main)    │    │  Actions   │    │  Deploy     │    │  Edge Network    │
└───────────┘    └────────────┘    └─────────────┘    └──────────────────┘
                        │                                      │
                        ▼                                      ▼
                 ┌────────────┐                         ┌──────────────────┐
                 │  lint +    │                         │  Global Rollout   │
                 │  typecheck │                         │  (300+ PoPs)      │
                 └────────────┘                         └──────────────────┘
```

### Commands

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# Local development (against staging origin)
wrangler dev --env staging

# Set secrets
wrangler secret put JWT_PUBLIC_KEY --env production
wrangler secret put BLOCKED_COUNTRIES --env production

# Create KV namespaces
wrangler kv namespace create RATE_LIMIT_KV --env production
wrangler kv namespace create CACHE_KV --env production
wrangler kv namespace create AB_TEST_KV --env production

# Purge all edge cache
wrangler cache:purge --all

# Tail worker logs
wrangler tail --env production
```

## File Reference

| File | Purpose |
|------|---------|
| `worker.ts` | Edge Worker: static caching, API caching, JWT validation, rate limiting, geo-routing, bot protection, A/B testing |
| `wrangler.toml` | Wrangler configuration: KV bindings, environment configs (staging/production), route patterns |
| `cache-rules.json` | Cloudflare Cache Rules: per-path TTL, cache keys, bypass rules, surrogate keys |
| `page-shield.json` | Page Shield: CSP, inline script disable, HSTS, report URI, hotlink protection |
| `README.md` | This documentation |

## Monitoring & Observability

- **Workers Analytics**: Available via Cloudflare dashboard under Workers > digital-lending-os-edge > Analytics
- **Logs**: Forward to OTel Collector via Cloudflare Logpush → Grafana Loki
- **KV Metrics**: Available via Cloudflare API (`/storage/kv/namespaces/{id}/metrics`)
- **Cache Analytics**: Cloudflare dashboard > Caching > Cache Rules
- **Security Events**: Cloudflare dashboard > Security > Page Shield

## Response Headers Reference

| Header | Description |
|--------|-------------|
| `X-Cache-Status` | `HIT` / `MISS` / `BYPASS` |
| `X-Cache-Tier` | `L1-Edge` / `L2-Redis` / `L3-Origin` |
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp for limit reset |
| `X-Geo-Country` | ISO country code |
| `X-Geo-Continent` | Continent code |
| `X-Nearest-Region` | AWS region routed to |
| `X-AB-Experiment` | Semicolon-delimited experiment assignments |
| `X-AB-{name}` | Per-experiment variant assignment |
| `X-Edge-Processing-Time` | Worker processing time in ms |
| `X-Edge-Worker` | Worker name (`digital-lending-os-edge`) |
