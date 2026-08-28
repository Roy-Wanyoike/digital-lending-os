/**
 * Customer Service
 * 
 * Business logic for customer management including CRUD operations,
 * search, credit checks, and profile management.
 */

import { logger } from '../utils/logger';
import { db } from '../../prisma/client';
import { CreateCustomerInput, UpdateCustomerInput, RiskLevel } from '../types';

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  tenantId: string;
  status?: string;
  riskLevel?: RiskLevel;
  search?: string;
}

export class CustomerService {
  /**
   * List customers with filtering and pagination
   */
  async findAll(params: CustomerQueryParams) {
    const { page = 1, limit = 20, tenantId, status, riskLevel, search } = params;

    const where: Record<string, unknown> = { tenantId };
    
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              loans: true,
              loanApplications: true,
              repayments: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    return {
      items: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get customer by ID with full profile
   */
  async findById(id: string) {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        loans: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            loanNumber: true,
            principal: true,
            outstandingBalance: true,
            status: true,
            createdAt: true,
          },
        },
        loanApplications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            requestedAmount: true,
            status: true,
            createdAt: true,
          },
        },
        kycDocuments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      const error: any = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return customer;
  }

  /**
   * Create new customer
   */
  async create(data: CreateCustomerInput) {
    // Check for duplicate phone within tenant
    const existingPhone = await db.customer.findFirst({
      where: {
        tenantId: data.tenantId,
        phone: data.phone,
      },
    });

    if (existingPhone) {
      const error: any = new Error('A customer with this phone number already exists in this tenant');
      error.code = 'DUPLICATE_PHONE';
      throw error;
    }

    const customer = await db.customer.create({
      data: {
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        alternativePhone: data.alternativePhone || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        nationalId: data.nationalId || null,
        kraPin: data.kraPin || null,
        employmentStatus: data.employmentStatus || null,
        employerName: data.employerName || null,
        incomeAmount: data.incomeAmount || null,
        incomeFrequency: data.incomeFrequency || null,
        businessName: data.businessName || null,
        county: data.county || null,
        city: data.city || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        mpesaPhone: data.mpesaPhone || data.phone,
      },
    });

    logger.info('Customer created', { customerId: customer.id, tenantId: data.tenantId });

    return customer;
  }

  /**
   * Update customer information
   */
  async update(id: string, data: UpdateCustomerInput) {
    const existingCustomer = await db.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      const error: any = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: data as any,
    });

    logger.info('Customer updated', { customerId: id });

    return updatedCustomer;
  }

  /**
   * Update customer status
   */
  async updateStatus(id: string, status: string, reason?: string): Promise<void> {
    await db.customer.update({
      where: { id },
      data: { 
        status: status as any,
        notes: reason ? `${existingNotes => existingNotes || ''}\nStatus changed to ${status}: ${reason}`.trim() : undefined,
      },
    });
  }

  /**
   * Update customer risk level
   */
  async updateRiskLevel(id: string, riskLevel: RiskLevel): Promise<void> {
    await db.customer.update({
      where: { id },
      data: { riskLevel },
    });
  }

  /**
   * Get all loans for a specific customer
   */
  async getLoans(customerId: string) {
    return db.loan.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, category: true },
        },
        _count: {
          select: { repayments: true },
        },
      },
    });
  }

  /**
   * Get customer's KYC documents
   */
  async getDocuments(customerId: string) {
    return db.kycDocument.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find customer by phone number within a tenant
   * 
   * @param tenantId - The tenant ID to scope the search
   * @param phone - Phone number to search for
   * @returns Customer object or null if not found
   */
  async findByPhone(tenantId: string, phone: string) {
    return db.customer.findFirst({
      where: {
        tenantId,
        phone,
      },
      include: {
        loans: {
          where: { status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
          select: {
            id: true,
            loanNumber: true,
            principal: true,
            outstandingBalance: true,
            status: true,
            daysInArrears: true,
          },
        },
      },
    });
  }

  /**
   * Get credit summary for a customer
   * 
   * @param customerId - The customer ID to get summary for
   * @returns Object containing credit summary information
   */
  async getCreditSummary(customerId: string) {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
        },
        repayments: {
          orderBy: { paymentDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      const error: any = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Calculate credit metrics
    const activeLoans = customer.loans.filter(loan => 
      ['ACTIVE', 'IN_ARREARS', 'PENDING_DISBURSEMENT'].includes(loan.status)
    );
    
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
    const totalBorrowed = customer.loans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalRepaid = customer.repayments.reduce((sum, repayment) => sum + repayment.amount, 0);
    
    // Calculate on-time payment rate
    const completedRepayments = customer.repayments.filter(r => r.status === 'COMPLETED');
    const onTimePayments = completedRepayments.filter(r => {
      if (!r.dueDate) return true;
      return r.paymentDate <= r.dueDate;
    });
    const onTimePaymentRate = completedRepayments.length > 0 
      ? (onTimePayments.length / completedRepayments.length) * 100 
      : 100;

    // Calculate days in arrears across all active loans
    const maxDaysInArrears = Math.max(...activeLoans.map(loan => loan.daysInArrears || 0), 0);

    return {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      
      // Loan Summary
      totalLoans: customer.loans.length,
      activeLoans: activeLoans.length,
      completedLoans: customer.loans.filter(l => l.status === 'FULLY_PAID').length,
      
      // Financial Summary
      totalBorrowed,
      totalRepaid,
      outstandingBalance: totalOutstanding,
      creditScore: customer.creditScore,
      crbStatus: customer.crbStatus,
      riskLevel: customer.riskLevel,
      
      // Payment Performance
      onTimePaymentRate: Math.round(onTimePaymentRate * 100) / 100,
      daysInArrears: maxDaysInArrears,
      
      // Loan Details
      loans: activeLoans.map(loan => ({
        id: loan.id,
        loanNumber: loan.loanNumber,
        principal: loan.principal,
        outstandingBalance: loan.outstandingBalance,
        status: loan.status,
        daysInArrears: loan.daysInArrears,
        nextPaymentDue: loan.nextPaymentDue,
      })),
    };
  }

  /**
   * Search customers by various criteria
   */
  async search(tenantId: string, query: string, limit: number = 20) {
    return db.customer.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { nationalId: { contains: query } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        riskLevel: true,
        status: true,
      },
    });
  }

  /**
   * Get customer summary statistics for a tenant
   */
  async getStats(tenantId: string) {
    const [
      totalCustomers,
      activeCustomers,
      newThisMonth,
      byRiskLevel,
    ] = await Promise.all([
      db.customer.count({ where: { tenantId } }),
      db.customer.count({ where: { tenantId, status: 'ACTIVE' } }),
      db.customer.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      Promise.all([
        db.customer.count({ where: { tenantId, riskLevel: 'LOW' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'MEDIUM' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'HIGH' } }),
        db.customer.count({ where: { tenantId, riskLevel: 'VERY_HIGH' } }),
      ]),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      newThisMonth,
      byRiskLevel: {
        LOW: byRiskLevel[0],
        MEDIUM: byRiskLevel[1],
        HIGH: byRiskLevel[2],
        VERY_HIGH: byRiskLevel[3],
      },
    };
  }

  /**
   * Check if customer is eligible for a new loan
   */
  async checkLoanEligibility(customerId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    maxRecommendedAmount: number;
  }> {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        loans: {
          where: { status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] } },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const reasons: string[] = [];
    let eligible = true;

    // Check if blacklisted
    if (customer.status === 'BLACKLISTED') {
      eligible = false;
      reasons.push('Customer is blacklisted');
    }

    // Check if frozen
    if (customer.status === 'FROZEN') {
      eligible = false;
      reasons.push('Account is frozen');
    }

    // Check maximum active loans
    if (customer.loans.length >= 3) {
      eligible = false;
      reasons.push('Maximum active loans reached (3)');
    }

    // Check for overdue loans
    const hasOverdue = customer.loans.some(loan => loan.daysInArrears > 0);
    if (hasOverdue) {
      eligible = false;
      reasons.push('Has overdue loans');
    }

    // Calculate recommended amount based on income and existing debt
    const monthlyIncome = customer.incomeAmount || 0;
    const existingDebt = customer.loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
    const dtiRatio = monthlyIncome > 0 ? existingDebt / (monthlyIncome * 6) : 1; // 6 months income
    
    let maxRecommendedAmount = 50000; // Default
    if (monthlyIncome >= 30000 && dtiRatio < 0.3) {
      maxRecommendedAmount = Math.min(monthlyIncome * 3, 150000);
    } else if (monthlyIncome >= 15000 && dtiRatio < 0.5) {
      maxRecommendedAmount = Math.min(monthlyIncome * 2, 80000);
    } else if (dtiRatio >= 0.5) {
      maxRecommendedAmount = 20000;
    }

    return { eligible, reasons, maxRecommendedAmount };
  }
}

// Export singleton instance
export const customerService = new CustomerService();
