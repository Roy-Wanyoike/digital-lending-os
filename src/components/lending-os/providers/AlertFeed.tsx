"use client";

import React, { useState, useEffect } from "react";
import { Alert as AlertType } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Filter,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";

interface AlertFeedProps {
  alerts: AlertType[];
  onAcknowledge?: (alertId: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type SeverityFilter = "all" | "critical" | "warning" | "info";

export function AlertFeed({
  alerts,
  onAcknowledge,
  autoRefresh = true,
  refreshInterval = 30000,
}: AlertFeedProps) {
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Play sound for critical alerts
  useEffect(() => {
    if (!soundEnabled) return;

    const criticalAlerts = alerts.filter(
      (a) => a.severity === "critical" && !a.acknowledged
    );
    
    if (criticalAlerts.length > 0) {
      // In a real app, you'd play an actual sound here
      console.log("🔔 Critical alert sound would play");
    }
  }, [alerts, soundEnabled]);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter !== "all" && alert.severity !== filter) return false;
    if (!showAcknowledged && alert.acknowledged) return false;
    return true;
  });

  const severityConfig: Record<
    AlertType["severity"],
    {
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      borderColor: string;
      label: string;
    }
  > = {
    critical: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-l-red-500",
      label: "Critical",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-l-amber-500",
      label: "Warning",
    },
    info: {
      icon: <Info className="h-4 w-4" />,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
      label: "Info",
    },
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const activeCount = alerts.filter((a) => !a.acknowledged && !a.resolved).length;
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && !a.acknowledged && !a.resolved
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active Alerts
            {activeCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeCount}
              </Badge>
            )}
            {criticalCount > 0 && (
              <span className="relative flex h-3 w-3 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filters */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["all", "critical", "warning", "info"] as SeverityFilter[]).map(
                (severity) => (
                  <Button
                    key={severity}
                    variant={filter === severity ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(severity)}
                    className="text-xs px-2 py-1 capitalize"
                  >
                    {severity === "all"
                      ? "All"
                      : `${severityConfig[severity].icon} ${severity}`}
                  </Button>
                )
              )}
            </div>

            {/* Show Acknowledged Toggle */}
            <Button
              variant={showAcknowledged ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              className="text-xs"
            >
              {showAcknowledged ? (
                <>
                  <CheckCheck className="h-3 w-3 mr-1" /> Show All
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" /> Active Only
                </>
              )}
            </Button>

            {/* Sound Toggle */}
            <Button
              variant={soundEnabled ? "default" : "ghost"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastRefresh(new Date())}
              className="text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin-slow" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <p className="text-xs text-muted-foreground mt-2">
          Last updated: {lastRefresh.toLocaleTimeString()}
          {autoRefresh && ` • Auto-refresh every ${refreshInterval / 1000}s`}
        </p>
      </CardHeader>

      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BellOff className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No alerts to display</p>
            <p className="text-sm">All systems are operating normally ✅</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              
              return (
                <div
                  key={alert.id}
                  className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-r-lg p-4 transition-all hover:shadow-md ${
                    alert.acknowledged ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`${config.color} mt-0.5`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`${config.color} ${config.bgColor} text-xs`}
                          >
                            {config.label}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {alert.provider}
                          </span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(alert.createdAt)}
                          </span>
                          {alert.acknowledged && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" />
                              Acknowledged by {alert.acknowledgedBy || "unknown"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!alert.acknowledged && onAcknowledge && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAcknowledge(alert.id)}
                        className="shrink-0 text-xs"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AlertFeed;
