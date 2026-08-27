"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  User,
  Wrench,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CalendarIcon,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Extended Types for Enhanced Incident Timeline
interface EnhancedIncident {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  description: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: "investigating" | "identified" | "monitoring" | "resolved";
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

interface MTTRData {
  period: string;
  mttr: number; // minutes
  incidentCount: number;
}

interface IncidentSummaryStats {
  totalThisMonth: number;
  avgResolutionTime: number; // minutes
  p1Count: number;
  p2Count: number;
  mttrTrend: "improving" | "stable" | "degrading";
  mttrChangePercent: number;
}

interface IncidentTimelineProps {
  incidents?: EnhancedIncident[];
  onAcknowledge?: (incidentId: string) => void;
  onResolve?: (incidentId: string) => void;
}

type StatusFilter = "all" | "investigating" | "identified" | "monitoring" | "resolved";
type SeverityFilter = "all" | "P1" | "P2" | "P3" | "P4";
type ProviderFilter = "all" | string;

// Mock Data Generator
const generateMockIncidents = (): EnhancedIncident[] => [
  {
    id: "INC001",
    providerId: "mpesa",
    providerName: "M-Pesa / Daraja",
    type: "api_timeout",
    description: "Elevated API response times on STK Push endpoint",
    severity: "P2",
    status: "investigating",
    startTime: new Date(Date.now() - 1800000),
    impact: "Delayed loan disbursements",
    affectedServices: ["STK Push", "Loan Disbursement"],
  },
  {
    id: "INC002",
    providerId: "crb",
    providerName: "CRB - CreditInfo",
    type: "connection_error",
    description: "Intermittent connection failures to CreditInfo bureau",
    severity: "P1",
    status: "identified",
    startTime: new Date(Date.now() - 3600000),
    acknowledgedBy: "oncall@company.com",
    acknowledgedAt: new Date(Date.now() - 3000000),
    impact: "Credit checks failing, applications delayed",
    affectedServices: ["Credit Check", "Application Processing"],
  },
  {
    id: "INC003",
    providerId: "sms",
    providerName: "SMS Gateway",
    type: "rate_limit",
    description: "Approaching daily rate limit threshold",
    severity: "P3",
    status: "monitoring",
    startTime: new Date(Date.now() - 7200000),
    endTime: new Date(Date.now() - 600000),
    duration: 110,
    resolvedBy: "ops@company.com",
    resolvedAt: new Date(Date.now() - 600000),
    rootCause: "Marketing campaign spike exceeded expected volume",
    impact: "Some SMS delivery delays",
    affectedServices: ["SMS Notifications"],
  },
  {
    id: "INC004",
    providerId: "kyc",
    providerName: "KYC - Smile Identity",
    type: "service_degradation",
    description: "Increased liveness check processing time",
    severity: "P2",
    status: "resolved",
    startTime: new Date(Date.now() - 14400000),
    endTime: new Date(Date.now() - 7200000),
    duration: 120,
    resolvedBy: "dev@company.com",
    resolvedAt: new Date(Date.now() - 7200000),
    rootCause: "Infrastructure upgrade caused temporary slowdown",
    impact: "Slower KYC verification",
    affectedServices: ["KYC Verification"],
  },
  {
    id: "INC005",
    providerId: "email",
    providerName: "Email Service",
    type: "delivery_failure",
    description: "High bounce rate on transactional emails",
    severity: "P3",
    status: "resolved",
    startTime: new Date(Date.now() - 28800000),
    endTime: new Date(Date.now() - 21600000),
    duration: 120,
    resolvedBy: "support@company.com",
    resolvedAt: new Date(Date.now() - 21600000),
    rootCause: "Invalid email domain in template configuration",
    impact: "Some customers not receiving emails",
    affectedServices: ["Email Notifications"],
  },
  {
    id: "INC006",
    providerId: "bank_transfer",
    providerName: "Bank Transfer",
    type: "webhook_timeout",
    description: "Pesalink webhook callbacks timing out",
    severity: "P2",
    status: "investigating",
    startTime: new Date(Date.now() - 900000),
    impact: "Delayed payment confirmations",
    affectedServices: ["Bank Transfers", "Payment Confirmation"],
  },
  {
    id: "INC007",
    providerId: "mpesa",
    providerName: "M-Pesa / Daraja",
    type: "balance_query_error",
    description: "Account balance query returning errors",
    severity: "P4",
    status: "resolved",
    startTime: new Date(Date.now() - 86400000),
    endTime: new Date(Date.now() - 82800000),
    duration: 60,
    resolvedBy: "admin@company.com",
    resolvedAt: new Date(Date.now() - 82800000),
    rootCause: "Temporary Safaricom API issue",
    impact: "Balance display unavailable briefly",
    affectedServices: ["Account Balance"],
  },
  {
    id: "INC008",
    providerId: "crb",
    providerName: "CRB - Metropol",
    type: "data_inconsistency",
    description: "Credit score discrepancy detected in batch processing",
    severity: "P1",
    status: "resolved",
    startTime: new Date(Date.now() - 172800000),
    endTime: new Date(Date.now() - 129600000),
    duration: 720,
    resolvedBy: "engineering@company.com",
    resolvedAt: new Date(Date.now() - 129600000),
    rootCause: "Cache synchronization issue between regions",
    impact: "Some incorrect scores displayed",
    affectedServices: ["Credit Scoring", "CRB Integration"],
  },
];

const generateMTTRData = (): MTTRData[] => [
  { period: "Week 1", mttr: 145, incidentCount: 12 },
  { period: "Week 2", mttr: 128, incidentCount: 8 },
  { period: "Week 3", mttr: 95, incidentCount: 15 },
  { period: "Week 4", mttr: 72, incidentCount: 6 },
];

const generateSummaryStats = (): IncidentSummaryStats => ({
  totalThisMonth: 41,
  avgResolutionTime: 98,
  p1Count: 3,
  p2Count: 12,
  mttrTrend: "improving",
  mttrChangePercent: -18.5,
});

export function IncidentTimeline({
  incidents: propIncidents,
  onAcknowledge,
  onResolve,
}: IncidentTimelineProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [showCalendar, setShowCalendar] = useState(false);

  // Use provided incidents or generate mock data
  const incidents = useMemo(
    () => propIncidents || generateMockIncidents(),
    [propIncidents]
  );
  
  const mttrData = useMemo(() => generateMTTRData(), []);
  const summaryStats = useMemo(() => generateSummaryStats(), []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (statusFilter !== "all" && incident.status !== statusFilter)
        return false;
      if (severityFilter !== "all" && incident.severity !== severityFilter)
        return false;
      if (
        providerFilter !== "all" &&
        incident.providerId !== providerFilter
      )
        return false;
      if (dateRange.from && new Date(incident.startTime) < dateRange.from)
        return false;
      if (dateRange.to && new Date(incident.startTime) > dateRange.to)
        return false;
      return true;
    });
  }, [incidents, statusFilter, severityFilter, providerFilter, dateRange]);

  // Get unique providers for filter
  const providers = useMemo(() => {
    const providerSet = new Set(incidents.map((i) => i.providerId));
    return Array.from(providerSet);
  }, [incidents]);

  const severityConfig: Record<
    EnhancedIncident["severity"],
    {
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      borderColor: string;
      label: string;
    }
  > = {
    P1: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-300",
      label: "Critical",
    },
    P2: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-300",
      label: "High",
    },
    P3: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-300",
      label: "Medium",
    },
    P4: {
      icon: <Info className="h-4 w-4" />,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      label: "Low",
    },
  };

  const statusConfig: Record<
    EnhancedIncident["status"],
    { label: string; color: string; icon: React.ReactNode }
  > = {
    investigating: {
      label: "Investigating",
      color: "bg-red-100 text-red-700",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    identified: {
      label: "Identified",
      color: "bg-orange-100 text-orange-700",
      icon: <Wrench className="h-3 w-3" />,
    },
    monitoring: {
      label: "Monitoring",
      color: "bg-amber-100 text-amber-700",
      icon: <Clock className="h-3 w-3" />,
    },
    resolved: {
      label: "Resolved",
      color: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
  };

  const formatDuration = (startTime: Date, endTime?: Date): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();

    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate MTTR from resolved incidents
  const calculatedMTTR = useMemo(() => {
    const resolved = incidents.filter(
      (i) => i.status === "resolved" && i.duration
    );
    if (resolved.length === 0) return null;
    const total = resolved.reduce((sum, i) => sum + (i.duration || 0), 0);
    return Math.round(total / resolved.length);
  }, [incidents]);

  // Group incidents by date for timeline view
  const groupedByDate = useMemo(() => {
    return filteredIncidents.reduce(
      (groups, incident) => {
        const date = new Date(incident.startTime).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        if (!groups[date]) groups[date] = [];
        groups[date].push(incident);
        return groups;
      },
      {} as Record<string, EnhancedIncident[]>
    );
  }, [filteredIncidents]);

  const activeCount = incidents.filter(
    (i) => i.status === "investigating" || i.status === "identified"
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

  // Export handler
  const handleExport = () => {
    const exportData = filteredIncidents.map((incident) => ({
      ID: incident.id,
      Provider: incident.providerName,
      Type: incident.type,
      Description: incident.description,
      Severity: incident.severity,
      Status: incident.status,
      "Start Time": formatTime(incident.startTime),
      "End Time": incident.endTime ? formatTime(incident.endTime) : "",
      Duration: formatDuration(
        incident.startTime,
        incident.endTime
      ),
      "Root Cause": incident.rootCause || "",
      Impact: incident.impact,
      "Affected Services": incident.affectedServices.join(", "),
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");

    // Download file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total This Month</p>
            <p className="text-2xl font-bold">{summaryStats.totalThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Resolution</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{summaryStats.avgResolutionTime}m</p>
              {summaryStats.mttrTrend === "improving" ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : summaryStats.mttrTrend === "degrading" ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
            </div>
            <p
              className={`text-xs ${
                summaryStats.mttrChangePercent < 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {summaryStats.mttrChangePercent > 0 ? "+" : ""}
              {summaryStats.mttrChangePercent}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">P1 Incidents</p>
            <p className="text-2xl font-bold text-red-600">{summaryStats.p1Count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">P2 Incidents</p>
            <p className="text-2xl font-bold text-orange-600">{summaryStats.p2Count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Current MTTR</p>
            <p className="text-2xl font-bold">
              {calculatedMTTR ? `${calculatedMTTR}m` : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Timeline Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Clock className="h-5 w-5" />
              Incident Timeline
              <div className="flex items-center gap-2 ml-2">
                {activeCount > 0 && (
                  <Badge variant="destructive">{activeCount} active</Badge>
                )}
                <Badge variant="outline">{resolvedCount} resolved</Badge>
              </div>
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Export Button */}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              {/* Date Range Filter */}
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.from
                      ? `${dateRange.from.toLocaleDateString()}${dateRange.to ? ` - ${dateRange.to.toLocaleDateString()}` : ""}`
                      : "Date Range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                      setShowCalendar(false);
                    }}
                    numberOfMonths={2}
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="flex items-center justify-between p-3 border-t">
                      <span className="text-sm text-muted-foreground">
                        {filteredIncidents.length} results
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* Status Filters */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filters */}
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="P1">P1 - Critical</SelectItem>
                <SelectItem value="P2">P2 - High</SelectItem>
                <SelectItem value="P3">P3 - Medium</SelectItem>
                <SelectItem value="P4">P4 - Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.replace("_", " ").replace(/\b\w/g, (l) =>
                      l.toUpperCase()
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filters display */}
            {(statusFilter !== "all" ||
              severityFilter !== "all" ||
              providerFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setProviderFilter("all");
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              Showing {filteredIncidents.length} of {incidents.length}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {/* MTTR Trend Chart */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              MTTR Trend (Mean Time to Resolution)
            </h4>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mttrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="m" />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value: number) => [`${value} min`, "MTTR"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="mttr"
                    name="MTTR"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No incidents found</p>
              <p className="text-sm">
                {statusFilter !== "all" ||
                severityFilter !== "all" ||
                providerFilter !== "all"
                  ? "Try adjusting your filters"
                  : "All systems have been stable! 🎉"}
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(groupedByDate).map(([date, dayIncidents]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background pt-2 pb-1 z-10">
                    <div className="w-32 text-sm font-medium text-muted-foreground">
                      {date}
                    </div>
                    <div className="flex-1 h-px bg-gray-200" />
                    <Badge variant="outline" className="text-xs">
                      {dayIncidents.length} incident{dayIncidents.length > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Incidents for this day */}
                  <div className="ml-8 space-y-4 relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 -ml-[1px]" />

                    {dayIncidents.map((incident) => {
                      const severity = severityConfig[incident.severity];
                      const status = statusConfig[incident.status];
                      const isExpanded =
                        expandedIncident === incident.id;

                      return (
                        <div
                          key={incident.id}
                          className={`relative pl-10 pb-4 ${severity.bgColor} rounded-lg border ${severity.borderColor}`}
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-2 top-4 w-4 h-4 rounded-full border-2 ${
                              incident.status === "investigating"
                                ? "bg-red-500 border-red-200 animate-pulse"
                                : incident.status === "identified"
                                ? "bg-orange-500 border-orange-200 animate-pulse"
                                : incident.status === "monitoring"
                                ? "bg-amber-500 border-amber-200"
                                : "bg-emerald-500 border-emerald-200"
                            }`}
                          />

                          {/* Incident Content */}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className={`${severity.color}`}>
                                    {severity.icon}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={`${status.color}`}
                                  >
                                    {status.icon}
                                    {status.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`${severity.color} ${severity.bgColor}`}
                                  >
                                    {incident.severity} - {severity.label}
                                  </Badge>
                                  <span className="font-medium text-sm">
                                    {incident.providerName}
                                  </span>
                                </div>

                                <p className="font-medium mb-1">
                                  {incident.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Started: {formatTime(incident.startTime)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    Duration:{" "}
                                    {formatDuration(
                                      incident.startTime,
                                      incident.endTime
                                    )}
                                  </span>
                                  {(incident.acknowledgedBy ||
                                    incident.resolvedBy) && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {incident.resolvedBy ||
                                        incident.acknowledgedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedIncident(
                                      isExpanded ? null : incident.id
                                    )
                                  }
                                  className="text-muted-foreground"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-3 animate-in slide-in-from-top-2 duration-200">
                                {/* Impact */}
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Impact
                                  </p>
                                  <p className="text-sm">{incident.impact}</p>
                                </div>

                                {/* Affected Services */}
                                {incident.affectedServices.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Affected Services
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {incident.affectedServices.map(
                                        (service) => (
                                          <Badge
                                            key={service}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {service}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Root Cause */}
                                {incident.rootCause && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                      Root Cause
                                    </p>
                                    <p className="text-sm bg-white/50 p-2 rounded">
                                      {incident.rootCause}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                  {(incident.status === "investigating" ||
                                    incident.status === "identified") &&
                                    onAcknowledge && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          onAcknowledge(incident.id)
                                        }
                                      >
                                        <User className="h-4 w-4 mr-1" />{" "}
                                        Acknowledge
                                      </Button>
                                    )}
                                  {(incident.status === "investigating" ||
                                    incident.status === "identified" ||
                                    incident.status === "monitoring") &&
                                    onResolve && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                          onResolve(incident.id)
                                        }
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />{" "}
                                        Resolve
                                      </Button>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IncidentTimeline;
