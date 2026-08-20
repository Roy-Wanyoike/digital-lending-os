// Provider Health Monitoring Service for Digital Lending OS
// Monitors external integrations: M-Pesa, KYC, CRB, SMS, Email

export type ProviderType = "payment" | "kyc" | "credit" | "communication" | "banking";
export type ProviderStatusType = "healthy" | "degraded" | "down" | "unknown";
export type AlertSeverity = "info" | "warning" | "critical";

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
}

export interface RequestVolume {
  total: number;
  successful: number;
  failed: number;
}

export interface Incident {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  description: string;
  severity: AlertSeverity;
  status: "active" | "acknowledged" | "resolved";
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  resolvedBy?: string;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  rootCause?: string;
  impact: string;
  affectedServices: string[];
}

export interface MaintenanceWindow {
  start: Date;
  end: Date;
  reason: string;
  planned: boolean;
}

export interface LastIncident {
  time: Date;
  type: string;
  description: string;
  resolved: boolean;
  duration?: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  displayName: string;
  type: ProviderType;
  status: ProviderStatusType;
  uptime: number; // Percentage (99.95)
  latency: LatencyMetrics; // ms
  successRate: number; // Percentage (99.94)
  errorRate: number; // Percentage (0.06)
  requestVolume: RequestVolume;
  lastIncident?: LastIncident;
  currentIncidents: number;
  maintenanceWindow?: MaintenanceWindow;
  endpoint: string;
  region: string;
  lastChecked: Date;
  slaTarget: number;
  dependencies: string[];
  icon: string;
}

export interface HealthCheckResult {
  timestamp: Date;
  providers: ProviderStatus[];
  overallHealth: "healthy" | "degraded" | "critical";
  alerts: Alert[];
  summary: {
    totalProviders: number;
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    unknownCount: number;
    activeIncidents: number;
    activeAlerts: number;
  };
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  provider: string;
  providerId: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolved: boolean;
  type: string;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  latency: LatencyMetrics;
  successRate: number;
  errorRate: number;
  requestCount: number;
  errorCount: number;
}

export interface ProviderHistory {
  providerId: string;
  period: string;
  data: HistoricalDataPoint[];
  summary: {
    avgLatency: LatencyMetrics;
    maxLatency: LatencyMetrics;
    minLatency: LatencyMetrics;
    totalRequests: number;
    totalErrors: number;
    overallUptime: number;
  };
}

