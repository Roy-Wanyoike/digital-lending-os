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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Settings,
  Smartphone,
  Building,
  Shield,
  Database,
  MessageSquare,
  Mail,
  Key,
  Eye,
  EyeOff,
  Edit2,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Globe,
  Clock,
  RefreshCw,
  History,
  ArrowUpDown,
  Plug,
  Zap,
  Timer,
  Webhook,
  ToggleLeft,
  ToggleRight,
  Copy,
  ExternalLink,
} from "lucide-react";

// Types
type ProviderName = "mpesa" | "bank_transfer" | "kyc" | "crb" | "sms" | "email";

interface ProviderConfig {
  id: ProviderName;
  name: string;
  displayName: string;
  icon: React.ReactNode;
  environment: "sandbox" | "live";
  status: "connected" | "disconnected" | "error";
  credentials: Credential[];
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  webhooks: WebhookConfig[];
  timeout: number; // ms
  fallbackOrder: number;
  lastTested?: Date;
  testResult?: "success" | "failure" | "testing";
  testResponseTime?: number;
}

interface Credential {
  key: string;
  label: string;
  value: string;
  masked: boolean;
  required: boolean;
}

interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit: number;
  dailyQuota: number;
}

interface RetryConfig {
  maxRetries: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  initialDelay: number; // ms
  maxDelay: number; // ms
}

interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  provider: ProviderName;
  action: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  user: string;
}

interface ProviderConfigManagerProps {
  className?: string;
}

