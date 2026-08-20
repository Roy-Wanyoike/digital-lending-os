# Digital Lending OS - API Documentation

<div align="center">

**Complete REST API Reference for Developers**

Version 2.0.0 | Base URL: `http://localhost:3000/api`

[Authentication](#authentication) • [Tenants](#tenants-api) • [Customers](#customers-api) • [Applications](#applications-api) • [Loans](#loans-api) • [Products](#products-api) • [Dashboard](#dashboard-api)

</div>

---

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Pagination](#pagination)
- [Tenants API](#tenants-api)
- [Customers API](#customers-api)
- [Applications API](#applications-api)
- [Loans API](#loans-api)
- [Products API](#products-api)
- [Dashboard API](#dashboard-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Introduction

The Digital Lending OS API is a RESTful JSON API that provides complete access to all platform functionality. All endpoints return JSON responses and follow standard HTTP conventions.

### Base URL

```
Development: http://localhost:3000/api
Production: https://api.digitallendingos.co.ke/api
```

### Content Type

All requests must include:

```
Content-Type: application/json
```

---

## Authentication

> **Note:** Authentication middleware is planned for future implementation. Currently, APIs use tenant-based isolation via `tenantId` parameter.

### Future Auth Headers

```http
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_id>
```

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request (validation error) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `500` | Internal server error |

---

## Pagination

List endpoints support pagination using query parameters:

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 50 | Items per page (max: 100) |

### Pagination Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## Tenants API

Manage DCP organizations on the platform.

### List All Tenants

**`GET /api/tenants`**

Retrieve a paginated list of all tenants.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50) |
| `search` | string | No | Search by name, slug, or company name |
| `status` | string | No | Filter by status (`ACTIVE`, `SUSPENDED`, `TRIAL`, etc.) |
| `plan` | string | No | Filter by plan (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/tenants?page=1&limit=10&status=ACTIVE" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxx",
      "name": "Abepot Credit",
      "slug": "abepot",
      "companyName": "Abepot Credit Limited",
      "licenseNumber": "DCP-2024-0142",
      "phone": "+254700123456",
      "email": "admin@abepot.co.ke",
      "status": "ACTIVE",
      "plan": "STARTER",
      "monthlyFee": 5000,
      "transactionRate": 1.5,
      "createdAt": "2024-03-15T00:00:00.000Z",
      "_count": {
        "users": 3,
        "customers": 45,
        "loans": 120,
        "loanApplications": 150
      }
    },
    {
      "id": "clyyyyyyy",
      "name": "Fabilo Credit",
      "slug": "fabilo",
      "companyName": "Fabilo Financial Services Ltd",
      "licenseNumber": "DCP-2023-0089",
      "phone": "+254711234567",
      "email": "info@fabilo.com",
      "status": "ACTIVE",
      "plan": "PROFESSIONAL",
      "monthlyFee": 15000,
      "transactionRate": 1.0,
      "createdAt": "2023-11-20T00:00:00.000Z",
      "_count": {
        "users": 8,
        "customers": 230,
        "loans": 580,
        "loanApplications": 720
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "pages": 1
  }
}
```

---

### Create Tenant

**`POST /api/tenants`**

Create a new tenant organization.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name (e.g., "Abepot Credit") |
| `slug` | string | Yes | URL-safe identifier (unique, e.g., "abepot") |
| `companyName` | string | Yes | Legal registered company name |
| `licenseNumber` | string | No | CBK license number |
| `phone` | string | Yes | Primary contact phone |
| `email` | string | Yes | Primary email address |
| `physicalAddress` | string | No | Physical office address |
| `website` | string | No | Company website URL |
| `plan` | string | No | Plan type (default: `STARTER`) |
| `status` | string | No | Initial status (default: `PENDING_ONBOARDING`) |
| `branding` | object/string | No | Branding configuration JSON |
| `config` | object/string | No | Business rules configuration JSON |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New DCP Limited",
    "slug": "newdcp",
    "companyName": "New DCP Limited",
    "licenseNumber": "DCP-2025-0001",
    "phone": "+254712345678",
    "email": "admin@newdcp.co.ke",
    "physicalAddress": "Nairobi, Kenya",
    "website": "https://www.newdcp.co.ke",
    "plan": "PROFESSIONAL",
    "branding": {
      "primaryColor": "#1a56db",
      "secondaryColor": "#7c3aed"
    }
  }'
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clzzzzzzz",
    "name": "New DCP Limited",
    "slug": "newdcp",
    "companyName": "New DCP Limited",
    "licenseNumber": "DCP-2025-0001",
    "phone": "+254712345678",
    "email": "admin@newdcp.co.ke",
    "physicalAddress": "Nairobi, Kenya",
    "website": "https://www.newdcp.co.ke",
    "status": "PENDING_ONBOARDING",
    "plan": "PROFESSIONAL",
    "monthlyFee": 15000,
    "transactionRate": 1.0,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error |
|--------|-------|
| `400` | Missing required fields: name, slug, companyName, phone, email |
| `409` | A tenant with this slug already exists |

---

### Get Single Tenant

**`GET /api/tenants/:id`**

Retrieve detailed information about a specific tenant.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Tenant unique ID |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/tenants/clxxxxxxx" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxx",
    "name": "Abepot Credit",
    "slug": "abepot",
    "companyName": "Abepot Credit Limited",
    "licenseNumber": "DCP-2024-0142",
    "phone": "+254700123456",
    "email": "admin@abepot.co.ke",
    "status": "ACTIVE",
    "plan": "STARTER",
    "createdAt": "2024-03-15T00:00:00.000Z",
    "users": [
      {
        "id": "user_001",
        "email": "admin@abepot.co.ke",
        "name": "John Admin",
        "role": "TENANT_ADMIN",
        "isActive": true,
        "lastLoginAt": "2026-01-14T08:00:00.000Z"
      }
    ],
    "_count": {
      "users": 3,
      "customers": 45,
      "loans": 120,
      "loanApplications": 150,
      "loanProducts": 5
    }
  }
}
```

---

### Update Tenant

**`PUT /api/tenants/:id`**

Update tenant information.

#### Updatable Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `slug` | string | URL identifier (must be unique) |
| `companyName` | string | Legal company name |
| `licenseNumber` | string | CBK license |
| `phone` | string | Phone number |
| `email` | string | Email address |
| `physicalAddress` | string | Office address |
| `website` | string | Website URL |
| `status` | string | Tenant status |
| `plan` | string | Subscription plan |
| `branding` | object/string | Branding config |
| `config` | object/string | Business config |
| `monthlyFee` | number | Monthly fee amount |
| `transactionRate` | number | Transaction fee rate |

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/tenants/clxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE",
    "plan": "PROFESSIONAL",
    "monthlyFee": 15000
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxx",
    "name": "Abepot Credit",
    "status": "ACTIVE",
    "plan": "PROFESSIONAL",
    "monthlyFee": 15000,
    "...": "..."
  }
}
```

---

### Delete/Terminate Tenant

**`DELETE /api/tenants/:id`**

Soft-delete a tenant by marking as terminated.

> **Warning:** This action sets status to `TERMINATED`. Data is preserved but tenant cannot operate.

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/tenants/clxxxxxxx" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "message": "Tenant has been terminated"
}
```

---

## Customers API

Manage borrower/customer records.

### List Customers

**`GET /api/customers`**

Retrieve customers for a specific tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Filter by tenant |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 50) |
| `search` | string | No | Search by name, phone, email, national ID |
| `status` | string | No | Filter by status (`ACTIVE`, `INACTIVE`, etc.) |
| `riskLevel` | string | No | Filter by risk level (`LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`) |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/customers?tenantId=clxxxxxxx&page=1&limit=20&status=ACTIVE" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "cust_001",
      "tenantId": "clxxxxxxx",
      "firstName": "Wanjiku",
      "lastName": "Mwangi",
      "email": "wanjiku.m@email.com",
      "phone": "+254712345678",
      "nationalId": "12345678",
      "employmentStatus": "EMPLOYED",
      "county": "Nairobi",
      "creditScore": 720,
      "crbStatus": "CLEAN",
      "status": "ACTIVE",
      "riskLevel": "LOW",
      "totalBorrowed": 150000,
      "totalRepaid": 135000,
      "outstandingBalance": 15000,
      "createdAt": "2025-06-15T00:00:00.000Z",
      "_count": {
        "loans": 3,
        "loanApplications": 4,
        "repayments": 18
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### Create Customer

**`POST /api/customers`**

Register a new customer/borrower.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | **Yes** | Owner tenant ID |
| `firstName` | string | **Yes** | First name |
| `lastName` | string | **Yes** | Last name |
| `phone` | string | **Yes** | Primary phone (M-Pesa registered) |
| `email` | string | No | Email address |
| `alternativePhone` | string | No | Alternative contact |
| `dateOfBirth` | string | No | Date of birth (ISO 8601) |
| `gender` | string | No | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |
| `nationalId` | string | No | National ID number |
| `kraPin` | string | No | KRA PIN |
| `employmentStatus` | string | No | Employment status enum |
| `employerName` | string | No | Employer name |
| `incomeAmount` | number | No | Monthly income |
| `incomeFrequency` | string | No | Income frequency |
| `businessName` | string | No | Business name (if self-employed) |
| `county` | string | No | County of residence |
| `city` | string | No | City/town |
| `bankName` | string | No | Bank name |
| `bankAccount` | string | No | Bank account number |
| `mpesaPhone` | string | No | M-Pesa registered phone |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "firstName": "Achieng",
    "lastName": "Otieno",
    "phone": "+254723456789",
    "email": "achieng.o@email.com",
    "nationalId": "87654321",
    "employmentStatus": "SELF_EMPLOYED",
    "businessName": "Achieng Enterprises",
    "incomeAmount": 45000,
    "incomeFrequency": "MONTHLY",
    "county": "Kisumu",
    "city": "Kisumu City"
  }'
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "cust_new",
    "tenantId": "clxxxxxxx",
    "firstName": "Achieng",
    "lastName": "Otieno",
    "phone": "+254723456789",
    "email": "achieng.o@email.com",
    "nationalId": "87654321",
    "employmentStatus": "SELF_EMPLOYED",
    "businessName": "Achieng Enterprises",
    "county": "Kisumu",
    "status": "ACTIVE",
    "riskLevel": "MEDIUM",
    "createdAt": "2026-01-15T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Error |
|--------|-------|
| `400` | Missing required fields / tenantId required |
| `404` | Tenant not found |
| `409` | Customer with this phone already exists in tenant |

---

### Get Customer Details

**`GET /api/customers/:id`**

Get full customer details with loan history.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant ID for access control |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/customers/cust_001?tenantId=clxxxxxxx" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "cust_001",
    "firstName": "Wanjiku",
    "lastName": "Mwangi",
    "phone": "+254712345678",
    "email": "wanjiku.m@email.com",
    "nationalId": "12345678",
    "creditScore": 720,
    "crbStatus": "CLEAN",
    "status": "ACTIVE",
    "riskLevel": "LOW",
    "totalBorrowed": 150000,
    "totalRepaid": 135000,
    "outstandingBalance": 15000,
    "loans": [
      {
        "id": "loan_001",
        "loanNumber": "LN-2026-000042",
        "principal": 50000,
        "outstandingBalance": 10000,
        "status": "ACTIVE"
      }
    ],
    "loanApplications": [...],
    "_count": {
      "loans": 2,
      "loanApplications": 3,
      "repayments": 15,
      "kycDocuments": 2
    }
  }
}
```

---

### Update Customer

**`PUT /api/customers/:id`**

Update customer information.

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/customers/cust_001" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "employmentStatus": "BUSINESS_OWNER",
    "incomeAmount": 75000,
    "creditScore": 750,
    "notes": "Promoted to business owner"
  }'
```

---

## Applications API

Manage loan applications through their lifecycle.

### List Applications

**`GET /api/applications`**

Retrieve loan applications for a tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Filter by tenant |
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |
| `status` | string | No | Filter by status |
| `customerId` | string | No | Filter by customer |

#### Application Status Values

| Status | Description |
|--------|-------------|
| `DRAFT` | Initial draft, not submitted |
| `SUBMITTED` | Submitted for review |
| `UNDER_REVIEW` | Being reviewed by staff |
| `APPROVED` | Approved, awaiting disbursement |
| `CONDITIONALLY_APPROVED` | Approved with conditions |
| `REJECTED` | Application rejected |
| `CANCELLED` | Cancelled by applicant |
| `WITHDRAWN` | Withdrawn by applicant |
| `DISBURSED` | Funds disbursed |
| `DISBURSEMENT_FAILED` | Disbursement failed |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/applications?tenantId=clxxxxxxx&status=SUBMITTED" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "app_001",
      "tenantId": "clxxxxxxx",
      "customerId": "cust_001",
      "productId": "prod_001",
      "requestedAmount": 50000,
      "approvedAmount": null,
      "termDays": 90,
      "purpose": "Business expansion",
      "status": "SUBMITTED",
      "currentStep": "CREDIT_ASSESSMENT",
      "submittedAt": "2026-01-14T09:00:00.000Z",
      "customer": {
        "id": "cust_001",
        "firstName": "Wanjiku",
        "lastName": "Mwangi",
        "phone": "+254712345678"
      },
      "product": {
        "id": "prod_001",
        "name": "Business Loan",
        "category": "BUSINESS_LOAN"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "pages": 1
  }
}
```

---

### Create Application

**`POST /api/applications`**

Submit a new loan application.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | **Yes** | Owner tenant ID |
| `customerId` | string | **Yes** | Borrower customer ID |
| `productId` | string | **Yes** | Loan product ID |
| `requestedAmount` | number | **Yes** | Amount requested (KSh) |
| `termDays` | integer | **Yes** | Loan term in days |
| `purpose` | string | No | Loan purpose description |

#### Validation Rules

- `requestedAmount` must be within product's `minAmount` and `maxAmount`
- `termDays` must be within product's `minTermDays` and `maxTermDays`
- Product must be active and belong to the same tenant
- Customer must exist and belong to the same tenant

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "customerId": "cust_001",
    "productId": "prod_001",
    "requestedAmount": 50000,
    "termDays": 90,
    "purpose": "Working capital for inventory"
  }'
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "app_new",
    "tenantId": "clxxxxxxx",
    "customerId": "cust_001",
    "productId": "prod_001",
    "requestedAmount": 50000,
    "termDays": 90,
    "purpose": "Working capital for inventory",
    "status": "DRAFT",
    "currentStep": "SUBMISSION",
    "stepHistory": "[{\"step\":\"SUBMISSION\",\"enteredAt\":\"...\",\"by\":\"system\"}]",
    "customer": {
      "id": "cust_001",
      "firstName": "Wanjiku",
      "lastName": "Mwangi",
      "phone": "+254712345678"
    },
    "product": {
      "id": "prod_001",
      "name": "Business Loan",
      "category": "BUSINESS_LOAN",
      "interestRate": 8.5
    }
  }
}
```

