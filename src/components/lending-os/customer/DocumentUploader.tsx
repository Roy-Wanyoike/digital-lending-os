'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  File,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react'

// Types
export interface UploadedDocument {
  type: string
  name: string
  size: number
  url?: string
  uploaded: boolean
  progress?: number
}

interface DocumentTypeConfig {
  type: string
  label: string
  required: boolean
  icon: string
}

interface DocumentUploaderProps {
  documents: UploadedDocument[]
  onDocumentsChange: (documents: UploadedDocument[]) => void
  requiredDocuments: DocumentTypeConfig[]
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}

const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'image/webp'
]

const MAX_FILE_SIZE = 10 // MB

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />
  if (mimeType.includes('pdf')) return <FileText className="w-5 h-5" />
  return <File className="w-5 h-5" />
}

export function DocumentUploader({
  documents,
  onDocumentsChange,
  requiredDocuments,
  maxFileSize = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_FILE_TYPES
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [activeDocType, setActiveDocType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File too large. Maximum size is ${maxFileSize}MB`
    }
    return null
  }

  // Handle file upload with simulated progress
  const handleFileUpload = useCallback(async (
    file: File,
    docType: string
  ) => {
    // Validate file inline to avoid dependency issues
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Accepted types: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`)
      return
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      alert(`File too large. Maximum size is ${maxFileSize}MB`)
      return
    }

    // Create new document entry
    const newDoc: UploadedDocument = {
      type: docType,
      name: file.name,
      size: file.size,
      uploaded: false,
      progress: 0
    }

    // Remove existing document of same type
    const filteredDocs = documents.filter(d => d.type !== docType)
    const updatedDocs = [...filteredDocs, newDoc]
    onDocumentsChange(updatedDocs)

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      onDocumentsChange(prev =>
        prev.map(d =>
          d.type === docType ? { ...d, progress, url: URL.createObjectURL(file) } : d
        )
      )
    }

    // Mark as complete
    onDocumentsChange(prev =>
      prev.map(d =>
        d.type === docType ? { ...d, uploaded: true, progress: 100 } : d
      )
    )
  }, [documents, onDocumentsChange, acceptedTypes, maxFileSize])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (!activeDocType) {
      alert('Please select a document type first')
      return
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0], activeDocType)
    }
  }, [activeDocType, handleFileUpload])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && activeDocType) {
      handleFileUpload(files[0], activeDocType)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [activeDocType, handleFileUpload])

  // Remove document
  const removeDocument = useCallback((docType: string) => {
    onDocumentsChange(documents.filter(d => d.type !== docType))
  }, [documents, onDocumentsChange])

  // Preview document
  const previewDocument = (doc: UploadedDocument) => {
    if (doc.url) {
      setPreviewUrl(doc.url)
    }
  }

  return (
    <div className="space-y-6">
      {/* Document Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requiredDocuments.map(docType => {
          const existingDoc = documents.find(d => d.type === docType.type)
          const isActive = activeDocType === docType.type

          return (
            <Card
              key={docType.type}
              className={`cursor-pointer transition-all ${
                isActive
                  ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : existingDoc?.uploaded
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200'
                  : 'hover:border-emerald-300'
              } ${!existingDoc && docType.required ? 'border-dashed' : ''}`}
              onClick={() => setActiveDocType(docType.type)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{docType.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{docType.label}</p>
                    {docType.required && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
                
                {existingDoc?.uploaded ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : existingDoc && !existingDoc.uploaded ? (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upload Area */}
      {activeDocType && (
        <Card
          className={`border-2 transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-dashed hover:border-emerald-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              
              <div>
                <p className="font-medium">Drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse your computer
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                id={`file-upload-${activeDocType}`}
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Choose File
              </Button>

              <p className="text-xs text-muted-foreground">
                Accepted formats: JPEG, PNG, PDF, WebP • Max size: {maxFileSize}MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Uploaded Documents</h4>
          
          {documents.map(doc => {
            const docConfig = requiredDocuments.find(d => d.type === doc.type)
            
            return (
              <Card key={doc.type} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getFileIcon(doc.url ? 'image/jpeg' : 'application/pdf')}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{docConfig?.label}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                      
                      {/* Progress bar for uploading */}
                      {!doc.uploaded && doc.progress !== undefined && (
                        <Progress value={doc.progress} className="h-1 mt-2" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {doc.uploaded && doc.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => previewDocument(doc)}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {doc.uploaded ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocument(doc.type)}
                        title="Remove"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
              <X className="w-6 h-6" />
            </Button>
            <img
              src={previewUrl}
              alt="Document preview"
              className="max-h-[85vh] mx-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Validation Messages */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
          <li>Ensure all documents are clear and readable</li>
          <li>Files must be in JPG, PNG, or PDF format</li>
          <li>Maximum file size is {maxFileSize}MB per document</li>
          <li>Required documents are marked with an asterisk (*)</li>
        </ul>
      </div>
    </div>
  )
}
