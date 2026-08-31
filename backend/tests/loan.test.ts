/**
 * Loan Service Unit Tests
 * 
 * Tests for loan lifecycle management including:
 * - Repayment schedule generation
 * - Loan approval and disbursement
 * - Arrears calculation
 * - Status transitions
 */

import { LoanService } from '../src/services/loan.service';
import { db } from '../src/lib/db';
import { LoanStatus, ArrearsStatus } from '../src/types';

// Create a fresh instance for testing
const loanService = new LoanService();

// Mock data factory
const createMockLoan = (overrides: Record<string, unknown> = {}) => ({
  id: 'loan-123',
  tenantId: 'tenant-456',
  customerId: 'customer-789',
  applicationId: null,
  productId: 'product-001',
  loanNumber: 'LN-2024-000001',
  principal: 50000,
  approvedAmount: 50000,
  interestRate: 15,
  interestType: 'FLAT_RATE',
  processingFee: 500,
  insuranceFee: 250,
  totalInterest: 7500,
  totalFees: 750,
  totalRepayable: 58250,
  termDays: 90,
  disbursementDate: new Date(),
  maturityDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  outstandingBalance: 58250,
  nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: LoanStatus.APPROVED,
  arrearsStatus: ArrearsStatus.CURRENT as string,
  daysInArrears: 0,
  disbursementMethod: 'MPESA',
  disbursementAccount: '+254712345678',
  disbursementReference: null,
  assignedCollector: null,
  closedAt: null,
  closureReason: null,
  repaymentSchedule: '[]',
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: {
    id: 'customer-789',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+254712345678',
  },
  product: {
    id: 'product-001',
    name: 'Personal Loan',
    category: 'PERSONAL',
  },
  repayments: [],
  ...overrides,
});

