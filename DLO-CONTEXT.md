# Digital Lending OS — Project Context & Decision Log

> **Last updated:** 2026-09-08
> **Repo:** https://github.com/Roy-Wanyoike/digital-lending-os
> **Stack:** Next.js 16 App Router · Prisma ORM · TypeScript · Tailwind CSS v4 · shadcn/ui · Vitest

## 1. Product Definition

**Name:** Digital Lending OS (DLO)
**Tagline:** Multi-Tenant SaaS Platform for Kenyan Digital Credit Providers (DCPs)
**Domain:** digitallendingos.co.ke
**Logo:** DLO

### Target Market
- **Primary:** Kenyan Digital Credit Providers licensed by the Central Bank of Kenya (CBK)
- **Regulatory:** Must comply with CBK Digital Credit Provider regulations, CRB reporting, AML/CFT
- **Payments:** M-Pesa (Safaricom), Airtel Money, KCB, Equity Bank, Co-op Bank, IntaSend, Paystack, Flutterwave

### Multi-Tenancy
- Each DCP is a tenant with isolated data
- Tenant-scoped via `tenantId` on all models
- Super-admin can manage all tenants; DCP admins manage their own

## 2. Architecture Decisions

### Frontend
- **App Router** with `(auth)` and `(dashboard)` route groups
- **Tab-based dashboard** (not URL-routed tabs) via `DashboardShell.tsx`
- **Lazy-loaded tabs** with `dynamic()` — zero JS cost until tab is clicked
- **Roles:** admin, credit_officer, collections_officer, compliance_officer, underwriter, viewer
- **Dashboard tabs:** overview, borrowers, loans, disbursements, repayments, collections, credit-scoring, fraud, compliance, wallet
- **UI library:** shadcn/ui (Tailwind v4 + Radix primitives)
- **Data fetching:** `useApi<T>(url)` hook with auto-unwrap of `{ data: T }` envelope

### Backend
- **API pattern:** `export async function GET/POST(req)` in `route.ts` files
- **DB access:** `import { db } from '@/lib/db'` (Prisma client alias, NOT `prisma.`)
- **Response helpers:** `ok/error/created/badRequest/notFound/unauthorized/forbidden` from `@/backend/lib/api-response`
- **Route wrappers:** `withApiTelemetry(withErrorHandler(handler), '/route/path')`
- **Auth:** NextAuth v5 with CredentialsProvider, `requireAuth/getApiUser` from `@/lib/auth/api-helpers`
- **Tenant scoping:** All queries filtered by `tenantId` from session JWT
- **Payment providers:** Stripe, Paystack, Flutterwave, IntaSend, Paya — webhook endpoints for each
- **Kenya-specific:** M-Pesa C2B/B2C APIs, Paybill/Till numbers, KES currency as default

### Database
- **Primary:** SQLite (dev) / PostgreSQL (prod) via Prisma
- **Models:** User, Tenant, Business, Wallet, EscrowTransaction, PaymentIntent, FraudAlert, FraudRule, ComplianceRule, ComplianceScreening, Collection, Subscription, Notification, DigitalTwin, TrustScore, TrustReview, TrustRelationship, AuditLog, PassportVerification, PaymentLink, Invoice, Referral, Matching, Role
- **Key constraint:** `token.youngsend` JWT property name is CANNOT be renamed (breaks all sessions)

### Infrastructure
- **Docker:** Dockerfile + docker-compose.yml (app, PostgreSQL, Redis, Kafka, OpenSearch)
- **K8s:** Helm chart at `infra/helm/digital-lending-os/`, k8s manifests, Terraform for GKE
- **Monitoring:** Grafana dashboards, Prometheus alerts, OTEL tracing, Loki logs
- **CI/CD:** GitHub Actions (build, test, Docker push, deploy)

## 3. Rebrand History (2026-09-08)

