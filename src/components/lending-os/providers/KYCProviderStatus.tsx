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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
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
  UserCheck,
  UserX,
  Fingerprint,
  Camera,
  MapPin,
  Search,
  AlertOctagon,
  Timer,
  Target,
  CreditCard,
  FileCheck,
  Eye,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// Types
type VerificationType = "id_verification" | "selfie_liveness" | "address_verification" | "aml_screening";

interface VerificationTypeMetrics {
  type: VerificationType;
  displayName: string;
  provider: string;
  successRate: number; // percentage
  avgProcessingTime: number; // seconds
  costPerVerification: number; // KES
  totalToday: number;
  icon: React.ReactNode;
}

interface TodaysVerifications {
  total: number;
  passed: number;
  failed: number;
  pendingReview: number;
}

interface FraudAttempt {
  id: string;
  type: string;
  detectedAt: Date;
  customerName: string;
  riskScore: number;
  status: "blocked" | "flagged" | "under_review";
}

interface FraudSummary {
  totalBlockedToday: number;
  commonFraudTypes: { type: string; count: number; percentage: number }[];
  avgRiskScore: number;
}

interface SLACompliance {
  targetTime: number; // seconds for each verification type
  actualAvgTime: number;
  complianceRate: number; // percentage
  isCompliant: boolean;
}

interface ProviderConnection {
  name: string;
  status: "connected" | "degraded" | "disconnected";
  latency: number; // ms
  uptime: number; // percentage
  lastCheck: Date;
}

interface KYCProviderStatusProps {
  className?: string;
}

// Mock Data Generators
const generateVerificationTypeMetrics = (): VerificationTypeMetrics[] => [
  {
    type: "id_verification",
    displayName: "ID Verification",
    provider: "Smile Identity",
    successRate: 96.8,
    avgProcessingTime: 3.2,
    costPerVerification: 25,
    totalToday: 456,
    icon: <CreditCard className="h-5 w-5 text-blue-500" />,
  },
  {
    type: "selfie_liveness",
    displayName: "Selfie Liveness",
    provider: "Smile Identity",
    successRate: 94.2,
    avgProcessingTime: 4.8,
    costPerVerification: 35,
    totalToday: 389,
    icon: <Camera className="h-5 w-5 text-purple-500" />,
  },
  {
    type: "address_verification",
    displayName: "Address Verification",
    provider: "Onfido",
    successRate: 92.5,
    avgProcessingTime: 12.5,
    costPerVerification: 50,
    totalToday: 124,
    icon: <MapPin className="h-5 w-5 text-green-500" />,
  },
  {
    type: "aml_screening",
    displayName: "AML Screening",
    provider: "ComplyAdvantage",
    successRate: 99.1,
    avgProcessingTime: 1.8,
    costPerVerification: 15,
    totalToday: 892,
    icon: <Search className="h-5 w-5 text-red-500" />,
  },
];

const generateTodaysVerifications = (): TodaysVerifications => ({
  total: 1861,
  passed: 1723,
  failed: 98,
  pendingReview: 40,
});

const generateFraudAttempts = (): FraudAttempt[] => [
  {
    id: "FRD001",
    type: "Synthetic Identity",
    detectedAt: new Date(Date.now() - 1800000),
    customerName: "John M. Kamau",
    riskScore: 95,
    status: "blocked",
  },
  {
    id: "FRD002",
    type: "Stolen ID Document",
    detectedAt: new Date(Date.now() - 3600000),
    customerName: "Grace W. Ochieng",
    riskScore: 88,
    status: "blocked",
  },
  {
    id: "FRD003",
    type: "Photo Spoofing Attempt",
    detectedAt: new Date(Date.now() - 5400000),
    customerName: "Peter K. Maina",
    riskScore: 76,
    status: "flagged",
  },
  {
    id: "FRD004",
    type: "Identity Theft",
    detectedAt: new Date(Date.now() - 7200000),
    customerName: "Lucy A. Wanjiku",
    riskScore: 92,
    status: "blocked",
  },
  {
    id: "FRD005",
    type: "Multiple Account Fraud",
    detectedAt: new Date(Date.now() - 9000000),
    customerName: "Samuel T. Kiprop",
    riskScore: 82,
    status: "under_review",
  },
  {
    id: "FRD006",
    type: "Document Manipulation",
    detectedAt: new Date(Date.now() - 10800000),
    customerName: "Sarah N. Akinyi",
    riskScore: 85,
    status: "blocked",
  },
];

