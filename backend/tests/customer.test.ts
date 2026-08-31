/**
 * Customer Service Unit Tests
 * 
 * Tests for customer CRUD operations, search functionality,
 * credit summary, and loan eligibility checks.
 */

import { CustomerService } from '../src/services/customer.service';
import { db } from '../src/lib/db';
import { RiskLevel, CreateCustomerInput } from '../src/types';

// Create a fresh instance for testing
const customerService = new CustomerService();

// Mock data factory
const createMockCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: 'customer-123',
  tenantId: 'tenant-456',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@email.com',
  phone: '+254712345678',
  alternativePhone: null,
  dateOfBirth: new Date('1990-01-15'),
  gender: 'MALE',
  nationalId: '12345678',
  kraPin: 'A123456789Z',
  employmentStatus: 'EMPLOYED',
  employerName: 'Test Corp',
  incomeAmount: 50000,
  incomeFrequency: 'MONTHLY',
  businessName: null,
  county: 'Nairobi',
  city: 'Nairobi',
  bankName: 'Equity Bank',
  bankAccount: '012345678901',
  mpesaPhone: '+254712345678',
  status: 'ACTIVE',
  riskLevel: RiskLevel.LOW as string,
  creditScore: 720,
  crbStatus: 'CLEAN',
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  loans: [],
  repayments: [],
  kycDocuments: [],
  ...overrides,
});

