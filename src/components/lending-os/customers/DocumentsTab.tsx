'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { mockDocuments } from './mock-data'
import type { DocumentFile } from './types'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Grid3X3,
  List,
  CheckCircle2,
  Clock,
  Shield,
  FolderOpen,
  X
} from 'lucide-react'

interface DocumentsTabProps {
  customerId: string
}

export function DocumentsTab({ customerId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(mockDocuments)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get file icon based on file type
  const getFileIcon = (fileType: string, className = 'w-8 h-8') => {
    if (fileType.startsWith('image/')) return <ImageIcon className={`${className} text-blue-500`} />
    if (fileType === 'application/pdf') return <FileText className={`${className} text-red-500`} />
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className={`${className} text-emerald-500`} />
    return <File className={`${className} text-slate-400`} />
  }

  const getCategoryIcon = (category: DocumentFile['category']) => {
    switch (category) {
      case 'KYC_DOCUMENTS':
        return <Shield className="w-4 h-4" />
      case 'LOAN_APPLICATIONS':
        return <FileText className="w-4 h-4" />
      case 'CONTRACTS':
        return <FileText className="w-4 h-4" />
      case 'CORRESPONDENCE':
        return <FolderOpen className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: DocumentFile['category']) => {
    switch (category) {
      case 'KYC_DOCUMENTS': return 'KYC Documents'
      case 'LOAN_APPLICATIONS': return 'Loan Applications'
      case 'CONTRACTS': return 'Contracts'
      case 'CORRESPONDENCE': return 'Correspondence'
      default: return 'Other'
    }
  }

  const getCategoryColor = (category: DocumentFile['category']) => {
    switch (category) {
      case 'KYC_DOCUMENTS':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/30'
      case 'LOAN_APPLICATIONS':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30'
      case 'CONTRACTS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/30'
      case 'CORRESPONDENCE':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/30'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/30'
    }
  }

  const getStatusBadge = (status: DocumentFile['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </Badge>
        )
      case 'UNVERIFIED':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Unverified
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
      const matchesSearch = searchQuery === '' ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesCategory && matchesSearch
    })
  }, [documents, categoryFilter, searchQuery])

  // Group by category for stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    documents.forEach(doc => {
      stats[doc.category] = (stats[doc.category] || 0) + 1
    })
    return stats
  }, [documents])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      toast.success(`${files.length} file(s) ready for upload`)
      // In real app, would upload files here
    }
  }, [])

  // Handle delete document
  const handleDeleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId))
    toast.success('Document deleted successfully')
  }

  // Handle download
  const handleDownload = (doc: DocumentFile) => {
    toast.success(`Downloading ${doc.name}`)
  }

  // Categories for filter
  const categories = ['KYC_DOCUMENTS', 'LOAN_APPLICATIONS', 'CONTRACTS', 'CORRESPONDENCE']

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Document Repository</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredDocuments.length} of {documents.length} documents
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* View Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className={`rounded-none ${viewMode === 'grid' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className={`rounded-none rounded-r-md ${viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
              </DialogHeader>
              
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-emerald-500' : 'text-slate-400'}`} />
                <p className="font-medium text-slate-900 dark:text-white mb-1">
                  Drag & drop your files here
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  or click to browse from your computer
                </p>
                <Input
                  type="file"
                  multiple
                  className="max-w-xs mx-auto"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      toast.success(`${e.target.files.length} file(s) selected`)
                    }
                  }}
                />
                <p className="text-xs text-slate-400 mt-4">
                  Supported formats: PDF, JPG, PNG, DOC, DOCX • Max 10MB per file
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setIsUploadDialogOpen(false)
                    toast.success('Document uploaded successfully!')
                  }}
                >
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              categoryFilter === category
                ? getCategoryColor(category)
                : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{getCategoryLabel(category)}</span>
              <span className="text-lg font-bold">{categoryStats[category] || 0}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{getCategoryLabel(cat as DocumentFile['category'])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <Card 
              key={doc.id} 
              className="group overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail Area */}
              <div 
                className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer relative"
                onClick={() => setPreviewDoc(doc)}
              >
                {getFileIcon(doc.fileType, 'w-12 h-12')}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                {/* Category Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={`text-[10px] px-1.5 py-0 ${getCategoryColor(doc.category)}`}>
                    {getCategoryLabel(doc.category).split(' ')[0]}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate text-slate-900 dark:text-white" title={doc.name}>
                  {doc.name}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{formatFileSize(doc.fileSize)}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs text-slate-400">{formatDate(doc.uploadedAt)}</span>
                  
                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{doc.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                {/* Uploader info */}
                <p className="text-xs text-slate-400 mt-1">
                  Uploaded by {doc.uploadedBy}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[450px]">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Name</th>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Category</th>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Size</th>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Uploaded</th>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Uploader</th>
                    <th className="text-left p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-right p-4 font-medium text-sm text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.fileType, 'w-5 h-5')}
                          <span className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[200px]">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-xs ${getCategoryColor(doc.category)}`}>
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-500">{formatFileSize(doc.fileSize)}</td>
                      <td className="p-4 text-sm text-slate-500">{formatDate(doc.uploadedAt)}</td>
                      <td className="p-4 text-sm text-slate-500">{doc.uploadedBy}</td>
                      <td className="p-4">{getStatusBadge(doc.status)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{doc.name}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Try adjusting your filters or search query.'
                : 'No documents have been uploaded yet.'}
            </p>
            {(searchQuery || categoryFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && getFileIcon(previewDoc.fileType, 'w-5 h-5')}
              {previewDoc?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewDoc && (
            <div className="space-y-4">
              {/* Preview Area */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                {getFileIcon(previewDoc.fileType, 'w-20 h-20')}
                <p className="absolute text-sm text-slate-500">Preview not available</p>
              </div>

              {/* Document Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Size</p>
                  <p className="font-medium">{formatFileSize(previewDoc.fileSize)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="font-medium capitalize">{previewDoc.fileType.split('/')[1]?.toUpperCase() || previewDoc.fileType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Uploaded</p>
                  <p className="font-medium">{formatDate(previewDoc.uploadedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  {getStatusBadge(previewDoc.status)}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleDownload(previewDoc)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentsTab
