/**
 * Swagger/OpenAPI Configuration
 * 
 * Generates OpenAPI 3.0 specification for Digital Lending OS API.
 * Documentation available at /api-docs (Swagger UI) and /api-docs.json (raw JSON)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerJsdoc = require('swagger-jsdoc');

// Define the OpenAPI specification
const definition = {
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
};

const options = {
  definition,
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
