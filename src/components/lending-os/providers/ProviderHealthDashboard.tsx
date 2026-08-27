"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ProviderStatus,
  HealthCheckResult,
  Alert,
  Incident,
  HistoricalDataPoint,
} from "@/lib/provider-health";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Import sub-components
import { ProviderCard } from "./ProviderCard";
import { UptimeDisplay } from "./UptimeDisplay";
import { LatencyChart } from "./LatencyChart";
import { AlertFeed } from "./AlertFeed";
import { IncidentTimeline } from "./IncidentTimeline";
import { DependencyGraph } from "./DependencyGraph";
import { ProviderDetailPanel } from "./ProviderDetailPanel";

// Icons
import {
  Activity,
  HeartPulse,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Globe,
  Zap,
  Shield,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List,
  Maximize2,
} from "lucide-react";

type ViewMode = "grid" | "list";
type ProviderType = "all" | "payment" | "kyc" | "credit" | "communication" | "banking";

interface ProviderHealthDashboardProps {
  tenantId?: string;
}

export function ProviderHealthDashboard({ tenantId }: ProviderHealthDashboardProps) {
  // State
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [typeFilter, setTypeFilter] = useState<ProviderType>("all");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Detail panel state
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailProvider, setDetailProvider] = useState<ProviderStatus | null>(null);
  const [providerHistory, setProviderHistory] = useState<HistoricalDataPoint[]>([]);
  const [providerIncidents, setProviderIncidents] = useState<Incident[]>([]);

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers${tenantId ? `?tenantId=${tenantId}` : ""}`);
      const result = await response.json();
      
      if (result.success) {
        setHealthData(result.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  // Fetch provider details when detail panel opens
  useEffect(() => {
    if (detailProvider) {
      fetch(`/api/providers/${detailProvider.id}?history=true&incidents=true`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setProviderHistory(result.history?.data || []);
            setProviderIncidents(result.incidents || []);
          }
        })
        .catch(console.error);
    }
  }, [detailProvider]);

  // Handle provider selection for detail view
  const handleProviderClick = (provider: ProviderStatus) => {
    setDetailProvider(provider);
    setShowDetailPanel(true);
  };

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch("/api/providers/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId,
          action: "acknowledge",
          acknowledgedBy: "dashboard-user",
        }),
      });
      
      // Refresh data
      fetchHealthData();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  // Handle incident actions
  const handleAcknowledgeIncident = async (incidentId: string) => {
    try {
      await fetch("/api/providers/incidents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          action: "acknowledge",
          acknowledgedBy: "dashboard-user",
        }),
      });
      
      fetchHealthData();
    } catch (error) {
      console.error("Error acknowledging incident:", error);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await fetch("/api/providers/incidents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          action: "resolve",
          resolvedBy: "dashboard-user",
        }),
      });
      
      fetchHealthData();
    } catch (error) {
      console.error("Error resolving incident:", error);
    }
  };

  // Get filtered providers by type
  const getFilteredProviders = () => {
    if (!healthData || typeFilter === "all") return healthData.providers;
    return healthData.providers.filter((p) => p.type === typeFilter);
  };

  // Group providers by type
  const getProvidersByType = () => {
    if (!healthData) return {};
    
    return {
      payment: healthData.providers.filter((p) => p.type === "payment"),
      kyc: healthData.providers.filter((p) => p.type === "kyc"),
      credit: healthData.providers.filter((p) => p.type === "credit"),
      communication: healthData.providers.filter((p) => p.type === "communication"),
      banking: healthData.providers.filter((p) => p.type === "banking"),
    };
  };

  // Overall status configuration
  const getOverallStatusConfig = () => {
    if (!healthData) return null;
    
    switch (healthData.overallHealth) {
      case "healthy":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
          label: "All Systems Operational",
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
        };
      case "degraded":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />,
          label: "Some Systems Degraded",
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "critical":
        return {
          icon: <XCircle className="h-6 w-6 text-red-500 animate-pulse" />,
          label: "System Outage Detected",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
    }
  };

  // Loading state
  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg font-medium">Loading provider health data...</p>
          <p className="text-sm text-muted-foreground">Checking all integrations</p>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatusConfig();
  const providersByType = getProvidersByType();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Provider Health Monitoring</h1>
                <p className="text-xs text-muted-foreground">
                  Digital Lending OS • External Integration Status
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Overall Status */}
              {overallStatus && (
                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border ${overallStatus.bgColor} ${overallStatus.borderColor}`}>
                  {overallStatus.icon}
                  <span className={`font-medium text-sm ${overallStatus.color}`}>
                    {overallStatus.label}
                  </span>
                </div>
              )}

              {/* Last Updated */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHealthData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        {healthData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{healthData.summary.totalProviders}</p>
                  <p className="text-xs text-muted-foreground">Total Providers</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{healthData.summary.healthyCount}</p>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{healthData.summary.degradedCount}</p>
                  <p className="text-xs text-muted-foreground">Degraded</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{healthData.summary.downCount}</p>
                  <p className="text-xs text-muted-foreground">Down</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{healthData.summary.activeAlerts}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <Activity className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="providers" className="flex items-center gap-1">
                <Server className="h-4 w-4" /> Providers
              </TabsTrigger>
              <TabsTrigger value="incidents" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Incidents
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1">
                <Zap className="h-4 w-4" /> Analytics
              </TabsTrigger>
            </TabsList>

            {/* View Mode Toggle - Only on Providers tab */}
            {activeTab === "providers" && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                
                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ProviderType)}
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="kyc">KYC</option>
                  <option value="credit">Credit</option>
                  <option value="communication">Communication</option>
                  <option value="banking">Banking</option>
                </select>
              </div>
            )}
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Status Grid */}
            {healthData && (
              <>
                {/* Payment Providers */}
                {providersByType.payment.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">💳</span>
                      Payment Providers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {providersByType.payment.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          compact
                          onClick={handleProviderClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Verification/KYC Providers */}
                {(providersByType.kyc.length > 0 || providersByType.credit.length > 0) && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">🆔</span>
                      Verification & Credit Services
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...providersByType.kyc, ...providersByType.credit].map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          compact
                          onClick={handleProviderClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Communication Providers */}
                {providersByType.communication.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">📡</span>
                      Communication Services
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {providersByType.communication.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          compact
                          onClick={handleProviderClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Banking Providers */}
                {providersByType.banking.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">🏦</span>
                      Banking Services
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {providersByType.banking.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          compact
                          onClick={handleProviderClick}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Active Incidents Summary & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Active Incidents ({healthData.summary.activeIncidents})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {healthData.summary.activeIncidents === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No active incidents</p>
                          <p className="text-sm">All systems operational ✅</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {healthData.alerts
                            .filter((a) => !a.resolved)
                            .slice(0, 5)
                            .map((alert) => (
                              <div
                                key={alert.id}
                                className={`p-3 rounded-lg border-l-4 ${
                                  alert.severity === "critical"
                                    ? "bg-red-50 border-red-400"
                                    : alert.severity === "warning"
                                    ? "bg-amber-50 border-amber-400"
                                    : "bg-blue-50 border-blue-400"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        alert.severity === "critical"
                                          ? "bg-red-100 text-red-700"
                                          : alert.severity === "warning"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-blue-100 text-blue-700"
                                      }
                                    >
                                      {alert.severity.toUpperCase()}
                                    </Badge>
                                    <p className="mt-1 text-sm font-medium">
                                      {alert.message}
                                    </p>
                                  </div>
                                  {!alert.acknowledged && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAcknowledgeAlert(alert.id)}
                                    >
                                      Ack
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <AlertFeed
                    alerts={healthData.alerts}
                    onAcknowledge={handleAcknowledgeAlert}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            {healthData && (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {getFilteredProviders().map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        onClick={handleProviderClick}
                        isSelected={selectedProvider?.id === provider.id}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium text-sm">Provider</th>
                              <th className="text-left p-4 font-medium text-sm">Type</th>
                              <th className="text-left p-4 font-medium text-sm">Status</th>
                              <th className="text-right p-4 font-medium text-sm">Uptime</th>
                              <th className="text-right p-4 font-medium text-sm">P95 Latency</th>
                              <th className="text-right p-4 font-medium text-sm">Success Rate</th>
                              <th className="text-right p-4 font-medium text-sm">Requests</th>
                              <th className="text-center p-4 font-medium text-sm">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredProviders().map((provider) => (
                              <tr
                                key={provider.id}
                                className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleProviderClick(provider)}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{provider.icon}</span>
                                    <div>
                                      <p className="font-medium">{provider.displayName}</p>
                                      <p className="text-xs text-muted-foreground">{provider.region}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="secondary" className="capitalize">
                                    {provider.type}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <Badge
                                    variant="outline"
                                    className={
                                      provider.status === "healthy"
                                        ? "border-emerald-300 text-emerald-700"
                                        : provider.status === "degraded"
                                        ? "border-amber-300 text-amber-700"
                                        : "border-red-300 text-red-700"
                                    }
                                  >
                                    {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                                  </Badge>
                                </td>
                                <td className="p-4 text-right">
                                  <span
                                    className={
                                      provider.uptime >= 99.9
                                        ? "text-emerald-600 font-medium"
                                        : provider.uptime >= 99.5
                                        ? "text-amber-600 font-medium"
                                        : "text-red-600 font-medium"
                                    }
                                  >
                                    {provider.uptime}%
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span
                                    className={
                                      provider.latency.p95 >= 1000
                                        ? "text-red-600 font-medium"
                                        : provider.latency.p95 >= 500
                                        ? "text-amber-600 font-medium"
                                        : "text-emerald-600 font-medium"
                                    }
                                  >
                                    {provider.latency.p95 >= 1000
                                      ? `${(provider.latency.p95 / 1000).toFixed(1)}s`
                                      : `${provider.latency.p95}ms`}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span
                                    className={
                                      provider.successRate >= 99.9
                                        ? "text-emerald-600 font-medium"
                                        : "text-amber-600 font-medium"
                                    }
                                  >
                                    {provider.successRate}%
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="font-mono text-sm">
                                    {provider.requestVolume.total.toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <Button variant="ghost" size="sm">
                                    <ArrowUpRight className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Dependency Graph */}
                <DependencyGraph
                  providers={healthData.providers}
                  selectedProvider={selectedProvider?.id || null}
                  onProviderSelect={(id) => {
                    const provider = healthData.providers.find((p) => p.id === id);
                    if (provider) handleProviderClick(provider);
                  }}
                />
              </>
            )}
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <IncidentTimeline
              incidents={[]}
              onAcknowledge={handleAcknowledgeIncident}
              onResolve={handleResolveIncident}
            />
            {/* We'll need to fetch incidents separately or pass them through props */}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {healthData && (
              <>
                {/* Uptime Displays for Critical Providers */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {healthData.providers
                    .filter((p) => p.status !== "healthy")
                    .slice(0, 6)
                    .map((provider) => (
                      <UptimeDisplay
                        key={provider.id}
                        provider={provider}
                        showTrend
                        size="md"
                      />
                    ))}
                </div>

                {/* Sample Latency Chart */}
                <LatencyChart
                  data={Array.from({ length: 48 }, (_, i) => ({
                    timestamp: new Date(Date.now() - (47 - i) * 30 * 60 * 1000),
                    latency: {
                      p50: 200 + Math.random() * 300,
                      p95: 350 + Math.random() * 400,
                      p99: 500 + Math.random() * 800,
                    },
                    successRate: 99 + Math.random(),
                    errorRate: Math.random() * 1,
                    requestCount: Math.round(100 + Math.random() * 500),
                    errorCount: Math.round(Math.random() * 10),
                  }))}
                  title="M-Pesa Response Time Trends (24h)"
                />

                {/* Additional Analytics Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        SLA Compliance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {healthData.providers.map((provider) => {
                          const compliant = provider.uptime >= provider.slaTarget;
                          return (
                            <div
                              key={provider.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <span>{provider.icon}</span>
                                <span className="font-medium text-sm">
                                  {provider.displayName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      compliant ? "bg-emerald-500" : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (provider.uptime / 100) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-sm font-medium w-14 text-right ${
                                    compliant ? "text-emerald-600" : "text-red-600"
                                  }`}
                                >
                                  {provider.uptime}%
                                </span>
                                {compliant ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Regional Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { region: "Kenya - Nairobi", avgLatency: 420, uptime: 99.94 },
                          { region: "EU - Ireland", avgLatency: 850, uptime: 99.80 },
                          { region: "Global - US-East", avgLatency: 220, uptime: 99.99 },
                          { region: "Global - Failover", avgLatency: 320, uptime: 99.95 },
                        ].map((region) => (
                          <div
                            key={region.region}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-sm">{region.region}</p>
                              <p className="text-xs text-muted-foreground">
                                Avg Latency:{" "}
                                {region.avgLatency >= 1000
                                  ? `${(region.avgLatency / 1000).toFixed(1)}s`
                                  : `${region.avgLatency}ms`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">
                                {region.uptime}%
                              </p>
                              <p className="text-xs text-muted-foreground">Uptime</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Panel Modal */}
      {showDetailPanel && detailProvider && (
        <ProviderDetailPanel
          provider={detailProvider}
          history={providerHistory}
          incidents={providerIncidents}
          onClose={() => {
            setShowDetailPanel(false);
            setDetailProvider(null);
          }}
        />
      )}
    </div>
  );
}

export default ProviderHealthDashboard;
