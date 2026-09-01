'use client';

/**
 * Changelog Page
 * 
 * Track all updates, improvements, and bug fixes.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import {
  Sparkles,
  Bug,
  Zap,
  ArrowRight,
  Calendar,
  Tag,
  Package,
  Star,
  GitBranch
} from 'lucide-react';

// Changelog entries
const changelog = [
  {
    version: '2.0.0',
    date: '2024-12-15',
    type: 'major',
    description: 'Major release with React components and TypeScript support.',
    changes: [
      { type: 'new', text: 'Added 200+ new React components' },
      { type: 'new', text: 'Full TypeScript type definitions' },
      { type: 'improved', text: 'Redesigned documentation site' },
      { type: 'improved', text: 'Performance optimizations across all effects' },
      { type: 'fixed', text: 'Fixed glassmorphism effect in Safari' },
      { type: 'fixed', text: 'Resolved z-index issues with modals' },
    ],
  },
  {
    version: '1.5.0',
    date: '2024-11-20',
    type: 'minor',
    description: 'New effects pack and accessibility improvements.',
    changes: [
      { type: 'new', text: 'Added 150+ new hover effects' },
      { type: 'new', text: 'New "Neon" effects category' },
      { type: 'improved', text: 'Enhanced keyboard navigation' },
      { type: 'improved', text: 'Better screen reader support' },
      { type: 'fixed', text: 'Fixed animation timing inconsistencies' },
    ],
  },
  {
    version: '1.4.0',
    date: '2024-10-08',
    type: 'minor',
    description: 'Dark mode improvements and new utilities.',
    changes: [
      { type: 'new', text: 'Dark mode color tokens' },
      { type: 'new', text: 'New spacing utility classes' },
      { type: 'improved', text: 'Reduced CSS bundle size by 15%' },
      { type: 'fixed', text: 'Fixed contrast issues in dark mode' },
    ],
  },
  {
    version: '1.3.0',
    date: '2024-09-15',
    type: 'minor',
    description: 'Animation library expansion.',
    changes: [
      { type: 'new', text: 'Added 100+ new animations' },
      { type: 'new', text: 'New easing functions' },
      { type: 'improved', text: 'Smoother transitions' },
      { type: 'fixed', text: 'Fixed animation memory leak' },
    ],
  },
];

const changeTypeConfig = {
  new: { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'New', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  improved: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Improved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  fixed: { icon: <Bug className="w-3.5 h-3.5" />, label: 'Fixed', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const versionTypeConfig = {
  major: { badge: 'Major Release', variant: 'default' as const },
  minor: { badge: 'Minor Release', variant: 'secondary' as const },
  patch: { badge: 'Patch', variant: 'outline' as const },
};

export function ChangelogPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <Badge variant="secondary" className="mb-4">Changelog</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            What&apos;s{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">New</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Track all updates, improvements, and bug fixes in ROYCSS.
          </p>
        </div>
      </div>

      {/* Changelog Timeline */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          {changelog.map((entry) => (
            <article key={entry.version} className="relative">
              {/* Version Header */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6 border-b bg-muted/30">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-2xl font-bold">v{entry.version}</span>
                      <Badge {...versionTypeConfig[entry.type]}>
                        {versionTypeConfig[entry.type].badge}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {entry.date}
                      </span>
                      <a 
                        href={`https://github.com/Roy-Wanyoike/digital-lending-os/releases/tag/v${entry.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <GitBranch className="w-4 h-4" />
                        View on GitHub
                      </a>
                    </div>
                    <p className="mt-3">{entry.description}</p>
                  </div>

                  {/* Changes List */}
                  <div className="p-6">
                    <ul className="space-y-3">
                      {entry.changes.map((change, index) => {
                        const config = changeTypeConfig[change.type as keyof typeof changeTypeConfig];
                        return (
                          <li key={index} className="flex items-start gap-3">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                              config.color
                            )}>
                              {config.icon}
                              {config.label}
                            </span>
                            <span className="text-sm">{change.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </article>
          ))}
        </div>

        {/* RSS / Subscribe */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Stay Updated</h3>
              <p className="text-sm text-muted-foreground">Subscribe to our newsletter or RSS feed for updates.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                RSS Feed
              </Button>
              <Button size="sm">
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

export default ChangelogPageClient;
