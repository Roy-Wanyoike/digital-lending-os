/**
 * Credit Controller
 * 
 * Handles HTTP requests for credit & risk assessment operations.
 */

import { Request, Response, NextFunction } from 'express';
import { creditService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export class CreditController {
  /**
   * GET /api/v1/credit
   * Credit dashboard with scoring overview
   */
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = getQueryString(req.query, "tenantId") || req.user?.tenantId;

      if (!tenantId) {
        return badRequestResponse(res, 'tenantId is required');
      }

      const dashboard = await creditService.getDashboard(tenantId!);

      return successResponse(res, dashboard);
    } catch (error) {
      logger.error('Error fetching credit data:', error);
      return errorResponse(res, 500, 'Failed to fetch credit data');
    }
  }

  /**
   * POST /api/v1/credit/assessment
   * Perform credit assessment for a customer
   */
  async performAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await creditService.performAssessment(req.body);

      return successResponse(res, result);
    } catch (error) {
      logger.error('Error performing credit assessment:', error);
      
      const code = (error as any)?.code;
      if (code === 'NOT_FOUND') {
        // Return a more user-friendly message
        return require('../utils/response').notFoundResponse(res, 'Customer');
      }
      if (code === 'BAD_REQUEST') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Invalid request parameters');
      }
      
      return errorResponse(res, 500, 'Credit assessment failed');
    }
  }

  /**
   * GET /api/v1/credit/rules
   * List eligibility rules
   */
  async getRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rules = await creditService.getRules();

      return successResponse(res, { rules, totalRules: rules.length });
    } catch (error) {
      logger.error('Error fetching rules:', error);
      return errorResponse(res, 500, 'Failed to fetch rules');
    }
  }

  /**
   * PUT /api/v1/credit/rules/:id
   * Update eligibility rule
   */
  async updateRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const updatedRule = await creditService.updateRule(
        id,
        req.body,
        req.user!.id
      );

      return successResponse(res, updatedRule, 'Rule updated successfully');
    } catch (error) {
      logger.error('Error updating rule:', error);
      return errorResponse(res, 500, 'Failed to update rule');
    }
  }

  /**
   * GET /api/v1/credit/policies
   * Get credit policies and limits
   */
  async getPolicies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const policies = await creditService.getPolicies();

      return successResponse(res, { policies, totalPolicies: policies.length });
    } catch (error) {
      logger.error('Error fetching policies:', error);
      return errorResponse(res, 500, 'Failed to fetch policies');
    }
  }

  /**
   * POST /api/v1/credit/eligibility/:customerId
   * Evaluate customer against eligibility rules
   */
  async evaluateEligibility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customerId = String(req.params.customerId);
      const { requestedAmount } = req.query;

      if (!requestedAmount) {
        return badRequestResponse(res, 'requestedAmount query parameter is required');
      }

      const result = await creditService.evaluateEligibility(
        customerId,
        parseFloat(requestedAmount as string)
      );

      return successResponse(res, result);
    } catch (error) {
      logger.error('Error evaluating eligibility:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return require('../utils/response').notFoundResponse(res, 'Customer');
      }
      
      return errorResponse(res, 500, 'Failed to evaluate eligibility');
    }
  }
}

// Export singleton instance
export const creditController = new CreditController();
