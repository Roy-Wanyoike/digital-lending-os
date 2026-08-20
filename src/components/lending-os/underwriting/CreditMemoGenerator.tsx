'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  FileText,
  Download,
  Printer,
  Edit3,
  Lock,
  CheckCircle2,
  XCircle,
  PenTool,
  User,
  Calendar,
  Shield,
  Clock
} from 'lucide-react'
import { LoanApplication, CreditMemo as CreditMemoType } from './types'
import { mockCreditMemo, formatCurrency, formatDate } from './mock-data'

interface CreditMemoGeneratorProps {
  application: LoanApplication
}

export function CreditMemoGenerator({ application }: CreditMemoGeneratorProps) {
  const [creditMemo] = useState<CreditMemoType>(mockCreditMemo)
  const [editableSections, setEditableSections] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [activeSection, setActiveSection] = useState('all')

  // Handle section content change
  const handleSectionChange = (sectionId: string, content: string) => {
    setEditableSections(prev => ({
      ...prev,
      [sectionId]: content
    }))
  }

  // Get section content (edited or original)
  const getSectionContent = (sectionId: string, originalContent: string) => {
    return editableSections[sectionId] || originalContent
  }

  // Handle save
  const handleSave = () => {
    setIsEditing(false)
    toast.success('Credit memo saved successfully')
  }

  // Handle download
  const handleDownload = () => {
    toast.success('Preparing PDF download...')
    // In real implementation, this would generate and download a PDF
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Get recommendation badge style
  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'approve':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />APPROVE</Badge>
      case 'reject':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />REJECT</Badge>
      case 'refer':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">REFER</Badge>
      default:
        return <Badge>{rec.toUpperCase()}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Credit Memorandum
          </h3>
          <p className="text-sm text-muted-foreground">
            Memo ID: {creditMemo.memoId} | Generated: {formatDate(creditMemo.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getRecommendationBadge(creditMemo.recommendation)}
          <Separator orientation="vertical" className="h-6" />
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Section Navigation */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:flex">
          <TabsTrigger value="all">All Sections</TabsTrigger>
          {creditMemo.sections.map(section => (
            <TabsTrigger key={section.sectionId} value={section.sectionId}>
              {section.title.split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Document Content */}
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden print:shadow-none print:border-0">
          {/* Document Header */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b print:bg-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CREDIT MEMORANDUM</h1>
                <p className="text-muted-foreground mt-1">Loan Application Review & Recommendation</p>
              </div>
              <div className="text-right text-sm text-muted-foreground space-y-1">
                <p>Memo ID: <span className="font-mono font-medium">{creditMemo.memoId}</span></p>
                <p>Application: <span className="font-mono font-medium">{application.applicationNumber}</span></p>
                <p>Generated: {new Date(creditMemo.generatedAt).toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
                <p>Prepared by: <span className="font-medium">{creditMemo.generatedBy}</span></p>
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">Applicant</p>
                <p className="font-semibold truncate">{application.customerName}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-bold text-emerald-600">{formatCurrency(application.amountRequested)}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="font-semibold">{application.productType}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">Term</p>
                <p className="font-semibold">{application.termMonths} months</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <p className={`font-bold ${application.riskScore >= 70 ? 'text-emerald-600' : application.riskScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {application.riskScore}/100
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {creditMemo.sections
              .filter(s => activeSection === 'all' || s.sectionId === activeSection)
              .map((section) => (
                <section key={section.sectionId} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {section.title}
                      {section.locked && (
                        <Lock className="w-4 h-4 text-muted-foreground" title="This section is locked" />
                      )}
                      {section.editable && !section.locked && (
                        <PenTool className="w-4 h-4 text-blue-500" title="This section is editable" />
                      )}
                    </h2>
                    <Badge 
                      variant="outline"
                      className={
                        section.locked 
                          ? 'border-red-300 text-red-700' 
                          : section.editable 
                          ? 'border-blue-300 text-blue-700'
                          : ''
                      }
                    >
                      {section.locked ? 'Locked' : section.editable ? 'Editable' : 'Read-only'}
                    </Badge>
                  </div>

                  {isEditing && section.editable && !section.locked ? (
                    <Textarea
                      value={getSectionContent(section.sectionId, section.content)}
                      onChange={(e) => handleSectionChange(section.sectionId, e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                      {getSectionContent(section.sectionId, section.content)}
                    </div>
                  )}
                </section>
              ))}
          </div>

          {/* Sign-off Section */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Sign-off & Authorization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creditMemo.signOffs.map((signOff) => (
                <Card key={signOff.signerId} className={
                  signOff.status === 'signed' 
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                    : 'border-dashed'
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          signOff.status === 'signed' 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{signOff.signerName}</p>
                          <p className="text-sm text-muted-foreground">{signOff.role}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={signOff.status === 'signed' ? 'default' : 'secondary'}
                        className={signOff.status === 'signed' ? 'bg-emerald-600' : ''}
                      >
                        {signOff.status === 'signed' ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" />Signed</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" />Pending</>
                        )}
                      </Badge>
                    </div>

                    {signOff.status === 'signed' ? (
                      <div className="space-y-2">
                        <div className="pt-2 border-b border-dashed border-slate-300">
                          <p className="font-script text-xl italic text-slate-600">{signOff.signature}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Signed: {signOff.signedAt ? formatDate(signOff.signedAt) : 'N/A'}
                        </p>
                      </div>
                    ) : (
                      <div className="py-8 border-b border-dashed border-slate-300 text-center">
                        <p className="text-sm text-muted-foreground">Awaiting signature...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Final Recommendation Box */}
            <div className={`mt-6 p-4 rounded-lg border-2 ${
              creditMemo.recommendation === 'approve' 
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                : creditMemo.recommendation === 'reject'
                ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide opacity-70">Final Recommendation</p>
                  <p className="text-2xl font-bold mt-1 capitalize">{creditMemo.recommendation}</p>
                </div>
                {getRecommendationBadge(creditMemo.recommendation)}
              </div>
            </div>
          </div>
        </div>
      </Tabs>

      {/* Footer Note */}
      <p className="text-xs text-center text-muted-foreground">
        This credit memorandum is auto-generated based on the loan application data. All information should be verified before making a final decision.
      </p>
    </div>
  )
}

export default CreditMemoGenerator
