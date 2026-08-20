'use client';

/**
 * M-Pesa Simulator Component
 * Digital Lending OS - Demo/Testing Tool
 * 
 * Allows developers and testers to simulate various
 * M-Pesa API responses for testing payment flows.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Smartphone,
  ArrowDownLeft,
  Loader2,
  RotateCcw,
  Trash2,
  Play,
} from 'lucide-react';

export interface MpesaSimulatorProps {
  /** Show STK Push simulation */
  showStkPush?: boolean;
  /** Show B2C simulation */
  showB2C?: boolean;
  /** Auto-refresh pending transactions */
  autoRefresh?: boolean;
  /** Custom class name */
  className?: string;
}

interface PendingTransaction {
  id: string;
  type: 'stk' | 'b2c';
  phone: string;
  amount: number | string;
  initiatedAt: Date;
  status: string;
}

interface SimulationResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

type SimulatedOutcome = 
  | 'success'
  | 'insufficient_funds'
  | 'cancelled'
  | 'timeout'
  | 'wrong_pin'
  | 'invalid_phone'
  | 'duplicate_transaction';

const STK_OUTCOMES: Array<{ value: SimulatedOutcome; label: string; description: string; color: string }> = [
  { value: 'success', label: 'Successful Payment', description: 'Customer enters correct PIN', color: 'text-green-600' },
  { value: 'insufficient_funds', label: 'Insufficient Funds', description: 'Customer has no balance', color: 'text-red-600' },
  { value: 'cancelled', label: 'Cancelled by User', description: 'Customer cancels the prompt', color: 'text-gray-600' },
  { value: 'timeout', label: 'Timed Out', description: 'Customer did not enter PIN', color: 'text-orange-600' },
  { value: 'wrong_pin', label: 'Wrong PIN Entered', description: 'Customer enters incorrect PIN', color: 'text-red-600' },
];

const B2C_OUTCOMES: Array<{ value: SimulatedOutcome; label: string; description: string; color: string }> = [
  { value: 'success', label: 'Successful Disbursement', description: 'Funds sent successfully', color: 'text-green-600' },
  { value: 'insufficient_funds', label: 'Insufficient Balance', description: 'Working account has low balance', color: 'text-red-600' },
  { value: 'cancelled', label: 'Cancelled', description: 'Transaction was cancelled', color: 'text-gray-600' },
];

const TEST_SCENARIOS = [
  { id: 'normal', label: 'Normal Flow', description: 'Happy path - successful transaction' },
  { id: 'retry', label: 'Retry After Failure', description: 'Fail first, then succeed on retry' },
  { id: 'timeout_recovery', label: 'Timeout Recovery', description: 'Timeout then manual retry' },
  { id: 'high_volume', label: 'High Volume Stress Test', description: 'Multiple rapid transactions' },
  { id: 'concurrent', label: 'Concurrent Transactions', description: 'Multiple simultaneous payments' },
];

