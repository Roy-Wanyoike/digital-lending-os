'use client';

/**
 * Patterns Page
 * 
 * Browse design patterns for common UI challenges.
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import {
  Layout,
  Grid,
  Columns,
  Sidebar,
  Header as HeaderIcon,
  ArrowRight,
  Palette,
  Layers,
  Box,
  Monitor,
  Smartphone
} from 'lucide-react';

// Pattern categories
const patternCategories = [
  'All',
  'Layouts',
  'Navigation',
  'Data Display',
  'Forms',
  'Marketing',
];

// Sample patterns data
const patterns = [
  {
    id: 1,
    name: 'Dashboard Layout',
    category: 'Layouts',
    description: 'Full dashboard layout with sidebar, header, and content area',
    complexity: 'Medium',
    responsive: true,
  },
  {
    id: 2,
    name: 'Hero Section',
    category: 'Marketing',
    description: 'Landing page hero with CTA and animated background',
    complexity: 'Easy',
    responsive: true,
  },
  {
    id: 3,
    name: 'Pricing Table',
    category: 'Marketing',
    description: 'Comparison pricing table with featured plan highlight',
    complexity: 'Medium',
    responsive: true,
  },
  {
    id: 4,
    name: 'Settings Page',
    category: 'Layouts',
    description: 'Settings layout with sidebar navigation and form sections',
    complexity: 'Hard',
    responsive: true,
  },
  {
    id: 5,
    name: 'Data Table with Filters',
    category: 'Data Display',
    description: 'Sortable table with search, filters, and pagination',
    complexity: 'Hard',
    responsive: false,
  },
  {
    id: 6,
    name: 'Multi-step Form',
    category: 'Forms',
    description: 'Wizard-style form with progress indicator and validation',
    complexity: 'Hard',
    responsive: true,
  },
];

export function PatternsPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHeader
        title="Design Patterns"
        description="Reusable design patterns for common UI challenges. Each pattern includes full code and customization options."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
          { label: 'Patterns', href: '/roycss/patterns' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {patternCategories.map((category) => (
            <Button key={category} variant="outline" size="sm" className="shrink-0">
              {category}
            </Button>
          ))}
        </div>

        {/* Patterns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.map((pattern) => (
            <Link key={pattern.id} href={`/roycss/patterns/${pattern.id}`}>
              <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full">
                {/* Preview Area */}
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden border-b border-border/50">
                  {/* Wireframe placeholder */}
                  <div className="absolute inset-4 flex items-center justify-center">
                    <Layout className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {pattern.name}
                    </h3>
                    <Badge 
                      variant={pattern.complexity === 'Easy' ? 'secondary' : pattern.complexity === 'Medium' ? 'default' : 'destructive'}
                      className="text-[10px]"
                    >
                      {pattern.complexity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {pattern.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] mr-2">{pattern.category}</Badge>
                    </span>
                    <span className={cn(
                      "flex items-center gap-1",
                      pattern.responsive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      {pattern.responsive ? (
                        <>
                          <Monitor className="w-3 h-3" />
                          <Smartphone className="w-3 h-3" />
                          Responsive
                        </>
                      ) : (
                        <>
                          <Monitor className="w-3 h-3" />
                          Desktop only
                        </>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PatternsPageClient;