---

### Get Application Details

**`GET /api/applications/:id`**

Get full application details including workflow history.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant ID for access control |

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "app_001",
    "status": "UNDER_REVIEW",
    "currentStep": "MANUAL_REVIEW",
    "parsedStepHistory": [
      {"step": "SUBMISSION", "enteredAt": "2026-01-14T09:00:00Z", "by": "system"},
      {"step": "KYC_VERIFICATION", "enteredAt": "2026-01-14T09:05:00Z", "exitedAt": "2026-01-14T09:30:00Z", "by": "system"},
      {"step": "CREDIT_ASSESSMENT", "enteredAt": "2026-01-14T09:31:00Z", "exitedAt": "2026-01-14T10:00:00Z", "by": "system"},
      {"step": "MANUAL_REVIEW", "enteredAt": "2026-01-14T10:01:00Z", "by": "system"}
    ],
    "customer": {...},
    "product": {...},
    "documents": [...],
    "loan": null
  }
}
```

---

### Update Application (Approve/Reject)

**`PUT /api/applications/:id`**

Update application status, primarily used for approval/rejection actions.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant ID |
| `action` | string | **Yes** | Action: `approve` or `reject` |
| `decisionBy` | string | No | User ID making decision |
| `decisionNotes` | string | No | Decision notes |
| `approvedAmount` | number | No | Approved amount (for approval) |
| `rejectionReason` | string | No | Reason for rejection |

#### Approve Example

```bash
curl -X PUT "http://localhost:3000/api/applications/app_001" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "action": "approve",
    "decisionBy": "user_admin_001",
    "decisionNotes": "Good credit history, stable income",
    "approvedAmount": 50000
  }'
