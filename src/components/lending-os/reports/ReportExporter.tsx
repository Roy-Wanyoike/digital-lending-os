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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  Mail,
  Calendar,
  CheckCircle2,
  Loader2,
  X,
  Clock,
  Settings,
  Image as ImageIcon,
  Printer
} from 'lucide-react'

// Types
interface ExportSection {
  id: string
  name: string
  enabled: boolean
}

interface ReportExporterProps {
  open: boolean
  onClose: () => void
  reportType: string
  data: any
}

interface ExportConfig {
  format: 'pdf' | 'csv' | 'excel' | 'json'
  dateRange: { start: string; end: string }
  includeSections: ExportSection[]
  includeCharts: boolean
  includeTables: boolean
  branding: {
    includeLogo: boolean
    includeTenantName: boolean
    customTitle?: string
    footerText?: string
  }
  delivery: 'download' | 'email' | 'schedule'
  email?: string
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export function ReportExporter({ open, onClose, reportType, data }: ReportExporterProps) {
  // State
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'pdf',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeSections: getAvailableSections(reportType),
    includeCharts: true,
    includeTables: true,
    branding: {
      includeLogo: true,
      includeTenantName: true,
      customTitle: '',
      footerText: ''
    },
    delivery: 'download',
    email: '',
    scheduleFrequency: 'monthly'
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle')

  // Get available sections based on report type
  function getAvailableSections(type: string): ExportSection[] {
    switch (type) {
      case 'portfolio':
        return [
          { id: 'overview', name: 'Executive Summary (KPIs)', enabled: true },
          { id: 'disbursement', name: 'Disbursement Trends', enabled: true },
          { id: 'par', name: 'PAR Analysis', enabled: true },
          { id: 'product', name: 'Product Breakdown', enabled: true },
          { id: 'risk', name: 'Risk Distribution', enabled: true },
          { id: 'vintage', name: 'Vintage Analysis', enabled: false },
          { id: 'alerts', name: 'Alerts & Notifications', enabled: true }
        ]
      case 'customer':
        return [
          { id: 'overview', name: 'Customer Overview KPIs', enabled: true },
          { id: 'acquisition', name: 'Acquisition Trends', enabled: true },
          { id: 'segmentation', name: 'Segmentation Analysis', enabled: true },
          { id: 'behavior', name: 'Behavior Metrics', enabled: true },
          { id: 'geography', name: 'Geographic Distribution', enabled: true },
          { id: 'cohort', name: 'Cohort Retention', enabled: false },
          { id: 'channels', name: 'Acquisition Channels', enabled: true }
        ]
      case 'financial':
        return [
          { id: 'overview', name: 'Financial Summary KPIs', enabled: true },
          { id: 'revenue', name: 'Revenue Breakdown', enabled: true },
          { id: 'expenses', name: 'Expense Analysis', enabled: true },
          { id: 'pl', name: 'P&L Statement', enabled: true },
          { id: 'trends', name: 'Financial Trends', enabled: true },
          { id: 'ratios', name: 'Key Ratios & Metrics', enabled: true },
          { id: 'cashflow', name: 'Cash Flow Summary', enabled: true }
        ]
      case 'operational':
        return [
          { id: 'overview', name: 'Operational KPIs', enabled: true },
          { id: 'applications', name: 'Application Pipeline', enabled: true },
          { id: 'kyc', name: 'KYC Processing', enabled: true },
          { id: 'payments', name: 'Payment Processing', enabled: true },
          { id: 'staff', name: 'Staff Performance', enabled: true },
          { id: 'channels', name: 'Channel Effectiveness', enabled: true },
          { id: 'sla', name: 'SLA Compliance', enabled: true }
        ]
      default:
        return [
          { id: 'summary', name: 'Report Summary', enabled: true },
          { id: 'data', name: 'Data Tables', enabled: true },
          { id: 'charts', name: 'Visualizations', enabled: true }
        ]
    }
  }

  // Toggle section
  const toggleSection = (sectionId: string) => {
    setExportConfig(prev => ({
      ...prev,
      includeSections: prev.includeSections.map(s =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }))
  }

  // Handle export
  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('exporting')

    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (exportConfig.format === 'json') {
        // For JSON, create and download file directly
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`)
      } else if (exportConfig.format === 'csv') {
        // Generate CSV and download
        const csvContent = generateCSV(data, exportConfig)
        const blob = new Blob([csvContent], { type: 'text/csv' })
        downloadBlob(blob, `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`)
      } else {
        // For PDF/Excel, would call API in production
        console.log('Exporting as:', exportConfig.format, exportConfig)
      }

      setExportStatus('success')
      
      // Close after success delay
      setTimeout(() => {
        onClose()
        resetState()
      }, 1500)
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('error')
    } finally {
      setIsExporting(false)
    }
  }

  // Download helper
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Simple CSV generator
  const generateCSV = (data: any, config: ExportConfig): string => {
    // This is a simplified CSV generator - in production would be more sophisticated
    let csv = 'Report Export\n'
    csv += `Generated:,${new Date().toISOString()}\n`
    csv += `Report Type:,${config.format.toUpperCase()}\n\n`
    
    if (data?.overview) {
      csv += 'Overview Metrics\n'
      Object.entries(data.overview).forEach(([key, value]) => {
        csv += `${key},${value}\n`
      })
    }
    
    return csv
  }

  // Reset state
  const resetState = () => {
    setExportStatus('idle')
    setExportConfig({
      format: 'pdf',
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      includeSections: getAvailableSections(reportType),
      includeCharts: true,
      includeTables: true,
      branding: {
        includeLogo: true,
        includeTenantName: true,
        customTitle: '',
        footerText: ''
      },
      delivery: 'download',
      email: '',
      scheduleFrequency: 'monthly'
    })
  }

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Professional formatted report with charts' },
    { value: 'csv', label: 'CSV (Excel Compatible)', icon: FileSpreadsheet, description: 'Raw data for spreadsheet analysis' },
    { value: 'excel', label: 'Excel Workbook', icon: FileDown, description: 'Formatted spreadsheet with multiple sheets' },
    { value: 'json', label: 'JSON Data', icon: FileDown, description: 'Machine-readable raw data' }
  ]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="w-6 h-6 text-emerald-600" />
            Export Report
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Configure your {reportType} report export options
          </p>
        </DialogHeader>

        {/* Success State */}
        {exportStatus === 'success' ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Export Complete!</h3>
            <p className="text-slate-500">Your report has been downloaded successfully.</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Format Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">Export Format</Label>
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map((format) => {
                  const Icon = format.icon
                  return (
                    <button
                      key={format.value}
                      onClick={() => setExportConfig(prev => ({ ...prev, format: format.value as any }))}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        exportConfig.format === format.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${
                        exportConfig.format === format.value ? 'text-emerald-600' : 'text-slate-400'
                      }`} />
                      <p className={`font-medium ${
                        exportConfig.format === format.value ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-900 dark:text-white'
                      }`}>
                        {format.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{format.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Date Range */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expStart" className="text-sm text-slate-500">Start Date</Label>
                  <Input
                    id="expStart"
                    type="date"
                    value={exportConfig.dateRange.start}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expEnd" className="text-sm text-slate-500">End Date</Label>
                  <Input
                    id="expEnd"
                    type="date"
                    value={exportConfig.dateRange.end}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Include Sections */}
            <div>
              <Label className="text-base font-medium mb-3 block">Include Sections</Label>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                {exportConfig.includeSections.map((section) => (
                  <label
                    key={section.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{section.name}</span>
                    <Checkbox
                      checked={section.enabled}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                  </label>
                ))}
              </div>
              
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={exportConfig.includeCharts}
                    onCheckedChange={(checked) => setExportConfig(prev => ({
                      ...prev,
                      includeCharts: checked as boolean
                    }))}
                  />
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Include Charts</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={exportConfig.includeTables}
                    onCheckedChange={(checked) => setExportConfig(prev => ({
                      ...prev,
                      includeTables: checked as boolean
                    }))}
                  />
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Include Tables</span>
                </label>
              </div>
            </div>

            <Separator />

            {/* Branding Options (for PDF) */}
            {(exportConfig.format === 'pdf' || exportConfig.format === 'excel') && (
              <div>
                <Label className="text-base font-medium flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4" />
                  Branding Options (DCP White-label)
                </Label>
                
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={exportConfig.branding.includeLogo}
                        onCheckedChange={(checked) => setExportConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, includeLogo: checked as boolean }
                        }))}
                      />
                      <span className="text-sm">Include Company Logo</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={exportConfig.branding.includeTenantName}
                        onCheckedChange={(checked) => setExportConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, includeTenantName: checked as boolean }
                        }))}
                      />
                      <span className="text-sm">Include Company Name</span>
                    </label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customTitle" className="text-sm">Custom Report Title (Optional)</Label>
                      <Input
                        id="customTitle"
                        placeholder="e.g., Q1 2026 Portfolio Report"
                        value={exportConfig.branding.customTitle || ''}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, customTitle: e.target.value }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="footerText" className="text-sm">Custom Footer Text</Label>
                      <Input
                        id="footerText"
                        placeholder="e.g., Confidential - Internal Use Only"
                        value={exportConfig.branding.footerText || ''}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          branding: { ...prev.branding, footerText: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Delivery Options */}
            <div>
              <Label className="text-base font-medium mb-3 block">Delivery Method</Label>
              <div className="flex gap-3">
                {[
                  { value: 'download', label: 'Download Now', icon: Download },
                  { value: 'email', label: 'Email Report', icon: Mail },
                  { value: 'schedule', label: 'Schedule Recurring', icon: Clock }
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setExportConfig(prev => ({ ...prev, delivery: option.value as any }))}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        exportConfig.delivery === option.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${
                        exportConfig.delivery === option.value ? 'text-emerald-600' : 'text-slate-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        exportConfig.delivery === option.value ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Email Input */}
              {exportConfig.delivery === 'email' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="emailTo" className="text-sm">Recipient Email</Label>
                  <Input
                    id="emailTo"
                    type="email"
                    placeholder="reports@company.com"
                    value={exportConfig.email || ''}
                    onChange={(e) => setExportConfig(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              )}

              {/* Schedule Frequency */}
              {exportConfig.delivery === 'schedule' && (
                <div className="mt-4 space-y-2">
                  <Label>Schedule Frequency</Label>
                  <Select 
                    value={exportConfig.scheduleFrequency} 
                    onValueChange={(value) => setExportConfig(prev => ({ 
                      ...prev, 
                      scheduleFrequency: value as any 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="schedEmail" className="text-sm">Notification Email</Label>
                    <Input
                      id="schedEmail"
                      type="email"
                      placeholder="reports@company.com"
                      value={exportConfig.email || ''}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || exportStatus === 'success'}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {exportConfig.format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Standalone exporter component for use outside dialog context
interface StandaloneExporterProps {
  reportType: string
  data: any
  triggerClassName?: string
}

export function StandaloneReportExporter({ reportType, data, triggerClassName }: StandaloneExporterProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        className={triggerClassName}
        onClick={() => setIsOpen(true)}
      >
        <Download className="w-4 h-4 mr-2" />
        Export Report
      </Button>
      
      <ReportExporter
        open={isOpen}
        onClose={() => setIsOpen(false)}
        reportType={reportType}
        data={data}
      />
    </>
  )
}

export default ReportExporter
