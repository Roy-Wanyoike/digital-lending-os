"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  Shield,
  ArrowRightLeft,
  DollarSign,
  AlertCircle,
  Users,
  Timer,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// Types
interface CRBBureauStatus {
  id: string;
  name: string;
  fullName: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  responseTime: number; // ms
  checksPerformedToday: number;
  costPerCheck: number; // KES
  queueDepth: number;
  uptimeToday: number; // percentage
  successRate: number; // percentage
  lastError?: string;
  lastChecked: Date;
}

interface CRBCheckRecord {
  id: string;
  customerName: string;
  customerIdNumber: string; // masked
  bureauChecked: "Metropol" | "TransUnion" | "CreditInfo";
  scoreReturned: number;
  scoreGrade: string;
  timeTaken: number; // ms
  cost: number; // KES
  timestamp: Date;
  status: "success" | "failed" | "timeout" | "partial";
}

interface BureauComparison {
  bureau: string;
  avgResponseTime: number;
  avgCost: number;
  reliability: number;
  dataCompleteness: number;
  checksThisMonth: number;
}

interface FailureHandling {
  autoRetryCount: number;
  maxRetries: number;
  fallbackBureauUsed: number;
  fallbackSuccessRate: number;
  commonFailureReasons: { reason: string; count: number }[];
}

interface MonthlySpendTracker {
  month: string;
  budget: number; // KES
  spent: number; // KES
  checks: number;
}

interface CRBIntegrationMonitorProps {
  className?: string;
}

// Mock Data Generators
const generateBureauStatus = (): CRBBureauStatus[] => [
  {
    id: "metropol",
    name: "Metropol",
    fullName: "Metropol Corporation",
    status: "operational",
    responseTime: 450,
    checksPerformedToday: 342,
    costPerCheck: 150,
    queueDepth: 0,
    uptimeToday: 99.8,
    successRate: 98.5,
    lastChecked: new Date(),
  },
  {
    id: "transunion",
    name: "TransUnion",
    fullName: "TransUnion Kenya",
    status: "operational",
    responseTime: 680,
    checksPerformedToday: 256,
    costPerCheck: 180,
    queueDepth: 2,
    uptimeToday: 99.5,
    successRate: 97.2,
    lastChecked: new Date(),
  },
  {
    id: "creditinfo",
    name: "CreditInfo",
    fullName: "CreditInfo Kenya",
    status: "degraded",
    responseTime: 1250,
    checksPerformedToday: 189,
    costPerCheck: 120,
    queueDepth: 8,
    uptimeToday: 97.2,
    successRate: 94.1,
    lastError: "Elevated latency detected",
    lastChecked: new Date(),
  },
];

const generateCheckHistory = (): CRBCheckRecord[] => [
  {
    id: "CRB001",
    customerName: "John Kamau",
    customerIdNumber: "123456***78",
    bureauChecked: "Metropol",
    scoreReturned: 623,
    scoreGrade: "B",
    timeTaken: 425,
    cost: 150,
    timestamp: new Date(Date.now() - 300000),
    status: "success",
  },
  {
    id: "CRB002",
    customerName: "Grace Wanjiku",
    customerIdNumber: "234567***89",
    bureauChecked: "TransUnion",
    scoreReturned: 512,
    scoreGrade: "C",
    timeTaken: 650,
    cost: 180,
    timestamp: new Date(Date.now() - 600000),
    status: "success",
  },
  {
    id: "CRB003",
    customerName: "Peter Ochieng",
    customerIdNumber: "345678***90",
    bureauChecked: "CreditInfo",
    scoreReturned: null as unknown as number,
    scoreGrade: "-",
    timeTaken: 3200,
    cost: 120,
    timestamp: new Date(Date.now() - 900000),
    status: "timeout",
  },
  {
    id: "CRB004",
    customerName: "Faith Auma",
    customerIdNumber: "456789***01",
    bureauChecked: "Metropol",
    scoreReturned: 712,
    scoreGrade: "A",
    timeTaken: 380,
    cost: 150,
    timestamp: new Date(Date.now() - 1200000),
    status: "success",
  },
  {
    id: "CRB005",
    customerName: "Samuel Kiprop",
    customerIdNumber: "567890***12",
    bureauChecked: "TransUnion",
    scoreReturned: 489,
    scoreGrade: "C",
    timeTaken: 720,
    cost: 180,
    timestamp: new Date(Date.now() - 1500000),
    status: "success",
  },
  {
    id: "CRB006",
    customerName: "Lucy Muthoni",
    customerIdNumber: "678901***23",
    bureauChecked: "CreditInfo",
    scoreReturned: 556,
    scoreGrade: "B",
    timeTaken: 1450,
    cost: 120,
    timestamp: new Date(Date.now() - 1800000),
    status: "success",
  },
  {
    id: "CRB007",
    customerName: "David Maina",
    customerIdNumber: "789012***34",
    bureauChecked: "Metropol",
    scoreReturned: 398,
    scoreGrade: "D",
    timeTaken: 410,
    cost: 150,
    timestamp: new Date(Date.now() - 2100000),
    status: "success",
  },
  {
    id: "CRB008",
    customerName: "Sarah Akinyi",
    customerIdNumber: "890123***45",
    bureauChecked: "TransUnion",
    scoreReturned: null as unknown as number,
    scoreGrade: "-",
    timeTaken: 0,
    cost: 0,
    timestamp: new Date(Date.now() - 2400000),
    status: "failed",
  },
];