```

#### Reject Example

```bash
curl -X PUT "http://localhost:3000/api/applications/app_002" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "action": "reject",
    "decisionBy": "user_admin_001",
    "rejectionReason": "High debt-to-income ratio",
    "decisionNotes": "Customer has existing loans totaling 80% of income"
  }'
```

#### Approval Response

```json
{
  "success": true,
  "data": {
    "id": "app_001",
    "status": "APPROVED",
    "approvedAmount": 50000,
    "approvedAt": "2026-01-15T10:30:00.000Z",
    "reviewedAt": "2026-01-15T10:30:00.000Z",
    "currentStep": "DISBURSEMENT_PREPARATION"
  },
  "message": "Application has been approved successfully"
}
```

---

## Loans API

Manage active and completed loans.

### List Loans

**`GET /api/loans`**

Retrieve loans for a tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Filter by tenant |
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |
| `status` | string | No | Filter by loan status |
| `customerId` | string | No | Filter by customer |
| `arrearsStatus` | string | No | Filter by arrears status |

#### Loan Status Values

| Status | Description |
|--------|-------------|
| `APPROVED` | Approved, pending disbursement |
| `ACTIVE` | Currently active loan |
| `IN_ARREARS` | In arrears (missed payments) |
| `DEFAULTED` | Defaulted (90+ days arrears) |
| `FULLY_PAID` | Completely repaid |
| `WRITTEN_OFF` | Written off as bad debt |
| `RESTRUCTURED` | Terms restructured |
| `CANCELLED` | Cancelled |
| `DISBURSED` | Funds disbursed |
| `PENDING_DISBURSEMENT` | Awaiting disbursement |

#### Arrears Status Values

| Status | Description |
|--------|-------------|
| `CURRENT` | Up to date |
| `DAYS_1_7` | 1-7 days late |
| `DAYS_8_30` | 8-30 days late |
| `DAYS_31_60` | 31-60 days late |
| `DAYS_61_90` | 61-90 days late |
| `DAYS_91_PLUS` | 91+ days late |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/loans?tenantId=clxxxxxxx&status=ACTIVE&page=1&limit=20" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "loan_001",
      "tenantId": "clxxxxxxx",
      "customerId": "cust_001",
      "applicationId": "app_001",
      "productId": "prod_001",
      "loanNumber": "LN-2026-000042",
      "principal": 50000,
      "approvedAmount": 50000,
      "interestRate": 8.5,
      "interestType": "FLAT_RATE",
      "processingFee": 500,
      "insuranceFee": 250,
      "totalInterest": 1275,
      "totalFees": 750,
      "totalRepayable": 52025,
      "termDays": 90,
      "disbursementDate": "2026-01-15T00:00:00.000Z",
      "maturityDate": "2026-04-15T00:00:00.000Z",
      "outstandingBalance": 52025,
      "status": "ACTIVE",
      "arrearsStatus": "CURRENT",
      "disbursementMethod": "MPESA",
      "disbursementAccount": "+254712345678",
      "customer": {
        "id": "cust_001",
        "firstName": "Wanjiku",
        "lastName": "Mwangi",
        "phone": "+254712345678"
      },
      "product": {
        "id": "prod_001",
        "name": "Business Loan",
        "category": "BUSINESS_LOAN"
      },
      "_count": {
        "repayments": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "pages": 5
  }
}
```

