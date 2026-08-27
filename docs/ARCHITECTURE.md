# Digital Lending OS - Architecture Document

<div align="center">

**Technical Architecture & System Design Documentation**

Version 2.0.0

[System Overview](#system-overview) • [Architecture Layers](#architecture-layers) • [Data Flow](#data-flow) • [Technology Choices](#technology-choices) • [Security](#security) • [Scaling](#scaling-considerations)

</div>

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Layers](#architecture-layers)
4. [Component Architecture](#component-architecture)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Database Architecture](#database-architecture)
7. [Multi-Tenancy Design](#multi-tenancy-design)
8. [Technology Choices](#technology-choices)
9. [Integration Points](#integration-points)
10. [Security Architecture](#security-architecture)
11. [Scaling Considerations](#scaling-considerations)
12. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

Digital Lending OS is a **multi-tenant SaaS platform** built for Kenyan Digital Credit Providers (DCPs). The architecture prioritizes:

- **Data Isolation**: Complete logical separation between tenants
- **Scalability**: Horizontal scaling capability for growth
- **Compliance**: Built-in CBK regulatory support
- **Extensibility**: Plugin-ready integration points
- **Performance**: Optimized for high-volume transactions

### Key Metrics Target

| Metric | Target |
|--------|--------|
| Concurrent Tenants | 500+ |
| Daily Transactions | 1M+ |
| API Response Time (p95) | < 200ms |
| System Availability | 99.9% uptime |
| Data Retention | 7 years (CBK requirement) |

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    Web UI    │  │ Mobile App   │  │   USSD       │  │   Partner    │   │
│  │  (Next.js)   │  │  (React N.)  │  │  Gateway     │  │    APIs      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │           │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────────────────┐
│                           API GATEWAY / EDGE                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Caddy Reverse Proxy                               │  │
│  │         SSL Termination • Rate Limiting • Load Balancing            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼────────────────────────────────┐
│                          APPLICATION LAYER                                 │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js Application Server                     │   │
│  │                                                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │   Pages    │  │   APIs     │  │ Middleware  │  │  Services  │  │   │
│  │  │ (SSR/CSR)  │  │ (Routes)   │  │ (Auth,etc) │  │ (Business) │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└──────────────────────────────────────────┬────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼────────────────────────────────┐
│                             DATA LAYER                                     │
│                                                                            │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌───────────────┐  │
│  │   Primary Database  │    │    Cache Layer      │    │ File Storage  │  │
│  │  (PostgreSQL/SQLite)│    │    (Redis)          │    │   (S3/MinIO)  │  │
│  └─────────────────────┘    └─────────────────────┘    └───────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼────────────────────────────────┐
│                           EXTERNAL SERVICES                                 │
│                                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ M-Pesa   │  │ CRB      │  │ SMS      │  │ Email    │  │ Webhooks │  │
│  │ API      │  │ Bureau   │  │ Gateway  │  │ Service  │  │ (Out)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### Layer 1: Presentation Layer

**Responsibility**: User interface rendering and interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Technology Stack:                                               │
│  ├── Next.js 16 (App Router)                                    │
│  ├── React 19                                                   │
│  ├── TypeScript 5.x                                             │
│  ├── Tailwind CSS 4                                             │
│  ├── shadcn/ui + Radix UI                                       │
│  ├── Recharts (Data Visualization)                              │
│  ├── Framer Motion (Animations)                                 │
│  └── Lucide React (Icons)                                       │
│                                                                  │
│  Key Features:                                                   │
│  ├── Server-Side Rendering (SSR) for SEO & performance          │
│  ├── Client Components for interactivity                        │
│  ├── Responsive design (mobile-first)                           │
│  ├── White-label theming per tenant                             │
│  └── Progressive Web App (PWA) ready                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Hierarchy

```
App Layout
├── Header (Logo, Navigation, User Menu)
├── Sidebar (Navigation Menu)
├── Main Content Area
│   ├── Dashboard Views
│   │   ├── SuperAdminView.tsx
│   │   ├── LenderDashboard.tsx
│   │   └── CustomerPortal.tsx
│   ├── Data Tables
│   │   ├── ApplicationsTable.tsx
│   │   ├── LoansTable.tsx
│   │   └── TenantList.tsx
│   ├── Forms
│   │   ├── ApplicationForm.tsx
│   │   └── LoanCalculator.tsx
│   └── Visualizations
│       ├── KPICards.tsx
│       ├── DashboardCharts.tsx
│       ├── RepaymentSchedule.tsx
│       └── ApplicationStatusTracker.tsx
└── Footer
```

### Layer 2: API Layer

**Responsibility**: Request handling, business logic orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Route Handlers (src/app/api/*):                                 │
│  ├── /api/tenants        → Tenant CRUD operations               │
│  ├── /api/customers      → Customer management                  │
│  ├── /api/applications   → Loan application workflow            │
│  ├── /api/loans          → Loan lifecycle management            │
│  ├── /api/products       → Loan product configuration           │
│  ├── /api/dashboard/stats→ Analytics & reporting                │
│  └── /api/webhooks/*     → External service callbacks           │
│                                                                  │
│  Middleware (Planned):                                            │
│  ├── Authentication (JWT validation)                            │
│  ├── Authorization (Role-based access)                          │
│  ├── Rate Limiting (Per tenant tier)                            │
│  ├── Request Logging                                            │
│  └── Tenant Context Resolution                                  │
│                                                                  │
│  Response Format:                                                │
│  { success: boolean, data?: T, error?: string, pagination? }    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 3: Business Logic Layer

**Responsibility**: Domain rules and workflows

```
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Core Domains:                                                   │
│  ├── Tenant Management                                          │
│  │   ├── Onboarding workflow                                    │
│  │   ├── Plan management                                        │
│  │   └── Branding configuration                                 │
│  │                                                              │
│  ├── Customer Management                                        │
│  │   ├── KYC verification                                       │
│  │   ├── Credit scoring                                         │
│  │   └── Risk assessment                                        │
│  │                                                              │
│  ├── Loan Origination                                           │
│  │   ├── Application processing                                 │
│  │   ├── Approval workflow                                      │
│  │   └── Disbursement execution                                 │
│  │                                                              │
│  ├── Portfolio Management                                       │
│  │   ├── Repayment tracking                                     │
│  │   ├── Arrears management                                     │
│  │   └── Collections                                           │
│  │                                                              │
│  └── Financial Operations                                       │
│      ├── Double-entry accounting                                │
│      ├── Reconciliation                                         │
│      └── Reporting                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 4: Data Access Layer

**Responsibility**: Database operations and caching

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ORM: Prisma 6                                                  │
│  ├── Type-safe queries                                          │
│  ├── Auto-generated client                                      │
│  ├── Migration system                                           │
│  └── Connection pooling                                         │
│                                                                  │
│  Database Client (src/lib/db.ts):                               │
│  └── Singleton pattern for optimal connection reuse             │
│                                                                  │
│  Query Patterns:                                                 │
│  ├── findMany() with filtering/pagination                       │
│  ├── findUnique()/findFirst() with relations                    │
│  ├── create()/update()/delete() with validation                 │
│  ├── aggregate() for analytics                                  │
│  └── $transaction() for atomic operations                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 5: Infrastructure Layer

**Responsibility**: External services and storage

```
┌─────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Databases:                                                      │
│  ├── SQLite (Development)                                       │
│  ├── PostgreSQL (Production)                                    │
│  └── Redis (Caching/Sessions)                                   │
│                                                                  │
│  Storage:                                                        │
│  ├── Local filesystem (dev)                                     │
│  ├── AWS S3 / MinIO (production documents)                      │
│  └── CDN for static assets                                      │
│                                                                  │
│  External Integrations:                                          │
│  ├── Safaricom M-Pesa API                                       │
│  ├── Metropol/TransUnion CRB                                    │
│  ├── SMS Gateway (Africa's Talking, etc.)                       │
│  ├── Email (AWS SES, SendGrid)                                  │
│  └── Webhook consumers/producers                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Core Components Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DIGITAL LENDING OS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SUPER ADMIN MODULE                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Tenant Mgmt  │  │ Platform     │  │ System       │              │   │
│  │  │              │  │ Analytics    │  │ Config       │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        TENANT MODULE (per tenant)                   │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Customer   │  │ Application│  │   Loan     │  │ Collection │   │   │
│  │  │ Management │  │ Processing │  │ Management │  │   Module   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Product    │  │ Reporting  │  │ Notification│  │ User/Role  │   │   │
│  │  │ Configuration│  │ Engine    │  │   System   │  │ Management │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SHARED SERVICES                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Auth/ID    │  │ Audit Log  │  │ File Store │  │ Notification│   │   │
│  │  │ Service    │  │ Service    │  │ Service    │  │ Dispatcher  │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Loan Origination Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Customer│───▶│  Apply  │───▶│ Submit  │───▶│ Review  │───▶│ Approve │
│ Portal  │    │ Form    │    │ App     │    │ Process │    │/Reject  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                            │
                                                    ┌───────▼───────┐
                                                    │   Approved?   │
                                                    └───────┬───────┘
                                                       Yes   │   No
                                                        │     │
                                              ┌─────────┘     └─────────┐
                                              ▼                         ▼
                                       ┌──────────┐             ┌──────────┐
                                       │Disburse  │             │ Notify   │
                                       │  Loan    │             │Customer  │
                                       └────┬─────┘             └──────────┘
                                            │
                                     ┌──────▼──────┐
                                     │ Create Loan │
                                     │ Record      │
                                     └──────┬──────┘
                                            │
                                     ┌──────▼──────┐
                                     │ Send Funds  │
                                     │(M-Pesa/etc) │
                                     └─────────────┘
```

### Repayment Processing Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Payment  │───▶│ Validate │───▶│ Allocate │───▶│ Update   │
│ Received │    │ Payment  │    │ Funds    │    │ Loan     │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                              ┌──────▼──────┐
                                              │Record Txn   │
                                              │(Double-Entry│
                                              │ Accounting) │
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │ Send        │
                                              │ Receipt     │
                                              └─────────────┘
```

### Multi-Tenant Request Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Request │────▶│ Caddy  │────▶│ Next.js│────▶│ Resolve│────▶│ Execute│
│        │     │Gateway │     │Server  │     │Tenant  │     │Query   │
└────────┘     └────────┘     └────────┘     └────────┘     └───┬────┘
                                                                   │
                                                           ┌───────▼───────┐
                                                           │ Add tenantId  │
                                                           │ to WHERE clause│
                                                           └───────┬───────┘
                                                                   │
                                                           ┌───────▼───────┐
                                                           │ Return data    │
                                                           │ (tenant-only)  │
                                                           └───────────────┘
```

---

## Database Architecture

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                                          │
│   │   TENANT    │ 1                                                          │
│   │─────────────│                                                          │
│   │ id          │                                                          │
│   │ name        │                                                          │
│   │ slug (UQ)   │                                                          │
│   │ branding    │                                                          │
│   │ config      │                                                          │
│   │ status      │                                                          │
│   │ plan        │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │ 1                                                                │
│          ├────────────────┬────────────────┬────────────────┬────────────┤
│          ▼                ▼                ▼                ▼            │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │    USER     │  │  CUSTOMER   │  │LOAN_PRODUCT │  │   LOAN      │    │
│   │─────────────│  │─────────────│  │─────────────│  │─────────────│    │
│   │ id          │  │ id          │  │ id          │  │ id          │    │
│   │ tenantId(FK)│  │ tenantId(FK)│  │ tenantId(FK)│  │ tenantId(FK)│    │
│   │ email       │  │ firstName   │  │ name        │  │ customerId  │    │
│   │ role        │  │ lastName    │  │ productCode │  │ loanNumber  │    │
│   └──────┬──────┘  │ phone       │  │ minAmount   │  │ principal   │    │
│          │         │ creditScore │  │ maxAmount   │  │ status      │    │
│          │         └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│          │                │                │                │            │
│          │                │ 1              │ 1              │ 1          │
│          │                ▼                ▼                ▼            │
│          │         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│          │         │ LOAN_APP    │  │ APPLICATION │  │  REPAYMENT  │    │
│          │         │─────────────│  │    (FK)     │  │─────────────│    │
│          │         │ id          │  └─────────────┘  │ loanId(FK)  │    │
│          │         │ customerId  │                   │ amount      │    │
│          │         │ productId   │                   │ status      │    │
│          │         │ status      │                   └──────┬──────┘    │
│          │         └──────┬──────┘                          │            │
│          │                │ 1                               │ 1          │
│          │                ▼                                 ▼            │
│          │         ┌─────────────┐                   ┌─────────────┐    │
│          │         │KYC_DOCUMENT │                   │ TRANSACTION │    │
│          │         │─────────────│                   │─────────────│    │
│          │         │ applicationId│                  │ entityId(FK)│    │
│          │         └─────────────┘                   │ type        │    │
│          │                                           └─────────────┘    │
│          │                                                                │
│          │         ┌─────────────┐  ┌─────────────┐                    │
│          └────────▶│NOTIFICATION │  │ AUDIT_LOG   │◀───────────────────┤
│                    │─────────────│  │─────────────│                    │
│                    │ tenantId(FK)│  │ userId(FK)  │                    │
│                    └─────────────┘  └─────────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Index Strategy

```sql
-- Core indexes for performance
CREATE INDEX idx_tenant_slug ON Tenant(slug);
CREATE INDEX idx_tenant_status ON Tenant(status);

CREATE INDEX idx_customer_tenant_phone ON Customer(tenantId, phone);
CREATE INDEX idx_customer_national_id ON Customer(nationalId);
CREATE INDEX idx_customer_status ON Customer(tenantId, status);

CREATE INDEX idx_loan_tenant_status ON Loan(tenantId, status);
CREATE INDEX idx_loan_customer ON Loan(customerId);
CREATE INDEX idx_loan_number ON Loan(loanNumber);
CREATE INDEX idx_loan_arrears ON Loan(tenantId, daysInArrears) WHERE daysInArrears > 0;

CREATE INDEX idx_application_tenant_status ON LoanApplication(tenantId, status);
CREATE INDEX idx_application_customer ON LoanApplication(customerId);

CREATE INDEX idx_repayment_loan ON Repayment(loanId);
CREATE INDEX idx_repayment_date ON Repayment(paymentDate);
CREATE INDEX idx_transaction_entity ON Transaction(entityType, entityId);
CREATE INDEX idx_transaction_date ON Transaction(occurredAt);
```

---

## Multi-Tenancy Design

### Isolation Model: Logical Separation

Digital Lending OS uses **shared database, shared schema** with **logical row-level isolation**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Single Instance)                    │
│                                                                  │
│  Table: customers                                                │
│  ┌────┬─────────┬──────────┬─────────────┬──────────┐          │
│  │ id │ tenantId│ firstName│ lastName    │ phone    │          │
│  ├────┼─────────┼──────────┼─────────────┼──────────┤          │
│  │  1 │ t_abc   │ John     │ Doe         │0712...   │ ← ABC DCP│
│  │  2 │ t_abc   │ Jane     │ Smith       │0734...   │ ← ABC DCP│
│  │  3 │ t_xyz   │ Ali      │ Mohammed    │0756...   │ ← XYZ DCP│
│  │  4 │ t_xyz   │ Fatuma   │ Hassan      │0778...   │ ← XYZ DCP│
│  └────┴─────────┴──────────┴─────────────┴──────────┘          │
│                                                                  │
│  Query: SELECT * FROM customers WHERE tenantId = 't_abc'        │
│  Result: Only rows 1, 2 (ABC DCP's customers only)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Context Resolution

```typescript
// Middleware pattern for tenant resolution
interface TenantContext {
  tenant: Tenant
  requestId: string
  timestamp: Date
}

async function resolveTenantContext(request: Request): Promise<TenantContext> {
  // Method 1: From subdomain
  const host = request.headers.get('host')
  const subdomain = host?.split('.')[0]
  
  // Method 2: From header
  const headerTenant = request.headers.get('X-Tenant-ID')
  
  // Method 3: From query parameter (API only)
  const url = new URL(request.url)
  const queryTenant = url.searchParams.get('tenantId')
  
  const slugOrId = subdomain || headerTenant || queryTenant
  
  if (!slugOrId) {
    throw new Error('Tenant context required')
  }
  
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [
        { id: slugOrId },
        { slug: slugOrId }
      ],
      status: 'ACTIVE'
    }
  })
  
  if (!tenant) {
    throw new Error('Tenant not found or inactive')
  }
  
  return {
    tenant,
    requestId: crypto.randomUUID(),
    timestamp: new Date()
  }
}
```

### Data Isolation Enforcement

```typescript
// Repository pattern ensuring isolation
class TenantAwareRepository<T> {
  constructor(
    private model: { findMany: Function; count: Function },
    private getTenantId: () => string
  ) {}
  
  async findAll(filters?: FilterOptions): Promise<PaginatedResult<T>> {
    const tenantId = this.getTenantId()
    
    return this.model.findMany({
      where: {
        tenantId,  // Always enforce!
        ...filters
      }
    })
  }
}

// Usage in API routes
export async function GET(request: Request) {
  const tenantId = getCurrentTenantId() // From context
  
  const customerRepo = new TenantAwareRepository(db.customer, () => tenantId)
  const customers = await customerRepo.findAll({ status: 'ACTIVE' })
}
```

---

## Technology Choices

### Rationale for Key Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Next.js 16 | Full-stack, SSR, API routes, great DX |
| **Language** | TypeScript | Type safety, better tooling, fewer bugs |
| **UI Library** | shadcn/ui + Radix | Accessible, customizable, copy-paste components |
| **Styling** | Tailwind CSS 4 | Utility-first, fast development, small bundle |
| **ORM** | Prisma 6 | Type-safe, migrations, great DX |
| **Database (Dev)** | SQLite | Zero-config, fast for development |
| **Database (Prod)** | PostgreSQL | Robust, scalable, JSON support |
| **State** | Zustand | Simple, lightweight, no boilerplate |
| **Forms** | React Hook Form + Zod | Performant, schema validation |
| **Charts** | Recharts | React-native, composable |
| **Icons** | Lucide | Tree-shakable, consistent style |

### Why Not Alternatives?

| Considered | Rejected Because |
|------------|------------------|
| **NestJS** | Over-engineered for current needs; Next.js handles both frontend and API |
| **MongoDB** | Relational data model fits lending domain; need ACID transactions |
| **Redux** | Too much boilerplate; Zustand is simpler |
| **Material UI** | Harder to customize; shadcn/ui gives full control |
| **GraphQL** | REST is sufficient; simpler caching and tooling |
| **TypeORM** | Prisma has better TypeScript integration and migration tools |

---

## Integration Points

### External Service Interfaces

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ADAPTER PATTERN                               │   │
│  │                                                                      │   │
│  │   Application Code                                                   │   │
│   │         │                                                           │   │
│   │         ▼                                                           │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │   │
│  │   │ MpesaAdapter│    │  CRBAdapter │    │ SMSAdapter  │             │   │
│  │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │   │
│  └──────────┼──────────────────┼──────────────────┼────────────────────┘   │
│             │                  │                  │                        │
│  ┌──────────▼──────────────────▼──────────────────▼──────────────────┐     │
│  │                    INTERFACE ABSTRACTION                           │     │
│  │                                                                     │     │
│  │  interface IPaymentProvider {                                      │     │
│  │    initiateDisbursement(params): Promise<DisbursementResult>       │     │
│  │    checkStatus(reference): Promise<PaymentStatus>                  │     │
│  │  }                                                                 │     │
│  │                                                                     │     │
│  │  interface ICreditBureau {                                         │     │
│  │    checkCredit(nationalId): Promise<CreditReport>                  │     │
│  │    submitListing(data): Promise<void>                              │     │
│  │  }                                                                 │     │
│  │                                                                     │     │
│  │  interface INotificationService {                                 │     │
│  │    sendSMS(to, message): Promise<SMSResult>                        │     │
│  │    sendEmail(to, template, data): Promise<EmailResult>             │     │
│  │  }                                                                 │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### M-Pesa Integration Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   Our System   │     │  Safaricom API │     │   Customer     │
│                │     │                │     │                │
│  ┌──────────┐  │     │                │     │  ┌──────────┐  │
│  │ Initiate │──┼────▶│  B2C Endpoint │─────▶│  M-Pesa   │  │
│  │ Request  │  │     │                │     │  Account  │  │
│  └──────────┘  │     └───────┬────────┘     │  └────┬─────┘  │
│       ▲        │             │                    │         │
│       │        │             ▼                    │         │
│       │        │     ┌──────────────┐             │         │
│       │        │     │   Queue      │             │         │
│       │        │     │  Processing  │             │         │
│       │        │     └──────┬───────┘             │         │
│       │        │             │                    │         │
│       │        │             ▼                    ▼         │
│       │        │     ┌──────────────────────────────────┐   │
│       │        │     │         CALLBACK URL             │   │
│       │        │     │  /api/webhooks/mpesa/result       │   │
│       │        │     └────────────────┬─────────────────┘   │
│       │        │                      │                    │
│       │        └──────────────────────┘                    │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │ Update   │                                              │
│  │ Loan     │                                              │
│  │ Status   │                                              │
│  └──────────┘                                              │
└────────────────┘
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 7: APPLICATION                                                      │
│  ├── Input Validation (Zod schemas)                                        │
│  ├── SQL Injection Prevention (Prisma ORM)                                 │
│  ├── XSS Protection (React auto-escaping)                                  │
│  ├── CSRF Protection (SameSite cookies)                                    │
│  └── Rate Limiting                                                         │
│                                                                              │
│  Layer 6: AUTHENTICATION & AUTHORIZATION                                   │
│  ├── JWT-based Authentication                                              │
│  ├── Role-Based Access Control (RBAC)                                      │
│  ├── Session Management                                                    │
│  └── Password Hashing (bcrypt)                                             │
│                                                                              │
│  Layer 5: DATA                                                             │
│  ├── Encryption at Rest (AES-256)                                          │
│  ├── Encryption in Transit (TLS 1.3+)                                     │
│  ├── Field-Level Encryption (PII fields)                                   │
│  └── Data Masking in Logs                                                  │
│                                                                              │
│  Layer 4: NETWORK                                                           │
│  ├── HTTPS Enforcement                                                     │
│  ├── WAF Rules                                                             │
│  ├── DDoS Protection                                                       │
│  └── IP Allowlisting (admin endpoints)                                     │
│                                                                              │
│  Layer 3: TENANT ISOLATION                                                 │
│  ├── Row-Level Security                                                    │
│  ├── Cross-Tenant Access Prevention                                        │
│  └── Resource Quotas                                                       │
│                                                                              │
│  Layer 2: AUDIT & COMPLIANCE                                                │
│  ├── Complete Audit Trail                                                  │
│  ├── CBK Regulatory Logging                                                │
│  └── Data Retention Policies                                               │
│                                                                              │
│  Layer 1: INFRASTRUCTURE                                                   │
│  ├── Secure Server Configuration                                           │
│  ├── Regular Security Updates                                              │
│  ├── Vulnerability Scanning                                                │
│  └── Incident Response Plan                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow (Planned)

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Client │     │  Auth  │     │  JWT   │     │  API   │     │Resource│
│        │     │ Endpoint│     │ Issuer │     │ Route  │     │        │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │  1. Login    │              │              │              │
    │─────────────▶│              │              │              │
    │              │              │              │              │
    │              │ 2. Validate  │              │              │
    │              │ Credentials  │              │              │
    │              │──────────────│              │              │
    │              │              │              │              │
    │              │ 3. Issue JWT  │              │              │
    │              │◀─────────────│              │              │
    │              │              │              │              │
    │  4. Token    │              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
    │  5. API Call +│              │              │              │
    │     Token     │              │              │              │
    │─────────────────────────────▶│              │              │
    │              │              │  6. Validate │              │
    │              │              │◀─────────────│              │
    │              │              │              │              │
    │              │              │  7. Valid    │              │
    │              │              │─────────────▶│              │
    │              │              │              │  8. Execute  │
    │              │              │              │─────────────▶│
    │              │              │              │              │
    │  9. Response │              │              │              │
    │◀────────────────────────────────────────────│◀─────────────│
    │              │              │              │              │
```

### Sensitive Data Handling

```typescript
// Encryption utilities for PII
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

// Fields to encrypt at rest
const SENSITIVE_FIELDS = [
  'nationalId',
  'kraPin',
  'bankAccount',
  'mpesaPhone'
]

// Encrypt before storing
function encryptField(value: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

// Decrypt when reading
function decryptField(encrypted: string): string {
  const [ivHex, tagHex, encrypted] = encrypted.split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

## Scaling Considerations

### Current Architecture Limitations

| Area | Current State | Scaling Path |
|------|---------------|--------------|
| **Database** | Single SQLite instance | PostgreSQL with read replicas |
| **Application** | Single server | Horizontal pod scaling (Kubernetes) |
| **File Storage** | Local filesystem | S3-compatible object storage |
| **Cache** | None | Redis cluster |
| **Queue** | Synchronous | Message queue (RabbitMQ/Bull) |
| **Search** | DB LIKE queries | Elasticsearch |

### Horizontal Scaling Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCALING ARCHITECTURE (Future)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌─────────────┐                                    │
│                         │   DNS / CDN  │                                    │
│                         └──────┬──────┘                                    │
│                                │                                           │
│                         ┌──────▼──────┐                                    │
│                         │ Load Balancer│                                   │
│                         │  (ALB/Nginx) │                                   │
│                         └──────┬──────┘                                    │
│                                │                                           │
│              ┌─────────────────┼─────────────────┐                         │
│              │                 │                 │                         │
│       ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                  │
│       │  App Node 1  │  │  App Node 2  │  │  App Node N  │                  │
│       │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │                  │
│       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│              │                 │                 │                         │
│              └─────────────────┼─────────────────┘                         │
│                                │                                           │
│         ┌──────────────────────┼──────────────────────┐                    │
│         │                      │                      │                    │
│  ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐             │
│  │PostgreSQL   │       │   Redis     │       │  S3/MinIO   │             │
│  │Primary +    │       │  Cluster    │       │ Object Store │             │
│  │Replicas     │       │             │       │             │             │
│  └─────────────┘       └─────────────┘       └─────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Optimization Strategies

#### Database Optimization

```sql
-- 1. Partition large tables by tenant or date
CREATE TABLE repayments (
  -- columns
) PARTITION BY RANGE (payment_date);

-- 2. Materialized views for dashboard stats
CREATE MATERIALIZED VIEW mv_tenant_dashboard_stats AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_loans,
  COUNT(*) FILTER (WHERE days_in_arrears > 30) as par30_count,
  SUM(outstanding_balance) as total_outstanding
FROM loans
GROUP BY tenant_id;

-- Refresh every 5 minutes
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_dashboard_stats;
```

#### Caching Strategy

```typescript
// Multi-level caching
class CacheManager {
  private redis: Redis
  private localCache: Map<string, { data: any; ttl: number }>
  
  async get<T>(key: string): Promise<T | null> {
    // Level 1: Local memory cache (fastest)
    const local = this.localCache.get(key)
    if (local && local.ttl > Date.now()) {
      return local.data as T
    }
    
    // Level 2: Redis (distributed)
    const cached = await this.redis.get(key)
    if (cached) {
      const data = JSON.parse(cached)
      this.localCache.set(key, { data, ttl: Date.now() + 30000 }) // 30s local
      return data as T
    }
    
    return null
  }
  
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    // Set both levels
    this.localCache.set(key, { data: value, ttl: Date.now() + 30000 })
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
  }
}
```

#### Query Optimization Patterns

```typescript
// Use select/include to limit data transfer
const loans = await db.loan.findMany({
  where: { tenantId, status: 'ACTIVE' },
  select: {
    id: true,
    loanNumber: true,
    principal: true,
    outstandingBalance: true,
    customer: {
      select: {
        firstName: true,
        lastName: true,
        phone: true
      }
    }
    // Don't fetch full repayment schedule unless needed
  }
})

// Use aggregation instead of fetching all records
const stats = await db.loan.aggregate({
  where: { tenantId, status: 'ACTIVE' },
  _count: true,
  _sum: { principal: true, outstandingBalance: true },
  _avg: { interestRate: true }
})
```

---

## Deployment Architecture

### Development Environment

```
Developer Machine
└── bun run dev
    └── Next.js dev server (:3000)
        └── SQLite database (./db/custom.db)
```

### Production Environment (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Container Orchestration (Kubernetes)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Deployment: digital-lending-os                          │    │
│  │                                                          │    │
│  │ Replicas: 3 (min) - 10 (max)                            │    │
│  │ Autoscaling: CPU > 70% scale up                        │    │
│  │                                                          │    │
│  │ Resources per Pod:                                       │    │
│  │ - CPU: 500m - 2000m                                     │    │
│  │ - Memory: 512Mi - 2Gi                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Managed Services:                                               │
│  ├── RDS PostgreSQL (Multi-AZ)                                  │
│  ├── ElastiCache Redis Cluster                                  │
│  ├── S3 Bucket (Documents, Backups)                            │
│  ├── CloudFront CDN (Static assets)                            │
│  └── Route53 / ALB (Load balancing, SSL)                       │
│                                                                  │
│  Monitoring:                                                     │
│  ├── CloudWatch (Metrics, Logs, Alarms)                        │
│  ├── Datadog / New Relic (APM)                                 │
│  ├── Sentry (Error tracking)                                   │
│  └── PagerDuty (Incident response)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install -g bun && bun install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Kubernetes Deployment (Sample)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digital-lending-os
spec:
  replicas: 3
  selector:
    matchLabels:
      app: digital-lending-os
  template:
    metadata:
      labels:
        app: digital-lending-os
    spec:
      containers:
      - name: app
        image: digital-lending-os:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: encryption-key
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /api
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: digital-lending-os
spec:
  selector:
    app: digital-lending-os
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

---

## Monitoring & Observability

### Key Metrics to Track

| Category | Metric | Alert Threshold |
|----------|--------|-----------------|
| **Performance** | API Response Time (p95) | > 500ms |
| **Performance** | Error Rate | > 1% |
| **Business** | Active Loans Count | Monitor trend |
| **Business** | PAR30 Ratio | > 10% |
| **Infrastructure** | CPU Usage | > 80% |
| **Infrastructure** | Memory Usage | > 85% |
| **Infrastructure** | Database Connections | > 80% of pool |
| **Security** | Failed Auth Attempts | > 10/min |

### Logging Strategy

```typescript
// Structured logging format
interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  service: 'digital-lending-os'
  tenantId?: string
  userId?: string
  requestId: string
  action: string
  message: string
  duration_ms?: number
  metadata?: Record<string, unknown>
}

// Example usage
logger.info({
  action: 'loan.disbursement.initiated',
  tenantId: loan.tenantId,
  userId: currentUser.id,
  requestId,
  metadata: {
    loanId: loan.id,
    amount: loan.approvedAmount,
    method: loan.disbursementMethod
  }
})
```

---

## Future Roadmap

### Phase 1: Foundation (Current)
- ✅ Core multi-tenant architecture
- ✅ Basic CRUD operations
- ✅ Dashboard analytics
- ✅ Seed data for testing

### Phase 2: Production Readiness (Q2 2026)
- ⏳ Authentication & authorization
- ⏳ M-Pesa integration
- ⏳ CRB integration
- ⏳ SMS/Email notifications
- ⏳ Audit logging enhancement

### Phase 3: Advanced Features (Q3 2026)
- 📋 Automated decision engine
- 📋 Advanced reporting module
- 📋 Mobile app (React Native)
- 📋 USSD channel
- 📋 Webhook system

### Phase 4: Scale & Optimize (Q4 2026)
- 📋 PostgreSQL migration
- 📋 Redis caching layer
- 📋 Kubernetes deployment
- 📋 Multi-region support
- 📋 Advanced analytics

---

<div align="center>

**Document Version:** 2.0.0  
**Last Updated:** January 2026  
**Maintained By:** Digital Lending OS Engineering Team

</div>
