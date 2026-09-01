# Go Migration Guide

**Document Version:** 1.0  
**Target:** Migrate Digital Lending OS Backend from Node.js/Express to Go  
**Estimated Timeline:** 3-6 months

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Module Mapping](#module-mapping)
6. [Data Layer Migration](#data-layer-migration)
7. [API Compatibility](#api-compatibility)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)
10. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

### Why Migrate to Go?

| Factor | Node.js (Current) | Go (Target) |
|--------|-------------------|-------------|
| **Performance** | Single-threaded, event loop | Goroutines, concurrent processing |
| **Memory** | ~100MB base | ~20MB base |
| **Startup Time** | 2-5 seconds | <100ms |
| **Type Safety** | TypeScript (runtime) | Compile-time strict typing |
| **Deployment** | Node.js runtime required | Static binary |
| **Concurrency** | Async/await | Native goroutines |
| **Ecosystem** | npm (larger) | Smaller, focused |

### Key Benefits

1. **Better Performance**: 10-50x throughput improvement expected
2. **Lower Resource Costs**: Reduced memory and CPU usage
3. **Type Safety**: Catch errors at compile time
4. **Simplified Deployment**: Single binary, no runtime dependency
5. **Better Concurrency**: Handle thousands of simultaneous connections

---

## Current Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Application                    │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────────┐ │
│  │ Routes    │  │ Middleware│  │ Controllers               │ │
│  │ (16 files)│  │ (4 files) │  │ (15 files)                │ │
│  └───────────┘  └───────────┘  └──────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Services (14 files)                                      ││
│  │ - auth.service.ts     - loan.service.ts                  ││
│  │ - customer.service.ts - payment.service.ts               ││
│  │ - credit.service.ts   - collection.service.ts            ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Data Layer                                              ││
│  │ - Prisma ORM → SQLite/PostgreSQL                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/src/
├── config/          # Configuration management
├── controllers/     # Request handlers (15)
├── middleware/      # Auth, validation, error handling (4)
├── routes/          # Route definitions (16)
├── services/        # Business logic (14)
├── types/           # TypeScript type definitions
├── utils/           # Utilities (logger, helpers)
├── lib/             # Database client, integrations
├── providers/       # External service mocks
├── templates/       # SMS/Email templates
└── reports/         # Report generators
```

---

## Target Architecture

### Proposed Go Structure

```
backend-go/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── config/                   # Configuration (Viper)
│   ├── handler/                  # HTTP handlers (from controllers)
│   ├── middleware/               # Auth, CORS, rate limiting
│   ├── model/                    # Domain models (from types)
│   ├── repository/               # Data access layer
│   ├── service/                  # Business logic
│   └── transport/
│       └── http/                 # HTTP routes (Gin/Echo)
├── pkg/
│   ├── auth/                     # JWT, RBAC utilities
│   ├── cache/                    # Redis client
│   ├── database/                 # GORM/SQLC
│   ├── logger/                   # Structured logging
│   ├── mpesa/                    # M-Pesa SDK
│   └── validator/                # Validation library
├── api/                          # OpenAPI specs
├── migrations/                   # Database migrations
├── scripts/                      # Utility scripts
├── go.mod
├── go.sum
├── Dockerfile
└── Makefile
```

### Recommended Go Libraries

| Category | Library | Purpose |
|----------|---------|---------|
| **HTTP Framework** | github.com/gin-gonic/gin | High-performance router |
| **OR/M** | gorm.io/gorm | ORM with auto-migration |
| **Validation** | go-playground/validator/v10 | Struct validation |
| **Config** | spf13/viper | Configuration management |
| **Logging** | uber-go/zap | Structured logging |
| **JWT** | golang-jwt/jwt/v5 | JWT handling |
| **Redis** | redis/go-redis/v9 | Redis client |
| **Testing** | testify/assert | Test assertions |
| **Mocking** | golang/mock | Interface mocking |

---

## Migration Strategy

### Approach: Strangler Fig Pattern

![Strangler Fig Pattern](https://microservices.io/img/strangler.png)

The Strangler Fig pattern allows gradual migration by creating a new system alongside the old one, routing traffic incrementally.

### Phases

#### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up Go project structure
- [ ] Implement configuration management
- [ ] Set up database connection (GORM)
- [ ] Create base middleware (logging, recovery, CORS)
- [ ] Implement JWT authentication
- [ ] Set up testing framework

#### Phase 2: Core Services (Weeks 5-8)
- [ ] Migrate Tenant module
- [ ] Migrate User/Auth module
- [ ] Migrate Customer module
- [ ] Set up API gateway/proxy

#### Phase 3: Lending Core (Weeks 9-12)
- [ ] Migrate Loan Product module
- [ ] Migrate Loan Application module
- [ ] Migrate Loan Management module
- [ ] Migrate Credit Scoring module

#### Phase 4: Financial Operations (Weeks 13-16)
- [ ] Migrate Payment module (M-Pesa integration)
- [ ] Migrate Repayment module
- [ ] Migrate Finance/Ledger module
- [ ] Migrate Collection module

#### Phase 5: Supporting Services (Weeks 17-20)
- [ ] Migrate Notification module
- [ ] Migrate Report module
- [ ] Migrate Dashboard module
- [ ] Migrate Provider monitoring

#### Phase 6: Cutover (Weeks 21-24)
- [ ] Parallel running with traffic mirroring
- [ ] Performance benchmarking
- [ ] Security audit
- [ ] DNS cutover
- [ ] Decommission Node.js

---

## Module Mapping

### Direct Mapping Table

| Node.js Module | Go Package | Complexity | Priority |
|---------------|------------|------------|----------|
| `auth.service.ts` | `internal/service/auth` | Medium | P0 |
| `customer.service.ts` | `internal/service/customer` | Low | P0 |
| `tenant.service.ts` | `internal/service/tenant` | Low | P0 |
| `loan.service.ts` | `internal/service/loan` | High | P1 |
| `application.service.ts` | `internal/service/application` | High | P1 |
| `payment.service.ts` | `internal/service/payment` | High | P1 |
| `credit.service.ts` | `internal/service/credit` | Medium | P1 |
| `collection.service.ts` | `internal/service/collection` | Medium | P2 |
| `finance.service.ts` | `internal/service/finance` | High | P2 |
| `notification.service.ts` | `internal/service/notification` | Low | P2 |
| `report.service.ts` | `internal/service/report` | Medium | P2 |
| `provider.service.ts` | `internal/service/provider` | Low | P3 |
| `dashboard.service.ts` | `internal/service/dashboard` | Low | P3 |

---

## Data Layer Migration

### Prisma Schema to GORM Models

#### Current (Prisma/TypeScript)

```prisma
model Customer {
  id          String   @id @default(cuid())
  tenantId    String
  firstName   String
  lastName    String
  phone       String
  // ... more fields
  
  @@index([tenantId])
  @@index([phone])
}
```

#### Target (Go/GORM)

```go
package model

import (
    "time"
    "gorm.io/gorm"
)

type Customer struct {
    ID        string    `json:"id" gorm:"primaryKey;type:varchar(255);default:cuid()"`
    TenantID  string    `json:"tenantId" gorm:"index;not null"`
    FirstName string    `json:"firstName" gorm:"type:varchar(255);not null"`
    LastName  string    `json:"lastName" gorm:"type:varchar(255);not null"`
    Phone     string    `json:"phone" gorm:"uniqueIndex:idx_tenant_phone;not null"`
    
    // Timestamps
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
    
    // Relations
    Tenant    Tenant    `json:"-" gorm:"foreignKey:TenantID"`
    Loans     []Loan    `json:"loans,omitempty" gorm:"foreignKey:CustomerID"`
}

func (Customer) TableName() string {
    return "customers"
}
```

### Repository Pattern

```go
package repository

import (
    "context"
    "digital-lending-os/internal/model"
    "gorm.io/gorm"
)

type CustomerRepository struct {
    db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
    return &CustomerRepository{db: db}
}

func (r *CustomerRepository) FindByID(ctx context.Context, id string) (*model.Customer, error) {
    var customer model.Customer
    err := r.db.WithContext(ctx).First(&customer, "id = ?", id).Error
    if err != nil {
        return nil, err
    }
    return &customer, nil
}

func (r *CustomerRepository) FindByTenant(
    ctx context.Context,
    tenantID string,
    page, limit int,
) ([]model.Customer, int64, error) {
    var customers []model.Customer
    var total int64
    
    query := r.db.WithContext(ctx).Model(&model.Customer{}).Where("tenant_id = ?", tenantID)
    
    query.Count(&total)
    
    err := query.Offset((page - 1) * limit).
        Limit(limit).
        Order("created_at DESC").
        Find(&customers).Error
        
    return customers, total, err
}
```

---

## API Compatibility

### Maintaining API Contract

All existing endpoints must maintain identical request/response formats during migration.

### Request Validation Mapping

#### TypeScript (Zod)

```typescript
import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  phone: z.string().regex(/^2547\d{8}$/),
});
```

#### Go (validator)

```go
package model

import "github.com/go-playground/validator/v10"

type CreateCustomerRequest struct {
    FirstName string `json:"firstName" validate:"required,min=2,max=100"`
    LastName  string `json:"lastName" validate:"required,min=2,max=100"`
    Phone     string `json:"phone" validate:"required,regexp=^2547\\d{8}$"`
}

func Validate(s interface{}) error {
    validate := validator.New()
    return validate.Struct(s)
}
```

### Response Format Consistency

```go
package response

import (
    "net/http"
    "time"
)

type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
    Errors  []Error     `json:"errors,omitempty"`
}