// Mock Data Generators
const generateProviderConfigs = (): ProviderConfig[] => [
  {
    id: "mpesa",
    name: "M-Pesa / Daraja",
    displayName: "M-Pesa Daraja API",
    icon: <Smartphone className="h-5 w-5 text-green-600" />,
    environment: "live",
    status: "connected",
    credentials: [
      { key: "consumer_key", label: "Consumer Key", value: "dkGx***pP2m", masked: true, required: true },
      { key: "consumer_secret", label: "Consumer Secret", value: "abXy***9zKq", masked: true, required: true },
      { key: "passkey", label: "Passkey", value: "bfb2***7f9c", masked: true, required: true },
      { key: "shortcode", label: "Shortcode", value: "174379", masked: false, required: true },
    ],
    rateLimit: { requestsPerSecond: 10, burstLimit: 50, dailyQuota: 50000 },
    retry: { maxRetries: 3, backoffStrategy: "exponential", initialDelay: 1000, maxDelay: 30000 },
    webhooks: [
      { url: "https://api.yourapp.com/webhooks/mpesa", events: ["stk_callback", "c2b_payment"], secret: "whsec_***abc123", active: true },
    ],
    timeout: 30000,
    fallbackOrder: 1,
    lastTested: new Date(Date.now() - 300000),
    testResult: "success",
    testResponseTime: 245,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer (Pesalink)",
    displayName: "Pesalink / RTGS",
    icon: <Building className="h-5 w-5 text-blue-600" />,
    environment: "live",
    status: "connected",
    credentials: [
      { key: "api_key", label: "API Key", value: "pk_live_***xYz789", masked: true, required: true },
      { key: "api_secret", label: "API Secret", value: "sk_live_***aBc456", masked: true, required: true },
      { key: "merchant_id", label: "Merchant ID", value: "MERCH-2024-KEN", masked: false, required: true },
    ],
    rateLimit: { requestsPerSecond: 5, burstLimit: 20, dailyQuota: 10000 },
    retry: { maxRetries: 2, backoffStrategy: "fixed", initialDelay: 5000, maxDelay: 15000 },
    webhooks: [
      { url: "https://api.yourapp.com/webhooks/bank", events: ["transfer_status", "account_validation"], secret: "whsec_***def456", active: true },
    ],
    timeout: 60000,
    fallbackOrder: 2,
    lastTested: new Date(Date.now() - 900000),
    testResult: "success",
    testResponseTime: 1250,
  },
  {
    id: "kyc",
    name: "KYC Providers",
    displayName: "Smile Identity / Onfido",
    icon: <Shield className="h-5 w-5 text-purple-600" />,
    environment: "live",
    status: "connected",
    credentials: [
      { key: "sid_api_key", label: "Smile API Key", value: "sk_smile_***123xyz", masked: true, required: true },
      { key: "sid_partner_id", label: "Smile Partner ID", value: "PART-001-KEN", masked: false, required: true },
      { key: "onfido_token", label: "Onfido Token", value: "tok_onf_***789abc", masked: true, required: false },
    ],
    rateLimit: { requestsPerSecond: 15, burstLimit: 30, dailyQuota: 25000 },
    retry: { maxRetries: 3, backoffStrategy: "exponential", initialDelay: 2000, maxDelay: 20000 },
    webhooks: [
      { url: "https://api.yourapp.com/webhooks/kyc", events: ["verification_complete", "verification_failed"], secret: "whsec_***ghi789", active: true },
    ],
    timeout: 45000,
    fallbackOrder: 0,
    lastTested: new Date(Date.now() - 1800000),
    testResult: "success",
    testResponseTime: 380,
  },
  {
    id: "crb",
    name: "CRB Bureaus",
    displayName: "Metropol / TransUnion / CreditInfo",
    icon: <Database className="h-5 w-5 text-orange-600" />,
    environment: "live",
    status: "connected",
    credentials: [
      { key: "metropol_username", label: "Metropol Username", value: "user_met@corp", masked: false, required: true },
      { key: "metropol_password", label: "Metropol Password", value: "***pass123", masked: true, required: true },
      { key: "transunion_key", label: "TransUnion API Key", value: "tu_key_***xyz", masked: true, required: true },
      { key: "creditinfo_token", label: "CreditInfo Token", value: "ci_tok_***abc", masked: true, required: true },
    ],
    rateLimit: { requestsPerSecond: 8, burstLimit: 25, dailyQuota: 15000 },
    retry: { maxRetries: 2, backoffStrategy: "linear", initialDelay: 1000, maxDelay: 10000 },
    webhooks: [],
    timeout: 30000,
    fallbackOrder: 1,
    lastTested: new Date(Date.now() - 3600000),
    testResult: "success",
    testResponseTime: 650,
  },
  {
    id: "sms",
    name: "SMS Gateway",
    displayName: "Africa's Talking / Twilio",
    icon: <MessageSquare className="h-5 w-5 text-teal-600" />,
    environment: "live",
    status: "connected",
    credentials: [
      { key: "at_username", label: "AT Username", value: "sandbox", masked: false, required: true },
      { key: "at_api_key", label: "AT API Key", value: "at_key_***123abc", masked: true, required: true },
      { key: "twilio_sid", label: "Twilio SID", value: "AC***xyz789", masked: true, required: false },
      { key: "twilio_token", label: "Twilio Token", value: "***token456", masked: true, required: false },
    ],
    rateLimit: { requestsPerSecond: 20, burstLimit: 100, dailyQuota: 75000 },
    retry: { maxRetries: 3, backoffStrategy: "exponential", initialDelay: 500, maxDelay: 15000 },
    webhooks: [
      { url: "https://api.yourapp.com/webhooks/sms", events: ["delivery_report", "incoming_sms"], secret: "whsec_***jkl012", active: true },
    ],
    timeout: 15000,
    fallbackOrder: 1,
    lastTested: new Date(Date.now() - 600000),
    testResult: "success",
    testResponseTime: 142,
  },
  {
    id: "email",
    name: "Email Service",
    displayName: "SendGrid / Mailgun",
    icon: <Mail className="h-5 w-5 text-indigo-600" />,
    environment: "sandbox",
    status: "connected",
    credentials: [
      { key: "sendgrid_key", label: "SendGrid API Key", value: "SG.***xyz789", masked: true, required: true },
      { key: "mailgun_key", label: "Mailgun Key", value: "key-***abc456", masked: true, required: false },
      { key: "from_email", label: "From Email", value: "noreply@yourapp.co.ke", masked: false, required: true },
    ],
    rateLimit: { requestsPerSecond: 50, burstLimit: 200, dailyQuota: 100000 },
    retry: { maxRetries: 3, backoffStrategy: "exponential", initialDelay: 1000, maxDelay: 30000 },
    webhooks: [
      { url: "https://api.yourapp.com/webhooks/email", events: ["bounce", "complaint", "open"], secret: "whsec_***mno345", active: true },
    ],
    timeout: 10000,
    fallbackOrder: 0,
    lastTested: new Date(Date.now() - 7200000),
    testResult: "success",
    testResponseTime: 280,
  },
];