export function MpesaSimulator({
  showStkPush = true,
  showB2C = true,
  autoRefresh = true,
  className = '',
}: MpesaSimulatorProps) {
  const [pendingStkPushes, setPendingStkPushes] = useState<PendingTransaction[]>([]);
  const [pendingB2CTransactions, setPendingB2CTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // Selected outcomes for simulation
  const [selectedStkOutcome, setSelectedStkOutcome] = useState<SimulatedOutcome>('success');
  const [selectedB2cOutcome, setSelectedB2cOutcome] = useState<SimulatedOutcome>('success');
  
  // Test scenarios
  const [activeScenario, setActiveScenario] = useState<string>('');
  const [scenarioRunning, setScenarioRunning] = useState(false);

  // Fetch pending transactions
  const fetchPendingTransactions = useCallback(async () => {
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll use mock data or the service directly via an API
      const response = await fetch('/api/simulator/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingStkPushes(data.stk || []);
        setPendingB2CTransactions(data.b2c || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending transactions:', error);
    }
  }, []);

  // Auto-refresh pending transactions
  useEffect(() => {
    if (!autoRefresh) return;
    
    fetchPendingTransactions();
    const interval = setInterval(fetchPendingTransactions, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPendingTransactions]);

  // Simulate STK Push outcome
  const simulateStkOutcome = async (checkoutRequestID: string, outcome: SimulatedOutcome) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/simulator/stk/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestID, outcome }),
      });
      
      const data: SimulationResult = await response.json();
      
      setResult(data);
      
      if (data.success) {
        // Refresh pending list
        setTimeout(fetchPendingTransactions, 500);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to simulate outcome',
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulate B2C outcome
  const simulateB2cOutcome = async (originatorConversationID: string, outcome: SimulatedOutcome) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/simulator/b2c/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originatorConversationID, outcome }),
      });
      
      const data: SimulationResult = await response.json();
      
      setResult(data);
      
      if (data.success) {
        setTimeout(fetchPendingTransactions, 500);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to simulate outcome',
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear all pending transactions
  const clearAllPending = async () => {
    try {
      await fetch('/api/simulator/clear', { method: 'POST' });
      setPendingStkPushes([]);
      setPendingB2CTransactions([]);
      setResult({ success: true, message: 'All pending transactions cleared' });
    } catch (error) {
      setResult({ success: false, message: 'Failed to clear transactions' });
    }
  };

  // Run test scenario
  const runTestScenario = async (scenarioId: string) => {
    setActiveScenario(scenarioId);
    setScenarioRunning(true);
    
    try {
      const response = await fetch('/api/simulator/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      
      const data: SimulationResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: 'Scenario execution failed' });
    } finally {
      setScenarioRunning(false);
      setActiveScenario('');
    }
  };

  // Get outcome icon
  const getOutcomeIcon = (outcome: SimulatedOutcome): React.ReactNode => {
    switch (outcome) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'insufficient_funds':
      case 'wrong_pin':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'timeout':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              M-PESA Simulator
              <Badge variant="outline" className="ml-2 border-yellow-400 text-yellow-700 bg-yellow-50">
                Demo Mode
              </Badge>
            </CardTitle>
            <CardDescription>
              Simulate M-Pesa responses for testing & development
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* STK Push Simulation */}
        {showStkPush && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">STK Push Simulation</h3>
              <Badge variant="secondary">{pendingStkPushes.length} pending</Badge>
            </div>

            {/* Outcome Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STK_OUTCOMES.map((outcome) => (
                <button
                  key={outcome.value}
                  onClick={() => setSelectedStkOutcome(outcome.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedStkOutcome === outcome.value
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getOutcomeIcon(outcome.value)}
                    <span className={`font-medium text-sm ${outcome.color}`}>{outcome.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{outcome.description}</p>
                </button>
              ))}
            </div>

            {/* Pending STK Pushes */}
            {pendingStkPushes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pending STK Push Transactions:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {pendingStkPushes.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Smartphone className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">{txn.id}</p>
                          <p className="text-xs text-gray-500">
                            {maskPhone(txn.phone)} • KSh {Number(txn.amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => simulateStkOutcome(txn.id, selectedStkOutcome)}
                        disabled={loading}
                        className="flex-shrink-0 ml-2"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Simulate
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 bg-muted/20 rounded-lg">
                <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending STK Push transactions</p>
                <p className="text-xs mt-1">Initiate a payment to see it here</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* B2C Simulation */}
        {showB2C && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">B2C Disbursement Simulation</h3>
              <Badge variant="secondary">{pendingB2CTransactions.length} pending</Badge>
            </div>

            {/* Outcome Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {B2C_OUTCOMES.map((outcome) => (
                <button
                  key={outcome.value}
                  onClick={() => setSelectedB2cOutcome(outcome.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedB2cOutcome === outcome.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getOutcomeIcon(outcome.value)}
                    <span className={`font-medium text-sm ${outcome.color}`}>{outcome.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{outcome.description}</p>
                </button>
              ))}
            </div>

            {/* Pending B2C */}
            {pendingB2CTransactions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pending B2C Disbursements:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {pendingB2CTransactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <ArrowDownLeft className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">{txn.id}</p>
                          <p className="text-xs text-gray-500">
                            {maskPhone(txn.phone)} • KSh {Number(txn.amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulateB2cOutcome(txn.id, selectedB2cOutcome)}
                        disabled={loading}
                        className="flex-shrink-0 ml-2"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Simulate
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 bg-muted/20 rounded-lg">
                <ArrowDownLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending B2C disbursements</p>
                <p className="text-xs mt-1">Initiate a disbursement to see it here</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Test Scenarios */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            Test Scenarios
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEST_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => runTestScenario(scenario.id)}
                disabled={scenarioRunning}
                className="p-3 rounded-lg border border-gray-200 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-sm">{scenario.label}</p>
                <p className="text-xs text-gray-500 mt-1">{scenario.description}</p>
              </button>
            ))}
          </div>
          
          {scenarioRunning && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-purple-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running scenario...
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={fetchPendingTransactions}
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh Pending
          </Button>
          
          <Button
            variant="destructive"
            onClick={clearAllPending}
            className="flex-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Pending
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 flex items-start gap-2">
            <FlaskConical className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              This simulator is for testing purposes only. In production, real M-Pesa callbacks will be received automatically.
              All simulated transactions are stored in memory only.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function maskPhone(phone: string): string {
  if (phone.length >= 9) {
    return phone.substring(0, 5) + '***' + phone.slice(-3);
  }
  return phone;
}

export default MpesaSimulator;
