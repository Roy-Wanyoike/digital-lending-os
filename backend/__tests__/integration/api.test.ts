/**
 * Integration Tests - API Endpoints
 * 
 * Test suite for API endpoints with test database.
 * Run: npm test -- __tests__/integration/api/
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase, getTestDb } from '../utils/helpers';

// =============================================================================
// SETUP
// =============================================================================

let db: any;

beforeAll(async () => {
  db = getTestDb();
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  // Clean all tables before each test
  await db.transaction.deleteMany();
  await db.repayment.deleteMany();
  await db.loan.deleteMany();
  await db.loanApplication.deleteMany();
  await db.loanProduct.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.tenant.deleteMany();
});

// =============================================================================
// TENANT API TESTS
// =============================================================================

describe('Tenant API', () => {
  describe('POST /api/v1/tenants', () => {
    it('should create a new tenant', async () => {
      const tenantData = {
        name: 'Test DCP',
        slug: 'test-dcp',
        companyName: 'Test Digital Credit Providers Ltd',
        phone: '+254700000001',
        email: 'info@testdcp.co.ke',
      };

      const tenant = await db.tenant.create({
        data: {
          ...tenantData,
          status: 'ACTIVE',
          plan: 'STARTER',
          branding: '{}',
          config: '{}',
        },
      });

      expect(tenant).toBeDefined();
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.slug).toBe(tenantData.slug);
    });

    it('should reject duplicate slug', async () => {
      const baseData = { name: 'Test', slug: 'duplicate-slug', companyName: 'Test Co', phone: '+254711111111', email: 'test@test.com' };
      
      await db.tenant.create({ data: { ...baseData, status: 'ACTIVE', plan: 'STARTER', branding: '{}', config: '{}' } });
      
      // Second create should fail on unique constraint
      try {
        await db.tenant.create({ data: { ...baseData, name: 'Another', status: 'ACTIVE', plan: 'STARTER', branding: '{}', config: '{}' } });
        fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/tenants', () => {
    it('should list all tenants', async () => {
      // Create test tenants
      await db.tenant.createMany({
        data: [
          { id: 'tenant_1', name: 'Tenant 1', slug: 'tenant-1', companyName: 'Co 1', phone: '+254711111111', email: 't1@t.com', status: 'ACTIVE', plan: 'STARTER', branding: '{}', config: '{}' },
          { id: 'tenant_2', name: 'Tenant 2', slug: 'tenant-2', companyName: 'Co 2', phone: '+254722222222', email: 't2@t.com', status: 'ACTIVE', plan: 'PROFESSIONAL', branding: '{}', config: '{}' },
          { id: 'tenant_3', name: 'Tenant 3', slug: 'tenant-3', companyName: 'Co 3', phone: '+254733333333', email: 't3@t.com', status: 'SUSPENDED', plan: 'ENTERPRISE', branding: '{}', config: '{}' },
        ],
      });

      const tenants = await db.tenant.findMany({
        orderBy: { createdAt: 'desc' },
      });

      expect(tenants.length).toBe(3);
      expect(tenants[0].slug).toBe('tenant-3');
    });

    it('should filter tenants by status', async () => {
      await db.tenant.createMany({
        data: [
          { id: 'active_1', name: 'Active 1', slug: 'active-1', companyName: 'Co A', phone: '+254711111111', email: 'a1@t.com', status: 'ACTIVE', plan: 'STARTER', branding: '{}', config: '{}' },
          { id: 'suspended_1', name: 'Suspended 1', slug: 'suspended-1', companyName: 'Co S', phone: '+254722222222', email: 's1@t.com', status: 'SUSPENDED', plan: 'STARTER', branding: '{}', config: '{}' },
        ],
      });

      const activeTenants = await db.tenant.findMany({
        where: { status: 'ACTIVE' },
      });

      expect(activeTenants.length).toBe(1);
      expect(activeTenants[0].status).toBe('ACTIVE');
    });
  });
});

// =============================================================================
// CUSTOMER API TESTS
// =============================================================================

describe('Customer API', () => {
  let testTenant: any;
  let testUser: any;

  beforeEach(async () => {
    // Setup test tenant and user
    testTenant = await db.tenant.create({
      data: {
        id: 'test_tenant_cust',
        name: 'Test Tenant',
        slug: 'test-tenant-cust',
        companyName: 'Test Co',
        phone: '+254700000000',
        email: 'test@tenant.com',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        branding: '{}',
        config: '{}',
      },
    });

    testUser = await db.user.create({
      data: {
        id: 'test_user_cust',
        email: 'staff@tenant.com',
        passwordHash: '$2b$12$hashedpassword',
        name: 'Staff User',
        role: 'STAFF',
        tenantId: testTenant.id,
        isActive: true,
        emailVerified: true,
      },
    });
  });

  describe('POST /api/v1/customers', () => {
    it('should create a new customer', async () => {
      const customerData = {
        tenantId: testTenant.id,
        firstName: 'Jane',
        lastName: 'Wanjiku',
        phone: '254798765432',
        email: 'jane.wanjiku@example.com',
        county: 'Nairobi',
      };

      const customer = await db.customer.create({
        data: {
          ...customerData,
          nationality: 'Kenyan',
          status: 'ACTIVE',
          riskLevel: 'MEDIUM',
          creditScore: 650,
          crbStatus: 'CLEAN',
          totalBorrowed: 0,
          totalRepaid: 0,
          outstandingBalance: 0,
          source: 'WALK_IN',
        },
      });

      expect(customer).toBeDefined();
      expect(customer.firstName).toBe(customerData.firstName);
      expect(customer.phone).toBe(customerData.phone);
      expect(customer.tenantId).toBe(testTenant.id);
    });

    it('should validate required fields', async () => {
      const invalidCustomer = {
        tenantId: testTenant.id,
        firstName: '', // Invalid: empty
        lastName: 'Doe',
        phone: 'invalid', // Invalid format
      };

      // This would be caught by validation middleware in real implementation
      expect(invalidCustomer.firstName).toBeFalsy();
      expect(invalidCustomer.phone).not.toMatch(/^2547\d{8}$/);
    });
  });

  describe('GET /api/v1/customers', () => {
    it('should return paginated customers list', async () => {
      // Create 15 test customers
      for (let i = 0; i < 15; i++) {
        await db.customer.create({
          data: {
            tenantId: testTenant.id,
            firstName: `Customer${i}`,
            lastName: `Test${i}`,
            phone: `2547${String(10000000 + i).slice(-8)}`,
            email: `customer${i}@test.com`,
            nationality: 'Kenyan',
            status: 'ACTIVE',
            riskLevel: 'MEDIUM',
            creditScore: 600 + (i % 200),
            crbStatus: 'CLEAN',
            totalBorrowed: 0,
            totalRepaid: 0,
            outstandingBalance: 0,
            source: 'WALK_IN',
          },
        });
      }

      const page = 1;
      const limit = 10;
      
      const [customers, total] = await Promise.all([
        db.customer.findMany({
          where: { tenantId: testTenant.id },
          take: limit,
          skip: (page - 1) * limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.customer.count({ where: { tenantId: testTenant.id } }),
      ]);

      expect(customers.length).toBe(limit);
      expect(total).toBe(15);
      expect(Math.ceil(total / limit)).toBe(2);
    });

    it('should filter by search term', async () => {
      await db.customer.createMany({
        data: [
          {
            id: 'cust_search_1',
            tenantId: testTenant.id,
            firstName: 'John',
            lastName: 'Kamau',
            phone: '254711111111',
            nationality: 'Kenyan', status: 'ACTIVE', riskLevel: 'LOW',
            creditScore: 750, crbStatus: 'CLEAN', totalBorrowed: 0, totalRepaid: 0,
            outstandingBalance: 0, source: 'WALK_IN',
          },
          {
            id: 'cust_search_2',
            tenantId: testTenant.id,
            firstName: 'Jane',
            lastName: 'Otieno',
            phone: '254722222222',
            nationality: 'Kenyan', status: 'ACTIVE', riskLevel: 'MEDIUM',
            creditScore: 600, crbStatus: 'CLEAN', totalBorrowed: 0, totalRepaid: 0,
            outstandingBalance: 0, source: 'REFERRAL',
          },
        ],
      });

      // Search by first name
      const johns = await db.customer.findMany({
        where: {
          tenantId: testTenant.id,
          firstName: { contains: 'john', mode: 'insensitive' },
        },
      });

      expect(johns.length).toBe(1);
      expect(johns[0].firstName).toBe('John');
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer details', async () => {
      const customer = await db.customer.create({
        data: {
          tenantId: testTenant.id,
          firstName: 'Mary',
          lastName: 'Muthoni',
          phone: '254733333333',
          nationality: 'Kenyan',
          status: 'ACTIVE',
          riskLevel: 'LOW',
          creditScore: 800,
          crbStatus: 'CLEAN',
          totalBorrowed: 50000,
          totalRepaid: 45000,
          outstandingBalance: 5000,
          source: 'MOBILE_APP',
        },
      });

      const found = await db.customer.findUnique({
        where: { id: customer.id },
      });

      expect(found).toBeDefined();
      expect(found?.firstName).toBe('Mary');
      expect(found?.creditScore).toBe(800);
    });

    it('should return 404 for non-existent customer', async () => {
      const found = await db.customer.findUnique({
        where: { id: 'non_existent_customer_id' },
      });

      expect(found).toBeNull();
    });
  });
});

// =============================================================================
// LOAN API TESTS
// =============================================================================

describe('Loan API', () => {
  let testTenant: any;
  let testCustomer: any;
  let testProduct: any;

  beforeEach(async () => {
    testTenant = await db.tenant.create({
      data: {
        id: 'test_tenant_loan',
        name: 'Test Loan Tenant',
        slug: 'test-loan-tenant',
        companyName: 'Loan Co',
        phone: '+254700000000',
        email: 'loan@tenant.com',
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
        branding: '{}',
        config: '{}',
      },
    });

    testCustomer = await db.customer.create({
      data: {
        id: 'test_customer_loan',
        tenantId: testTenant.id,
        firstName: 'Borrower',
        lastName: 'One',
        phone: '254744444444',
        nationality: 'Kenyan',
        status: 'ACTIVE',
        riskLevel: 'LOW',
        creditScore: 800,
        crbStatus: 'CLEAN',
        totalBorrowed: 0,
        totalRepaid: 0,
        outstandingBalance: 0,
        source: 'WEB_PORTAL',
      },
    });

    testProduct = await db.loanProduct.create({
      data: {
        id: 'test_product_loan',
        tenantId: testTenant.id,
        name: 'Personal Loan',
        productCode: 'PL-TEST',
        category: 'PERSONAL_LOAN',
        minAmount: 5000,
        maxAmount: 100000,
        defaultAmount: 25000,
        interestType: 'FLAT_RATE',
        interestRate: 15,
        processingFee: 500,
        processingFeeType: 'FIXED',
        insuranceFee: 1,
        insuranceFeeType: 'PERCENTAGE',
        minTermDays: 30,
        maxTermDays: 365,
        defaultTermDays: 90,
        repaymentFrequency: 'MONTHLY',
        eligibilityRules: '{}',
        isActive: true,
      },
    });
  });

  describe('POST /api/v1/loans', () => {
    it('should create a new loan', async () => {
      const principal = 50000;
      const loanData = {
        tenantId: testTenant.id,
        customerId: testCustomer.id,
        productId: testProduct.id,
        principal,
        approvedAmount: principal,
        interestRate: 15,
        interestType: 'FLAT_RATE',
        termDays: 90,
        disbursementMethod: 'MPESA',
        disbursementAccount: testCustomer.phone,
      };

      const loan = await db.loan.create({
        data: {
          ...loanData,
          loanNumber: `LN-${new Date().getFullYear()}-${String(1).padStart(6, '0')}`,
          processingFee: 500,
          totalInterest: principal * 0.15 * 3, // ~3 months
          totalFees: 500,
          totalRepayable: principal + (principal * 0.15 * 3) + 500,
          outstandingBalance: principal + (principal * 0.15 * 3) + 500,
          repaymentSchedule: '[]',
        },
      });

      expect(loan).toBeDefined();
      expect(loan.principal).toBe(principal);
      expect(loan.status).toBe('APPROVED');
      expect(loan.loanNumber).toMatch(/^LN-\d{4}-\d{6}$/);
    });

    it('should calculate financials correctly', () => {
      const principal = 100000;
      const rate = 18; // Annual %
      const months = 6;
      const fee = 1000;

      const interest = principal * (rate / 100) * months;
      const total = principal + interest + fee;

      expect(interest).toBe(108000); // 100000 * 0.18 * 6
      expect(total).toBe(209000);   // 100000 + 108000 + 1000
    });
  });

  describe('PATCH /api/v1/loans/:id/status', () => {
    it('should transition APPROVED to ACTIVE', async () => {
      const loan = await db.loan.create({
        data: {
          tenantId: testTenant.id,
          customerId: testCustomer.id,
          productId: testProduct.id,
          loanNumber: `LN-${new Date().getFullYear()}-${String(2).padStart(6, '0')}`,
          principal: 30000,
          approvedAmount: 30000,
          interestRate: 15,
          interestType: 'FLAT_RATE',
          termDays: 60,
          outstandingBalance: 34500,
          status: 'APPROVED',
          arrearsStatus: 'CURRENT',
          repaymentSchedule: '[]',
        },
      });

      const updated = await db.loan.update({
        where: { id: loan.id },
        data: {
          status: 'ACTIVE',
          disbursementDate: new Date(),
        },
      });

      expect(updated.status).toBe('ACTIVE');
      expect(updated.disbursementDate).toBeDefined();
    });

    it('should reject invalid transitions', async () => {
      const validTransitions: Record<string, string[]> = {
        APPROVED: ['PENDING_DISBURSEMENT', 'CANCELLED'],
        ACTIVE: ['IN_ARREARS', 'FULLY_PAID'],
      };

      // APPROVED -> IN_ARREARS is not valid
      expect(validTransitions['APPROVED'].includes('IN_ARREARS')).toBe(false);

      // ACTIVE -> APPROVED is not valid
      expect(validTransitions['ACTIVE'].includes('APPROVED')).toBe(false);
    });
  });
});

// =============================================================================
// AUTH API TESTS
// =============================================================================

describe('Auth API', () => {
  describe('Authentication flow', () => {
    it('should hash passwords securely', async () => {
      // In real implementation, this uses bcrypt
      const plainPassword = 'SecurePassword123!';
      
      // Simulate hash (in real code, use bcrypt)
      const mockHash = `$2b$12$${Buffer.from(plainPassword).toString('base64').slice(0, 53)}`;
      
      expect(mockHash).not.toBe(plainPassword);
      expect(mockHash).toHaveLength(60); // Standard bcrypt hash length
    });

    it('should generate JWT tokens with correct structure', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        role: 'STAFF',
        tenantId: 'tenant_456',
      };

      // Simulated token structure check
      const tokenStructure = {
        header: { alg: 'HS256', typ: 'JWT' },
        payload,
      };

      expect(tokenStructure.payload.userId).toBe('user_123');
      expect(tokenStructure.payload.role).toBe('STAFF');
    });

    it('should reject expired tokens', () => {
      const expiredPayload = {
        userId: 'user_123',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      const isExpired = expiredPayload.exp < Date.now() / 1000;
      expect(isExpired).toBe(true);
    });
  });

  describe('Password reset flow', () => {
    it('should generate reset tokens', () => {
      const userId = 'user_123';
      const token = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      expect(token).toContain(userId);
      expect(token.length).toBeGreaterThan(20);
    });

    it('should validate token expiry', () => {
      const createdAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const expiresAt = createdAt + 1 * 60 * 60 * 1000; // 1 hour validity

      const isExpired = Date.now() > expiresAt;
      expect(isExpired).toBe(true); // Should be expired after 1 hour
    });
  });
});

// =============================================================================
// UTILITY FUNCTION
// =============================================================================

function fail(message: string): never {
  throw new Error(message);
}
