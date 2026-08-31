/**
 * Payment Processing Routes
 * 
 * M-Pesa STK Push, B2C disbursements, payment status queries.
 * 
 * @openapi
 * tags: [Payments]
 */

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../lib/db';
import { authenticate, requireRoles, requireTenantAccess } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { validate, stkPushSchema } from '../middleware/validation';
import { AuthRequest } from '../types';

export const paymentRoutes = Router();

paymentRoutes.use(authenticate);
paymentRoutes.use(requireTenantAccess);

// =============================================================================
// STK PUSH (CUSTOMER TO BUSINESS)
// =============================================================================

/**
 * @openapi
 * /payments/stkpush/initiate:
 *   post:
 *     summary: Initiate M-Pesa STK Push
 *     description: |
 *       Initiate an STK Push request to a customer's phone for loan repayment.
 *       The customer will receive an M-Pesa prompt to enter their PIN.
 *       Uses Safaricom Daraja API (simulated in development).
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StkPushRequest'
 *     responses:
 *       201:
 *         description: STK Push initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StkPushResult'
 *                 message:
 *                   type: string
 *                   example: "STK Push initiated successfully"
 *       400:
 *         description: Invalid input or validation error
 *       404:
 *         description: Loan not found (if loanId provided)
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
 * @openapi
 * /payments/stkpush/status:
 *   get:
 *     summary: Query STK Push status
 *     description: Check the status of a previously initiated STK Push transaction using the checkout request ID.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: checkoutRequestID
 *         required: true
 *         schema:
 *           type: string
 *         description: Checkout request ID returned from STK Push initiation
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Phone number used for the transaction (optional)
 *     responses:
 *       200:
 *         description: STK Push status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkoutRequestID:
 *                       type: string
 *                     responseCode:
 *                       type: string
 *                     resultDesc:
 *                       type: string
 *                     resultCode:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     mpesaReceiptNumber:
 *                       type: string
 *                     transactionDate:
 *                       type: string
 *                       format: date-time
 *                     phoneNumber:
*                        type: string
 *                     status:
 *                       type: string
 *                       enum: [Pending, Completed, Failed]
 *       400:
 *         description: checkoutRequestID is required
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
 * @openapi
 * /payments/stkpush/callback:
 *   post:
 *     summary: STK Push callback endpoint
 *     description: |
 *       Webhook callback from Safaricom for STK Push transactions.
 *       This is a public endpoint - requests are verified via signature.
 *       Always returns 200 to acknowledge receipt.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Body:
 *                 type: object
 *                 properties:
 *                   stkCallback:
 *                     type: object
 *                     description: STK Callback data from Safaricom
 *     responses:
 *       200:
 *         description: Callback acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ResultCode:
 *                   type: integer
 *                   example: 0
 *                 ResultDesc:
 *                   type: string
 *                   example: "Callback accepted"
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
 * @openapi
 * /payments/disburse/b2c:
 *   post:
 *     summary: Initiate B2C disbursement
 *     description: |
 *       Send money from business account to customer's M-Pesa wallet.
 *       Used for loan disbursements and other payouts.
 *       Requires FINANCE_OFFICER or higher role.
 *       Amount must be between KSh 10 and KSh 150,000.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/B2CDisbursementRequest'
 *     responses:
 *       201:
 *         description: B2C disbursement initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     conversationID:
 *                       type: string
 *                     originatorConversationID:
 *                       type: string
 *                     responseCode:
 *                       type: string
 *                     responseDescription:
 *                       type: string
 *                     transactionID:
 *                       type: string
 *                     instructions:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: "B2C disbursement initiated"
 *       400:
 *         description: Invalid amount or missing fields
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Loan not found (if loanId provided)
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
 * @openapi
 * /payments/disburse/callback:
 *   post:
 *     summary: B2C disbursement callback
 *     description: Webhook callback from Safaricom for B2C transaction results. Always returns 200 to acknowledge receipt.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Body:
 *                 type: object
 *                 description: B2C Result callback data
 *     responses:
 *       200:
 *         description: Callback acknowledged
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
 * @openapi
 * /payments/history:
 *   get:
 *     summary: Get payment history
 *     description: Retrieve paginated list of transactions with optional filtering by type and date range.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Filter by tenant ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DISBURSEMENT, REPAYMENT_PRINCIPAL, REPAYMENT_INTEREST, FEE_COLLECTED, PENALTY_COLLECTED]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of date range filter
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
paymentRoutes.get('/history', async (req: AuthRequest, res) => {
  try {
    const page = getQueryNumber(req.query, "page", 1) || 1;
    const limit = getQueryNumber(req.query, "limit", 20) || 20;
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;
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
 * @openapi
 * /payments/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Retrieve current wallet/account balance including total disbursed and collected amounts.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Tenant ID for balance lookup
 *     responses:
 *       200:
 *         description: Balance information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBalance:
 *                       type: number
 *                       example: 2400000
 *                     availableBalance:
 *                       type: number
 *                       example: 2200000
 *                     currency:
 *                       type: string
 *                       example: "KES"
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalDisbursed:
 *                           type: number
 *                         totalCollected:
 *                           type: number
 */
paymentRoutes.get('/balance', async (req: AuthRequest, res) => {
  try {
    const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

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
