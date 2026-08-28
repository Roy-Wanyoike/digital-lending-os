/**
 * Provider Service
 * 
 * Business logic for third-party provider monitoring including:
 * - Health status tracking
 * - Incident management
 * - Latency and uptime monitoring
 * - Alert management
 */

import { logger } from '../utils/logger';
import { ProviderName, Incident } from '../types';

export interface ProviderHealthStatus {
  provider: ProviderName;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  latency: number;
  lastChecked: Date;
  uptime: number;
  errorRate: number;
  endpoint?: string;
}

export interface ProviderAlert {
  id: string;
  provider: ProviderName;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Mock provider health data (in production, would query actual service status)
const providerStatusMap: Record<string, ProviderHealthStatus> = {
  MPESA_DARAJA: {
    provider: 'MPESA_DARAJA',
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
    provider: 'MPESA_C2B',
    name: 'M-Pesa C2B API',
    type: 'payment',
    status: 'OPERATIONAL',
    latency: 180,
    lastChecked: new Date(),
    uptime: 99.9,
    errorRate: 0.1,
    endpoint: 'https://api.safaricom.co.ke',
  },
  MPESA_B2C: {
    provider: 'MPESA_B2C',
    name: 'M-Pesa B2C API',
    type: 'payment',
    status: 'OPERATIONAL',
    latency: 320,
    lastChecked: new Date(),
    uptime: 99.7,
    errorRate: 0.3,
    endpoint: 'https://api.safaricom.co.ke',
  },
  CRB_METROPOL: {
    provider: 'CRB_METROPOL',
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
    provider: 'CRB_TRANSUNION',
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
    provider: 'SMS_GATEWAY',
    name: "Africa's Talking SMS",
    type: 'communication',
    status: 'OPERATIONAL',
    latency: 95,
    lastChecked: new Date(),
    uptime: 99.95,
    errorRate: 0.05,
    endpoint: 'https://api.africastalking.com',
  },
  EMAIL_SERVICE: {
    provider: 'EMAIL_SERVICE',
    name: 'Email Service (SendGrid)',
    type: 'communication',
    status: 'OPERATIONAL',
    latency: 150,
    lastChecked: new Date(),
    uptime: 99.9,
    errorRate: 0.1,
    endpoint: 'https://api.sendgrid.com',
  },
  KYC_VERIFICATION: {
    provider: 'KYC_VERIFICATION',
    name: 'KYC Verification Service',
    type: 'verification',
    status: 'OPERATIONAL',
    latency: 380,
    lastChecked: new Date(),
    uptime: 98.8,
    errorRate: 1.2,
    endpoint: 'https://kyc.api.internal',
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

const mockAlerts: ProviderAlert[] = [
  {
    id: 'alert-001',
    provider: 'CRB_TRANSUNION',
    severity: 'HIGH',
    type: 'PERFORMANCE_DEGRADATION',
    message: 'Response time exceeds threshold (>1000ms)',
    triggeredAt: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: 'alert-002',
    provider: 'MPESA_DARAJA',
    severity: 'LOW',
    type: 'ELEVATED_ERROR_RATE',
    message: 'Error rate slightly above normal (0.3%)',
    triggeredAt: new Date(Date.now() - 900000),
    acknowledged: true,
  },
];

export class ProviderService {
  /**
   * Get health status of all providers
   */
  async getAllProviders(): Promise<{
    providers: ProviderHealthStatus[];
    overallStatus: string;
    totalProviders: number;
    operationalCount: number;
    degradedCount: number;
    downCount: number;
    lastChecked: Date;
  }> {
    const providers = Object.values(providerStatusMap);

    return {
      providers,
      overallStatus: this.calculateOverallStatus(providers),
      totalProviders: providers.length,
      operationalCount: providers.filter((p) => p.status === 'OPERATIONAL').length,
      degradedCount: providers.filter((p) => p.status === 'DEGRADED').length,
      downCount: providers.filter((p) => p.status === 'DOWN').length,
      lastChecked: new Date(),
    };
  }

  /**
   * Get detailed status of a specific provider
   */
  async getProviderById(id: string): Promise<ProviderHealthStatus & {
    recentIncidents: Incident[];
    metrics: {
      avgLatency24h: number[];
      errorRate24h: number[];
      uptimeHistory: Record<string, number>;
    };
  }> {
    const provider = providerStatusMap[id.toUpperCase()];

    if (!provider) {
      const error: any = new Error('Provider not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return {
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
    };
  }

  /**
   * Get active alerts for all providers
   */
  async getAlerts(): Promise<{
    alerts: ProviderAlert[];
    totalAlerts: number;
    unacknowledgedCount: number;
  }> {
    return {
      alerts: mockAlerts,
      totalAlerts: mockAlerts.length,
      unacknowledgedCount: mockAlerts.filter((a) => !a.acknowledged).length,
    };
  }

  /**
   * Get incident history
   */
  async getIncidents(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    incidents: Incident[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 20, status } = params;

    let filteredIncidents = [...mockIncidents];
    
    if (status) {
      filteredIncidents = filteredIncidents.filter((i) => i.status === status.toUpperCase());
    }

    // Mock pagination
    const start = (page - 1) * limit;
    const paginatedIncidents = filteredIncidents.slice(start, start + limit);

    return {
      incidents: paginatedIncidents,
      pagination: {
        page,
        limit,
        total: filteredIncidents.length,
        pages: Math.ceil(filteredIncidents.length / limit),
      },
    };
  }

  /**
   * Get provider status history for charts
   */
  async getHistory(params: {
    provider?: string;
    period?: string;
  }): Promise<{
    provider: string;
    period: string;
    data: Array<{
      timestamp: Date;
      latency: number;
      availability: number;
      errorCount: number;
      requestCount: number;
    }>;
  }> {
    const { provider = 'all', period = '24h' } = params;

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

    return {
      provider,
      period,
      data: historyData,
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<ProviderAlert> {
    const alert = mockAlerts.find((a) => a.id === alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    logger.info('Provider alert acknowledged', { alertId, userId });

    return alert;
  }

  /**
   * Create a new incident
   */
  async createIncident(data: {
    provider: ProviderName;
    type: Incident['type'];
    severity: Incident['severity'];
    description: string;
    impact: string;
  }): Promise<Incident> {
    const incident: Incident = {
      id: `inc-${Date.now()}`,
      ...data,
      status: 'ACTIVE',
      startedAt: new Date(),
    };

    logger.warn('Provider incident created', incident);

    // In production: Save to database
    mockIncidents.push(incident);

    return incident;
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(incidentId: string, resolutionNotes?: string): Promise<void> {
    const index = mockIncidents.findIndex((i) => i.id === incidentId);
    
    if (index === -1) {
      throw new Error('Incident not found');
    }

    mockIncidents[index] = {
      ...mockIncidents[index],
      status: 'RESOLVED',
      resolvedAt: new Date(),
    };

    logger.info('Provider incident resolved', { incidentId });
  }

  /**
   * Perform health check on all providers
   */
  async performHealthChecks(): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];

    for (const [key, provider] of Object.entries(providerStatusMap)) {
      // In production: Make actual HTTP requests to check health
      const isHealthy = Math.random() > 0.05; // 95% uptime simulation
      
      results.push({
        ...provider,
        status: isHealthy ? 'OPERATIONAL' : 'DEGRADED',
        latency: Math.floor(Math.random() * 500) + 50,
        lastChecked: new Date(),
      });
    }

    return results;
  }

  /**
   * Calculate overall system status based on all providers
   */
  private calculateOverallStatus(providers: ProviderHealthStatus[]): string {
    if (providers.every((p) => p.status === 'OPERATIONAL')) {
      return 'OPERATIONAL';
    }
    
    if (providers.some((p) => p.status === 'DOWN')) {
      return 'PARTIAL_OUTAGE';
    }
    
    if (providers.some((p) => p.status === 'DEGRADED')) {
      return 'DEGRADED';
    }

    return 'UNKNOWN';
  }
}

// Export singleton instance
export const providerService = new ProviderService();
