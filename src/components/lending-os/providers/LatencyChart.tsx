"use client";

import React, { useState, useMemo } from "react";
import { HistoricalDataPoint, LatencyMetrics } from "@/lib/provider-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  Clock,
  TrendingUp,
  ZoomIn,
  Download,
  RefreshCw,
} from "lucide-react";

// Custom tooltip component (defined outside to avoid re-creation on each render)
function CustomLatencyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) {
  const formatLatency = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
    return `${value}ms`;
  };

  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatLatency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

interface LatencyChartProps {
  data: HistoricalDataPoint[];
  title?: string;
  showThresholds?: boolean;
  thresholds?: { p50: number; p95: number; p99: number };
  height?: number;
}

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";
type MetricType = "p50" | "p95" | "p99";

interface ChartDataPoint {
  time: string;
  timestamp: Date;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  requestCount: number;
}

export function LatencyChart({
  data,
  title = "Response Time Trends",
  showThresholds = true,
  thresholds = { p50: 500, p95: 1000, p99: 2000 },
  height = 350,
}: LatencyChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(["p95", "p99"]);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // Transform data for chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }),
      timestamp: point.timestamp,
      p50: point.latency.p50,
      p95: point.latency.p95,
      p99: point.latency.p99,
      errorRate: point.errorRate,
      requestCount: point.requestCount,
    }));
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const avgP50 = chartData.reduce((sum, d) => sum + d.p50, 0) / chartData.length;
    const avgP95 = chartData.reduce((sum, d) => sum + d.p95, 0) / chartData.length;
    const avgP99 = chartData.reduce((sum, d) => sum + d.p99, 0) / chartData.length;
    const maxP99 = Math.max(...chartData.map(d => d.p99));
    
    return { avgP50, avgP95, avgP99, maxP99 };
  }, [chartData]);

  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const formatLatency = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
    return `${value}ms`;
  };

  const metricColors: Record<MetricType, string> = {
    p50: "#10b981", // emerald
    p95: "#f59e0b", // amber
    p99: "#ef4444", // red
  };

  const metricLabels: Record<MetricType, string> = {
    p50: "P50 (Median)",
    p95: "P95",
    p99: "P99 (Tail)",
  };

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "1h", label: "1H" },
    { value: "6h", label: "6H" },
    { value: "24h", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
  ];

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> {title}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Toggles */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(Object.keys(metricLabels) as MetricType[]).map((metric) => (
                <Button
                  key={metric}
                  variant={selectedMetrics.includes(metric) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleMetric(metric)}
                  className={`text-xs px-2 py-1 ${
                    selectedMetrics.includes(metric)
                      ? ""
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: metricColors[metric] }}
                  />
                  {metric.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeRange(range.value)}
                  className="text-xs px-2 py-1"
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Actions */}
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-xs text-emerald-600 font-medium">Avg P50</p>
              <p className="text-lg font-bold text-emerald-700">
                {formatLatency(stats.avgP50)}
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-amber-600 font-medium">Avg P95</p>
              <p className="text-lg font-bold text-amber-700">
                {formatLatency(stats.avgP95)}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-red-600 font-medium">Avg P99</p>
              <p className="text-lg font-bold text-red-700">
                {formatLatency(stats.avgP99)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">Peak P99</p>
              <p className="text-lg font-bold text-gray-700">
                {formatLatency(stats.maxP99)}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => formatLatency(value)}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomLatencyTooltip />} />
            <Legend />

            {/* Threshold Lines */}
            {showThresholds && (
              <>
                <ReferenceLine
                  y={thresholds.p99}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "P99 Alert",
                    position: "right",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />
                <ReferenceLine
                  y={thresholds.p95}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: "P95 Warning",
                    position: "right",
                    fontSize: 10,
                    fill: "#f59e0b",
                  }}
                />
              </>
            )}

            {/* Data Lines */}
            {selectedMetrics.includes("p50") && (
              <Line
                type="monotone"
                dataKey="p50"
                name="P50 (Median)"
                stroke={metricColors.p50}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {selectedMetrics.includes("p95") && (
              <Line
                type="monotone"
                dataKey="p95"
                name="P95"
                stroke={metricColors.p95}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {selectedMetrics.includes("p99") && (
              <Line
                type="monotone"
                dataKey="p99"
                name="P99 (Tail)"
                stroke={metricColors.p99}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Error Rate Overlay Info */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Showing {data.length} data points
          </span>
          <span className="flex items-center gap-4">
            <span>Avg Error Rate: {stats ? ((data.reduce((acc, d) => acc + d.errorRate, 0) / data.length).toFixed(2)) : 'N/A'}%</span>
            <Badge variant="outline" className="text-xs">
              Live Data
            </Badge>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default LatencyChart;
