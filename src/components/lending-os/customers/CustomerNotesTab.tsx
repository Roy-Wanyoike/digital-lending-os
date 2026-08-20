'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { mockNotes } from './mock-data'
import type { CustomerNote } from './types'
import {
  Plus,
  Phone,
  Mail,
  User,
  Building2,
  MessageSquare,
  Pin,
  PinOff,
  Search,
  Filter,
  Clock,
  AtSign,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye
} from 'lucide-react'

interface CustomerNotesTabProps {
  customerId: string
  customerName: string
}

export function CustomerNotesTab({ customerId, customerName }: CustomerNotesTabProps) {
  const [notes, setNotes] = useState<CustomerNote[]>(mockNotes)
  const [newNoteType, setNewNoteType] = useState<string>('OTHER')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isInternal, setIsInternal] = useState(true)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get unique authors for filter
  const uniqueAuthors = useMemo(() => {
    return [...new Set(notes.map(note => note.authorName))].sort()
  }, [notes])

  // Filter notes - pinned notes always show first
  const filteredNotes = useMemo(() => {
    let filtered = notes.filter(note => {
      const matchesType = typeFilter === 'all' || note.type === typeFilter
      const matchesAuthor = authorFilter === 'all' || note.authorName === authorFilter
      const matchesSearch = searchQuery === '' ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesType && matchesAuthor && matchesSearch
    })

    // Sort: pinned first, then by date descending
    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [notes, typeFilter, authorFilter, searchQuery])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  const getNoteTypeIcon = (type: CustomerNote['type']) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-4 h-4" />
      case 'EMAIL':
        return <Mail className="w-4 h-4" />
      case 'VISIT':
        return <User className="w-4 h-4" />
      case 'SYSTEM':
        return <Building2 className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const getNoteTypeColor = (type: CustomerNote['type']) => {
    switch (type) {
      case 'CALL':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30'
      case 'EMAIL':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/30'
      case 'VISIT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/30'
      case 'SYSTEM':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600/30'
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/30'
    }
  }

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error('Please enter a note content')
      return
    }

    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      authorId: 'current-user',
      authorName: 'Current User',
      authorRole: 'Loan Officer',
      type: newNoteType as CustomerNote['type'],
      content: newNoteContent,
      isPrivate,
      isInternal,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mentions: []
    }

    setNotes(prev => [newNote, ...prev])
    setNewNoteContent('')
    setNewNoteType('OTHER')
    setIsPrivate(false)
    setIsInternal(true)
    
    toast.success('Note added successfully')
  }

  const handleTogglePin = (noteId: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    ))
  }

  // Mock staff members for @mention
  const staffMembers = [
    { id: 'staff-001', name: 'Jane Muthoni' },
    { id: 'staff-002', name: 'Peter Ochieng' },
    { id: 'staff-003', name: 'Sarah Kamau' },
    { id: 'staff-004', name: 'John Njoroge' },
    { id: 'staff-005', name: 'Mary Wanjiku' }
  ]

  const handleMention = (name: string) => {
    setNewNoteContent(prev => prev + `@${name} `)
    textareaRef.current?.focus()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Add Note Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Add New Note
          </CardTitle>
          <CardDescription>Record activity or notes about this customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Note Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Note Type</label>
            <Select value={newNoteType} onValueChange={setNewNoteType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Call
                  </span>
                </SelectItem>
                <SelectItem value="EMAIL">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </span>
                </SelectItem>
                <SelectItem value="VISIT">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Visit
                  </span>
                </SelectItem>
                <SelectItem value="SYSTEM">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> System
                  </span>
                </SelectItem>
                <SelectItem value="OTHER">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Other
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note Content */}
          <div>
            <label className="text-sm font-medium mb-2 block">Content</label>
            <Textarea
              ref={textareaRef}
              placeholder="Enter your note here... Use @ to mention staff members"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            
            {/* Mention Suggestions */}
            {newNoteContent.includes('@') && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <AtSign className="w-3 h-3" /> Mention someone:
                </p>
                <div className="flex flex-wrap gap-1">
                  {staffMembers.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => handleMention(staff.name)}
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-700 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors"
                    >
                      @{staff.name.replace(' ', '').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visibility Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="text-sm">Private (only visible to me)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-sm">Internal (not visible to customer)</span>
            </label>
          </div>

          {/* Attachments Placeholder */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <Paperclip className="w-6 h-6 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">Attach files (optional)</p>
            <Button variant="ghost" size="sm" className="mt-2">
              Browse Files
            </Button>
          </div>

          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleAddNote}
            disabled={!newNoteContent.trim()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Right Column - Notes Timeline */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Activity Notes
              </CardTitle>
              <CardDescription>{filteredNotes.length} notes • Internal CRM log</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full md:w-40"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="VISIT">Visit</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {uniqueAuthors.map(author => (
                    <SelectItem key={author} value={author}>{author}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[550px] pr-4">
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

              {filteredNotes.map((note) => (
                <div key={note.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Icon */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getNoteTypeColor(note.type)}`}>
                    {getNoteTypeIcon(note.type)}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-2 ${note.isPinned ? 'bg-amber-50 dark:bg-amber-950/10 -mx-2 px-2 py-2 rounded-lg' : ''}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {note.authorName}
                        </span>
                        <Badge className={`text-xs ${getNoteTypeColor(note.type)}`}>
                          {note.type.charAt(0) + note.type.slice(1).toLowerCase()}
                        </Badge>
                        <span className="text-xs text-slate-500">{note.authorRole}</span>
                        
                        {note.isPrivate && (
                          <Lock className="w-3.5 h-3.5 text-slate-400" title="Private note" />
                        )}
                        {note.isInternal && (
                          <Eye className="w-3.5 h-3.5 text-slate-400" title="Internal only" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTogglePin(note.id)}
                          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            note.isPinned ? 'text-amber-500' : 'text-slate-400'
                          }`}
                          title={note.isPinned ? 'Unpin note' : 'Pin note'}
                        >
                          {note.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {getRelativeTime(note.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Content - Collapsible */}
                    <div className="mt-2">
                      <p className={`text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap ${
                        expandedNote === note.id || note.content.length <= 150 ? '' : 'line-clamp-3'
                      }`}>
                        {note.content}
                      </p>
                      
                      {note.content.length > 150 && (
                        <button
                          onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 flex items-center gap-1"
                        >
                          {expandedNote === note.id ? (
                            <>Show less <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Show more <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Attachments */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Mentions */}
                    {note.mentions && note.mentions.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <AtSign className="w-3 h-3 text-slate-400" />
                        {note.mentions.map(mention => (
                          <Badge key={mention} variant="outline" className="text-xs">
                            @{mention}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(note.createdAt)}
                      {note.updatedAt !== note.createdAt && ' (edited)'}
                    </p>
                  </div>
                </div>
              ))}

              {filteredNotes.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No notes found.</p>
                  {(searchQuery || typeFilter !== 'all' || authorFilter !== 'all') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setSearchQuery('')
                        setTypeFilter('all')
                        setAuthorFilter('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerNotesTab
