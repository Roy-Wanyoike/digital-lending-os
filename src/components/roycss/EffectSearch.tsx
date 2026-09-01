'use client';

/**
 * ROYCSS Effect Search Component
 * 
 * Search and discovery component for finding effects.
 * 
 * @module roycss/components/EffectSearch
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RoyCSSEffect, EffectCategory, CATEGORY_METADATA } from '@/lib/roycss/effects/types';
import { quickSearch } from '@/lib/roycss/effects/effect-registry';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface EffectSearchProps {
  onSelect?: (effect: RoyCSSEffect) => void;
  placeholder?: string;
  className?: string;
  maxResults?: number;
}

export const EffectSearch: React.FC<EffectSearchProps> = ({
  onSelect,
  placeholder = 'Search effects...',
  className,
  maxResults = 10,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<RoyCSSEffect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const searchResults = quickSearch(query, maxResults);
      setResults(searchResults);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, maxResults]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selection
  const handleSelect = (effect: RoyCSSEffect) => {
    onSelect?.(effect);
    setIsOpen(false);
    setQuery(effect.name);
  };

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, RoyCSSEffect[]> = {};
    
    results.forEach((effect) => {
      if (!groups[effect.category]) {
        groups[effect.category] = [];
      }
      groups[effect.category].push(effect);
    });

    return groups;
  }, [results]);

  // Popular tags for suggestions
  const popularTags = [
    'fade', 'slide', 'bounce', 'hover', 'glow', 'neon',
    'gradient', 'shadow', 'glass', 'animation', 'transition'
  ];

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="pl-10 pr-4"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-[400px] overflow-hidden">
          {query.length < 2 ? (
            /* Empty State / Suggestions */
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => {
                      setQuery(tag);
                      inputRef.current?.focus();
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            /* Results */
            <div className="py-2">
              {Object.entries(groupedResults).map(([category, effects]) => {
                const meta = CATEGORY_METADATA[category as EffectCategory];
                return (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: meta?.color }}
                      />
                      {meta?.name || category}
                    </div>
                    {effects.map((effect) => (
                      <button
                        key={effect.id}
                        onClick={() => handleSelect(effect)}
                        className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between group"
                      >
                        <span className="text-sm">{effect.name}</span>
                        <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          {effect.difficulty}
                        </Badge>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            /* No Results */
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No effects found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
            {results.length > 0 ? (
              <>
                Showing {results.length} result{results.length !== 1 ? 's' : ''}
                {query && <> for &quot;{query}&quot;</>}
              </>
            ) : (
              'Type to search effects'
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Standalone search with command palette style
export const EffectCommandPalette: React.FC<EffectSearchProps> = ({
  onSelect,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <svg
          className="mr-2 h-4 w-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Search effects...
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          ⌘K
        </kbd>
      </Button>

      {/* Command Palette Dialog */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
            <Command loop>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Effects">
                  {/* This would be populated dynamically */}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      )}
    </>
  );
};

export default EffectSearch;