const generateAuditLog = (): AuditLogEntry[] => [
  {
    id: "LOG001",
    timestamp: new Date(Date.now() - 1800000),
    provider: "mpesa",
    action: "updated",
    field: "timeout",
    oldValue: "25000ms",
    newValue: "30000ms",
    user: "admin@company.com",
  },
  {
    id: "LOG002",
    timestamp: new Date(Date.now() - 7200000),
    provider: "sms",
    action: "rotated",
    field: "api_key",
    user: "sysadmin@company.com",
  },
  {
    id: "LOG003",
    timestamp: new Date(Date.now() - 14400000),
    provider: "email",
    action: "environment_change",
    field: "environment",
    oldValue: "live",
    newValue: "sandbox",
    user: "admin@company.com",
  },
  {
    id: "LOG004",
    timestamp: new Date(Date.now() - 28800000),
    provider: "crb",
    action: "added_webhook",
    field: "webhooks",
    newValue: "https://api.yourapp.com/webhooks/crb",
    user: "devops@company.com",
  },
  {
    id: "LOG005",
    timestamp: new Date(Date.now() - 43200000),
    provider: "kyc",
    action: "updated",
    field: "rate_limit.requests_per_second",
    oldValue: "10",
    newValue: "15",
    user: "admin@company.com",
  },
  {
    id: "LOG006",
    timestamp: new Date(Date.now() - 86400000),
    provider: "bank_transfer",
    action: "tested_connection",
    field: "connection",
    user: "monitoring@system",
  },
  {
    id: "LOG007",
    timestamp: new Date(Date.now() - 172800000),
    provider: "mpesa",
    action: "updated",
    field: "fallback_order",
    oldValue: "2",
    newValue: "1",
    user: "admin@company.com",
  },
];