const generateFraudSummary = (): FraudSummary => ({
  totalBlockedToday: 24,
  commonFraudTypes: [
    { type: "Stolen ID Document", count: 8, percentage: 33.3 },
    { type: "Synthetic Identity", count: 6, percentage: 25.0 },
    { type: "Photo Spoofing", count: 5, percentage: 20.8 },
    { type: "Multiple Accounts", count: 3, percentage: 12.5 },
    { type: "Document Manipulation", count: 2, percentage: 8.3 },
  ],
  avgRiskScore: 86.4,
});

const generateSLACompliance = (): SLACompliance[] => [
  {
    targetTime: 5,
    actualAvgTime: 3.2,
    complianceRate: 98.5,
    isCompliant: true,
    type: "ID Verification",
  },
  {
    targetTime: 8,
    actualAvgTime: 4.8,
    complianceRate: 97.2,
    isCompliant: true,
    type: "Selfie Liveness",
  },
  {
    targetTime: 15,
    actualAvgTime: 12.5,
    complianceRate: 94.1,
    isCompliant: true,
    type: "Address Verification",
  },
  {
    targetTime: 3,
    actualAvgTime: 1.8,
    complianceRate: 99.7,
    isCompliant: true,
    type: "AML Screening",
  },
];

const generateProviderConnections = (): ProviderConnection[] => [
  {
    name: "Smile Identity",
    status: "connected",
    latency: 245,
    uptime: 99.9,
    lastCheck: new Date(),
  },
  {
    name: "Onfido",
    status: "connected",
    latency: 380,
    uptime: 99.7,
    lastCheck: new Date(),
  },
  {
    name: "ComplyAdvantage",
    status: "connected",
    latency: 125,
    uptime: 99.95,
    lastCheck: new Date(),
  },
];

// Hourly verification data for chart
const hourlyVerificationData = [
  { hour: "00:00", verifications: 12, frauds: 1 },
  { hour: "01:00", verifications: 8, frauds: 0 },
  { hour: "02:00", verifications: 5, frauds: 0 },
  { hour: "03:00", verifications: 3, frauds: 0 },
  { hour: "04:00", verifications: 7, frauds: 0 },
  { hour: "05:00", verifications: 15, frauds: 1 },
  { hour: "06:00", verifications: 45, frauds: 0 },
  { hour: "07:00", verifications: 98, frauds: 2 },
  { hour: "08:00", verifications: 165, frauds: 3 },
  { hour: "09:00", verifications: 198, frauds: 4 },
  { hour: "10:00", verifications: 185, frauds: 2 },
  { hour: "11:00", verifications: 172, frauds: 3 },
  { hour: "12:00", verifications: 145, frauds: 2 },
  { hour: "13:00", verifications: 128, frauds: 1 },
  { hour: "14:00", verifications: 155, frauds: 3 },
  { hour: "15:00", verifications: 168, frauds: 2 },
  { hour: "16:00", verifications: 152, frauds: 1 },
  { hour: "17:00", verifications: 135, frauds: 0 },
  { hour: "18:00", verifications: 98, frauds: 0 },
  { hour: "19:00", verifications: 72, frauds: 0 },
  { hour: "20:00", verifications: 58, frauds: 1 },
  { hour: "21:00", verifications: 42, frauds: 0 },
  { hour: "22:00", verifications: 28, frauds: 0 },
  { hour: "23:00", verifications: 18, frauds: 0 },
];

