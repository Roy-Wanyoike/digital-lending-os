/**
 * Provider Health Monitoring Routes
 * 
 * Monitor status of third-party services: M-Pesa, CRB, SMS, etc.
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  successResponse,
  notFoundResponse,
} from '../utils/response';
import { AuthRequest, ProviderName, Incident } from '../types';

export const providerRoutes = Router();

providerRoutes.use(authenticate);

// Mock provider health data (in production, would query actual service status)
const providerStatus: Record<string, any> = {
  MPESA_DARAJA: {
    name: 'M-Pesa Daraja API',
    type: 'payment',
    status: 'OPERATIONAL',
    latency: 245,
    lastChecked: new Date(),
    uptime: 99.8,
    errorRate: 0.2,
    endpoint: 'https://api.safaricom.co.ke',
  },
  MPESA_C2B: {
    name: 'M-Pesa C2B API',
    type: 'payment',
    status: 'OPERATIONAL',
    latency: 180,
    lastChecked: new Date(),
    uptime: 99.9,
    errorRate: 0.1,
    endpoint: 'https://api.safaricom.co.ke',
  },
  CRB_METROPOL: {
    name: 'Metropol CRB',
    type: 'credit_bureau',
    status: 'OPERATIONAL',
    latency: 520,
    lastChecked: new Date(),
    uptime: 98.5,
    errorRate: 1.5,
    endpoint: 'https://api.metropolcorp.com',
  },
  CRB_TRANSUNION: {
    name: 'TransUnion CRB',
    type: 'credit_bureau',
    status: 'DEGRADED',
    latency: 1200,
    lastChecked: new Date(),
    uptime: 95.2,
    errorRate: 4.8,
    endpoint: 'https://api.transunion.co.ke',
  },
  SMS_GATEWAY: {
    name: 'Africa\'s Talking SMS',
    type: 'communication',
    status: 'OPERATIONAL',
    latency: 95,
    lastChecked: new Date(),
    uptime: 99.95,
    errorRate: 0.05,
    endpoint: 'https://api.africastalking.com',
  },
};

const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    type: 'DEGRADED_PERFORMANCE',
    severity: 'HIGH',
    status: 'ACTIVE',
    startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    description: 'TransUnion CRB API experiencing elevated response times',
    impact: 'Credit checks may take longer than usual',
  },
];

/**
 * GET /api/v1/providers
 * Get health status of all providers
 */
providerRoutes.get('/', (_req: AuthRequest, res) => {
  const providers = Object.entries(providerStatus).map(([key, value]) => ({
    provider: key as ProviderName,
    ...value,
  }));

  return successResponse(res, {
    providers,
    overallStatus: 'OPERATIONAL', // Would calculate based on all providers
    totalProviders: providers.length,
    operationalCount: providers.filter((p) => p.status === 'OPERATIONAL').length,
    degradedCount: providers.filter((p) => p.status === 'DEGRADED').length,
    downCount: providers.filter((p) => p.status === 'DOWN').length,
    lastChecked: new Date(),
  });
});

/**
 * GET /api/v1/providers/:id
 * Get detailed status of a specific provider
 */
providerRoutes.get('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;
  const provider = providerStatus[id.toUpperCase()];

  if (!provider) {
    return notFoundResponse(res, 'Provider');
  }

  return successResponse(res, {
    provider: id.toUpperCase() as ProviderName,
    ...provider,
    recentIncidents: mockIncidents.filter((i) =>
      i.description.toLowerCase().includes(id.toLowerCase())
    ),
    metrics: {
      avgLatency24h: [200, 250, 230, 280, 220, 210, 240],
      errorRate24h: [0.1, 0.2, 0.15, 0.3, 0.1, 0.05, 0.2],
      uptimeHistory: {
        '7d': 99.5,
        '30d': 99.2,
        '90d': 98.8,
      },
    },
  });
});

/**
 * GET /api/v1/providers/alerts
 * Get active alerts for all providers
 */
providerRoutes.get('/alerts', (_req: AuthRequest, res) => {
  return successResponse(res, {
    alerts: [
      {
        id: 'alert-001',
        provider: 'CRB_TRANSUNION' as ProviderName,
        severity: 'HIGH',
        type: 'PERFORMANCE_DEGRADATION',
        message: 'Response time exceeds threshold (>1000ms)',
        triggeredAt: new Date(Date.now() - 3600000),
        acknowledged: false,
      },
      {
        id: 'alert-002',
        provider: 'MPESA_DARAJA' as ProviderName,
        severity: 'LOW',
        type: 'ELEVATED_ERROR_RATE',
        message: 'Error rate slightly above normal (0.3%)',
        triggeredAt: new Date(Date.now() - 900000),
        acknowledged: true,
      },
    ],
    totalAlerts: 2,
    unacknowledgedCount: 1,
  });
});

/**
 * GET /api/v1/providers/incidents
 * Get incident history
 */
providerRoutes.get('/incidents', async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;

  let filteredIncidents = [...mockIncidents];
  
  if (status) {
    filteredIncidents = filteredIncidents.filter((i) => i.status === status.toUpperCase());
  }

  // Mock pagination
  const start = (page - 1) * limit;
  const paginatedIncidents = filteredIncidents.slice(start, start + limit);

  return successResponse(res, {
    incidents: paginatedIncidents,
    pagination: {
      page,
      limit,
      total: filteredIncidents.length,
      pages: Math.ceil(filteredIncidents.length / limit),
    },
  });
});

/**
 * GET /api/v1/providers/history
 * Get provider status history for charts
 */
providerRoutes.get('/history', (req: AuthRequest, res) => {
  const { provider, period = '24h' } = req.query;

  // Generate mock historical data points
  const now = Date.now();
  const interval = period === '24h' ? 3600000 : period === '7d' ? 86400000 : 604800000;
  const points = period === '24h' ? 24 : period === '7d' ? 7 : 30;

  const historyData = Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - 1 - i) * interval),
    latency: Math.floor(Math.random() * 500) + 100,
    availability: Math.random() > 0.05 ? 100 : 95,
    errorCount: Math.floor(Math.random() * 10),
    requestCount: Math.floor(Math.random() * 1000) + 500,
  }));

  return successResponse(res, {
    provider: provider || 'all',
    period,
    data: historyData,
  });
});
