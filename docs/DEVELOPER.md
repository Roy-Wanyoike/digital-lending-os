# Digital Lending OS - Developer Guide

<div align="center">

**Technical Guide for Extending and Customizing the Platform**

Version 2.0.0 | Next.js 16 | TypeScript | Prisma

[Setup](#development-setup) • [Architecture](#code-architecture) • [Adding Features](#adding-new-features) • [API Development](#api-development) • [Database](#database-development) • [Testing](#testing) • [Best Practices](#best-practices)

</div>

---

## Table of Contents

1. [Introduction](#introduction)
2. [Development Setup](#development-setup)
3. [Project Structure Deep Dive](#project-structure-deep-dive)
4. [Code Architecture](#code-architecture)
5. [Adding New Tenants](#adding-new-tenants)
6. [Creating Custom Loan Products](#creating-custom-loan-products)
7. [Modifying Workflows](#modifying-workflows)
8. [Adding New Integrations](#adding-new-integrations)
9. [API Development](#api-development)
10. [Frontend Components](#frontend-components)
11. [Database Development](#database-development)
12. [Code Style Guidelines](#code-style-guidelines)
13. [Testing Procedures](#testing-procedures)
14. [Common Patterns](#common-patterns)
15. [Troubleshooting](#developer-troubleshooting)

---

## Introduction

This guide is for developers who want to extend, customize, or contribute to Digital Lending OS. It covers everything from initial setup to advanced customization patterns.

### Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.x or **Bun** >= 1.x
- **Git** for version control
- **Code editor** (VS Code recommended with extensions)
- Basic knowledge of:
  - TypeScript
  - React/Next.js
  - REST APIs
  - SQL/Prisma ORM
  - Git workflow

### What You Can Customize

| Area | Customization Level |
|------|---------------------|
| UI/Theme | Full white-label per tenant |
| Loan Products | Configurable per tenant |
| Workflows | Extendable pipeline stages |
| Integrations | Plugin architecture ready |
| Reports | Custom report builders |
| Notifications | Multi-channel extensible |

---

## Development Setup

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/digital-lending-os.git
cd digital-lending-os

# Install dependencies (using Bun - recommended)
bun install

# Or using npm
npm install

# Copy environment template
cp .env.example .env

# Set up database
bun run db:push

# Generate Prisma client
bun run db:generate

# Seed sample data (optional but recommended)
npx tsx scripts/seed.ts

# Start development server
bun run dev
```

### VS Code Extensions (Recommended)

Install these extensions for optimal development:

| Extension | Purpose |
|-----------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Prisma | Database schema support |
| Tailwind CSS IntelliSense | CSS autocompletion |
| TypeScript Vue Plugins (Volar) | TypeScript support |
| Thunder Client | API testing |

### Environment Configuration

Create `.env.local` for local overrides:

```env
# Database
DATABASE_URL="file:./dev.db"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: External Services (for integration testing)
MPESA_CONSUMER_KEY=test_key
MPESA_CONSUMER_SECRET=test_secret
CRB_API_URL=https://sandbox.crb.co.ke/api
SMS_GATEWAY_URL=https://sandbox.sms.co.ke/api
```

---

## Project Structure Deep Dive

```
digital-lending-os/
│
├── prisma/
│   ├── schema.prisma          # ★ Database schema (start here!)
│   └── migrations/            # Auto-generated migrations
│
├── src/
│   │
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout (providers, fonts)
│   │   ├── page.tsx           # Home page (main dashboard)
│   │   ├── globals.css        # Global styles + Tailwind
│   │   │
│   │   └── api/               # ★ API Route Handlers
│   │       ├── route.ts       # Health check / root
│   │       ├── tenants/       # Tenant CRUD
│   │       │   ├── route.ts   # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts # GET, PUT, DELETE
│   │       ├── customers/     # Customer endpoints
│   │       ├── applications/  # Loan application endpoints
│   │       ├── loans/         # Loan management endpoints
│   │       ├── products/      # Product configuration
│   │       └── dashboard/     # Statistics & analytics
│   │
│   ├── components/
│   │   ├── ui/                # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (50+ components)
│   │   │
│   │   └── lending-os/        # ★ Domain-specific components
│   │       ├── SuperAdminView.tsx    # Platform admin dashboard
│   │       ├── LenderDashboard.tsx   # Tenant admin view
│   │       ├── CustomerPortal.tsx    # Borrower-facing UI
│   │       ├── ApplicationsTable.tsx # Application list
│   │       ├── LoansTable.tsx        # Loan list
│   │       ├── KPICards.tsx          # Metric cards
│   │       ├── DashboardCharts.tsx   # Visualizations
│   │       ├── LoanCalculator.tsx    # Payment calculator
│   │       ├── RepaymentSchedule.tsx # Schedule display
│   │       ├── ApplicationForm.tsx   # New app form
│   │       ├── ApplicationStatusTracker.tsx
│   │       ├── TenantList.tsx
│   │       └── ArchitectureDiagram.tsx
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-mobile.ts      # Responsive detection
│   │   └── use-toast.ts       # Toast notifications
│   │
│   └── lib/                   # Core utilities
│       ├── db.ts              # ★ Prisma client singleton
│       └── utils.ts           # Helper functions (cn, etc.)
│
├── scripts/
│   └── seed.ts                # Database seeder
│
├── public/                    # Static assets
│   └── logo.svg
│
├── docs/                      # Documentation
│   ├── API.md
│   ├── USER_GUIDE.md
│   ├── DEVELOPER.md          ← You are here!
│   ├── ARCHITECTURE.md
│   └── SAMPLE_CONFIGURATIONS.md
│
├── tests/                     # Test files
│   ├── python-runtime-*.sh
│   └── database-runtime-*.sh
│
├── examples/                  # Example implementations
│   └── websocket/             # WebSocket examples
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── components.json        # shadcn/ui config
    └── Caddyfile             # Reverse proxy config
```

---

## Code Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  (React Components, Pages, Hooks)                           │
└─────────────────────────────┬───────────────────────────────┘
                              │ Calls
┌─────────────────────────────▼───────────────────────────────┐
│                        API LAYER                             │
│  (Next.js Route Handlers - src/app/api/*)                   │
│  - Request validation                                       │
│  - Business logic orchestration                             │
│  - Response formatting                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │ Queries
┌─────────────────────────────▼───────────────────────────────┐
│                       DATA LAYER                             │
│  (Prisma ORM - src/lib/db.ts)                               │
│  - Type-safe database access                                │
│  - Query building                                          │
│  - Transaction management                                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ Stores
┌─────────────────────────────▼───────────────────────────────┐
│                      DATABASE                                │
│  (SQLite dev / PostgreSQL prod)                             │
│  - Persistent storage                                       │
│  - Data integrity constraints                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example (Loan Creation)

```typescript
// 1. PRESENTATION: User submits form
//    Component calls API

const response = await fetch('/api/loans', {
  method: 'POST',
  body: JSON.stringify({ tenantId, customerId, principal, ... })
})

// 2. API LAYER: Route handler processes request
//    src/app/api/loans/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Validate input
  if (!body.tenantId || !body.principal) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }
  
  // Business logic
  const loanNumber = generateLoanNumber(body.tenantId)
  const schedule = generateRepaymentSchedule(...)
  
  // 3. DATA LAYER: Persist to database
  const loan = await db.loan.create({
    data: { loanNumber, ... }
  })
  
  // Return response
  return NextResponse.json({ success: true, data: loan }, { status: 201 })
}
```

### Key Patterns

#### 1. Tenant Isolation Pattern

Every data-accessing endpoint requires `tenantId`:

```typescript
// Always filter by tenantId
const where = { tenantId }

const customers = await db.customer.findMany({
  where,
  // ... other filters
})
```

#### 2. Response Envelope Pattern

All responses follow consistent structure:

```typescript
// Success with data
return NextResponse.json({
  success: true,
  data: result,
  pagination: { page, limit, total, pages }  // For lists
})

// Success with message
return NextResponse.json({
  success: true,
  message: 'Operation completed'
}, { status: 201 })

// Error response
return NextResponse.json({
  success: false,
  error: 'Descriptive error message'
}, { status: 400 })
```

#### 3. Pagination Pattern

List endpoints use consistent pagination:

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit
  
  const [data, total] = await Promise.all([
    db.model.findMany({ where, skip, take: limit }),
    db.model.count({ where })
  ])
  
  return NextResponse.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  })
}
```

---

## Adding New Tenants

### Method 1: Via API

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New DCP Ltd",
    "slug": "newdcpltd",
    "companyName": "New DCP Limited",
    "licenseNumber": "DCP-2025-XXXX",
    "phone": "+2547XXXXXXXX",
    "email": "admin@newdcp.co.ke",
    "plan": "PROFESSIONAL",
    "branding": {
      "primaryColor": "#1e40af",
      "secondaryColor": "#3b82f6"
    }
  }'
```

### Method 2: Via Database Seeder

Add to `scripts/seed.ts`:

```typescript
const newTenant = {
  name: 'New DCP Ltd',
  slug: 'newdcpltd',
  companyName: 'New DCP Limited',
  licenseNumber: 'DCP-2025-XXXX',
  phone: '+2547XXXXXXXX',
  email: 'admin@newdcp.co.ke',
  physicalAddress: 'Nairobi, Kenya',
  status: 'ACTIVE' as const,
  plan: 'PROFESSIONAL' as const,
  monthlyFee: 15000,
  transactionRate: 1.0,
  branding: JSON.stringify({
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6'
  })
}

await prisma.tenant.create({ data: newTenant })
```

### Method 3: Programmatic (in code)

```typescript
import { db } from '@/lib/db'

async function createTenant(tenantData: CreateTenantInput) {
  // Validate slug uniqueness
  const existing = await db.tenant.findUnique({
    where: { slug: tenantData.slug }
  })
  
  if (existing) {
    throw new Error(`Tenant with slug "${tenantData.slug}" already exists`)
  }
  
  // Create tenant
  const tenant = await db.tenant.create({
    data: {
      ...tenantData,
      branding: typeof tenantData.branding === 'string' 
        ? tenantData.branding 
        : JSON.stringify(tenantData.branding || {}),
      config: typeof tenantData.config === 'string'
        ? tenantData.config
        : JSON.stringify(tenantData.config || {})
    }
  })
  
  return tenant
}
```

### Post-Creation Setup Checklist

After creating a tenant:

- [ ] Create admin user for tenant
- [ ] Configure loan products
- [ ] Set up approval workflows
- [ ] Configure notification channels
- [ ] Test login as tenant admin
- [ ] Verify branding displays correctly

---

## Creating Custom Loan Products

### Understanding Product Structure

Each loan product is defined by these parameters:

```typescript
interface LoanProductInput {
  // Identity
  tenantId: string
  name: string            // Display name
  productCode: string     // Unique code (e.g., "PL-001")
  category: ProductCategory
  
  // Amount limits
  minAmount: number       // Minimum loan (KSh)
  maxAmount: number       // Maximum loan (KSh)
  defaultAmount?: number  // Suggested amount
  
  // Interest & Fees
  interestType: InterestType
  interestRate: number    // Rate (%)
  processingFee: number
  processingFeeType: FeeType
  insuranceFee: number
  insuranceFeeType: FeeType
  
  // Term
  minTermDays: number
  maxTermDays: number
  defaultTermDays?: number
  repaymentFrequency: RepaymentFrequency
  gracePeriodDays: number
  
  // Eligibility
  eligibilityRules: EligibilityRules
}
```

### Creating a Product via API

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "name": "Quick Emergency Loan",
    "productCode": "EL-001",
    "category": "EMERGENCY_LOAN",
    "minAmount": 1000,
    "maxAmount": 50000,
    "defaultAmount": 10000,
    "interestType": "FLAT_RATE",
    "interestRate": 12.0,
    "processingFee": 200,
    "processingFeeType": "FIXED",
    "insuranceFee": 0,
    "minTermDays": 7,
    "maxTermDays": 30,
    "defaultTermDays": 14,
    "repaymentFrequency": "BULLET",
    "gracePeriodDays": 0,
    "eligibilityRules": {
      "minCreditScore": 550,
      "minIncome": 15000,
      "maxExistingLoans": 2,
      "requiredDocuments": ["NATIONAL_ID"]
    }
  }'
```

### Creating Products in Seeder

```typescript
// Add to scripts/seed.ts after creating tenant

const products = [
  {
    tenantId: tenant.id,
    name: 'Personal Quick Loan',
    description: 'Fast personal loans for emergencies',
    productCode: 'PL-001',
    category: 'PERSONAL_LOAN',
    minAmount: 5000,
    maxAmount: 100000,
    defaultAmount: 25000,
    interestType: 'FLAT_RATE' as const,
    interestRate: 10.0,
    processingFee: 300,
    processingFeeType: 'FIXED' as const,
    insuranceFee: 1.5,
    insuranceFeeType: 'PERCENTAGE' as const,
    minTermDays: 30,
    maxTermDays: 180,
    defaultTermDays: 90,
    repaymentFrequency: 'MONTHLY' as const,
    gracePeriodDays: 0,
    eligibilityRules: JSON.stringify({
      minCreditScore: 600,
      requiredDocuments: ['NATIONAL_ID', 'PAYSLIP']
    })
  },
  // ... more products
]

for (const product of products) {
  await prisma.loanProduct.create({ data: product })
}
```

### Product Categories Available

```typescript
enum ProductCategory {
  PERSONAL_LOAN,      // General personal use
  BUSINESS_LOAN,      // Business financing
  SME_LOAN,           // Small-medium enterprise
  SALARY_ADVANCE,     // Short-term against salary
  ASSET_FINANCE,      // Vehicle/equipment
  EMERGENCY_LOAN,     // Urgent needs
  SCHOOL_FEES,        // Education
  INVOICE_FINANCING,  // Invoice-based
  LOGBOOK_LOAN,       // Vehicle-secured
  SUPPLY_CHAIN,       // Trade finance
  OTHER               // Custom
}
```

---

## Modifying Workflows

### Understanding Application Workflow

The loan application follows a state machine pattern:

```typescript
enum ApplicationStep {
  SUBMISSION,              // Initial entry
  KYC_VERIFICATION,        // ID/documents verified
  CREDIT_ASSESSMENT,       // Score calculated
  AFFORDABILITY_CHECK,     // Income vs debt ratio
  MANUAL_REVIEW,           // Officer review
  MANAGER_APPROVAL,        // Manager sign-off
  DOCUMENT_SIGNING,        // Contract signed
  DISBURSEMENT_PREPARATION,// Ready to send funds
  DISBURSED,               // Funds sent
  COMPLETED,               // Fully processed
  CANCELLED                // Terminated
}

enum ApplicationStatus {
  DRAFT,                   // Being filled
  SUBMITTED,               // Sent for review
  UNDER_REVIEW,            // In process
  APPROVED,                // Accepted
  CONDITIONALLY_APPROVED,  // Accepted with conditions
  REJECTED,                // Declined
  CANCELLED,               // Cancelled by applicant
  WITHDRAWN,               // Withdrawn by applicant
  DISBURSED,               // Funds released
  DISBURSEMENT_FAILED      // Technical failure
}
```

### Adding a New Workflow Step

#### 1. Update Schema (if needed)

```prisma
// prisma/schema.prisma

enum ApplicationStep {
  // ... existing steps
  FRAUD_CHECK              // NEW: Anti-fraud verification
}
```

#### 2. Update API Handler

```typescript
// src/app/api/applications/[id]/route.ts

// In the PUT handler, add new step logic
if (action === 'advance_step') {
  const stepOrder = [
    'SUBMISSION',
    'KYC_VERIFICATION',
    'FRAUD_CHECK',        // NEW STEP
    'CREDIT_ASSESSMENT',
    // ...
  ]
  
  const currentIdx = stepOrder.indexOf(application.currentStep)
  const nextStep = stepOrder[currentIdx + 1]
  
  // Update step history
  const stepHistory = JSON.parse(application.stepHistory || '[]')
  stepHistory.push({
    step: nextStep,
    enteredAt: new Date().toISOString(),
    by: decisionBy || 'system'
  })
  
  const updated = await db.loanApplication.update({
    where: { id },
    data: {
      currentStep: nextStep,
      stepHistory: JSON.stringify(stepHistory)
    }
  })
}
```

#### 3. Update UI Component

```tsx
// src/components/lending-os/ApplicationStatusTracker.tsx

const steps = [
  { key: 'SUBMISSION', label: 'Submission', icon: FileText },
  { key: 'KYC_VERIFICATION', label: 'KYC Check', icon: Shield },
  { key: 'FRAUD_CHECK', label: 'Fraud Check', icon: AlertTriangle }, // NEW
  { key: 'CREDIT_ASSESSMENT', label: 'Credit Assessment', icon: BarChart3 },
  // ... rest of steps
]
```

### Custom Approval Rules

Implement custom business rules in the API layer:

```typescript
// lib/approval-rules.ts

interface ApprovalContext {
  customer: Customer
  product: LoanProduct
  amount: number
  termDays: number
  tenantConfig: TenantConfig
}

interface ApprovalResult {
  approved: boolean
  reason?: string
  conditions?: string[]
  maxAmount?: number
}

async function evaluateApproval(ctx: ApprovalContext): Promise<ApprovalResult> {
  const rules = [
    // Rule 1: Credit score minimum
    {
      check: () => (customer.creditScore || 0) >= ctx.tenantConfig.minCreditScore,
      fail: `Credit score too low (need ${ctx.tenantConfig.minCreditScore})`
    },
    
    // Rule 2: Affordability (debt-to-income < 50%)
    {
      check: async () => {
        const existingDebt = await getMonthlyDebtPayment(ctx.customer.id)
        const dti = (existingDebt + estimateMonthlyPayment(ctx)) / (ctx.customer.incomeAmount || 0)
        return dti < 0.5
      },
      fail: 'De-to-income ratio exceeds 50%'
    },
    
    // Rule 3: Maximum exposure
    {
      check: async () => {
        const currentExposure = await getTotalExposure(ctx.customer.id, ctx.tenantId)
        return (currentExposure + ctx.amount) <= ctx.tenantConfig.maxExposurePerCustomer
      },
      fail: 'Maximum exposure limit reached'
    },
    
    // Add your custom rules here...
  ]
  
  for (const rule of rules) {
    const passed = await rule.check()
    if (!passed) {
      return { approved: false, reason: rule.fail }
    }
  }
  
  return { approved: true }
}
```

---

## Adding New Integrations

### Integration Points

Digital Lending OS has several extension points:

| Integration Type | When It Triggers | Use Case |
|-----------------|------------------|----------|
| **Disbursement** | On loan disbursement | M-Pesa, Bank API |
| **Repayment** | On payment received | Payment gateway webhook |
| **CRB Check** | During credit assessment | Credit bureau API |
| **SMS** | On notifications | SMS gateway |
| **Email** | On notifications | Email service (SES, SendGrid) |
| **Webhook** | On any event | External system sync |

### Example: M-Pesa Disbursement Integration

```typescript
// integrations/mpesa.ts

import { db } from '@/lib/db'

interface MpesaDisbursementRequest {
  phoneNumber: string
  amount: number
  reference: string  // Loan number
  callbackUrl: string
}

export async function initiateMpesaDisbursement(
  loanId: string,
  phoneNumber: string,
  amount: number
) {
  const loan = await db.loan.findUnique({ where: { id: loanId } })
  if (!loan) throw new Error('Loan not found')
  
  // Call Safaricom API
  const response = await fetch('https://api.safaricom.co.ke/v1/disburse', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getMpesaToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phoneNumber: formatPhoneNumber(phoneNumber),
      amount,
      reference: loan.loanNumber,
      callbackUrl: `${process.env.APP_URL}/api/webhooks/mpesa`
    })
  })
  
  const result = await response.json()
  
  if (result.ResponseCode === '0') {
    // Update loan with conversation ID
    await db.loan.update({
      where: { id: loanId },
      data: {
        status: 'DISBURSED',
        disbursementReference: result.ConversationID,
        disbursementDate: new Date()
      }
    })
    
    // Create transaction record
    await createTransaction({
      type: 'DISBURSEMENT',
      entityId: loanId,
      amount,
      externalRef: result.ConversationID
    })
  }
  
  return result
}

// Webhook handler for M-Pesa callback
export async function handleMpesaCallback(callbackData: any) {
  const { ResultCode, ResultDesc, ReferenceItem } = callbackData.Result
  
  const loan = await db.loan.findFirst({
    where: { loanNumber: ReferenceItem?.Value }
  })
  
  if (!loan) return
  
  if (ResultCode === '0') {
    // Success
    await db.loan.update({
      where: { id: loan.id },
      data: { 
        status: 'ACTIVE',
        disbursementReference: callbackData.ConversationID
      }
    })
  } else {
    // Failure
    await db.loan.update({
      where: { id: loan.id },
      data: { status: 'DISBURSEMENT_FAILED' }
    })
  }
}
```

### Example: CRB Integration

```typescript
// integrations/crb.ts

interface CRBCheckRequest {
  nationalId: string
  fullName: string
  phoneNumber: string
}

interface CRBResponse {
  score: number
  status: 'CLEAN' | 'LISTED' | 'PENDING'
  listings: CRBListing[]
  lastChecked: Date
}

export async function checkCRB(customerId: string): Promise<CRBResponse> {
  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer?.nationalId) {
    throw new Error('Customer National ID required for CRB check')
  }
  
  // Call CRB API (Metropol or TransUnion)
  const response = await fetch(`${process.env.CRB_API_URL}/check`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nationalId: customer.nationalId,
      fullName: `${customer.firstName} ${customer.lastName}`,
      phoneNumber: customer.phone
    })
  })
  
  const crbData = await response.json()
  
  // Update customer record
  await db.customer.update({
    where: { id: customerId },
    data: {
      creditScore: crbData.score,
      crbStatus: crbData.status.toUpperCase(),
      creditScoreDate: new Date()
    }
  })
  
  return crbData
}
```

### Creating Webhook Endpoints

```typescript
// src/app/api/webhooks/[provider]/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const payload = await request.json()
  
  switch (provider) {
    case 'mpesa':
      return handleMpesaWebhook(payload)
      
    case 'payment':
      return handlePaymentWebhook(payload)
      
    case 'crb':
      return handleCRBCallback(payload)
      
    default:
      return NextResponse.json(
        { error: 'Unknown provider' },
        { status: 400 }
      )
  }
}

async function handleMpesaWebhook(payload: any) {
  // Verify signature (important for security!)
  const isValid = verifyMpesaSignature(payload)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  
  // Process the callback
  // ... implementation
  
  return NextResponse.json({ success: true })
}
```

---

## API Development

### Creating a New Endpoint

Follow this pattern when adding new API routes:

#### Step 1: Create Route File

```typescript
// src/app/api/new-resource/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List resources
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const tenantId = searchParams.get('tenantId')
    
    // Require tenant isolation
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      )
    }
    
    const skip = (page - 1) * limit
    
    const [data, total] = await Promise.all([
      db.newResource.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      db.newResource.count({ where: { tenantId } })
    ])
    
    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Error fetching newResource:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}

// POST - Create resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, /* required fields */ } = body
    
    // Validation
    if (!tenantId || !/* other required */) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }
    
    // Create resource
    const resource = await db.newResource.create({
      data: { tenantId, /* ... */ }
    })
    
    return NextResponse.json(
      { success: true, data: resource },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating newResource:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
```

#### Step 2: Create Single Resource Route (Optional)

```typescript
// src/app/api/new-resource/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET single resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      )
    }
    
    const resource = await db.newResource.findFirst({
      where: { id, tenantId }
    })
    
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: resource })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resource' },
      { status: 500 }
    )
  }
}

// PUT - Update resource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tenantId } = body
    
    // Verify ownership
    const existing = await db.newResource.findFirst({
      where: { id, tenantId }
    })
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      )
    }
    
    // Update only allowed fields
    const allowedFields = ['field1', 'field2', 'field3']
    const updateData: Record<string, unknown> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    const resource = await db.newResource.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({ success: true, data: resource })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update resource' },
      { status: 500 }
    )
  }
}
```

---

## Frontend Components

### Creating a New Component

Use shadcn/ui conventions:

```tsx
// src/components/lending-os/NewComponent.tsx

'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SomeIcon } from 'lucide-react'

interface NewComponentProps {
  data: DataType[]
  onAction?: (id: string) => void
  className?: string
}

export function NewComponent({ data, onAction, className }: NewComponentProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SomeIcon className="h-5 w-5" />
          Component Title
        </CardTitle>
        <CardDescription>Description text</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Component content */}
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span>{item.name}</span>
              <Badge variant={item.active ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
        
        {onAction && (
          <Button onClick={() => onAction('action')} className="mt-4">
            Action Button
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Using Tables (shadcn/ui + TanStack Table)

```tsx
// Example from LoansTable.tsx

'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const columns: ColumnDef<Loan>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan Number',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('loanNumber')}</div>
    ),
  },
  {
    accessorKey: 'customer.firstName',
    header: 'Customer',
    cell: ({ row }) => `${row.original.customer.firstName} ${row.original.customer.lastName}`,
  },
  // ... more columns
]

export function LoansTable({ data }: { data: Loan[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## Database Development

### Modifying the Schema

When you need to change the database schema:

#### 1. Edit Prisma Schema

```prisma
// prisma/schema.prisma

model NewModel {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  // ... fields
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
}
```

#### 2. Push Changes (Development)

```bash
# Push schema changes directly (resets data in SQLite)
npm run db:push

# Or create migration (preserves data)
npm run db:migrate --name add_new_model
```

#### 3. Regenerate Client

```bash
npm run db:generate
```

### Common Schema Patterns

#### JSON Fields for Flexible Data

```prisma
model Tenant {
  // Flexible configuration stored as JSON
  config String @default("{}") 
  // Usage: JSON.parse(tenant.config)
}
```

#### Enums for Type Safety

```prisma
enum LoanStatus {
  ACTIVE
  IN_ARREARS
  DEFAULTED
  FULLY_PAID
  // ...
}
```

#### Relations with Indexes

```prisma
model Customer {
  id       String @id @default(cuid())
  tenantId String
  
  // Relation
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  loans    Loan[]
  
  // Performance indexes
  @@index([tenantId])
  @@index([phone])
  @@index([nationalId])
}
```

### Seeding Data

```typescript
// scripts/seed.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')
  
  // Clean existing data (optional)
  // await prisma.loan.deleteMany()
  
  // Create tenants
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Example DCP',
      slug: 'example',
      companyName: 'Example DCP Ltd',
      // ...
    }
  })
  
  // Create customers with fake data
  for (let i = 0; i < 50; i++) {
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: `+2547${faker.string.numeric(8)}`,
        email: faker.internet.email(),
        // ...
      }
    })
  }
  
  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Code Style Guidelines

### TypeScript Standards

```typescript
// ✅ DO: Use explicit types for public APIs
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ✅ DO: Use type assertions carefully
const tenantId = searchParams.get('tenantId') as string

// ❌ DON'T: Use 'any' unless absolutely necessary
function processData(data: any) { ... }

// ✅ DO: Use proper async/await
async function getData(): Promise<Data[]> {
  const result = await db.data.findMany()
  return result
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `LoanCalculator.tsx` |
| Files (utilities) | camelCase | `useToast.ts` |
| Files (API routes) | kebab-case or [param] | `loan-applications/[id]/route.ts` |
| Components | PascalCase | `<ApplicationStatusTracker />` |
| Functions | camelCase | `calculateInterest()` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOAN_AMOUNT` |
| Interfaces | PascalCase | `LoanApplicationInput` |
| Types | PascalCase | `TenantConfig` |
| DB models | PascalCase | `LoanProduct` |
| DB fields | camelCase | `disbursementDate` |
| Enum values | UPPER_SNAKE_CASE | `ACTIVE`, `IN_ARREARS` |
| API endpoints | kebab-case | `/api/loan-applications` |

### File Organization

```
// 1. Imports (grouped)
//    - React/Next.js
//    - Third-party libraries
//    - Internal components
//    - Utilities
//    - Types/interfaces

// 2. Type definitions (interfaces, types)

// 3. Constants

// 4. Main component/function

// 5. Helper functions (private)

// 6. Default export
```

### Comment Standards

```typescript
/**
 * Calculates the repayment schedule for a loan.
 * Uses flat-rate interest calculation.
 * 
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate (percentage)
 * @param termDays - Loan term in days
 * @returns Array of scheduled installments
 * 
 * @example
 * ```ts
 * const schedule = calculateSchedule(50000, 12, 90)
 * ```
 */
function calculateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termDays: number
): Installment[] {
  // Implementation
}
```

---

## Testing Procedures

### Manual Testing Checklist

Before submitting changes:

#### API Testing

- [ ] Test all HTTP methods (GET, POST, PUT, DELETE)
- [ ] Test with valid data
- [ ] Test with missing required fields
- [ ] Test with invalid data types
- [ ] Test tenant isolation (wrong tenantId)
- [ ] Test non-existent resources (404s)
- [ ] Test pagination (page, limit)
- [ ] Test filtering/search

#### Frontend Testing

- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile viewport
- [ ] Test form validation
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty states

#### Integration Testing

- [ ] Test complete flows (customer → application → loan → repayment)
- [ ] Test concurrent operations
- [ ] Test data consistency

### API Testing with curl

```bash
# Health check
curl http://localhost:3000/api

# List tenants
curl "http://localhost:3000/api/tenants?page=1&limit=10"

# Create customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","firstName":"Test","lastName":"User","phone":"+254700000000"}'

# Get customer
curl "http://localhost:3000/api/customers/{id}?tenantId=test"

# Error test - missing fields
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: {"success":false,"error":"Missing required fields..."}
```

### Using Thunder Client (VS Code)

1. Install Thunder Client extension
2. Create collection "Digital Lending OS"
3. Save requests with environments:
   - `{{baseUrl}}` = http://localhost:3000
   - `{{tenantId}}` = your test tenant ID
4. Export collection for team sharing

---

## Common Patterns

### Fetching Data in Components

```tsx
'use client'

import { useState, useEffect } from 'react'

interface UseDataOptions<T> {
  url: string
  initialValue?: T
  deps?: React.DependencyList
}

export function useFetch<T>({ url, initialValue, deps = [] }: UseDataOptions<T>) {
  const [data, setData] = useState<T | undefined>(initialValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(url)
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, deps)
  
  return { data, loading, error, refetch: () => fetchData() }
}
```

### Form Handling with Validation

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const customerSchema = z.object({
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  phone: z.string().regex(/^\+254\d{9}$/, 'Invalid phone format'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

type CustomerFormData = z.infer<typeof customerSchema>

export function CustomerForm({ tenantId, onSuccess }: Props) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: ''
    }
  })
  
  const onSubmit = async (data: CustomerFormData) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tenantId })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Customer created successfully')
        onSuccess?.(result.data)
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to create customer')
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### Error Boundary

```tsx
// components/error-boundary.tsx

'use client'

import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.Component<{ error: Error; reset: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultFallback
      return (
        <Fallback
          error={this.state.error!}
          reset={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    
    return this.props.children
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="text-red-600">{error.message}</p>
      <button onClick={reset} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
        Try again
      </button>
    </div>
  )
}
```

---

## Developer Troubleshooting

### Common Issues

#### Prisma Issues

| Issue | Solution |
|-------|----------|
| "Prisma client not generated" | Run `npm run db:generate` |
| "Schema mismatch" | Run `npm run db:push` |
| Migration conflicts | Delete `prisma/migrations` and re-migrate |
| SQLite locked | Close all connections, restart dev server |

#### Build Errors

| Issue | Solution |
|-------|----------|
| TypeScript errors | Check types match schema |
| Import errors | Verify file paths |
| Module not found | Run `npm install` |
| SSR issues | Mark client components with `'use client'` |

#### Runtime Errors

| Issue | Solution |
|-------|----------|
| 500 errors | Check server logs |
| CORS issues | Configure in `next.config.ts` |
| Timeout | Optimize queries, add indexes |
| Memory leaks | Check for unclosed connections |

### Debug Mode

Enable verbose logging:

```typescript
// src/lib/db.ts

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error']  // Production: errors only
  })
```

### Performance Tips

1. **Add database indexes** for frequently queried fields
2. **Use `select` or `include`** to limit returned fields
3. **Batch queries** with `Promise.all()` where possible
4. **Implement caching** for dashboard stats
5. **Use pagination** for large datasets

---

## Contributing

### Pull Request Process

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following code style guidelines
4. Test thoroughly (manual + automated)
5. Commit with clear messages: `feat: add new loan product type`
6. Push to your fork
7. Open PR with description of changes
8. Address review feedback
9. Merge after approval

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat: add CRB integration endpoint`
- `fix: correct PAR30 calculation`
- `docs: update API documentation`
- `refactor: simplify loan creation flow`

---

<div align="center">

**Need help?** Contact the development team or open an issue.

**Ready to deploy?** See the main [README](../README.md) deployment section.

</div>
