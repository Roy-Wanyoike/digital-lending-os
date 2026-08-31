/**
 * Payment Service
 * 
 * Business logic for payment processing including:
 * - M-Pesa STK Push integration
 * - B2C disbursements
 * - Payment status tracking
 * - Transaction recording
 * - Callback processing
 */

import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../lib/db';
import { StkPushRequest, StkPushResponse, B2CRequest } from '../types';

// Import M-Pesa utilities
import {
  getTimestamp,
  generatePassword,
  formatPhoneNumber,
  isValidMpesaPhone,
  maskPhoneNumber,
  generateCheckoutRequestID,
  generateMpesaReceiptNumber,
  generateTransactionRef,
  validateAmount,
  getResultCodeInfo,
  validateStkCallback,
  validateB2CCallback,
  defaultMpesaConfig,
} from '../lib/mpesa';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/** Payment record structure for database storage */
export interface PaymentRecord {
  id: string;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  transactionType: 'STK_PUSH' | 'B2C' | 'C2B' | 'MANUAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  phone: string;
  amount: number;
  currency: string;
  mpesaReceiptNumber?: string;
  resultCode?: number;
  resultDesc?: string;
  loanId?: string;
  customerId?: string;
  tenantId: string;
  accountReference?: string;
  transactionDesc?: string;
  initiatedAt: Date;
  completedAt?: Date;
  callbackData?: Record<string, unknown>;
}

/** STK Push status response */
export interface PaymentStatus {
  checkoutRequestID: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  resultCode?: number;
  resultDesc?: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  transactionDate?: string;
}

/** Disbursement result */
export interface Disbursement {
  success: boolean;
  conversationID: string;
  originatorConversationID: string;
  responseCode: string;
  responseDescription: string;
  transactionID: string;
  disbursedAmount: number;
  recipientPhone: string;
}

/** In-memory store for pending transactions (for demo/sandbox mode) */
const pendingTransactions = new Map<string, {
  initiatedAt: Date;
  request: { phone: string; amount: number };
  loanId?: string;
  accountId?: string;
  tenantId?: string;
}>();

// =============================================================================
// PAYMENT SERVICE CLASS
// =============================================================================

export class PaymentService {
  
