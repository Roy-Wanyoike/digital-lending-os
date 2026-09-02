# Digital Lending OS Cloud-Native Architecture Design Document

> **Version:** 1.0.0
> **Last Updated:** 2025-01
> **Status:** Production Design
> **Author:** Architecture Team (Task ID: 3, Agent: architect)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Service Decomposition](#3-service-decomposition)
4. [Data Architecture](#4-data-architecture)
5. [Event-Driven Architecture](#5-event-driven-architecture)
6. [Caching Strategy](#6-caching-strategy)
7. [Performance Optimization](#7-performance-optimization)
8. [Security Architecture](#8-security-architecture)
9. [Observability](#9-observability)
10. [Infrastructure](#10-infrastructure)
11. [Scaling Roadmap](#11-scaling-roadmap)

---

## 1. Executive Summary

### 1.1 Vision

Digital Lending OS is a multi-tenant B2B fintech platform providing escrow-based payments, digital wallets, trust scoring, and compliance services across emerging markets (Nigeria, Kenya, South Africa, and broader Africa). This architecture redesign transforms the platform from a monolithic SQLite-backed application into a fully cloud-native, event-driven system capable of serving **100 million users** with **near-zero downtime** (target: 99.99% availability).

The redesign leverages React Server Components (RSC) and Next.js App Router as the Backend-for-Frontend (BFF), Kafka as the event backbone, PostgreSQL as the primary relational store, and Cloudflare's global edge network for CDN caching, bot protection, and JWT validation. Every domain is modeled as a bounded context with its own Kafka topic namespace, enabling independent scaling and deployment.

### 1.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router as BFF | RSC eliminates the need for a separate API layer for page rendering; streaming SSR provides sub-200ms TTFB; unified deployment reduces operational complexity |
| Kafka for async communication | Loose coupling between services; exactly-once semantics for financial transactions; natural audit log via immutable events |
| PostgreSQL with Patroni HA | Financial data requires ACID guarantees; Row Level Security enforces multi-tenant isolation at the database level; mature tooling and ecosystem |
| Cloudflare Edge as L1 cache | 300+ PoPs globally; sub-ms cache hit latency; built-in WAF, DDoS, and bot protection; KV for edge-side rate limiting |
| OpenSearch for search + CQRS | Full-text search across payments, transactions, and businesses; CDC sync from Kafka provides near-real-time read models |

### 1.3 Key Metrics Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API p95 latency | **< 100ms** | Measured at Cloudflare edge → origin round-trip |
| API p99 latency | **< 500ms** | Measured at application layer |
| Availability | **99.99%** | Monthly uptime (52.56 min downtime/year max) |
| Initial JS payload | **< 100KB** | Gzipped, measured by Web Vitals Lighthouse |
| Time to Interactive (TTI) | **< 2.5s** | On 4G connection, median mobile device |
| Payment completion time | **< 3s** | End-to-end from initiation to provider callback |
| Kafka consumer lag | **< 1,000 messages** | Per consumer group, p99 |
| RPO (Recovery Point Objective) | **< 1 minute** | Maximum acceptable data loss |
| RTO (Recovery Time Objective) | **< 15 minutes** | Maximum acceptable downtime after disaster |
| Cache hit ratio (L1) | **> 90%** | Cloudflare CDN hit ratio |
| Cache hit ratio (L2) | **> 85%** | Redis cache hit ratio |

### 1.4 Business Context

Digital Lending OS serves B2B clients (businesses and marketplaces) that need escrow-protected payments, multi-currency wallets, and trust verification for counterparties. The platform manages the full lifecycle: payment initiation through 5 provider integrations (Stripe, Paystack, Flutterwave, IntaSend, Paya), wallet operations (deposits, withdrawals, currency conversion), escrow transactions (create, fund, release, dispute, refund), and compliance (KYC, AML screening, fraud detection). Each tenant operates in complete isolation enforced at both the application and database layers via PostgreSQL Row Level Security (RLS).

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture: 3-Tier Design

Digital Lending OS follows a strict 3-tier architecture that separates concerns across the Edge, Application, and Data layers. This separation enables independent scaling, fault isolation, and clear operational boundaries.

```
┌═══════════════════════════════════════════════════════════════════════════════┐
║                           TIER 1: EDGE / CDN                                  ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │                    Cloudflare Global Edge Network                     │    ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    ║
║  │  │ DNS      │  │ WAF &    │  │ Edge     │  │ Rate     │              │    ║
║  │  │ Anycast  │  │ DDoS     │  │ Worker   │  │ Limiter  │              │    ║
║  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │    ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    ║
║  │  │ JWT      │  │ Bot      │  │ Geo      │  │ A/B      │              │    ║
║  │  │ Validate │  │ Protect  │  │ Routing  │  │ Testing  │              │    ║
║  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │    ║
║  │  │              L1: CDN Cache (Cloudflare)                        │  │    ║
║  │  │  Static assets: 1yr | API responses: 30s-10m | SWR enabled   │  │    ║
║  │  └────────────────────────────────────────────────────────────────┘  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
╚═════════════════════════════════════════════════════════════════╤═══════════╝
                                                                   │
                                                          MISS → Origin
                                                                   │
┌═════════════════════════════════════════════════════════════════╧═══════════╗
║                        TIER 2: APPLICATION                                   ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │              Kubernetes (GKE) — Private Cluster                       │  ║
║  │                                                                       │  ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │  ║
║  │  │              Next.js App Router (BFF)                         │  │  ║
║  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │  ║
║  │  │  │ RSC      │  │ API      │  │ Auth     │  │ SSR      │      │  │  ║
║  │  │  │ Server   │  │ Routes   │  │ (Next    │  │ Stream   │      │  │  ║
║  │  │  │ Comp.    │  │ /api/*   │  │ Auth.js) │  │ Suspense │      │  │  ║
║  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │  │  ║
║  │  └────────────────────────────────────────────────────────────────┘  │  ║
║  │                              │                                        │  ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │  ║
║  │  │              L2: Redis Cache (In-Cluster)                      │  │  ║
║  │  │  DashboardStats 30s | ExchangeRates 60s | UserProfile 5m      │  │  ║
║  │  │  Stale-While-Revalidate | Stampede Protection | Pub/Sub        │  │  ║
║  │  └────────────────────────────────────────────────────────────────┘  │  ║
║  │                                                                       │  ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │  ║
║  │  │              Kafka Cluster (3 Brokers)                         │  │  ║
║  │  │  38 Topics | 8 Domains | Saga Orchestrator | DLQ Handling      │  │  ║
║  │  └────────────────────────────────────────────────────────────────┘  │  ║
║  │                                                                       │  ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │  ║
║  │  │              Microservices (Future: Extracted from BFF)          │  │  ║
║  │  │  Payment | Wallet | Escrow | Trust | Fraud | Compliance         │  │  ║
║  │  │  Notification | Search | Analytics                            │  │  ║
║  │  └────────────────────────────────────────────────────────────────┘  │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════════════╤═══════════╝
                                                                   │
┌═════════════════════════════════════════════════════════════════╧═══════════╗
║                         TIER 3: DATA                                          ║
║  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                   ║
║  │  PostgreSQL    │  │  OpenSearch    │  │  Google Cloud   │                   ║
║  │  Primary + 2   │  │  3P + 1R       │  │  Storage (S3)   │                   ║
║  │  Read Replicas │  │  CQRS Models   │  │  Backups + WAL  │                   ║
║  │  Patroni HA   │  │  Full-Text     │  │  Assets         │                   ║
║  └────────────────┘  └────────────────┘  └────────────────┘                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 2.2 Request Flow: End-to-End

The following diagram traces a typical user request from browser to database and back:

```
User (Browser)
  │
  │  1. DNS Lookup → Cloudflare Anycast
  │  2. TCP/TLS to nearest PoP
  ▼
Cloudflare Edge (L1 Cache)
  │
  │  3. Edge Worker executes:
  │     - Geo-blocking check
  │     - Bot protection (User-Agent filter)
  │     - Rate limiting (KV sliding window)
  │     - JWT validation (RS256 crypto.subtle)
  │     - Security headers injection
  │     - A/B test variant injection
  │
  │  4. Cache check:
  │     HIT  → Return cached response (X-Cache-Status: HIT)
  │     MISS → Forward to origin
  ▼
Next.js Application (GKE Pod)
  │
  │  5. Route handler receives request
  │     - Parse session/JWT
  │     - Set tenant context (RLS)
  │     - Check L2 Redis cache
  │
  │  6. Redis L2 check:
  │     HIT  → Return cached data (X-Cache-Tier: L2-Redis)
  │     MISS → Query database
  ▼
PostgreSQL / OpenSearch
  │
  │  7. Query execution:
  │     - Read queries → Read Replica (PgBouncer Pool B)
  │     - Write queries → Primary (PgBouncer Pool A)
  │     - Search queries → OpenSearch
  │
  │  8. Response flows back:
  │     - Write-through to Redis L2
  │     - Response to client
  ▼
User (Browser)
  │
  │  9. Response received
  │     - RSC HTML streamed (Suspense boundaries)
  │     - JS chunks loaded on-demand (next/dynamic)
  │     - Interactive hydration
```

### 2.3 Service Decomposition Strategy

Digital Lending OS adopts a **pragmatic monolith-first** approach with Kafka event boundaries. The current implementation uses Next.js App Router as a monolithic BFF that handles all API routes and server component rendering. However, all internal communication follows bounded-context patterns — each domain publishes events to its own Kafka topic namespace, enabling future extraction into independent microservices without architectural changes.

The extraction path is:
1. **Phase 1 (Current):** Monolithic Next.js BFF + Kafka event backbone
2. **Phase 2:** Extract Payment and Wallet services (highest traffic, most independent)
3. **Phase 3:** Extract Escrow, Trust, Fraud, Compliance services
4. **Phase 4:** Extract Notification, Search, Analytics services

Each extraction is a zero-downtime operation: the BFF continues to serve as a thin proxy/SSR layer while routing API calls to the newly extracted service.

---

## 3. Service Decomposition

### 3.1 Service Map Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         API Gateway (Cloudflare + Next.js)                 │
│  Geo-blocking → Bot Protection → Rate Limit → JWT Validate → Route        │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────────┘
       │          │          │          │          │          │
  ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
  │ Auth   │ │Payment │ │ Wallet │ │ Escrow │ │ Trust  │ │ Fraud  │
  │Service │ │Service │ │Service │ │Service │ │Service │ │Service │
  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
       │         │         │         │         │         │
  ┌────▼─────────▼─────────▼─────────▼─────────▼─────────▼───┐
  │                     Kafka Event Bus                         │
  │  38 Topics | 8 Domains | Saga Orchestrator | 3-Tier EOS   │
  └────┬─────────┬─────────┬─────────┬─────────┬──────────────┘
       │         │         │         │         │
  ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
  │Compli- │ │ Notifi- │ │ Search │ │Analytics│ │ Audit  │
  │ance   │ │ cation │ │Service │ │Service │ │Service │
  │Service │ │Service │ │        │ │        │ │        │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### 3.2 Service Catalog

#### 3.2.1 API Gateway

**Responsibility:** Single entry point for all client requests. Handles cross-cutting concerns: authentication validation, rate limiting, geo-blocking, bot protection, A/B testing, security header injection, and request routing. Implemented as a two-layer gateway: Cloudflare Edge Worker for L1 concerns (global, low-latency) and Next.js middleware for application-level concerns.

**Tech Stack:**
- Cloudflare Workers (V2 Isolates, KV for rate limiting state)
- Next.js Middleware (route matching, session validation)
- Wrangler CLI for deployment

**Scaling Strategy:** Cloudflare Workers auto-scale to zero — no provisioning needed. Each request is processed at the nearest of 300+ PoPs. Next.js middleware runs in-process with the Next.js application and scales with the application pods.

**Implementation Files:** `infra/cloudflare/worker.ts`, `infra/cloudflare/wrangler.toml`, `infra/cloudflare/cache-rules.json`, `infra/cloudflare/page-shield.json`

---

#### 3.2.2 Auth Service

**Responsibility:** User authentication (sign-in, sign-up, password reset), session management, JWT issuance and validation, role-based access control (RBAC), multi-factor authentication, and OAuth provider integration. Currently implemented via NextAuth.js v5 with credentials provider; designed for extension to OAuth providers (Google, Microsoft) and passkey/WebAuthn support.

**Tech Stack:**
- NextAuth.js v5 (App Router integration)
- JWT tokens (RS256 signed, stored in httpOnly cookies)
- PostgreSQL `Account` table (user credentials, roles, status)
- Redis (session cache, rate limiting on auth endpoints)
- Prisma ORM (typed queries, migrations)

**Scaling Strategy:** Stateless JWT validation at edge (Cloudflare Worker); session verification against Redis for active session management. HPA scales Next.js pods based on CPU utilization (50-80% target).

**Security Notes:**
- JWT RS256 with public key distributed to Cloudflare Edge for validation
- httpOnly, secure, SameSite=Strict cookies
- CSRF protection via NextAuth double-submit cookie pattern
- Password hashing with bcrypt (cost factor 12)
- Account lockout after 5 failed attempts (10-minute cooldown)

---

#### 3.2.3 Payment Service

**Responsibility:** End-to-end payment lifecycle management across 5 payment providers (Stripe, Paystack, Flutterwave, IntaSend, Paya). Handles payment initiation, provider routing, webhook processing, status tracking, refunds, and reconciliation. Implements a state machine for payment flow control and saga pattern for distributed transactions.

**Tech Stack:**
- 5 provider SDKs (Stripe Node.js, Paystack Node, Flutterwave, IntaSend, Paya REST)
- Kafka producer/consumer (payment.events.* topics, EOS Tier 1)
- Saga orchestrator (state machine with compensating transactions)
- PostgreSQL `PaymentIntent` + `PaymentTransaction` tables
- OpenSearch (payment search index with CDC sync)
- Redis (payment status cache, idempotency keys)

**Scaling Strategy:** HPA based on request rate and payment queue depth. Kafka consumer group scales independently — additional consumer instances subscribe to payment topics during peak. Provider-specific connection pools prevent single-provider outages from affecting others.

**State Machine:**
```
IDLE → INITIATED → PROCESSING → COMPLETED
         │             │
         ▼             ▼
      CANCELLED      FAILED
                        │
                        ▼
                     REFUNDED
```

**Idempotency:** Every payment intent has a unique `idempotencyKey`. Duplicate requests with the same key return the existing payment state without creating a new transaction. This is critical for handling network retries and browser double-submissions.

---

#### 3.2.4 Wallet Service

**Responsibility:** Digital wallet management for multi-currency holdings. Handles deposits (from payment completions), withdrawals (to external accounts), currency conversions (with rate caching), balance tracking, and wallet lifecycle (create, freeze, unfreeze, close). Maintains an immutable transaction ledger via event sourcing.

**Tech Stack:**
- Kafka producer/consumer (wallet.events.* topics, EOS Tier 1)
- PostgreSQL `Wallet` + `WalletTransaction` tables (partitioned by month)
- Redis (balance cache with invalidation, rate limiting)
- PgBouncer connection pooling for high-concurrency balance queries

**Scaling Strategy:** Wallet operations are partitioned by `walletId` in Kafka (12 partitions), enabling parallel processing. Read-heavy balance queries are routed to PostgreSQL read replicas. Monthly partitioning ensures query performance remains constant regardless of total transaction volume.

**Consistency Model:** Wallet debits use pessimistic locking (`SELECT ... FOR UPDATE`) on the primary to prevent double-spend. Credits are applied synchronously within the payment saga. The wallet balance cache is invalidated via Redis Pub/Sub on every mutation.

---

#### 3.2.5 Escrow Service

**Responsibility:** Escrow transaction lifecycle management — the core business differentiator. Manages escrow creation, funding (from wallet or payment), milestone tracking, partial/full release, dispute handling, and refund. Supports buyer-seller relationships with trust verification.

**Tech Stack:**
- Kafka producer/consumer (escrow.events.* topics, EOS Tier 1)
- Saga orchestrator (escrow-funded → payment-confirmed → escrow-released)
- PostgreSQL `EscrowTransaction` + `EscrowAuditLog` tables
- OpenSearch (escrow search index)

**Scaling Strategy:** 8 Kafka partitions for escrow events. Escrow audit log is partitioned by month (12 partitions for 2025, auto-created for future months). Active escrow queries use partial indexes to only scan non-terminal states.

**Audit Trail:** Every state transition creates an immutable `EscrowAuditLog` entry with full before/after state, actor, timestamp, and reason. This provides a complete regulatory audit trail without impacting query performance on the main escrow table.

---

#### 3.2.6 Trust Score Service

**Responsibility:** Calculates and maintains trust scores for businesses based on payment history, escrow completion rate, dispute resolution, KYC verification status, and review submissions. Trust scores influence escrow terms, payment limits, and platform visibility.

**Tech Stack:**
- Kafka consumer (trust.events.* topics, EOS Tier 2)
- Kafka producer (consumes escrow.events.escrow_released, wallet.events.*)
- PostgreSQL `TrustScore` + `TrustReview` + `BusinessRelationship` tables
- OpenSearch (trust.score.snapshots — compacted topic for CQRS)

**Scaling Strategy:** Trust score computation is triggered by Kafka events and runs asynchronously. The scoring algorithm uses a weighted composite of factors recalculated on each relevant event. Scores are cached in Redis with 10-minute TTL and invalidated on updates.

---

#### 3.2.7 Fraud Detection Service

**Responsibility:** Real-time fraud detection using configurable rules and patterns. Monitors payment velocity, amount anomalies, geographic inconsistencies, device fingerprinting, and behavioral patterns. Generates fraud alerts, manages investigation cases, and can auto-block suspicious transactions.

**Tech Stack:**
- Kafka consumer (fraud.events.* + payment.events.payment_initiated, EOS Tier 2)
- PostgreSQL `FraudAlert` + `FraudCase` + `FraudRule` tables
- Redis (active fraud rules cache, 5-minute TTL)
- GIN indexes on `FraudRule.condition` (JSONB) for rule pattern matching

**Scaling Strategy:** Fraud rules are cached in Redis and evaluated in-memory for sub-millisecond decision latency. High-severity alerts trigger immediate PagerDuty escalation via the Alertmanager routing tree. Fraud alert spikes (>10 in 5 minutes) trigger automated investigation workflows.

**Rule Engine:** Fraud rules are stored as JSONB conditions in PostgreSQL with GIN indexes for fast pattern matching. Rules support:
- Amount thresholds (absolute and velocity-based)
- Geographic anomalies (country mismatch, distance-based)
- Device fingerprinting (new device, device rotation)
- Behavioral patterns (time-of-day, frequency, session patterns)

---

#### 3.2.8 Compliance/KYC Service

**Responsibility:** Regulatory compliance management including KYC document verification, AML screening against sanctions lists (OFAC, EU, local), PEP (Politically Exposed Person) checks, ongoing monitoring, and audit reporting. Manages compliance screenings, KYC submissions, and verification workflows.

**Tech Stack:**
- Kafka consumer (compliance.events.* topics, EOS Tier 2)
- External API integrations (sanctions screening providers, document verification APIs)
- PostgreSQL `ComplianceScreening` + `KYCSubmission` tables
- OpenSearch (compliance search, audit trail)

**Scaling Strategy:** KYC submissions are event-driven and processed asynchronously. Screening requests are batched for external API calls (rate limit management). Results are cached in OpenSearch for fast lookups and regulatory reporting.

---

#### 3.2.9 Search Service (OpenSearch)

**Responsibility:** Full-text search across payments, transactions, businesses, users, and audit logs. Provides faceted navigation, aggregations, autocomplete, and cross-index global search. Serves as the CQRS read model, synchronized from PostgreSQL via Kafka CDC.

**Tech Stack:**
- OpenSearch cluster (3 primary + 1 replica shards per index)
- Kafka CDC consumer (subscribes to all domain events)
- Custom HTTP REST client (no native driver dependency)
- In-memory fallback store (Map-based, auto-activated when OpenSearch unavailable)

**Index Configuration:**

| Index | Shards | Replicas | Key Features |
|-------|--------|----------|-------------|
| `payments` | 3 | 1 | Full-text on description/business names, filter by status/provider/currency |
| `transactions` | 3 | 1 | Full-text on reference, filter by type/status/wallet |
| `businesses` | 3 | 1 | name_analyzer (edge_ngrams), email_analyzer (pattern_capture) |
| `users` | 3 | 1 | Full-text on name/email, filter by role/status |
| `audit-logs` | 5 | 1 | Higher shard count for write-heavy audit trail |

**Scaling Strategy:** Cursor-based pagination (`search_after`) avoids the 10K result limit. Index templates define shard/replica counts upfront. Sync service supports both single-entity (near-real-time after CRUD) and bulk sync (full reindex from database).

---

#### 3.2.10 Notification Service

**Responsibility:** Multi-channel notification delivery (email, push, SMS, in-app). Subscribes to all domain events via Kafka and generates appropriate notifications based on user preferences and event type. Handles delivery tracking, retry logic, and preference management.

**Tech Stack:**
- Kafka consumer (fan-out across all *.events.* topics, EOS Tier 3)
- PostgreSQL `Notification` table (partitioned by month, 500M+ rows/year)
- Email provider integration (SendGrid/SES)
- Push notification service (FCM/APNs)
- SMS gateway integration (Twilio/Africa's Talking)

**Scaling Strategy:** 6 partitions per notification channel. Fire-and-forget delivery with idempotent consumer dedup. In-app notifications are queryable via partial indexes on unread status. Email/push/SMS delivery uses exponential backoff retry (1s, 2s, 4s, 8s, 16s → DLQ).

---

#### 3.2.11 Analytics Service

**Responsibility:** Business intelligence and operational analytics. Consumes Kafka events to build aggregated metrics: payment volumes, revenue trends, user growth, escrow completion rates, trust score distributions, and compliance screening throughput. Powers Grafana dashboards and internal reporting.

**Tech Stack:**
- Kafka consumer (audit.events.* + aggregated domain events, EOS Tier 3)
- OpenSearch (analytics indices with date_histogram aggregations)
- Grafana dashboards (digital-lending-os-overview, payments-overview)
- Prometheus + Alertmanager (real-time alerting on operational metrics)

**Scaling Strategy:** Analytics queries run against OpenSearch aggregations (pre-computed) rather than raw PostgreSQL data. Read-heavy analytics workloads target the async PostgreSQL replica to avoid impacting OLTP performance.

---

## 4. Data Architecture

### 4.1 Data Stores Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER ARCHITECTURE                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  PostgreSQL (Primary Store)                         │    │
│  │                                                                      │    │
│  │   ┌──────────┐     ┌──────────────────────────────────────────┐     │    │
│  │   │ PRIMARY  │────▶│ WAL Streaming (Synchronous)             │     │    │
│  │   │ Node A   │     └──────────┬──────────┬──────────────────┘     │    │
│  │   │ All writes│                │          │                         │    │
│  │   └──────────┘         ┌──────▼──┐  ┌────▼────┐  ┌──────────┐    │    │
│  │                        │ REPLICA │  │ REPLICA │  │ REPLICA  │    │    │
│  │                        │ Node B  │  │ Node C  │  │ Node D   │    │    │
│  │                        │ Sync    │  │ Async   │  │ Async    │    │    │
│  │                        │ <100ms   │  │ <1s     │  │ Analytics│    │    │
│  │                        │ lag      │  │ lag     │  │ batch    │    │    │
│  │                        └──────┬──┘  └────┬────┘  └──────────┘    │    │
│  │                               │          │                         │    │
│  │                        ┌──────▼──┐  ┌────▼────┐                  │    │
│  │                        │PgBouncer│  │PgBouncer│                  │    │
│  │                        │Pool B:  │  │Pool C:  │                  │    │
│  │                        │READ     │  │ANALYTICS│                  │    │
│  │                        └─────────┘  └─────────┘                  │    │
│  │                                                                      │    │
│  │  PgBouncer Pool A: WRITE → Primary (160 conns, transaction mode)   │    │
│  │  Patroni HA: Automatic failover with < 30s switchover               │    │
│  │  PITR: Any second within 90-day retention via WAL archive          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                   │
│  │  Redis (Cache + State)  │  │  OpenSearch (Search)    │                   │
│  │                          │  │                           │                   │
│  │  3-Node Sentinel         │  │  3 Primary + 1 Replica   │                   │
│  │  - Dashboard cache      │  │  shards per index         │                   │
│  │  - Exchange rates        │  │                           │                   │
│  │  - Rate limiting         │  │  CQRS Read Models:       │                   │
│  │  - Session store         │  │  - Payments               │                   │
│  │  - Pub/Sub invalidation │  │  - Transactions           │                   │
│  │  - Stampede protection   │  │  - Businesses             │                   │
│  │                          │  │  - Users                  │                   │
│  │  Persistence: RDB       │  │  - Audit Logs             │                   │
│  │  Maxmemory: allkeys-lru  │  │                           │                   │
│  │  Notify: Ex events       │  │  CDC Sync from Kafka      │                   │
│  └──────────────────────────┘  └──────────────────────────┘                   │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                   │
│  │  Kafka (Event Backbone) │  │  GCS S3 (Backup + Assets) │                   │
│  │                          │  │                           │                   │
│  │  3-Broker Cluster        │  │  WAL Archive: Continuous │                   │
│  │  - 38 topics             │  │  Base Backup: Daily 02:00 │                   │
│  │  - 8 domains             │  │  Retention: 90 days       │                   │
│  │  - 3 EOS tiers           │  │  RPO: < 1 minute          │                   │
│  │  - Replication: 3x       │  │  RTO: < 15 minutes        │                   │
│  └──────────────────────────┘  └──────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 PostgreSQL Architecture

**Topology:** Primary + 2 synchronous read replicas managed by Patroni for high availability. A third async replica serves analytics/reporting workloads.

**Connection Pooling:** PgBouncer in transaction mode handles up to 10,000 client connections multiplexed onto 160 server connections per pool. Three pools are configured:
- **Pool A (WRITE):** Routes all INSERT/UPDATE/DELETE and SELECT FOR UPDATE to primary
- **Pool B (READ):** Routes read-only queries to synchronous replica (lag < 100ms)
- **Pool C (ANALYTICS):** Routes long-running analytics queries to async replica

**Multi-Tenancy:** PostgreSQL Row Level Security (RLS) enforces tenant isolation at the database level across 30+ tenant-scoped tables. The application sets `app.tenant_id` as a session variable before every query:

```sql
SET LOCAL app.tenant_id = 'clx...';
-- RLS policy automatically filters all queries to this tenant
```

**Partitioning Strategy:** Four high-volume tables use monthly RANGE partitioning:

| Table | Estimated Rows/Year | Partitions | Benefit |
|-------|--------------------|------------|---------|
| `WalletTransaction` | 100M+ | 12/month | Query pruning by date, parallel scan |
| `EscrowAuditLog` | 50M+ | 12/month | Easy archival of old records |
| `Notification` | 500M+ | 12/month | Partition pruning for unread queries |
| `PaymentTransaction` | 50M+ | 12/month | Maintenance per-partition (VACUUM/REINDEX) |

**Index Strategy (for 100M users):**

| Index Type | Count | Use Case |
|------------|-------|----------|
| B-tree (default) | 100+ | Primary keys, foreign keys, unique constraints |
| Partial indexes | 25+ | Active/open records only (e.g., escrow WHERE status NOT IN ('completed')) |
| Covering indexes | 18 | Index-only scans for dashboard APIs (INCLUDE columns) |
| BRIN | 4 | Time-series tables (WalletTransaction, EscrowAuditLog) — 99% smaller than B-tree |
| GIN | 11 | Full-text search, JSONB containment queries |
| Composite | 20+ | Multi-column query patterns (business relationships, fraud severity) |

**Type Optimizations (SQLite → PostgreSQL migration):**
- `Float` → `Decimal` (exact precision for financial amounts)
- `String` → `JSONB` (native operations, GIN indexing for metadata)
- `String` enum fields → PostgreSQL native `ENUM` types
- `String` email → `CITEXT` extension (case-insensitive without LOWER())

**Backup & Recovery:**
- Daily base backup at 02:00 UTC via `pg_basebackup`
- Continuous WAL archiving to GCS
- Point-in-Time Recovery: any second within 90-day retention
- RPO: < 1 minute (synchronous replication to Replica B)
- RTO: < 15 minutes (automated PITR from latest backup + WAL)
- Weekly automated restore verification to staging

### 4.3 Redis Architecture

**Deployment:** 3-node Redis Sentinel cluster (Redis 7.2) with automatic failover. Deployed as a StatefulSet in GKE with persistent volumes.

**Key Responsibilities:**
1. **Application Caching:** Dashboard stats (30s TTL), exchange rates (60s TTL), user profiles (5m TTL), payment methods (10m TTL), fraud rules (5m TTL)
2. **Rate Limiting:** Sliding window counters per endpoint category (global 300/min, auth 10/min, payment 30/min)
3. **Session Cache:** Active session state with 30-minute TTL
4. **Pub/Sub Invalidation:** Cache invalidation events broadcast to all Redis instances
5. **Cache Stampede Protection:** Distributed locking via SET NX EX for hot cache keys

**Memory Policy:** `allkeys-lru` eviction — when memory limit is reached, least recently used keys are evicted first. Keyspace notifications enabled (`Ex`) for monitoring expired keys.

### 4.4 Kafka Architecture

**Deployment:** 3-broker cluster deployed as a StatefulSet with ZooKeeper ensemble. All topics configured with replication factor 3 for fault tolerance.

**Topic Distribution:** 38 topics across 8 domains with partition counts tuned per-domain:
- Payment: 5 topics, 6-12 partitions (highest throughput)
- Wallet: 5 topics, 6-12 partitions
- Escrow: 5 topics, 6-8 partitions
- Trust: 4 topics, 6-8 partitions
- Fraud: 4 topics, 6-8 partitions
- Compliance: 5 topics, 6-8 partitions
- Notification: 4 topics, 6 partitions
- Audit: 1 topic, 12 partitions (highest volume)

**Retention Policies:** 7-day (transient events), 30-day (business events), 90-day (compliance/audit events). Size-based retention (1GB) for transient event topics.

**Compaction Strategies:**
- `delete` — Time-based retention only (payment initiated, fraud alerts)
- `compact` — Latest state per key (trust scores, wallet frozen status)
- `delete,compact` — Both time and key-based (payment completed, escrow released)

### 4.5 Data Flow Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────────────────────────────┐
│  Client   │────▶│  Next.js  │────▶│  PostgreSQL Primary (Write)     │
│  Request  │     │  BFF      │     └──────────┬───────────────────────┘
└──────────┘     └─────┬─────┘                │
                       │                      │ WAL Streaming
                       │                      │
                       │              ┌───────▼───────┐
                       │              │ Kafka Producer │
                       │              │ (domain event) │
                       │              └───────┬───────┘
                       │                      │
                       │              ┌───────▼───────────────────────────────────┐
                       │              │              Kafka Cluster                   │
                       │              │  ┌──────────────────────────────────────┐│
                       │              │  │ payment.events.payment_completed       ││
                       │              │  │ wallet.events.wallet_deposited         ││
                       │              │  │ escrow.events.escrow_released          ││
                       │              │  │ trust.events.trust_score_updated      ││
                       │              │  │ fraud.events.fraud_alert_triggered    ││
                       │              │  │ audit.events.audit_action_logged       ││
                       │              │  └──────────────────────────────────────┘│
                       │              └───────┬───────────────────────────────────┘
                       │                      │
                       │         ┌────────────┼────────────┐
                       │         │            │            │
                       │   ┌─────▼─────┐┌────▼─────┐┌────▼─────┐
                       │   │  Wallet    ││  Open-   ││  Notifi-  │
                       │   │  Consumer  ││  Search  ││  cation   │
                       │   │  (credit)  ││  CDC     ││  Consumer │
                       │   └─────┬──────┘└────┬─────┘└────┬─────┘
                       │         │           │            │
                       │         │     ┌─────▼─────┐    │
                       │         │     │ OpenSearch │    │
                       │         │     │ (Read Model)│    │
                       │         │     └───────────┘    │
                       │                          │
                       ▼                          ▼
              ┌────────────────┐        ┌──────────────┐
              │ Redis (L2)     │        │ Email/SMS/   │
              │ Cache Update   │        │ Push Delivery│
              └────────────────┘        └──────────────┘
```

---

## 5. Event-Driven Architecture

### 5.1 Design Principles

Digital Lending OS's event-driven architecture is built on four core principles:

1. **Events as the source of truth:** Every state mutation publishes an immutable event to Kafka. Services read events to build their own materialized views rather than sharing databases.
2. **Loose coupling via topics:** Services communicate exclusively through Kafka topics. No direct service-to-service calls for domain operations. This enables independent deployment, scaling, and schema evolution.
3. **Bounded context isolation:** Each domain owns its topic namespace (`<domain>.events.<event-type>`). Events cross domain boundaries through consumer subscriptions, not direct calls.
4. **Eventual consistency:** The system is designed for eventual consistency. Read models in OpenSearch may lag behind the primary PostgreSQL store by a few seconds. Financial operations (payment, wallet) use synchronous flows within the saga; non-critical updates (trust scores, notifications) are fully asynchronous.

### 5.2 Kafka Topic Taxonomy

**Naming Convention:** `<domain>.events.<event-type>`

```
payment.events.payment_initiated      — New payment started
payment.events.payment_processing     — Provider processing
payment.events.payment_completed      — Payment successful
payment.events.payment_failed         — Payment failed
payment.events.payment_refunded       — Refund issued

wallet.events.wallet_deposited         — Credit to wallet
wallet.events.wallet_withdrawn         — Debit from wallet
wallet.events.wallet_converted         — Currency exchange
wallet.events.wallet_frozen            — Wallet locked
wallet.events.wallet_unfrozen          — Wallet unlocked

escrow.events.escrow_created           — New escrow
escrow.events.escrow_funded             — Funds secured
escrow.events.escrow_released          — Funds released to seller
escrow.events.escrow_disputed          — Buyer dispute
escrow.events.escrow_cancelled         — Escrow cancelled

trust.events.trust_score_updated        — Score recalculated
trust.events.trust_review_submitted     — User review
trust.events.trust_relationship_created — New business relationship
trust.events.trust_verification_completed — Identity verified

fraud.events.fraud_alert_triggered     — Rule matched
fraud.events.fraud_rule_matched        — Specific rule details
fraud.events.fraud_case_opened         — Investigation started
fraud.events.fraud_case_resolved       — Case closed

compliance.events.compliance_screening_requested — AML check
compliance.events.compliance_screening_completed   — Check result
compliance.events.compliance_kyc_submitted        — Documents uploaded
compliance.events.compliance_kyc_verified         — KYC approved
compliance.events.compliance_kyc_rejected         — KYC denied

notification.events.notification_email_sent  — Email delivered
notification.events.notification_push_sent   — Push delivered
notification.events.notification_sms_sent    — SMS delivered
notification.events.notification_in_app       — In-app created

audit.events.audit_action_logged       — Immutable audit trail
```

### 5.3 Saga Pattern for Payments

The payment saga orchestrates a distributed transaction across Payment, Wallet, and Escrow services. It uses a state machine approach with compensating (undo) transactions for failure recovery.

```
                    ┌─────────────┐
                    │    IDLE      │
                    └──────┬──────┘
                           │ Payment initiated by user
                           ▼
                    ┌─────────────┐
            ┌───────│  INITIATED  │
            │       └──────┬──────┘
            │              │ Validate & route to provider
            │              ▼
            │       ┌─────────────┐
            │       │  PROCESSING │──── Provider callback ────┐
            │       └──────┬──────┘                           │
            │              │                                  │
            │     ┌────────┴────────┐                         │
            │     ▼                 ▼                         │
            │  ┌──────────┐   ┌──────────┐                    │
            │  │ DEBITING │   │  FAILED  │                    │
            │  │ WALLET   │   └──────────┘                    │
            │  └────┬─────┘                                   │
            │       │                                         │
            │       ▼                                         │
            │  ┌──────────┐                                   │
            │  │ CREATING │                                   │
            │  │ ESCROW   │                                   │
            │  └────┬─────┘                                   │
            │       │                                         │
            │  ┌────┴────────┐                               │
            │  ▼             ▼                               │
            │ ┌─────────┐ ┌───────────┐                      │
            │ │SENDING  │ │COMPENSAT- │──── Wallet Credit    │
            │ │NOTIFICA-│ │ING_ESCROW │    (undo escrow)     │
            │ │TION     │ └─────┬─────┘                      │
            │ └────┬────┘       ▼                            │
            │      │      ┌──────────┐                       │
            │      │      │COMPENSAT-│──── Wallet Credit    │
            │      │      │ING_WALLET│    (undo debit)      │
            │      │      └─────┬─────┘                      │
            │      │            ▼                            │
            │      │       ┌──────────┐                      │
            │      │       │  FAILED  │◄────────────────────┘
            │      │       └──────────┘   Provider failed
            │      │
            │      ▼
            │ ┌──────────┐
            └─│COMPLETED │
              └──────────┘
```

**Compensating Transactions:**
| Step | Forward Action | Compensating Action | Priority |
|------|----------------|-------------------|----------|
| Wallet Debit | Debit wallet for payment amount | Credit wallet (refund) | Critical |
| Escrow Create | Create escrow holding | Cancel escrow | Critical |
| Notification | Send notification | No-op (non-critical) | Best-effort |

### 5.4 Event Sourcing for Audit

The `audit.events.audit_action_logged` topic serves as an immutable, append-only event log capturing every significant action across the platform. Every domain event is also consumed by the audit service, which creates a canonical audit entry with:

- `eventId` — Unique UUID (prevents duplicate processing)
- `correlationId` — Links all events in a business transaction
- `causationId` — Chain of events (parent → child)
- `actor` — Who performed the action (userId or system)
- `action` — What was done (create, update, delete, status_change)
- `resource` — What was affected (entity type + ID)
- `before/after` — Full state snapshot for compliance
- `ipAddress` — Client IP for forensic analysis
- `timestamp` — UTC ISO 8601

The audit topic has 90-day retention with 12 partitions and EOS Tier 3 (fire-and-forget). Audit entries are also indexed in OpenSearch for fast compliance searches.

### 5.5 CQRS Read Models via OpenSearch

The CQRS (Command Query Responsibility Segregation) pattern separates write operations (PostgreSQL) from read operations (OpenSearch). Write operations produce Kafka events; the OpenSearch CDC consumer projects these events into optimized read models.

**Benefits:**
- Read queries don't impact OLTP performance on PostgreSQL
- OpenSearch supports full-text search, aggregations, and faceted navigation
- Read models can be optimized independently (different indexing, denormalization)
- Eventual consistency is acceptable for search/use-facing queries

**Sync Strategies:**
1. **CDC (primary):** Kafka consumer subscribes to all domain events and translates them into OpenSearch index/delete operations
2. **Single-entity sync:** Used in API routes after CRUD operations for near-real-time updates
3. **Bulk sync:** Cursor-based reindexing for initial setup or full rebuilds

### 5.6 Consumer Group Strategy

**Naming Convention:** `<owning-service>.<domain>.consumer`

| Consumer Group | Subscribed Topics | EOS Tier |
|-----------------|-------------------|----------|
| `wallet-service.payment.consumer` | payment.events.payment_completed, payment_refunded | Tier 1 |
| `escrow-service.payment.consumer` | payment.events.payment_completed | Tier 1 |
| `notification-service.*.consumer` | All *.events.* (fan-out) | Tier 3 |
| `trust-service.escrow.consumer` | escrow.events.escrow_released | Tier 2 |
| `fraud-engine.payment.consumer` | payment.events.payment_initiated, payment_processing | Tier 2 |
| `compliance-service.payment.consumer` | payment.events.payment_initiated | Tier 2 |
| `audit-service.*.consumer` | All *.events.* (append-only log) | Tier 3 |
| `search-service.*.consumer` | All *.events.* (CDC sync) | Tier 2 |

**Assignment:** Cooperative-sticky partition assignment ensures minimal rebalancing disruption. One consumer group per service-domain pair prevents cross-domain coupling. `max.poll.records` is tuned per domain (lower for payment, higher for audit).

---

## 6. Caching Strategy

### 6.1 Three-Tier Cache Hierarchy

Digital Lending OS employs a three-tier cache hierarchy designed to serve the vast majority of requests without hitting the origin database. Each tier has progressively lower latency but higher staleness tolerance.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CACHE ARCHITECTURE                              │
│                                                                          │
│  TIER 1: Cloudflare CDN (Global Edge, 300+ PoPs)                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Latency: < 5ms (cache hit)                                     │    │
│  │  Static assets: 1 year TTL (immutable, content-hashed)          │    │
│  │  Public APIs: 30s-10min TTL with SWR                            │    │
│  │  Cache key: Path + Query + Auth identity                       │    │
│  │  Invalidation: Surrogate keys, URL purge, prefix purge           │    │
│  │  Hit ratio target: > 90%                                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │ MISS                                       │
│                              ▼                                            │
│  TIER 2: Redis (In-Cluster, Sentinel HA)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Latency: < 1ms (cache hit)                                     │    │
│  │  Dashboard stats: 30s TTL + 60s SWR                              │    │
│  │  Exchange rates: 60s TTL + 5min SWR                              │    │
│  │  User profiles: 5min TTL + 10min SWR                             │    │
│  │  Fraud rules: 5min TTL + 10min SWR                               │    │
│  │  Rate limits: 1min sliding window                                │    │
│  │  Invalidation: Pub/Sub, tag-based                                 │    │
│  │  Stampede protection: Distributed lock (SET NX EX)               │    │
│  │  Hit ratio target: > 85%                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │ MISS                                       │
│                              ▼                                            │
│  TIER 3: Origin (Next.js Application → PostgreSQL)                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Latency: 10-100ms (typical)                                     │    │
│  │  Full request processing through Next.js                         │    │
│  │  Read replica routing for SELECT queries                          │    │
│  │  RSC streaming for progressive HTML delivery                      │    │
│  │  Write-through: Response cached in L2 on return                   │    │
│  │  Surrogate-Key header set for L1 cacheability                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Per-Endpoint Caching Strategy

#### L1: Cloudflare CDN Cache Rules

| Resource | Strategy | Edge TTL | Browser TTL | SWR | Cache Key |
|----------|----------|----------|-------------|-----|-----------|
| `/_next/static/*` | Cache-first, immutable | 1 year | 1 year | 1 day | Path only |
| `/public/*.{png,jpg,svg}` | Cache-first | 1 month | 1 month | 1 day | Path only |
| `/api/dashboard/stats` | Stale-while-revalidate | 30s | 0s | 60s | Path + query + auth |
| `/api/currency` | Stale-while-revalidate | 60s | 0s | 120s | Path + query |
| `/api/wallets/rates` | Stale-while-revalidate | 60s | 0s | 120s | Path + query |
| `/api/payment-methods/global` | Stale-while-revalidate | 10 min | 0s | 20 min | Path + query |
| `/api/auth/*` | **Bypass** | — | — | — | — |
| `/api/payments/*` | **Bypass** | — | — | — | — |
| All POST/PUT/DELETE | **Bypass** | — | — | — | — |

#### L2: Redis Cache Rules

| Cache Key Pattern | TTL | SWR Grace | Tags | Notes |
|-------------------|-----|-----------|------|-------|
| `ys:dash:{tenantId}:{role}` | 30s | 60s | `dash:{tenantId}` | Dashboard stats aggregation |
| `ys:fx:*` | 60s | 5 min | `currency` | Exchange rates |
| `ys:pm:{tenantId}:{currency}` | 10 min | 20 min | `pm:{tenantId}` | Payment methods per tenant |
| `ys:u:{userId}` | 5 min | 10 min | `user:{userId}` | User profile |
| `ys:fr:{tenantId}:{type}` | 5 min | 10 min | `fraud:{tenantId}` | Active fraud rules |
| `ys:sess:{userId}:{device}` | 30 min | 0 | `session:{userId}` | Session state |
| `ys:rl:{key}:{window}` | 1 min | 0 | — | Rate limiting counters |
| `ys:lock:{key}` | 5s | 0 | — | Stampede protection lock |

### 6.3 Cache Invalidation Patterns

**Tag-Based Invalidation (L1 — Cloudflare):**
Each cached response includes `Surrogate-Key` headers. The Cloudflare API supports purging by tag:
```bash
# Purge all dashboard stats for a specific tenant
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_tags" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"tags":["dash:t123"]}'
```

**URL-Based Invalidation (L1):**
```bash
# Purge specific API response
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone}/purge_url" \
  -d '{"urls":["https://digital-lending-os.com/api/currency?base=NGN"]}'
```

**Redis Pub/Sub Invalidation (L2):**
When the origin mutates data, invalidation events are published:
```
PUBLISH cache:invalidate:dash {"prefix":"ys:dash:", "tags":["dash:t123"]}
# All Redis instances receive and flush matching keys
```

**Write-Through (L2 → L1):**
API responses include `Surrogate-Key` headers that Cloudflare uses for subsequent tag-based purges. The origin always sets fresh cache values in Redis before returning the response, ensuring subsequent requests hit L2.

### 6.4 Cache Stampede Protection

When a hot cache key expires and multiple requests attempt to populate it simultaneously, stampede protection prevents redundant origin hits:

1. **Distributed Lock:** First request acquires a lock via `SET NX EX 5` on `ys:lock:{key}`
2. **Single Origin Hit:** Only the lock holder queries the origin
3. **Stale Data for Others:** Concurrent requests receive stale data (SWR grace period) or wait for the lock holder
4. **Lock Release:** Lock automatically expires after 5 seconds (failsafe)
5. **Cache Populate:** Lock holder writes fresh data to Redis with full TTL

This pattern ensures that even during cache expiry events, the origin only receives one request per cache key, regardless of concurrent access.

---

## 7. Performance Optimization

### 7.1 React Server Components (RSC) + Streaming SSR

Digital Lending OS's frontend performance strategy is centered on RSC and streaming SSR, which fundamentally changes how the application delivers content to the browser.

**Architecture:**
- `page.tsx` is a 22-line Server Component (was 317-line client monolith)
- All 12 dashboard tabs (2,947 lines total) loaded on-demand via `next/dynamic` with `ssr: false`
- Active tab wrapped in Suspense boundary for streaming SSR
- `DashboardShell.tsx` renders skeleton fallbacks while tabs load

**Impact:**
- Initial JS payload reduced from ~2MB+ to ~50-80KB (shell + active tab only)
- Heavy dependencies (recharts, framer-motion, lodash) only loaded when their tab is active
- Server-rendered HTML streams progressively — user sees content before all JS loads
- Time to First Byte (TTFB) under 200ms for cached pages

```typescript
// Example: Lazy-loaded tab with skeleton fallback
const EscrowTab = dynamic(() => import('./tabs/EscrowTab'), {
  loading: () => <EscrowSkeleton />,
  ssr: false,
});
```

### 7.2 Bundle Optimization Targets

**Bundle Budgets:**

| Chunk Category | Max Size (gzipped) | Strategy |
|----------------|-------------------|----------|
| Initial HTML (RSC) | < 50KB | Server-rendered, no JS required |
| First Load JS (shared) | < 100KB | Core framework + router |
| Per-Tab JS | < 80KB | Code-split via next/dynamic |
| Total page JS (worst case) | < 200KB | With lazy loading, rarely hit |

**Optimization Techniques:**
1. **Code Splitting:** Each dashboard tab is a separate chunk loaded on-demand
2. **Tree Shaking:** ES modules + Next.js automatic tree shaking eliminates unused exports
3. **Dynamic Imports:** Heavy libraries (recharts, framer-motion) only imported in their tab
4. **Image Optimization:** Next.js Image component with automatic WebP/AVIF conversion
5. **Font Optimization:** `next/font` with font-display: swap, preloaded

### 7.3 CDN and Edge Optimization

1. **Immutable Static Assets:** `/_next/static/*` uses content-hash filenames with 1-year cache. Cache-busting handled by build-time hash changes.
2. **Preconnect/Preload:** Critical origins (API endpoints, fonts) use `<link rel="preconnect">` to eliminate connection setup latency.
3. **HTTP/2 + HTTP/3:** Cloudflare automatically multiplexes requests over HTTP/2. HTTP/3 (QUIC) available on modern browsers for faster connection establishment.
4. **Brotli Compression:** Cloudflare serves Brotli-compressed responses (better than gzip) for supported clients.
5. **Early Hints:** Cloudflare can send 103 Early Hints for critical resources while the origin prepares the response.

### 7.4 Connection Pooling and Query Optimization

**PostgreSQL via PgBouncer:**
- Transaction mode: Server connections held only during transaction (~5-50ms)
- Pool size: `(core_count * 2) + spindle_count = 160` for a 64-core machine
- Max client connections: 10,000 (from all Next.js pods)
- Prisma connection_limit: 1 per pod (PgBouncer handles multiplexing)

**Query Optimization:**
1. **Read Replica Routing:** All `SELECT` queries (within explicit read transactions) route to synchronous replica
2. **Partial Indexes:** Dashboard queries only scan active/non-terminal records
3. **Covering Indexes:** Index-only scans return data without hitting the heap (INCLUDE columns)
4. **Partition Pruning:** Monthly partitions ensure queries only scan relevant months
5. **BRIN Indexes:** Time-series tables use block-range indexes (99% smaller than B-tree)
6. **Query Plan Caching:** Prisma caches prepared statements; PostgreSQL uses plan cache for repeated queries
7. **Slow Query Logging:** `log_min_duration_statement = 500ms` captures queries exceeding 500ms for optimization

**Redis Optimization:**
- Pipeline multiple commands to reduce round trips
- Connection pooling with `ioredis` (cluster mode with Sentinel)
- Lua scripting for atomic multi-key operations (rate limiting, stampede protection)

---

## 8. Security Architecture

### 8.1 Security Overview

Digital Lending OS handles financial transactions and sensitive user data, requiring a comprehensive defense-in-depth security model. The security architecture implements controls at every layer: edge, application, data, and infrastructure.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                    │
│                                                                          │
│  Layer 1: Edge (Cloudflare)                                              │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  • WAF (OWASP Top 10 rules, SQL injection, XSS)                │     │
│  │  • DDoS protection (automatic mitigation)                       │     │
│  │  • Bot protection (User-Agent filtering, managed challenge)      │     │
│  │  • Geo-blocking (configurable country blacklist)               │     │
│  │  • Rate limiting (sliding window, per-category)                 │     │
│  │  • JWT edge validation (RS256, fail-open)                       │     │
│  │  • Security headers (CSP, HSTS, X-Frame-Options)                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Layer 2: Application (Next.js)                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  • NextAuth.js session management (httpOnly cookies)            │     │
│  │  • RBAC (admin, buyer, seller, auditor, viewer roles)           │     │
│  │  • CSRF protection (double-submit cookie)                        │     │
│  │  • Input validation (Zod schemas on all API routes)             │     │
│  │  • SQL injection prevention (Prisma parameterized queries)      │     │
│  │  • XSS prevention (RSC auto-escape, no dangerouslySetInnerHTML) │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Layer 3: Data (PostgreSQL + Redis)                                    │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  • Row Level Security (30+ tables, tenant isolation)          │     │
│  │  • Encryption at rest (AES-256-GCM, GCE-managed keys)          │     │
│  │  • Encryption in transit (TLS 1.2+, mTLS for service mesh)    │     │
│  │  • PCI DSS compliance (cardholder data never stored)          │     │
│  │  • Audit trail (immutable event log, 90-day retention)        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Layer 4: Infrastructure (Kubernetes)                                   │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  • Network Policies (default deny-all, specific allow rules)    │     │
│  │  • Pod Security (runAsNonRoot, readOnlyRootFS, drop ALL caps) │     │
│  │  • Secrets management (GCP Secret Manager, K8s Secrets)        │     │
│  │  • Service account (least privilege, no automountToken)        │     │
│  │  • Private GKE cluster (no public endpoints)                  │     │
│  │  • Workload Identity (GKE → GCP IAM, no key files)             │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Authentication

**JWT + Session Architecture:**
- NextAuth.js v5 manages authentication with credentials provider
- JWTs signed with RS256 (RSA-SHA256) — public key distributed to Cloudflare Edge for validation
- Short-lived access tokens (15-minute expiry) with refresh token rotation
- Session stored in httpOnly, Secure, SameSite=Strict cookies
- JWT payload includes: `sub` (userId), `email`, `role`, `tenantId`, `exp`, `iat`

**Edge Validation (Cloudflare Worker):**
- RSA signature verification using Web Crypto API (`crypto.subtle.verify`)
- Expiration (`exp`) and not-before (`nbf`) checks
- **Fail-open design:** If edge validation encounters an error, request passes to origin for reliability
- Public endpoints (login, signup, health) bypass JWT validation

**Password Security:**
- bcrypt hashing with cost factor 12 (~250ms per hash)
- Account lockout after 5 failed attempts (10-minute cooldown via Redis)
- Password policy enforcement (minimum 12 characters, mixed case, numbers)

### 8.3 Authorization

**Role-Based Access Control (RBAC):**
Five roles defined at the PostgreSQL ENUM level:
- `admin` — Full platform access, tenant management
- `buyer` — Create escrow, initiate payments, manage own profile
- `seller` — Accept escrow, receive payments, manage own business
- `auditor` — Read-only access to audit logs and compliance reports
- `viewer` — Read-only dashboard access

**Row Level Security (RLS):**
Every tenant-scoped table enforces RLS via PostgreSQL policies:
```sql
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Account"
  USING (tenant_id = current_setting('app.tenant_id', true));
```
The application sets `app.tenant_id` at connection/session level before every query. RLS is enforced at the database engine level — even if application code has a bug, cross-tenant data leakage is impossible.

### 8.4 Encryption

**At Rest:**
- PostgreSQL: AES-256-GCM encryption via GCE-managed encryption keys (CMEK)
- Redis: In-transit encryption only (data classified as cacheable/non-sensitive)
- GCS backups: Server-side encryption with Google-managed keys
- K8s Secrets: etcd encryption enabled (AES-CBC)

**In Transit:**
- TLS 1.2+ minimum (TLS 1.3 preferred)
- Cloudflare → Origin: TLS with Cloudflare origin certificates
- Internal service communication: mTLS via Istio service mesh (future)
- Database connections: SSL mode `require` with certificate verification

### 8.5 PCI DSS Compliance

Digital Lending OS does not store cardholder data — all payment processing is delegated to PCI-compliant providers (Stripe, Paystack, Flutterwave, IntaSend, Paya). However, the platform implements PCI DSS best practices:
- No storage of full card numbers, CVV, or expiration dates
- Payment provider tokens used for reference (not raw card data)
- All payment pages served over HTTPS with strict CSP
- Access to payment-related audit logs restricted to admin and auditor roles
- Quarterly access reviews for payment system components

### 8.6 Idempotent Payments

Every payment intent includes a unique `idempotencyKey` (UUID v4). The payment service checks for existing intents with the same key before creating a new one:
- **Duplicate request:** Returns existing payment state (no new charge)
- **Network retry:** Provider SDKs use provider-level idempotency keys
- **Kafka producer:** Idempotent producer (`enable.idempotence=true`) prevents duplicate events on retry
- **Saga orchestrator:** Deduplication by `eventId` + `correlationId`

### 8.7 Rate Limiting

Multi-layer rate limiting enforced at edge (Cloudflare KV) and application (Redis):

| Category | Max Requests | Window | Enforcement Layer |
|----------|-------------|--------|-------------------|
| Global | 300/min | 60s | Cloudflare KV (sliding window) |
| Auth | 10/min | 60s | Cloudflare + Redis |
| API | 100/min | 60s | Redis (per-user, per-tenant) |
| Payment | 30/min | 60s | Redis (per-user) |
| Webhook | 1000/min | 60s | Cloudflare (per-provider) |
| Static | 600/min | 60s | Cloudflare |

Rate limit headers are included in every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 8.8 Security Headers

Enforced at both Cloudflare Edge and Next.js middleware:
- `Content-Security-Policy`: Strict CSP with nonce support, inline scripts disabled, allowlisted connections (Stripe, Paystack, Flutterwave, IntaSend, Paya)
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options`: DENY (prevents clickjacking)
- `X-Content-Type-Options`: nosniff
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: Restricts browser features (camera, microphone, geolocation)

CSP violations reported to `/api/security/csp-report` for monitoring.

---

## 9. Observability

### 9.1 OpenTelemetry Architecture

Digital Lending OS uses OpenTelemetry as the unified observability framework, collecting traces, metrics, and logs through a single pipeline.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPENTELEMETRY PIPELINE                                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                                 │   │
│  │  Next.js pods → OTLP Exporter (traces + metrics + logs)              │   │
│  │  Kafka consumers → OTLP Exporter (consumer lag, processing time)     │   │
│  │  Host metrics collector → CPU, memory, disk, network, load           │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │ OTLP gRPC (:4317) / HTTP (:4318)        │
│                                  ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    OTel Collector                                     │   │
│  │                                                                       │   │
│  │  Receivers:  OTLP (gRPC+HTTP), Prometheus (self-scrape), HostMetrics │   │
│  │  Processors:  memory_limiter (64Mi), batch (1024), filter (health),  │   │
│  │               transform (deployment attributes)                       │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │ Traces Pipeline:  OTLP → memory_limiter → filter → batch     │     │   │
│  │  │                   → transform → Tempo                         │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │ Metrics Pipeline: OTLP + Prometheus + HostMetrics            │     │   │
│  │  │                   → memory_limiter → transform → batch       │     │   │
│  │  │                   → Prometheus exporter (:8888)              │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │ Logs Pipeline:    OTLP → memory_limiter → filter → batch     │     │   │
│  │  │                   → Loki                                    │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                         │
│              ┌───────────────────┼───────────────────┐                     │
│              ▼                   ▼                   ▼                     │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│     │    Tempo     │    │  Prometheus  │    │     Loki     │               │
│     │  (Traces)    │    │  (Metrics)   │    │   (Logs)    │               │
│     └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│            │                   │                   │                       │
│            └───────────────────┼───────────────────┘                       │
│                                ▼                                           │
│                   ┌─────────────────────┐                                  │
│                   │       Grafana        │                                  │
│                   │  Unified Dashboard  │                                  │
│                   └─────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Grafana Dashboards

Two primary dashboards are deployed:

**Digital Lending OS Platform Overview** (`digital-lending-os-overview.json`):
- Request rate (req/s by method + status)
- Error rate (4xx/5xx percentage with thresholds)
- Latency (p50/p95/p99 percentiles)
- Payment volume (by provider, stacked bar chart)
- Active sessions (stat panel)
- Cache hit ratio (gauge, by cache type)
- Kafka consumer lag (timeseries with thresholds)
- CPU and memory usage
- Fraud alerts (by severity)
- Request volume by route (top 10)

**Payments Overview** (`payments-overview.json`):
- Payment success/failure rates by provider
- Payment volume trends
- Average processing time
- Provider-specific error analysis

### 9.3 Alerting Rules

Alerts are defined in Prometheus alerting rules and routed by Alertmanager:

| Alert | Severity | Threshold | Notification |
|-------|----------|-----------|-------------|
| `HighPaymentErrorRate` | Critical | > 5% error rate for 3min | PagerDuty + Slack |
| `HighPaymentErrorRateByProvider` | Warning | > 10% error rate for 2min | Slack |
| `PaymentProcessingStalled` | Warning | Pending count increasing for 10min | Slack |
| `HighAPILatencyP99` | Warning | p99 > 2s for 5min | Slack |
| `HighAPILatencyP95` | Warning | p95 > 1s for 10min | Slack |
| `HighErrorRate` | Warning | 5xx > 1% for 3min | Slack |
| `HighKafkaConsumerLag` | Critical | Lag > 10,000 for 5min | PagerDuty + Slack |
| `KafkaConsumerLagWarning` | Warning | Lag > 5,000 for 10min | Slack |
| `LowCacheHitRatio` | Warning | Hit ratio < 80% for 10min | Slack |
| `HighPodRestartCount` | Critical | > 3 restarts in 10min | PagerDuty + Slack |
| `PodCrashLooping` | Critical | CrashLoopBackOff for 5min | PagerDuty + Slack |
| `FraudAlertSpike` | Critical | > 10 alerts in 5min | PagerDuty + Slack |
| `FraudAlertTrend` | Warning | Alerts doubling hour-over-hour | Slack |
| `HighMemoryUsage` | Warning | > 90% of limit for 5min | Slack |
| `HighCPUUsage` | Warning | > 80% for 10min | Slack |

**Alert Routing:**
- Critical payment alerts → PagerDuty (15s group_wait) + Slack #alerts-payments
- Critical fraud alerts → PagerDuty (0s group_wait, immediate) + Slack
- Critical infrastructure → PagerDuty + Slack #alerts-critical
- Warning performance → Slack #alerts-performance
- Warning infrastructure → Slack #alerts-infra

**Inhibition Rules:**
- If `HighPaymentErrorRate` is critical, suppress per-provider alerts
- If pod is in CrashLoopBackOff, suppress restart count alerts

### 9.4 SLO/SLI Definitions

**Service Level Objectives (SLOs):**

| SLI | SLO | Error Budget (30d) | Measurement |
|-----|-----|-------------------|-------------|
| API availability | 99.99% | 4.32 min | Successful requests / total requests |
| API p95 latency | < 100ms for 99.9% | 43.2 min | Histogram quantile |
| Payment success rate | 99.5% | 21.6 min | Completed / initiated |
| Kafka consumer lag | < 1,000 for 99% | 43.2 min | Lag per consumer group |
| Cache hit ratio (L1) | > 90% for 95% | 36 min | CDN cache status |
| RPO | < 1 minute | N/A (data) | Time between last backup and failure |
| RTO | < 15 minutes | 52.56 min/year | Time to restore service |

**Error Budget Policy:**
- > 50% budget consumed: Pause feature deployments, focus on reliability
- > 75% budget consumed: All-hands on reliability, code freeze
- > 100% budget consumed: Incident postmortem, reliability sprint

---

## 10. Infrastructure

### 10.1 Kubernetes Architecture (GKE)

**Cluster Configuration:**
- **Provider:** Google Kubernetes Engine (GKE) on GCP
- **Version:** Latest stable via REGULAR release channel
- **Type:** Private cluster (no public endpoints, private nodes)
- **Networking:** VPC with custom subnets, separate pod/service CIDR ranges
- **Node Pools:** 3 dedicated pools with autoscaling

| Node Pool | Machine Type | Min | Max | Disk | Purpose |
|-----------|-------------|-----|-----|------|---------|
| `frontend` | e2-highcpu-4 (spot) | 3 | 100 | 50GB pd-standard | Next.js pods |
| `backend` | e2-highmem-4 | 3 | 50 | 100GB pd-ssd | Microservices (future) |
| `data` | n2-highmem-8 | 3 | 20 | 500GB pd-ssd | PostgreSQL, Kafka, Redis |

**Workload Placement:**
- Data-layer workloads (PostgreSQL, Kafka, Redis) scheduled on `data` node pool via taint toleration (`node-role=data:NoSchedule`)
- Next.js pods scheduled on `frontend` pool (spot instances for cost optimization)
- Topology spread constraints ensure pods are distributed across zones and hosts

**Next.js Deployment:**
- 3 replicas minimum (rolling update strategy: maxSurge=1, maxUnavailable=0)
- Init container runs `prisma migrate deploy` before application starts
- Resource requests: 256Mi/250m CPU; limits: 512Mi/500m CPU
- Liveness probe: `/api/health` (15s period, 3 failure threshold)
- Readiness probe: `/api/ready` (10s period, 3 failure threshold)
- Startup probe: `/api/health` (5s period, 12 failure threshold = 60s max startup)
- `NODE_OPTIONS: --max-old-space-size=384` for memory stability
- `/tmp` (100Mi) and `.next/cache` (256Mi) as `emptyDir` volumes
- Security context: runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities

### 10.2 Terraform Infrastructure as Code

All infrastructure is defined in Terraform for reproducible, auditable deployments.

**GCP Resources Provisioned:**
- VPC network with custom subnets (no auto-create subnetworks)
- Secondary IP ranges for GKE pods and services
- GKE private cluster with 3 node pools
- Cloud SQL for PostgreSQL 16 (REGIONAL HA, PITR enabled, private IP only)
- Memorystore for Redis 7.2 (STANDARD_HA, cross-region failover)
- Global static IP for ingress
- SSL policy (MODERN profile, TLS 1.2+ minimum)
- Service accounts with least-privilege IAM bindings

**Key Configuration:**
- Cloud SQL: `db-custom-4-16384` (4 vCPU, 16GB RAM), PD_SSD 100GB, 30-day backup retention, pgaudit logging enabled
- Redis: STANDARD_HA tier, `allkeys-lru` eviction, keyspace notifications enabled, RDB persistence every 24h
- GKE: Workload Identity enabled (no key files), network policy enabled, private endpoint disabled (Cloudflare as entry point)

### 10.3 Network Policies

Kubernetes network policies enforce zero-trust networking within the cluster. Default deny-all with specific allow rules:

| Policy | Direction | Source → Destination | Port |
|--------|-----------|---------------------|------|
| `default-deny-all` | All | All pods | All |
| `allow-nextjs-ingress` | Ingress | Ingress controller → Next.js | 3000 |
| `allow-nextjs-to-postgresql` | Ingress | Next.js → PostgreSQL | 5432 |
| `allow-nextjs-to-redis` | Ingress | Next.js → Redis | 6379 |
| `allow-nextjs-to-kafka` | Ingress | Next.js → Kafka | 9092 |
| `allow-kafka-to-zookeeper` | Ingress | Kafka → Zookeeper | 2181 |
| `allow-redis-internal` | Both | Redis pods → Redis pods | 6379, 26379 |
| `allow-postgresql-internal` | Both | PostgreSQL pods → PostgreSQL pods | 5432, 8008 |
| `allow-kafka-internal` | Both | Kafka pods → Kafka/Zookeeper | 9092, 9093, 2181 |
| `allow-dns-egress` | Egress | All pods → kube-dns | 53 (UDP+TCP) |

### 10.4 CI/CD Pipeline

```
┌───────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────────┐
│  Git Push  │───▶│  GitHub    │───▶│  Build &     │───▶│  Deploy to   │
│  (main)    │    │  Actions   │    │  Test        │    │  Staging     │
└───────────┘    └────────────┘    │              │    └──────┬───────┘
                                  │  • Lint       │           │
                                  │  • TypeCheck  │           │
                                  │  • Unit Tests │           │
                                  │  • Build      │           │
                                  │  • Docker     │           │
                                  │    Build      │           │
                                  └──────────────┘           │
                                                             ▼
                                                  ┌──────────────────┐
                                                  │  Integration     │
                                                  │  Tests (Staging) │
                                                  └────────┬─────────┘
                                                           │ PASS
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Production      │
                                                  │  Deployment      │
                                                  │  (Blue-Green)    │
                                                  └──────────────────┘
```

**Deployment Strategy:** Rolling update with maxSurge=1, maxUnavailable=0 ensures zero-downtime deployments. The Prisma migrate init container runs schema migrations before the new pod starts receiving traffic.

### 10.5 Disaster Recovery

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Single pod failure | 0s (automatic) | 0s | K8s auto-heals via replica set; HPA scales replacement |
| Node pool failure | < 2min | 0s | MIG auto-heals; pods rescheduled to healthy nodes |
| PostgreSQL primary failure | < 30s | < 1min | Patroni automatic failover to sync replica |
| Redis primary failure | < 10s | < 1s | Sentinel automatic failover to replica |
| Kafka broker failure | 0s (automatic) | 0s | Replication factor 3 ensures no data loss |
| Cloudflare outage | < 5min | 0s | DNS failover to direct GKE ingress (manual) |
| Full cluster failure | < 15min | < 1min | Restore from PITR backup in new cluster |
| Region failure | < 1 hour | < 5min | Cross-region DR cluster (future, warm standby) |

### 10.6 Cost Optimization

**Compute:**
- Spot instances for frontend node pool (up to 90% savings vs on-demand)
- Autoscaling (min 3, max 100) ensures no over-provisioning
- Right-sizing: e2-highcpu-4 for Next.js (CPU-bound), e2-highmem-4 for backend (memory-bound)

**Database:**
- PgBouncer reduces PostgreSQL connection overhead (160 server connections serve 10,000 clients)
- Read replica offloading reduces primary load by ~60%
- Monthly partition archival detaches old data to cold storage (lower storage costs)

**Caching:**
- 3-tier cache hierarchy: ~95% of reads served from cache, reducing database load
- Redis allkeys-lru eviction prevents unbounded memory growth

**Networking:**
- Private GKE cluster with Cloudflare as entry point eliminates NAT gateway costs
- Internal traffic uses pod-to-pod communication (no external egress charges)

---

## 11. Scaling Roadmap

### 11.1 Phase 1: 1M Users (Current)

**Infrastructure:**
- 3 Next.js pods (e2-highcpu-4 spot, 3-node frontend pool)
- 3 backend pods (e2-highmem-4, 3-node backend pool)
- PostgreSQL: db-custom-4-16384 (4 vCPU, 16GB RAM) with 2 read replicas
- Redis: STANDARD_HA 4GB with Sentinel
- Kafka: 3-broker cluster, 38 topics
- OpenSearch: 5-node cluster (3 data + 2 master)
- Cloudflare: Free/Pro plan (300+ PoPs, basic WAF)

**Architecture:**
- Monolithic Next.js BFF (all API routes + RSC rendering)
- Kafka event backbone for async operations
- PostgreSQL with monthly partitioning (12 partitions per table)
- 3-tier cache hierarchy (Cloudflare CDN + Redis + application)

**Traffic Handling:**
- ~1,000 RPS peak
- ~100K daily active users
- ~500K daily events in Kafka
- ~50GB PostgreSQL storage
- ~10GB Redis usage

**Cost Estimate:** ~$2,000-3,000/month

---

### 11.2 Phase 2: 10M Users

**Infrastructure Changes:**
- Scale Next.js pods to 10-30 (HPA: CPU 50-80% target)
- Add 3-node backend pool for extracted services
- PostgreSQL upgrade to db-custom-8-32768 (8 vCPU, 32GB RAM) + 3 read replicas
- Redis upgrade to STANDARD_HA 16GB
- Kafka: increase partition counts (double for payment/wallet topics)
- OpenSearch: increase shards to 5 primary + 2 replica
- Cloudflare: Business plan (advanced WAF, analytics)

**Architecture Changes:**
- Extract Payment Service (highest traffic, most independent)
- Extract Wallet Service (second highest traffic)
- Payment and Wallet services run as independent pods, consume Kafka
- Next.js BFF becomes thin proxy for payment/wallet API calls
- PgBouncer pool sizes doubled (320 connections)
- Introduce PgBouncer Pool D for extracted service connections

**Traffic Handling:**
- ~10,000 RPS peak
- ~1M daily active users
- ~5M daily events in Kafka
- ~500GB PostgreSQL storage (with partitioning)
- ~50GB Redis usage

**Cost Estimate:** ~$10,000-15,000/month

---

### 11.3 Phase 3: 100M Users

**Infrastructure Changes:**
- Scale Next.js pods to 100+ (HPA across 3 zones)
- Backend node pool: 50+ pods for microservices
- PostgreSQL: Multi-region deployment (primary + 5 read replicas across 2 regions)
  - Region A: Primary + 2 sync replicas
  - Region B: 3 async replicas (read-only, geo-routed)
- Redis: Cluster mode (6-node cluster, 3 masters + 3 replicas) across 2 regions
- Kafka: 9-broker cluster (3 per zone), increase partitions to 48+ for payment topics
- OpenSearch: 15-node cluster (hot-warm architecture)
  - Hot tier: 9 nodes (3 primary + 1 replica, SSD)
  - Warm tier: 6 nodes (for indices older than 30 days, HDD)
- Cloudflare: Enterprise plan (custom WAF rules, dedicated support)
- CDN: Multi-region asset storage (GCS + Cloudflare)

**Architecture Changes:**
- Full microservice extraction complete (all 11 services independent)
- Service mesh (Istio) for inter-service communication, mTLS, traffic management
- Event sourcing for all financial domains (wallet, escrow, payment)
- CQRS fully implemented: all reads from OpenSearch, all writes to PostgreSQL
- Sharding strategy for PostgreSQL: tenant-based sharding across multiple PostgreSQL clusters
- Kafka Streams for real-time aggregation (payment volume, trust score computation)
- Geographically distributed: reads served from nearest region, writes to primary region

**Performance Optimizations:**
- Edge computing: Cloudflare Workers handle more logic (payment status polling, wallet balance checks)
- Pre-computed aggregates: Materialized views in OpenSearch for dashboard stats
- Batch processing: Non-real-time analytics run on async replica
- Connection optimization: HTTP/2 multiplexing, connection pooling per service

**Traffic Handling:**
- ~100,000 RPS peak
- ~10M daily active users
- ~50M daily events in Kafka
- ~5TB PostgreSQL storage (with partitioning + archival)
- ~500GB Redis usage
- ~2TB OpenSearch storage

**Cost Estimate:** ~$80,000-120,000/month

---

### 11.4 Scaling Decision Matrix

| Resource | 1M Users | 10M Users | 100M Users |
|----------|----------|-----------|------------|
| Next.js Pods | 3-10 | 10-30 | 100+ |
| Backend Pods | 0 (monolith) | 3-10 | 50+ |
| PostgreSQL vCPU | 4 | 8 | 32+ (sharded) |
| PostgreSQL Replicas | 2 | 3 | 5+ (multi-region) |
| Redis Memory | 4GB | 16GB | 128GB+ (cluster) |
| Kafka Brokers | 3 | 3-5 | 9 |
| Kafka Partitions (max) | 12 | 24 | 48+ |
| OpenSearch Nodes | 5 | 8 | 15 (hot-warm) |
| Cloudflare Plan | Pro | Business | Enterprise |
| GKE Node Pools | 3 | 3 | 5+ |
| Regions | 1 | 1 | 2+ |

---

## Appendix A: File Inventory

```
infra/
├── ARCHITECTURE.md                          # This document
├── k8s/
│   ├── namespace.yaml                      # digital-lending-os-prod namespace
│   ├── configmap.yaml                      # Application configuration
│   ├── secret.yaml                         # Sensitive configuration
│   ├── nextjs-deployment.yaml              # Next.js deployment + service account
│   ├── nextjs-service.yaml                  # Next.js ClusterIP service
│   ├── nextjs-hpa.yaml                     # Horizontal Pod Autoscaler
│   ├── postgresql-statefulset.yaml         # PostgreSQL StatefulSet
│   ├── redis-statefulset.yaml              # Redis Sentinel StatefulSet
│   ├── kafka-statefulset.yaml              # Kafka + Zookeeper StatefulSet
│   ├── network-policies.yaml               # Default deny + allow rules
│   └── pdb.yaml                            # Pod Disruption Budgets
├── postgresql/
│   ├── README.md                           # PostgreSQL architecture guide
│   ├── migration-schema.prisma             # PostgreSQL Prisma schema
│   ├── connection-pool.ts                  # PgBouncer pool configuration
│   ├── read-replica-router.ts              # Read/write splitting module
│   └── migrations/
│       ├── V1__initial_postgresql.sql       # Enums, tables, RLS
│       ├── V2__indexes_and_partitions.sql   # Performance indexes + partitioning
│       └── V1_part1..5.sql                 # Migration parts
├── kafka/
│   ├── README.md                           # Event-driven architecture guide
│   ├── topics.ts                           # 38 topic definitions
│   ├── event-schemas.ts                    # Zod schemas for all events
│   ├── consumer-groups.ts                  # Consumer group configurations
│   ├── producer.ts                         # KafkaJS producer wrapper
│   ├── consumer.ts                         # Consumer framework + DLQ
│   └── saga-orchestrator.ts               # Payment saga state machine
├── opensearch/
│   ├── README.md                           # Search service architecture
│   └── index-templates.json                # Index templates with mappings
├── cloudflare/
│   ├── README.md                           # Edge architecture guide
│   ├── worker.ts                           # Edge Worker implementation
│   ├── wrangler.toml                       # Wrangler configuration
│   ├── cache-rules.json                    # Cache rules per path
│   └── page-shield.json                    # CSP + security headers
├── monitoring/
│   ├── otel-collector-config.yaml         # OpenTelemetry collector
│   ├── alertmanager-config.yaml            # Alertmanager routing
│   ├── alertmanager-rules.yaml             # Prometheus alert rules
│   └── grafana-dashboards/
│       ├── digital-lending-os-overview.json         # Platform overview dashboard
│       └── payments-overview.json          # Payments-specific dashboard
└── terraform/
    ├── main.tf                             # GCP resources (VPC, GKE, SQL, Redis)
    ├── variables.tf                        # Input variables
    └── outputs.tf                          # Output values
```

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| BFF | Backend for Frontend — an application layer that serves as the API backend for a specific frontend |
| BRIN | Block Range Index — PostgreSQL index type optimized for physically ordered data |
| CDC | Change Data Capture — pattern for tracking data changes in a database and propagating them |
| CQRS | Command Query Responsibility Segregation — separate read and write models |
| DLQ | Dead Letter Queue — queue for messages that failed processing after all retries |
| EOS | Exactly-Once Semantics — guarantee that each message is processed exactly once |
| GIN | Generalized Inverted Index — PostgreSQL index type for full-text and JSONB |
| HPA | Horizontal Pod Autoscaler — Kubernetes controller that adjusts replica count |
| MIG | Managed Instance Group — GCP auto-healing group of VMs |
| OTel | OpenTelemetry — open-source observability framework |
| PITR | Point-in-Time Recovery — ability to restore database to any moment in time |
| PoP | Point of Presence — physical location where CDN nodes are deployed |
| RBC | Row Level Security — PostgreSQL feature for row-level access control |
| RSC | React Server Components — React components rendered on the server |
| RPO | Recovery Point Objective — maximum acceptable data loss duration |
| RTO | Recovery Time Objective — maximum acceptable downtime duration |
| SLI | Service Level Indicator — quantitative measure of service behavior |
| SLO | Service Level Objective — target value for an SLI over a time window |
| SSR | Server-Side Rendering — generating HTML on the server before sending to client |
| SWR | Stale-While-Revalidate — cache strategy serving stale content while refreshing |

---

*This document is a living artifact. Update it as the architecture evolves through the scaling phases.*