type Meta struct {
    RequestID string    `json:"requestId"`
    Timestamp time.Time `json:"timestamp"`
    Version   string    `json:"version"`
    Pagination *PaginationMeta `json:"pagination,omitempty"`
}

func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(Response{
        Success: statusCode < 400,
        Data:    data,
        Meta: &Meta{
            RequestID: uuid.New().String(),
            Timestamp: time.Now(),
            Version:   "1.0.0",
        },
    })
}
```

---

## Testing Strategy

### Test Categories

| Type | Node.js | Go | Coverage Target |
|------|---------|-----|-----------------|
| Unit | Jest | Go testing + testify | >90% |
| Integration | Supertest | httptest | >80% |
| E2E | Playwright | Postman/Newman | Critical paths |
| Load | Artillery | k6 / vegeta | Baseline comparison |

### Example Go Test

```go
package customer_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestCreateCustomer(t *testing.T) {
    // Setup
    router := setupTestRouter()
    
    body := map[string]interface{}{
        "firstName": "Test",
        "lastName":  "User",
        "phone":     "254700000000",
        "tenantId":  testTenantID,
    }
    
    jsonBody, _ := json.Marshal(body)
    
    req := httptest.NewRequest(
        http.MethodPost,
        "/api/v1/customers",
        bytes.NewReader(jsonBody),
    )
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+testToken)
    
    // Execute
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)
    
    // Assert
    require.Equal(t, http.StatusCreated, w.Code)
    
    var response response.Response
    err := json.Unmarshal(w.Body.Bytes(), &response)
    require.NoError(t, err)
    
    assert.True(t, response.Success)
    assert.NotNil(t, response.Data)
}
```

---

## Rollback Plan

### Triggers for Rollback

- Error rate exceeds 5% for 10+ minutes
- P99 latency increases by >200%
- Payment processing failures
- Data inconsistency detected

### Rollback Procedure

1. **Immediate (0-5 min)**
   ```bash
   # Switch DNS/load balancer back to Node.js
   kubectl rollout undo deployment/api-server -n production
   ```

2. **Investigation (5-30 min)**
   - Review logs from both systems
   - Check database consistency
   - Identify root cause

3. **Recovery (30+ min)**
   - Fix issue in Go service
   - Run full test suite
   - Schedule new migration window

---

## Timeline & Milestones

### Gantt Overview

```
Month 1:  ████████████████████ Foundation
Month 2:  ░░░░░░░░█████████████████ Core Services
Month 3:  ░░░░░░░░░░░░░░████████████ Lending Core
Month 4:  ░░░░░░░░░░░░░░░░░░░████████ Financial Ops
Month 5:  ░░░░░░░░░░░░░░░░░░░░░░░░████ Supporting
Month 6:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░ Cutover
```

### Milestones

| Milestone | Date | Deliverables | Sign-off |
|-----------|------|--------------|----------|
| M1 | Week 4 | Project skeleton, DB connection, Auth | Tech Lead |
| M2 | Week 8 | Tenants, Users, Customers migrated | PM |
| M3 | Week 12 | Loans, Applications, Credit scoring | CTO |
| M4 | Week 16 | Payments, Repayments, Ledger | CFO/Finance |
| M5 | Week 20 | All modules complete | Full Team |
| M6 | Week 24 | Production cutover | Stakeholders |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance regression | Low | High | Load testing, gradual rollout |
| Data loss/corruption | Very Low | Critical | Backups, transaction logs |
| Feature gaps | Medium | Medium | Detailed spec, test coverage |
| Team skill gap | Medium | Medium | Training, pair programming |
| Third-party compatibility | Low | High | Early integration testing |

---

## Appendix: Quick Reference

### Common Patterns Conversion

| Node.js Pattern | Go Equivalent |
|-----------------|---------------|
| `async/await` | Goroutines + channels |
| `Promise.all()` | `errgroup.Group` |
| `try/catch` | `defer/recover`, error returns |
| `middleware.next()` | `c.Next()` in Gin |
| `req.params.id` | `c.Param("id")` |
| `res.json(data)` | `c.JSON(code, data)` |
| `console.log` | `logger.Info()` |
| `process.env` | `viper.Get()` |
| `require('./module')` | `import "package"` |

---

*This document should be updated as migration progresses.*
