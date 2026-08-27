'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Clock,
  AlertCircle,
  Info,
  CreditCard,
  FileText,
  Shield,
  Gift,
  X
} from 'lucide-react'

// Types
interface Notification {
  id: string
  type: 'loan_approved' | 'payment_received' | 'payment_reminder' | 'kyc_required' | 'promotion' | 'system' | 'disbursement' | 'overdue'
  title: string
  message: string
  amount?: number
  read: boolean
  timestamp: string
  actionLabel?: string
  actionUrl?: string
  priority: 'low' | 'medium' | 'high'
}

interface NotificationCenterProps {
  notifications?: Notification[]
  onNotificationAction?: (notificationId: string, action: string) => void
}

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'loan_approved',
    title: 'Loan Approved! 🎉',
    message: 'Your application for KSh 50,000 has been approved. The funds will be disbursed to your M-Pesa account within 24 hours.',
    amount: 50000,
    read: false,
    timestamp: '2026-08-20T10:30:00Z',
    actionLabel: 'View Loan',
    actionUrl: '#loan-details',
    priority: 'high'
  },
  {
    id: '2',
    type: 'payment_received',
    title: 'Payment Received 💰',
    message: 'We received your payment of KSh 4,200. Thank you for your timely payment!',
    amount: 4200,
    read: false,
    timestamp: '2026-08-20T09:15:00Z',
    actionLabel: 'View Receipt',
    actionUrl: '#receipt',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'payment_reminder',
    title: 'Payment Reminder ⏰',
    message: 'Your payment of KSh 4,200 is due in 3 days. Please ensure sufficient funds in your account.',
    amount: 4200,
    read: false,
    timestamp: '2026-08-19T14:00:00Z',
    actionLabel: 'Pay Now',
    actionUrl: '#pay',
    priority: 'high'
  },
  {
    id: '4',
    type: 'kyc_required',
    title: 'KYC Verification Required 📋',
    message: 'Please upload your National ID to continue with your loan application. This is required for regulatory compliance.',
    read: true,
    timestamp: '2026-08-17T11:30:00Z',
    actionLabel: 'Upload Now',
    actionUrl: '#upload-kyc',
    priority: 'high'
  },
  {
    id: '5',
    type: 'disbursement',
    title: 'Loan Disbursed 📱',
    message: 'KSh 20,000 has been sent to your M-Pesa account (0712****678). You should receive confirmation shortly.',
    amount: 20000,
    read: true,
    timestamp: '2026-08-10T16:45:00Z',
    actionLabel: 'View Details',
    priority: 'medium'
  },
  {
    id: '6',
    type: 'promotion',
    title: 'Special Offer! 🎁',
    message: 'Refer a friend and earn KSh 500 credit towards your next loan payment! Limited time offer.',
    read: true,
    timestamp: '2026-08-15T09:00:00Z',
    actionLabel: 'Learn More',
    actionUrl: '#refer',
    priority: 'low'
  },
  {
    id: '7',
    type: 'system',
    title: 'Account Security Update 🔒',
    message: 'We\'ve updated our security features. Please review your security settings to ensure your account is protected.',
    read: true,
    timestamp: '2026-08-12T12:00:00Z',
    actionLabel: 'Review Settings',
    actionUrl: '#security',
    priority: 'low'
  }
]

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount)
}

const getTimeAgo = (dateStr: string): string => {
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
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

// Get notification icon based on type
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'loan_approved':
      return <Gift className="w-5 h-5 text-emerald-500" />
    case 'payment_received':
      return <CreditCard className="w-5 h-5 text-blue-500" />
    case 'payment_reminder':
      return <Clock className="w-5 h-5 text-amber-500" />
    case 'kyc_required':
      return <FileText className="w-5 h-5 text-orange-500" />
    case 'promotion':
      return <Gift className="w-5 h-5 text-purple-500" />
    case 'disbursement':
      return <CreditCard className="w-5 h-5 text-teal-500" />
    case 'overdue':
      return <AlertCircle className="w-5 h-5 text-red-500" />
    default:
      return <Info className="w-5 h-5 text-slate-500" />
  }
}

// Get notification color class
const getNotificationColorClass = (type: Notification['type']) => {
  switch (type) {
    case 'loan_approved':
      return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
    case 'payment_received':
      return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
    case 'payment_reminder':
      return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
    case 'kyc_required':
      return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
    case 'promotion':
      return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
    case 'disbursement':
      return 'border-l-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
    case 'overdue':
      return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
    default:
      return 'border-l-slate-500 bg-slate-50/50 dark:bg-slate-950/20'
  }
}

export function NotificationCenter({ 
  notifications = mockNotifications,
  onNotificationAction 
}: NotificationCenterProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [activeTab, setActiveTab] = useState('all')

  // Filtered notifications
  const unreadCount = localNotifications.filter(n => !n.read).length
  
  const filteredNotifications = localNotifications.filter(n => {
    if (activeTab === 'unread') return !n.read
    if (activeTab === 'important') return n.priority === 'high'
    return true
  })

  // Mark as read
  const markAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    onNotificationAction?.(id, 'mark_read')
  }

  // Mark all as read
  const markAllAsRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Delete notification
  const deleteNotification = (id: string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Handle action click
  const handleActionClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl && notification.actionLabel) {
      onNotificationAction?.(notification.id, notification.actionLabel.toLowerCase().replace(' ', '_'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-7 h-7 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Notifications</h2>
            <p className="text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{localNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
              {unreadCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="important" className="gap-2">
            Important
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BellRing className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Notifications</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'unread' 
                    ? 'You\'ve read all your notifications!' 
                    : activeTab === 'important'
                    ? 'No important notifications at this time'
                    : 'You\'re all caught up!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`overflow-hidden border-l-4 transition-all hover:shadow-md ${
                  !notification.read ? 'shadow-sm' : ''
                } ${getNotificationColorClass(notification.type)}`}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      !notification.read ? 'bg-background shadow-sm' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold ${!notification.read ? '' : 'font-normal'}`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Amount display if present */}
                          {notification.amount && (
                            <p className="text-sm font-medium text-primary mt-1">
                              {formatCurrency(notification.amount)}
                            </p>
                          )}

                          {/* Timestamp & Actions */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(notification.timestamp)}
                            </span>

                            {notification.actionLabel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActionClick(notification)}
                                className="h-7 text-xs gap-1"
                              >
                                {notification.actionLabel}
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}

                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-7 text-xs gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Notification Preferences Link */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-sm">Notification Settings</p>
                <p className="text-xs text-muted-foreground">
                  Manage how and when you receive notifications
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationCenter
