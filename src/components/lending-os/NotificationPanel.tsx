'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  DollarSign,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  Clock
} from 'lucide-react'

export type NotificationType = 'application' | 'payment' | 'overdue' | 'system' | 'alert'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  metadata?: {
    customerId?: string
    loanId?: string
    applicationId?: string
    amount?: number
  }
}

interface NotificationPanelProps {
  onNavigate?: (type: NotificationType, metadata?: Notification['metadata']) => void
}

// Generate mock notifications based on seed data
const generateMockNotifications = (): Notification[] => {
  const now = new Date()
  
  return [
    {
      id: 'notif-1',
      type: 'application',
      title: 'New Application Submitted',
      message: 'Grace Wanjiku Njeri submitted a loan application for KSh 100,000',
      timestamp: new Date(now.getTime() - 5 * 60000), // 5 minutes ago
      read: false,
      actionUrl: '#applications',
      actionLabel: 'Review Application',
      metadata: { applicationId: 'app-001', amount: 100000 }
    },
    {
      id: 'notif-2',
      type: 'payment',
      title: 'Payment Received',
      message: 'John Kamau Mwangi paid KSh 8,500 towards loan LN-2026-00042',
      timestamp: new Date(now.getTime() - 23 * 60000), // 23 minutes ago
      read: false,
      actionUrl: '#loans',
      actionLabel: 'View Loan',
      metadata: { loanId: 'loan-001', customerId: 'cust-001', amount: 8500 }
    },
    {
      id: 'notif-3',
      type: 'overdue',
      title: 'Loan Overdue Alert',
      message: 'Mary Atieno Ouma\'s loan LN-2026-00039 is 28 days overdue (KSh 72,000)',
      timestamp: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      read: false,
      actionUrl: '#loans',
      actionLabel: 'Contact Customer',
      metadata: { loanId: 'loan-004', customerId: 'cust-004', amount: 72000 }
    },
    {
      id: 'notif-4',
      type: 'system',
      title: 'System Update Complete',
      message: 'Platform maintenance completed successfully. New features are now available.',
      timestamp: new Date(now.getTime() - 5 * 3600000), // 5 hours ago
      read: true,
    },
    {
      id: 'notif-5',
      type: 'application',
      title: 'Application Approved',
      message: 'Peter Ochieng Odhiambo\'s application for KSh 25,000 has been auto-approved',
      timestamp: new Date(now.getTime() - 8 * 3600000), // 8 hours ago
      read: true,
      actionUrl: '#applications',
      actionLabel: 'View Details',
      metadata: { applicationId: 'app-003', amount: 25000 }
    },
    {
      id: 'notif-6',
      type: 'alert',
      title: 'High Risk Customer Alert',
      message: 'Sarah Muthoni has been flagged for potential fraud. Review required.',
      timestamp: new Date(now.getTime() - 24 * 3600000), // 1 day ago
      read: true,
      actionUrl: '#customers',
      actionLabel: 'Review Profile',
      metadata: { customerId: 'cust-008' }
    },
    {
      id: 'notif-7',
      type: 'payment',
      title: 'Bulk Payment Received',
      message: '12 payments totaling KSh 145,000 received via M-Pesa batch',
      timestamp: new Date(now.getTime() - 26 * 3600000), // 1 day ago
      read: true,
    },
    {
      id: 'notif-8',
      type: 'overdue',
      title: 'Upcoming Due Date Reminder',
      message: '3 loans will be due in the next 48 hours. Total expected: KSh 47,500',
      timestamp: new Date(now.getTime() - 28 * 3600000), // 1 day ago
      read: true,
      actionUrl: '#loans',
      actionLabel: 'View Schedule',
    },
    {
      id: 'notif-9',
      type: 'system',
      title: 'Daily Report Generated',
      message: 'Your daily operations report is ready. PAR30 ratio: 4.2%',
      timestamp: new Date(now.getTime() - 30 * 3600000), // 1 day ago
      read: true,
      actionLabel: 'Download Report',
    },
    {
      id: 'notif-10',
      type: 'application',
      title: 'New Application Submitted',
      message: 'Daniel Kipchoge Kosgei submitted a business loan application for KSh 80,000',
      timestamp: new Date(now.getTime() - 36 * 3600000), // 1.5 days ago
      read: true,
      actionUrl: '#applications',
      actionLabel: 'Review Application',
      metadata: { applicationId: 'app-006', amount: 80000 }
    },
  ]
}

export function NotificationPanel({ onNavigate }: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(generateMockNotifications())
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'application':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'payment':
        return <DollarSign className="w-4 h-4 text-emerald-500" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'system':
      default:
        return <Info className="w-4 h-4 text-slate-500" />
    }
  }

  const getNotificationBg = (type: NotificationType, read: boolean) => {
    if (read) return ''
    
    switch (type) {
      case 'application':
        return 'bg-blue-50 border-blue-200'
      case 'payment':
        return 'bg-emerald-50 border-emerald-200'
      case 'overdue':
        return 'bg-red-50 border-red-200'
      case 'alert':
        return 'bg-orange-50 border-orange-200'
      case 'system':
        return 'bg-slate-50 border-slate-200'
      default:
        return ''
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short'
    })
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (onNavigate && notification.actionUrl) {
      onNavigate(notification.type, notification.metadata)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 border-l-2 ${getNotificationBg(notification.type, notification.read)} ${
                      !notification.read ? 'border-l-blue-500' : 'border-l-transparent'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 p-2 rounded-full ${
                        !notification.read ? 'bg-white' : 'bg-slate-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            !notification.read ? 'text-slate-900' : 'text-slate-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 line-clamp-2 ${
                          !notification.read ? 'text-slate-600' : 'text-slate-500'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {notification.actionLabel && !notification.read && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                {notification.actionLabel}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto text-slate-400 hover:text-slate-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto text-slate-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              title="Delete"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t bg-slate-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sm text-slate-600 hover:text-slate-900"
              onClick={() => {
                setIsOpen(false)
                // Could navigate to full notifications page
              }}
            >
              View all notifications
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