describe('CustomerService', () => {
  // ===========================================================================
  // FIND ALL TESTS
  // ===========================================================================
  describe('findAll()', () => {
    it('should return paginated list of customers', async () => {
      const mockCustomers = [createMockCustomer(), createMockCustomer({ id: 'customer-456' })];
      (db.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
      (db.customer.count as jest.Mock).mockResolvedValue(2);

      const result = await customerService.findAll({
        tenantId: 'tenant-456',
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by status', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);
      (db.customer.count as jest.Mock).mockResolvedValue(0);

      await customerService.findAll({
        tenantId: 'tenant-456',
        status: 'ACTIVE',
      });

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-456',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by risk level', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);
      (db.customer.count as jest.Mock).mockResolvedValue(0);

      await customerService.findAll({
        tenantId: 'tenant-456',
        riskLevel: RiskLevel.HIGH,
      });

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            riskLevel: RiskLevel.HIGH,
          }),
        })
      );
    });

    it('should apply search filter with OR conditions', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);
      (db.customer.count as jest.Mock).mockResolvedValue(0);

      await customerService.findAll({
        tenantId: 'tenant-456',
        search: 'John',
      });

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ lastName: expect.any(Object) }),
              expect.objectContaining({ phone: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ nationalId: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // FIND BY ID TESTS
  // ===========================================================================
  describe('findById()', () => {
    it('should return customer with full profile', async () => {
      const mockCustomer = createMockCustomer();
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.findById('customer-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('customer-123');
      expect(result!.firstName).toBe('John');
      expect(result!.lastName).toBe('Doe');
    });

    it('should throw NOT_FOUND when customer does not exist', async () => {
      (db.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(customerService.findById('nonexistent')).rejects.toThrow('Customer not found');
    });

    it('should include related loans and applications', async () => {
      (db.customer.findUnique as jest.Mock).mockResolvedValue(createMockCustomer());

      await customerService.findById('customer-123');

      expect(db.customer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            loans: expect.any(Object),
            loanApplications: expect.any(Object),
            kycDocuments: expect.any(Object),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // CREATE CUSTOMER TESTS
  // ===========================================================================
  describe('create()', () => {
    const validInput: CreateCustomerInput = {
      tenantId: 'tenant-456',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+254798765432',
      email: 'jane.smith@email.com',
    };

    it('should create a new customer with required fields', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(null); // No duplicate phone
      (db.customer.create as jest.Mock).mockResolvedValue(createMockCustomer(validInput));

      const result = await customerService.create(validInput);

      expect(result).toBeDefined();
      expect(db.customer.create).toHaveBeenCalled();
    });

    it('should throw error for duplicate phone number within tenant', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(createMockCustomer());

      await expect(customerService.create(validInput)).rejects.toThrow('phone number already exists');
    });

    it('should store all provided fields', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (db.customer.create as jest.Mock).mockResolvedValue({});

      const fullInput: CreateCustomerInput = {
        ...validInput,
        alternativePhone: '+254711122233',
        dateOfBirth: new Date('1985-05-20'),
        gender: 'FEMALE',
        nationalId: '87654321',
        kraPin: 'Z987654321A',
        employmentStatus: 'SELF_EMPLOYED',
        employerName: 'Self Employed',
        incomeAmount: 75000,
        incomeFrequency: 'MONTHLY',
        businessName: 'Jane Shop',
        county: 'Mombasa',
        city: 'Mombasa',
        bankName: 'KCB Bank',
        bankAccount: '987654321098',
        mpesaPhone: '+254798765432',
      };

      await customerService.create(fullInput);

      expect(db.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 'FEMALE',
            nationalId: '87654321',
            employerName: 'Self Employed',
            incomeAmount: 75000,
            businessName: 'Jane Shop',
          }),
        })
      );
    });

    it('should handle optional fields with null values', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (db.customer.create as jest.Mock).mockResolvedValue({});

      const minimalInput: CreateCustomerInput = {
        tenantId: 'tenant-456',
        firstName: 'Minimal',
        lastName: 'User',
        phone: '+254700000000',
      };

      await customerService.create(minimalInput);

      expect(db.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: null,
            alternativePhone: null,
            dateOfBirth: null,
            gender: null,
            nationalId: null,
            kraPin: null,
            employmentStatus: null,
            employerName: null,
            incomeAmount: null,
            incomeFrequency: null,
            businessName: null,
            county: null,
            city: null,
            bankName: null,
            bankAccount: null,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // FIND BY PHONE TESTS
  // ===========================================================================
  describe('findByPhone()', () => {
    it('should find customer by phone number', async () => {
      const mockCustomer = createMockCustomer();
      (db.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.findByPhone('tenant-456', '+254712345678');

      expect(result).toBeDefined();
      expect(result!.phone).toBe('+254712345678');
      expect(result!.firstName).toBe('John');
    });

    it('should return null if customer not found', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await customerService.findByPhone('tenant-456', '+254700000000');

      expect(result).toBeNull();
    });

    it('should scope search to specific tenant', async () => {
      (db.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await customerService.findByPhone('tenant-456', '+254712345678');

      expect(db.customer.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-456',
          phone: '+254712345678',
        },
        include: expect.objectContaining({
          loans: expect.any(Object),
        }),
      });
    });

    it('should include active loans in response', async () => {
      const mockLoans = [
        { id: 'loan-1', status: 'ACTIVE' },
        { id: 'loan-2', status: 'IN_ARREARS' },
      ];
      (db.customer.findFirst as jest.Mock).mockResolvedValue({
        ...createMockCustomer(),
        loans: mockLoans,
      });

      const result = await customerService.findByPhone('tenant-456', '+254712345678');

      expect(result!.loans).toHaveLength(2);
    });
  });

  // ===========================================================================
  // CREDIT SUMMARY TESTS
  // ===========================================================================
  describe('getCreditSummary()', () => {
    it('should return complete credit summary for customer', async () => {
      const mockCustomer = createMockCustomer({
        loans: [
          { id: 'loan-1', status: 'ACTIVE', principal: 10000, outstandingBalance: 8000, daysInArrears: 0, nextPaymentDue: new Date() },
          { id: 'loan-2', status: 'FULLY_PAID', principal: 5000, outstandingBalance: 0 },
        ],
        repayments: [
          { amount: 2000, status: 'COMPLETED', paymentDate: new Date(), dueDate: new Date(Date.now() - 86400000) },
          { amount: 1500, status: 'COMPLETED', paymentDate: new Date(), dueDate: new Date(Date.now() + 86400000) },
        ],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const summary = await customerService.getCreditSummary('customer-123');

      expect(summary.customerId).toBe('customer-123');
      expect(summary.customerName).toBe('John Doe');
      expect(summary.phone).toBe('+254712345678');
      expect(summary.totalLoans).toBe(2);
      expect(summary.activeLoans).toBe(1);
      expect(summary.completedLoans).toBe(1);
    });

    it('should calculate financial metrics correctly', async () => {
      const mockCustomer = createMockCustomer({
        loans: [
          { status: 'ACTIVE', principal: 10000, outstandingBalance: 8000, daysInArrears: 0 },
          { status: 'ACTIVE', principal: 5000, outstandingBalance: 4000, daysInArrears: 5 },
          { status: 'FULLY_PAID', principal: 8000, outstandingBalance: 0 },
        ],
        repayments: [
          { amount: 3000, status: 'COMPLETED', paymentDate: new Date(), dueDate: new Date(Date.now() - 86400000) },
          { amount: 2500, status: 'COMPLETED', paymentDate: new Date(), dueDate: new Date(Date.now() - 86400000) },
          { amount: 1000, status: 'PENDING', paymentDate: null, dueDate: new Date() },
        ],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const summary = await customerService.getCreditSummary('customer-123');

      expect(summary.totalBorrowed).toBe(23000); // 10000 + 5000 + 8000
      // Note: totalRepaid includes all repayments with amounts (including PENDING)
      expect(summary.totalRepaid).toBe(6500); // 3000 + 2500 + 1000 (PENDING)
      expect(summary.outstandingBalance).toBe(12000); // 8000 + 4000
    });

    it('should calculate on-time payment rate correctly', async () => {
      // onTimePayment: paid 1 day before due date
      const onTimePayment = { amount: 1000, status: 'COMPLETED', paymentDate: new Date(Date.now() - 86400000), dueDate: new Date(Date.now() - 43200000) };
      // latePayment: paid 1 day after due date
      const latePayment = { amount: 1000, status: 'COMPLETED', paymentDate: new Date(Date.now() + 86400000), dueDate: new Date(Date.now() - 43200000) };
      
      const mockCustomer = createMockCustomer({
        loans: [{ status: 'ACTIVE', principal: 1000, outstandingBalance: 800 }],
        repayments: [onTimePayment, latePayment],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const summary = await customerService.getCreditSummary('customer-123');

      // 1 out of 2 payments were on time = 50%
      expect(summary.onTimePaymentRate).toBe(50);
    });

    it('should default to 100% on-time rate when no completed repayments', async () => {
      const mockCustomer = createMockCustomer({
        loans: [{ status: 'ACTIVE', principal: 1000, outstandingBalance: 1000 }],
        repayments: [],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const summary = await customerService.getCreditSummary('customer-123');

      expect(summary.onTimePaymentRate).toBe(100);
    });

    it('should throw NOT_FOUND for nonexistent customer', async () => {
      (db.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(customerService.getCreditSummary('nonexistent')).rejects.toThrow('Customer not found');
    });

    it('should include risk level and CRB status', async () => {
      const mockCustomer = createMockCustomer({
        creditScore: 650,
        crbStatus: 'CLEAN',
        riskLevel: RiskLevel.MEDIUM,
        loans: [],
        repayments: [],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const summary = await customerService.getCreditSummary('customer-123');

      expect(summary.creditScore).toBe(650);
      expect(summary.crbStatus).toBe('CLEAN');
      expect(summary.riskLevel).toBe(RiskLevel.MEDIUM);
    });
  });

  // ===========================================================================
  // SEARCH TESTS
  // ===========================================================================
  describe('search()', () => {
    it('should return customers matching search query', async () => {
      const mockCustomers = [createMockCustomer()];
      (db.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const results = await customerService.search('tenant-456', 'John');

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('John');
    });

    it('should limit results', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);

      await customerService.search('tenant-456', 'test', 10);

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should use default limit of 20', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);

      await customerService.search('tenant-456', 'test');

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('should search across multiple fields', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);

      await customerService.search('tenant-456', 'searchterm');

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-456',
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ lastName: expect.any(Object) }),
              expect.objectContaining({ phone: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ nationalId: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should select only specified fields', async () => {
      (db.customer.findMany as jest.Mock).mockResolvedValue([]);

      await customerService.search('tenant-456', 'test');

      expect(db.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            riskLevel: true,
            status: true,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // UPDATE CUSTOMER TESTS
  // ===========================================================================
  describe('update()', () => {
    it('should update customer fields', async () => {
      const existingCustomer = createMockCustomer();
      (db.customer.findUnique as jest.Mock).mockResolvedValue(existingCustomer);
      (db.customer.update as jest.Mock).mockResolvedValue({});

      await customerService.update('customer-123', {
        firstName: 'Updated',
        email: 'newemail@test.com',
      });

      expect(db.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'customer-123' },
          data: expect.objectContaining({
            firstName: 'Updated',
            email: 'newemail@test.com',
          }),
        })
      );
    });

    it('should throw error for nonexistent customer', async () => {
      (db.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        customerService.update('nonexistent', {})
      ).rejects.toThrow('Customer not found');
    });
  });

  // ===========================================================================
  // STATUS UPDATE TESTS
  // ===========================================================================
  describe('updateStatus()', () => {
    it('should update customer status', async () => {
      (db.customer.update as jest.Mock).mockResolvedValue({});

      await customerService.updateStatus('customer-123', 'BLACKLISTED', 'Fraud suspicion');

      expect(db.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'customer-123' },
          data: expect.objectContaining({
            status: 'BLACKLISTED',
          }),
        })
      );
    });

    it('should append reason to notes', async () => {
      (db.customer.update as jest.Mock).mockResolvedValue({});

      await customerService.updateStatus('customer-123', 'SUSPENDED', 'KYC documents expired');

      expect(db.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('SUSPENDED'),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // LOAN ELIGIBILITY TESTS
  // ===========================================================================
  describe('checkLoanEligibility()', () => {
    it('should approve eligible customer', async () => {
      const mockCustomer = createMockCustomer({
        status: 'ACTIVE',
        incomeAmount: 50000,
        loans: [], // No active loans
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.eligible).toBe(true);
      expect(result.reasons).toHaveLength(0);
      expect(result.maxRecommendedAmount).toBeGreaterThan(0);
    });

    it('should reject blacklisted customer', async () => {
      const mockCustomer = createMockCustomer({
        status: 'BLACKLISTED',
        loans: [],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Customer is blacklisted');
    });

    it('should reject frozen account', async () => {
      const mockCustomer = createMockCustomer({
        status: 'FROZEN',
        loans: [],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Account is frozen');
    });

    it('should reject customer with max active loans', async () => {
      const mockCustomer = createMockCustomer({
        status: 'ACTIVE',
        loans: [
          { id: 'loan-1', status: 'ACTIVE', outstandingBalance: 5000 },
          { id: 'loan-2', status: 'ACTIVE', outstandingBalance: 3000 },
          { id: 'loan-3', status: 'IN_ARREARS', outstandingBalance: 2000 },
        ],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Maximum active loans reached (3)');
    });

    it('should reject customer with overdue loans', async () => {
      const mockCustomer = createMockCustomer({
        status: 'ACTIVE',
        loans: [
          { id: 'loan-1', status: 'ACTIVE', daysInArrears: 15, outstandingBalance: 5000 },
        ],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Has overdue loans');
    });

    it('should calculate recommended amount based on income', async () => {
      const highIncomeCustomer = createMockCustomer({
        status: 'ACTIVE',
        incomeAmount: 100000,
        loans: [],
      });
      (db.customer.findUnique as jest.Mock).mockResolvedValue(highIncomeCustomer);

      const result = await customerService.checkLoanEligibility('customer-123');

      expect(result.maxRecommendedAmount).toBeGreaterThan(50000);
    });

    it('should throw error for nonexistent customer', async () => {
      (db.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(customerService.checkLoanEligibility('nonexistent')).rejects.toThrow('Customer not found');
    });
  });

  // ===========================================================================
  // STATS TESTS
  // ===========================================================================
  describe('getStats()', () => {
    it('should return customer statistics for tenant', async () => {
      (db.customer.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(15) // new this month
        .mockResolvedValueOnce(50) // LOW risk
        .mockResolvedValueOnce(30) // MEDIUM risk
        .mockResolvedValueOnce(15) // HIGH risk
        .mockResolvedValueOnce(5); // VERY_HIGH risk

      const stats = await customerService.getStats('tenant-456');

      expect(stats.totalCustomers).toBe(100);
      expect(stats.activeCustomers).toBe(80);
      expect(stats.newThisMonth).toBe(15);
      expect(stats.byRiskLevel.LOW).toBe(50);
      expect(stats.byRiskLevel.MEDIUM).toBe(30);
      expect(stats.byRiskLevel.HIGH).toBe(15);
      expect(stats.byRiskLevel.VERY_HIGH).toBe(5);
    });
  });
});
