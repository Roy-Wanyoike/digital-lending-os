'use client';

/**
 * ROYCSS Dashboard
 * 
 * Main dashboard page for the ROYCSS platform.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import {
  Zap,
  Layers,
  Palette,
  BookOpen,
  ArrowRight,
  Star,
  TrendingUp,
  Clock,
  Sparkles,
  Code2,
  Eye,
  Copy,
  Search,
  Filter,
  Grid3X3,
  List,
  Heart,
  Download
} from 'lucide-react';

// Quick stats for dashboard
const quickStats = [
  { label: 'Total Effects', value: '1,847', icon: <Zap className="w-5 h-5" />, change: '+23 this week' },
  { label: 'Components', value: '512', icon: <Layers className="w-5 h-5" />, change: '+8 this week' },
  { label: 'Patterns', value: '86', icon: <Palette className="w-5 h-5" />, change: '+3 this week' },
  { label: 'Your Favorites', value: '24', icon: <Heart className="w-5 h-5" />, change: '' },
];

// Featured effects
const featuredEffects = [
  { id: 1, name: 'Glow Button', category: 'Buttons', uses: 12400, trending: true },
  { id: 2, name: 'Glassmorphism Card', category: 'Cards', uses: 9800, trending: true },
  { id: 3, name: 'Gradient Border', category: 'Borders', uses: 7600, trending: false },
  { id: 4, name: 'Text Shimmer', category: 'Typography', uses: 6200, trending: true },
  { id: 5, name: 'Neon Input', category: 'Forms', uses: 5400, trending: false },
  { id: 6, name: 'Morphing Shape', category: 'Shapes', uses: 4800, trending: true },
];

// Recent activity
const recentActivity = [
  { action: 'Copied', item: 'Hover Glow Effect', time: '2 minutes ago' },
  { action: 'Favorited', item: 'Glass Card Component', time: '15 minutes ago' },
  { action: 'Viewed', item: 'Animated Gradient Background', time: '1 hour ago' },
  { action: 'Downloaded', item: 'Button Pack (12 items)', time: '3 hours ago' },
];

export function ROYCSSDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome to your ROYCSS workspace. Browse effects, components, and patterns."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
        ]}
        actions={
          <Button asChild>
            <Link href="/roycss/docs/getting-started">
              <BookOpen className="w-4 h-4 mr-2" />
              Quick Start Guide
            </Link>
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <Card key={stat.label} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {stat.icon}
                  </div>
                  {stat.change && (
                    <Badge variant="secondary" className="text-xs text-green-600 bg-green-50 dark:bg-green-950">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Effects', href: '/roycss/effects', icon: <Zap className="w-5 h-5" />, color: 'from-yellow-400 to-orange-500' },
                    { label: 'Components', href: '/roycss/components', icon: <Layers className="w-5 h-5" />, color: 'from-blue-400 to-indigo-500' },
                    { label: 'Patterns', href: '/roycss/patterns', icon: <Palette className="w-5 h-5" />, color: 'from-pink-400 to-rose-500' },
                    { label: 'Docs', href: '/roycss/docs', icon: <BookOpen className="w-5 h-5" />, color: 'from-green-400 to-emerald-500' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div className={cn(
                        "p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all group",
                        "hover:shadow-md hover:-translate-y-0.5"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                          "bg-gradient-to-br text-white",
                          item.color
                        )}>
                          {item.icon}
                        </div>
                        <div className="font-medium text-sm">{item.label}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Featured Effects */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Trending Effects</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/roycss/effects">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>Most popular effects this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {featuredEffects.map((effect) => (
                    <Link
                      key={effect.id}
                      href={`/roycss/effects/${effect.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">
                            {effect.name}
                            {effect.trending && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Hot
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{effect.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{effect.uses.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">uses</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Search Card */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search effects..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border rounded">
                    ⌘K
                  </kbd>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        activity.action === 'Copied' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                        activity.action === 'Favorited' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                        activity.action === 'Viewed' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                        activity.action === 'Downloaded' && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      )}>
                        {activity.action === 'Copied' && <Copy className="w-4 h-4" />}
                        {activity.action === 'Favorited' && <Heart className="w-4 h-4" />}
                        {activity.action === 'Viewed' && <Eye className="w-4 h-4" />}
                        {activity.action === 'Downloaded' && <Download className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.action}</span>{' '}
                          <span className="text-muted-foreground truncate">{activity.item}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro CTA */}
            <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 text-white">
              <CardContent className="p-6">
                <Sparkles className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
                <p className="text-sm text-white/80 mb-4">
                  Get unlimited access to premium effects, priority support, and more.
                </p>
                <Button size="sm" variant="secondary" className="w-full" asChild>
                  <Link href="/roycss/pricing">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ROYCSSDashboard;
