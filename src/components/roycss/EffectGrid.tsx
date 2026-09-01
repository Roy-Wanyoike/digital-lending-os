'use client';

/**
 * ROYCSS Effect Grid Component
 * 
 * Displays a grid of effect cards with filtering and pagination.
 * 
 * @module roycss/components/EffectGrid
 */

import React, { useState, useMemo } from 'react';
import { RoyCSSEffect, EffectCategory, EffectDifficulty, CATEGORY_METADATA } from '@/lib/roycss/effects/types';
import { searchEffects } from '@/lib/roycss/effects/effect-registry';
import { EffectCard } from './EffectCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EffectGridProps {
  effects?: RoyCSSEffect[];
  onEffectClick?: (effect: RoyCSSEffect) => void;
  itemsPerPage?: number;
  showSearch?: boolean;
  showFilters?: boolean;
}

export const EffectGrid: React.FC<EffectGridProps> = ({
  effects: initialEffects,
  onEffectClick,
  itemsPerPage = 24,
  showSearch = true,
  showFilters = true,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<EffectDifficulty | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'popularity' | 'difficulty'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTailwindOnly, setShowTailwindOnly] = useState(false);

  // Get effects (use provided or fetch all)
  const allEffects = useMemo(() => {
    if (initialEffects) return initialEffects;
    // Import dynamically to avoid SSR issues
    return []; // Will be populated by parent
  }, [initialEffects]);

  // Filtered and sorted effects
  const result = useMemo(() => {
    if (!initialEffects) {
      // Use registry search if no effects provided
      return searchEffects({
        query: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
        sortBy,
        offset: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        customizableOnly: showTailwindOnly,
      });
    }

    // Client-side filtering
    let filtered = [...initialEffects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (effect) =>
          effect.name.toLowerCase().includes(query) ||
          effect.description.toLowerCase().includes(query) ||
          effect.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((effect) => effect.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((effect) => effect.difficulty === selectedDifficulty);
    }

    // Tailwind only filter
    if (showTailwindOnly) {
      filtered = filtered.filter((effect) => effect.tailwind);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          const order = { beginner: 0, intermediate: 1, advanced: 2 };
          return order[a.difficulty] - order[b.difficulty];
        case 'popularity':
          return (b.relatedEffects?.length || 0) - (a.relatedEffects?.length || 0);
        default:
          return 0;
      }
    });

    return {
      effects: filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      total: filtered.length,
      filters: {} as any,
      pagination: {
        offset: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        hasMore: currentPage * itemsPerPage < filtered.length,
      },
    };
  }, [
    initialEffects,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    sortBy,
    showTailwindOnly,
    currentPage,
    itemsPerPage,
  ]);

  // Total pages
  const totalPages = Math.ceil(result.total / itemsPerPage);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedDifficulty, sortBy, showTailwindOnly]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          {showSearch && (
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search effects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Category Filter */}
          {showFilters && (
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Difficulty Filter */}
          {showFilters && (
            <Select value={selectedDifficulty} onValueChange={(v) => setSelectedDifficulty(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
              <SelectItem value="popularity">Popular</SelectItem>
            </SelectContent>
          </Select>

          {/* Tailwind Toggle */}
          {showFilters && (
            <Button
              variant={showTailwindOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTailwindOnly(!showTailwindOnly)}
              className="whitespace-nowrap"
            >
              Tailwind Only
            </Button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{result.total} effects found</span>
        {totalPages > 1 && (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {result.effects.map((effect) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            onClick={onEffectClick}
          />
        ))}
      </div>

      {/* Empty State */}
      {result.effects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No effects found</p>
          <p className="text-sm text-muted-foreground/70">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className="w-9"
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default EffectGrid;
