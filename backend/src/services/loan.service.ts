/**
 * Loan Service
 * 
 * Business logic for loan lifecycle management including:
 * - Loan creation and approval
 * - Repayment schedule generation
 * - Status transitions
 * - Disbursement processing
 */

import { logger } from '../utils/logger';
import { config } from '../config';
import { db } from '../lib/db';
import { CreateLoanInput, LoanStatus, ArrearsStatus } from '../types';

export interface LoanQueryParams {
  page?: number;
  limit?: number;
  tenantId: string;
  status?: LoanStatus;
  customerId?: string;
  arrearsStatus?: ArrearsStatus;
}

export interface RepaymentScheduleItem {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'WAIVED';
  paidDate?: Date;
  paidAmount?: number;
}

export class LoanService {
  /**
   * List loans with filtering and pagination
   */
  async findAll(params: LoanQueryParams) {
    const { page = 1, limit = 20, tenantId, status, customerId, arrearsStatus } = params;

    const where: Record<string, unknown> = { tenantId };
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (arrearsStatus) where.arrearsStatus = arrearsStatus;

    const [loans, total] = await Promise.all([
      db.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          product: {
            select: { id: true, name: true, category: true },
          },
          _count: {
            select: { repayments: true },
          },
        },
      }),
      db.loan.count({ where }),
    ]);

    return {
      items: loans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get loan by ID with full details including schedule
   */
  async findById(id: string) {
    const loan = await db.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        application: true,
        repayments: {
          orderBy: { paymentDate: 'desc' },
          take: 12,
        },
      },
    });

    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Parse repayment schedule if stored as JSON
    let repaymentSchedule = null;
    if (typeof loan.repaymentSchedule === 'string') {
      try {
        repaymentSchedule = JSON.parse(loan.repaymentSchedule);
      } catch {
        repaymentSchedule = null;
      }
    }

    return {
      ...loan,
      parsedRepaymentSchedule: repaymentSchedule,
    };
  }

  /**
   * Create new loan from approved application
   */
  async create(data: CreateLoanInput) {
    // Verify customer exists and belongs to tenant
    const customer = await db.customer.findFirst({
      where: { id: data.customerId, tenantId: data.tenantId },
    });

    if (!customer) {
      const error: any = new Error('Customer not found or does not belong to this tenant');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Verify product exists
    const product = await db.loanProduct.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      const error: any = new Error('Product not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Generate loan number
    const loanCount = await db.loan.count({
      where: { tenantId: data.tenantId },
    });
    const loanNumber = `LN-${new Date().getFullYear()}-${String(loanCount + 1).padStart(6, '0')}`;

    // Calculate financials
    const actualAmount = data.approvedAmount || data.principal;
    const months = Math.ceil(data.termDays / 30);
    const monthlyRate = data.interestRate / 100;
    const totalInterest = this.calculateTotalInterest(
      data.principal,
      data.interestRate,
      data.termDays,
      data.interestType || 'FLAT_RATE'
    );
    const totalFees = (data.processingFee || 0) + (data.insuranceFee || 0);
    const totalRepayable = data.principal + totalInterest + totalFees;

    // Generate repayment schedule
    const schedule = this.generateRepaymentSchedule(
      data.principal,
      data.interestRate,
      data.termDays,
      months,
      data.interestType || 'FLAT_RATE'
    );

    // Calculate dates
    const disbursementDate = new Date();
    const maturityDate = new Date(disbursementDate);
    maturityDate.setDate(maturityDate.getDate() + data.termDays);

    const loan = await db.loan.create({
      data: {
        tenantId: data.tenantId,
        customerId: data.customerId,
        applicationId: data.applicationId || null,
        productId: data.productId,
        loanNumber,
        principal: data.principal,
        approvedAmount: actualAmount,
        interestRate: data.interestRate,
        interestType: data.interestType || 'FLAT_RATE',
        processingFee: data.processingFee || 0,
        insuranceFee: data.insuranceFee || 0,
        totalInterest,
        totalFees,
        totalRepayable,
        termDays: data.termDays,
        disbursementDate,
        maturityDate,
        outstandingBalance: totalRepayable,
        nextPaymentDue: this.getNextPaymentDate(disbursementDate, 30),
        status: 'APPROVED',
        arrearsStatus: 'CURRENT',
        disbursementMethod: data.disbursementMethod,
        disbursementAccount: data.disbursementAccount || null,
        repaymentSchedule: JSON.stringify(schedule),
      },
    });

    logger.info('Loan created', { loanId: loan.id, loanNumber, customerId: data.customerId });

    return loan;
  }

  /**
   * Update loan status (disburse, activate, write off, etc.)
   */
  async updateStatus(loanId: string, newStatus: LoanStatus, notes?: string, userId?: string): Promise<any> {
    const existingLoan = await db.loan.findUnique({ where: { id: loanId } });
    if (!existingLoan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Validate transition
    const validTransitions: Record<string, LoanStatus[]> = {
      APPROVED: ['PENDING_DISBURSEMENT', 'CANCELLED'],
      PENDING_DISBURSEMENT: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['IN_ARREARS', 'FULLY_PAID', 'RESTRUCTURED', 'DEFAULTED'],
      IN_ARREARS: ['ACTIVE', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'],
      DEFAULTED: ['WRITTEN_OFF', 'RESTRUCTURED'],
    };

    const allowedTargets = validTransitions[existingLoan.status] || [];
    if (!allowedTargets.includes(newStatus)) {
      const error: any = new Error(`Invalid status transition from ${existingLoan.status} to ${newStatus}`);
      error.code = 'INVALID_TRANSITION';
      throw error;
    }

    const updateData: Record<string, any> = { status: newStatus };

    // Handle specific transitions
    switch (newStatus) {
      case 'PENDING_DISBURSEMENT':
        updateData.disbursementDate = null;
        break;
      case 'ACTIVE':
      case 'DISBURSED':
        updateData.disbursementDate = new Date();
        break;
      case 'FULLY_PAID':
        updateData.outstandingBalance = 0;
        updateData.closedAt = new Date();
        updateData.closureReason = 'Fully paid';
        break;
      case 'WRITTEN_OFF':
        updateData.outstandingBalance = 0;
        updateData.closedAt = new Date();
        updateData.closureReason = notes || 'Written off';
        break;
    }

    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    logger.info('Loan status updated', { 
      loanId, 
      oldStatus: existingLoan.status, 
      newStatus, 
      updatedBy: userId 
    });

    return updatedLoan;
  }

  /**
   * Approve a loan and set it ready for disbursement
   * 
   * @param loanId - The loan ID to approve
   * @param data - Approval data including approvedAmount, notes, etc.
   * @returns Updated loan object
   */
  async approve(loanId: string, data: {
    approvedAmount?: number;
    interestRate?: number;
    termDays?: number;
    approvedBy?: string;
    notes?: string;
  }) {
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    
    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!['APPROVED', 'PENDING_DISBURSEMENT'].includes(loan.status)) {
      const error: any = new Error(`Loan cannot be approved in current status: ${loan.status}`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const updateData: Record<string, unknown> = {
      status: 'PENDING_DISBURSEMENT',
    };

    // Update financials if provided
    if (data.approvedAmount) {
      updateData.approvedAmount = data.approvedAmount;
      // Recalculate totals based on new amount
      const totalInterest = this.calculateTotalInterest(
        data.approvedAmount,
        data.interestRate || loan.interestRate,
        data.termDays || loan.termDays,
        loan.interestType
      );
      updateData.totalInterest = totalInterest;
      updateData.totalRepayable = data.approvedAmount + totalInterest + loan.processingFee + loan.insuranceFee;
      updateData.outstandingBalance = updateData.totalRepayable;
      updateData.principal = data.approvedAmount;
    }

    if (data.interestRate) {
      updateData.interestRate = data.interestRate;
    }

    if (data.termDays) {
      updateData.termDays = data.termDays;
      // Recalculate maturity date
      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + data.termDays);
      updateData.maturityDate = maturityDate;
      
      // Regenerate schedule
      const months = Math.ceil(data.termDays / 30);
      const schedule = this.generateRepaymentSchedule(
        updateData.principal || loan.principal,
        data.interestRate || loan.interestRate,
        data.termDays,
        months,
        loan.interestType
      );
      updateData.repaymentSchedule = JSON.stringify(schedule);
    }

    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: updateData,
    });

    logger.info('Loan approved', { 
      loanId, 
      approvedBy: data.approvedBy,
      approvedAmount: data.approvedAmount 
    });

    return updatedLoan;
  }

  /**
   * Calculate arrears information for a loan
   * 
   * @param loanId - The loan ID to calculate arrears for
   * @returns Arrears information object
   */
  async calculateArrears(loanId: string): Promise<{
    daysInArrears: number;
    arrearsAmount: number;
    penaltyAmount: number;
    arrearsStatus: ArrearsStatus;
    lastPaymentDate: Date | null;
    nextPaymentDue: Date | null;
    installmentOverdue: boolean;
  }> {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: {
        repayments: {
          orderBy: { paymentDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const now = new Date();
    const nextPaymentDue = loan.nextPaymentDue ? new Date(loan.nextPaymentDue) : null;
    
    // Calculate days in arrears
    let daysInArrears = 0;
    if (nextPaymentDue && now > nextPaymentDue && loan.outstandingBalance > 0) {
      const diffTime = Math.abs(now.getTime() - nextPaymentDue.getTime());
      daysInArrears = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Use existing days in arrears if greater
    daysInArrears = Math.max(daysInArrears, loan.daysInArrears || 0);

    // Calculate penalty (5% of outstanding balance per month, prorated)
    const monthlyPenaltyRate = config.loans?.penaltyRateDaily || 1; // Daily rate
    const penaltyAmount = daysInArrears > 0 
      ? Math.round(loan.outstandingBalance * (monthlyPenaltyRate / 100) * daysInArrears * 100) / 100
      : 0;

    // Determine arrears status
    let arrearsStatus: ArrearsStatus = 'CURRENT';
    if (daysInArrears <= 0) {
      arrearsStatus = 'CURRENT';
    } else if (daysInArrears <= 7) {
      arrearsStatus = 'DAYS_1_7';
    } else if (daysInArrears <= 30) {
      arrearsStatus = 'DAYS_8_30';
    } else if (daysInArrears <= 60) {
      arrearsStatus = 'DAYS_31_60';
    } else if (daysInArrears <= 90) {
      arrearsStatus = 'DAYS_61_90';
    } else {
      arrearsStatus = 'DAYS_91_PLUS';
    }

    // Get last payment date
    const lastPayment = loan.repayments[0];
    const lastPaymentDate = lastPayment ? lastPayment.paymentDate : null;

    // Check if current installment is overdue
    const installmentOverdue = nextPaymentDue ? now > nextPaymentDue : false;

    return {
      daysInArrears,
      arrearsAmount: loan.outstandingBalance,
      penaltyAmount,
      arrearsStatus,
      lastPaymentDate,
      nextPaymentDue,
      installmentOverdue,
    };
  }

  /**
   * Get detailed status for a loan including all related information
   * 
   * @param loanId - The loan ID to get status for
   * @returns Detailed loan information
   */
  async getStatus(loanId: string) {
    const loan = await this.findById(loanId);
    const arrearsInfo = await this.calculateArrears(loanId);
    
    return {
      ...loan,
      arrearsInfo,
    };
  }

  /**
   * Process loan disbursement
   */
  async disburse(loanId: string, referenceNumber: string): Promise<void> {
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    if (!['APPROVED', 'PENDING_DISBURSEMENT'].includes(loan.status)) {
      throw new Error('Loan is not ready for disbursement');
    }

    await db.loan.update({
      where: { id: loanId },
      data: {
        status: 'ACTIVE',
        disbursementDate: new Date(),
        disbursementReference: referenceNumber,
      },
    });

    // Create disbursement transaction
    await db.transaction.create({
      data: {
        tenantId: loan.tenantId,
        referenceNumber: `TXN-${Date.now()}`,
        transactionType: 'DISBURSEMENT',
        entityType: 'LOAN',
        entityId: loanId,
        debitAccount: 'Loans_Receivable',
        creditAccount: 'Cash_At_Bank',
        amount: loan.approvedAmount,
        description: `Loan disbursement for ${loan.loanNumber}`,
        externalRef: referenceNumber,
      },
    });

    logger.info('Loan disbursed', { loanId, referenceNumber });
  }

  /**
   * Calculate total interest based on method
   */
  private calculateTotalInterest(
    principal: number,
    annualRate: number,
    termDays: number,
    interestType: string
  ): number {
    const months = Math.ceil(termDays / 30);

    switch (interestType) {
      case 'FLAT_RATE':
        return principal * (annualRate / 100) * months;
      
      case 'REDUCING_BALANCE':
        // Simplified reducing balance calculation
        let totalInterest = 0;
        let remainingPrincipal = principal;
        const monthlyRate = annualRate / 100 / 12;
        
        for (let i = 0; i < months; i++) {
          totalInterest += remainingPrincipal * monthlyRate;
          remainingPrincipal -= principal / months;
        }
        
        return totalInterest;
      
      default:
        return principal * (annualRate / 100) * months;
    }
  }

  /**
   * Generate repayment schedule
   */
  generateRepaymentSchedule(
    principal: number,
    annualRate: number,
    termDays: number,
    installments: number,
    interestType: string = 'FLAT_RATE'
  ): RepaymentScheduleItem[] {
    const schedule: RepaymentScheduleItem[] = [];

    switch (interestType) {
      case 'FLAT_RATE':
        return this.generateFlatRateSchedule(principal, annualRate, termDays, installments);
      
      case 'REDUCING_BALANCE':
        return this.generateReducingBalanceSchedule(principal, annualRate, installments);
      
      default:
        return this.generateFlatRateSchedule(principal, annualRate, termDays, installments);
    }
  }

  private generateFlatRateSchedule(
    principal: number,
    annualRate: number,
    termDays: number,
    installments: number
  ): RepaymentScheduleItem[] {
    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterest = (annualRate / 100) * principal / 12;
    const principalPerInstallment = principal / installments;

    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (termDays / installments) * i);

      schedule.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principal: Math.round(principalPerInstallment * 100) / 100,
        interest: Math.round(monthlyInterest * 100) / 100,
        fees: 0,
        total: Math.round((principalPerInstallment + monthlyInterest) * 100) / 100,
        status: i === 1 ? 'PENDING' : 'SCHEDULED' as any,
      });
    }

    return schedule;
  }

  private generateReducingBalanceSchedule(
    principal: number,
    annualRate: number,
    installments: number
  ): RepaymentScheduleItem[] {
    const schedule: RepaymentScheduleItem[] = [];
    const monthlyRate = annualRate / 100 / 12;
    const emi = this.calculateEMI(principal, monthlyRate, installments);
    let remainingPrincipal = principal;

    for (let i = 1; i <= installments; i++) {
      const interestPayment = remainingPrincipal * monthlyRate;
      const principalPayment = emi - interestPayment;
      remainingPrincipal -= principalPayment;

      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        fees: 0,
        total: Math.round(emi * 100) / 100,
        status: i === 1 ? 'PENDING' : 'SCHEDULED' as any,
      });
    }

    return schedule;
  }

  private calculateEMI(principal: number, monthlyRate: number, installments: number): number {
    if (monthlyRate === 0) {
      return principal / installments;
    }
    
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
           (Math.pow(1 + monthlyRate, installments) - 1);
  }

  private getNextPaymentDate(startDate: Date, daysToAdd: number): Date {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  /**
   * Update loan's arrears status based on days in arrears
   */
  async updateArrearsStatus(loanId: string, daysInArrears: number): Promise<void> {
    let newArrearsStatus: ArrearsStatus;

    if (daysInArrears <= 0) {
      newArrearsStatus = 'CURRENT';
    } else if (daysInArrears <= 7) {
      newArrearsStatus = 'DAYS_1_7';
    } else if (daysInArrears <= 30) {
      newArrearsStatus = 'DAYS_8_30';
    } else if (daysInArrears <= 60) {
      newArrearsStatus = 'DAYS_31_60';
    } else if (daysInArrears <= 90) {
      newArrearsStatus = 'DAYS_61_90';
    } else {
      newArrearsStatus = 'DAYS_91_PLUS';
    }

    await db.loan.update({
      where: { id: loanId },
      data: {
        daysInArrears,
        arrearsStatus: newArrearsStatus,
        ...(daysInArrears > 0 && { status: 'IN_ARREARS' as LoanStatus }),
      },
    });
  }

  /**
   * Assign collector to a loan
   */
  async assignCollector(loanId: string, collectorId: string): Promise<void> {
    await db.loan.update({
      where: { id: loanId },
      data: { assignedCollector: collectorId },
    });
  }

  /**
   * Get loan statistics for a tenant
   */
  async getStats(tenantId: string) {
    const [
      totalLoans,
      activeLoans,
      disbursedAmount,
      outstandingBalance,
      overdueLoans,
      defaultedLoans,
    ] = await Promise.all([
      db.loan.count({ where: { tenantId } }),
      db.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.loan.aggregate({
        where: { tenantId },
        _sum: { principal: true },
      }),
      db.loan.aggregate({
        where: { tenantId, status: { in: ['ACTIVE', 'IN_ARREARS'] } },
        _sum: { outstandingBalance: true },
      }),
      db.loan.count({
        where: { tenantId, daysInArrears: { gt: 0 }, outstandingBalance: { gt: 0 } },
      }),
      db.loan.count({ where: { tenantId, status: 'DEFAULTED' } }),
    ]);

    return {
      totalLoans,
      activeLoans,
      totalDisbursed: disbursedAmount._sum.principal || 0,
      totalOutstanding: outstandingBalance._sum.outstandingBalance || 0,
      overdueLoans,
      defaultedLoans,
    };
  }
}

// Export singleton instance
export const loanService = new LoanService();
