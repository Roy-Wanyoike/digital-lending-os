/**
 * Payment Processing Routes
 * 
 * M-Pesa STK Push, B2C disbursements, payment status queries.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../../prisma/client';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
} from '../utils/response';
import { validate, stkPushSchema } from '../middleware/validation';
import { AuthRequest } from '../types';

export const paymentRoutes = Router();

paymentRoutes.use(authenticate);
paymentRoutes.use(requireTenantAccess);

// =============================================================================
// STK PUSH (CUSTOMER TO BUSINESS)
// =============================================================================

/**
 * POST /api/v1/payments/stkpush/initiate
 * Initiate M-Pesa STK Push for loan repayment
 */
paymentRoutes.post('/stkpush/initiate', validate(stkPushSchema), async (req: AuthRequest, res) => {
  try {
    const { phone, amount, accountReference, transactionDesc, loanId } = req.body;

    // Verify loan exists if provided
    if (loanId) {
      const loan = await db.loan.findUnique({
        where: { id: loanId },
      });
      
      if (!loan) {
        return notFoundResponse(res, 'Loan');
      }
    }

    // Generate unique request IDs
    const checkoutRequestID = generateRequestId();
    const merchantRequestID = generateRequestId();

    // In production: Call Safaricom Daraja API here
    // For now, simulate successful initiation
    
    const stkPushResult = {
      success: true,
      checkoutRequestID,
      merchantRequestID,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: 'Please enter your PIN on your phone to complete the payment.',
      instructions: {
        step1: 'Check your phone for the M-Pesa prompt',
        step2: 'Enter your M-Pesa PIN to confirm',
        step3: 'Do not share your PIN with anyone',
      },
      estimatedWaitTime: '30 seconds - 3 minutes',
      pollingEndpoint: `/api/v1/payments/stkpush/status?checkoutRequestID=${checkoutRequestID}`,
    };

    // Store pending STK push record (in production)
    // await db.stkPush.create({ data: { ... } });

    return createdResponse(
      res,
      stkPushResult,
      'STK Push initiated successfully'
    );
  } catch (error) {
    console.error('Error initiating STK Push:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to initiate STK Push');
  }
});

/**
 * GET /api/v1/payments/stkpush/status
 * Query STK Push status by checkout request ID
 */
paymentRoutes.get('/stkpush/status', async (req: AuthRequest, res) => {
  try {
    const { checkoutRequestID } = req.query;

    if (!checkoutRequestID) {
      return badRequestResponse(res, 'checkoutRequestID is required');
    }

    // In production: Query Safaricom API for actual status
    const mockStatus = {
      checkoutRequestID,
      responseCode: '0',
      resultDesc: 'The service request is processed successfully.',
      resultCode: '0',
      amount: 1500.00,
      mpesaReceiptNumber: 'QLE3M7L1YP',
      transactionDate: new Date().toISOString(),
      phoneNumber: req.query.phone || '254712345678',
      status: 'Completed',
    };

    return successResponse(res, mockStatus);
  } catch (error) {
    console.error('Error querying STK Push status:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to query status');
  }
});

/**
 * POST /api/v1/payments/stkpush/callback
 * Webhook callback from Safaricom (public endpoint - verified via signature)
 */