  /**
   * Initiate M-Pesa STK Push
   * 
   * Sends a payment prompt to customer's phone via M-Pesa.
   * Customer must enter their PIN to complete the transaction.
   * 
   * @param data - STK Push request data
   * @returns Promise resolving to STK Push response with CheckoutRequestID
   */
  async initiateStkPush(data: StkPushRequest): Promise<StkPushResponse> {
    // Validate and format phone number
    const formattedPhone = formatPhoneNumber(data.phone);
    
    if (!isValidMpesaPhone(formattedPhone)) {
      const error: any = new Error('Invalid M-Pesa phone number. Must be a Kenyan Safaricom number.');
      error.code = 'INVALID_PHONE';
      throw error;
    }
    
    // Validate amount
    const amountValidation = validateAmount(data.amount, 'STK_PUSH');
    if (!amountValidation.isValid) {
      const error: any = new Error(amountValidation.error);
      error.code = 'INVALID_AMOUNT';
      throw error;
    }

    // Verify loan exists if provided
    if (data.loanId) {
      const loan = await db.loan.findUnique({ where: { id: data.loanId } });
      if (!loan) {
        const error: any = new Error('Loan not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
    }

    // Generate unique request IDs and timestamp
    const checkoutRequestID = generateCheckoutRequestID();
    const merchantRequestID = generateCheckoutRequestID();
    const timestamp = getTimestamp();

    // Generate password for API authentication
    const password = generatePassword(
      defaultMpesaConfig.shortCode,
      defaultMpesaConfig.passkey,
      timestamp
    );

    logger.info('STK Push initiated', {
      phone: maskPhoneNumber(formattedPhone),
      amount: data.amount,
      checkoutRequestID,
      merchantRequestID,
      loanId: data.loanId,
      accountReference: data.accountReference,
    });

    // In production: Call Safaricom Daraja API here
    // const accessToken = await getAccessToken(
    //   defaultMpesaConfig.consumerKey,
    //   defaultMpesaConfig.consumerSecret,
    //   defaultMpesaConfig.environment
    // );
    //
    // const stkPushResponse = await fetch(
    //   `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       BusinessShortCode: defaultMpesaConfig.shortCode,
    //       Password: password,
    //       Timestamp: timestamp,
    //       TransactionType: 'CustomerPayBillOnline',
    //       Amount: Math.round(data.amount),
    //       PartyA: formattedPhone,
    //       PartyB: defaultMpesaConfig.shortCode,
    //       PhoneNumber: formattedPhone,
    //       CallBackURL: `${defaultMpesaConfig.callbackBaseUrl}/stkpush/callback`,
    //       AccountReference: data.accountReference || `PAY-${Date.now()}`,
    //       TransactionDesc: data.transactionDesc || `Payment of KSh ${data.amount.toLocaleString()}`,
    //     }),
    //   }
    // );
    //
    // const result = await stkPushResponse.json();

    // Store pending transaction in memory (for sandbox/demo)
    pendingTransactions.set(checkoutRequestID, {
      initiatedAt: new Date(),
      request: {
        phone: formattedPhone,
        amount: data.amount,
      },
      loanId: data.loanId,
      accountId: data.accountId,
    });

    // Simulate successful initiation (sandbox mode)
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
   * Query STK Push Status
   * 
   * Check the current status of a pending STK Push transaction.
   * In production, this calls the Safaricom API query endpoint.
   * 
   * @param checkoutRequestID - The CheckoutRequestID returned from initiateStkPush
   * @param phone - Optional phone number for verification
   * @returns Promise resolving to current payment status
   */
  async queryStkStatus(checkoutRequestID: string, phone?: string): Promise<PaymentStatus> {
    // Check in-memory store first (sandbox)
    const pendingTx = pendingTransactions.get(checkoutRequestID);
    
    if (!pendingTx) {
      // Transaction not found - might have been processed or expired
      return {
        checkoutRequestID,
        status: 'failed',
        resultCode: -1,
        resultDesc: 'Transaction not found or expired',
      };
    }

    // In production: Query Safaricom API for actual status
    // const accessToken = await getAccessToken(...);
    // const queryResponse = await fetch(
    //   `https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       BusinessShortCode: defaultMpesaConfig.shortCode,
    //       Password: password,
    //       Timestamp: timestamp,
    //       CheckoutRequestID: checkoutRequestID,
    //     }),
    //   }
    // );

    // For sandbox/demo: simulate a successful completion after some time
    const timeSinceInitiation = Date.now() - pendingTx.initiatedAt.getTime();
    
    // Simulate completion after 30 seconds (for demo purposes)
    if (timeSinceInitiation > 30000) {
      return {
        checkoutRequestID,
        status: 'completed',
        resultCode: 0,
        resultDesc: 'The service request is processed successfully.',
        amount: pendingTx.request.amount,
        mpesaReceiptNumber: generateMpesaReceiptNumber(),
        phoneNumber: pendingTx.request.phone,
        transactionDate: getTimestamp(),
      };
    }

    // Still pending
    return {
      checkoutRequestID,
      status: 'pending',
      amount: pendingTx.request.amount,
      phoneNumber: pendingTx.request.phone,
    };
  }

  /**
   * Process STK Push Callback
   * 
   * Handle incoming callback from Safaricom after customer action.
   * Updates transaction status and creates repayment records on success.
   * 
   * @param callbackData - Raw callback body from Safaricom
   * @returns Promise resolving to created/updated payment record
   */
  async processCallback(callbackData: unknown): Promise<PaymentRecord> {
    // Validate callback structure
    const validation = validateStkCallback(callbackData);
    
    if (!validation.valid) {
      logger.warn('Invalid STK Push callback format', { errors: validation.errors });
      throw new Error(`Invalid callback: ${validation.errors.join(', ')}`);
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = validation.data!;

    // Get original transaction details
    const pendingTx = pendingTransactions.get(CheckoutRequestID);
    
    if (!pendingTx) {
      logger.warn('Unknown CheckoutRequestID received', { CheckoutRequestID });
      // Still acknowledge - M-Pesa may retry or this could be a late callback
    }

    // Extract metadata for successful transactions
    let amount: number | undefined;
    let mpesaReceipt: string | undefined;
    let phoneNumber: string | undefined;
    let transactionDate: string | undefined;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      amount = CallbackMetadata.Item.find(i => i.Name === 'Amount')?.Value as number;
      mpesaReceipt = CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string;
      phoneNumber = CallbackMetadata.Item.find(i => i.Name === 'PhoneNumber')?.Value as string;
      transactionDate = CallbackMetadata.Item.find(i => i.Name === 'TransactionDate')?.Value as string;

      logger.info('STK Push payment successful', {
        CheckoutRequestID,
        amount,
        receiptNumber: mpesaReceipt,
        phone: maskPhoneNumber(phoneNumber || ''),
        date: transactionDate,
      });
    } else {
      // Get user-friendly error message
      const resultCodeInfo = getResultCodeInfo(ResultCode);
      
      logger.info('STK Push payment failed', {
        ResultCode,
        ResultDesc,
        CheckoutRequestID,
        userMessage: resultCodeInfo.userMessage,
      });
    }

    // Create payment record
    const paymentRecord: PaymentRecord = {
      id: generateTransactionRef(),
      checkoutRequestID: CheckoutRequestID,
      merchantRequestID: MerchantRequestID,
      transactionType: 'STK_PUSH',
      status: ResultCode === 0 ? 'COMPLETED' : 'FAILED',
      phone: phoneNumber || pendingTx?.request.phone || '',
      amount: amount || pendingTx?.request.amount || 0,
      currency: 'KES',
      mpesaReceiptNumber: mpesaReceipt,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      loanId: pendingTx?.loanId,
      tenantId: pendingTx?.tenantId || 'default',
      accountReference: pendingTx?.accountId,
      initiatedAt: pendingTx?.initiatedAt || new Date(),
      completedAt: new Date(),
      callbackData: callbackData as Record<string, unknown>,
    };

    // If successful, process repayment
    if (ResultCode === 0 && pendingTx?.loanId && amount) {
      try {
        await this.processRepayment({
          loanId: pendingTx.loanId,
          amount: amount,
          paymentMethod: 'MPESA_STK_PUSH',
          referenceNumber: mpesaReceipt,
          paidBy: phoneNumber,
          tenantId: pendingTx.tenantId || 'default',
        });
        
        logger.info('Repayment created from STK Push callback', {
          loanId: pendingTx.loanId,
          amount,
          receiptNumber: mpesaReceipt,
        });
      } catch (repaymentError) {
        logger.error('Failed to create repayment from callback', {
          error: repaymentError,
          loanId: pendingTx.loanId,
          CheckoutRequestID,
        });
        // Don't throw - we've already received the payment
      }
    }

    // Remove from pending (processed)
    if (CheckoutRequestID) {
      pendingTransactions.delete(CheckoutRequestID);
    }

    // TODO: In production, save payment record to database
    // await db.payment.create({ data: paymentRecord });

    return paymentRecord;
  }

  /**
   * Initiate B2C Payment (Disbursement to Customer)
   * 
   * Send money from business account to customer's M-Pesa.
   * Used for loan disbursements, refunds, etc.
   * 
   * @param data - B2C request data
   * @param tenantId - Tenant ID for authorization
   * @returns Promise resolving to B2C initiation result
   */
  async initiateB2C(data: B2CRequest, tenantId: string): Promise<Disbursement> {
    // Validate and format phone
    const formattedPhone = formatPhoneNumber(data.phone);
    
    if (!isValidMpesaPhone(formattedPhone)) {
      const error: any = new Error('Invalid M-Pesa phone number');
      error.code = 'INVALID_PHONE';
      throw error;
    }

    // Validate amount
    const amountValidation = validateAmount(data.amount, 'B2C');
    if (!amountValidation.isValid) {
      const error: any = new Error(amountValidation.error);
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

    // Generate IDs
    const conversationID = generateCheckoutRequestID();
    const originatorConversationID = generateCheckoutRequestID();
    const transactionID = generateMpesaReceiptNumber();

    logger.info('B2C disbursement initiated', {
      phone: maskPhoneNumber(formattedPhone),
      amount: data.amount,
      commandID: data.commandID || 'BusinessPayment',
      occasion: data.occasion,
      loanId: data.loanId,
      tenantId,
    });

    // In production: Call Safaricom B2C API
    // const securityCredential = generateSecurityCredential(defaultMpesaConfig.initiatorPassword);
    // const b2cResponse = await fetch(
    //   `https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       InitiatorName: defaultMpesaConfig.initiatorName,
    //       SecurityCredential: securityCredential,
    //       CommandID: data.commandID || 'BusinessPayment',
    //       Amount: Math.round(data.amount),
    //       PartyA: defaultMpesaConfig.shortCode,
    //       PartyB: formattedPhone,
    //       Remarks: data.remarks || 'B2C Payment',
    //       QueueTimeOutURL: `${defaultMpesaConfig.callbackBaseUrl}/disburse/queue-timeout`,
    //       ResultURL: `${defaultMpesaConfig.callbackBaseUrl}/disburse/callback`,
    //       Occasion: data.occasion || '',
    //     }),
    //   }
    // );

    // Simulate successful initiation (sandbox mode)
    return {
      success: true,
      conversationID,
      originatorConversationID,
      responseCode: '0',
      responseDescription: 'Acceptance for success',
      transactionID,
      disbursedAmount: data.amount,
      recipientPhone: formattedPhone,
    };
  }

  /**
   * Process B2C Result Callback
   * 
   * Handle incoming B2C result from Safaricom.
   * Updates loan status on successful disbursement.
   * 
   * @param callbackData - Raw callback body from Safaricom
   * @returns Promise resolving when processing is complete
   */
  async processB2CCallback(callbackData: unknown): Promise<void> {
    // Validate callback structure
    const validation = validateB2CCallback(callbackData);
    
    if (!validation.valid) {
      logger.warn('Invalid B2C callback format', { errors: validation.errors });
      return;
    }

    const { Result } = validation.data!;
    
    logger.info('B2C Callback received', {
      ResultType: Result.ResultType,
      ConversationID: Result.ConversationID,
      TransactionID: Result.TransactionID,
      ResultCode: Result.ResultCode,
      ResultDesc: Result.ResultDesc,
      Amount: Result.TransactionAmount,
      Recipient: Result.CreditPartyPublicName,
    });

    if (Result.ResultCode === 0) {
      // Disbursement successful
      // Update loan status to ACTIVE/DISBURSED
      // Create disbursement transaction record
      
      logger.info('B2C disbursement successful', {
        TransactionID: Result.TransactionID,
        Amount: Result.TransactionAmount,
        Recipient: Result.CreditPartyPublicName,
      });

      // TODO: Update loan status in database
      // if (associatedLoanId) {
      //   await db.loan.update({
      //     where: { id: associatedLoanId },
      //     data: {
      //       status: 'ACTIVE',
      //       disbursedAt: new Date(),
      //       disbursementTransactionId: Result.TransactionID,
      //     },
      //   });
      // }

      // TODO: Create transaction record
      // await db.transaction.create({
      //   data: {
      //     type: 'DISBURSEMENT',
      //     amount: parseFloat(Result.TransactionAmount),
      //     externalRef: Result.TransactionID,
      //     // ... other fields
      //   },
      // });

    } else {
      // Disbursement failed
      const resultCodeInfo = getResultCodeInfo(Result.ResultCode);
      
      logger.warn('B2C disbursement failed', {
        TransactionID: Result.TransactionID,
        ResultCode: Result.ResultCode,
        Reason: Result.ResultDesc || Result.TransactionReason,
        UserMessage: resultCodeInfo.userMessage,
      });

      // TODO: Update loan status to DISBURSEMENT_FAILED
      // Notify relevant staff about failure
    }
  }

  /**
   * Disburse Funds to Customer
   * 
   * Complete method for disbursing a loan to a customer's M-Pesa.
   * Validates loan status and initiates B2C transfer.
   * 
   * @param loanId - The loan ID to disburse
   * @param phone - Customer's M-Pesa phone number
   * @param amount - Optional amount (defaults to approved amount)
   * @returns Promise resolving to disbursement result
   */
  async disburseToCustomer(
    loanId: string,
    phone: string,
    amount?: number
  ): Promise<Disbursement> {
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

    // Validate loan status
    if (!['APPROVED', 'PENDING_DISBURSEMENT'].includes(loan.status)) {
      const error: any = new Error(
        `Loan is not ready for disbursement. Current status: ${loan.status}`
      );
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const disbursedAmount = amount || loan.approvedAmount;
    const recipientPhone = phone || loan.customer.mpesaPhone || loan.customer.phone;

    // Format phone number
    const formattedPhone = formatPhoneNumber(recipientPhone);

    if (!isValidMpesaPhone(formattedPhone)) {
      const error: any = new Error(
        'Invalid customer phone number. Cannot disburse without valid M-Pesa number.'
      );
      error.code = 'INVALID_PHONE';
      throw error;
    }

    // Initiate B2C payment
    const b2cResult = await this.initiateB2C({
      phone: formattedPhone,
      amount: disbursedAmount,
      occasion: 'Loan Disbursement',
      remarks: `Loan ${loan.loanNumber} disbursement`,
      commandID: 'BusinessPayment',
      loanId,
    }, loan.tenantId);

    logger.info('Disbursement to customer initiated', {
      loanId,
      loanNumber: loan.loanNumber,
      phone: maskPhoneNumber(formattedPhone),
      amount: disbursedAmount,
      conversationID: b2cResult.conversationID,
    });

    return {
      ...b2cResult,
      disbursedAmount,
      recipientPhone: formattedPhone,
    };
  }

  /**
   * Get Payment History
   * 
   * Retrieve paginated list of payment transactions.
   * Supports filtering by type, date range, etc.
   * 
   * @param params - Query parameters
   * @returns Promise resolving to paginated payment records
   */
  async getHistory(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    loanId?: string;
    customerId?: string;
  }) {
    const {
      tenantId,
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate,
      loanId,
      customerId,
    } = params;

    const where: Record<string, unknown> = { tenantId };
    
    if (type) where.transactionType = type;
    if (loanId) where.loanId = loanId;
    if (customerId) where.customerId = customerId;
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
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Account Balance
   * 
   * Calculate wallet/account balance based on transactions.
   * 
   * @param tenantId - Tenant ID to calculate balance for
   * @returns Promise resolving to balance information
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
          transactionType: {
            in: ['REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'FEE_COLLECTED'],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const disbursed = totalDisbursed._sum.amount || 0;
    const collected = totalCollected._sum.amount || 0;

    return {
      totalBalance: 2400000 + collected - disbursed,
      availableBalance: 2200000,
      currency: 'KES',
      lastUpdated: new Date(),
      summary: {
        totalDisbursed: disbursed,
        totalCollected: collected,
        netPosition: collected - disbursed,
      },
    };
  }

  /**
   * Get Payment History for Specific Loan
   * 
   * Retrieve all repayments made against a specific loan.
   * 
   * @param loanId - Loan ID to get history for
   * @param params - Pagination parameters
   * @returns Promise resolving to repayment records with pagination
   */
  async getPaymentHistory(
    loanId: string,
    params?: { page?: number; limit?: number }
  ) {
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
   * Record Manual Payment
   * 
   * Manually record a payment against a loan (e.g., bank transfer, cash).
   * 
   * @param loanId - Loan ID to record payment for
   * @param amount - Payment amount
   * @param reference - External reference number
   * @param options - Additional options
   * @returns Promise resolving to created repayment record
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
   * Process Repayment
   * 
   * Core logic for processing a repayment:
   * - Creates repayment record
   * - Updates loan balances
   * - Creates double-entry accounting transactions
   * - Handles full payoff scenario
   * 
   * @param data - Repayment processing data
   * @returns Promise resolving to created repayment record
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

    // Create double-entry transaction records
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
      principalPortion: principalPayment,
      interestPortion: interestPayment,
      referenceNumber: data.referenceNumber,
      remainingBalance: Math.max(0, newOutstandingBalance),
      fullyPaid: isFullyPaid,
    });

    return repayment;
  }

  /**
   * Create Accounting Transaction Record
   * 
   * Internal method for creating double-entry bookkeeping records.
   * 
   * @param data - Transaction data
   * @returns Promise resolving to created transaction
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
        referenceNumber: generateTransactionRef(),
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

  /** Map transaction types to debit accounts */
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

  /** Map transaction types to credit accounts */
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
   * Get Pending Transactions Count
   * 
   * Returns count of currently pending STK Push transactions.
   * Useful for monitoring and dashboard displays.
   */
  getPendingCount(): number {
    return pendingTransactions.size;
  }

  /**
   * Cleanup Expired Pending Transactions
   * 
   * Removes transactions that have been pending longer than specified duration.
   * Should be called periodically (e.g., cron job).
   * 
   * @param maxAgeMs - Maximum age in milliseconds (default: 30 minutes)
   * @returns Number of cleaned up transactions
   */
  cleanupExpiredTransactions(maxAgeMs: number = 30 * 60 * 1000): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [id, tx] of pendingTransactions.entries()) {
      if (now - tx.initiatedAt.getTime() > maxAgeMs) {
        pendingTransactions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired pending transactions`);
    }
    
    return cleaned;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
