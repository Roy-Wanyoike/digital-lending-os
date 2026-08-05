'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Gift, Copy, Check, Users, DollarSign, Link2, Share2,
  ArrowUpRight, ExternalLink, TrendingUp, Sparkles, CircleDollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApi } from '@/hooks/use-api'
import { KPICard, formatDate, ErrorState } from '@/lib/dashboard-helpers'

interface ReferralData {
  referralCode: string
  referralLink: string
  bonusAmount: number
  bonusCurrency: string
  stats: {
    totalReferred: number
    totalBonusEarned: number
    activeBonusCount: number
  }
  recentReferrals: Array<{
    id: string
    name: string
    email: string
    createdAt: string
  }>
  recentBonuses: Array<{
    id: string
    bonusRef: string
    bonusAmount: number
    bonusCurrency: string
    status: string
    creditedAt: string
    refereeId: string
    referrerId: string
  }>
  referrerInfo: { name: string; email: string } | null
}

export function ReferralTab() {
  const { data, loading, error, refetch } = useApi<ReferralData>('/api/referral')
  const [copied, setCopied] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const copyLink = useCallback(async () => {
    if (!data?.referralLink) return
    try {
      await navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      setTimeout(() => { if (mountedRef.current) setCopied(false) }, 2500)
    } catch {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea')
      ta.value = data.referralLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => { if (mountedRef.current) setCopied(false) }, 2500)
    }
  }, [data])

  const shareLink = useCallback(async () => {
    if (!data?.referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Youngsend - Get $100 Bonus!',
          text: `Sign up on Youngsend using my referral link and get a $100 bonus when you make your first deposit!`,
          url: data.referralLink,
        })
      } catch { /* user cancelled */ }
    } else {
      copyLink()
      setShareMsg('Link copied to clipboard!')
      setTimeout(() => { if (mountedRef.current) setShareMsg('') }, 3000)
    }
  }, [data, copyLink])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load referral information.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  const { referralCode, referralLink, stats, recentReferrals, recentBonuses, referrerInfo } = data

  return (
    <div className="space-y-6">
      {/* Referred By Banner */}
      {referrerInfo && (
        <div className="animate-fade-in">
          <Card className="bg-gradient-to-r from-blue-50 dark:from-blue-950/50 to-indigo-50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">You were referred by {referrerInfo.name}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{referrerInfo.email}</p>
              </div>
              <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">Referred</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Card — Referral Link */}
      <div className="animate-fade-in">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 sm:p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium text-emerald-100">REFERRAL PROGRAM</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">Earn $100 for Every Referral</h2>
                <p className="text-emerald-100 mt-2 text-sm sm:text-base max-w-lg">
                  Share your unique link with friends. When they sign up and make their first deposit, you both win — they get onboarded and you get <span className="font-bold text-white">$100 credited instantly</span> to your USD wallet.
                </p>
              </div>
              <div className="hidden sm:flex h-16 w-16 rounded-2xl bg-white/10 items-center justify-center flex-shrink-0">
                <Gift className="h-8 w-8" />
              </div>
            </div>
          </div>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Referral Link Box */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-muted border rounded-lg px-4 py-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-mono text-foreground truncate">
                  {referralLink}
                </span>
              </div>
              <Button
                onClick={copyLink}
                className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                onClick={shareLink}
                variant="outline"
                className="flex-shrink-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            {shareMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">{shareMsg}</p>
            )}
            {/* Code + How it works */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
                <p className="text-2xl font-bold font-mono tracking-wider text-foreground">{referralCode}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">How It Works</p>
                <ol className="text-sm text-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                    Share your link with a friend
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                    They sign up using your link
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                    They make their first deposit
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">$100 credited to your USD wallet</span>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Referrals"
          value={String(stats.totalReferred)}
          icon={Users}
          trend={stats.totalReferred > 0 ? 'up' : undefined}
          subtitle={stats.totalReferred > 0 ? 'Growing!' : 'Share your link'}
        />
        <KPICard
          title="Total Bonuses Earned"
          value={`$${stats.totalBonusEarned.toLocaleString()}`}
          icon={DollarSign}
          trend={stats.totalBonusEarned > 0 ? 'up' : undefined}
          subtitle={stats.totalBonusEarned > 0 ? 'Keep referring!' : 'First bonus awaits'}
        />
        <KPICard
          title="Active Bonuses"
          value={String(stats.activeBonusCount)}
          icon={CircleDollarSign}
          subtitle="Successfully credited"
        />
        <KPICard
          title="Bonus Per Referral"
          value="$100"
          icon={TrendingUp}
          subtitle="USD wallet credit"
        />
      </div>

      {/* Two columns: Recent Referrals + Recent Bonuses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Referrals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No referrals yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your link to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReferrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {ref.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ref.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{ref.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(ref.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bonus History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-500" />
              Bonus History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBonuses.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No bonuses yet</p>
                <p className="text-xs text-muted-foreground mt-1">Bonuses are credited when referrals deposit</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBonuses.map((bonus) => (
                  <div
                    key={bonus.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          +${bonus.bonusAmount.toFixed(2)} {bonus.bonusCurrency}
                        </p>
                        <p className="text-xs text-muted-foreground">Ref: {bonus.bonusRef}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge
                        className={
                          bonus.status === 'credited'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            : bonus.status === 'revoked'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }
                      >
                        {bonus.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(bonus.creditedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom CTA for empty state */}
      {stats.totalReferred === 0 && (
        <div
          className="text-center py-6 animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
          <Card className="bg-gradient-to-r from-amber-50 dark:from-amber-950/50 to-orange-50 dark:to-orange-950/50 border-amber-200 dark:border-amber-800">
            <CardContent className="p-6 flex flex-col items-center">
              <ArrowUpRight className="h-8 w-8 text-amber-500 mb-3" />
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Start Earning Today</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 max-w-md">
                Copy your referral link and share it with friends, colleagues, or on social media.
                Every new user who deposits earns you $100 — no limits!
              </p>
              <Button
                onClick={shareLink}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Share Referral Link
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
