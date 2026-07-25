# Youngsend — The Financial Operating System for Global Commerce

> A full-stack, multi-tenant financial platform with AI-powered trust scoring, smart escrow, multi-currency wallets, global payment routing, fraud detection, and a referral rewards system.

---

## Architecture Overview

```
Youngsend
├── Multi-Tenancy      — Tenant → Business → Account → Wallet hierarchy
├── Authentication     — NextAuth v4 (Credentials + JWT)
├── Authorization      — 5 RBAC roles: admin, buyer, seller, auditor, viewer
├── Database           — SQLite via Prisma ORM (35 models, 15 modules)
├── Payment Routing    — 6 providers across 20+ countries
├── Workflow Engine    — Temporal (8 activities with fallback)
├── Realtime           — Socket.IO mini-service
└── Frontend           — Next.js 16 + React 19 + shadcn/ui + Framer Motion
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.1 (App Router, standalone output) |
| **Language** | TypeScript 5, strict mode |
| **UI** | React 19, shadcn/ui (40+ components), Tailwind CSS 4, Framer Motion |
| **Database** | SQLite via Prisma ORM 6 |
| **Auth** | NextAuth v4 — Credentials provider, JWT strategy |
| **Charts** | Recharts 2 |
| **Forms** | React Hook Form 7 + Zod 4 |
| **State** | Zustand 5, TanStack Query 5 |
| **Payments** | Stripe, Paystack, IntaSend, Flutterwave, M-Pesa (STK Push + B2C), Plaid |
| **Workflow** | Temporal SDK (workflows, activities, client) |
| **Realtime** | Socket.IO |
| **Runtime** | Bun |
| **Reverse Proxy** | Caddy |
| **i18n** | next-intl |

---

## Features

### 1. Multi-Tenancy & Access Control

- Hierarchical multi-tenancy: **Tenant → Business → Account → Wallet**
- 5 RBAC roles with per-role dashboard tab visibility
- Each API route enforces tenant isolation via `getApiUser()` + `tenantScope()`
- JWT tokens enriched with `accountId`, `tenantId`, `role`, `businessId`

### 2. Dashboard (13 Tabs)

| Tab | Description |
|---|---|
| **Overview** | KPI cards, trust score distribution, recent transactions, escrow pipeline |
| **Trust Graph** | Business relationships, trust scores, reputation events, reviews |
| **Escrow** | AI-risk-scored escrow transactions with milestone-based disbursement |
| **Payments** | Multi-currency payment intents with intelligent provider routing |
| **Passport** | KYC/AML verification management, compliance document tracking |
| **Digital Twin** | AI-generated financial profiles with health scores and predictions |
| **Payment Links** | Shareable payment URLs with multi-provider checkout |
| **Wallet** | Multi-currency wallets (deposit, withdraw, convert, crypto withdrawal) |
| **Referral** | $100 bonus referral program with link sharing and analytics |
| **Fraud** | AI fraud alerts, rule management, severity scoring |
| **Matching** | AI-powered buyer-supplier discovery |
| **Collections** | Automated payment reminders, aging buckets, AI collection strategies |
| **Compliance** | Sanctions screening, AML rules, risk-level assessment |

### 3. Global Payment Router

Six integrated payment providers covering **20+ countries** across Africa, Asia, Europe, and the Americas:

| Provider | Coverage | Methods |
|---|---|---|
| **Stripe** | US, GB, EU, BR, SG, AU, CA, JP, IN, AE | Card, Apple Pay, Google Pay, Bank Transfer |
| **Paystack** | NG, GH, ZA, KE, UG, TZ | Card, Bank Transfer, Mobile Money, USSD |
| **IntaSend** | KE, TZ, UG | Card, M-Pesa, Bank Transfer, Digital Wallet |
| **Flutterwave** | 17 countries across Africa + US, GB, EU | Card, Mobile Money, USSD, Bank Transfer |
| **M-Pesa** | KE, TZ, UG, DRC, MOZ, GH, CI, CM | STK Push (deposit), B2C (withdrawal) |
| **Plaid** | US, GB, CA, FR, DE, ES, NL, IE + 8 more | Bank Account Link, ACH, SEPA |

### 4. Multi-Currency Wallet System

- **Deposits** via any supported payment method (auto-complete in demo mode)
- **Withdrawals** (fiat + crypto with network/address/exchange rate support)
- **Currency Conversion** between 16+ currencies with live rate estimation
- **Referral Bonuses** — $100 USD auto-credited to referrer on referee's first deposit
- All wallet operations create `WalletTransaction` audit trail entries

### 5. AI Smart Escrow

- Milestone-based disbursement (create → fund → release per milestone)
- AI risk scoring on every transaction
- Dispute management with audit logging
- Automatic and manual release workflows

### 6. Referral System

- Unique referral code per user (format: `YSXXXXXX`)
- Shareable link: `{domain}/register?ref=YSXXXXXX`
- **$100 USD bonus** credited to referrer's wallet when referred user makes first deposit
- Bonus is idempotent (only once per referee)
- Full analytics: referral count, total bonuses earned, recent referrals, bonus history
- Referral code capture via URL parameter or manual input on registration

### 7. Commerce Passport & Compliance

- Business identity verification (KYC/AML)
- Compliance document management
- Sanctions screening with risk-level assessment
- Configurable compliance rules engine

### 8. Additional Modules

- **Financial Digital Twin** — AI-powered financial health profiling with metrics, predictions, and snapshots
- **Business Matching** — AI buyer-supplier discovery with match scoring
- **AI Collections** — Automated dunning with aging buckets and AI-recommended strategies
- **Invoicing** — Invoice creation and management
- **Real-time Updates** — Socket.IO service for live dashboard updates

---

## Database Schema

**35 Prisma models** organized across **15 modules**:

```
Module 0:  Multi-Tenancy          → Tenant, Account
Module 1:  Commerce Passport      → Business, CommercePassport, Verification, ComplianceDocument
Module 2:  Trust Graph            → TrustScore, BusinessRelationship, ReputationEvent, Review
Module 3:  AI Smart Escrow        → EscrowTransaction, EscrowMilestone, Disbursement, Dispute, EscrowAuditLog
Module 4:  Global Payment Router  → PaymentIntent, PaymentTransaction, CurrencyRate, PaymentMethod
Module 5:  Financial Digital Twin → FinancialDigitalTwin, FinancialMetric, FinancialPrediction, FinancialSnapshot
Module 6:  Users & Roles          → User
Module 7:  Payment Links          → PaymentLink, PaymentLinkPayment
Module 8:  Payment Methods Catalog→ GlobalPaymentMethod
Module 9:  Multi-Currency Wallet  → Wallet, WalletTransaction, Deposit, Withdrawal, CryptoWithdrawal, CurrencyConversion
Module 10: AI Fraud Detection     → FraudAlert, FraudRule
Module 11: Business Matching      → BusinessMatch
Module 12: AI Collections         → CollectionCase, CollectionReminder
Module 13: Compliance Engine      → ComplianceRule, ComplianceScreening
Module 14: Referral System        → ReferralBonus
```

---

## API Routes

**68 API endpoints** across 15 domains:

| Domain | Endpoints |
|---|---|
| `/api/auth` | NextAuth sign-in/sign-out/session |
| `/api/tenants` | CRUD (registration + admin management) |
| `/api/users` | CRUD |
| `/api/businesses` | CRUD |
| `/api/escrow` | Transactions, milestones, funding, release, disputes |
| `/api/payments` | Initialize, verify, rates, providers, methods, intents, webhooks (4 providers) |
| `/api/wallets` | CRUD, transactions, deposit, withdrawal, crypto-withdrawal, convert, rates |
| `/api/deposits` | List/create deposits |
| `/api/withdrawals` | List/create withdrawals |
| `/api/payment-links` | CRUD, public pay page |
| `/api/payment-methods` | Global catalog |
| `/api/invoices` | CRUD |
| `/api/passport` | Verifications, compliance |
| `/api/trust` | Scores, relationships, reviews |
| `/api/twin/profiles` | CRUD, sync, metrics, predictions, snapshots |
| `/api/fraud` | Alerts, rules |
| `/api/matching` | Business matching |
| `/api/collections` | Cases, reminders |
| `/api/compliance` | Rules, screenings |
| `/api/referral` | Referral info, bonus history |
| `/api/dashboard` | Aggregate stats |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Geist font, Providers)
│   ├── page.tsx                      # Main dashboard SPA (13 tabs)
│   ├── globals.css                   # Tailwind + shadcn/ui CSS variables
│   ├── pay/[ref]/page.tsx            # Public payment link checkout
│   ├── (auth)/
│   │   ├── login/page.tsx            # Sign-in page
│   │   └── register/page.tsx         # Registration (with referral code support)
│   ├── (dashboard)/
│   │   ├── deposits/page.tsx         # Standalone deposit page
│   │   ├── withdrawals/page.tsx      # Standalone withdrawal page
│   │   └── conversion/page.tsx       # Currency conversion page
│   └── api/                          # 68 API route files
│       ├── referral/                 # Referral system
│       ├── wallets/                  # Wallet operations
│       ├── payments/                 # Payment routing + webhooks
│       ├── escrow/                   # Escrow management
│       └── ...                       # (15 API domains total)
├── components/
│   ├── ui/                           # ~40 shadcn/ui components
│   ├── dashboard/                    # 13 tab components + sidebar
│   └── providers.tsx                 # SessionProvider wrapper
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── auth/api-helpers.ts           # getApiUser, requireRole, tenantScope
│   ├── db.ts                         # Prisma client singleton
│   ├── dashboard-helpers.tsx         # Navigation config, useApi hook, shared components
│   ├── payment/                      # Provider registry + 6 provider implementations
│   │   ├── config.ts                 # Provider configuration
│   │   ├── types.ts                  # Payment type definitions
│   │   ├── index.ts                  # Provider registry
│   │   └── providers/                # stripe, paystack, intasend, flutterwave, mpesa, plaid
│   └── temporal/                     # Temporal workflows + activities
prisma/
├── schema.prisma                     # 35 models, 15 modules
└── seed.ts                           # Database seeder
```