export function KYCProviderStatus({ className }: KYCProviderStatusProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "verifications" | "fraud"
  >("overview");

  const verificationMetrics = useMemo(() => generateVerificationTypeMetrics(), []);
  const todaysVerifications = useMemo(() => generateTodaysVerifications(), []);
  const fraudAttempts = useMemo(() => generateFraudAttempts(), []);
  const fraudSummary = useMemo(() => generateFraudSummary(), []);
  const slaCompliance = useMemo(() => generateSLACompliance(), []);
  const providerConnections = useMemo(() => generateProviderConnections(), []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 98) return "text-emerald-600";
    if (rate >= 95) return "text-blue-600";
    if (rate >= 90) return "text-amber-600";
    return "text-red-600";
  };

  const getFraudStatusBadge = (status: FraudAttempt["status"]) => {
    switch (status) {
      case "blocked":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        );
      case "flagged":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Eye className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 90) return "text-red-600 font-bold";
    if (score >= 70) return "text-amber-600 font-semibold";
    return "text-emerald-600";
  };

  const overallSLACompliance =
    slaCompliance.reduce((sum, s) => sum + s.complianceRate, 0) /
    slaCompliance.length;

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">KYC Provider Status</CardTitle>
                <CardDescription>
                  Identity verification and fraud prevention monitoring
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">All Systems Secure</span>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Total Verifications
              </span>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{todaysVerifications.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              +18% vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Passed
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {todaysVerifications.passed.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {((todaysVerifications.passed / todaysVerifications.total) * 100).toFixed(1)}% pass rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Failed / Review
              </span>
              <UserX className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {todaysVerifications.failed + todaysVerifications.pendingReview}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {todaysVerifications.failed} failed • {todaysVerifications.pendingReview} review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Fraud Blocked
              </span>
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {fraudSummary.totalBlockedToday}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg risk score: {fraudSummary.avgRiskScore}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Details */}
        <div className="lg:col-span-2 space-y-6">
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
                  onClick={() => setActiveTab("verifications")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "verifications"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Fingerprint className="h-4 w-4 inline mr-2" />
                  Verification Types
                </button>
                <button
                  onClick={() => setActiveTab("fraud")}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === "fraud"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertOctagon className="h-4 w-4 inline mr-2" />
                  Fraud Detection
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Verification Volume Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Today's Verification Volume & Fraud Attempts
                    </h4>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyVerificationData}>
                          <defs>
                            <linearGradient
                              id="colorVerifications"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#8b5cf6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="verifications"
                            name="Verifications"
                            stroke="#8b5cf6"
                            fillOpacity={1}
                            fill="url(#colorVerifications)"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="frauds"
                            name="Fraud Attempts"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Verification Type Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {verificationMetrics.map((metric) => (
                      <Card key={metric.type} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {metric.icon}
                              <div>
                                <h5 className="font-medium">{metric.displayName}</h5>
                                <p className="text-xs text-muted-foreground">
                                  via {metric.provider}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                metric.successRate >= 96
                                  ? "border-emerald-300 text-emerald-700"
                                  : "border-amber-300 text-amber-700"
                              }
                            >
                              {metric.successRate}% success
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-muted-foreground">Avg Time</p>
                              <p className="font-bold">{metric.avgProcessingTime}s</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-muted-foreground">Cost</p>
                              <p className="font-bold">{formatCurrency(metric.costPerVerification)}</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-muted-foreground">Today</p>
                              <p className="font-bold">{metric.totalToday}</p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Success Rate</span>
                              <span className={`font-medium ${getSuccessRateColor(metric.successRate)}`}>
                                {metric.successRate}%
                              </span>
                            </div>
                            <Progress value={metric.successRate} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "verifications" && (
                <div className="space-y-6">
                  {/* Detailed Metrics Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Verification Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead className="text-right">Success Rate</TableHead>
                          <TableHead className="text-right">Avg Time</TableHead>
                          <TableHead className="text-right">Cost/Check</TableHead>
                          <TableHead className="text-right">Today</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationMetrics.map((metric) => (
                          <TableRow key={metric.type}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {metric.icon}
                                <span className="font-medium">
                                  {metric.displayName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{metric.provider}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${getSuccessRateColor(
                                  metric.successRate
                                )}`}
                              >
                                {metric.successRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {metric.avgProcessingTime}s
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(metric.costPerVerification)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {metric.totalToday.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* SLA Compliance */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      SLA Compliance Status
                    </h4>
                    <div className="space-y-3">
                      {slaCompliance.map((sla, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${
                            sla.isCompliant
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-red-200 bg-red-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{sla.type}</span>
                            <Badge
                              variant="outline"
                              className={
                                sla.isCompliant
                                  ? "border-emerald-300 text-emerald-700"
                                  : "border-red-300 text-red-700"
                              }
                            >
                              {sla.isCompliant ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Compliant
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Breached
                                </>
                              )}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Target:</span>{" "}
                              <span>{sla.targetTime}s</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual:</span>{" "}
                              <span className={sla.actualAvgTime > sla.targetTime ? "text-red-600 font-medium" : ""}>
                                {sla.actualAvgTime}s
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Compliance:</span>{" "}
                              <span className="font-medium text-emerald-600">
                                {sla.complianceRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Overall Compliance */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Overall SLA Compliance</span>
                        <span
                          className={`text-2xl font-bold ${
                            overallSLACompliance >= 97
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {overallSLACompliance.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={overallSLACompliance} className="h-3 mt-2" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "fraud" && (
                <div className="space-y-6">
                  {/* Fraud Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="p-4 text-center">
                        <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-red-700">
                          {fraudSummary.totalBlockedToday}
                        </p>
                        <p className="text-sm text-red-600">
                          Fraud Attempts Blocked Today
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-amber-700">
                          {fraudSummary.avgRiskScore}
                        </p>
                        <p className="text-sm text-amber-600">
                          Average Risk Score
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <Search className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-purple-700">
                          98.2%
                        </p>
                        <p className="text-sm text-purple-600">
                          Detection Accuracy
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Common Fraud Types */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Common Fraud Types Detected
                    </h4>
                    <div className="space-y-3">
                      {fraudSummary.commonFraudTypes.map((fraud) => (
                        <div key={fraud.type} className="flex items-center gap-4">
                          <span className="text-sm w-40 truncate">
                            {fraud.type}
                          </span>
                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${fraud.percentage}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {fraud.count}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {fraud.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Fraud Attempts */}
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Recent Fraud Attempts
                    </h4>
                    <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Risk Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Detected</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fraudAttempts.map((attempt) => (
                            <TableRow key={attempt.id}>
                              <TableCell className="font-medium text-sm">
                                {attempt.type}
                              </TableCell>
                              <TableCell>{attempt.customerName}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={getRiskScoreColor(
                                    attempt.riskScore
                                  )}
                                >
                                  {attempt.riskScore}/100
                                </span>
                              </TableCell>
                              <TableCell>
                                {getFraudStatusBadge(attempt.status)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(
                                  attempt.detectedAt
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
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

        {/* Right Column - Providers & Stats */}
        <div className="space-y-6">
          {/* Provider Connections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                Provider Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {providerConnections.map((provider) => (
                  <div
                    key={provider.name}
                    className={`p-3 rounded-lg border ${
                      provider.status === "connected"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : provider.status === "degraded"
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-red-200 bg-red-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {provider.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          provider.status === "connected"
                            ? "border-emerald-300 text-emerald-700"
                            : "border-red-300 text-red-700"
                        }
                      >
                        {provider.status === "connected" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Disconnected
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Latency: {provider.latency}ms</span>
                      <span>Uptime: {provider.uptime}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-500" />
                Today's Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationMetrics.map((metric) => (
                  <div
                    key={metric.type}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      {metric.icon}
                      <span className="text-sm">{metric.displayName}</span>
                    </div>
                    <span className="font-medium text-sm">
                      {formatCurrency(
                        metric.totalToday * metric.costPerVerification
                      )}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="font-medium">Total Today</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(
                      verificationMetrics.reduce(
                        (sum, m) => sum + m.totalToday * m.costPerVerification,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                Security Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#22c55e"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${94 * 2.51} ${100 * 2.51}`}
                      />
                    </svg>
                    <span className="absolute text-2xl font-bold text-emerald-600">
                      94
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Security Score
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Liveness Detection
                    </span>
                    <span className="font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Document Auth
                    </span>
                    <span className="font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      AML Screening
                    </span>
                    <span className="font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Watchlist Update
                    </span>
                    <span className="font-medium text-amber-600">Due in 2d</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default KYCProviderStatus;
