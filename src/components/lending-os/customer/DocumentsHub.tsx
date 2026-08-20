'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Shield,
  Calendar,
  HardDrive
} from 'lucide-react'
import { DocumentUploader } from './DocumentUploader'

// Types
interface UploadedDocument {
  id: string
  type: string
  typeName: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
  verifiedAt?: string
  expiryDate?: string
  url?: string
  required: boolean
}

interface DocumentsHubProps {
  documents?: UploadedDocument[]
}

// Mock data
const mockDocuments: UploadedDocument[] = [
  {
    id: '1',
    type: 'NATIONAL_ID',
    typeName: 'National ID',
    fileName: 'national_id_front.jpg',
    fileSize: 2450000,
    mimeType: 'image/jpeg',
    uploadedAt: '2026-07-15T10:30:00Z',
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-07-15T14:22:00Z',
    expiryDate: '2036-05-15T23:59:59Z',
    url: '#',
    required: true
  },
  {
    id: '2',
    type: 'KRA_PIN_CERTIFICATE',
    typeName: 'KRA PIN Certificate',
    fileName: 'kra_pin_certificate.pdf',
    filesize: 890000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-07-15T11:45:00Z',
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-07-16T09:15:00Z',
    required: true
  },
  {
    id: '3',
    type: 'PASSPORT_PHOTO',
    typeName: 'Passport Photo',
    fileName: 'passport_photo.png',
    fileSize: 1200000,
    mimeType: 'image/png',
    uploadedAt: '2026-08-01T16:20:00Z',
    verificationStatus: 'PENDING',
    required: true
  },
  {
    id: '4',
    type: 'PAYSLIP',
    typeName: 'Recent Payslip (Latest)',
    fileName: 'payslip_july_2026.pdf',
    fileSize: 340000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-08-05T09:00:00Z',
    verificationStatus: 'PENDING',
    required: false
  },
  {
    id: '5',
    type: 'BANK_STATEMENT',
    typeName: 'Bank Statement (3 months)',
    fileName: 'bank_statement_may_jul.pdf',
    fileSize: 2100000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-06-20T14:30:00Z',
    verificationStatus: 'REJECTED',
    required: false
  }
]

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

// Status badge component
function VerificationBadge({ status }: { status: UploadedDocument['verificationStatus'] }) {
  const config = {
    PENDING: {
      icon: <Clock className="w-4 h-4 animate-pulse" />,
      label: 'Pending Review',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    },
    VERIFIED: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Verified',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    REJECTED: {
      icon: <XCircle className="w-4 h-4" />,
      label: 'Rejected',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800'
    },
    EXPIRED: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Expired',
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800'
    }
  }

  const { icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  )
}

// Document type icon
function getDocumentIcon(type: string) {
  switch (type) {
    case 'NATIONAL_ID':
      return '🆔'
    case 'KRA_PIN_CERTIFICATE':
      return '📄'
    case 'PASSPORT_PHOTO':
      return '👤'
    case 'PAYSLIP':
      return '📊'
    case 'BANK_STATEMENT':
      return '🏦'
    case 'BUSINESS_REGISTRATION':
      return '🏢'
    default:
      return '📋'
  }
}

export function DocumentsHub({ documents = mockDocuments }: DocumentsHubProps) {
  const [localDocuments, setLocalDocuments] = useState(documents)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Calculate stats
  const totalDocs = localDocuments.length
  const verifiedDocs = localDocuments.filter(d => d.verificationStatus === 'VERIFIED').length
  const pendingDocs = localDocuments.filter(d => d.verificationStatus === 'PENDING').length
  const rejectedDocs = localDocuments.filter(d => d.verificationStatus === 'REJECTED').length
  const completionPercent = (verifiedDocs / localDocuments.filter(d => d.required).length) * 100

  // Required documents that are missing or not verified
  const requiredMissing = localDocuments.filter(
    d => d.required && d.verificationStatus !== 'VERIFIED'
  )

  // Handle document delete
  const handleDelete = (docId: string) => {
    setLocalDocuments(prev => prev.filter(d => d.id !== docId))
  }

  // Handle re-upload for rejected docs
  const handleReupload = (docType: string) => {
    setSelectedDocType(docType)
    setShowUploadModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Document Hub</h2>
          <p className="text-muted-foreground mt-1">
            Manage your KYC documents and verification status
          </p>
        </div>

        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDocs}</p>
              <p className="text-xs text-muted-foreground">Total Docs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifiedDocs}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDocs}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedDocs}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">KYC Verification Progress</span>
            </div>
            <span className="font-bold text-emerald-600">{Math.round(completionPercent)}%</span>
          </div>
          
          <Progress value={completionPercent} className="h-3 mb-3" />
          
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {verifiedDocs} of {localDocuments.filter(d => d.required).length} required documents verified
            {requiredMissing.length > 0 && (
              <span> • {requiredMissing.length} still needed</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <Card className="border-dashed border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Document
            </CardTitle>
            <CardDescription>Select a document type and upload your file</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              documents={[]}
              onDocumentsChange={() => {}}
              requiredDocuments={[
                { type: 'NATIONAL_ID', label: 'National ID', required: true, icon: '🆔' },
                { type: 'KRA_PIN_CERTIFICATE', label: 'KRA PIN Certificate', required: true, icon: '📄' },
                { type: 'PASSPORT_PHOTO', label: 'Passport Photo', required: true, icon: '👤' },
                { type: 'PAYSLIP', label: 'Payslip', required: false, icon: '📊' },
                { type: 'BANK_STATEMENT', label: 'Bank Statement', required: false, icon: '🏦' }
              ]}
            />
            
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowUploadModal(false)} className="gap-2">
                <Upload className="w-4 h-4" />
                Complete Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>All uploaded documents and their verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localDocuments.map((doc) => (
            <div 
              key={doc.id}
              className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                doc.verificationStatus === 'REJECTED' ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10' :
                doc.verificationStatus === 'PENDING' ? 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10' :
                ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Icon & Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Document Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                    doc.verificationStatus === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/50' :
                    doc.verificationStatus === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/50' :
                    'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {getDocumentIcon(doc.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{doc.typeName}</h4>
                      {doc.required && (
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                          Required
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.fileName}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(doc.fileSize)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Uploaded {formatDateShort(doc.uploadedAt)}
                      </span>
                      {doc.expiryDate && (
                        <span className="flex items-center gap-1">
                          Expires: {formatDate(doc.expiryDate)}
                        </span>
                      )}
                    </div>

                    {/* Rejection reason */}
                    {doc.verificationStatus === 'REJECTED' && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
                        <strong>Reason:</strong> Document is unclear or expired. Please re-upload a clear copy.
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <VerificationBadge status={doc.verificationStatus} />
                  
                  <div className="flex items-center gap-1">
                    {doc.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Preview"
                        onClick={() => setPreviewUrl(doc.url)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    {doc.verificationStatus === 'REJECTED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Re-upload"
                        onClick={() => handleReupload(doc.type)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {!doc.required && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {localDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-lg mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by uploading your KYC documents to verify your identity
              </p>
              <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Your First Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-slate-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Document Security</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Your documents are encrypted and stored securely. They are only used for 
                  KYC verification purposes and are never shared with third parties.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Learn More
              </Button>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewUrl(null)}
            >
              ✕
            </Button>
            <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-[85vh] mx-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsHub
