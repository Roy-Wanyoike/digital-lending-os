# Digital Lending OS - API Specification

**Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Base URL:** `/api/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Webhooks](#webhooks)
8. [Pagination](#pagination)

---

## Overview

The Digital Lending OS API is a RESTful JSON API designed for Kenya's Digital Credit Providers (DCPs). It provides comprehensive functionality for:

- **Multi-tenant SaaS platform** with white-label capabilities
- **Loan lifecycle management** from application to repayment
- **M-Pesa Daraja integration** for payments and disbursements
- **Credit scoring and risk assessment**
- **Double-entry accounting ledger**
- **Collection management**

### Base URL

```
Production: https://api.digitallending.os/v1
Development: http://localhost:3000/api/v1
```

### Content Type

All requests must use `Content-Type: application/json` unless specified otherwise.

---

## Authentication

### JWT Bearer Token

All protected endpoints require a valid JWT access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Types

| Token | Purpose | Location | Expiry |
|-------|---------|----------|--------|
| Access Token | API authentication | Header: `Authorization` | 15 minutes |
| Refresh Token | Get new access token | Cookie or Body | 7 days |

### Authentication Flow

```
┌─────────┐     POST /auth/login      ┌──────────────┐
│  Client │ ─────────────────────────> │   API Server  │
└─────────┘                            └──────────────┘
       │                                      │
       │ <─────────────────────────────────────┤
       │  { user, accessToken, refreshToken }  │
       │                                      │
       │  ── Store refresh token securely ──   │
       │                                      │
       │  GET /api/v1/loans                   │
       │  Authorization: Bearer <accessToken> │
       │ ─────────────────────────────────────>│
       │                                      │
       │ <─────────────────────────────────────┤
       │  { loans data }                       │
```

### Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| `SUPER_ADMIN` | Platform administrator | Full system access |
| `TENANT_ADMIN` | DCP administrator | Full tenant management |
| `MANAGER` | Loan officer/manager | Loans, customers, reports |
| `STAFF` | Regular staff | Limited operations |
| `AGENT` | Field agent/collector | Collections, customer view |
| `VIEWER` | Read-only access | View only endpoints |

---

## Rate Limiting

### Default Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 50 requests | 15 minutes |
| Webhook callbacks | 1000 requests | 1 hour |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642512345
Retry-After: 30
```

### Response on Limit Exceeded

```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Rate limit exceeded. Maximum 100 requests per 900 seconds.",
  "retryAfter": 30
}
```

---

## Endpoints

### 1. Authentication (`/auth`)

#### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
// OR
{
  "phone": "254712345678",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "TENANT_ADMIN",
      "tenantId": "clt..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### POST /auth/register
Create new user account.

#### POST /auth/logout
Invalidate current session.

#### POST /auth/refresh
Refresh access token using refresh token.

#### GET /auth/me
Get current authenticated user profile.

#### PUT /auth/change-password
Change user password (requires current password).

#### POST /auth/forgot-password
Initiate password reset flow.

#### POST /auth/reset-password
Complete password reset with token.

---

### 2. Tenants (`/tenants`)

#### GET /tenants
List all tenants (SUPER_ADMIN only).

#### POST /tenants
Create new tenant organization.

#### GET /tenants/:id
Get tenant details by ID.

#### PUT /tenants/:id
Update tenant configuration.

#### DELETE /tenants/:id
Deactivate/terminate tenant.

---

### 3. Customers (`/customers`)

#### GET /customers
List customers with pagination and filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (max: 100, default: 20) |
| status | string | Filter: ACTIVE, INACTIVE, BLACKLISTED |
| riskLevel | string | Filter: LOW, MEDIUM, HIGH, CRITICAL |
| search | string | Search name, phone, email, national ID |

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### POST /customers
Create new customer profile.

**Request:**
```json
{
  "tenantId": "clt...",
  "firstName": "Jane",
  "lastName": "Wanjiku",
  "phone": "254798765432",
  "email": "jane@example.com",
  "nationalId": "12345678",
  "dateOfBirth": "1990-05-15",
  "employmentStatus": "EMPLOYED",
  "incomeAmount": 50000,
  "county": "Nairobi"
}
```

#### GET /customers/:id
Get detailed customer profile with loan history.

#### PUT /customers/:id
Update customer information.

#### GET /customers/:id/loans
Get all loans for a specific customer.

#### GET /customers/:id/documents
Get KYC documents for a customer.

---

### 4. Loans (`/loans`)

#### GET /loans
List loans with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | APPROVED, ACTIVE, IN_ARREARS, etc. |
| customerId | string | Filter by customer ID |
| arrearsStatus | string | CURRENT, DAYS_1_7, etc. |

#### POST /loans
Create new loan from approved application.

**Request:**
```json
{
  "tenantId": "clt...",
  "customerId": "clc...",
  "productId": "clp...",
  "principal": 50000,
  "approvedAmount": 50000,
  "interestRate": 10,
  "interestType": "FLAT_RATE",
  "termDays": 90,
  "processingFee": 500,
  "disbursementMethod": "MPESA",
  "disbursementAccount": "254798765432"
}
```

#### GET /loans/:id
Get detailed loan with repayment schedule.

#### PATCH /loans/:id/status
Update loan status (state machine transitions).

**Valid Transitions:**
```
APPROVED → PENDING_DISBURSEMENT, CANCELLED
PENDING_DISBURSEMENT → ACTIVE, CANCELLED
ACTIVE → IN_ARREARS, PAID_OFF, RESTRUCTURED, DEFAULTED
IN_ARREARS → ACTIVE, DEFAULTED, RESTRUCTURED, WRITTEN_OFF
DEFAULTED → WRITTEN_OFF, RESTRUCTURED
```

---

### 5. Applications (`/applications`)

#### GET /applications
List loan applications.

#### POST /applications
Submit new loan application.

**Request:**
```json
{
  "tenantId": "clt...",
  "customerId": "clc...",
  "productId": "clp...",
  "requestedAmount": 50000,
  "purpose": "Business expansion",
  "termDays": 90
}
```

#### GET /applications/:id
Get application details with assessment.

#### PATCH /applications/:id/review
Review and approve/reject application.

---

### 6. Payments (`/payments`)

#### POST /payments/stkpush/initiate
Initiate M-Pesa STK Push payment.

**Request:**
```json
{
  "phone": "254798765432",
  "amount": 5500,
  "accountReference": "LN-2025-000042",
  "transactionDesc": "Loan repayment"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "checkoutRequestID": "ws_CO_...",
    "merchantRequestID": "..."
  },
  "message": "Enter PIN on phone to complete"
}
```

#### POST /payments/stkpush/callback
M-Pesa STK Push callback (webhook).

#### GET /payments/status/:checkoutRequestId
Check STK Push payment status.

#### POST /payments/disburse/b2c
Initiate M-Pesa B2C disbursement.

---

### 7. Collections (`/collections`)

#### GET /collections
List collection activities.

#### GET /collections/loans
Get loans requiring collection action.

#### POST /collections/actions
Log collection action (call, SMS, visit, etc.).

**Request:**
```json
{
  "loanId": "cll...",
  "action": "CALL",
  "notes": "Spoke with borrower, promised to pay Friday",
  "outcome": "Promise to pay",
  "followUpDate": "2025-01-20",
  "promiseToPayAmount": 5500,
  "promiseToPayDate": "2025-01-20"
}
```

#### GET /collections/promises
List promises to pay.

---

### 8. Finance (`/finance`)

#### GET /finance
Get financial summary.

#### GET /finance/transactions
List ledger transactions.

#### GET /finance/ledger
Get general ledger entries.

#### GET /finance/reconciliation
Reconciliation report.

#### POST /finance/settlements
Process settlement.

---

### 9. Reports (`/reports`)

#### GET /reports
List available reports.

#### GET /reports/portfolio
Portfolio performance report.

#### GET /reports/financial
Financial statements.

#### GET /reports/customer
Customer analytics.

#### GET /reports/operational
Operations summary.

#### POST /reports/generate
Generate custom report.

---

### 10. Credit (`/credit`)

#### GET /credit
Get credit scoring overview.

#### POST /credit/assessment
Run credit assessment for customer.

**Request:**
```json
{
  "customerId": "clc...",
  "tenantId": "clt...",
  "requestedAmount": 50000,
  "termDays": 90,
  "includeCRBCheck": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "score": 720,
    "grade": "B",
    "riskLevel": "MEDIUM",
    "maxRecommendedAmount": 75000,
    "recommendedInterestRate": 12,
    "factors": [
      {
        "category": "Payment History",
        "weight": 0.35,
        "score": 78,
        "description": "Good payment history"
      }
    ],
    "decision": "APPROVE"
  }
}
```

#### GET /credit/rules
List credit scoring rules.

#### PUT /credit/rules/:id
Update credit rule.

#### GET /credit/policies
List credit policies.

---

### 11. Providers (`/providers`)

#### GET /providers
Check all provider health status.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "provider": "MPESA_DARAJA",
      "status": "OPERATIONAL",
      "latency": 245,
      "lastChecked": "2025-01-15T10:30:00Z",
      "uptime": 99.95,
      "errorRate": 0.02
    }
  ]
}
```

#### GET /providers/:id
Get provider details.

#### GET /providers/alerts
Active provider alerts.

#### GET /providers/incidents
Provider incident history.

#### GET /providers/history
Provider status history.

---

### 12. Dashboard (`/dashboard`)

#### GET /dashboard/stats
Dashboard KPIs and statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 1250,
    "activeLoans": 340,
    "totalDisbursed": 12500000,
    "totalCollected": 8750000,
    "portfolioAtRisk": 8.5,
    "approvalRate": 72,
    "averageLoanSize": 36764,
    "pendingApplications": 45,
    "overdueLoans": 28,
    "collectionEfficiency": 91.2
  }
}
```

#### GET /dashboard/charts
Chart data for dashboard visualizations.

---

### 13. Staff (`/staff`)

#### GET /staff
List staff members.

#### POST /staff
Create staff user.

#### GET /staff/:id
Get staff details.

#### PUT /staff/:id
Update staff information.

#### GET /staff/quick-stats
Quick stats for staff dashboard.

---

### 14. Notifications (`/notifications`)

#### GET /notifications
List notifications.

#### POST /notifications/send
Send notification.

#### GET /notifications/:id
Get notification details.

#### PUT /notifications/:id/read
Mark notification as read.

---

### 15. Webhooks (`/webhooks`)

#### POST /webhooks/mpesa
M-Pesa callback handler.

#### POST /webhooks/crb
CRB check callback.

**Webhook Signature Verification:**
All webhooks are verified using HMAC-SHA256 signature:
```javascript
const signature = req.headers['x-webhook-signature'];
const expected = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
```

---

## Response Format

### Standard Response Structure

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
    pagination?: PaginationMeta;
  };
  errors?: ApiError[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiError {
  code: string;
  message: string;
  field?: string;
}
```

### Success Responses

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | OK - Request succeeded | GET requests |
| 201 | Created - Resource created | POST requests |
| 204 | No Content - Successful deletion | DELETE requests |

### Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| 400 | BAD_REQUEST | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 422 | VALIDATION_ERROR | Data validation failed |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Provider downtime |

### Error Response Example

```json
{
  "success": false,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Phone number must be a valid Kenyan number",
      "field": "phone"
    }
  ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

---

## Pagination

All list endpoints support cursor-based and offset-based pagination.

### Offset Pagination (Default)

```
GET /api/v1/customers?page=1&limit=20
```

### Response Headers

```http
X-Total-Count: 150
X-Page: 1
X-Pages: 8
Link: </api/v1/customers?page=2&limit=20>; rel="next",
      </api/v1/customers?page=8&limit=20>; rel="last"
```

---

## Changelog

### v1.0.0 (2025-01-15)
- Initial API release
- Core lending features
- M-Pesa integration
- Multi-tenant support