const generateBureauComparison = (): BureauComparison[] => [
  {
    bureau: "Metropol",
    avgResponseTime: 450,
    avgCost: 150,
    reliability: 98.5,
    dataCompleteness: 95,
    checksThisMonth: 8934,
  },
  {
    bureau: "TransUnion",
    avgResponseTime: 680,
    avgCost: 180,
    reliability: 97.2,
    dataCompleteness: 92,
    checksThisMonth: 6521,
  },
  {
    bureau: "CreditInfo",
    avgResponseTime: 920,
    avgCost: 120,
    reliability: 94.1,
    dataCompleteness: 88,
    checksThisMonth: 4892,
  },
];

const generateFailureHandling = (): FailureHandling => ({
  autoRetryCount: 47,
  maxRetries: 3,
  fallbackBureauUsed: 12,
  fallbackSuccessRate: 91.7,
  commonFailureReasons: [
    { reason: "Connection Timeout", count: 18 },
    { reason: "Service Unavailable", count: 14 },
    { reason: "Invalid Credentials", count: 8 },
    { reason: "Rate Limit Exceeded", count: 5 },
    { reason: "Data Parse Error", count: 2 },
  ],
});

const generateMonthlySpend = (): MonthlySpendTracker[] => [
  { month: "Jul", budget: 450000, spent: 382000, checks: 2845 },
  { month: "Aug", budget: 480000, spent: 425000, checks: 3167 },
  { month: "Sep", budget: 500000, spent: 498000, checks: 3710 },
  { month: "Oct", budget: 520000, spent: 487500, checks: 3629 },
  { month: "Nov", budget: 550000, spent: 512000, checks: 3812 },
  { month: "Dec", budget: 600000, spent: 534500, checks: 3982 },
];

// Radar chart data for bureau comparison
const radarData = [
  { metric: "Speed", Metropol: 95, TransUnion: 75, CreditInfo: 50 },
  { metric: "Cost", Metropol: 70, TransUnion: 55, CreditInfo: 85 },
  { metric: "Reliability", Metropol: 98, TransUnion: 95, CreditInfo: 85 },
  { metric: "Data Quality", Metropol: 92, TransUnion: 88, CreditInfo: 75 },
  { metric: "Coverage", Metropol: 85, TransUnion: 90, CreditInfo: 70 },
];

