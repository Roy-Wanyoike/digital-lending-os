# Youngsend

> **The Financial Operating System for Global Commerce**

A full-stack, multi-tenant financial platform with AI-powered trust scoring, smart escrow, multi-currency wallets, global payment routing across 20+ countries, fraud detection, compliance engine, and a referral rewards system.

---

## Screenshots

### Login

![Login](screenshots/01-login.png)

Secure credential-based authentication with NextAuth JWT sessions.

### Dashboard Overview

![Overview](screenshots/02-overview.png)

Real-time KPIs: business verification rates, active escrows, payment volume, trust score distribution, and recent transaction feed.

### Multi-Currency Wallets

![Wallet](screenshots/03-wallet.png)

Five wallets (USD, EUR, GBP, KES, NGN) with deposit, withdrawal, currency conversion, and crypto withdrawal. Every operation creates a full audit trail.

### Referral Program — $100 Bonus

![Referral](screenshots/04-referral.png)

Share your unique referral link. When a referred user makes their first deposit, **$100 USD is credited instantly** to your wallet. Track referrals, bonus history, and total earnings in real time.

### Global Payment Routing

![Payments](screenshots/05-payments.png)

Multi-currency payment intents with intelligent provider routing across Stripe, Paystack, IntaSend, Flutterwave, M-Pesa, and Plaid — covering Africa, Asia, Europe, and the Americas.

### AI Smart Escrow

![Escrow](screenshots/06-escrow.png)

Milestone-based escrow transactions with AI risk scoring, automatic disbursement, and dispute management.

### Trust Graph

![Trust Graph](screenshots/07-trust-graph.png)

Network-wide trust scores, business relationships, reputation events, and reviews — building a verifiable trust layer for global trade.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, standalone output) |
| **Language** | TypeScript 5, strict mode |
| **UI** | React 19, shadcn/ui (40+ components), Tailwind CSS 4, Framer Motion |
| **Database** | SQLite via Prisma ORM 6 (35 models, 15 modules) |
| **Auth** | NextAuth v4 — Credentials provider, JWT strategy |
| **Charts** | Recharts 2 |
| **Forms** | React Hook Form 7 + Zod 4 |
| **State** | Zustand 5, TanStack Query 5 |
| **Payments** | Stripe, Paystack, IntaSend, Flutterwave, M-Pesa (STK Push + B2C), Plaid |
| **Workflow** | Temporal SDK (8 activities with fallback) |
| **Realtime** | Socket.IO |
| **Runtime** | Bun |
| **Reverse Proxy** | Caddy |

---

## Features

### Multi-Tenancy & RBAC

Hierarchical multi-tenancy: **Tenant → Business → Account → Wallet**. Five roles (`admin`, `buyer`, `seller`, `auditor`, `viewer`) each see a tailored set of 13 dashboard tabs.

### Dashboard (13 Tabs)

| Tab | Description |
|---|---|
| **Overview** | KPI cards, trust distribution, recent transactions, escrow pipeline |
| **Trust Graph** | Business relationships, trust scores, reputation events, reviews |
| **Escrow** | AI-risk-scored escrow with milestone-based disbursement |
| **Payments** | Multi-currency payment intents with provider routing |
| **Passport** | KYC/AML verification, compliance document tracking |
| **Digital Twin** | AI financial profiles with health scores and predictions |
| **Payment Links** | Shareable payment URLs with multi-provider checkout |
| **Wallet** | Multi-currency wallets: deposit, withdraw, convert, crypto |
| **Referral** | $100 bonus program with link sharing and analytics |
| **Fraud** | AI fraud alerts, rule management, severity scoring |
| **Matching** | AI buyer-supplier discovery |
| **Collections** | Automated payment reminders, aging buckets, AI strategies |
| **Compliance** | Sanctions screening, AML rules, risk assessment |

### Global Payment Coverage

Six payment providers across **20+ countries**:

| Provider | Coverage | Methods |
|---|---|---|
| **Stripe** | US, GB, EU, BR, SG, AU, CA, JP, IN, AE | Card, Apple Pay, Google Pay, Bank Transfer |
| **Paystack** | NG, GH, ZA, KE, UG, TZ | Card, Bank Transfer, Mobile Money, USSD |
| **IntaSend** | KE, TZ, UG | Card, M-Pesa, Bank Transfer, Digital Wallet |
| **Flutterwave** | 17 countries across Africa + US, GB, EU | Card, Mobile Money, USSD, Bank Transfer |
| **M-Pesa** | KE, TZ, UG, DRC, MOZ, GH, CI, CM | STK Push (deposit), B2C (withdrawal) |
| **Plaid** | US, GB, CA, FR, DE, ES, NL, IE + 8 more | Bank Account Link, ACH, SEPA |