---

### Create Loan

**`POST /api/loans`**

Create a new loan from an approved application.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | **Yes** | Owner tenant ID |
| `customerId` | string | **Yes** | Borrower customer ID |
| `applicationId` | string | No | Source application ID |
| `productId` | string | **Yes** | Loan product ID |
| `principal` | number | **Yes** | Principal amount |
| `approvedAmount` | number | No | Actual disbursed amount |
| `interestRate` | number | **Yes** | Interest rate (%) |
| `interestType` | string | No | Rate type (default: `FLAT_RATE`) |
| `termDays` | integer | **Yes** | Loan term in days |
| `processingFee` | number | No | Processing fee (default: 0) |
| `insuranceFee` | number | No | Insurance fee (default: 0) |
| `disbursementMethod` | string | No | Method (default: `MPESA`) |
| `disbursementAccount` | string | No | Recipient account/phone |

#### Interest Types

| Type | Description |
|------|-------------|
| `FLAT_RATE` | Simple interest on principal |
| `REDUCING_BALANCE` | Interest on outstanding balance |
| `AMORTIZED` | Equal installments (principal + interest) |

#### Disbursement Methods

| Method | Description |
|--------|-------------|
| `MPESA` | M-Pesa mobile money transfer |
| `BANK_TRANSFER` | Bank account transfer |
| `PESALINK` | PesaLink instant transfer |
| `CASH` | Cash disbursement |
| `CHECK` | Cheque payment |
| `OTHER` | Other method |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/loans" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "customerId": "cust_001",
    "applicationId": "app_001",
    "productId": "prod_001",
    "principal": 50000,
    "approvedAmount": 50000,
    "interestRate": 8.5,
    "interestType": "FLAT_RATE",
    "termDays": 90,
    "processingFee": 500,
    "insuranceFee": 250,
    "disbursementMethod": "MPESA",
    "disbursementAccount": "+254712345678"
  }'
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "loan_new",
    "loanNumber": "LN-2026-000086",
    "principal": 50000,
    "approvedAmount": 50000,
    "interestRate": 8.5,
    "totalRepayable": 52025,
    "outstandingBalance": 52025,
    "status": "APPROVED",
    "arrearsStatus": "CURRENT",
    "disbursementMethod": "MPESA",
    "repaymentSchedule": "[{\"installmentNo\":1,\"dueDate\":\"...\",\"principal\":16675,\"interest\":354.17,\"fees\":0,\"total\":17029.17,\"status\":\"PENDING\"},...]"
  }
}
```

---

### Get Loan Details

**`GET /api/loans/:id`**

Get full loan details with repayment schedule and transaction history.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Tenant ID for access control |

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "loan_001",
    "loanNumber": "LN-2026-000042",
    "principal": 50000,
    "outstandingBalance": 35000,
    "status": "ACTIVE",
    "arrearsStatus": "CURRENT",
    "daysInArrears": 0,
    "parsedRepaymentSchedule": [
      {
        "installmentNo": 1,
        "dueDate": "2026-02-15",
        "principal": 16666.67,
        "interest": 354.17,
        "fees": 250,
        "total": 17270.84,
        "status": "PAID"
      },
      {
        "installmentNo": 2,
        "dueDate": "2026-03-15",
        "principal": 16666.67,
        "interest": 354.17,
        "fees": 250,
        "total": 17270.84,
        "status": "PENDING"
      },
      {
        "installmentNo": 3,
        "dueDate": "2026-04-15",
        "principal": 16666.66,
        "interest": 354.16,
        "fees": 250,
        "total": 17270.82,
        "status": "SCHEDULED"
      }
    ],
    "customer": {...},
    "product": {...},
    "repayments": [
      {
        "id": "rep_001",
        "amount": 17270.84,
        "paymentMethod": "MPESA",
        "referenceNumber": "QJ46G1X8MN",
        "paymentDate": "2026-02-15T10:00:00.000Z",
        "status": "COMPLETED"
      }
    ],
    "transactions": [...]
  }
}
```

