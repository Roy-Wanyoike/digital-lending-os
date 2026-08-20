'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Download,
  Printer,
  Eye,
  GitBranch,
  CheckCircle2,
  Clock,
  Archive,
  Edit3,
  AlertCircle,
  BookOpen,
  Scale,
  Shield,
  HelpCircle,
  ChevronRight,
  History,
  ArrowLeftRight
} from 'lucide-react'

// TypeScript interfaces
export interface PolicySection {
  id: string
  title: string
  content: string
  subsections?: {
    title: string
    content: string
    items?: string[]
  }[]
}

export interface CreditPolicy {
  id: string
  name: string
  version: string
  status: 'draft' | 'under_review' | 'active' | 'archived'
  effectiveDate: Date
  lastUpdated: Date
  updatedBy: string
  description: string
  sections: PolicySection[]
  changeLog?: {
    version: string
    date: Date
    changes: string[]
    author: string
  }[]
}

// Mock policy data - Kenyan DCP context
const policyVersions: CreditPolicy[] = [
  // Current Active Version (v2.1)
  {
    id: 'POL-2026-001',
    name: 'Digital Lending Credit Policy',
    version: '2.1',
    status: 'active',
    effectiveDate: new Date('2026-01-01'),
    lastUpdated: new Date('2025-12-20'),
    updatedBy: 'Chief Risk Officer - Mary Wanjiku',
    description: 'Comprehensive credit policy for digital lending operations in Kenya, compliant with CBK DCP regulations.',
    sections: [
      {
        id: 'lending-criteria',
        title: '1. Lending Criteria & Eligibility',
        content: 'This section outlines the minimum requirements for applicants to qualify for credit facilities through our digital lending platform.',
        subsections: [
          {
            title: '1.1 Basic Eligibility Requirements',
            content: 'All applicants must meet the following baseline criteria:',
            items: [
              'Must be a Kenyan citizen or legal resident with valid identification',
              'Minimum age of 18 years and maximum age of 65 years at loan maturity',
              'Valid National ID or Passport verified against government database',
              'Active registered mobile phone number in applicant\'s name for at least 6 months',
              'M-Pesa account with transaction history of minimum 6 months'
            ]
          },
          {
            title: '1.2 Financial Requirements',
            content: 'Applicants must demonstrate sufficient financial capacity:',
            items: [
              'Minimum verifiable monthly income of KSh 15,000',
              'Debt-to-Income (DTI) ratio must not exceed 50% including proposed loan',
              'Evidence of regular income flow (employment, business, or remittances)',
              'No active defaults listed on CRB at time of application',
              'Maximum of 5 concurrent active loans across all DCPs'
            ]
          },
          {
            title: '1.3 Documentation Requirements',
            content: 'The following documents must be collected and verified:',
            items: [
              'Clear copy of National ID or Passport (both sides)',
              'Recent passport photograph (taken within last 6 months)',
              'Proof of income (payslip, bank statement, or M-Pesa statement)',
              'Signed loan application form with declared information',
              'Consent form for CRB check and data processing'
            ]
          }
        ]
      },
      {
        id: 'interest-rates',
        title: '2. Interest Rates & Pricing',
        content: 'Interest rate structure compliant with CBK guidelines on responsible lending.',
        subsections: [
          {
            title: '2.1 Interest Rate Bands',
            content: 'Risk-based pricing tiers based on credit assessment score:',
            items: [
              'Grade A+ (Score 800+): 8.5% - 12% per annum flat rate',
              'Grade A (Score 700-799): 12% - 15% per annum flat rate',
              'Grade B+ (Score 600-699): 15% - 18% per annum flat rate',
              'Grade B (Score 500-599): 18% - 22% per annum flat rate',
              'Grade C (Score 400-499): 22% - 27% per annum flat rate',
              'Grade D/E (Score <400): Case-by-case review, up to regulatory cap'
            ]
          },
          {
            title: '2.2 Fees & Charges',
            content: 'Permissible fees as per CBK DCP Regulations 2024:',
            items: [
              'Processing Fee: Maximum 2.5% of loan amount (one-time)',
              'Credit Life Insurance: Optional, maximum 1% of loan amount',
              'Late Payment Penalty: Maximum 2% of outstanding balance per month',
              'No hidden charges, rescheduling fees, or early repayment penalties',
              'All fees must be clearly disclosed before loan disbursement'
            ]
          },
          {
            title: '2.3 APR Calculation',
            content: 'Annual Percentage Rate (APR) must be displayed prominently:',
            items: [
              'APR includes interest, processing fee, and any mandatory charges',
              'APR example must be provided for each loan product',
              'Comparison rate based on KSh 10,000 over 30 days to be shown',
              'Total cost of credit disclosure mandatory before acceptance'
            ]
          }
        ]
      },
      {
        id: 'collateral',
        title: '3. Collateral Requirements',
        content: 'Unsecured lending policy with alternative security arrangements.',
        subsections: [
          {
            title: '3.1 Unsecured Lending Limits',
            content: 'Maximum exposure without physical collateral:',
            items: [
              'New customers (first loan): Maximum KSh 25,000',
              'Customers with good repayment history (3+ loans): Up to KSh 100,000',
              'Premium customers (12+ months, zero defaults): Up to KSh 250,000',
              'All unsecured limits subject to income verification and DTI compliance'
            ]
          },
          {
            title: '3.2 Digital Collateral Alternatives',
            content: 'Non-traditional security accepted for enhanced limits:',
            items: [
              'M-Pesa float/limit as behavioral collateral indicator',
              'Savings mobilization (lock savings as partial security)',
              'Guarantor commitment (verifiable via phone confirmation)',
              'Airtime/data bundle purchase history as stability indicator',
              'Bill payment consistency (KPLC, water, pay-TV) as character reference'
            ]
          },
          {
            title: '3.3 Security for Higher Amounts',
            content: 'For amounts exceeding standard unsecured limits:',
            items: [
              'Motor vehicle logbook (valuation required, max 70% LTV)',
              'Title deed (urban property only, valuation required, max 60% LTV)',
              'Business inventory (for SME products, stock inspection required)',
              'Equipment/machinery (depreciated value considered)'
            ]
          }
        ]
      },
      {
        id: 'exceptions',
        title: '4. Exceptions Process',
        content: 'Structured approval workflow for policy exceptions.',
        subsections: [
          {
            title: '4.1 Exception Categories',
            content: 'Types of deviations requiring approval:',
            items: [
              'Policy Exception: Deviation from standard eligibility criteria',
              'Pricing Exception: Rate outside approved band for risk grade',
              'Limit Exception: Amount exceeding automated approval threshold',
              'Documentation Exception: Accepting alternative verification methods',
              'Waiver Exception: Fee waiver or modification requests'
            ]
          },
          {
            title: '4.2 Approval Authority Matrix',
            content: 'Delegation of approval authority by exception type:',
            items: [
              'Credit Analyst: Minor documentation waivers only',
              'Team Leader: Exceptions up to KSh 10,000 impact or 2% pricing variance',
              'Branch Manager: Exceptions up to KSh 50,000 impact or 5% variance',
              'Head of Credit: Exceptions up to KSh 200,000 impact or 10% variance',
              'Credit Committee: All exceptions above Branch Manager authority',
              'CEO/Board: Material policy changes and systemic exceptions'
            ]
          },
          {
            title: '4.3 Exception Documentation',
            content: 'Required documentation for all approved exceptions:',
            items: [
              'Completed exception request form with business justification',
              'Risk assessment of exception impact',
              'Compensating controls identified and implemented',
              'Approval signature per authority matrix',
              'Post-disbursement monitoring plan',
              'Quarterly exception reporting to Board Risk Committee'
            ]
          }
        ]
      }
    ],
    changeLog: [
      {
        version: '2.1',
        date: new Date('2025-12-20'),
        changes: [
          'Updated DTI limit from 45% to 50% per new CBK guidance',
          'Added M-Pesa age requirement clarification',
          'Revised Grade A+ interest floor from 9% to 8.5%',
          'Added digital collateral alternatives section'
        ],
        author: 'Mary Wanjiku, CRO'
      },
      {
        version: '2.0',
        date: new Date('2025-07-01'),
        changes: [
          'Major revision for CBK DCP Regulations 2024 compliance',
          'Introduced risk-based pricing bands',
          'Added APR disclosure requirements',
          'Restructured exceptions process'
        ],
        author: 'James Ochieng, Head of Credit'
      },
      {
        version: '1.5',
        date: new Date('2025-01-15'),
        changes: [
          'Added guarantor requirements for loans > KSh 50k',
          'Updated CRB clearance period from 6 to 3 months',
          'Introduced graduated interest rates'
        ],
        author: 'Peter Kamau, Credit Manager'
      }
    ]
  },
  // Previous Version (v2.0) - For comparison
  {
    id: 'POL-2025-002',
    name: 'Digital Lending Credit Policy',
    version: '2.0',
    status: 'archived',
    effectiveDate: new Date('2025-07-01'),
    lastUpdated: new Date('2025-06-25'),
    updatedBy: 'Head of Credit - James Ochieng',
    description: 'Previous version superseded by v2.1.',
    sections: [
      {
        id: 'lending-criteria-old',
        title: '1. Lending Criteria & Eligibility',
        content: 'Previous version of lending criteria.',
        subsections: [
          {
            title: '1.2 Financial Requirements',
            content: 'Previous financial requirements (DTI was 45%):',
            items: [
              'Minimum verifiable monthly income of KSh 15,000',
              'Debt-to-Income (DTI) ratio must not exceed 45% including proposed loan',
              'Evidence of regular income flow (employment, business, or remittances)',
              'No active defaults listed on CRB at time of application',
              'Maximum of 5 concurrent active loans across all DCPs'
            ]
          }
        ]
      },
      {
        id: 'interest-rates-old',
        title: '2. Interest Rates & Pricing',
        content: 'Previous interest rate structure.',
        subsections: [
          {
            title: '2.1 Interest Rate Bands',
            content: 'Previous pricing tiers:',
            items: [
              'Grade A+ (Score 800+): 9% - 13% per annum flat rate',
              'Grade A (Score 700-799): 13% - 16% per annum flat rate',
              'Grade B+ (Score 600-699): 16% - 19% per annum flat rate',
              'Grade B (Score 500-599): 19% - 23% per annum flat rate',
              'Grade C (Score 400-499): 23% - 28% per annum flat rate'
            ]
          }
        ]
      }
    ]
  }
]

