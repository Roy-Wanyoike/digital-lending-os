/**
 * Payment Service
 * 
 * Business logic for payment processing including:
 * - M-Pesa STK Push integration
 * - B2C disbursements
 * - Payment status tracking
 * - Transaction recording
 */

import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../lib/db';
import { StkPushRequest, StkPushResponse, B2CRequest } from '../types';

export class PaymentService {
  /**
   * Initiate M-Pesa STK Push
   */
  async initiateStkPush(data: StkPushRequest): Promise<StkPushResponse> {
    // Verify loan exists if provided
    if (data.loanId) {
      const loan = await db.loan.findUnique({ where: { id: data.loanId } });
      if (!loan) {
        const error: any = new Error('Loan not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
    }

    // Generate unique request IDs
    const checkoutRequestID = this.generateRequestId();
    const merchantRequestID = this.generateRequestId();

    // In production: Call Safaricom Daraja API here
    // For now, simulate successful initiation
    
    logger.info('STK Push initiated', {
      phone: data.phone,
      amount: data.amount,
      checkoutRequestID,
      loanId: data.loanId,
    });

    return {
      success: true,
      checkoutRequestID,
      merchantRequestID,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: 'Please enter your PIN on your phone to complete the payment.',
    };
  }

  /**
   * Query STK Push status
   */
  async queryStkStatus(checkoutRequestID: string, phone?: string) {
    // In production: Query Safaricom API for actual status
    const mockStatus = {
      checkoutRequestID,
      responseCode: '0',
      resultDesc: 'The service request is processed successfully.',
      resultCode: '0',
      amount: 1500.00,
      mpesaReceiptNumber: 'QLE3M7L1YP',
      transactionDate: new Date().toISOString(),
      phoneNumber: phone || '254712345678',
      status: 'Completed',
    };

    return mockStatus;
  }

  /**
   * Process STK Push callback (from Safaricom)
   */
  async processStkCallback(callbackData: any): Promise<void> {
    const { Body } = callbackData;
    
    if (!Body?.stkCallback) {
      logger.warn('Invalid STK Push callback format');
      return;
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    if (ResultCode === '0') {
      // Success - extract metadata and process payment
      const amount = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'Amount'
      )?.Value;
      
      const mpesaReceipt = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'MpesaReceiptNumber'
      )?.Value;
      
      const phone = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'PhoneNumber'
      )?.Value;

      const transactionDate = CallbackMetadata?.Item?.find(
        (i: Record<string, unknown>) => i.Name === 'TransactionDate'
      )?.Value;

      logger.info('STK Push payment successful', {
        CheckoutRequestID,
        amount,
        receiptNumber: mpesaReceipt,
        phone,
      });

      // TODO: Create repayment record, update loan balance, send confirmation SMS

    } else {
      logger.info('STK Push payment failed', {
        ResultCode,
        ResultDesc,
        CheckoutRequestID,
      });
    }
  }