---

### Update Loan

**`PUT /api/loans/:id`**

Update loan status, repayment tracking, or collection info.

#### Updatable Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Loan status update |
| `arrearsStatus` | string | Arrears status |
| `disbursementDate` | string | Actual disbursement date |
| `maturityDate` | string | Updated maturity date |
| `repaidPrincipal` | number | Total principal repaid |
| `repaidInterest` | number | Total interest repaid |
| `totalRepaid` | number | Total amount repaid |
| `outstandingBalance` | number | Current balance |
| `daysInArrears` | integer | Days past due |
| `disbursementReference` | string | Transaction reference |
| `assignedCollector` | string | Assigned collector user ID |
| `collectionNotes` | string | Collection notes |
| `closedAt` | string | Closure date |
| `closureReason` | string | Reason for closure |
| `writtenOffAmount` | number | Amount written off |
| `repaymentSchedule` | array/object | Updated schedule |

#### Example: Record Disbursement

```bash
curl -X PUT "http://localhost:3000/api/loans/loan_001" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "status": "ACTIVE",
    "disbursementDate": "2026-01-16T09:00:00.000Z",
    "disbursementReference": "QJ46G1X8MN"
  }'
```

---

## Products API

Manage loan products configured per tenant.

### List Products

**`GET /api/products`**