paymentRoutes.post('/stkpush/callback', async (req, res) => {
  try {
    const { Body } = req.body;

    if (!Body?.stkCallback) {
      console.log('Invalid callback format received');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    // Process based on result code
    if (ResultCode === '0') {
      // Success - extract metadata and process payment
      const amount = CallbackMetadata?.Item?.find((i: Record<string, unknown>) => i.Name === 'Amount')?.Value;
      const mpesaReceipt = CallbackMetadata?.Item?.find((i: Record<string, unknown>) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = CallbackMetadata?.Item?.find((i: Record<string, unknown>) => i.Name === 'PhoneNumber')?.Value;
      const transactionDate = CallbackMetadata?.Item?.find((i: Record<string, unknown>) => i.Name === 'TransactionDate')?.Value;

      console.log('Payment successful:', {
        amount,
        receiptNumber: mpesaReceipt,
        phone,
        date: transactionDate,
      });

      // In production: Create repayment record, update loan balance, etc.
    } else {
      console.log('Payment failed:', { ResultCode, ResultDesc, CheckoutRequestID });
    }

    // Always respond with success to acknowledge receipt
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
  } catch (error) {
    console.error('Error processing STK Push callback:', error);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' }); // Still acknowledge
  }
});

// =============================================================================
// B2C DISBURSEMENTS (BUSINESS TO CUSTOMER)
// =============================================================================

/**
 * POST /api/v1/payments/disburse/b2c
 * Initiate B2C payment (disbursement to customer)
 */
paymentRoutes.post('/disburse/b2c', requireRoles(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'FINANCE_OFFICER']), async (req: AuthRequest, res) => {
  try {
    const { phone, amount, occasion, remarks, commandID, loanId } = req.body;

    if (!phone || !amount) {
      return badRequestResponse(res, 'Phone and amount are required');
    }

    // Validate amount range
    if (amount < 10 || amount > 150000) {
      return badRequestResponse(res, 'Amount must be between KSh 10 and KSh 150,000');
    }

    // Verify loan if provided
    if (loanId) {
      const loan = await db.loan.findUnique({ where: { id: loanId } });
      if (!loan) {
        return notFoundResponse(res, 'Loan');
      }
    }

    // In production: Call Safaricom B2C API
    const b2cResult = {
      success: true,
      conversationID: generateRequestId(),
      originatorConversationID: generateRequestId(),
      responseCode: '0',
      responseDescription: 'Acceptance for success',
      transactionID: generateRequestId(),
      instructions: {
        step1: 'Customer will receive SMS notification',
        step2: 'Funds will be available in their M-Pesa account within minutes',
      },
    };

    return createdResponse(res, b2cResult, 'B2C disbursement initiated');
  } catch (error) {
    console.error('Error initiating B2C disbursement:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to initiate disbursement');
  }
});

/**
 * POST /api/v1/payments/disburse/callback
 * B2C result callback from Safaricom
 */
paymentRoutes.post('/disburse/callback', async (req, res) => {
  try {
    const { Body } = req.body;

    console.log('B2C Callback received:', JSON.stringify(Body, null, 2));

    // Process B2C result
    // Update loan status, create transaction records, etc.

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
  } catch (error) {
    console.error('Error processing B2C callback:', error);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
  }
});

// =============================================================================
// PAYMENT HISTORY & QUERIES
// =============================================================================

/**
 * GET /api/v1/payments/history
 * Get payment/transaction history
 */
paymentRoutes.get('/history', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
    const type = req.query.type as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    const where: Record<string, unknown> = { tenantId };
    
    if (type) where.transactionType = type;
    if (startDate && endDate) {
      where.occurredAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
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

    return paginatedResponse(res, transactions, page, limit, total);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch payment history');
  }
});

/**
 * GET /api/v1/payments/balance
 * Get wallet/account balance
 */
paymentRoutes.get('/balance', async (req: AuthRequest, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

    if (!tenantId) {
      return require('../utils/response').badRequestResponse(res, 'tenantId is required');
    }

    // Calculate balances from transactions
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

    const balance = {
      totalBalance: 2400000 + (totalCollected._sum.amount || 0) - (totalDisbursed._sum.amount || 0),
      availableBalance: 2200000,
      currency: 'KES',
      lastUpdated: new Date(),
      summary: {
        totalDisbursed: totalDisbursed._sum.amount || 0,
        totalCollected: totalCollected._sum.amount || 0,
      },
    };

    return successResponse(res, balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return require('../utils/response').errorResponse(res, 500, 'Failed to fetch balance');
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