// Mock Data for Kenyan DCP Providers
const PROVIDERS_CONFIG = [
  // Payment Providers
  {
    id: "mpesa",
    name: "mpesa",
    displayName: "M-Pesa STK Push",
    type: "payment" as ProviderType,
    endpoint: "api.safaricom.co.ke/mpesa/stkpush/v1",
    region: "Kenya - Nairobi",
    slaTarget: 99.9,
    dependencies: ["sms-gateway"],
    icon: "📱",
  },
  {
    id: "pesalink",
    name: "pesalink",
    displayName: "Pesalink Transfer",
    type: "payment" as ProviderType,
    endpoint: "pesalink.interswitch.co.ke/api/v2",
    region: "Kenya - Nairobi",
    slaTarget: 99.95,
    dependencies: [],
    icon: "🏦",
  },
  {
    id: "card-gateway",
    name: "card-gateway",
    displayName: "Card Payment Gateway",
    type: "payment" as ProviderType,
    endpoint: "gateway.dpo.group/api/v3",
    region: "Global - Failover",
    slaTarget: 99.95,
    dependencies: ["fraud-detection"],
    icon: "💳",
  },
  {
    id: "bank-transfer",
    name: "bank-transfer",
    displayName: "Bank Transfer (EFT)",
    type: "banking" as ProviderType,
    endpoint: "rtgs.centralbank.go.ke/rtgs/v1",
    region: "Kenya - CBK",
    slaTarget: 99.99,
    dependencies: [],
    icon: "🏦",
  },

  // Verification/KYC Providers
  {
    id: "id-verification",
    name: "id-verification",
    displayName: "ID Verification (NIDA)",
    type: "kyc" as ProviderType,
    endpoint: "verification.crbservices.co.ke/id/v2",
    region: "Kenya - Nairobi",
    slaTarget: 99.9,
    dependencies: [],
    icon: "🆔",
  },
  {
    id: "crb-check",
    name: "crb-check",
    displayName: "CRB Credit Check",
    type: "credit" as ProviderType,
    endpoint: "api.metropolcorp.com/crb/v3",
    region: "Kenya - Multi-region",
    slaTarget: 99.95,
    dependencies: ["id-verification"],
    icon: "📋",
  },
  {
    id: "biometrics",
    name: "biometrics",
    displayName: "Biometric Verification",
    type: "kyc" as ProviderType,
    endpoint: "bio.onfido.com/verify/v4",
    region: "EU - Ireland",
    slaTarget: 99.8,
    dependencies: ["id-verification"],
    icon: "📷",
  },

  // Communication Providers
  {
    id: "sms-gateway",
    name: "sms-gateway",
    displayName: "SMS Gateway (Africa's Talking)",
    type: "communication" as ProviderType,
    endpoint: "api.africastalking.com/version1/messaging",
    region: "Kenya - Multi-AZ",
    slaTarget: 99.95,
    dependencies: [],
    icon: "📲",
  },
  {
    id: "email-service",
    name: "email-service",
    displayName: "Email Service (SendGrid)",
    type: "communication" as ProviderType,
    endpoint: "api.sendgrid.com/v3/mail/send",
    region: "Global - US-East",
    slaTarget: 99.99,
    dependencies: [],
    icon: "📧",
  },
  {
    id: "whatsapp-api",
    name: "whatsapp-api",
    displayName: "WhatsApp Business API",
    type: "communication" as ProviderType,
    endpoint: "graph.facebook.com/v17.0/whatsapp",
    region: "Global - Multi-region",
    slaTarget: 99.9,
    dependencies: ["sms-gateway"],
    icon: "💬",
  },
];

// Generate realistic latency based on time of day
function generateTimeBasedLatency(
  baseLatency: number,
  variance: number
): LatencyMetrics {
  const hour = new Date().getHours();
  const isPeakHour = hour >= 8 && hour <= 11 || hour >= 14 && hour <= 17;
  const peakMultiplier = isPeakHour ? 1.3 + Math.random() * 0.4 : 1;
  
  const p50 = Math.round(baseLatency * peakMultiplier + (Math.random() - 0.5) * variance);
  const p95 = Math.round(p50 * (1.8 + Math.random() * 0.4));
  const p99 = Math.round(p95 * (1.5 + Math.random() * 0.5));
  
  return { p50, p95, p99 };
}

// Generate request volume with realistic patterns
function generateRequestVolume(baseVolume: number): RequestVolume {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let timeMultiplier = 1;
  if (isWeekend) {
    timeMultiplier = 0.4 + Math.random() * 0.2;
  } else if (hour >= 6 && hour <= 9) {
    timeMultiplier = 1.5 + Math.random() * 0.3; // Morning peak
  } else if (hour >= 12 && hour <= 14) {
    timeMultiplier = 1.2 + Math.random() * 0.2; // Lunch
  } else if (hour >= 17 && hour <= 20) {
    timeMultiplier = 1.4 + Math.random() * 0.3; // Evening
  } else if (hour >= 0 && hour <= 5) {
    timeMultiplier = 0.1 + Math.random() * 0.1; // Night
  }
  
  const total = Math.round(baseVolume * timeMultiplier);
  const errorRate = 0.01 + Math.random() * 0.09; // 1-10% base error rate varies by provider
  const failed = Math.max(0, Math.round(total * errorRate / 100));
  const successful = total - failed;
  
  return { total, successful, failed };
}