Get loan products for a tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | **Yes** | Filter by tenant |
| `category` | string | No | Filter by category |
| `isActive` | boolean | No | Filter active/inactive only |

#### Product Categories

| Category | Description |
|----------|-------------|
| `PERSONAL_LOAN` | Personal use loans |
| `BUSINESS_LOAN` | Business financing |
| `SME_LOAN` | Small-medium enterprise |
| `SALARY_ADVANCE` | Short-term salary advance |
| `ASSET_FINANCE` | Vehicle/equipment finance |
| `EMERGENCY_LOAN` | Emergency funding |
| `SCHOOL_FEES` | Education financing |
| `INVOICE_FINANCING` | Invoice-based lending |
| `LOGBOOK_LOAN` | Logbook-secured loan |
| `SUPPLY_CHAIN` | Supply chain financing |
| `OTHER` | Other categories |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/products?tenantId=clxxxxxxx&isActive=true" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "prod_001",
      "tenantId": "clxxxxxxx",
      "name": "Quick Personal Loan",
      "description": "Fast personal loans for emergencies",
      "productCode": "PL-001",
      "category": "PERSONAL_LOAN",
      "minAmount": 1000,
      "maxAmount": 100000,
      "defaultAmount": 25000,
      "interestType": "FLAT_RATE",
      "interestRate": 10.0,
      "processingFee": 200,
      "processingFeeType": "FIXED",
      "insuranceFee": 1.5,
      "insuranceFeeType": "PERCENTAGE",
      "minTermDays": 7,
      "maxTermDays": 180,
      "defaultTermDays": 30,
      "repaymentFrequency": "MONTHLY",
      "gracePeriodDays": 0,
      "isActive": true,
      "_count": {
        "loans": 45,
        "applications": 62
      }
    },
    {
      "id": "prod_002",
      "name": "Business Expansion Loan",
      "productCode": "BL-001",
      "category": "BUSINESS_LOAN",
      "minAmount": 50000,
      "maxAmount": 500000,
      "interestRate": 8.5,
      "minTermDays": 90,
      "maxTermDays": 365,
      "isActive": true,
      "_count": {
        "loans": 28,
        "applications": 35
      }
    }
  ]
}
```

---

### Create Product

**`POST /api/products`**

Create a new loan product for a tenant.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string | **Yes** | Owner tenant ID |
| `name` | string | **Yes** | Product display name |
| `description` | string | No | Product description |
| `productCode` | string | **Yes** | Unique product code (e.g., "PL-001") |
| `category` | string | **Yes** | Product category |
| `minAmount` | number | **Yes** | Minimum loan amount (KSh) |
| `maxAmount` | number | **Yes** | Maximum loan amount (KSh) |
| `defaultAmount` | number | No | Default suggested amount |
| `interestType` | string | No | Interest type (default: `FLAT_RATE`) |
| `interestRate` | number | **Yes** | Interest rate (%) |
| `processingFee` | number | No | Processing fee (default: 0) |
| `processingFeeType` | string | No | Fee type (default: `FIXED`) |
| `insuranceFee` | number | No | Insurance fee (default: 0) |
| `insuranceFeeType` | string | No | Fee type (default: `PERCENTAGE`) |
| `minTermDays` | integer | **Yes** | Minimum term (days) |
| `maxTermDays` | integer | **Yes** | Maximum term (days) |
| `defaultTermDays` | integer | No | Default term (days) |
| `repaymentFrequency` | string | No | Frequency (default: `MONTHLY`) |
| `gracePeriodDays` | integer | No | Grace period (default: 0) |
| `eligibilityRules` | object | No | Eligibility criteria JSON |

#### Repayment Frequencies

| Frequency | Description |
|-----------|-------------|
| `DAILY` | Daily repayments |
| `WEEKLY` | Weekly repayments |
| `BI_WEEKLY` | Every two weeks |
| `MONTHLY` | Monthly repayments |
| `BULLET` | Single payment at end |
| `CUSTOM` | Custom schedule |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxxxxxx",
    "name": "Salary Advance Plus",
    "description": "Quick salary-based advances for employed individuals",
    "productCode": "SA-003",
    "category": "SALARY_ADVANCE",
    "minAmount": 5000,
    "maxAmount": 75000,
    "defaultAmount": 25000,
    "interestType": "FLAT_RATE",
    "interestRate": 7.5,
    "processingFee": 300,
    "processingFeeType": "FIXED",
    "insuranceFee": 0,
    "insuranceFeeType": "PERCENTAGE",
    "minTermDays": 7,
    "maxTermDays": 30,
    "defaultTermDays": 30,
    "repaymentFrequency": "BULLET",
    "gracePeriodDays": 0,
    "eligibilityRules": {
      "minCreditScore": 600,
      "minIncome": 25000,
      "requiredEmploymentStatus": ["EMPLOYED"],
      "requiredDocuments": ["PAYSLIP", "BANK_STATEMENT"]
    }
  }'
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "prod_new",
    "tenantId": "clxxxxxxx",
    "name": "Salary Advance Plus",
    "productCode": "SA-003",
    "category": "SALARY_ADVANCE",
    "minAmount": 5000,
    "maxAmount": 75000,
    "interestRate": 7.5,
    "minTermDays": 7,
    "maxTermDays": 30,
    "isActive": true,
    "createdAt": "2026-01-15T12:00:00.000Z"
  }
}
```

