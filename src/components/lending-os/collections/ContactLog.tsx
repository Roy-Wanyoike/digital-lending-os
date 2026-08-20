'use client'

import { cn } from '@/lib/utils'
import {
  Phone,
  PhoneOff,
  MessageSquare,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck
} from 'lucide-react'
import type { ContactAttempt } from './types'

interface ContactLogProps {
  contacts: ContactAttempt[]
  loanId?: string
}

// Extended contact type for display
interface ContactDisplay extends ContactAttempt {
  displayName?: string
}

export function ContactLog({ contacts, loanId }: ContactLogProps) {
  // Get icon based on contact method
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'call':
        return Phone
      case 'sms':
        return MessageSquare
      case 'whatsapp':
        return MessageSquare
      case 'email':
        return Mail
      default:
        return Phone
    }
  }

  // Get method color
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'call':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
      case 'sms':
        return 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
      case 'whatsapp':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
      case 'email':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  // Get outcome icon and styling
  const getOutcomeConfig = (outcome: string) => {
    switch (outcome) {
      case 'reached':
        return {
          icon: CheckCircle2,
          label: 'Reached',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30'
        }
      case 'no_answer':
        return {
          icon: PhoneOff,
          label: 'No Answer',
          color: 'text-slate-500',
          bg: 'bg-slate-50 dark:bg-slate-900/30'
        }
      case 'busy':
        return {
          icon: Clock,
          label: 'Busy',
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-950/30'
        }
      case 'wrong_number':
        return {
          icon: XCircle,
          label: 'Wrong Number',
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-950/30'
        }
      case 'callback_requested':
        return {
          icon: Clock,
          label: 'Callback Requested',
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30'
        }
      case 'promised_to_pay':
        return {
          icon: UserCheck,
          label: 'Promised to Pay',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30'
        }
      case 'delivered':
        return {
          icon: CheckCircle2,
          label: 'Delivered',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30'
        }
      case 'read':
        return {
          icon: CheckCircle2,
          label: 'Read',
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-950/30'
        }
      default:
        return {
          icon: AlertCircle,
          label: outcome.replace('_', ' '),
          color: 'text-slate-500',
          bg: 'bg-slate-50 dark:bg-slate-900/30'
        }
    }
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      } else if (diffDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
      }
    } catch {
      return dateString
    }
  }

  // Get method label
  const getMethodLabel = (method: string): string => {
    switch (method) {
      case 'call': return 'Phone Call'
      case 'sms': return 'SMS'
      case 'whatsapp': return 'WhatsApp'
      case 'email': return 'Email'
      default: return method
    }
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <Phone className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium">No contact history</p>
        <p className="text-sm">Contact attempts will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {contacts.filter(c => c.outcome === 'reached' || c.outcome === 'promised_to_pay').length} reached
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">
            {contacts.filter(c => c.outcome === 'no_answer' || c.outcome === 'busy').length} no answer
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {contacts.filter(c => c.outcome === 'callback_requested').length} callbacks
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Contact entries */}
        <div className="space-y-4">
          {contacts.map((contact, index) => {
            const MethodIcon = getMethodIcon(contact.type)
            const outcomeConfig = getOutcomeConfig(contact.outcome)
            const OutcomeIcon = outcomeConfig.icon

            return (
              <div key={contact.id || index} className="relative flex gap-4">
                {/* Icon */}
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  getMethodColor(contact.type)
                )}>
                  <MethodIcon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 p-3 rounded-lg border",
                  outcomeConfig.bg,
                  "border-slate-200 dark:border-slate-700"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{getMethodLabel(contact.type)}</span>
                        <span className={cn("flex items-center gap-1 text-xs", outcomeConfig.color)}>
                          <OutcomeIcon className="w-3 h-3" />
                          {outcomeConfig.label}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(contact.contactedAt)}
                        {contact.contactedByName && ` • ${contact.contactedByName}`}
                      </p>

                      {contact.notes && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 bg-white dark:bg-slate-800/50 p-2 rounded">
                          {contact.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next Follow-up Suggestion */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Suggested follow-up
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Based on contact history, consider calling again in 2 days.
              Last contact was a &quot;{contacts[0]?.outcome?.replace('_', ' ')}&quot; outcome.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
