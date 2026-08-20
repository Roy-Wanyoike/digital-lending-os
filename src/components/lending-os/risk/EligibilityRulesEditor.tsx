'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Settings,
  FileText,
  Shield,
  UserCheck,
  Wallet,
  CreditCard,
  Calendar
} from 'lucide-react'

// TypeScript interfaces
export interface EligibilityRule {
  id: string
  name: string
  description: string
  category: 'demographic' | 'credit' | 'financial' | 'documentation' | 'behavioral'
  isActive: boolean
  priority: number // Lower number = higher priority
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt' | 'in' | 'not_in' | 'exists'
  field: string
  threshold: number | string | boolean
  unit?: string
  errorMessage: string
  isEditable: boolean
  isSystemRule: boolean
  lastModified: Date
  modifiedBy: string
}

// Pre-built rules for Kenyan DCP context
const initialRules: EligibilityRule[] = [
  {
    id: 'rule-001',
    name: 'Minimum Age Requirement',
    description: 'Applicant must be at least 18 years old to apply for credit',
    category: 'demographic',
    isActive: true,
    priority: 1,
    operator: 'gte',
    field: 'applicant.age',
    threshold: 18,
    unit: 'years',
    errorMessage: 'Applicant must be at least 18 years old to qualify for a loan',
    isEditable: true,
    isSystemRule: true,
    lastModified: new Date('2026-01-15'),
    modifiedBy: 'System Admin'
  },
  {
    id: 'rule-002',
    name: 'Maximum Age Limit',
    description: 'Applicants above 65 years are not eligible for new loans',
    category: 'demographic',
    isActive: true,
    priority: 2,
    operator: 'lte',
    field: 'applicant.age',
    threshold: 65,
    unit: 'years',
    errorMessage: 'Applicants over 65 years are not eligible for this product',
    isEditable: true,
    isSystemRule: true,
    lastModified: new Date('2026-01-15'),
    modifiedBy: 'System Admin'
  },
  {
    id: 'rule-003',
    name: 'Valid National ID Required',
    description: 'Applicant must provide a valid Kenyan National ID or Passport',
    category: 'documentation',
    isActive: true,
    priority: 3,
    operator: 'exists',
    field: 'documents.nationalId',
    threshold: true,
    errorMessage: 'A valid National ID or Passport is required to proceed',
    isEditable: false,
    isSystemRule: true,
    lastModified: new Date('2026-01-10'),
    modifiedBy: 'Compliance Officer'
  },
  {
    id: 'rule-004',
    name: 'CRB Clearance Check',
    description: 'No active defaults or negative listings in CRB (Credit Reference Bureau)',
    category: 'credit',
    isActive: true,
    priority: 4,
    operator: 'eq',
    field: 'crb.status',
    threshold: 'CLEAN',
    errorMessage: 'Applicant has active CRB listings that prevent approval',
    isEditable: false,
    isSystemRule: true,
    lastModified: new Date('2026-01-12'),
    modifiedBy: 'Risk Manager'
  },
  {
    id: 'rule-005',
    name: 'M-Pesa Account Age',
    description: 'M-Pesa account must be active for at least 6 months',
    category: 'financial',
    isActive: true,
    priority: 5,
    operator: 'gte',
    field: 'mpesa.accountAgeMonths',
    threshold: 6,
    unit: 'months',
    errorMessage: 'M-Pesa account must be at least 6 months old',
    isEditable: true,
    isSystemRule: true,
    lastModified: new Date('2026-01-08'),
    modifiedBy: 'Product Manager'
  },
  {
    id: 'rule-006',
    name: 'Minimum Monthly Income',
    description: 'Applicant must demonstrate monthly income above minimum threshold',
    category: 'financial',
    isActive: true,
    priority: 6,
    operator: 'gte',
    field: 'income.monthly',
    threshold: 15000,
    unit: 'KES',
    errorMessage: 'Monthly income of KSh 15,000 or higher is required',
    isEditable: true,
    isSystemRule: true,
    lastModified: new Date('2026-01-14'),
    modifiedBy: 'Risk Manager'
  },
  {
    id: 'rule-007',
    name: 'Debt-to-Income Ratio Cap',
    description: 'Total debt obligations should not exceed 50% of monthly income',
    category: 'financial',
    isActive: true,
    priority: 7,
    operator: 'lte',
    field: 'financial.dtiRatio',
    threshold: 50,
    unit: '%',
    errorMessage: 'Debt-to-income ratio exceeds the maximum allowed of 50%',
    isEditable: true,
    isSystemRule: true,
    lastModified: new Date('2026-01-11'),
    modifiedBy: 'Chief Risk Officer'
  },
  {
    id: 'rule-008',
    name: 'Active Loan Count Limit',
    description: 'Maximum number of concurrent active loans across all lenders',
    category: 'credit',
    isActive: true,
    priority: 8,
    operator: 'lte',
    field: 'loans.activeCount',
    threshold: 5,
    unit: 'loans',
    errorMessage: 'Too many active loans - maximum allowed is 5',
    isEditable: true,
    isSystemRule: false,
    lastModified: new Date('2026-01-16'),
    modifiedBy: 'Credit Analyst'
  },
  {
    id: 'rule-009',
    name: 'Phone Number Verification',
    description: 'Mobile phone must be registered in applicant\'s name and verified via OTP',
    category: 'documentation',
    isActive: true,
    priority: 9,
    operator: 'eq',
    field: 'phone.verified',
    threshold: true,
    errorMessage: 'Phone number verification required before proceeding',
    isEditable: false,
    isSystemRule: true,
    lastModified: new Date('2026-01-05'),
    modifiedBy: 'System Admin'
  }
]