---

## Dashboard API

### Get Dashboard Statistics

**`GET /api/dashboard/stats`**

Comprehensive statistics for platform overview or tenant-specific dashboards.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | No | Omit for platform-wide stats |

#### Behavior

- **Without `tenantId`**: Returns aggregated platform-wide statistics (Super Admin view)
- **With `tenantId`**: Returns tenant-specific statistics (Lender Dashboard view)
- **Special values**: `platform` or `superadmin` also returns platform-wide stats

---

### Platform-Wide Statistics (Super Admin)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/dashboard/stats" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "platform": {
      "totalTenants": 8,
      "activeTenants": 7,
      "trialTenants": 0,
      "suspendedTenants": 1
    },
    "overview": {
      "totalCustomers": 1245,
      "totalLoans": 3420,
      "totalLoanBook": 840000000,
      "totalOutstandingBalance": 520000000,
      "activeLoans": 182432,
      "par30": 7650,
      "par30Ratio": 4.2
    },
    "collections": {
      "today": {
        "amount": 12500000,
        "count": 2450
      },
      "thisMonth": {
        "amount": 185000000,
        "count": 42000
      }
    },
    "applications": {
      "pending": 340,
      "approvedToday": 85,
      "rejectedToday": 23
    },
    "disbursements": {
      "thisMonth": {
        "amount": 95000000,
        "count": 3200
      }
    },
    "planDistribution": {
      "STARTER": 3,
      "PROFESSIONAL": 3,
      "ENTERPRISE": 2
    },
    "statusDistribution": {
      "ACTIVE": 7,
      "SUSPENDED": 1
    },
    "loanStatusDistribution": {
      "ACTIVE": 1520,
      "FULLY_PAID": 1450,
      "IN_ARREARS": 280,
      "DEFAULTED": 120,
      "APPROVED": 50
    },
    "topTenantsByVolume": [
      {
        "tenantId": "clxxxxxxx",
        "tenantName": "Signature Capital",
        "tenantSlug": "signaturecapital",
        "loanCount": 1250,
        "totalPrincipal": 350000000,
        "outstandingBalance": 220000000
      },
      {
        "tenantId": "clyyyyyyy",
        "tenantName": "Fabilo Credit",
        "tenantSlug": "fabilo",
        "loanCount": 850,
        "totalPrincipal": 180000000,
        "outstandingBalance": 120000000
      }
    ],
    "recentActivity": [
      {
        "type": "LOAN_DISBURSED",
        "description": "Loan LN-2026-000142 disbursed to Mary Kamau",
        "amount": 75000,
        "timestamp": "2026-01-15T10:30:00.000Z"
      },
      {
        "type": "APPLICATION_APPROVED",
        "description": "Loan application approved - John Ochieng",
        "amount": 50000,
        "timestamp": "2026-01-15T10:25:00.000Z"
      }
    ],
    "calculatedAt": "2026-01-15T11:00:00.000Z"
  }
}
```

---

### Tenant-Specific Statistics (Lender Dashboard)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/dashboard/stats?tenantId=clxxxxxxx" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "clxxxxxxx",
      "name": "Abepot Credit",
      "slug": "abepot",
      "plan": "STARTER",
      "status": "ACTIVE"
    },
    "overview": {
      "totalLoanBook": 12500000,
      "totalOutstandingBalance": 8200000,
      "totalRepayable": 14300000,
      "totalInterestAccrued": 1150000
    },
    "loans": {
      "totalCount": 320,
      "activeCount": 185,
      "inArrearsCount": 22,
      "par30": 8,
      "par30Ratio": 4.19,
      "defaultedCount": 5,
      "fullyPaidCount": 108
    },
    "customers": {
      "totalCount": 245,
      "newThisMonth": 18
    },
    "applications": {
      "DRAFT": 5,
      "SUBMITTED": 12,
      "UNDER_REVIEW": 8,
      "APPROVED": 15,
      "REJECTED": 4,
      "pending": 25,
      "pendingReview": 17,
      "underReview": 8,
      "approved": 15,
      "approvedToday": 3,
      "rejected": 4,
      "rejectedToday": 1
    },
    "collections": {
      "today": {
        "amount": 450000,
        "count": 42
      },
      "thisMonth": {
        "amount": 5200000,
        "count": 380
      }
    },
    "repaymentPerformance": {
      "completedThisMonth": 350,
      "completedAmount": 4800000,
      "pendingCount": 28,
      "pendingAmount": 380000,
      "repaymentRate": 92.6
    },
    "products": {
      "activeCount": 5
    },
    "disbursements": {
      "last7Days": {
        "amount": 1800000,
        "count": 24
      }
    },
    "recentLoans": [
      {
        "id": "loan_100",
        "loanNumber": "LN-2026-000100",
        "principal": 35000,
        "approvedAmount": 35000,
        "outstandingBalance": 35000,
        "status": "ACTIVE",
        "disbursementDate": "2026-01-14T00:00:00.000Z",
        "customer": {
          "id": "cust_050",
          "firstName": "Grace",
          "lastName": "Wanjiru",
          "phone": "+254734567890"
        }
      }
    ],
    "calculatedAt": "2026-01-15T11:00:00.000Z"
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Common Errors

| HTTP Code | Error Message | Cause |
|-----------|---------------|-------|
| 400 | `Missing required fields: ...` | Required fields not provided |
| 400 | `tenantId query parameter is required` | Tenant context missing |
| 404 | `Tenant not found` | Invalid tenant ID |
| 404 | `Customer not found` | Invalid customer ID |
| 404 | `Application not found` | Invalid application ID |
| 404 | `Loan not found` | Invalid loan ID |
| 404 | `Product not found or inactive` | Invalid or disabled product |
| 409 | `A tenant with this slug already exists` | Duplicate slug |
| 409 | `A customer with this phone already exists` | Duplicate phone in tenant |
| 409 | `A product with this code already exists` | Duplicate product code |
| 500 | `Failed to ...` | Server-side error |

---

## Rate Limiting

> **Note:** Rate limiting will be implemented in production. Current limits:

| Tier | Requests/Minute |
|------|-----------------|
| STARTER | 60 |
| PROFESSIONAL | 120 |
| ENTERPRISE | 300 |
| SUPER_ADMIN | Unlimited |

Headers returned with rate limit info:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1642512345
```