export function CRBIntegrationMonitor({ className }: CRBIntegrationMonitorProps) {
  const [selectedBureau, setSelectedBureau] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "overview" | "history" | "comparison"
  >("overview");

  const bureauStatuses = useMemo(() => generateBureauStatus(), []);
  const checkHistory = useMemo(() => generateCheckHistory(), []);
  const bureauComparison = useMemo(() => generateBureauComparison(), []);
  const failureHandling = useMemo(() => generateFailureHandling(), []);
  const monthlySpend = useMemo(() => generateMonthlySpend(), []);

  const filteredHistory = useMemo(() => {
    if (selectedBureau === "all") return checkHistory;
    return checkHistory.filter(
      (record) =>
        record.bureauChecked.toLowerCase() === selectedBureau.toLowerCase()
    );
  }, [checkHistory, selectedBureau]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: CRBBureauStatus["status"]) => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Operational
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Degraded
          </Badge>
        );
      case "outage":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-1 mr-1" />
            Outage
          </Badge>
        );
      case "maintenance":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            Maintenance
          </Badge>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (!score || isNaN(score)) return "text-gray-400";
    if (score >= 700) return "text-emerald-600";
    if (score >= 550) return "text-amber-600";
    return "text-red-600";
  };

  const getCheckStatusBadge = (status: CRBCheckRecord["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-red-300 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            <Timer className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
    }
  };

  const totalChecksToday = bureauStatuses.reduce(
    (sum, b) => sum + b.checksPerformedToday,
    0
  );
  const totalSpendToday = bureauStatuses.reduce(
    (sum, b) => sum + b.checksPerformedToday * b.costPerCheck,
    0
  );

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Database className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">CRB Integration Monitor</CardTitle>
                <CardDescription>
                  Real-time monitoring of credit bureau integrations
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  bureauStatuses.some((b) => b.status !== "operational")
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }
              >
                {bureauStatuses.filter((b) => b.status === "operational").length}
                /{bureauStatuses.length} Operational
              </Badge>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bureau Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {bureauStatuses.map((bureau) => (
          <Card
            key={bureau.id}
            className={`${
              bureau.status === "degraded"
                ? "border-amber-200 bg-amber-50/30"
                : bureau.status === "outage"
                ? "border-red-200 bg-red-50/30"
                : ""
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{bureau.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {bureau.fullName}
                  </p>
                </div>
                {getStatusBadge(bureau.status)}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Response Time</p>
                  <p
                    className={`text-lg font-bold ${
                      bureau.responseTime > 1000
                        ? "text-red-600"
                        : bureau.responseTime > 700
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {bureau.responseTime}ms
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Checks Today</p>
                  <p className="text-lg font-bold">
                    {bureau.checksPerformedToday.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Cost/Check</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(bureau.costPerCheck)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">Queue Depth</p>
                  <p
                    className={`text-lg font-bold ${
                      bureau.queueDepth > 5 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {bureau.queueDepth}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uptime Today</span>
                  <span className="font-medium flex items-center gap-1">
                    {bureau.uptimeToday}%
                    {bureau.uptimeToday >= 99.5 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span
                    className={`font-medium ${
                      bureau.successRate >= 98
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {bureau.successRate}%
                  </span>
                </div>
                {bureau.lastError && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{bureau.lastError}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Checks Today</p>
              <p className="text-xl font-bold">{totalChecksToday.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spend Today</p>
              <p className="text-xl font-bold">{formatCurrency(totalSpendToday)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-xl font-bold">
                {Math.round(
                  bureauStatuses.reduce((sum, b) => sum + b.responseTime, 0) /
                    bureauStatuses.length
                )}
                ms
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto-Retries Today</p>
              <p className="text-xl font-bold">{failureHandling.autoRetryCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 border-b pb-3">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "overview"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "history"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Check History
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "comparison"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4 inline mr-2" />
              Comparison
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Spend Tracker */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monthly CRB Spend vs Budget
                </h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySpend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "budget" ? "Budget" : "Spent",
                        ]}
                      />
                      <Bar
                        dataKey="budget"
                        fill="#e5e7eb"
                        radius={[4, 4, 0, 0]}
                        name="budget"
                      />
                      <Bar
                        dataKey="spent"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        name="spent"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Failure Handling */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Failure Handling & Retries
                </h4>
                <div className="space-y-4">
                  {/* Retry Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Auto-Retries</p>
                      <p className="text-2xl font-bold">
                        {failureHandling.autoRetryCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max: {failureHandling.maxRetries} per request
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Fallback Used</p>
                      <p className="text-2xl font-bold">
                        {failureHandling.fallbackBureauUsed}
                      </p>
                      <p className="text-xs text-emerald-600">
                        {failureHandling.fallbackSuccessRate}% success rate
                      </p>
                    </div>
                  </div>

                  {/* Common Failures */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Common Failure Reasons
                    </p>
                    <div className="space-y-2">
                      {failureHandling.commonFailureReasons.map(
                        (reason, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-36 truncate">
                              {reason.reason}
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full"
                                style={{
                                  width: `${
                                    (reason.count /
                                      failureHandling.commonFailureReasons[0]
                                        .count) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">
                              {reason.count}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Filter by Bureau:</span>
                <Select value={selectedBureau} onValueChange={setSelectedBureau}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Bureaus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bureaus</SelectItem>
                    <SelectItem value="metropol">Metropol</SelectItem>
                    <SelectItem value="transunion">TransUnion</SelectItem>
                    <SelectItem value="creditinfo">CreditInfo</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-auto">
                  Showing {filteredHistory.length} records
                </span>
              </div>

              {/* History Table */}
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.customerName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.customerIdNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.bureauChecked}</Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${getScoreColor(
                              record.scoreReturned
                            )}`}
                          >
                            {record.scoreReturned || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              record.scoreGrade === "A"
                                ? "text-emerald-600"
                                : record.scoreGrade === "B"
                                ? "text-blue-600"
                                : record.scoreGrade === "C"
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {record.scoreGrade}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.timeTaken}ms
                        </TableCell>
                        <TableCell>
                          {record.cost > 0 ? formatCurrency(record.cost) : "-"}
                        </TableCell>
                        <TableCell>{getCheckStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeTab === "comparison" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Bureau Performance Comparison
                </h4>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 11 }}
                      />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      <Radar
                        name="Metropol"
                        dataKey="Metropol"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="TransUnion"
                        dataKey="TransUnion"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="CreditInfo"
                        dataKey="CreditInfo"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.2}
                      />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparison Table */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Detailed Metrics Comparison
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bureau</TableHead>
                        <TableHead className="text-right">Avg Response</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                        <TableHead className="text-right">Reliability</TableHead>
                        <TableHead className="text-right">Data Quality</TableHead>
                        <TableHead className="text-right">Monthly Checks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bureauComparison.map((bureau) => (
                        <TableRow key={bureau.bureau}>
                          <TableCell className="font-medium">
                            {bureau.bureau}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={
                                bureau.avgResponseTime > 800
                                  ? "text-red-600"
                                  : bureau.avgResponseTime > 500
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }
                            >
                              {bureau.avgResponseTime}ms
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(bureau.avgCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                bureau.reliability >= 98
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }
                            >
                              {bureau.reliability}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {bureau.dataCompleteness}%
                          </TableCell>
                          <TableCell className="text-right">
                            {bureau.checksThisMonth.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CRBIntegrationMonitor;
