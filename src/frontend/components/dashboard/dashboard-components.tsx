'use client'

import React from 'react'
import {
  LayoutDashboard, Network, Shield, ArrowLeftRight, IdCard as PassportIcon,
  Link2, Wallet, ShieldAlert, UserCheck, BellRing, Scale,
  ArrowUpRight, ArrowDownRight, AlertTriangle, RotateCcw, Gift,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { NavItem } from '@/frontend/lib/formatters'

// ─── Navigation Items ─────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trust-graph', label: 'Trust Graph', icon: Network },
  { id: 'escrow', label: 'Escrow', icon: Shield },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight },
  { id: 'passport', label: 'Passport', icon: PassportIcon },
  { id: 'payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'referral', label: 'Referral', icon: Gift },
  { id: 'fraud', label: 'Fraud', icon: ShieldAlert },
  { id: 'matching', label: 'Matching', icon: UserCheck },
  { id: 'collections', label: 'Collections', icon: BellRing },
  { id: 'compliance', label: 'Compliance', icon: Scale },
]

// ─── Shared Sub-Components ───────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Failed to load data</p>
        <p className="text-xs text-muted-foreground mt-1">{message || 'An error occurred while fetching data. Please try again.'}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

export function KPICard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; trend?: 'up' | 'down'
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          {Icon && <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-500/60" />}
        </div>
      </CardContent>
    </Card>
  )
}

export function PipelineCard(props: { title?: string; value?: number; label?: string; count?: number; color: string }) {
  const title = props.title ?? props.label ?? ''
  const value = props.value ?? props.count ?? 0
  return (
    <div className="flex-1 min-w-0">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: props.color }}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{title}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function ScoreBar({ score, maxScore = 100, label }: { score: number; maxScore?: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{score}/{maxScore}</span></div>}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CircularScore({ score, size = 100, strokeWidth = 6 }: { score: number | undefined | null; size?: number; strokeWidth?: number }) {
  const safe = typeof score === 'number' && isFinite(score) ? score : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference
  const color = safe >= 80 ? '#10b981' : safe >= 60 ? '#f59e0b' : safe >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{safe}</span>
    </div>
  )
}