---

## Quick Start Examples

### Complete Loan Flow

```bash
# 1. Create customer
CUSTOMER=$(curl -s -X POST "http://localhost:3000/api/customers" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"clxxxxxxx","firstName":"Test","lastName":"User","phone":"+254700000000"}')

CUSTOMER_ID=$(echo $CUSTOMER | jq -r '.data.id')

# 2. Submit application
APP=$(curl -s -X POST "http://localhost:3000/api/applications" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"clxxxxxxx\",\"customerId\":\"$CUSTOMER_ID\",\"productId\":\"prod_001\",\"requestedAmount\":25000,\"termDays\":30}")

APP_ID=$(echo $APP | jq -r '.data.id')

# 3. Approve application
curl -s -X PUT "http://localhost:3000/api/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"clxxxxxxx","action":"approve","approvedAmount":25000}'

# 4. Create/disburse loan
curl -s -X POST "http://localhost:3000/api/loans" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"clxxxxxxx\",\"customerId\":\"$CUSTOMER_ID\",\"applicationId\":\"$APP_ID\",\"productId\":\"prod_001\",\"principal\":25000,\"termDays\":30,\"interestRate\":10}"
```

---

<div align="center">

**Need help?** Check the [Developer Guide](DEVELOPER.md) or [User Guide](USER_GUIDE.md)

</div>
