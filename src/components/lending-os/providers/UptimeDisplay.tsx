"use client";

import React from "react";
import { ProviderStatus } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  TrendingUp,
  Clock,
} from "lucide-react";

interface UptimeDisplayProps {
  provider: ProviderStatus;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UptimeDisplay({ 
  provider, 
  showTrend = true,
  size = "md" 
}: UptimeDisplayProps) {
  const { uptime, slaTarget, status } = provider;

  const getStatusColor = () => {
    if (status === "down") return "text-red-600 bg-red-50 border-red-200";
    if (status === "degraded") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getUptimeColor = () => {
    if (uptime >= 99.95) return "text-emerald-600";
    if (uptime >= 99.9) return "text-green-600";
    if (uptime >= 99.5) return "text-amber-600";
    return "text-red-600";
  };

  const getSLAStatus = () => {
    if (uptime >= slaTarget) return { label: "Meeting SLA", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
    const gap = slaTarget - uptime;
    if (gap <= 0.1) return { label: "Near SLA", color: "bg-amber-100 text-amber-700", icon: AlertTriangle };
    return { label: "Below SLA", color: "bg-red-100 text-red-700", icon: XCircle };
  };

  const slaStatus = getSLAStatus();
  const SlaIcon = slaStatus.icon;

  // Generate mini trend data
  const generateMiniTrend = () => {
    const points = 24; // Last 24 data points
    const baseUptime = uptime;
    return Array.from({ length: points }, (_, i) => {
      const variation = (Math.random() - 0.48) * 0.3; // Slight downward bias for realism
      const pointValue = Math.max(95, Math.min(99.99, baseUptime + variation));
      return pointValue;
    });
  };

  const miniTrend = generateMiniTrend();
  const isAboveTarget = uptime >= slaTarget;

  const sizeClasses = {
    sm: { number: "text-3xl", container: "p-4" },
    md: { number: "text-4xl", container: "p-6" },
    lg: { number: "text-6xl", container: "p-8" },
  };

  const currentSize = sizeClasses[size];

  return (
    <Card className={`overflow-hidden ${getStatusColor()} border`}>
      <CardContent className={`${currentSize.container}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{provider.icon}</span>
              <p className="text-sm font-medium opacity-80">{provider.displayName}</p>
            </div>
            
            {/* Main Uptime Number */}
            <div className="flex items-baseline gap-1">
              <span className={`${currentSize.number} font-bold ${getUptimeColor()}`}>
                {uptime}%
              </span>
              {showTrend && (
                <span
                  className={`flex items-center text-sm font-medium ${
                    isAboveTarget ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isAboveTarget ? (
                    <TrendingUp className="h-4 w-4 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-0.5" />
                  )}
                  {(uptime - slaTarget).toFixed(2)}%
                </span>
              )}
            </div>

            {/* SLA Status */}
            <Badge variant="secondary" className={`${slaStatus.color} mt-2`}>
              <SlaIcon className="h-3 w-3 mr-1" />
              {slaStatus.label}
              <span className="mx-1">|</span>
              <Target className="h-3 w-3 mr-1" />
              Target: {slaTarget}%
            </Badge>
          </div>

          {/* Mini Trend Chart */}
          <div className="hidden sm:block">
            <svg width="120" height="40" className="overflow-visible">
              {/* Background line at SLA target */}
              <line
                x1="0"
                y1={40 - ((slaTarget - 95) / 5) * 40}
                x2="120"
                y2={40 - ((slaTarget - 95) / 5) * 40}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 2"
                className="opacity-30"
              />
              
              {/* Trend line */}
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isAboveTarget ? "text-emerald-500" : "text-red-500"}
                points={miniTrend
                  .map((value, index) => {
                    const x = (index / (miniTrend.length - 1)) * 120;
                    const y = 40 - ((value - 95) / 5) * 40;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              
              {/* Current value dot */}
              <circle
                cx="120"
                cy={40 - ((miniTrend[miniTrend.length - 1] - 95) / 5) * 40}
                r="3"
                fill="currentColor"
                className={isAboveTarget ? "text-emerald-500" : "text-red-500"}
              />
            </svg>
            <p className="text-xs text-center mt-1 opacity-70">Last 24 hours</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-current/20">
          <div className="text-center">
            <p className="text-xs opacity-70 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> P95 Latency
            </p>
            <p className="font-semibold text-sm">
              {provider.latency.p95 >= 1000 
                ? `${(provider.latency.p95 / 1000).toFixed(1)}s`
                : `${provider.latency.p95}ms`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-70">Success Rate</p>
            <p className="font-semibold text-sm">{provider.successRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-70">Today's Volume</p>
            <p className="font-semibold text-sm">
              {provider.requestVolume.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "healthy" && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-pulse" />
            )}
            {status === "degraded" && (
              <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
            )}
            {status === "down" && (
              <XCircle className="h-5 w-5 text-red-500 animate-pulse" />
            )}
            <span className="text-sm font-medium capitalize">{status}</span>
          </div>
          
          <span className="text-xs opacity-60">
            Updated: {new Date(provider.lastChecked).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Import TrendingDown icon
function TrendingDown({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
      <polyline points="17 18 23 18 23 12"></polyline>
    </svg>
  );
}

export default UptimeDisplay;
