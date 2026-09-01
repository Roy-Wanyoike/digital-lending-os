'use client';

/**
 * Effects Page
 * 
 * Browse and search through 1800+ CSS effects.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Heart,
  Copy,
  Eye,
  Zap,
  Sparkles,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';

// Effect categories
const categories = [
  'All',
  'Buttons',
  'Cards',
  'Inputs',
  'Text',
  'Backgrounds',
  'Borders',
  'Shadows',
  'Loaders',
  'Transitions',
];

// Sample effects data (in real app, this would come from API/database)
const effects = [
  { id: 1, name: 'Glow Button', category: 'Buttons', description: 'Button with animated glow effect on hover' },
  { id: 2, name: 'Neon Border', category: 'Borders', description: 'Animated neon border effect' },
  { id: 3, name: 'Glassmorphism Card', category: 'Cards', description: 'Frosted glass card with backdrop blur' },
  { id: 4, name: 'Gradient Text', category: 'Text', description: 'Animated gradient text effect' },
  { id: 5, name: 'Shimmer Loader', category: 'Loaders', description: 'Skeleton loading shimmer animation' },
  { id: 6, name: 'Floating Input', category: 'Inputs', description: 'Input with floating label animation' },
  { id: 7, name: 'Morphing Background', category: 'Backgrounds', description: 'Animated morphing gradient background' },
  { id: 8, name: 'Soft Shadow', category: 'Shadows', description: 'Soft, realistic shadow effect' },
  { id: 9, name: 'Ripple Button', category: 'Buttons', description: 'Material design ripple effect button' },
  { id: 10, name: 'Flip Card', category: 'Cards', description: '3D flip card on hover' },
  { id: 11, name: 'Typewriter Text', category: 'Text', description: 'Typewriter text reveal animation' },
  { id: 12, name: 'Pulse Glow Input', category: 'Inputs', description: 'Input with pulsing glow border' },
];

export function EffectsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter effects based on search and category
  const filteredEffects = effects.filter((effect) => {
    const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      effect.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || effect.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHeader
        title="CSS Effects"
        description="Browse our collection of production-ready CSS effects. Click any effect to view and copy the code."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
          { label: 'Effects', href: '/roycss/effects' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search effects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="shrink-0"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredEffects.length} of {effects.length} effects
        </p>

        {/* Effects Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEffects.map((effect) => (
              <Link key={effect.id} href={`/roycss/effects/${effect.id}`}>
                <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full">
                  {/* Preview Area */}
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {effect.name}
                      </h3>
                      <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {effect.description}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {effect.category}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEffects.map((effect) => (
              <Link key={effect.id} href={`/roycss/effects/${effect.id}`}>
                <Card className="group border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Preview Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shrink-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {effect.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {effect.description}
                      </p>
                    </div>

                    {/* Category Badge & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {effect.category}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredEffects.length === 0 && (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No effects found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default EffectsPageClient;
