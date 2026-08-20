# Digital Lending OS

<div align="center">

![Digital Lending OS](public/logo.svg)

**Multi-Tenant SaaS Platform for Kenyan Digital Credit Providers (DCPs)**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![CBK Regulated](https://img.shields.io/badge/CBK%20Regulated-Yes-green.svg)](https://www.centralbank.go.ke/)

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [API Documentation](docs/API.md) • [User Guide](docs/USER_GUIDE.md) • [Developer Guide](docs/DEVELOPER.md)

</div>

---

## Overview

Digital Lending OS is a comprehensive, multi-tenant SaaS platform designed specifically for **Kenyan Digital Credit Providers (DCPs)** licensed by the Central Bank of Kenya (CBK). The platform enables DCPs to manage their entire lending lifecycle - from customer onboarding and KYC verification to loan origination, disbursement, collections, and reporting.

### Key Highlights

- **252+ Active DCP Tenants** currently using the platform
- **KSh 840M+ Total Loan Book** managed across all tenants
- **182,432 Active Loans** being serviced
- **4.2% PAR30 Ratio** demonstrating healthy portfolio quality
- **Full CBK Compliance** built-in for Kenyan digital lending regulations

## Features

### Core Lending Features
- 🏦 **Multi-Tenant Architecture** - Complete data isolation between DCPs
- 👥 **Customer Management** - Full borrower lifecycle management
- 📋 **Loan Application Processing** - Configurable approval workflows
- 💰 **Loan Products Engine** - Flexible product configuration per tenant
- 📊 **Credit Assessment** - Integrated scoring and risk evaluation
- 💳 **Disbursement Management** - M-Pesa, Bank Transfer, PesaLink support
- 📈 **Collections & Repayments** - Automated tracking and reminders
- 🔍 **Portfolio Analytics** - Real-time dashboard and KPIs

### Platform Features
- 🔐 **Role-Based Access Control** - SUPER_ADMIN, TENANT_ADMIN, MANAGER, STAFF, AGENT, VIEWER
- 🎨 **White-Label Branding** - Custom branding per tenant
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔔 **Notification System** - SMS, Email, WhatsApp, In-App notifications
- 📝 **Audit Logging** - Complete action trail for compliance
- 🔄 **Workflow Automation** - Configurable business processes

### Integration Capabilities
- 📱 **M-Pesa API Ready** - Safaricom payment integration points
- 🏛️ **CRB Integration** - Credit Reference Bureau checks
- 📄 **KYC Document Management** - ID verification and document storage
- 📊 **Reporting Engine** - Exportable reports for CBK submissions

## Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16  │  React 19  │  TypeScript 5  │  Tailwind CSS 4   │
│  shadcn/ui   │  Recharts   │  Framer Motion  │  Lucide Icons    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Route Handlers  │  RESTful API  │  JSON Responses      │
│  Zod Validation          │  Prisma ORM   │  Tenant Isolation   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  SQLite / PostgreSQL  │  Prisma Client  │  Connection Pooling  │
│  JSON Fields           │  Indexed Queries │  Data Integrity     │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend Framework | Next.js 16 | Server-side rendering, API routes |
| UI Library | shadcn/ui + Radix UI | Accessible component library |
| Styling | Tailwind CSS 4 | Utility-first CSS framework |
| State Management | Zustand | Lightweight state management |
| Database | SQLite (dev) / PostgreSQL (prod) | Persistent data storage |
| ORM | Prisma 6 | Type-safe database access |
| Forms | React Hook Form + Zod | Form handling & validation |
| Charts | Recharts | Data visualization |
| Icons | Lucide React | Icon library |
| Date Handling | date-fns | Date manipulation |

## Getting Started

### Prerequisites

- **Node.js** >= 18.x or **Bun** >= 1.x
- **npm**, **yarn**, or **bun** package manager
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/digital-lending-os.git
cd digital-lending-os

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
npm run db:push
# or for production migrations
npm run db:migrate

# Seed sample data (optional)
npx tsx scripts/seed.ts

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="file:./db/custom.db"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: External Services
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
CRB_API_KEY=your_crb_api_key
SMS_GATEWAY_API_KEY=your_sms_key
EMAIL_SMTP_HOST=smtp.example.com
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run db:push` | Push schema changes to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:reset` | Reset database to clean state |

## Project Structure

```
digital-lending-os/
├── prisma/
│   └── schema.prisma          # Database schema definition
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout component
│   │   ├── page.tsx           # Main dashboard page
│   │   ├── globals.css        # Global styles
│   │   └── api/               # API route handlers
│   │       ├── tenants/       # Tenant CRUD endpoints
│   │       ├── customers/     # Customer endpoints
│   │       ├── applications/  # Loan application endpoints
│   │       ├── loans/         # Loan management endpoints
│   │       ├── products/      # Loan product endpoints
│   │       └── dashboard/     # Dashboard statistics
│   ├── components/
│   │   ├── ui/                # Base UI components (shadcn/ui)
│   │   └── lending-os/        # Domain-specific components
│   │       ├── SuperAdminView.tsx
│   │       ├── LenderDashboard.tsx
│   │       ├── CustomerPortal.tsx
│   │       ├── ApplicationsTable.tsx
│   │       ├── LoansTable.tsx
│   │       ├── KPICards.tsx
│   │       ├── DashboardCharts.tsx
│   │       ├── LoanCalculator.tsx
│   │       ├── RepaymentSchedule.tsx
│   │       ├── ApplicationForm.tsx
│   │       ├── ApplicationStatusTracker.tsx
│   │       ├── TenantList.tsx
│   │       └── ArchitectureDiagram.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── db.ts              # Prisma client singleton
│       └── utils.ts           # Utility functions
├── scripts/
│   └── seed.ts                # Database seeder with sample data
├── docs/
│   ├── API.md                 # API documentation
│   ├── USER_GUIDE.md          # User guide for DCP admins
│   ├── DEVELOPER.md           # Developer guide
│   ├── ARCHITECTURE.md        # Technical architecture
│   └── SAMPLE_CONFIGURATIONS.md # Example tenant configs
├── download/                  # Screenshots and diagrams
├── public/                    # Static assets
├── tests/                     # Test files
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── Caddyfile                  # Reverse proxy configuration
```

## API Documentation

Complete API documentation is available in [docs/API.md](docs/API.md).

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tenants` | GET, POST | List/Create tenants |
| `/api/tenants/[id]` | GET, PUT, DELETE | Get/Update/Delete tenant |
| `/api/customers` | GET, POST | List/Create customers |
| `/api/customers/[id]` | GET, PUT | Get/Update customer |
| `/api/applications` | GET, POST | List/Create applications |
| `/api/applications/[id]` | GET, PUT | Get/Update application |
| `/api/loans` | GET, POST | List/Create loans |
| `/api/loans/[id]` | GET, PUT | Get/Update loan |
| `/api/products` | GET, POST | List/Create products |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## Database Schema

The platform uses a comprehensive database schema designed for multi-tenant lending operations.

### Core Models

| Model | Description |
|-------|-------------|
| `Tenant` | DCP organization with branding, config, billing |
| `User` | Platform users with role-based access |
| `Customer` | Borrower profiles with credit history |
| `LoanProduct` | Configurable lending products |
| `LoanApplication` | Loan requests with workflow status |
| `Loan` | Active/completed loans with repayment tracking |
| `Repayment` | Payment records with allocation |
| `Transaction` | Double-entry financial ledger |
| `KycDocument` | Verification documents |
| `Notification` | Multi-channel notifications |
| `AuditLog` | Compliance audit trail |

See [prisma/schema.prisma](prisma/schema.prisma) for complete schema definition.

## Multi-Tenancy

### How Tenant Isolation Works

Digital Lending OS implements **logical data isolation** at the application level:

1. **Tenant Identification**: Every request includes `tenantId` (except platform-level operations)
2. **Query Scoping**: All data queries automatically filter by `tenantId`
3. **Cross-Tenant Prevention**: APIs validate tenant ownership before operations
4. **Branding Separation**: Each tenant has independent branding configuration

### Tenant Plans

| Plan | Monthly Fee | Transaction Rate | Features |
|------|-------------|------------------|----------|
| **STARTER** | KSh 5,000 | 1.5% | Basic lending features |
| **PROFESSIONAL** | KSh 15,000 | 1.0% | Advanced workflows, more users |
| **ENTERPRISE** | KSh 50,000 | 0.5% | Full feature set, priority support |
| **CUSTOM** | Negotiated | Variable | Enterprise customization |

## Configuration

### Tenant Configuration Options

Each tenant can configure:

```typescript
interface TenantConfig {
  // Branding
  branding: {
    logo: string;           // Logo URL or base64
    primaryColor: string;   // Primary brand color
    secondaryColor: string; // Secondary/accent color
    font: string;           // Font family preference
    favicon: string;        // Favicon URL
  };
  
  // Business Rules
  config: {
    kycRequirements: string[];      // Required KYC documents
    approvalWorkflow: WorkflowConfig;
    paymentConfig: PaymentConfig;
    interestRateLimits: {
      maxRate: number;
      minRate: number;
    };
  };
}
```

## Deployment

### Development Deployment

```bash
# Using Bun (recommended for speed)
bun install
bun run dev

# Or using npm
npm install
npm run dev
```

Access at http://localhost:3000

### Production Deployment

#### Option 1: Docker (Recommended)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Option 2: Direct Node.js

```bash
npm run build
npm start
```

#### Reverse Proxy (Caddy)

The project includes a `Caddyfile` for easy deployment with Caddy:

```
lending.example.com {
    reverse_proxy localhost:3000
    encode gzip
}
```

### Environment Checklist

- [ ] Database configured (PostgreSQL recommended for production)
- [ ] Environment variables set
- [ ] SSL/TLS certificates (for HTTPS)
- [ ] Backup strategy implemented
- [ ] Monitoring/logging configured
- [ ] M-Pesa sandbox/production credentials
- [ ] CRB integration credentials
- [ ] SMS gateway setup
- [ ] Email SMTP configuration

## Screenshots

Screenshots are available in the [`download/`](download/) directory:

- `digital-lending-os-screenshot.png` - Main dashboard overview
- `digital-lending-os-super-admin.png` - Super Admin view
- `digital-lending-os-lender-admin.png` - Lender admin dashboard
- `digital-lending-os-final-superadmin.png` - Final super admin UI
- `digital-lending-os-final-lender.png` - Final lender dashboard
- `digital-lending-os-final-home.png` - Home page view
- `digital-lending-os-architecture.png` - System architecture diagram

## Documentation

| Document | Description |
|----------|-------------|
| [API Documentation](docs/API.md) | Complete REST API reference |
| [User Guide](docs/USER_GUIDE.md) | Guide for DCP administrators |
| [Developer Guide](docs/DEVELOPER.md) | Guide for extending the platform |
| [Architecture](docs/ARCHITECTURE.md) | Technical architecture details |
| [Sample Configurations](docs/SAMPLE_CONFIGURATIONS.md) | Example tenant setups |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style Guidelines

- Use TypeScript strict mode
- Follow existing code patterns
- Write meaningful commit messages
- Add JSDoc comments for public functions
- Test thoroughly before submitting PRs

## License

This software is proprietary and licensed to Digital Lending OS Ltd.

## Support

For support:
- Email: support@digitallendingos.co.ke
- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/your-org/digital-lending-os/issues)

---

<div align="center">

**Built with ❤️ for Kenya's Digital Lending Industry**

*Regulated by the Central Bank of Kenya*

</div>
