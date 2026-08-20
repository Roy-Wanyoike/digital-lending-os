'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { mockKYCVerifications, mockKYCDocuments } from './mock-data'
import type { CustomerProfile, KYCVerification, KYCDocument } from './types'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  User,
  Phone,
  CreditCard,
  MapPin,
  Camera,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Star
} from 'lucide-react'

interface KYCIdentityTabProps {
  customer: CustomerProfile
}

export function KYCIdentityTab({ customer }: KYCIdentityTabProps) {
  const [documents, setDocuments] = useState<KYCDocument[]>(mockKYCDocuments)
  const [verifications, setVerifications] = useState<KYCVerification[]>(mockKYCVerifications)
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null)

  // Calculate KYC completion percentage
  const completedCount = verifications.filter(v => v.status === 'VERIFIED').length
  const totalCount = verifications.length
  const kycCompletionPercentage = Math.round((completedCount / totalCount) * 100)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getVerificationIcon = (type: KYCVerification['type']) => {
    switch (type) {
      case 'NATIONAL_ID':
        return <FileText className="w-5 h-5" />
      case 'MPESA_VERIFICATION':
        return <Phone className="w-5 h-5" />
      case 'CRB_STATUS':
        return <CreditCard className="w-5 h-5" />
      case 'FACE_RECOGNITION':
        return <Camera className="w-5 h-5" />
      case 'ADDRESS_VERIFICATION':
        return <MapPin className="w-5 h-5" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const getVerificationTitle = (type: KYCVerification['type']) => {
    switch (type) {
      case 'NATIONAL_ID':
        return 'National ID Verification'
      case 'MPESA_VERIFICATION':
        return 'M-Pesa Verification'
      case 'CRB_STATUS':
        return 'CRB Status Check'
      case 'FACE_RECOGNITION':
        return 'Face Recognition'
      case 'ADDRESS_VERIFICATION':
        return 'Address Verification'
      default:
        return 'Verification'
    }
  }

  const getStatusBadge = (status: KYCVerification['status'] | KYCDocument['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        )
      case 'FAILED':
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-0 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {status === 'FAILED' ? 'Failed' : 'Rejected'}
          </Badge>
        )
      case 'UNVERIFIED':
        return (
          <Badge variant="outline" className="border-slate-300 dark:border-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Unverified
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusColor = (status: KYCVerification['status']) => {
    switch (status) {
      case 'VERIFIED':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30'
      case 'PENDING':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/30'
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800/30'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800/30 dark:border-slate-700/30'
    }
  }

  const getDocumentTypeIcon = (type: KYCDocument['type']) => {
    switch (type) {
      case 'ID_FRONT':
      case 'ID_BACK':
        return <FileText className="w-8 h-8 text-slate-400" />
      case 'SELFIE':
        return <User className="w-8 h-8 text-slate-400" />
      case 'PROOF_OF_ADDRESS':
        return <MapPin className="w-8 h-8 text-slate-400" />
      default:
        return <ImageIcon className="w-8 h-8 text-slate-400" />
    }
  }

  const getDocumentTypeName = (type: KYCDocument['type']) => {
    switch (type) {
      case 'ID_FRONT': return 'ID Front'
      case 'ID_BACK': return 'ID Back'
      case 'SELFIE': return 'Selfie Photo'
      case 'PROOF_OF_ADDRESS': return 'Proof of Address'
      default: return 'Document'
    }
  }

  const handleVerifyDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'VERIFIED' as const, verifiedBy: 'Current User', verifiedAt: new Date().toISOString() }
        : doc
    ))
    toast.success('Document verified successfully')
  }

  const handleRejectDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'REJECTED' as const, rejectionReason: 'Document unclear or invalid', verifiedBy: 'Current User', verifiedAt: new Date().toISOString() }
        : doc
    ))
    toast.error('Document rejected')
  }

  const handleRecheckVerification = (verificationId: string) => {
    toast.info('Initiating re-check for this verification...')
  }

  return (
    <div className="space-y-6">
      {/* KYC Completion Overview */}
      <Card className="border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-200 dark:border-emerald-800 flex items-center justify-center bg-white dark:bg-slate-900">
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{kycCompletionPercentage}%</span>
                </div>
                <div className="absolute inset-0 w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-emerald-200 dark:text-emerald-900"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${kycCompletionPercentage * 2.89} 289`}
                      className="text-emerald-500 dark:text-emerald-500"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">KYC Completion Status</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {completedCount} of {totalCount} verifications completed
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {kycCompletionPercentage === 100 ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Fully Verified
                    </Badge>
                  ) : kycCompletionPercentage >= 80 ? (
                    <Badge className="bg-blue-100 text-blue-800 border-0 dark:bg-blue-900/40 dark:text-blue-400">
                      <Star className="w-3 h-3 mr-1" />
                      Nearly Complete
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/40 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="hidden md:block w-64">
              <Progress value={kycCompletionPercentage} className="h-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right">
                {totalCount - completedCount} remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identity Verifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Identity Verifications
            </CardTitle>
            <CardDescription>Customer identity verification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifications.map((verification) => (
              <div 
                key={verification.id}
                className={`p-4 rounded-lg border ${getStatusColor(verification.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      verification.status === 'VERIFIED' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      verification.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {getVerificationIcon(verification.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-900 dark:text-white">
                        {getVerificationTitle(verification.type)}
                      </h4>
                      
                      {/* Type-specific details */}
                      {verification.data && (
                        <div className="mt-2 space-y-1">
                          {verification.type === 'NATIONAL_ID' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ID: ****{String(verification.data.maskedNumber || '').slice(-4)}
                            </p>
                          )}
                          {verification.type === 'MPESA_VERIFICATION' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Phone matched: {(verification.data.registeredName as string) || 'Yes'}
                            </p>
                          )}
                          {verification.type === 'CRB_STATUS' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Status: <span className={verification.data.status === 'CLEAN' ? 'text-emerald-600' : 'text-red-600'}>
                                {verification.data.status as string}
                              </span>
                              {' • Checked: '}
                              {new Date(verification.data.lastChecked as string || '').toLocaleDateString('en-KE')}
                            </p>
                          )}
                          {verification.type === 'FACE_RECOGNITION' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Confidence: {(verification.data.confidenceScore as number)?.toFixed(1)}% • Liveness: {(verification.data.livenessDetected as boolean) ? 'Detected' : 'Not detected'}
                            </p>
                          )}
                        </div>
                      )}

                      {verification.verifiedAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          Verified: {formatDate(verification.verifiedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(verification.status)}
                    
                    {verification.status !== 'VERIFIED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecheckVerification(verification.id)}
                        className="h-7 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Re-check
                      </Button>
                    )}
                  </div>
                </div>

                {verification.details && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-12">
                    {verification.details}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Document Uploads Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  KYC Documents
                </CardTitle>
                <CardDescription>Uploaded identity documents</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="dark:border-slate-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {documents.map((document) => (
                <div 
                  key={document.id}
                  className={`relative group border rounded-lg overflow-hidden transition-all hover:shadow-md ${
                    document.status === 'VERIFIED' ? 'border-emerald-200 dark:border-emerald-800/30' :
                    document.status === 'REJECTED' ? 'border-red-200 dark:border-red-800/30' :
                    'border-slate-200 dark:border-slate-700/50'
                  }`}
                >
                  {/* Document Thumbnail Placeholder */}
                  <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                    {getDocumentTypeIcon(document.type)}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => setSelectedDoc(document)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{document.fileName}</DialogTitle>
                          </DialogHeader>
                          <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                            {getDocumentTypeIcon(document.type)}
                            <p className="absolute text-sm text-slate-500">Preview not available</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="secondary">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Status Badge on thumbnail */}
                    <div className="absolute top-2 right-2">
                      {document.status === 'VERIFIED' ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      ) : document.status === 'REJECTED' ? (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : null}
                    </div>

                    {/* Liveness score for selfie */}
                    {document.type === 'SELFIE' && document.livenessScore && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                          Liveness: {document.livenessScore}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Document Info */}
                  <div className="p-3">
                    <p className="font-medium text-sm truncate text-slate-900 dark:text-white">
                      {getDocumentTypeName(document.type)}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{document.fileName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">{formatFileSize(document.fileSize)}</span>
                      {getStatusBadge(document.status)}
                    </div>

                    {/* Action buttons for staff */}
                    {document.status !== 'VERIFIED' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs dark:border-slate-700"
                          onClick={() => handleVerifyDocument(document.id)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-950/20"
                          onClick={() => handleRejectDocument(document.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default KYCIdentityTab
