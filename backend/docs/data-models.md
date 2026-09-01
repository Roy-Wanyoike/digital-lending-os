# Digital Lending OS - Data Models

**Version:** 1.0.0  
**Database:** SQLite (dev) / PostgreSQL (prod)  
**ORM:** Prisma  

---

## Table of Contents

1. [Entity Relationship Overview](#entity-relationship-overview)
2. [Core Models](#core-models)
3. [Lending Models](#lending-models)
4. [Financial Models](#financial-models)
5. [Supporting Models](#supporting-models)
6. [Enums](#enums)
7. [Indexes](#indexes)
8. [Relationships](#relationships)

---

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANT (DCP)                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │   User   │  │Customer  │  │LoanProduct│  │   Loan   │  │ LoanApplication│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       │              │             │              │               │         │
│       │              │             │              │               │         │
│  ┌────▼─────┐  ┌─────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐│
│  │ Session  │  │    KYC    │  │ Repayment│  │Transaction│  │ KycDocument  ││
│  │ AuditLog │  │ Document  │  │          │  │           │  │              ││
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘  └──────────────┘│
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │Notification│  │ Provider │  │  Report  │                                  │
│  └──────────┘  └──────────┘  └──────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Models

### Tenant

Represents a Digital Credit Provider (DCP) organization using the platform.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Unique identifier |
| `name` | String | Required | Display name |
| `slug` | String | Unique | URL-safe identifier |
| `companyName` | String | Required | Legal registered name |
| `licenseNumber` | String? | Optional | CBK license number |
| `licenseDate` | DateTime? | Optional | License issue date |
| `phone` | String | Required | Contact phone |
| `email` | String | Required | Contact email |
| `physicalAddress` | String? | Optional | Office address |
| `website` | String? | Optional | Company website |
| `branding` | String | Default: `{}` | JSON: White-label config |
| `status` | Enum | Default: ACTIVE | Tenant status |
| `plan` | Enum | Default: STARTER | Subscription plan |
| `config` | String | Default: `{}` | JSON: Feature config |
| `monthlyFee` | Float | Default: 0 | Monthly subscription fee |
| `transactionRate` | Float | Default: 0 | % fee per transaction |
| `createdAt` | DateTime | Auto | Creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relations:** User[], Customer[], LoanProduct[], Loan[], LoanApplication[], Transaction[], Repayment[], KycDocument[], Notification[]

---

### User

Platform users with role-based access control.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Unique identifier |
| `tenantId` | String? | Foreign Key | Associated tenant |
| `email` | String | Unique | Login email |
| `passwordHash` | String? | Optional | Bcrypt hash |
| `name` | String | Required | Full name |
| `role` | Enum | Default: STAFF | User role |
| `avatar` | String? | Optional | Profile photo URL |
| `phone` | String? | Unique | Phone number |
| `lastLoginAt` | DateTime? | Optional | Last login timestamp |
| `isActive` | Boolean | Default: true | Account status |
| `tokenVersion` | Int | Default: 0 | For token revocation |
| `failedLoginAttempts` | Int | Default: 0 | Lockout tracking |
| `lockedUntil` | DateTime? | Optional | Lockout expiry |
| `passwordChangedAt` | DateTime? | Optional | Password change date |
| `emailVerified` | Boolean | Default: false | Verification status |
| `metadata` | String? | Default: `{}` | JSON metadata |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | Auto | Updated at |

**Relations:** Tenant?, Session[], AuditLog[]

---

### Session

JWT session tracking for security.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Session ID |
| `userId` | String | Foreign Key | User reference |
| `tokenHash` | String | Required | Hashed refresh token |
| `ipAddress` | String? | Optional | Client IP |
| `userAgent` | String? | Optional | Browser/client info |
| `isActive` | Boolean | Default: true | Session active |
| `expiresAt` | DateTime | Required | Expiry time |
| `lastActivityAt` | DateTime | Auto | Last activity |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** User (Cascade Delete)

---

### AuditLog

Complete audit trail for compliance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Log entry ID |
| `userId` | String? | Foreign Key | Acting user |
| `tenantId` | String? | Optional | Tenant context |
| `action` | String | Required | Action type |
| `entityType` | String | Required | Entity name |
| `entityId` | String? | Optional | Entity ID |
| `oldValues` | String? | Optional | Previous state JSON |
| `newValues` | String? | Optional | New state JSON |
| `ipAddress` | String? | Optional | Client IP |
| `userAgent` | String? | Optional | Client info |
| `createdAt` | DateTime | Auto | Timestamp |

**Relations:** User?

---

## Lending Models

### Customer

Borrower/customer profiles.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Customer ID |
| `tenantId` | String | Foreign Key | Owning tenant |
| **Personal** ||||
| `firstName` | String | Required | First name |
| `lastName` | String | Required | Last name |
| `email` | String? | Optional | Email address |
| `phone` | String | Required | Primary contact |
| `alternativePhone` | String? | Optional | Backup phone |
| `dateOfBirth` | DateTime? | Optional | DOB |
| `gender` | Enum? | Optional | Gender |
| `nationality` | String | Default: "Kenyan" | Country |
| `nationalId` | String? | Optional | ID number |
| `kraPin` | String? | Optional | Tax PIN |
| **Employment** ||||
| `employmentStatus` | Enum? | Optional | Employment type |
| `employerName` | String? | Optional | Employer |
| `incomeAmount` | Float? | Optional | Monthly income |
| `incomeFrequency` | Enum? | Optional | Pay frequency |
| `businessName` | String? | Optional | Business name |
| `businessType` | String? | Optional | Business type |
| `registrationNumber` | String? | Optional | Reg number |
| **Address** ||||
| `county` | String? | Optional | County |
| `city` | String? | Optional | City/town |
| `postalAddress` | String? | Optional | Postal |
| `physicalAddress` | String? | Optional | Street address |
| **Banking** ||||
| `bankName` | String? | Optional | Bank name |
| `bankAccount` | String? | Optional | Account number |
| `mpesaPhone` | String? | Optional | M-Pesa phone |
| **Credit Assessment** ||||
| `creditScore` | Int? | Optional | Score (0-1000) |
| `creditScoreDate` | DateTime? | Optional | When scored |
| `crbStatus` | Enum | Default: CLEAN | CRB status |
| `totalBorrowed` | Float | Default: 0 | Lifetime borrowing |
| `totalRepaid` | Float | Default: 0 | Lifetime repayment |
| `outstandingBalance` | Float | Default: 0 | Current balance |
| **Status** ||||
| `status` | Enum | Default: ACTIVE | Account status |
| `riskLevel` | Enum | Default: MEDIUM | Risk category |
| `source` | Enum | Default: WALK_IN | Acquisition source |
| `notes` | String? | Optional | Staff notes |
| `tags` | String | Default: "" | Comma-separated tags |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Loan[], LoanApplication[], KycDocument[], Repayment[]

---

### LoanProduct

Configurable loan products per tenant.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Product ID |
| `tenantId` | String | Foreign Key | Owning tenant |
| `name` | String | Required | Product name |
| `description` | String? | Optional | Description |
| `productCode` | String | Unique | Internal code |
| `category` | Enum | Required | Product category |
| **Amounts** ||||
| `minAmount` | Float | Required | Min loan amount (KSh) |
| `maxAmount` | Float | Required | Max loan amount (KSh) |
| `defaultAmount` | Float? | Optional | Default amount |
| **Interest & Fees** ||||
| `interestType` | Enum | Default: FLAT_RATE | Calculation method |
| `interestRate` | Float | Required | Rate (%) |
| `processingFee` | Float | Default: 0 | Fee amount |
| `processingFeeType` | Enum | Default: FIXED | Fee type |
| `insuranceFee` | Float | Default: 0 | Insurance fee |
| `insuranceFeeType` | Enum | Default: PERCENTAGE | Fee type |
| **Term** ||||
| `minTermDays` | Int | Required | Minimum term |
| `maxTermDays` | Int | Required | Maximum term |
| `defaultTermDays` | Int? | Optional | Default term |
| `repaymentFrequency` | Enum | Default: MONTHLY | Frequency |
| `gracePeriodDays` | Int | Default: 0 | Grace period |
| **Eligibility** ||||
| `eligibilityRules` | String | Default: `{}` | JSON rules |
| `isActive` | Boolean | Default: true | Product available |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Loan[], LoanApplication[]

---

### LoanApplication

Loan application workflow.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Application ID |
| `tenantId` | String | Foreign Key | Tenant |
| `customerId` | String | Foreign Key | Customer |
| `productId` | String | Foreign Key | Product |
| `requestedAmount` | Float | Required | Amount requested |
| `approvedAmount` | Float? | Optional | Amount approved |
| `termDays` | Int | Required | Loan term |
| `purpose` | String? | Optional | Loan purpose |
| **Workflow** ||||
| `status` | Enum | Default: DRAFT | Application status |
| `submittedAt` | DateTime? | Optional | Submission time |
| `reviewedAt` | DateTime? | Optional | Review time |
| `approvedAt` | DateTime? | Optional | Approval time |
| `rejectedAt` | DateTime? | Optional | Rejection time |
| `disbursedAt` | DateTime? | Optional | Disbursement time |
| **Decision** ||||
| `decisionBy` | String? | Optional | Decision maker ID |
| `decisionNotes` | String? | Optional | Notes |
| `rejectionReason` | String? | Optional | Rejection reason |
| **Assessment** ||||
| `creditScore` | Int? | Optional | Calculated score |
| `affordabilityScore` | Float? | Optional | Affordability score |
| `riskRating` | Enum? | Optional | Risk level |
| `autoApproved` | Boolean | Default: false | Auto decision |
| `autoDecisionReason` | String? | Optional | Reason |
| **Workflow Steps** ||||
| `currentStep` | Enum | Default: SUBMISSION | Current step |
| `stepHistory` | String | Default: `[]` | JSON history |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Customer, Product, Loan?, KycDocument[]

---

### Loan

Active and completed loans.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Loan ID |
| `tenantId` | String | Foreign Key | Tenant |
| `customerId` | String | Foreign Key | Customer |
| `applicationId` | String? | Unique | Source application |
| `productId` | String | Foreign Key | Product |
| **Details** ||||
| `loanNumber` | String | Unique | Human-readable ID |
| `principal` | Float | Required | Original principal |
| `approvedAmount` | Float | Required | Disbursed amount |
| `interestRate` | Float | Required | Interest rate |
| `interestType` | Enum | Required | Rate type |
| **Fees** ||||
| `processingFee` | Float | Default: 0 | Processing fee |
| `insuranceFee` | Float | Default: 0 | Insurance fee |
| `otherFees` | Float | Default: 0 | Other fees |
| **Totals** ||||
| `totalInterest` | Float | Default: 0 | Total interest |
| `totalFees` | Float | Default: 0 | Total fees |
| `totalRepayable` | Float | Default: 0 | Total to repay |
| **Term** ||||
| `termDays` | Int | Required | Loan term days |
| `disbursementDate` | DateTime? | Optional | Disbursement date |
| `maturityDate` | DateTime? | Optional | Maturity date |
| **Repayment Tracking** ||||
| `repaidPrincipal` | Float | Default: 0 | Principal repaid |
| `repaidInterest` | Float | Default: 0 | Interest repaid |
| `repaidFees` | Float | Default: 0 | Fees repaid |
| `totalRepaid` | Float | Default: 0 | Total repaid |
| `outstandingBalance` | Float | Required | Balance remaining |
| `nextPaymentDue` | DateTime? | Optional | Next due date |
| `daysInArrears` | Int | Default: 0 | Days overdue |
| **Status** ||||
| `status` | Enum | Default: APPROVED | Loan status |
| `arrearsStatus` | Enum | Default: CURRENT | Arrears bucket |
| **Disbursement** ||||
| `disbursementMethod` | Enum? | Optional | Method used |
| `disbursementReference` | String? | Optional | Transaction ref |
| `disbursementAccount` | String? | Optional | Account credited |
| **Schedule & Collections** ||||
| `repaymentSchedule` | String | Default: `[]` | JSON schedule |
| `assignedCollector` | String? | Optional | Collector ID |
| `collectionNotes` | String? | Optional | Notes |
| `lastCollectionAt` | DateTime? | Optional | Last collection |
| **Closure** ||||
| `closedAt` | DateTime? | Optional | Closure date |
| `closureReason` | String? | Optional | Reason |
| `writtenOffAmount` | Float | Default: 0 | Write-off amount |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Customer, Application?, Product, Transaction[], Repayment[]

---

### Repayment

Loan repayment records.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Payment ID |
| `tenantId` | String | Foreign Key | Tenant |
| `loanId` | String | Foreign Key | Loan |
| `customerId` | String | Foreign Key | Customer |
| **Payment Details** ||||
| `amount` | Float | Required | Total paid |
| `principalPortion` | Float | Default: 0 | Principal part |
| `interestPortion` | Float | Default: 0 | Interest part |
| `feePortion` | Float | Default: 0 | Fees part |
| `penaltyPortion` | Float | Default: 0 | Penalty part |
| **Method** ||||
| `paymentMethod` | Enum | Required | Payment method |
| `referenceNumber` | String? | Optional | External ref |
| `paidBy` | String? | Optional | Payer name/phone |
| **Timing** ||||
| `paymentDate` | DateTime | Required | Payment date |
| `dueDate` | DateTime? | Optional | Due date covered |
| **Status** ||||
| `status` | Enum | Default: COMPLETED | Payment status |
| `reversalReason` | String? | Optional | If reversed |
| `reversedAt` | DateTime? | Optional | Reversal time |
| `reversedBy` | String? | Optional | Who reversed |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Loan, Customer, Transaction[]

---

## Financial Models

### Transaction

Double-entry accounting ledger.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Transaction ID |
| `tenantId` | String | Foreign Key | Tenant |
| **Identity** ||||
| `referenceNumber` | String | Unique | TXN-YYYY-MMDD-NNNNN |
| `transactionType` | Enum | Required | Transaction type |
| `entityType` | Enum | Required | Related entity type |
| `entityId` | String | Required | Related entity ID |
| **Double-Entry** ||||
| `debitAccount` | String | Required | Debit account |
| `creditAccount` | String | Required | Credit account |
| `amount` | Float | Required | Transaction amount |
| `currency` | String | Default: "KES" | Currency code |
| **Description** ||||
| `description` | String? | Optional | Description |
| `narration` | String? | Optional | Narration |
| **Reconciliation** ||||
| `reconciled` | Boolean | Default: false | Reconciled flag |
| `reconciledAt` | DateTime? | Optional | When reconciled |
| `reconciledBy` | String? | Optional | Who reconciled |
| **External** ||||
| `externalRef` | String? | Optional | External reference |
| `metadata` | String | Default: `{}` | Additional data |
| `batchId` | String? | Optional | Batch grouping |
| `occurredAt` | DateTime | Auto | Event time |
| `createdAt` | DateTime | Auto | Record time |

**Relations:** Tenant, Loan?, Repayment?

---

## Supporting Models

### KycDocument

KYC document storage and verification.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Document ID |
| `tenantId` | String | Foreign Key | Tenant |
| `customerId` | String? | Foreign Key | Customer |
| `applicationId` | String? | Foreign Key | Application |
| **Document Info** ||||
| `documentType` | Enum | Required | Document type |
| `documentNumber` | String? | Optional | ID number |
| `issuer` | String? | Optional | Issuing authority |
| `issueDate` | DateTime? | Optional | Issue date |
| `expiryDate` | DateTime? | Optional | Expiry date |
| **File Storage** ||||
| `fileName` | String | Required | File name |
| `fileUrl` | String | Required | Storage URL |
| `fileSize` | Int? | Optional | Size in bytes |
| `mimeType` | String? | Optional | MIME type |
| `hash` | String? | Optional | Integrity hash |
| **Verification** ||||
| `verificationStatus` | Enum | Default: PENDING | Status |
| `verifiedAt` | DateTime? | Optional | Verified time |
| `verifiedBy` | String? | Optional | Verifier |
| `verificationNotes` | String? | Optional | Notes |
| `ocrData` | String? | Optional | OCR extracted data |
| `createdAt` | DateTime | Auto | Created at |
| `updatedAt` | DateTime | Auto | Updated at |

**Relations:** Tenant, Customer?, Application?

---

### Notification

Notification records for all channels.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, CUID | Notification ID |
| `tenantId` | String | Foreign Key | Tenant |
| **Recipient** ||||
| `recipientType` | Enum | Required | Recipient type |
| `recipientId` | String? | Optional | Recipient ID |
| `recipientContact` | String? | Optional | Email/phone |
| **Content** ||||
| `channel` | Enum | Required | Channel |
| `subject` | String | Required | Subject line |
| `body` | String | Required | Message body |
| `templateId` | String? | Optional | Template used |
| `templateData` | String | Default: `{}` | Template variables |
| **Status** ||||
| `status` | Enum | Default: PENDING | Current status |
| `sentAt` | DateTime? | Optional | Sent time |
| `deliveredAt` | DateTime? | Optional | Delivered time |
| `readAt` | DateTime? | Optional | Read time |
| `failedAt` | DateTime? | Optional | Failed time |
| `failureReason` | String? | Optional | Error reason |
| **External** ||||
| `externalId` | String? | Optional | Gateway message ID |
| `scheduledFor` | DateTime? | Optional | Schedule time |
| `createdAt` | DateTime | Auto | Created at |

**Relations:** Tenant

---

## Enums

### Tenant Status
```
ACTIVE, SUSPENDED, TRIAL, PENDING_ONBOARDING, TERMINATED
```

### Tenant Plan
```
STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM
```

### User Role
```
SUPER_ADMIN, TENANT_ADMIN, MANAGER, STAFF, AGENT, VIEWER
```

### Customer Status
```
ACTIVE, INACTIVE, BLACKLISTED, FROZEN, PENDING_VERIFICATION, REJECTED
```

### Risk Level
```
LOW, MEDIUM, HIGH, VERY_HIGH
```

### Loan Status
```
APPROVED, ACTIVE, IN_ARREARS, DEFAULTED, FULLY_PAID, WRITTEN_OFF,
RESTRUCTURED, CANCELLED, DISBURSED, PENDING_DISBURSEMENT
```

### Arrears Status
```
CURRENT, DAYS_1_7, DAYS_8_30, DAYS_31_60, DAYS_61_90, DAYS_91_PLUS
```

### Application Status
```
DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, CONDITIONALLY_APPROVED,
REJECTED, CANCELLED, WITHDRAWN, DISBURSED, DISBURSEMENT_FAILED
```

### Application Step
```
SUBMISSION, KYC_VERIFICATION, CREDIT_ASSESSMENT, AFFORDABILITY_CHECK,
MANUAL_REVIEW, MANAGER_APPROVAL, DOCUMENT_SIGNING,
DISBURSEMENT_PREPARATION, DISBURSED, COMPLETED, CANCELLED
```

### Payment Method
```
MPESA, BANK_TRANSFER, PESALINK, CASH, CHECK, CARD,
AUTO_PAY, DIRECT_DEDUCT, OTHER
```

### Transaction Type
```
DISBURSEMENT, REPAYMENT_PRINCIPAL, REPAYMENT_INTEREST,
FEE_CHARGED, FEE_COLLECTED, PENALTY_CHARGED, PENALTY_COLLECTED,
WRITE_OFF, REVERSAL, ADJUSTMENT, REFUND, INTEREST_ACCRUAL,
BALANCE_BRING_FORWARD
```

### Notification Channel
```
SMS, EMAIL, WHATSAPP, PUSH, IN_APP, USSD
```

---

## Indexes

### Single Column Indexes

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| Tenant | slug | Fast tenant lookup by slug |
| Tenant | status | Filter by status |
| User | tenantId | Filter users by tenant |
| User | email | Login lookup |
| User | role | Filter by role |
| User | phone | Phone login |
| Customer | tenantId | Filter by tenant |
| Customer | phone | Phone lookup |
| Customer | nationalId | ID lookup |
| Customer | status | Status filter |
| Customer | riskLevel | Risk filter |
| LoanProduct | tenantId | Filter by tenant |
| LoanProduct | isActive | Active products only |
| LoanProduct | category | Category filter |
| LoanApplication | tenantId | Filter by tenant |
| LoanApplication | customerId | Customer's applications |
| LoanApplication | status | Status filter |
| LoanApplication | currentStep | Workflow filter |
| Loan | tenantId | Filter by tenant |
| Loan | customerId | Customer's loans |
| Loan | status | Status filter |
| Loan | arrearsStatus | Arrears filter |
| Loan | loanNumber | Loan number lookup |
| Loan | disbursementDate | Date range queries |
| Repayment | tenantId | Filter by tenant |
| Repayment | loanId | Loan's repayments |
| Repayment | paymentDate | Date range queries |
| Repayment | status | Status filter |
| Repayment | referenceNumber | Reference lookup |
| Transaction | tenantId | Filter by tenant |
| Transaction | transactionType | Type filter |
| Transaction | entityType + entityId | Entity lookup |
| Transaction | occurredAt | Date range queries |
| Transaction | externalRef | External ref lookup |
| KycDocument | tenantId | Filter by tenant |
| KycDocument | customerId | Customer docs |
| KycDocument | applicationId | Application docs |
| KycDocument | verificationStatus | Status filter |
| Notification | tenantId | Filter by tenant |
| Notification | status | Status filter |
| Notification | channel | Channel filter |
| Notification | scheduledFor | Scheduled queries |
| Session | userId | User sessions |
| Session | tokenHash | Token lookup |
| Session | isActive | Active sessions |
| Session | expiresAt | Cleanup queries |
| AuditLog | userId | User actions |
| AuditLog | tenantId | Tenant audit |
| AuditLog | entityType | Entity filter |
| AuditLog | createdAt | Time range |

---

## Relationships

### One-to-Many

| Parent | Child | Relation | Cascade |
|--------|-------|----------|---------|
| Tenant | User | 1:N | No |
| Tenant | Customer | 1:N | No |
| Tenant | LoanProduct | 1:N | No |
| Tenant | Loan | 1:N | No |
| Tenant | LoanApplication | 1:N | No |
| Tenant | Transaction | 1:N | No |
| Tenant | Repayment | 1:N | No |
| Tenant | KycDocument | 1:N | No |
| Tenant | Notification | 1:N | No |
| User | Session | 1:N | Yes |
| User | AuditLog | 1:N | No |
| Customer | Loan | 1:N | No |
| Customer | LoanApplication | 1:N | No |
| Customer | KycDocument | 1:N | No |
| Customer | Repayment | 1:N | No |
| LoanProduct | Loan | 1:N | No |
| LoanProduct | LoanApplication | 1:N | No |
| Loan | Transaction | 1:N | No |
| Loan | Repayment | 1:N | No |
| LoanApplication | KycDocument | 1:N | No |
| Repayment | Transaction | 1:N | No |

### One-to-One

| Entity A | Entity B | Relation |
|---------|----------|----------|
| Loan | LoanApplication | Optional (via applicationId) |

### Many-to-Many (Implicit via foreign keys)

- Users can access multiple Tenants (via tenantId on User)
- Customers belong to exactly one Tenant

---

*Last updated: 2025-01-15*