| Before | After | Scope |
|--------|-------|-------|
| Youngsend | Digital Lending OS | All branding |
| YS | DLO | Logo/initials |
| youngsend.com | digitallendingos.co.ke | Domain |
| buyer/seller/auditor | credit_officer/collections_officer/compliance_officer/underwriter | Roles |
| 13 generic tabs | 10 lending tabs | Navigation |
| Trust Graph, Escrow, Matching, Referral, Passport, Digital Twin, Payment Links | Removed | Tabs |
| — | Borrowers, Loans, Disbursements, Repayments, Credit Scoring | New tabs |

## 4. Current Tab Status

| Tab | Component | Status | API Endpoints |
|-----|-----------|--------|---------------|
| Overview | OverviewTab.tsx | ✅ Working | /api/dashboard/stats, /api/businesses |
| Borrowers | BorrowersTab.tsx | 🔄 Placeholder | /api/businesses (reuse) |
| Loans | LoansTab.tsx | 🔄 Placeholder | /api/escrow/transactions (reuse) |
| Disbursements | DisbursementsTab.tsx | 🔄 Placeholder | /api/payments/intents (reuse) |
| Repayments | RepaymentsTab.tsx | 🔄 Placeholder | /api/wallets/deposit, /api/transactions |
| Collections | CollectionsTab.tsx | ✅ Working | /api/collections |
| Credit Scoring | CreditScoringTab.tsx | 🔄 Placeholder | /api/twin/profiles (reuse) |
| Fraud & Risk | FraudTab.tsx | ✅ Working | /api/fraud/alerts, /api/fraud/rules |
| Compliance | ComplianceTab.tsx | ✅ Working | /api/compliance/rules, /api/compliance/screenings |
| Wallet | WalletTab.tsx | ✅ Working | /api/wallets |

**Legacy tabs still in codebase (not in nav):** TrustGraphTab, EscrowTab, PassportTab, DigitalTwinTab, PaymentLinksTab, ReferralTab, MatchingTab

## 5. Kenya-Specific Features Needed

- [ ] M-Pesa STK Push integration for loan disbursement
- [ ] M-Pesa C2B for repayments (Paybill/Till number)
- [ ] CRB (Credit Reference Bureau) API integration for credit checks
- [ ] CBK DCP license validation on tenant onboarding
- [ ] KES as default currency with proper formatting
- [ ] Kenyan phone number validation (254xxx, +254xxx, 0xxx)
- [ ] ID number validation (Kenyan National ID: 8 digits)
- [ ] KRA PIN validation for business borrowers
- [ ] Loan product types: Personal, Business, Asset Finance, Emergency, Chama
- [ ] Interest rate caps per CBK guidelines
- [ ] Digital credit disclosure requirements (total cost of credit)
- [ ] Cooling-off period enforcement (per CBK regulations)
- [ ] Data privacy per Kenya Data Protection Act 2019

## 6. Known Issues & TODOs

### Backend
- Payment providers config is hardcoded (should be DB-backed per tenant)
- Fraud rules engine exists but needs more Kenya-specific patterns
- Subscription auto-renewal works but needs M-Pesa recurring payment support

### Frontend
- 5 placeholder tabs need real UI implementations
- Legacy tab components still exist in codebase (should be removed or repurposed)
- Dashboard overview KPIs are generic (need lending-specific metrics)
- No borrower onboarding flow UI
- No loan application/approval workflow UI

### Security
- Account lockout implemented (5 failed attempts)
- CSRF protection in place
- Rate limiting on API routes
- Need: Content Security Policy headers, CORS configuration for M-Pesa callbacks

## 7. Git & PR Conventions

- **Branch naming:** `feat/`, `fix/`, `reshape/`, `chore/`
- **PRs:** Must link to GitHub Issues
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `reshape:`)
- **Build gate:** All PRs must pass `next build` + `npm test` (1127 tests)
- **Never push:** .next/, db/, tool-results/, upload/, skills/, .env, worklog.md
