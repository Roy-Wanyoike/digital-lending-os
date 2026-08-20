'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  FileText,
  Plus,
  Trash2,
  GripVertical,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Calendar,
  Filter,
  Download,
  Play,
  Save,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

// Types
interface ReportColumn {
  id: string
  name: string
  field: string
  type: 'metric' | 'dimension' | 'calculated'
  visible: boolean
}

interface ReportTemplate {
  id: string
  name: string
  description?: string
  type: string
  columns: ReportColumn[]
  filters: Record<string, any>
  chartType: 'bar' | 'line' | 'pie' | 'table'
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  createdAt: Date
  updatedAt: Date
}

interface CustomReportBuilderProps {
  tenantId?: string
}

// Available metrics and dimensions for custom reports
const AVAILABLE_METRICS = [
  { id: 'loanAmount', name: 'Loan Amount', category: 'Portfolio', format: 'currency' },
  { id: 'outstandingBalance', name: 'Outstanding Balance', category: 'Portfolio', format: 'currency' },
  { id: 'totalInterest', name: 'Total Interest', category: 'Financial', format: 'currency' },
  { id: 'par30', name: 'PAR30', category: 'Risk', format: 'percentage' },
  { id: 'approvalRate', name: 'Approval Rate', category: 'Operations', format: 'percentage' },
  { id: 'processingTime', name: 'Processing Time', category: 'Operations', format: 'hours' },
  { id: 'customerCount', name: 'Customer Count', category: 'Customer', format: 'number' },
  { id: 'loanCount', name: 'Loan Count', category: 'Portfolio', format: 'number' },
  { id: 'revenue', name: 'Revenue', category: 'Financial', format: 'currency' },
  { id: 'expenses', name: 'Expenses', category: 'Financial', format: 'currency' },
  { id: 'netProfit', name: 'Net Profit', category: 'Financial', format: 'currency' },
  { id: 'nplRatio', name: 'NPL Ratio', category: 'Risk', format: 'percentage' },
  { id: 'collectionRate', name: 'Collection Rate', category: 'Operations', format: 'percentage' },
  { id: 'avgLoanSize', name: 'Average Loan Size', category: 'Portfolio', format: 'currency' },
  { id: 'repeatBorrowerRate', name: 'Repeat Borrower Rate', category: 'Customer', format: 'percentage' }
]

const AVAILABLE_DIMENSIONS = [
  { id: 'date', name: 'Date', category: 'Time' },
  { id: 'month', name: 'Month', category: 'Time' },
  { id: 'quarter', name: 'Quarter', category: 'Time' },
  { id: 'year', name: 'Year', category: 'Time' },
  { id: 'product', name: 'Loan Product', category: 'Product' },
  { id: 'riskLevel', name: 'Risk Level', category: 'Risk' },
  { id: 'status', name: 'Loan Status', category: 'Loan' },
  { id: 'channel', name: 'Channel', category: 'Acquisition' },
  { id: 'county', name: 'County', category: 'Geography' },
  { id: 'staffMember', name: 'Staff Member', category: 'Staff' },
  { id: 'customerSegment', name: 'Customer Segment', category: 'Customer' }
]

const CHART_TYPES = [
  { id: 'table', name: 'Data Table', icon: Table, description: 'Tabular data view' },
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Trends over time' },
  { id: 'pie', name: 'Pie Chart', icon: PieChart, description: 'Part-to-whole comparison' }
]

