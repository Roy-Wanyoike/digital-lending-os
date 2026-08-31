/**
 * Swagger/OpenAPI Configuration
 * 
 * Generates OpenAPI 3.0 specification for Digital Lending OS API.
 * Documentation available at /api-docs (Swagger UI) and /api-docs.json (raw JSON)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Lending OS API',
      version: '1.0.0',
      description: 'Multi-Tenant SaaS Platform for Kenyan DCPs - Complete REST API server for Kenya\'s Digital Credit Providers with 56+ API endpoints, JWT authentication, M-Pesa integration, and CRB integration.',
      contact: {
        name: 'Digital Lending OS Support',
        email: 'support@digitallendingos.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://digitallendingos.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.digitallendingos.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http' as const,
          scheme: 'bearer' as const,
          bearerFormat: 'JWT',
          description: 'JWT Authorization token obtained from /auth/login or /auth/register',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            message: { type: 'string', example: 'Detailed error description' },
            code: { type: 'string', example: 'ERROR_CODE' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            phone: { type: 'string', description: 'Phone number (alternative to email)', example: '254712345678' },
            password: { type: 'string', format: 'password', description: 'User password' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password', minLength: 8 },
            name: { type: 'string', example: 'John Doe' },
            phone: { type: 'string' },
            tenantId: { type: 'string', description: 'Tenant ID for tenant-scoped users' },
            role: { 
              type: 'string', 
              enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER', 'COLLECTIONS_AGENT', 'FINANCE_OFFICER', 'CUSTOMER'],
              default: 'CUSTOMER'
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string' },
            tenantId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Tenant schemas
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Acme Microfinance' },
            slug: { type: 'string', example: 'acme-microfinance' },
            companyName: { type: 'string' },
            licenseNumber: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            plan: { 
              type: 'string', 
              enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
              default: 'STARTER'
            },
            status: { 
              type: 'string', 
              enum: ['ACTIVE', 'PENDING_ONBOARDING', 'SUSPENDED', 'DEACTIVATED']
            },
            monthlyFee: { type: 'number' },
            transactionRate: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTenantRequest: {
          type: 'object',
          required: ['name', 'slug', 'phone', 'email', 'plan'],
          properties: {
            name: { type: 'string', example: 'Acme Microfinance' },
            slug: { type: 'string', example: 'acme-microfinance' },
            companyName: { type: 'string' },
            licenseNumber: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            physicalAddress: { type: 'string' },
            website: { type: 'string', format: 'uri' },
            plan: { 
              type: 'string', 
              enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] 
            },
            branding: { type: 'object' },
            config: { type: 'object' },
          },
        },
        // Customer schemas
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string' },
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Wanjiku' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '254723456789' },
            alternativePhone: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            nationalId: { type: 'string' },
            kraPin: { type: 'string' },
            employmentStatus: { 
              type: 'string', 
              enum: ['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'RETIRED'] 
            },
            employerName: { type: 'string' },
            incomeAmount: { type: 'number' },
            incomeFrequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'] },
            county: { type: 'string', example: 'Nairobi' },
            city: { type: 'string' },
            mpesaPhone: { type: 'string' },
            riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateCustomerRequest: {
          type: 'object',
          required: ['tenantId', 'firstName', 'lastName', 'phone'],
          properties: {
            tenantId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            alternativePhone: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string' },
            nationalId: { type: 'string' },
            kraPin: { type: 'string' },
            employmentStatus: { type: 'string' },
            employerName: { type: 'string' },
            incomeAmount: { type: 'number' },
            incomeFrequency: { type: 'string' },
            businessName: { type: 'string' },
            county: { type: 'string' },
            city: { type: 'string' },
            bankName: { type: 'string' },
            bankAccount: { type: 'string' },
            mpesaPhone: { type: 'string' },
          },
        },
        // Loan schemas
        Loan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            loanNumber: { type: 'string', example: 'LN-2024-000001' },
            tenantId: { type: 'string' },
            customerId: { type: 'string' },
            productId: { type: 'string' },
            principal: { type: 'number', example: 50000 },
            approvedAmount: { type: 'number' },
            interestRate: { type: 'number', example: 15.5 },
            interestType: { type: 'string', enum: ['FLAT', 'REDUCING_BALANCE'] },
            processingFee: { type: 'number' },
            insuranceFee: { type: 'number' },
            totalInterest: { type: 'number' },
            totalFees: { type: 'number' },
            totalRepayable: { type: 'number' },
            termDays: { type: 'integer', example: 90 },
            disbursementDate: { type: 'string', format: 'date-time' },
            maturityDate: { type: 'string', format: 'date' },
            outstandingBalance: { type: 'number' },
            status: { 
              type: 'string', 
              enum: ['APPROVED', 'PENDING_DISBURSEMENT', 'ACTIVE', 'IN_ARREARS', 'PAID_OFF', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF', 'CANCELLED']
            },
            arrearsStatus: { type: 'string', enum: ['CURRENT', '1_30_DAYS', '31_60_DAYS', '61_90_DAYS', 'OVER_90_DAYS'] },
            nextPaymentDue: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateLoanRequest: {
          type: 'object',
          required: ['tenantId', 'customerId', 'productId', 'principal', 'interestRate', 'termDays'],
          properties: {
            tenantId: { type: 'string' },
            customerId: { type: 'string' },
            applicationId: { type: 'string' },
            productId: { type: 'string' },
            principal: { type: 'number', minimum: 1000, maximum: 1000000 },
            approvedAmount: { type: 'number' },
            interestRate: { type: 'number', minimum: 0, maximum: 50 },
            interestType: { type: 'string', enum: ['FLAT', 'REDUCING_BALANCE'], default: 'FLAT' },
            processingFee: { type: 'number' },
            insuranceFee: { type: 'number' },
            termDays: { type: 'integer', minimum: 7, maximum: 365 },
            disbursementMethod: { type: 'string', enum: ['MPESA_B2C', 'BANK_TRANSFER', 'CHEQUE'] },
            disbursementAccount: { type: 'string' },
          },
        },
        UpdateLoanStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { 
              type: 'string', 
              enum: ['PENDING_DISBURSEMENT', 'ACTIVE', 'IN_ARREARS', 'PAID_OFF', 'RESTRUCTURED', 'DEFAULTED', 'WRITTEN_OFF', 'CANCELLED']
            },
            notes: { type: 'string' },
          },
        },
        // Payment schemas
        StkPushRequest: {
          type: 'object',
          required: ['phone', 'amount', 'accountReference'],
          properties: {
            phone: { type: 'string', example: '254712345678' },
            amount: { type: 'number', minimum: 10, maximum: 150000, example: 1500 },
            accountReference: { type: 'string', example: 'LN-2024-000001' },
            transactionDesc: { type: 'string', example: 'Loan repayment' },
            loanId: { type: 'string', format: 'uuid' },
          },
        },
        B2CDisbursementRequest: {
          type: 'object',
          required: ['phone', 'amount'],
          properties: {
            phone: { type: 'string', example: '254712345678' },
            amount: { type: 'number', minimum: 10, maximum: 150000 },
            occasion: { type: 'string', enum: ['SalaryPayment', 'Allowance', 'Withdrawal'], default: 'SalaryPayment' },
            remarks: { type: 'string' },
            commandID: { type: 'string', enum: ['SalaryPayment', 'BusinessPayment', 'PromotionPayment'], default: 'SalaryPayment' },
            loanId: { type: 'string', format: 'uuid' },
          },
        },
        StkPushResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            checkoutRequestID: { type: 'string' },
            merchantRequestID: { type: 'string' },
            responseCode: { type: 'string', example: '0' },
            responseDescription: { type: 'string' },
            customerMessage: { type: 'string' },
            instructions: { type: 'object' },
            estimatedWaitTime: { type: 'string' },
            pollingEndpoint: { type: 'string' },
          },
        },
        // Report schemas
        GenerateReportRequest: {
          type: 'object',
          required: ['reportId'],
          properties: {
            reportId: { type: 'string', example: 'portfolio-overview' },
            format: { type: 'string', enum: ['pdf', 'excel', 'csv'], default: 'pdf' },
            parameters: { type: 'object' },
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication & authorization endpoints' },
        { name: 'Tenants', description: 'Tenant (DCP) management - CRUD operations' },
        { name: 'Customers', description: 'Customer management, profiles, and KYC data' },
        { name: 'Loans', description: 'Loan lifecycle management' },
        { name: 'Payments', description: 'M-Pesa STK Push, B2C disbursements, payment history' },
        { name: 'Reports', description: 'Analytics, reporting, and data export' },
        { name: 'Applications', description: 'Loan application processing' },
        { name: 'Collections', description: 'Debt collection management' },
        { name: 'Finance', description: 'Financial operations & accounting' },
        { name: 'Credit', description: 'Credit scoring & risk assessment' },
        { name: 'Dashboard', description: 'Dashboard statistics & KPIs' },
        { name: 'Providers', description: 'Third-party service monitoring' },
        { name: 'Staff', description: 'Staff user management' },
        { name: 'Notifications', description: 'Notification management' },
        { name: 'Webhooks', description: 'External webhook handlers' },
      ],
    },
    apis: ['./src/routes/*.ts'],
  },
};

export const swaggerSpec = swaggerJsdoc(options);