// Status configurations
const statusConfig = {
  draft: { 
    label: 'Draft', 
    icon: <Edit3 className="w-4 h-4" />,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400',
    description: 'In development, not yet submitted for review'
  },
  under_review: { 
    label: 'Under Review', 
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-400',
    description: 'Pending approval from stakeholders'
  },
  active: { 
    label: 'Active', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-400',
    description: 'Currently in force and operational'
  },
  archived: { 
    label: 'Archived', 
    icon: <Archive className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-400',
    description: 'Superseded by newer version'
  }
}

export function CreditPolicyViewer() {
  const [selectedVersion, setSelectedVersion] = useState<string>('POL-2026-001')
  const [selectedSection, setSelectedSection] = useState<string>('lending-criteria')
  const [showComparison, setShowComparison] = useState(false)
  const [compareWithVersion, setCompareWithVersion] = useState<string>('POL-2025-002')

  const currentPolicy = policyVersions.find(p => p.id === selectedVersion) || policyVersions[0]
  const comparePolicy = showComparison 
    ? policyVersions.find(p => p.id === compareWithVersion)
    : null

  const currentStatus = statusConfig[currentPolicy.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            Credit Policy Viewer
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and manage credit policies for Kenyan DCP operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button 
            variant={showComparison ? "default" : "outline"} 
            size="sm" 
            onClick={() => setShowComparison(!showComparison)}
            className={showComparison ? "bg-emerald-600 hover:bg-emerald-700" : "dark:border-slate-700 dark:hover:bg-slate-800"}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Compare Versions
          </Button>
        </div>
      </div>

      {/* Policy Info Bar */}
      <Card className={`border-2 ${currentStatus.color}`}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={currentStatus.color.replace('border-', 'bg-').split(' ').slice(0, 2).join(' ') + ' p-3 rounded-xl'}>
                {currentStatus.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold">{currentPolicy.name}</h3>
                <p className="text-sm opacity-80">{currentPolicy.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <p className="text-xs opacity-70">Version</p>
                <p className="font-bold">v{currentPolicy.version}</p>
              </div>
              <div className="text-center">
                <p className="text-xs opacity-70">Status</p>
                <Badge className={`${currentStatus.color} font-semibold`}>
                  {currentStatus.icon}
                  <span className="ml-1">{currentStatus.label}</span>
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-xs opacity-70">Effective</p>
                <p className="font-medium">{currentPolicy.effectiveDate.toLocaleDateString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs opacity-70">Last Updated</p>
                <p className="font-medium">{currentPolicy.lastUpdated.toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1 dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Policy Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1 px-2 pb-4">
              {currentPolicy.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between group ${
                    selectedSection === section.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {section.id === 'lending-criteria' && <Scale className="w-4 h-4" />}
                    {section.id === 'interest-rates' && <FileText className="w-4 h-4" />}
                    {section.id === 'collateral' && <Shield className="w-4 h-4" />}
                    {section.id === 'exceptions' && <HelpCircle className="w-4 h-4" />}
                    <span className="text-sm">{section.title.split('.')[1]?.trim() || section.title.split(':')[0]}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 ${selectedSection === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))}
            </nav>

            <Separator className="dark:bg-slate-700" />

            {/* Version Selector */}
            <div className="p-4 space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4" /> Version History
              </label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="w-full dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {policyVersions.map(policy => (
                    <SelectItem key={policy.id} value={policy.id}>
                      <div className="flex items-center gap-2">
                        <span>v{policy.version}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusConfig[policy.status].color}`}>
                          {statusConfig[policy.status].label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showComparison && (
                <>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-4">
                    Compare With
                  </label>
                  <Select value={compareWithVersion} onValueChange={setCompareWithVersion}>
                    <SelectTrigger className="w-full dark:bg-slate-800 dark:border-slate-600">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {policyVersions.filter(p => p.id !== selectedVersion).map(policy => (
                        <SelectItem key={policy.id} value={policy.id}>
                          v{policy.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Change Log Summary */}
            {currentPolicy.changeLog && (
              <div className="px-4 pb-4">
                <Separator className="dark:bg-slate-700 mb-4" />
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Recent Changes
                </h4>
                <ScrollArea className="h-[200px] pr-3">
                  <div className="space-y-3">
                    {currentPolicy.changeLog.slice(0, 3).map((log, idx) => (
                      <div key={idx} className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] dark:bg-slate-700 dark:text-slate-300">
                            v{log.version}
                          </Badge>
                          <span className="text-slate-500">{log.date.toLocaleDateString()}</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 pl-1">
                          {log.changes.slice(0, 2).map((change, cIdx) => (
                            <li key={cIdx}>{change}</li>
                          ))}
                          {log.changes.length > 2 && (
                            <li className="text-slate-400 italic">+{log.changes.length - 2} more...</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Comparison Mode Indicator */}
          {showComparison && comparePolicy && (
            <Card className="border-purple-300 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Comparing v{currentPolicy.version} with v{comparePolicy.version}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                  Exit Comparison
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section Content */}
          {currentPolicy.sections
            .filter(s => s.id === selectedSection || !selectedSection)
            .map(section => (
              <Card key={section.id} className="dark:bg-slate-800/50 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription className="mt-1">{section.content}</CardDescription>
                    </div>
                    <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-400">
                      <Eye className="w-3 h-3 mr-1" />
                      Section {currentPolicy.sections.indexOf(section) + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.subsections?.map((subsection, idx) => (
                    <div key={idx} className="space-y-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-emerald-600" />
                        {subsection.title}
                      </h4>
                      
                      {subsection.content && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {subsection.content}
                        </p>
                      )}
                      
                      {subsection.items && (
                        <ul className="space-y-2 ml-4">
                          {subsection.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-3 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span className="text-slate-700 dark:text-slate-300">{item}</span>
                              
                              {/* Show comparison diff if in comparison mode */}
                              {showComparison && comparePolicy && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-[10px] ml-auto flex-shrink-0"
                                >
                                  Current
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {idx < (section.subsections?.length || 0) - 1 && (
                        <Separator className="dark:bg-slate-700" />
                      )}
                    </div>
                  ))}

                  {/* Regulatory Reference Box */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <div className="flex items-start gap-3">
                      <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-sm text-blue-800 dark:text-blue-400">
                          Regulatory Reference
                        </h5>
                        <p className="text-xs text-blue-700 dark:text-blue-300/70 mt-1">
                          This policy is designed in accordance with:
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300/70 mt-2 space-y-1 list-disc list-inside">
                          <li>CBK Digital Credit Provider Regulations, 2024</li>
                          <li>Consumer Protection Act, 2012 (as amended)</li>
                          <li>Data Protection Act, 2019</li>
                          <li>Credit Reference Bureau Regulations, 2013</li>
                          <li>CBK Prudential Guidelines on Responsible Lending</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}

          {/* Policy Metadata */}
          <Card className="dark:bg-slate-800/50 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Document ID</p>
                  <p className="font-mono font-medium">{currentPolicy.id}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Classification</p>
                  <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">
                    Internal - Confidential
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Review Cycle</p>
                  <p>Quarterly / Ad-hoc</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Next Review</p>
                  <p>{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              
              <Separator className="dark:bg-slate-700 my-4" />

              <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Last updated by: {currentPolicy.updatedBy}</span>
                <span>•</span>
                <span>Approved by: Board Risk Committee</span>
                <span>•</span>
                <span>Owner: Chief Risk Officer</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export type { CreditPolicy, PolicySection }
