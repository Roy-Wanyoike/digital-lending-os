/**
 * Finance Controller
 * 
 * Handles HTTP requests for financial operations.
 */

import { Request, Response, NextFunction } from 'express';
import { financeService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { AuthRequest, TransactionType } from '../types';

export class FinanceController {
  /**
   * GET /api/v1/finance
   * Financial dashboard with wallet balances and metrics
   */
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const dashboard = await financeService.getDashboard(tenantId!);

      return successResponse(res, dashboard);
    } catch (error) {
      logger.error('Error fetching finance dashboard:', error);
      return errorResponse(res, 500, 'Failed to fetch finance data');
    }
  }

  /**
   * GET /api/v1/finance/transactions
   * List transactions with filtering
   */
  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const type = req.query.type as TransactionType | undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const result = await financeService.getTransactions({
        page,
        limit,
        tenantId: tenantId!,
        type: type as any,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return paginatedResponse(res, result.items, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      return errorResponse(res, 500, 'Failed to fetch transactions');
    }
  }

  /**
   * GET /api/v1/finance/transactions/:id
   * Get single transaction details
   */
  async getTransactionById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const transaction = await financeService.getTransactionById(id);

      return successResponse(res, transaction);
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Transaction');
      }
      
      return errorResponse(res, 500, 'Failed to fetch transaction');
    }
  }

  /**
   * GET /api/v1/finance/ledger
   * General ledger view with double-entry accounting
   */
  async getLedger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const ledger = await financeService.getLedger(tenantId!, page, limit);

      return successResponse(res, ledger);
    } catch (error) {
      logger.error('Error fetching ledger:', error);
      return errorResponse(res, 500, 'Failed to fetch ledger');
    }
  }

  /**
   * GET /api/v1/finance/reconciliation
   * Reconciliation status and unmatched transactions
   */
  async getReconciliationStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const status = await financeService.getReconciliationStatus(tenantId!);

      return successResponse(res, status);
    } catch (error) {
      logger.error('Error fetching reconciliation:', error);
      return errorResponse(res, 500, 'Failed to fetch reconciliation data');
    }
  }

  /**
   * POST /api/v1/finance/reconciliation
   * Mark transactions as reconciled
   */
  async reconcile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { transactionIds, notes } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return badRequestResponse(res, 'transactionIds array is required');
      }

      const count = await financeService.reconcile(
        transactionIds,
        req.user!.id,
        notes
      );

      return successResponse(
        res,
        { count },
        `${count} transactions reconciled successfully`
      );
    } catch (error) {
      logger.error('Error during reconciliation:', error);
      return errorResponse(res, 500, 'Reconciliation failed');
    }
  }

  /**
   * POST /api/v1/finance/settlements
   * Process settlement or create settlement record
   */
  async processSettlement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, amount, reference, description } = req.body;

      if (!type || !amount) {
        return badRequestResponse(res, 'type and amount are required');
      }

      const tenantId = req.user?.tenantId || (req.body.tenantId as string);
      
      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const settlement = await financeService.processSettlement({
        tenantId: tenantId!,
        type,
        amount,
        reference,
        description,
        userId: req.user!.id,
      });

      return createdResponse(res, settlement, 'Settlement processed successfully');
    } catch (error) {
      logger.error('Error processing settlement:', error);
      
      const code = (error as any)?.code;
      if (code === 'INVALID_TYPE') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid settlement type');
      }
      
      return errorResponse(res, 500, 'Settlement processing failed');
    }
  }

  /**
   * POST /api/v1/finance/transactions/:id/reverse
   * Reverse a transaction
   */
  async reverseTransaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return badRequestResponse(res, 'reason for reversal is required');
      }

      await financeService.reverseTransaction(id, reason, req.user!.id);

      return successResponse(res, null, 'Transaction reversed successfully');
    } catch (error) {
      logger.error('Error reversing transaction:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return notFoundResponse(res, 'Transaction');
      }
      if (error instanceof Error && error.message.includes('reconciled')) {
        return badRequestResponse(res, error.message);
      }
      
      return errorResponse(res, 500, 'Failed to reverse transaction');
    }
  }
}

// Export singleton instance
export const financeController = new FinanceController();
