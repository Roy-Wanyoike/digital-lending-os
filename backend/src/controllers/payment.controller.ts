/**
 * Payment Controller
 * 
 * Handles HTTP requests for payment processing operations.
 */

import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

export class PaymentController {
  /**
   * POST /api/v1/payments/stkpush/initiate
   * Initiate M-Pesa STK Push for loan repayment
   */
  async initiateStkPush(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.initiateStkPush(req.body);

      return createdResponse(res, result, 'STK Push initiated successfully');
    } catch (error) {
      logger.error('Error initiating STK Push:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      if (code === 'BAD_REQUEST' || code === 'INVALID_AMOUNT') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid request');
      }
      
      return errorResponse(res, 500, 'Failed to initiate STK Push');
    }
  }

  /**
   * GET /api/v1/payments/stkpush/status
   * Query STK Push status by checkout request ID
   */
  async queryStkStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { checkoutRequestID } = req.query;

      if (!checkoutRequestID) {
        return badRequestResponse(res, 'checkoutRequestID is required');
      }

      const status = await paymentService.queryStkStatus(checkoutRequestID as string);

      return successResponse(res, status);
    } catch (error) {
      logger.error('Error querying STK Push status:', error);
      return errorResponse(res, 500, 'Failed to query status');
    }
  }

  /**
   * POST /api/v1/payments/stkpush/callback
   * Webhook callback from Safaricom (public endpoint)
   */
  async stkCallback(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentService.processStkCallback(req.body);

      // Always respond with success to acknowledge receipt
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
    } catch (error) {
      logger.error('Error processing STK Push callback:', error);
      // Still acknowledge to Safaricom
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback accepted' });
    }
  }

  /**
   * POST /api/v1/payments/disburse/b2c
   * Initiate B2C payment (disbursement to customer)
   */
  async initiateB2C(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || (req.body.tenantId as string);
      
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await paymentService.initiateB2C(req.body, tenantId!);

      return createdResponse(res, result, 'B2C disbursement initiated');
    } catch (error) {
      logger.error('Error initiating B2C disbursement:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Loan');
      }
      if (code === 'INVALID_AMOUNT' || code === 'BAD_REQUEST') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid request');
      }
      
      return errorResponse(res, 500, 'Failed to initiate disbursement');
    }
  }

  /**
   * POST /api/v1/payments/disburse/callback
   * B2C result callback from Safaricom
   */
  async b2cCallback(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentService.processB2CCallback(req.body);

      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Result accepted' });
    } catch (error) {
      logger.error('Error processing B2C callback:', error);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
  }

  /**
   * GET /api/v1/payments/history
   * Get payment/transaction history
   */
  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const type = req.query.type as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await paymentService.getHistory({
        page,
        limit,
        tenantId: tenantId!,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching payment history:', error);
      return errorResponse(res, 500, 'Failed to fetch payment history');
    }
  }

  /**
   * GET /api/v1/payments/balance
   * Get wallet/account balance
   */
  async getBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const balance = await paymentService.getBalance(tenantId!);

      return successResponse(res, balance);
    } catch (error) {
      logger.error('Error fetching balance:', error);
      return errorResponse(res, 500, 'Failed to fetch balance');
    }
  }

  /**
   * POST /api/v1/payments/repayment
   * Process a manual repayment
   */
  async processRepayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || (req.body.tenantId as string);
      
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const repayment = await paymentService.processRepayment({
        ...req.body,
        tenantId: tenantId!,
      });

      return createdResponse(res, repayment, 'Repayment processed successfully');
    } catch (error) {
      logger.error('Error processing repayment:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return notFoundResponse(res, 'Loan');
      }
      if (error instanceof Error && error.message.includes('no outstanding')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to process repayment');
    }
  }
}

// Export singleton instance
export const paymentController = new PaymentController();