  /**
   * Initiate B2C payment (disbursement to customer)
   */
  async initiateB2C(data: B2CRequest, tenantId: string): Promise<any> {
    if (!data.phone || !data.amount) {
      const error: any = new Error('Phone and amount are required');
      error.code = 'BAD_REQUEST';
      throw error;
    }

    // Validate amount range
    if (data.amount < 10 || data.amount > 150000) {
      const error: any = new Error('Amount must be between KSh 10 and KSh 150,000');
      error.code = 'INVALID_AMOUNT';
      throw error;
    }

    // Verify loan if provided
    if (data.loanId) {
      const loan = await db.loan.findUnique({ where: { id: data.loanId } });
      if (!loan) {
        const error: any = new Error('Loan not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
    }

    // In production: Call Safaricom B2C API
    const b2cResult = {
      success: true,
      conversationID: this.generateRequestId(),
      originatorConversationID: this.generateRequestId(),
      responseCode: '0',
      responseDescription: 'Acceptance for success',
      transactionID: this.generateRequestId(),
    };

    logger.info('B2C disbursement initiated', {
      phone: data.phone,
      amount: data.amount,
      loanId: data.loanId,
      tenantId,
    });

    return b2cResult;
  }

  /**
   * Process B2C callback (from Safaricom)
   */
  async processB2CCallback(callbackData: any): Promise<void> {
    const { Result } = callbackData;
    
    logger.info('B2C Callback received', {
      ResultType: Result?.ResultType,
      TransactionID: Result?.TransactionID,
      ResultCode: Result?.ResultCode,
      ResultDesc: Result?.ResultDesc,
    });

    if (Result?.ResultCode === 0) {
      // Disbursement successful
      // TODO: Update loan status to ACTIVE, create disbursement transaction
      
      logger.info('B2C disbursement successful', {
        TransactionID: Result.TransactionID,
        Amount: Result?.TransactionDetails?.TransactionAmount,
      });
    } else {
      // Disbursement failed
      logger.warn('B2C disbursement failed', {
        TransactionID: Result.TransactionID,
        ResultCode: Result.ResultCode,
      });
    }
  }

  /**
   * Get payment/transaction history
   */
  async getHistory(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { tenantId, page = 1, limit = 20, type, startDate, endDate } = params;

    const where: Record<string, unknown> = { tenantId };
    
    if (type) where.transactionType = type;
    if (startDate && endDate) {
      where.occurredAt = { gte: startDate, lte: endDate };
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      db.transaction.count({ where }),
    ]);

    return {
      items: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get wallet/account balance
   */
  async getBalance(tenantId: string) {
    const [totalDisbursed, totalCollected] = await Promise.all([
      db.transaction.aggregate({
        where: { tenantId, transactionType: 'DISBURSEMENT' },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          tenantId,
          transactionType: { in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED'] },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalBalance: 2400000 + (totalCollected._sum.amount || 0) - (totalDisbursed._sum.amount || 0),
      availableBalance: 2200000,
      currency: 'KES',
      lastUpdated: new Date(),
      summary: {
        totalDisbursed: totalDisbursed._sum.amount || 0,
        totalCollected: totalCollected._sum.amount || 0,
      },
    };
  }

  /**
   * Get payment/repayment history for a specific loan
   * 
   * @param loanId - The loan ID to get payment history for
   * @param params - Optional pagination parameters
   * @returns Array of repayments with pagination info
   */
  async getPaymentHistory(loanId: string, params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = params || {};

    // Verify loan exists
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const [repayments, total] = await Promise.all([
      db.repayment.findMany({
        where: { loanId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paymentDate: 'desc' },
      }),
      db.repayment.count({ where: { loanId } }),
    ]);

    return {
      items: repayments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      loanSummary: {
        principal: loan.principal,
        totalRepaid: loan.totalRepaid,
        outstandingBalance: loan.outstandingBalance,
      },
    };
  }

  /**
   * Disburse funds to a customer's M-Pesa or bank account
   * 
   * @param loanId - The loan ID to disburse
   * @param phone - Customer's phone number for M-Pesa disbursement
   * @param amount - Amount to disburse (defaults to loan's approved amount)
   * @returns Disbursement result with transaction details
   */
  async disburseToCustomer(loanId: string, phone: string, amount?: number): Promise<{
    success: boolean;
    conversationID: string;
    originatorConversationID: string;
    responseCode: string;
    responseDescription: string;
    transactionID: string;
    disbursedAmount: number;
    recipientPhone: string;
  }> {
    // Get loan details
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: { customer: true },
    });

    if (!loan) {
      const error: any = new Error('Loan not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!['APPROVED', 'PENDING_DISBURSEMENT'].includes(loan.status)) {
      const error: any = new Error(`Loan is not ready for disbursement. Current status: ${loan.status}`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const disbursedAmount = amount || loan.approvedAmount;

    // Initiate B2C payment via M-Pesa
    const b2cResult = await this.initiateB2C({
      phone: phone || loan.customer.mpesaPhone || loan.customer.phone,
      amount: disbursedAmount,
      occasion: 'Loan Disbursement',
      remarks: `Loan ${loan.loanNumber} disbursement`,
      commandID: 'BusinessPayment',
      loanId,
    }, loan.tenantId);

    logger.info('Disbursement to customer initiated', {
      loanId,
      phone,
      amount: disbursedAmount,
      conversationID: b2cResult.conversationID,
    });

    return {
      ...b2cResult,
      disbursedAmount,
      recipientPhone: phone,
    };
  }

  /**
   * Record a manual payment against a loan
   * 
   * @param loanId - The loan ID to record payment for
   * @param amount - Payment amount
   * @param reference - External reference number (e.g., M-Pesa code)
   * @returns Created repayment record
   */
  async recordPayment(
    loanId: string, 
    amount: number, 
    reference?: string,
    options?: {
      paymentMethod?: string;
      paidBy?: string;
      tenantId?: string;
    }
  ) {
    // Get loan details first
    const loan = await db.loan.findUnique({ where: { id: loanId } });
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    return this.processRepayment({
      loanId,
      amount,
      paymentMethod: options?.paymentMethod || 'MANUAL',
      referenceNumber: reference,
      paidBy: options?.paidBy,
      tenantId: options?.tenantId || loan.tenantId,
    });
  }

  /**
   * Process repayment and update loan balance
   */
  async processRepayment(data: {
    loanId: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    paidBy?: string;
    tenantId: string;
  }) {
    const loan = await db.loan.findUnique({ where: { id: data.loanId } });
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.outstandingBalance <= 0) {
      throw new Error('Loan has no outstanding balance');
    }

    const paymentAmount = Math.min(data.amount, loan.outstandingBalance);
    
    // Calculate allocation (interest first, then principal)
    const interestDue = loan.totalInterest - loan.repaidInterest;
    const interestPayment = Math.min(interestDue, paymentAmount);
    const principalPayment = paymentAmount - interestPayment;

    // Create repayment record
    const repayment = await db.repayment.create({
      data: {
        tenantId: data.tenantId,
        loanId: data.loanId,
        customerId: loan.customerId,
        amount: paymentAmount,
        principalPortion: principalPayment,
        interestPortion: interestPayment,
        feePortion: 0,
        paymentMethod: data.paymentMethod as any,
        referenceNumber: data.referenceNumber,
        paidBy: data.paidBy,
        paymentDate: new Date(),
        status: 'COMPLETED',
      },
    });

    // Update loan balances
    const newOutstandingBalance = loan.outstandingBalance - paymentAmount;
    const isFullyPaid = newOutstandingBalance <= 0;

    await db.loan.update({
      where: { id: data.loanId },
      data: {
        repaidPrincipal: loan.repaidPrincipal + principalPayment,
        repaidInterest: loan.repaidInterest + interestPayment,
        totalRepaid: loan.totalRepaid + paymentAmount,
        outstandingBalance: Math.max(0, newOutstandingBalance),
        ...(isFullyPaid && {
          status: 'FULLY_PAID' as any,
          closedAt: new Date(),
          closureReason: 'Fully repaid',
        }),
      },
    });

    // Create transaction records
    if (principalPayment > 0) {
      await this.createTransaction({
        tenantId: data.tenantId,
        type: 'REPAYMENT_PRINCIPAL',
        entityType: 'REPAYMENT',
        entityId: repayment.id,
        amount: principalPayment,
        description: `Principal repayment for ${loan.loanNumber}`,
        externalRef: data.referenceNumber,
      });
    }

    if (interestPayment > 0) {
      await this.createTransaction({
        tenantId: data.tenantId,
        type: 'REPAYMENT_INTEREST',
        entityType: 'REPAYMENT',
        entityId: repayment.id,
        amount: interestPayment,
        description: `Interest repayment for ${loan.loanNumber}`,
        externalRef: data.referenceNumber,
      });
    }

    logger.info('Repayment processed', {
      loanId: data.loanId,
      amount: paymentAmount,
      referenceNumber: data.referenceNumber,
    });

    return repayment;
  }

  /**
   * Create a transaction record
   */
  private async createTransaction(data: {
    tenantId: string;
    type: string;
    entityType: string;
    entityId: string;
    amount: number;
    description?: string;
    externalRef?: string;
  }) {
    return db.transaction.create({
      data: {
        tenantId: data.tenantId,
        referenceNumber: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        transactionType: data.type as any,
        entityType: data.entityType as any,
        entityId: data.entityId,
        debitAccount: this.getDebitAccount(data.type),
        creditAccount: this.getCreditAccount(data.type),
        amount: data.amount,
        description: data.description,
        externalRef: data.externalRef,
      },
    });
  }

  private getDebitAccount(transactionType: string): string {
    const accounts: Record<string, string> = {
      DISBURSEMENT: 'Loans_Receivable',
      REPAYMENT_PRINCIPAL: 'Cash_At_Bank',
      REPAYMENT_INTEREST: 'Cash_At_Bank',
      FEE_COLLECTED: 'Cash_At_Bank',
      FEE_CHARGED: 'Customer_Account',
    };
    return accounts[transactionType] || 'Suspense_Account';
  }

  private getCreditAccount(transactionType: string): string {
    const accounts: Record<string, string> = {
      DISBURSEMENT: 'Cash_At_Bank',
      REPAYMENT_PRINCIPAL: 'Loans_Receivable',
      REPAYMENT_INTEREST: 'Interest_Income',
      FEE_COLLECTED: 'Fee_Income',
      FEE_CHARGED: 'Fees_Receivable',
    };
    return accounts[transactionType] || 'Suspense_Account';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