export function ProviderConfigManager({ className }: ProviderConfigManagerProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>("mpesa");
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [environmentDialogOpen, setEnvironmentDialogOpen] = useState(false);
  const [pendingEnvironmentChange, setPendingEnvironmentChange] = useState<{
    provider: ProviderName;
    from: string;
    to: string;
  } | null>(null);
  const [testingConnection, setTestingConnection] = useState<ProviderName | null>(null);

  const providers = useMemo(() => generateProviderConfigs(), []);
  const auditLog = useMemo(() => generateAuditLog(), []);

  const selectedConfig = providers.find((p) => p.id === selectedProvider);

  const handleTestConnection = async (providerId: ProviderName) => {
    setTestingConnection(providerId);
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTestingConnection(null);
  };

  const handleEnvironmentSwitch = (
    providerId: ProviderName,
    currentEnv: string,
    newEnv: string
  ) => {
    setPendingEnvironmentChange({
      provider: providerId,
      from: currentEnv,
      to: newEnv,
    });
    setEnvironmentDialogOpen(true);
  };

  const confirmEnvironmentSwitch = () => {
    // In real app, this would call an API to update the environment
    console.log("Environment switch confirmed:", pendingEnvironmentChange);
    setEnvironmentDialogOpen(false);
    setPendingEnvironmentChange(null);
  };

  const toggleCredentialVisibility = (credKey: string) => {
    setShowCredentials((prev) => ({
      ...prev,
      [credKey]: !prev[credKey],
    }));
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    // In real app, this would call an API to save the change
    console.log(`Saving ${editingField}:`, editValue);
    setEditingField(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const getStatusBadge = (status: ProviderConfig["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  const getTestButtonContent = (providerId: ProviderName) => {
    if (testingConnection === providerId) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Testing...
        </>
      );
    }
    return (
      <>
        <Plug className="h-4 w-4 mr-2" />
        Test Connection
      </>
    );
  };

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Provider Configuration Manager</CardTitle>
                <CardDescription>
                  Manage API credentials, rate limits, and integration settings
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              View Full Audit Log
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Provider Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Providers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedProvider === provider.id
                        ? "bg-primary/10 border-r-2 border-primary"
                        : ""
                    }`}
                  >
                    {provider.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {provider.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {provider.environment === "live" ? (
                          <span className="text-green-600">● Live</span>
                        ) : (
                          <span className="text-amber-600">● Sandbox</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Providers</span>
                  <span className="font-medium">{providers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected</span>
                  <span className="font-medium text-emerald-600">
                    {providers.filter((p) => p.status === "connected").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Live Environment</span>
                  <span className="font-medium text-blue-600">
                    {providers.filter((p) => p.environment === "live").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sandbox</span>
                  <span className="font-medium text-amber-600">
                    {providers.filter((p) => p.environment === "sandbox").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Configuration Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedConfig && (
            <>
              {/* Provider Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-gray-100 rounded-xl">
                        {selectedConfig.icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">
                          {selectedConfig.name}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                          {getStatusBadge(selectedConfig.status)}
                          <Badge
                            variant={
                              selectedConfig.environment === "live"
                                ? "default"
                                : "secondary"
                            }
                          >
                            <Globe className="h-3 w-3 mr-1" />
                            {selectedConfig.environment.toUpperCase()}
                          </Badge>
                          {selectedConfig.testResult &&
                            selectedConfig.lastTested && (
                              <span className="text-xs text-muted-foreground">
                                Last tested:{" "}
                                {new Date(
                                  selectedConfig.lastTested
                                ).toLocaleTimeString()}{" "}
                                •{" "}
                                {selectedConfig.testResponseTime}ms response
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Environment Toggle */}
                      <Button
                        variant={
                          selectedConfig.environment === "live"
                            ? "destructive"
                            : "default"
                        }
                        size="sm"
                        onClick={() =>
                          handleEnvironmentSwitch(
                            selectedConfig.id,
                            selectedConfig.environment,
                            selectedConfig.environment === "live"
                              ? "sandbox"
                              : "live"
                          )
                        }
                      >
                        {selectedConfig.environment === "live" ? (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            Switch to Sandbox
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            Go Live
                          </>
                        )}
                      </Button>
                      {/* Test Connection Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(selectedConfig.id)}
                        disabled={testingConnection === selectedConfig.id}
                      >
                        {getTestButtonContent(selectedConfig.id)}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Credentials */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Credentials
                    </CardTitle>
                    <CardDescription>
                      Sensitive values are masked by default
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedConfig.credentials.map((cred) => (
                        <div key={cred.key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-2">
                            {cred.label}
                            {cred.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={
                                  showCredentials[cred.key] ? "text" : "password"
                                }
                                value={
                                  editingField === cred.key
                                    ? editValue
                                    : cred.value
                                }
                                onChange={(e) => setEditValue(e.target.value)}
                                disabled={editingField !== cred.key}
                                className="font-mono text-sm pr-16"
                                readOnly={editingField !== cred.key}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    toggleCredentialVisibility(cred.key)
                                  }
                                >
                                  {showCredentials[cred.key] ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                {editingField === cred.key ? (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-emerald-600"
                                      onClick={saveEdit}
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600"
                                      onClick={cancelEdit}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      startEditing(
                                        cred.key,
                                        showCredentials[cred.key]
                                          ? cred.value.replace(/\*/g, "")
                                          : cred.value
                                      )
                                    }
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Rate Limits & Timeouts */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Rate Limiting
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Req/sec
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.rateLimit.requestsPerSecond}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Burst Limit
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.rateLimit.burstLimit}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Daily Quota
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.rateLimit.dailyQuota.toLocaleString()}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">
                              Today's Usage
                            </span>
                            <span className="font-medium">42%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: "42%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Timeout & Retries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Request Timeout (ms)
                          </Label>
                          <Input
                            type="number"
                            value={selectedConfig.timeout}
                            className="font-mono text-sm mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Max Retries
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.retry.maxRetries}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Backoff Strategy
                            </Label>
                            <Select
                              defaultValue={selectedConfig.retry.backoffStrategy}
                            >
                              <SelectTrigger className="mt-1 h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exponential">
                                  Exponential
                                </SelectItem>
                                <SelectItem value="linear">Linear</SelectItem>
                                <SelectItem value="fixed">Fixed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Initial Delay (ms)
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.retry.initialDelay}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Max Delay (ms)
                            </Label>
                            <Input
                              type="number"
                              value={selectedConfig.retry.maxDelay}
                              className="font-mono text-sm mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Webhooks & Fallback Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Webhook Configuration */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook Endpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedConfig.webhooks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedConfig.webhooks.map((webhook, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              webhook.active
                                ? "border-emerald-200 bg-emerald-50/30"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    webhook.active
                                      ? "bg-emerald-500"
                                      : "bg-gray-400"
                                  }`}
                                />
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {webhook.url}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  webhook.active
                                    ? "border-emerald-300 text-emerald-700"
                                    : "border-gray-300 text-gray-500"
                                }
                              >
                                {webhook.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {webhook.events.map((event) => (
                                <Badge
                                  key={event}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full">
                          + Add Webhook Endpoint
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No webhooks configured</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          + Add First Webhook
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fallback Order & Recent Changes */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Fallback Priority
                      </CardTitle>
                      <CardDescription>
                        Order of providers to use as fallbacks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {providers
                          .filter((p) => p.fallbackOrder > 0)
                          .sort((a, b) => a.fallbackOrder - b.fallbackOrder)
                          .map((provider, idx) => (
                            <div
                              key={provider.id}
                              className={`flex items-center gap-3 p-2 rounded-lg border ${
                                provider.id === selectedConfig.id
                                  ? "border-primary bg-primary/5"
                                  : "border-gray-200"
                              }`}
                            >
                              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              {provider.icon}
                              <span className="text-sm flex-1">
                                {provider.displayName}
                              </span>
                              {provider.id === selectedConfig.id && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Audit Log */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[180px] overflow-y-auto">
                        {auditLog
                          .filter((log) => log.provider === selectedProvider)
                          .slice(0, 5)
                          .map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-2 text-sm pb-2 border-b last:border-b-0"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate">
                                  <span className="font-medium capitalize">
                                    {log.action.replace("_", " ")}
                                  </span>{" "}
                                  {log.field}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        {auditLog.filter(
                          (log) => log.provider === selectedProvider
                        ).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No recent changes
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Environment Change Confirmation Dialog */}
      <Dialog
        open={environmentDialogOpen}
        onOpenChange={setEnvironmentDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Environment Change
            </DialogTitle>
            <DialogDescription>
              This is a critical action that will affect all production traffic.
              Please confirm you want to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-medium">
                {pendingEnvironmentChange &&
                  providers.find((p) => p.id === pendingEnvironmentChange.provider)?.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">From:</span>
              <Badge variant="secondary">
                {pendingEnvironmentChange?.from?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">To:</span>
              <Badge variant="destructive">
                {pendingEnvironmentChange?.to?.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ Switching to{" "}
              <strong>{pendingEnvironmentChange?.to === "live" ? "LIVE" : "SANDBOX"}</strong>{" "}
              will{" "}
              {pendingEnvironmentChange?.to === "live"
                ? "route real transactions and charges"
                : "stop all live operations"}.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEnvironmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmEnvironmentSwitch}
            >
              Yes, I Understand - Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProviderConfigManager;
