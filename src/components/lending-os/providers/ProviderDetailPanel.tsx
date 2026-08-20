"use client";

import React, { useState, useEffect } from "react";
import { ProviderStatus, Incident, HistoricalDataPoint } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  ExternalLink,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Server,
  Globe,
  Settings,
  Phone,
  Mail,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
} from "lucide-react";

// Recharts for charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface ProviderDetailPanelProps {
  provider: ProviderStatus;
  history?: HistoricalDataPoint[];
  incidents?: Incident[];
  onClose: () => void;
}

type TabType = "overview" | "latency" | "errors" | "incidents" | "config";

export function ProviderDetailPanel({
  provider,
  history = [],
  incidents = [],
  onClose,
}: ProviderDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [historyPeriod, setHistoryPeriod] = useState<"6h" | "24h" | "7d">("24h");

  // Status configuration
  const statusConfig = {
    healthy: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      label: "Operational",
    },
    degraded: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      label: "Degraded Performance",
    },
    down: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Service Outage",
    },
    unknown: {
      icon: <HelpCircle className="h-5 w-5 text-gray-500" />,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      label: "Unknown Status",
    },
  };

  const status = statusConfig[provider.status];

  // Format helpers
  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  // Generate error breakdown data for pie chart
  const errorBreakdown = [
    { name: "Timeouts", value: Math.round(Math.random() * 30 + 10), color: "#ef4444" },
    { name: "5xx Errors", value: Math.round(Math.random() * 20 + 5), color: "#f97316" },
    { name: "4xx Errors", value: Math.round(Math.random() * 15 + 3), color: "#eab308" },
    { name: "Connection Errors", value: Math.round(Math.random() * 10 + 2), color: "#8b5cf6" },
    { name: "Other", value: Math.round(Math.random() * 5 + 1), color: "#6b7280" },
  ];

  // Generate latency histogram data
  const latencyHistogram = [
    { range: "0-100", count: Math.round(Math.random() * 100 + 200) },
    { range: "100-250", count: Math.round(Math.random() * 150 + 300) },
    { range: "250-500", count: Math.round(Math.random() * 100 + 200) },
    { range: "500-750", count: Math.round(Math.random() * 80 + 100) },
    { range: "750-1000", count: Math.round(Math.random() * 50 + 60) },
    { range: "1000-1500", count: Math.round(Math.random() * 40 + 30) },
    { range: "1500-2000", count: Math.round(Math.random() * 20 + 10) },
    { range: "2000+", count: Math.round(Math.random() * 10 + 5) },
  ];

  // Chart data for latency over time
  const chartData = history.length > 0 ? history.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    p50: point.latency.p50,
    p95: point.latency.p95,
    p99: point.latency.p99,
    errorRate: point.errorRate,
    requests: point.requestCount,
  })) : Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    p50: provider.latency.p50 * (0.9 + Math.random() * 0.2),
    p95: provider.latency.p95 * (0.85 + Math.random() * 0.3),
    p99: provider.latency.p99 * (0.8 + Math.random() * 0.4),
    errorRate: provider.errorRate * (0.5 + Math.random()),
    requests: Math.round(provider.requestVolume.total / 24 * (0.7 + Math.random() * 0.6)),
  }));

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
    { id: "latency", label: "Latency", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "errors", label: "Errors", icon: <XCircle className="h-4 w-4" /> },
    { id: "incidents", label: "Incidents", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "config", label: "Config", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 border-b ${status.bgColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{provider.icon}</span>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold">{provider.displayName}</h2>
                  <Badge variant="outline" className={`${status.color} ${status.bgColor} ${status.borderColor}`}>
                    {status.icon}
                    <span className="ml-1">{status.label}</span>
                  </Badge>
                </div>
                <p className="text-muted-foreground">{provider.endpoint}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">Uptime</p>
              <p className={`text-xl font-bold ${provider.uptime >= 99.9 ? "text-emerald-600" : provider.uptime >= 99.5 ? "text-amber-600" : "text-red-600"}`}>
                {provider.uptime}%
              </p>
              <p className="text-xs text-muted-foreground">Target: {provider.slaTarget}%</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">P95 Latency</p>
              <p className={`text-xl font-bold ${provider.latency.p95 >= 1000 ? "text-red-600" : provider.latency.p95 >= 500 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatLatency(provider.latency.p95)}
              </p>
              <p className="text-xs text-muted-foreground">P99: {formatLatency(provider.latency.p99)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">Success Rate</p>
              <p className={`text-xl font-bold ${provider.successRate >= 99.9 ? "text-emerald-600" : "text-amber-600"}`}>
                {provider.successRate}%
              </p>
              <p className="text-xs text-muted-foreground">{provider.errorRate}% errors</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">Today's Volume</p>
              <p className="text-xl font-bold text-gray-700">
                {provider.requestVolume.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{provider.requestVolume.failed} failed</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">Active Incidents</p>
              <p className={`text-xl font-bold ${provider.currentIncidents > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {provider.currentIncidents}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Updated just now
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary bg-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Latency Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Response Time Trend (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={3} />
                      <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${v}ms`} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [formatLatency(value), "Latency"]}
                        contentStyle={{ borderRadius: "8px" }}
                      />
                      <Area type="monotone" dataKey="p95" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} name="P95" />
                      <Area type="monotone" dataKey="p99" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="P99" opacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Dependency Chain & Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Provider Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Region
                      </span>
                      <span className="font-medium">{provider.region}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Server className="h-4 w-4" /> Type
                      </span>
                      <Badge variant="secondary">{provider.type.toUpperCase()}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Dependencies
                      </span>
                      <span className="font-medium">
                        {provider.dependencies.length > 0 
                          ? provider.dependencies.join(", ") 
                          : "None"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Last Checked
                      </span>
                      <span className="font-medium">
                        {new Date(provider.lastChecked).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Error Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center">
                      <RechartsPieChart width={220} height={180}>
                        <Pie
                          data={errorBreakdown}
                          cx={110}
                          cy={90}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {errorBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {errorBreakdown.slice(0, 4).map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                          <span className="ml-auto font-medium">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "latency" && (
            <div className="space-y-6">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Time Range:</span>
                {(["6h", "24h", "7d"] as const).map((period) => (
                  <Button
                    key={period}
                    variant={historyPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHistoryPeriod(period)}
                  >
                    {period === "6h" ? "Last 6 Hours" : period === "24h" ? "Last 24 Hours" : "Last 7 Days"}
                  </Button>
                ))}
              </div>

              {/* Detailed Latency Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Latency Percentiles Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={2} />
                      <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${v}ms`} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number) => [formatLatency(value)]}
                        contentStyle={{ borderRadius: "8px" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} name="P50 (Median)" />
                      <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} dot={false} name="P95" />
                      <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="P99" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Latency Histogram */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Response Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={latencyHistogram} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="range" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(value: number) => [`${value} requests`, "Count"]} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "errors" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Error Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={3} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Error Rate"]} />
                      <Area type="monotone" dataKey="errorRate" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Error Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {errorBreakdown.map((item) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <span className="font-medium">{item.value}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.value}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Common Error Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { code: "HTTP 503", desc: "Service Unavailable", count: 234 },
                        { code: "HTTP 504", desc: "Gateway Timeout", count: 156 },
                        { code: "HTTP 429", desc: "Too Many Requests", count: 89 },
                        { code: "CONN_ERR", desc: "Connection Failed", count: 67 },
                        { code: "TIMEOUT", desc: "Request Timeout", count: 45 },
                      ].map((err) => (
                        <div key={err.code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <code className="text-sm font-mono font-medium text-red-600">{err.code}</code>
                            <p className="text-xs text-muted-foreground">{err.desc}</p>
                          </div>
                          <Badge variant="outline">{err.count} times</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No incidents for this provider</p>
                    <p className="text-sm">This provider has been stable! 🎉</p>
                  </CardContent>
                </Card>
              ) : (
                incidents.map((incident) => (
                  <Card key={incident.id} className={
                    incident.status === "active" ? "border-red-200 bg-red-50/30" :
                    incident.status === "acknowledged" ? "border-amber-200 bg-amber-50/30" :
                    ""
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              incident.severity === "critical" ? "destructive" :
                              incident.severity === "warning" ? "secondary" : "outline"
                            }>
                              {incident.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={
                              incident.status === "resolved" ? "border-emerald-300 text-emerald-700" :
                              incident.status === "acknowledged" ? "border-amber-300 text-amber-700" :
                              "border-red-300 text-red-700"
                            }>
                              {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="font-medium mb-1">{incident.description}</p>
                          <p className="text-sm text-muted-foreground mb-2">{incident.impact}</p>
                          
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>Started: {new Date(incident.startTime).toLocaleString()}</span>
                            {incident.duration && <span>Duration: {incident.duration}m</span>}
                            {incident.rootCause && <span>Root Cause: {incident.rootCause}</span>}
                          </div>

                          {incident.affectedServices.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {incident.affectedServices.map((service) => (
                                <Badge key={service} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {incident.resolvedBy && (
                          <div className="text-right text-sm text-muted-foreground ml-4">
                            <p>Resolved by:</p>
                            <p className="font-medium">{incident.resolvedBy}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuration Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <p className="text-sm text-muted-foreground">Endpoint URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 truncate">
                          {provider.endpoint}
                        </code>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <p className="text-sm text-muted-foreground">Provider ID</p>
                      <code className="text-sm bg-white px-2 py-1 rounded border block">
                        {provider.id}
                      </code>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">SLA Target</p>
                      <p className="text-2xl font-bold text-primary">{provider.slaTarget}%</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current Uptime</p>
                      <p className={`text-2xl font-bold ${provider.uptime >= provider.slaTarget ? "text-emerald-600" : "text-red-600"}`}>
                        {provider.uptime}%
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Dependencies</p>
                    {provider.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {provider.dependencies.map((dep) => (
                          <Badge key={dep} variant="outline" className="px-3 py-1">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No dependencies</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Support & Escalation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Primary Contact</p>
                      <p className="font-medium">support@{provider.id.replace("-", "")}.co.ke</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Escalation Hotline</p>
                      <p className="font-medium">+254 700 XXX XXX</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Runbook
                    </Button>
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Close Panel
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            Auto-refreshing every 30s
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderDetailPanel;
