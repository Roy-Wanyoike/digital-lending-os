/**
 * Provider Controller
 * 
 * Handles HTTP requests for third-party provider monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { providerService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  errorResponse,
} from '../utils/response';
import { getQueryString, getQueryNumber } from '../utils/queryHelpers';
import { AuthRequest } from '../types';

export class ProviderController {
  /**
   * GET /api/v1/providers
   * Get health status of all providers
   */
  async getAllProviders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await providerService.getAllProviders();

      return successResponse(res, result);
    } catch (error) {
      logger.error('Error fetching providers:', error);
      return errorResponse(res, 500, 'Failed to fetch providers');
    }
  }

  /**
   * GET /api/v1/providers/:id
   * Get detailed status of a specific provider
   */
  async getProviderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);

      const provider = await providerService.getProviderById(id);

      return successResponse(res, provider);
    } catch (error) {
      logger.error('Error fetching provider:', error);
      
      if ((error as any)?.code === 'NOT_FOUND') {
        return notFoundResponse(res, 'Provider');
      }
      
      return errorResponse(res, 500, 'Failed to fetch provider');
    }
  }

  /**
   * GET /api/v1/providers/alerts
   * Get active alerts for all providers
   */
  async getAlerts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alerts = await providerService.getAlerts();

      return successResponse(res, alerts);
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      return errorResponse(res, 500, 'Failed to fetch alerts');
    }
  }

  /**
   * GET /api/v1/providers/incidents
   * Get incident history
   */
  async getIncidents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = getQueryNumber(req.query, "page", 1) || 1;
      const limit = getQueryNumber(req.query, "limit", 20) || 20;
      const status = getQueryString(req.query, "status") as string | undefined;

      const incidents = await providerService.getIncidents({ page, limit, status });

      return successResponse(res, incidents);
    } catch (error) {
      logger.error('Error fetching incidents:', error);
      return errorResponse(res, 500, 'Failed to fetch incidents');
    }
  }

  /**
   * GET /api/v1/providers/history
   * Get provider status history for charts
   */
  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { provider, period } = req.query;

      const history = await providerService.getHistory({
        provider: provider as string | undefined,
        period: (period as string) || '24h',
      });

      return successResponse(res, history);
    } catch (error) {
      logger.error('Error fetching provider history:', error);
      return errorResponse(res, 500, 'Failed to fetch history');
    }
  }

  /**
   * POST /api/v1/providers/alerts/:alertId/acknowledge
   * Acknowledge an alert
   */
  async acknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alertId = String(req.params.alertId);

      if (!req.user?.id) {
        // This shouldn't happen due to auth middleware
        return require('../utils/response').badRequestResponse(
          res,
          'User not authenticated'
        );
      }

      const alert = await providerService.acknowledgeAlert(alertId, req.user.id);

      return successResponse(res, alert, 'Alert acknowledged');
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return require('../utils/response').notFoundResponse(res, 'Alert');
      }
      
      return errorResponse(res, 500, 'Failed to acknowledge alert');
    }
  }

  /**
   * POST /api/v1/providers/incidents
   * Create a new incident
   */
  async createIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await providerService.createIncident(req.body);

      return createdResponse(res, incident, 'Incident created successfully');
    } catch (error) {
      logger.error('Error creating incident:', error);
      return errorResponse(res, 500, 'Failed to create incident');
    }
  }

  /**
   * POST /api/v1/providers/incidents/:incidentId/resolve
   * Resolve an incident
   */
  async resolveIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incidentId = String(req.params.incidentId);
      const { resolutionNotes } = req.body;

      await providerService.resolveIncident(incidentId, resolutionNotes);

      return successResponse(res, null, 'Incident resolved successfully');
    } catch (error) {
      logger.error('Error resolving incident:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return require('../utils/response').notFoundResponse(res, 'Incident');
      }
      
      return errorResponse(res, 500, 'Failed to resolve incident');
    }
  }

  /**
   * POST /api/v1/providers/health-check
   * Trigger health checks on all providers
   */
  async triggerHealthCheck(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const results = await providerService.performHealthChecks();

      return successResponse(res, {
        checkedAt: new Date(),
        results,
        overallStatus: results.every(p => p.status === 'OPERATIONAL') ? 'HEALTHY' : 'ISSUES_DETECTED',
      });
    } catch (error) {
      logger.error('Error performing health check:', error);
      return errorResponse(res, 500, 'Health check failed');
    }
  }
}

// Export singleton instance
export const providerController = new ProviderController();