// Generate provider status with realistic data
function generateProviderStatus(config: typeof PROVIDERS_CONFIG[0]): ProviderStatus {
  const now = new Date();
  
  // Base configurations per provider
  const configs: Record<string, {
    baseUptime: number;
    baseLatency: number;
    latencyVariance: number;
    baseVolume: number;
    statusWeights: [number, number, number, number]; // healthy, degraded, down, unknown
  }> = {
    "mpesa": { baseUptime: 99.94, baseLatency: 420, latencyVariance: 100, baseVolume: 15000, statusWeights: [92, 6, 1, 1] },
    "pesalink": { baseUptime: 99.98, baseLatency: 180, latencyVariance: 50, baseVolume: 5000, statusWeights: [97, 2, 0.5, 0.5] },
    "card-gateway": { baseUptime: 99.95, baseLatency: 320, latencyVariance: 80, baseVolume: 8000, statusWeights: [95, 4, 0.5, 0.5] },
    "bank-transfer": { baseUptime: 99.99, baseLatency: 1200, latencyVariance: 300, baseVolume: 2000, statusWeights: [98, 1.5, 0.25, 0.25] },
    "id-verification": { baseUptime: 99.92, baseLatency: 850, latencyVariance: 200, baseVolume: 12000, statusWeights: [90, 8, 1.5, 0.5] },
    "crb-check": { baseUptime: 99.95, baseLatency: 1100, latencyVariance: 250, baseVolume: 9000, statusWeights: [94, 5, 0.75, 0.25] },
    "biometrics": { baseUptime: 99.80, baseLatency: 1500, latencyVariance: 400, baseVolume: 4000, statusWeights: [80, 15, 4, 1] },
    "sms-gateway": { baseUptime: 99.97, baseLatency: 150, latencyVariance: 40, baseVolume: 25000, statusWeights: [96, 3, 0.5, 0.5] },
    "email-service": { baseUptime: 99.99, baseLatency: 220, latencyVariance: 60, baseVolume: 18000, statusWeights: [99, 0.75, 0.125, 0.125] },
    "whatsapp-api": { baseUptime: 99.95, baseLatency: 380, latencyVariance: 90, baseVolume: 6000, statusWeights: [93, 5, 1.5, 0.5] },
  };

  const pc = configs[config.id];
  const rand = Math.random() * 100;
  
  let status: ProviderStatusType;
  const cumulative = [
    pc.statusWeights[0],
    pc.statusWeights[0] + pc.statusWeights[1],
    pc.statusWeights[0] + pc.statusWeights[1] + pc.statusWeights[2],
    100
  ];
  
  if (rand < cumulative[0]) status = "healthy";
  else if (rand < cumulative[1]) status = "degraded";
  else if (rand < cumulative[2]) status = "down";
  else status = "unknown";

  const uptimeVariation = status === "healthy" ? 0 : status === "degraded" ? -0.5 : -2;
  const uptime = Math.max(95, Math.min(99.99, pc.baseUptime + (Math.random() - 0.5) * 0.1 + uptimeVariation));
  
  const latency = generateTimeBasedLatency(pc.baseLatency, pc.latianceVariance);
  const requestVolume = generateRequestVolume(pc.baseVolume);
  
  const successRate = 100 - (requestVolume.failed / Math.max(1, requestVolume.total)) * 100;
  const errorRate = 100 - successRate;

  // Generate last incident
  const hasIncident = Math.random() > 0.3;
  let lastIncident: LastIncident | undefined;
  if (hasIncident) {
    const incidentTypes = [
      { type: "timeout", desc: "Connection timeout during peak hours" },
      { type: "error_5xx", desc: "Upstream server error (HTTP 503)" },
      { type: "slow_response", desc: "Elevated response times detected" },
      { type: "auth_failure", desc: "Authentication token expired" },
      { type: "rate_limit", desc: "Rate limit exceeded" },
      { type: "dns_failure", desc: "DNS resolution failure" },
    ];
    const incident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    
    lastIncident = {
      time: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      type: incident.type,
      description: incident.desc,
      resolved: Math.random() > 0.2,
      duration: Math.round(5 + Math.random() * 120),
    };
  }

  // Current incidents (more likely when not healthy)
  const currentIncidents = status === "down" ? Math.floor(1 + Math.random() * 3) :
                           status === "degraded" ? (Math.random() > 0.7 ? 1 : 0) : 0;

  // Maintenance window (rare)
  let maintenanceWindow: MaintenanceWindow | undefined;
  if (Math.random() > 0.95) {
    maintenanceWindow = {
      start: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      reason: "Scheduled infrastructure upgrade",
      planned: true,
    };
  }

  return {
    id: config.id,
    name: config.name,
    displayName: config.displayName,
    type: config.type,
    status,
    uptime: Math.round(uptime * 100) / 100,
    latency,
    successRate: Math.round(successRate * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    requestVolume,
    lastIncident,
    currentIncidents,
    maintenanceWindow,
    endpoint: config.endpoint,
    region: config.region,
    lastChecked: now,
    slaTarget: config.slaTarget,
    dependencies: config.dependencies,
    icon: config.icon,
  };
}

// Generate alerts based on provider statuses
function generateAlerts(providers: ProviderStatus[]): Alert[] {
  const alerts: Alert[] = [];
  const alertTemplates: Record<ProviderStatusType, { severity: AlertSeverity; messages: string[] }[]> = {
    healthy: [],
    degraded: [
      { severity: "warning", messages: [
        "Elevated response times detected",
        "Success rate below threshold",
        "Intermittent timeouts occurring",
        "Performance degradation observed",
      ]},
      { severity: "info", messages: [
        "Approaching rate limits",
        "Cache hit ratio decreased",
      ]},
    ],
    down: [
      { severity: "critical", messages: [
        "Service unreachable",
        "Connection refused",
        "All health checks failing",
        "Complete service outage",
      ]},
      { severity: "warning", messages: [
        "Failover initiated",
        "Circuit breaker open",
      ]},
    ],
    unknown: [
      { severity: "warning", messages: [
        "Unable to determine service status",
        "Health check timeout",
        "Status check pending",
      ]},
    ],
  };

  providers.forEach((provider, index) => {
    const templates = alertTemplates[provider.status];
    templates?.forEach(({ severity, messages }) => {
      if (Math.random() > 0.5) {
        const message = messages[Math.floor(Math.random() * messages.length)];
        alerts.push({
          id: `alert-${provider.id}-${index}-${Date.now()}`,
          severity,
          provider: provider.displayName,
          providerId: provider.id,
          message: `${provider.displayName}: ${message}`,
          createdAt: new Date(Date.now() - Math.random() * 3600000),
          acknowledged: Math.random() > 0.7,
          ...(Math.random() > 0.7 ? { acknowledgedBy: "ops-team@lendingos.co.ke" } : {}),
          resolved: false,
          type: severity === "critical" ? "outage" : severity === "warning" ? "degradation" : "info",
        });
      }
    });
  });

  return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Generate sample incidents
function generateSampleIncidents(): Incident[] {
  const now = new Date();
  return [
    {
      id: "inc-001",
      providerId: "mpesa",
      providerName: "M-Pesa STK Push",
      type: "timeout",
      description: "Sustained timeouts affecting STK Push transactions during morning peak hours",
      severity: "critical",
      status: "resolved",
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      duration: 45,
      resolvedBy: "john.kamau@lendingos.co.ke",
      resolvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      rootCause: "Safaricom API rate limiting during high traffic period",
      impact: "Delayed loan disbursements for ~200 customers",
      affectedServices: ["loan-disbursement", "repayment-collection"],
    },
    {
      id: "inc-002",
      providerId: "biometrics",
      providerName: "Biometric Verification",
      type: "slow_response",
      description: "Biometric verification API showing elevated P99 latencies (>3s)",
      severity: "warning",
      status: "active",
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      impact: "Slower onboarding experience, increased abandonment",
      affectedServices: ["customer-onboarding", "kyc-verification"],
    },
    {
      id: "inc-003",
      providerId: "crb-check",
      providerName: "CRB Credit Check",
      type: "intermittent_errors",
      description: "Intermittent HTTP 502 errors from Metropol CRB API",
      severity: "warning",
      status: "acknowledged",
      startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      acknowledgedBy: "grace.otieno@lendingos.co.ke",
      acknowledgedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      impact: "Some credit checks require retry, slight delay in approval",
      affectedServices: ["credit-assessment", "loan-approval"],
    },
    {
      id: "inc-004",
      providerId: "sms-gateway",
      providerName: "SMS Gateway",
      type: "delivery_delays",
      description: "SMS delivery delays of 5-10 minutes reported",
      severity: "info",
      status: "resolved",
      startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      duration: 120,
      resolvedBy: "system-auto",
      resolvedAt: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      rootCause: "Telco network congestion",
      impact: "OTP and notification delays",
      affectedServices: ["two-factor-auth", "notifications"],
    },
    {
      id: "inc-005",
      providerId: "id-verification",
      providerName: "ID Verification (NIDA)",
      type: "connection_error",
      description: "Failed to establish connection to NIDA verification endpoint",
      severity: "critical",
      status: "resolved",
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      duration: 20,
      resolvedBy: "tech-ops@lendingos.co.ke",
      resolvedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      rootCause: "Scheduled NIDA system maintenance extended beyond window",
      impact: "New customer registration blocked for 20 minutes",
      affectedServices: ["customer-registration", "kyc-verification"],
    },
  ];
}

// In-memory store for incidents and alerts
let incidentsStore: Incident[] = generateSampleIncidents();
let alertsStore: Alert[] = [];

// Main health check function
export function performHealthCheck(tenantId?: string): HealthCheckResult {
  const now = new Date();
  const providers = PROVIDERS_CONFIG.map(generateProviderStatus);
  const alerts = [...generateAlerts(providers), ...alertsStore.filter(a => !a.resolved)];
  
  const healthyCount = providers.filter(p => p.status === "healthy").length;
  const degradedCount = providers.filter(p => p.status === "degraded").length;
  const downCount = providers.filter(p => p.status === "down").length;
  const unknownCount = providers.filter(p => p.status === "unknown").length;
  
  let overallHealth: "healthy" | "degraded" | "critical";
  if (downCount > 0) {
    overallHealth = "critical";
  } else if (degradedCount > 2 || unknownCount > 0) {
    overallHealth = "degraded";
  } else if (degradedCount > 0) {
    overallHealth = "degraded";
  } else {
    overallHealth = "healthy";
  }

  return {
    timestamp: now,
    providers,
    overallHealth,
    alerts: alerts.slice(0, 20), // Limit to recent 20 alerts
    summary: {
      totalProviders: providers.length,
      healthyCount,
      degradedCount,
      downCount,
      unknownCount,
      activeIncidents: incidentsStore.filter(i => i.status !== "resolved").length,
      activeAlerts: alerts.filter(a => !a.resolved).length,
    },
  };
}

// Get single provider details
export function getProviderDetails(providerId: string): ProviderStatus | null {
  const config = PROVIDERS_CONFIG.find(p => p.id === providerId);
  if (!config) return null;
  return generateProviderStatus(config);
}

// Get all providers
export function getAllProviders(): ProviderStatus[] {
  return PROVIDERS_CONFIG.map(generateProviderStatus);
}

// Get incidents
export function getIncidents(options?: { 
  providerId?: string; 
  status?: string; 
  severity?: string;
}): Incident[] {
  let filtered = [...incidentsStore];
  
  if (options?.providerId) {
    filtered = filtered.filter(i => i.providerId === options.providerId);
  }
  if (options?.status) {
    filtered = filtered.filter(i => i.status === options.status);
  }
  if (options?.severity) {
    filtered = filtered.filter(i => i.severity === options.severity);
  }
  
  return filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

// Create incident
export function createIncident(data: Omit<Incident, "id" | "startTime">): Incident {
  const incident: Incident = {
    ...data,
    id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
  };
  incidentsStore.unshift(incident);
  return incident;
}

// Update incident (acknowledge/resolve)
export function updateIncident(
  incidentId: string, 
  updates: Partial<Pick<Incident, "status" | "acknowledgedBy" | "acknowledgedAt" | "resolvedBy" | "resolvedAt" | "endTime" | "duration">>
): Incident | null {
  const index = incidentsStore.findIndex(i => i.id === incidentId);
  if (index === -1) return null;
  
  incidentsStore[index] = { ...incidentsStore[index], ...updates };
  return incidentsStore[index];
}

// Get alerts
export function getAlerts(options?: { 
  providerId?: string; 
  severity?: string;
  acknowledged?: boolean;
}): Alert[] {
  let filtered = [...alertsStore];
  
  if (options?.providerId) {
    filtered = filtered.filter(a => a.providerId === options.providerId);
  }
  if (options?.severity) {
    filtered = filtered.filter(a => a.severity === options.severity);
  }
  if (options?.acknowledged !== undefined) {
    filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
  }
  
  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Acknowledge alert
export function acknowledgeAlert(alertId: string, acknowledgedBy?: string): Alert | null {
  const index = alertsStore.findIndex(a => a.id === alertId);
  if (index === -1) return null;
  
  alertsStore[index] = {
    ...alertsStore[index],
    acknowledged: true,
    acknowledgedBy,
    acknowledgedAt: new Date(),
  };
  return alertsStore[index];
}

// Generate historical data for charts
export function generateHistoricalData(
  providerId: string, 
  period: "1h" | "6h" | "24h" | "7d" | "30d" = "24h"
): ProviderHistory {
  const config = PROVIDERS_CONFIG.find(p => p.id === providerId);
  if (!config) {
    throw new Error(`Provider ${providerId} not found`);
  }

  const now = new Date();
  let points: number;
  let intervalMs: number;

  switch (period) {
    case "1h":
      points = 60;
      intervalMs = 60 * 1000; // 1 minute
      break;
    case "6h":
      points = 72;
      intervalMs = 5 * 60 * 1000; // 5 minutes
      break;
    case "24h":
      points = 96;
      intervalMs = 15 * 60 * 1000; // 15 minutes
      break;
    case "7d":
      points = 168;
      intervalMs = 60 * 60 * 1000; // 1 hour
      break;
    case "30d":
      points = 120;
      intervalMs = 6 * 60 * 60 * 1000; // 6 hours
      break;
  }

  const configs: Record<string, { baseLatency: number; baseErrorRate: number }> = {
    "mpesa": { baseLatency: 420, baseErrorRate: 0.06 },
    "pesalink": { baseLatency: 180, baseErrorRate: 0.02 },
    "card-gateway": { baseLatency: 320, baseErrorRate: 0.05 },
    "bank-transfer": { baseLatency: 1200, baseErrorRate: 0.01 },
    "id-verification": { baseLatency: 850, baseErrorRate: 0.08 },
    "crb-check": { baseLatency: 1100, baseErrorRate: 0.05 },
    "biometrics": { baseLatency: 1500, baseErrorRate: 0.20 },
    "sms-gateway": { baseLatency: 150, baseErrorRate: 0.03 },
    "email-service": { baseLatency: 220, baseErrorRate: 0.01 },
    "whatsapp-api": { baseLatency: 380, baseErrorRate: 0.05 },
  };

  const pc = configs[config.id] || { baseLatency: 500, baseErrorRate: 0.05 };
  const data: HistoricalDataPoint[] = [];
  
  let totalRequests = 0;
  let totalErrors = 0;
  let minLatency = { p50: Infinity, p95: Infinity, p99: Infinity };
  let maxLatency = { p50: 0, p95: 0, p99: 0 };
  let sumLatency = { p50: 0, p95: 0, p99: 0 };

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    const hour = timestamp.getHours();
    const isPeakHour = hour >= 8 && hour <= 11 || hour >= 14 && hour <= 17;
    const peakMultiplier = isPeakHour ? 1.3 + Math.random() * 0.4 : 1;
    
    // Add some random spikes
    const spikeChance = Math.random();
    const spikeMultiplier = spikeChance > 0.98 ? 3 : spikeChance > 0.95 ? 2 : 1;
    
    const p50 = Math.round(pc.baseLatency * peakMultiplier * spikeMultiplier + (Math.random() - 0.5) * pc.baseLatency * 0.3);
    const p95 = Math.round(p50 * (1.8 + Math.random() * 0.4));
    const p99 = Math.round(p95 * (1.5 + Math.random() * 0.5));

    const requestCount = Math.round(100 + Math.random() * 500);
    const errorRate = pc.baseErrorRate * spikeMultiplier + (Math.random() - 0.5) * 0.02;
    const errorCount = Math.max(0, Math.round(requestCount * Math.max(0, errorRate) / 100));

    const point: HistoricalDataPoint = {
      timestamp,
      latency: { p50: Math.max(1, p50), p95: Math.max(1, p95), p99: Math.max(1, p99) },
      successRate: Math.round((100 - errorRate) * 100) / 100,
      errorRate: Math.round(Math.max(0, errorRate) * 100) / 100,
      requestCount,
      errorCount,
    };

    data.push(point);

    // Accumulate stats
    totalRequests += requestCount;
    totalErrors += errorCount;
    
    if (point.latency.p50 < minLatency.p50) minLatency.p50 = point.latency.p50;
    if (point.latency.p95 < minLatency.p95) minLatency.p95 = point.latency.p95;
    if (point.latency.p99 < minLatency.p99) minLatency.p99 = point.latency.p99;
    
    if (point.latency.p50 > maxLatency.p50) maxLatency.p50 = point.latency.p50;
    if (point.latency.p95 > maxLatency.p95) maxLatency.p95 = point.latency.p95;
    if (point.latency.p99 > maxLatency.p99) maxLatency.p99 = point.latency.p99;
    
    sumLatency.p50 += point.latency.p50;
    sumLatency.p95 += point.latency.p95;
    sumLatency.p99 += point.latency.p99;
  }

  const pointCount = data.length || 1;
  const overallUptime = ((totalRequests - totalErrors) / totalRequests) * 100;

  return {
    providerId: config.id,
    period,
    data,
    summary: {
      avgLatency: {
        p50: Math.round(sumLatency.p50 / pointCount),
        p95: Math.round(sumLatency.p95 / pointCount),
        p99: Math.round(sumLatency.p99 / pointCount),
      },
      maxLatency,
      minLatency: {
        p50: minLatency.p50 === Infinity ? 0 : minLatency.p50,
        p95: minLatency.p95 === Infinity ? 0 : minLatency.p95,
        p99: minLatency.p99 === Infinity ? 0 : minLatency.p99,
      },
      totalRequests,
      totalErrors,
      overallUptime: Math.round(overallUptime * 100) / 100,
    },
  };
}

// Get dependency graph data
export function getDependencyGraph(): { nodes: Array<{ id: string; label: string; type: string; status: string }>; edges: Array<{ from: string; to: string }> } {
  const providers = PROVIDERS_CONFIG.map(generateProviderStatus);
  
  const nodes = providers.map(p => ({
    id: p.id,
    label: `${p.icon} ${p.displayName}`,
    type: p.type,
    status: p.status,
  }));

  const edges: Array<{ from: string; to: string }> = [];
  providers.forEach(p => {
    p.dependencies.forEach(dep => {
      edges.push({ from: p.id, to: dep });
    });
  });

  return { nodes, edges };
}