describe('LoanService', () => {
  // ===========================================================================
  // REPAYMENT SCHEDULE GENERATION TESTS
  // ===========================================================================
  describe('generateRepaymentSchedule()', () => {
    it('should generate correct number of installments for flat rate', () => {
      const schedule = loanService.generateRepaymentSchedule(
        10000, // principal
        12, // annualRate
        180, // termDays
        6, // installments
        'FLAT_RATE'
      );

      expect(schedule).toHaveLength(6);
      schedule.forEach((item, index) => {
        expect(item.installmentNo).toBe(index + 1);
        expect(item.status).toBeDefined();
        expect(typeof item.total).toBe('number');
      });
    });

    it('should generate correct number of installments for reducing balance', () => {
      const schedule = loanService.generateRepaymentSchedule(
        10000,
        12,
        360,
        12,
        'REDUCING_BALANCE'
      );

      expect(schedule).toHaveLength(12);
    });

    it('should calculate positive values for each installment', () => {
      const schedule = loanService.generateRepaymentSchedule(
        50000,
        15,
        90,
        3,
        'FLAT_RATE'
      );

      schedule.forEach((item) => {
        expect(item.principal).toBeGreaterThan(0);
        expect(item.interest).toBeGreaterThanOrEqual(0);
        expect(item.total).toBeGreaterThan(0);
        expect(item.total).toBe(item.principal + item.interest + item.fees);
      });
    });

    it('flat rate should have equal principal payments', () => {
      const principal = 60000;
      const installments = 6;
      
      const schedule = loanService.generateRepaymentSchedule(
        principal,
        10,
        180,
        installments,
        'FLAT_RATE'
      );

      const principalPayments = schedule.map(item => item.principal);
      // All principal payments should be approximately equal
      const firstPayment = principalPayments[0];
      principalPayments.forEach(payment => {
        expect(payment).toBeCloseTo(firstPayment, 2);
      });
    });

    it('reducing balance should have decreasing interest payments', () => {
      const schedule = loanService.generateRepaymentSchedule(
        100000,
        18,
        360,
        12,
        'REDUCING_BALANCE'
      );

      const interestPayments = schedule.map(item => item.interest);
      for (let i = 1; i < interestPayments.length; i++) {
        expect(interestPayments[i]).toBeLessThan(interestPayments[i - 1]);
      }
    });

    it('should generate valid due dates', () => {
      const baseDate = new Date();
      const schedule = loanService.generateRepaymentSchedule(
        10000,
        10,
        120,
        4,
        'FLAT_RATE'
      );

      schedule.forEach((item) => {
        const dueDate = new Date(item.dueDate);
        expect(dueDate.getTime()).not.toBeNaN();
        expect(dueDate).toBeInstanceOf(Date);
        expect(dueDate.getTime()).toBeGreaterThan(baseDate.getTime());
      });
    });

    it('first installment status should be PENDING', () => {
      const schedule = loanService.generateRepaymentSchedule(
        10000,
        10,
        90,
        5,
        'FLAT_RATE'
      );

      expect(schedule[0].status).toBe('PENDING');
    });

    it('total repayment should sum correctly', () => {
      const principal = 100000;
      const annualRate = 15;
      const termDays = 180;
      const installments = 6;

      const schedule = loanService.generateRepaymentSchedule(
        principal,
        annualRate,
        termDays,
        installments,
        'FLAT_RATE'
      );

      const totalFromSchedule = schedule.reduce((sum, item) => sum + item.total, 0);
      const expectedTotalPrincipal = schedule.reduce((sum, item) => sum + item.principal, 0);

      // Total principal in schedule should match original principal (approximately)
      expect(expectedTotalPrincipal).toBeCloseTo(principal, 0);
    });
  });

  // ===========================================================================
  // LOAN APPROVAL TESTS
  // ===========================================================================
  describe('approve()', () => {
    it('should transition status to PENDING_DISBURSEMENT', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.APPROVED });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.approve('loan-123', { approvedBy: 'user-1' });

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loan-123' },
          data: expect.objectContaining({
            status: 'PENDING_DISBURSEMENT',
          }),
        })
      );
    });

    it('should update approved amount if provided', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.APPROVED, principal: 50000 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.approve('loan-123', {
        approvedAmount: 40000,
        approvedBy: 'user-1',
      });

      const updateData = (db.loan.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.approvedAmount).toBe(40000);
      expect(updateData.principal).toBe(40000);
    });

    it('should recalculate totals when amount changes', async () => {
      const mockLoan = createMockLoan({ 
        status: LoanStatus.APPROVED, 
        principal: 50000, 
        interestRate: 15,
        processingFee: 500,
        insuranceFee: 250,
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.approve('loan-123', {
        approvedAmount: 30000,
        approvedBy: 'user-1',
      });

      const updateData = (db.loan.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.totalInterest).toBeDefined();
      expect(updateData.totalRepayable).toBeGreaterThan(30000);
      expect(updateData.outstandingBalance).toBe(updateData.totalRepayable);
    });

    it('should throw error for nonexistent loan', async () => {
      (db.loan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(loanService.approve('nonexistent', {})).rejects.toThrow('Loan not found');
    });

    it('should reject approval for invalid current status', async () => {
      const activeLoan = createMockLoan({ status: LoanStatus.ACTIVE });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(activeLoan);

      await expect(loanService.approve('loan-123', {})).rejects.toThrow('cannot be approved');
    });

    it('should update interest rate if provided', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.PENDING_DISBURSEMENT, interestRate: 15 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.approve('loan-123', { interestRate: 18 });

      const updateData = (db.loan.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.interestRate).toBe(18);
    });

    it('should regenerate schedule when term changes', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.PENDING_DISBURSEMENT, termDays: 90 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.approve('loan-123', { termDays: 180 });

      const updateData = (db.loan.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.termDays).toBe(180);
      expect(updateData.repaymentSchedule).toBeDefined();
    });
  });

  // ===========================================================================
  // LOAN DISBURSEMENT TESTS
  // ===========================================================================
  describe('disburse()', () => {
    it('should set disbursement date on disburse', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.PENDING_DISBURSEMENT });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});
      (db.transaction.create as jest.Mock).mockResolvedValue({});

      await loanService.disburse('loan-123', 'REF-001');

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loan-123' },
          data: expect.objectContaining({
            status: 'ACTIVE',
            disbursementDate: expect.any(Date),
            disbursementReference: 'REF-001',
          }),
        })
      );
    });

    it('should create disbursement transaction', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.APPROVED, approvedAmount: 50000 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});
      (db.transaction.create as jest.Mock).mockResolvedValue({});

      await loanService.disburse('loan-123', 'TXN-REF-123');

      expect(db.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: 'DISBURSEMENT',
            entityType: 'LOAN',
            entityId: 'loan-123',
            amount: 50000,
            externalRef: 'TXN-REF-123',
          }),
        })
      );
    });

    it('should throw error for nonexistent loan', async () => {
      (db.loan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(loanService.disburse('nonexistent', 'REF-001')).rejects.toThrow('Loan not found');
    });

    it('should reject disbursement for invalid status', async () => {
      const activeLoan = createMockLoan({ status: LoanStatus.ACTIVE });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(activeLoan);

      await expect(loanService.disburse('loan-123', 'REF-001')).rejects.toThrow('not ready for disbursement');
    });
  });

  // ===========================================================================
  // ARREARS CALCULATION TESTS
  // ===========================================================================
  describe('calculateArrears()', () => {
    it('should return zero days for current loan', async () => {
      const futureDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const mockLoan = createMockLoan({
        nextPaymentDue: futureDueDate,
        outstandingBalance: 50000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.daysInArrears).toBe(0);
      expect(result.arrearsStatus).toBe(ArrearsStatus.CURRENT);
      expect(result.penaltyAmount).toBe(0);
    });

    it('should calculate days in arrears correctly', async () => {
      const pastDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 30000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.daysInArrears).toBeGreaterThanOrEqual(14); // Allow for test timing
      expect(result.daysInArrears).toBeLessThanOrEqual(16);
    });

    it('should set DAYS_1_7 status for 1-7 days overdue', async () => {
      const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 20000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.arrearsStatus).toBe(ArrearsStatus.DAYS_1_7);
    });

    it('should set DAYS_8_30 status for 8-30 days overdue', async () => {
      const pastDueDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 20000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.arrearsStatus).toBe(ArrearsStatus.DAYS_8_30);
    });

    it('should set DAYS_31_60 status for 31-60 days overdue', async () => {
      const pastDueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 15000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.arrearsStatus).toBe(ArrearsStatus.DAYS_31_60);
    });

    it('should set DAYS_61_90 status for 61-90 days overdue', async () => {
      const pastDueDate = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 10000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.arrearsStatus).toBe(ArrearsStatus.DAYS_61_90);
    });

    it('should set DAYS_91_PLUS status for 90+ days overdue', async () => {
      const pastDueDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 8000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.arrearsStatus).toBe(ArrearsStatus.DAYS_91_PLUS);
    });

    it('should calculate penalty based on outstanding balance and days', async () => {
      const pastDueDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 50000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.penaltyAmount).toBeGreaterThan(0);
    });

    it('should use existing daysInArrears if greater than calculated', async () => {
      const futureDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: futureDueDate,
        outstandingBalance: 30000,
        daysInArrears: 45, // Existing higher value
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.daysInArrears).toBe(45);
    });

    it('should identify installment as overdue when payment date passed', async () => {
      const pastDueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const mockLoan = createMockLoan({
        nextPaymentDue: pastDueDate,
        outstandingBalance: 20000,
        daysInArrears: 0,
        repayments: [],
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.calculateArrears('loan-123');

      expect(result.installmentOverdue).toBe(true);
    });

    it('should throw error for nonexistent loan', async () => {
      (db.loan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(loanService.calculateArrears('nonexistent')).rejects.toThrow('Loan not found');
    });
  });

  // ===========================================================================
  // STATUS UPDATE TESTS
  // ===========================================================================
  describe('updateStatus()', () => {
    it('should allow valid APPROVED to PENDING_DISBURSEMENT transition', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.APPROVED });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateStatus('loan-123', LoanStatus.PENDING_DISBURSEMENT);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LoanStatus.PENDING_DISBURSEMENT,
          }),
        })
      );
    });

    it('should allow ACTIVE to FULLY_PAID transition with balance reset', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.ACTIVE, outstandingBalance: 10000 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateStatus('loan-123', LoanStatus.FULLY_PAID);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LoanStatus.FULLY_PAID,
            outstandingBalance: 0,
            closedAt: expect.any(Date),
            closureReason: 'Fully paid',
          }),
        })
      );
    });

    it('should allow IN_ARREARS to WRITTEN_OFF transition', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.IN_ARREARS, outstandingBalance: 5000 });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateStatus('loan-123', LoanStatus.WRITTEN_OFF, 'Uncollectible debt');

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LoanStatus.WRITTEN_OFF,
            outstandingBalance: 0,
            closedAt: expect.any(Date),
            closureReason: 'Uncollectible debt',
          }),
        })
      );
    });

    it('should reject invalid status transitions', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.FULLY_PAID });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      await expect(
        loanService.updateStatus('loan-123', LoanStatus.APPROVED)
      ).rejects.toThrow('Invalid status transition');
    });

    it('should set disbursement date for ACTIVE/DISBURSED transitions', async () => {
      const mockLoan = createMockLoan({ status: LoanStatus.PENDING_DISBURSEMENT });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateStatus('loan-123', LoanStatus.ACTIVE);

      const updateData = (db.loan.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.disbursementDate).toEqual(expect.any(Date));
    });

    it('should throw NOT_FOUND for nonexistent loan', async () => {
      (db.loan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        loanService.updateStatus('nonexistent', LoanStatus.CANCELLED)
      ).rejects.toThrow('Loan not found');
    });
  });

  // ===========================================================================
  // FIND ALL TESTS
  // ===========================================================================
  describe('findAll()', () => {
    it('should return paginated list of loans', async () => {
      const mockLoans = [createMockLoan(), createMockLoan({ id: 'loan-456' })];
      (db.loan.findMany as jest.Mock).mockResolvedValue(mockLoans);
      (db.loan.count as jest.Mock).mockResolvedValue(2);

      const result = await loanService.findAll({
        tenantId: 'tenant-456',
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      (db.loan.findMany as jest.Mock).mockResolvedValue([]);
      (db.loan.count as jest.Mock).mockResolvedValue(0);

      await loanService.findAll({
        tenantId: 'tenant-456',
        status: LoanStatus.ACTIVE,
      });

      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LoanStatus.ACTIVE,
          }),
        })
      );
    });

    it('should filter by customer ID', async () => {
      (db.loan.findMany as jest.Mock).mockResolvedValue([]);
      (db.loan.count as jest.Mock).mockResolvedValue(0);

      await loanService.findAll({
        tenantId: 'tenant-456',
        customerId: 'customer-789',
      });

      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'customer-789',
          }),
        })
      );
    });

    it('should include customer and product details', async () => {
      (db.loan.findMany as jest.Mock).mockResolvedValue([]);
      (db.loan.count as jest.Mock).mockResolvedValue(0);

      await loanService.findAll({ tenantId: 'tenant-456' });

      expect(db.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            customer: expect.any(Object),
            product: expect.any(Object),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // FIND BY ID TESTS
  // ===========================================================================
  describe('findById()', () => {
    it('should return loan with full details', async () => {
      const mockLoan = createMockLoan();
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.findById('loan-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('loan-123');
      expect(result!.principal).toBe(50000);
    });

    it('should parse JSON repayment schedule', async () => {
      const scheduleData = [{ installmentNo: 1, total: 1000 }];
      const mockLoan = createMockLoan({
        repaymentSchedule: JSON.stringify(scheduleData),
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.findById('loan-123');

      expect(result!.parsedRepaymentSchedule).toEqual(scheduleData);
    });

    it('should handle malformed schedule gracefully', async () => {
      const mockLoan = createMockLoan({
        repaymentSchedule: 'not-valid-json',
      });
      (db.loan.findUnique as jest.Mock).mockResolvedValue(mockLoan);

      const result = await loanService.findById('loan-123');

      expect(result!.parsedRepaymentSchedule).toBeNull();
    });

    it('should throw NOT_FOUND for nonexistent loan', async () => {
      (db.loan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(loanService.findById('nonexistent')).rejects.toThrow('Loan not found');
    });
  });

  // ===========================================================================
  // ARREARS STATUS UPDATE TESTS
  // ===========================================================================
  describe('updateArrearsStatus()', () => {
    it('should set CURRENT for zero or negative days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 0);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            daysInArrears: 0,
            arrearsStatus: ArrearsStatus.CURRENT,
          }),
        })
      );
    });

    it('should set DAYS_1_7 for 1-7 days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 5);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            arrearsStatus: ArrearsStatus.DAYS_1_7,
          }),
        })
      );
    });

    it('should set DAYS_8_30 for 8-30 days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 20);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            arrearsStatus: ArrearsStatus.DAYS_8_30,
          }),
        })
      );
    });

    it('should set DAYS_31_60 for 31-60 days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 45);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            arrearsStatus: ArrearsStatus.DAYS_31_60,
          }),
        })
      );
    });

    it('should set DAYS_61_90 for 61-90 days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 75);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            arrearsStatus: ArrearsStatus.DAYS_61_90,
          }),
        })
      );
    });

    it('should set DAYS_91_PLUS for 90+ days', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 100);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            arrearsStatus: ArrearsStatus.DAYS_91_PLUS,
          }),
        })
      );
    });

    it('should set loan status to IN_ARREARS when days > 0', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.updateArrearsStatus('loan-123', 15);

      expect(db.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LoanStatus.IN_ARREARS,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // COLLECTOR ASSIGNMENT TESTS
  // ===========================================================================
  describe('assignCollector()', () => {
    it('should assign collector to loan', async () => {
      (db.loan.update as jest.Mock).mockResolvedValue({});

      await loanService.assignCollector('loan-123', 'collector-1');

      expect(db.loan.update).toHaveBeenCalledWith({
        where: { id: 'loan-123' },
        data: { assignedCollector: 'collector-1' },
      });
    });
  });

  // ===========================================================================
  // STATS TESTS
  // ===========================================================================
  describe('getStats()', () => {
    it('should return loan statistics for tenant', async () => {
      (db.loan.count as jest.Mock)
        .mockResolvedValueOnce(100) // total loans
        .mockResolvedValueOnce(50) // active loans
        .mockResolvedValueOnce(10); // overdue loans
      (db.loan.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { principal: 5000000 } }) // disbursed
        .mockResolvedValueOnce({ _sum: { outstandingBalance: 2500000 } }); // outstanding
      (db.loan.count as jest.Mock)
        .mockResolvedValueOnce(5); // defaulted

      const stats = await loanService.getStats('tenant-456');

      expect(stats.totalLoans).toBe(100);
      expect(stats.activeLoans).toBe(50);
      expect(stats.totalDisbursed).toBe(5000000);
      expect(stats.totalOutstanding).toBe(2500000);
      expect(stats.overdueLoans).toBe(10);
      expect(stats.defaultedLoans).toBe(5);
    });
  });
});