### Referral System

- Unique code per user (format: `YSXXXXXX`)
- Shareable link: `{domain}/register?ref=YSXXXXXX`
- **$100 USD** auto-credited to referrer on referee's first deposit
- Idempotent — only once per referee
- Full analytics dashboard with bonus history

### AI Modules

- **Smart Escrow** — Risk-scored transactions with milestone disbursement
- **Financial Digital Twin** — Health profiling, metrics, predictions
- **Fraud Detection** — Rule-based alerts with severity scoring
- **Business Matching** — AI buyer-supplier discovery
- **Collections** — Automated dunning with aging buckets

---

## Database

**35 Prisma models** across 15 modules:

```
Multi-Tenancy          → Tenant, Account
Commerce Passport      → Business, CommercePassport, Verification, ComplianceDocument
Trust Graph            → TrustScore, BusinessRelationship, ReputationEvent, Review
AI Smart Escrow        → EscrowTransaction, EscrowMilestone, Disbursement, Dispute, EscrowAuditLog
Global Payment Router  → PaymentIntent, PaymentTransaction, CurrencyRate, PaymentMethod
Financial Digital Twin → FinancialDigitalTwin, FinancialMetric, FinancialPrediction, FinancialSnapshot
Users & Roles          → User
Payment Links          → PaymentLink, PaymentLinkPayment
Payment Methods        → GlobalPaymentMethod
Multi-Currency Wallet  → Wallet, WalletTransaction, Deposit, Withdrawal, CryptoWithdrawal, CurrencyConversion
AI Fraud Detection     → FraudAlert, FraudRule
Business Matching      → BusinessMatch
AI Collections         → CollectionCase, CollectionReminder
Compliance Engine      → ComplianceRule, ComplianceScreening
Referral System        → ReferralBonus
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main dashboard SPA (13 tabs)
│   ├── pay/[ref]/page.tsx          # Public payment link checkout
│   ├── (auth)/login, register      # Auth pages (register captures ?ref=)
│   ├── (dashboard)/deposits, withdrawals, conversion
│   └── api/                        # 68 API route files
├── components/
│   ├── ui/                         # ~40 shadcn/ui components
│   └── dashboard/                  # 13 tab components + sidebar
└── lib/
    ├── auth.ts, auth/api-helpers   # NextAuth + JWT helpers
    ├── db.ts                       # Prisma client singleton
    ├── dashboard-helpers.tsx       # Navigation config, useApi, shared components
    ├── payment/                    # 6 provider implementations
    └── temporal/                   # Workflows + activities
```

---

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 18+

### Setup

```bash
git clone <repo-url>
cd youngsend
bun install

# Configure environment
cp .env.example .env
# Edit .env (see variables below)

# Initialize database
bun run db:push

# (Optional) Seed demo data
bunx tsx scripts/seed-quick.ts

# Start development server
bun run dev
```

Open **http://localhost:3000**

### Demo Credentials

```
Email:    youngsharktechnologies@gmail.com
Password: Demo1234!
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path (e.g. `file:./db/custom.db`) |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `STRIPE_PUBLIC_KEY` | No | Stripe publishable key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret key |
| `INTASEND_PUBLIC_KEY` | No | IntaSend public key |
| `INTASEND_SECRET_KEY` | No | IntaSend secret key |
| `FLW_PUBLIC_KEY` | No | Flutterwave public key |
| `FLW_SECRET_KEY` | No | Flutterwave secret key |
| `TEMPORAL_ADDRESS` | No | Temporal server (default: `localhost:7233`) |

> Payment keys are optional — the platform works in demo mode without them.

### Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start production server |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Regenerate Prisma client |

---

## Deployment

```bash
bun run build
bun run start
```

Uses Next.js standalone output. A **Caddy** reverse proxy config (`Caddyfile`) is included for port 81 → 3000.

---

## Role-Based Access

| Tab | Admin | Buyer | Seller | Auditor | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trust Graph | ✓ | | ✓ | ✓ | ✓ |
| Escrow | ✓ | | ✓ | | |
| Payments | ✓ | ✓ | | | ✓ |
| Passport | ✓ | | | | |
| Digital Twin | ✓ | | | | |
| Payment Links | ✓ | ✓ | ✓ | | |
| Wallet | ✓ | ✓ | ✓ | | |
| Referral | ✓ | ✓ | ✓ | | |
| Fraud | ✓ | | | ✓ | |
| Matching | ✓ | | | | |
| Collections | ✓ | | | ✓ | |
| Compliance | ✓ | | | ✓ | |

---

## License

Private — All rights reserved.