# Digital Lending OS - Backend API

Complete REST API server for Kenya's Digital Credit Providers (DCPs). This is the standalone Express.js backend that can be deployed independently or alongside the Next.js frontend.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ (or SQLite for development)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# Generate Prisma client
npx prisma generate

# Run database migrations
npm run migrate:dev

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

The server will start at `http://localhost:4000`

## 📡 API Endpoints

### Base URL
```
http://localhost:4000/api/v1
```

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Initiate password reset |

### Tenant Management (SUPER_ADMIN)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tenants` | List all tenants |
| GET | `/tenants/:id` | Get tenant details |
| POST | `/tenants` | Create new tenant |
| PUT | `/tenants/:id` | Update tenant |
| DELETE | `/tenants/:id` | Deactivate tenant |

### Customer Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers |
| GET | `/customers/:id` | Get customer profile |
| POST | `/customers` | Create customer |
| PUT | `/customers/:id` | Update customer |
| GET | `/customers/:id/loans` | Customer's loans |
| GET | `/customers/:id/documents` | Customer documents |

### Loan Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/loans` | List loans |
| GET | `/loans/:id` | Get loan details |
| POST | `/loans` | Create loan |
| PATCH | `/loans/:id/status` | Update status |

### Application Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/applications` | List applications |
| GET | `/applications/:id` | Get application |
| POST | `/applications` | Submit application |
| PATCH | `/applications/:id/review` | Approve/reject |

### Payment Processing (M-Pesa)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/stkpush/initiate` | Initiate STK Push |
| GET | `/payments/stkpush/status` | Check STK Push status |
| POST | `/payments/stkpush/callback` | STK Push webhook |
| POST | `/payments/disburse/b2c` | B2C disbursement |
| GET | `/payments/history` | Payment history |
| GET | `/payments/balance` | Wallet balance |

### Collections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections` | Dashboard with PAR metrics |
| GET | `/collections/loans` | Overdue loans list |
| POST | `/collections/actions` | Record collection action |
| GET | `/collections/promises` | Promises to pay |

### Finance & Accounting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finance` | Financial dashboard |
| GET | `/finance/transactions` | Transaction list |
| GET | `/finance/ledger` | General ledger |
| GET | `/finance/reconciliation` | Reconciliation status |
| POST | `/finance/reconciliation` | Mark as reconciled |
| POST | `/finance/settlements` | Process settlement |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | Report catalog |
| GET | `/reports/portfolio` | Portfolio report |
| GET | `/reports/customer` | Customer analytics |
| GET | `/reports/financial` | Financial report |
| GET | `/reports/operational` | Operational report |
| POST | `/reports/generate` | Generate report |

### Credit & Risk
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credit` | Credit overview |
| POST | `/credit/assessment` | Perform assessment |
| GET | `/credit/rules` | Eligibility rules |
| PUT | `/credit/rules/:id` | Update rule |
| GET | `/credit/policies` | Credit policies |

### Provider Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/providers` | All providers status |
| GET | `/providers/:id` | Provider details |
| GET | `/providers/alerts` | Active alerts |
| GET | `/providers/incidents` | Incident history |
| GET | `/providers/history` | Status history |

### Dashboard & Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | KPI statistics |
| GET | `/dashboard/charts` | Chart data |

### Staff Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | List staff members |
| GET | `/staff/workspace` | User workspace config |
| POST | `/staff/actions` | Staff actions |

### Webhooks (Public - No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/mpesa/stkpush` | STK Push callback |
| POST | `/webhooks/mpesa/c2b/confirmation` | C2B confirmation |
| POST | `/webhooks/mpesa/c2b/validation` | C2B validation |
| POST | `/webhooks/mpesa/b2c/result` | B2C result |
| POST | `/webhooks/sms/delivery` | SMS delivery status |
| POST | `/webhooks/sms/inbound` | Incoming SMS |

## 🔐 Authentication

All protected endpoints require JWT Bearer token:

```
Authorization: Bearer <your-access-token>
```

### Token Types
- **Access Token**: Short-lived (15 min), used for API calls
- **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookie, used to get new access tokens

### Roles & Permissions

| Role | Access Level |
|------|--------------|
| SUPER_ADMIN | Full system access, all tenants |
| TENANT_ADMIN | Full tenant management |
| MANAGER | Loans, applications, collections |
| LOAN_OFFICER | Applications, customer data |
| COLLECTION_AGENT | Collection operations only |
| FINANCE_OFFICER | Finance operations only |
| STAFF | Read-only access |
| VIEWER | Read-only limited access |
| CUSTOMER | Own data only |

## 📊 Response Format

All responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## 🔧 Configuration

See `.env.example` for all configuration options including:
- Database connection
- JWT secrets
- M-Pesa Daraja credentials
- CRB integration settings
- SMS gateway configuration
- Email service settings
- Rate limiting parameters

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Watch mode
npm run test:watch
```

## 📦 Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Environment Variables for Production

Ensure these are set:
- `NODE_ENV=production`
- Strong `JWT_SECRET` and `REFRESH_TOKEN_SECRET`
- Real M-Pesa credentials (`MPESA_ENVIRONMENT=production`)
- Database URL pointing to production database
- All webhook URLs publicly accessible

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run migrate:dev` | Run development migrations |
| `npm run studio` | Open Prisma Studio |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Copyright © 2026 Digital Lending OS. Licensed under MIT.