---

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 18+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd youngsend

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables below)

# Initialize the database
bun run db:push

# (Optional) Seed the database with demo data
bunx tsx prisma/seed.ts

# Start the development server
bun run dev
```

The app will be available at **http://localhost:3000**.

### Demo Credentials

```
Email:    youngsharktechnologies@gmail.com
Password: Demo1234!
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite database path (e.g., `file:./db/custom.db`) |
| `NEXTAUTH_SECRET` | Yes | Secret for JWT signing (any random string) |
| `STRIPE_PUBLIC_KEY` | No | Stripe publishable key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret key |
| `INTASEND_PUBLIC_KEY` | No | IntaSend public key |
| `INTASEND_SECRET_KEY` | No | IntaSend secret key |
| `FLW_PUBLIC_KEY` | No | Flutterwave public key |
| `FLW_SECRET_KEY` | No | Flutterwave secret key |
| `TEMPORAL_ADDRESS` | No | Temporal server address (default: `localhost:7233`) |

> Payment provider keys are optional — the platform works in demo mode without them.

---

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Production build (Next.js standalone output) |
| `bun run start` | Start production server with Bun |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:reset` | Reset database (destructive) |

---

## Deployment

The project uses Next.js standalone output for optimized production builds.

```bash
# Build for production
bun run build

# Start the production server
bun run start
```

A **Caddy** reverse proxy configuration is included (`Caddyfile`) that proxies port 81 to the Next.js server on port 3000.

---

## Role-Based Access

Each role sees a different set of dashboard tabs:

| Tab | Admin | Buyer | Seller | Auditor | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Overview | Yes | Yes | Yes | Yes | Yes |
| Trust Graph | Yes | | Yes | Yes | Yes |
| Escrow | Yes | | Yes | | |
| Payments | Yes | Yes | | | Yes |
| Passport | Yes | | | | |
| Digital Twin | Yes | | | | |
| Payment Links | Yes | Yes | Yes | | |
| Wallet | Yes | Yes | Yes | | |
| Referral | Yes | Yes | Yes | | |
| Fraud | Yes | | | Yes | |
| Matching | Yes | | | | |
| Collections | Yes | | | Yes | |
| Compliance | Yes | | | Yes | |

---

## License

Private — All rights reserved.
