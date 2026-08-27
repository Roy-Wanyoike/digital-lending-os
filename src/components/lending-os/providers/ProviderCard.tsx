"use client";

import React, { useState } from "react";
import { ProviderStatus, ProviderType, ProviderStatusType } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

interface ProviderCardProps {
  provider: ProviderStatus;
  onClick?: (provider: ProviderStatus) => void;
  isSelected?: boolean;
  compact?: boolean;
}

const statusConfig: Record<ProviderStatusType, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
  pulseClass?: string;
}> = {
  healthy: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "Operational",
  },
  degraded: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: "Degraded",
    pulseClass: "animate-pulse",
  },
  down: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <XCircle className="h-4 w-4-red-500" />,
    label: "Down",
    pulseClass: "animate-pulse",
  },
  unknown: {
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: <HelpCircle className="h-4 w-4 text-gray-500" />,
    label: "Unknown",
  },
};

const typeConfig: Record<ProviderType, { label: string; color: string }> = {
  payment: { label: "Payment", color: "bg-blue-100 text-blue-700" },
  kyc: { label: "KYC", color: "bg-purple-100 text-purple-700" },
  credit: { label: "Credit", color: "bg-orange-100 text-orange-700" },
  communication: { label: "Communication", color: "bg-teal-100 text-teal-700" },
  banking: { label: "Banking", color: "bg-indigo-100 text-indigo-700" },
};

export function ProviderCard({ 
  provider, 
  onClick, 
  isSelected = false,
  compact = false 
}: ProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[provider.status];
  const type = typeConfig[provider.type];

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms >= 2000) return "text-red-600 font-semibold";
    if (ms >= 1000) return "text-amber-600 font-semibold";
    if (ms >= 500) return "text-yellow-600";
    return "text-emerald-600";
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return "text-emerald-600";
    if (uptime >= 99.5) return "text-amber-600";
    return "text-red-600";
  };

  if (compact) {
    return (
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          status.borderColor
        } ${isSelected ? "ring-2 ring-primary" : ""} ${status.pulseClass || ""}`}
        onClick={() => onClick?.(provider)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{provider.icon}</span>
              <div>
                <p className="font-medium text-sm">{provider.displayName}</p>
                <p className="text-xs text-muted-foreground">{type.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-medium ${getUptimeColor(provider.uptime)}`}>
                  {provider.uptime}%
                </p>
                <p className={`text-xs ${getLatencyColor(provider.latency.p95)}`}>
                  {formatLatency(provider.latency.p95)}
                </p>
              </div>
              {status.icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${
        status.bgColor
      } ${status.borderColor} border-l-4 ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${status.pulseClass || ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{provider.icon}</span>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {provider.displayName}
                <Badge variant="secondary" className={type.color}>
                  {type.label}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{provider.endpoint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${status.color} ${status.bgColor}`}>
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Uptime</p>
            <p className={`text-xl font-bold ${getUptimeColor(provider.uptime)}`}>
              {provider.uptime}%
            </p>
            <p className="text-xs text-muted-foreground">SLA: {provider.slaTarget}%</p>
          </div>
          
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">P95 Latency</p>
            <p className={`text-xl font-bold ${getLatencyColor(provider.latency.p95)}`}>
              {formatLatency(provider.latency.p95)}
            </p>
            <p className="text-xs text-muted-foreground">P99: {formatLatency(provider.latency.p99)}</p>
          </div>

          <div className="text-center p-2 bg-white/60 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</p>
            <p className={`text-xl font-bold ${provider.successRate >= 99.9 ? "text-emerald-600" : "text-amber-600"}`}>
              {provider.successRate}%
            </p>
            <p className="text-xs text-muted-foreground">Error: {provider.errorRate}%</p>
          </div>

          <div className="text-center p-2 bg-white/60 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Requests Today</p>
            <p className="text-xl font-bold text-gray-700">
              {provider.requestVolume.total.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {provider.requestVolume.failed} failed
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {(provider.currentIncidents > 0 || provider.maintenanceWindow || provider.lastIncident) && (
          <div className="space-y-2 mb-4">
            {provider.currentIncidents > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>{provider.currentIncidents} active incident(s)</span>
              </div>
            )}
            
            {provider.maintenanceWindow && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <Clock className="h-4 w-4" />
                <span>
                  Maintenance scheduled:{" "}
                  {new Date(provider.maintenanceWindow.start).toLocaleTimeString()} -{" "}
                  {new Date(provider.maintenanceWindow.end).toLocaleTimeString()}
                </span>
              </div>
            )}

            {provider.lastIncident && (
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                <span>Last incident: {provider.lastIncident.description}</span>
                <span className="flex items-center gap-1">
                  {provider.lastIncident.resolved ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  {provider.lastIncident.duration
                    ? `${provider.lastIncident.duration}m`
                    : new Date(provider.lastIncident.time).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expandable Details */}
        {isExpanded && (
          <div className="border-t pt-4 mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium">{provider.region}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Checked</p>
                <p className="font-medium">
                  {new Date(provider.lastChecked).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">P50 Latency</p>
                <p className="font-medium">{formatLatency(provider.latency.p50)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dependencies</p>
                <p className="font-medium">
                  {provider.dependencies.length > 0
                    ? provider.dependencies.join(", ")
                    : "None"}
                </p>
              </div>
            </div>

            {/* Latency Breakdown */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Activity className="h-4 w-4" /> Latency Distribution
              </p>
              <div className="space-y-2">
                {[
                  { label: "P50", value: provider.latency.p50, max: provider.latency.p99 * 1.2 },
                  { label: "P95", value: provider.latency.p95, max: provider.latency.p99 * 1.2 },
                  { label: "P99", value: provider.latency.p99, max: provider.latency.p99 * 1.2 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.value >= 2000
                            ? "bg-red-500"
                            : item.value >= 1000
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-mono">
                      {formatLatency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Less Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> More Details
              </>
            )}
          </Button>
          
          {onClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClick(provider)}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProviderCard;