// Category icons and colors
const categoryConfig = {
  demographic: { icon: <UserCheck className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400', label: 'Demographic' },
  credit: { icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400', label: 'Credit' },
  financial: { icon: <Wallet className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Financial' },
  documentation: { icon: <FileText className="w-4 h-4" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', label: 'Documentation' },
  behavioral: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', label: 'Behavioral' }
}

const operatorLabels = {
  gte: '≥ (Greater than or equal)',
  lte: '≤ (Less than or equal)',
  eq: '= (Equal to)',
  gt: '> (Greater than)',
  lt: '< (Less than)',
  in: 'In (One of)',
  not_in: 'Not In (None of)',
  exists: 'Exists (Required)'
}

export function EligibilityRulesEditor() {
  const [rules, setRules] = useState<EligibilityRule[]>(initialRules)
  const [editingRule, setEditingRule] = useState<EligibilityRule | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)

  // New rule form state
  const [newRule, setNewRule] = useState<Partial<EligibilityRule>>({
    name: '',
    description: '',
    category: 'financial',
    operator: 'gte',
    field: '',
    threshold: '',
    unit: '',
    errorMessage: ''
  })

  // Toggle rule active state
  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  // Update rule threshold
  const updateThreshold = (ruleId: string, value: number | string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId && rule.isEditable 
        ? { ...rule, threshold: value, lastModified: new Date(), modifiedBy: 'Current User' }
        : rule
    ))
  }

  // Delete rule (only non-system rules)
  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId))
  }

  // Add new custom rule
  const handleAddRule = () => {
    if (!newRule.name || !newRule.field || newRule.threshold === undefined) return
    
    const rule: EligibilityRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name!,
      description: newRule.description || '',
      category: newRule.category as EligibilityRule['category'],
      isActive: true,
      priority: rules.length + 1,
      operator: newRule.operator as EligibilityRule['operator'],
      field: newRule.field!,
      threshold: newRule.threshold as number | string | boolean,
      unit: newRule.unit,
      errorMessage: newRule.errorMessage || `Failed: ${newRule.name}`,
      isEditable: true,
      isSystemRule: false,
      lastModified: new Date(),
      modifiedBy: 'Current User'
    }

    setRules(prev => [...prev, rule])
    setIsAddDialogOpen(false)
    setNewRule({
      name: '',
      description: '',
      category: 'financial',
      operator: 'gte',
      field: '',
      threshold: '',
      unit: '',
      errorMessage: ''
    })
  }

  // Filtered rules
  const filteredRules = rules.filter(rule => {
    if (!showInactive && !rule.isActive) return false
    if (filterCategory !== 'all' && rule.category !== filterCategory) return false
    return true
  })

  // Stats
  const activeCount = rules.filter(r => r.isActive).length
  const systemCount = rules.filter(r => r.isSystemRule).length
  const customCount = rules.filter(r => !r.isSystemRule).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-emerald-600" />
            Eligibility Rules Editor
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure and manage loan eligibility criteria for Kenyan DCP operations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle>Add New Eligibility Rule</DialogTitle>
              <DialogDescription>
                Create a custom eligibility rule specific to your lending criteria.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., Maximum Loan Amount"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-category">Category</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demographic">Demographic</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                <Input
                  id="rule-description"
                  placeholder="Brief description of what this rule checks..."
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-field">Field *</Label>
                  <Input
                    id="rule-field"
                    placeholder="e.g., income.monthly"
                    value={newRule.field}
                    onChange={(e) => setNewRule(prev => ({ ...prev, field: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-operator">Operator</Label>
                  <Select
                    value={newRule.operator}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, operator: value as any }))}
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gte">≥ Greater or Equal</SelectItem>
                      <SelectItem value="lte">≤ Less or Equal</SelectItem>
                      <SelectItem value="gt">&gt; Greater Than</SelectItem>
                      <SelectItem value="lt">&lt; Less Than</SelectItem>
                      <SelectItem value="eq">= Equal To</SelectItem>
                      <SelectItem value="exists">Exists</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-threshold">Threshold *</Label>
                  <Input
                    id="rule-threshold"
                    type="number"
                    placeholder="e.g., 15000"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule(prev => ({ ...prev, threshold: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-unit">Unit (Optional)</Label>
                  <Input
                    id="rule-unit"
                    placeholder="e.g., KES, %, years, months"
                    value={newRule.unit}
                    onChange={(e) => setNewRule(prev => ({ ...prev, unit: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-error">Error Message</Label>
                  <Input
                    id="rule-error"
                    placeholder="Message shown when rule fails..."
                    value={newRule.errorMessage}
                    onChange={(e) => setNewRule(prev => ({ ...prev, errorMessage: e.target.value }))}
                    className="dark:bg-slate-800 dark:border-slate-600"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="dark:border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleAddRule} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active Rules</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">System Rules</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{systemCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Edit2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Custom Rules</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{customCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Rules</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{rules.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter:</span>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={filterCategory === 'all' ? 'default' : 'outline'}
                  className={`cursor-pointer ${filterCategory === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : 'dark:border-slate-600 dark:hover:bg-slate-800'}`}
                  onClick={() => setFilterCategory('all')}
                >
                  All Categories
                </Badge>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <Badge 
                    key={key}
                    variant={filterCategory === key ? 'default' : 'outline'}
                    className={`cursor-pointer ${filterCategory === key ? 'bg-emerald-600 hover:bg-emerald-700' : 'dark:border-slate-600 dark:hover:bg-slate-800'}`}
                    onClick={() => setFilterCategory(key)}
                  >
                    {config.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-slate-500 dark:text-slate-400">Show inactive:</label>
              <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base">Eligibility Rules Configuration</CardTitle>
          <CardDescription>
            Showing {filteredRules.length} of {rules.length} rules • Drag to reorder priority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700 hover:dark:bg-slate-800/80">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.sort((a, b) => a.priority - b.priority).map((rule) => (
                  <TableRow 
                    key={rule.id} 
                    className={`dark:border-slate-700 ${!rule.isActive ? 'opacity-60' : ''}`}
                  >
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono dark:bg-slate-700 dark:text-slate-300">
                        #{rule.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {rule.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${categoryConfig[rule.category].color} border-0`}>
                        {categoryConfig[rule.category].icon}
                        <span className="ml-1 hidden sm:inline">{categoryConfig[rule.category].label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                        {rule.field} {operatorLabels[rule.operator].split(' ')[0]}
                      </code>
                    </TableCell>
                    <TableCell>
                      {rule.isEditable ? (
                        <Input
                          type="number"
                          value={rule.threshold as number}
                          onChange={(e) => updateThreshold(rule.id, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-sm dark:bg-slate-700 dark:border-slate-600"
                        />
                      ) : (
                        <span className="font-mono text-sm">
                          {typeof rule.threshold === 'boolean' 
                            ? (rule.threshold ? 'Required' : 'Not Required')
                            : `${rule.threshold}${rule.unit ? ` ${rule.unit}` : ''}`
                          }
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={rule.isActive} 
                        onCheckedChange={() => toggleRule(rule.id)} 
                      />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                      {rule.lastModified.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!rule.isSystemRule && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      No rules match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference Guide */}
      <Card className="dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Kenyan DCP Regulatory Requirements Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
              <h4 className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Demographic Requirements
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300/70 space-y-1">
                <li>• Minimum age: 18 years (CBK requirement)</li>
                <li>• Valid National ID or Passport required</li>
                <li>• Must be a Kenyan resident</li>
                <li>• Registered mobile phone number</li>
              </ul>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg space-y-2">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Financial Requirements
              </h4>
              <ul className="text-sm text-emerald-700 dark:text-emerald-300/70 space-y-1">
                <li>• Minimum income: KSh 15,000/month</li>
                <li>• DTI ratio cap: 50%</li>
                <li>• M-Pesa age: 6+ months</li>
                <li>• Active bank/M-Pesa account</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg space-y-2">
              <h4 className="font-semibold text-purple-800 dark:text-purple-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Credit Requirements
              </h4>
              <ul className="text-sm text-purple-700 dark:text-purple-300/70 space-y-1">
                <li>• Clean CRB status (no active defaults)</li>
                <li>• Maximum 5 concurrent active loans</li>
                <li>• No fraud history</li>
                <li>• Positive repayment track record</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export type { EligibilityRule }