export function CustomReportBuilder({ tenantId = 'default-tenant' }: CustomReportBuilderProps) {
  // State
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['date'])
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'table'>('table')
  const [groupBy, setGroupBy] = useState<string>('date')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Toggle metric selection
  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    )
  }

  // Toggle dimension selection
  const toggleDimension = (dimId: string) => {
    setSelectedDimensions(prev => 
      prev.includes(dimId) 
        ? prev.filter(id => id !== dimId)
        : [...prev, dimId]
    )
  }

  // Generate report
  const handleGenerateReport = async () => {
    if (selectedMetrics.length === 0) return

    setIsGenerating(true)
    setGenerationStatus('generating')

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          },
          format: 'json',
          filters: {},
          columns: selectedMetrics,
          dimensions: selectedDimensions,
          chartType,
          groupBy
        })
      })

      const result = await response.json()

      if (result.success) {
        setGenerationStatus('success')
        setShowPreview(true)
        
        // Poll for completion if async
        if (result.data?.status === 'pending') {
          pollForCompletion(result.data.jobId)
        }
      } else {
        setGenerationStatus('error')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      setGenerationStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }

  // Poll for report generation completion
  const pollForCompletion = async (jobId: string) => {
    const maxAttempts = 20
    let attempts = 0

    const poll = setInterval(async () => {
      attempts++
      
      try {
        const response = await fetch(`/api/reports/generate?jobId=${jobId}`)
        const result = await response.json()

        if (result.data?.status === 'completed') {
          clearInterval(poll)
          setGenerationStatus('success')
        } else if (result.data?.status === 'failed') {
          clearInterval(poll)
          setGenerationStatus('error')
        } else if (attempts >= maxAttempts) {
          clearInterval(poll)
          setGenerationStatus('error')
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 1000)
  }

  // Save as template
  const handleSaveTemplate = () => {
    if (!reportName.trim()) return

    const template: ReportTemplate = {
      id: `tpl_${Date.now()}`,
      name: reportName,
      description: reportDescription,
      type: 'custom',
      columns: selectedMetrics.map(m => ({
        id: m,
        name: AVAILABLE_METRICS.find(am => am.id === m)?.name || m,
        field: m,
        type: 'metric' as const,
        visible: true
      })),
      filters: { dateRange },
      chartType,
      groupBy,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setSavedTemplates(prev => [...prev, template])
    
    // Reset form
    setReportName('')
    setReportDescription('')
  }

  // Load template
  const handleLoadTemplate = (template: ReportTemplate) => {
    setReportName(template.name)
    setReportDescription(template.description || '')
    setSelectedMetrics(template.columns.map(c => c.id))
    setChartType(template.chartType)
    setGroupBy(template.groupBy || 'date')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Custom Report Builder
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Create customized reports by selecting metrics, dimensions, and visualization options
          </p>
        </div>
        
        {savedTemplates.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {savedTemplates.length} saved templates
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Report Name & Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  placeholder="e.g., Monthly Portfolio Summary"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportDesc">Description (Optional)</Label>
                <Input
                  id="reportDesc"
                  placeholder="Brief description of this report"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleSaveTemplate} 
                variant="outline" 
                className="w-full"
                disabled={!reportName.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Last 7 Days', days: 7 },
                  { label: 'Last 30 Days', days: 30 },
                  { label: 'Last 90 Days', days: 90 },
                  { label: 'This Year', days: 365 }
                ].map((preset) => (
                  <Button
                    key={preset.days}
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      start: new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      end: new Date().toISOString().split('T')[0]
                    })}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualization Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {CHART_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id as any)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        chartType === type.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${
                        chartType === type.id ? 'text-emerald-600' : 'text-slate-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        chartType === type.id ? 'text-emerald-600' : 'text-slate-600'
                      }`}>
                        {type.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle/Right Panel - Metrics & Dimensions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Select Metrics ({selectedMetrics.length} selected)
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMetrics(AVAILABLE_METRICS.map(m => m.id))}
                >
                  Select All
                </Button>
              </div>
              <CardDescription>Choose the data points to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {AVAILABLE_METRICS.map((metric) => (
                  <label
                    key={metric.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedMetrics.includes(metric.id)
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        selectedMetrics.includes(metric.id) ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'
                      }`}>
                        {metric.name}
                      </p>
                      <p className="text-xs text-slate-500">{metric.category}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dimensions Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Dimensions (Group By)</CardTitle>
              <CardDescription>Choose how to group or slice your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {AVAILABLE_DIMENSIONS.map((dim) => (
                  <Badge
                    key={dim.id}
                    variant={selectedDimensions.includes(dim.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDimension(dim.id)}
                  >
                    {dim.name}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label>Primary Group By</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_DIMENSIONS.map((dim) => (
                      <SelectItem key={dim.id} value={dim.id}>
                        {dim.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              {generationStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-emerald-600">Report generated successfully!</span>
                </>
              )}
              {generationStatus === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-500">Failed to generate report</span>
                </>
              )}
              {generationStatus === 'generating' && (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-600">Generating report...</span>
                </>
              )}
            </div>
            
            <Button
              onClick={handleGenerateReport}
              disabled={selectedMetrics.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {/* Saved Templates */}
          {savedTemplates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Saved Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-slate-500">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{template.chartType}</Badge>
                            <span className="text-xs text-slate-400">
                              {template.columns.length} metrics
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSavedTemplates(prev => prev.filter(t => t.id !== template.id))}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Area */}
          {showPreview && generationStatus === 'success' && (
            <Card className="border-emerald-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
                    Report Preview
                  </CardTitle>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-8 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
                  <p className="font-medium text-slate-900 dark:text-white">Custom Report Generated</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Your report with {selectedMetrics.length} metrics is ready for export
                  </p>
                  
                  {/* Mock preview table */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700">
                          <th className="px-4 py-2 text-left border-b">
                            {AVAILABLE_DIMENSIONS.find(d => d.id === groupBy)?.name || 'Date'}
                          </th>
                          {selectedMetrics.slice(0, 4).map(metricId => (
                            <th key={metricId} className="px-4 py-2 text-right border-b">
                              {AVAILABLE_METRICS.find(m => m.id === metricId)?.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(5)].map((_, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-2 border-b">
                              {groupBy === 'date' 
                                ? new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
                                : `Sample ${i + 1}`
                              }
                            </td>
                            {selectedMetrics.slice(0, 4).map(metricId => {
                              const metric = AVAILABLE_METRICS.find(m => m.id === metricId)
                              let value = Math.random() * 10000
                              
                              if (metric?.format === 'currency') value = Math.round(value)
                              else if (metric?.format === 'percentage') value = Math.round(value / 100)
                              
                              return (
                                <td key={metricId} className="px-4 py-2 text-right border-b font-mono">
                                  {metric?.format === 'currency' ? `KSh ${value.toLocaleString()}`
                                    : metric?.format === 'percentage' ? `${value}%`
                                    : value.toLocaleString()
                                  }
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomReportBuilder
