'use client';

/**
 * Effects Page Client Component
 * 
 * Browse and search through 340+ CSS effects from the ROYCSS library.
 * Features search, filtering by category/difficulty, grid/list view,
 * and a detailed preview modal with copy-to-clipboard functionality.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/roycss/navigation/Header';
import { Footer } from '@/components/roycss/navigation/Footer';
import { PageHeader } from '@/components/roycss/navigation/BreadcrumbNav';
import { EffectCard } from '@/components/roycss/EffectCard';
import {
  Search,
  Grid3X3,
  List,
  Copy,
  Eye,
  Zap,
  Sparkles,
  X,
  Check,
  Code,
  Tag,
  Layers,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Import types and registry
import {
  RoyCSSEffect,
  EffectCategory,
  EffectDifficulty,
  CATEGORY_METADATA
} from '@/lib/roycss/effects/types';
import {
  getAllEffects,
  getEffectsByCategory,
  getLibraryStats,
  getAllTags,
  searchEffects
} from '@/lib/roycss/effects/effect-registry';

// ============================================================================
// Types
// ============================================================================

interface ViewMode {
  value: 'grid' | 'list';
}

// ============================================================================
// Effect Detail Modal Component
// ============================================================================

interface EffectDetailModalProps {
  effect: RoyCSSEffect | null;
  isOpen: boolean;
  onClose: () => void;
}

const EffectDetailModal: React.FC<EffectDetailModalProps> = ({
  effect,
  isOpen,
  onClose
}) => {
  // Use key-based reset by tracking effect ID in a ref for initial state
  const [modalState, setModalState] = useState<{ 
    copied: boolean; 
    activeTab: 'preview' | 'css' | 'tailwind'; 
    isAnimating: boolean;
    lastEffectId: string | null;
  }>({ 
    copied: false, 
    activeTab: 'preview', 
    isAnimating: false,
    lastEffectId: null
  });

  // Reset state when effect changes using a derived pattern
  const currentEffectId = effect?.id || null;
  const needsReset = modalState.lastEffectId !== currentEffectId;
  
  const copied = needsReset ? false : modalState.copied;
  const activeTab = needsReset ? 'preview' as const : modalState.activeTab;
  const isAnimating = needsReset ? false : modalState.isAnimating;

  const updateModalState = useCallback((updates: Partial<typeof modalState>) => {
    setModalState(prev => ({ ...prev, ...updates, lastEffectId: currentEffectId }));
  }, [currentEffectId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!effect || !isOpen) return null;

  const categoryMeta = CATEGORY_METADATA[effect.category];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effect.css);
      updateModalState({ copied: true });
      setTimeout(() => updateModalState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReplayAnimation = () => {
    updateModalState({ isAnimating: false });
    setTimeout(() => updateModalState({ isAnimating: true }), 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-background rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold truncate">{effect.name}</h2>
              <Badge 
                variant="secondary"
                style={{ backgroundColor: `${categoryMeta?.color}20`, color: categoryMeta?.color }}
              >
                {effect.category}
              </Badge>
              <Badge variant="outline">{effect.difficulty}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{effect.description}</p>
            {/* Tags */}
            <div className="flex gap-1.5 flex-wrap pt-1">
              {effect.tags.slice(0, 8).map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {effect.tags.length > 8 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{effect.tags.length - 8} more
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'preview' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => updateModalState({ activeTab: 'preview' })}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Preview
          </button>
          <button
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'css' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => updateModalState({ activeTab: 'css' })}
          >
            <Code className="w-4 h-4 inline mr-2" />
            CSS
          </button>
          {effect.tailwind && (
            <button
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'tailwind' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => updateModalState({ activeTab: 'tailwind' })}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Tailwind
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Preview Area */}
              <div className="rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-8 min-h-[300px] flex items-center justify-center relative overflow-hidden">
                {/* Animation Keyframes */}
                <style>{effect.css}</style>
                
                {/* Preview Content Based on Category */}
                <EffectPreviewRenderer effect={effect} isAnimating={isAnimating} />
                
                {/* Replay Button for Animations */}
                {(effect.category === 'animation') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-4 right-4"
                    onClick={handleReplayAnimation}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Replay
                  </Button>
                )}
              </div>

              {/* Properties */}
              {effect.customizable && effect.properties.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Customizable Properties
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {effect.properties.map((prop) => (
                      <div 
                        key={prop.name}
                        className="p-3 rounded-lg bg-muted/50 space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{prop.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {String(prop.defaultValue)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{prop.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Browser Support */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Browser Support
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {effect.browserSupport.supported.map((browser) => (
                    <Badge key={browser} variant="secondary" className="text-xs capitalize">
                      ✓ {browser}
                    </Badge>
                  ))}
                  {effect.browserSupport.partialSupport?.map((browser) => (
                    <Badge 
                      key={browser} 
                      variant="outline" 
                      className="text-xs capitalize"
                      style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                    >
                      ~ {browser}
                    </Badge>
                  ))}
                  {effect.browserSupport.unsupported?.map((browser) => (
                    <Badge 
                      key={browser} 
                      variant="outline" 
                      className="text-xs capitalize opacity-50"
                    >
                      ✗ {browser}
                    </Badge>
                  ))}
                </div>
                {effect.browserSupport.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {effect.browserSupport.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'css' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Copy the CSS code below</span>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy CSS
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-auto max-h-[400px] text-sm leading-relaxed">
                <code>{effect.css}</code>
              </pre>
            </div>
          )}

          {activeTab === 'tailwind' && effect.tailwind && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tailwind CSS equivalent</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    await navigator.clipboard.writeText(effect.tailwind || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-auto max-h-[400px] text-sm">
                <code>{effect.tailwind}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-muted/30">
          <span className="text-xs text-muted-foreground">
            ID: <code className="bg-muted px-1.5 py-0.5 rounded">{effect.id}</code>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy CSS'}
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Effect Preview Renderer
// ============================================================================

interface EffectPreviewRendererProps {
  effect: RoyCSSEffect;
  isAnimating?: boolean;
}

const EffectPreviewRenderer: React.FC<EffectPreviewRendererProps> = ({ effect, isAnimating = true }) => {
  const animationClass = isAnimating ? effect.id : `${effect.id}-paused`;

  switch (effect.category) {
    case 'text':
      return (
        <span className={`${animationClass} text-3xl font-bold`}>
          {effect.subCategory === 'typewriter' ? '' : 'Awesome'}
        </span>
      );
    
    case 'animation':
      if (effect.subCategory === 'loading') {
        return <div className={`${animationClass} w-16 h-16`} />;
      }
      return (
        <div className={`${animationClass} w-24 h-24 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600`} 
             style={{ animationPlayState: isAnimating ? 'running' : 'paused' }} 
        />
      );
    
    case 'visual':
      if (effect.subCategory === 'shadow' || effect.subCategory === 'neumorphism') {
        return <div className={`${effect.id} w-32 h-32 rounded-2xl bg-white dark:bg-slate-800`} />;
      }
      if (effect.subCategory === 'gradient') {
        return <div className={`${effect.id} w-40 h-40 rounded-2xl`} />;
      }
      if (effect.subCategory === 'glassmorphism') {
        return (
          <div className={`${effect.id} w-40 h-28 rounded-2xl p-4`}>
            <div className="h-3 w-3/4 rounded bg-white/40 mb-3" />
            <div className="h-2 w-1/2 rounded bg-white/30" />
          </div>
        );
      }
      return <div className={`${effect.id} w-32 h-32 rounded-xl`} />;
    
    case 'layout':
      if (effect.subCategory === 'card') {
        return (
          <div className={`${effect.id} w-48 space-y-3`}>
            <div className="w-full h-20 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700" />
            <div className="space-y-2 px-1">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted/70" />
            </div>
          </div>
        );
      }
      return (
        <div className={`${effect.id} grid grid-cols-3 gap-2`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700" />
          ))}
        </div>
      );
    
    case 'interactive':
    case 'transition':
      return (
        <div className="text-center space-y-4">
          <button className={`${effect.id} px-6 py-3 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg`}>
            Hover / Click Me
          </button>
          <p className="text-xs text-muted-foreground">Interact with this element</p>
        </div>
      );
    
    default:
      return <div className={`${effect.id} p-6 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800`} />;
  }
};

// Helper icon for properties section
function SlidersHorizontal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x4="4" y1="21" y2="14"></line>
      <line x1="4" x4="4" y1="10" y2="3"></line>
      <line x1="12" x4="12" y1="21" y2="12"></line>
      <line x1="12" x4="12" y1="8" y2="3"></line>
      <line x1="20" x4="20" y1="21" y2="16"></line>
      <line x1="20" x4="20" y1="12" y2="3"></line>
      <line x1="1" x4="7" y1="14" y2="14"></line>
      <line x1="9" x4="15" y1="8" y2="8"></line>
      <line x1="17" x4="23" y1="16" y2="16"></line>
    </svg>
  );
}

// ============================================================================
// Main Effects Page Client Component
// ============================================================================

export function EffectsPageClient() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<EffectDifficulty | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'category'>('name');
  const [selectedEffect, setSelectedEffect] = useState<RoyCSSEffect | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Load effects - using lazy initializer pattern
  const [effectsData, setEffectsData] = useState<{ 
    effects: RoyCSSEffect[]; 
    stats: { totalEffects: number; categories: Record<string, number> } | null; 
    loaded: boolean;
  }>(() => {
    // Initial load happens here, not in useEffect
    try {
      const loadedEffects = getAllEffects();
      return {
        effects: loadedEffects,
        stats: {
          totalEffects: loadedEffects.length,
          categories: Object.fromEntries(
            (Object.keys(CATEGORY_METADATA) as EffectCategory[]).map(cat => [
              cat, 
              getEffectsByCategory(cat).length
            ])
          )
        },
        loaded: true
      };
    } catch {
      return { effects: [], stats: null, loaded: false };
    }
  });

  // Destructure for easier usage
  const effects = effectsData.effects;
  const stats = effectsData.stats;
  const isLoading = !effectsData.loaded;

  // Filtered and sorted effects
  const filteredEffects = useMemo(() => {
    let result = [...effects];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(effect =>
        effect.name.toLowerCase().includes(query) ||
        effect.description.toLowerCase().includes(query) ||
        effect.tags.some(tag => tag.toLowerCase().includes(query)) ||
        effect.id.includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(effect => effect.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      result = result.filter(effect => effect.difficulty === selectedDifficulty);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          const order = { beginner: 0, intermediate: 1, advanced: 2 };
          return order[a.difficulty] - order[b.difficulty];
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [effects, searchQuery, selectedCategory, selectedDifficulty, sortBy]);

  // Handle effect click
  const handleEffectClick = useCallback((effect: RoyCSSEffect) => {
    setSelectedEffect(effect);
    setShowModal(true);
  }, []);

  // Category entries for filter
  const categoryEntries = useMemo(() => 
    Object.entries(CATEGORY_METADATA) as [EffectCategory, typeof CATEGORY_METADATA[EffectCategory]][],
  []
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <PageHeader
        title="CSS Effects Library"
        description={`Browse our collection of ${stats?.totalEffects || 0} production-ready CSS effects including animations, transitions, visual effects, and more.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'ROYCSS', href: '/roycss' },
          { label: 'Effects', href: '/roycss/effects' },
        ]}
      />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-500" />
            <span className="font-semibold">
              {stats?.totalEffects || 0} Effects
            </span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex gap-2 flex-wrap">
            {categoryEntries.map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                  selectedCategory === key
                    ? "bg-violet-500 text-white"
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: meta.color }}
                />
                {meta.name}
                <span className={cn(
                  "ml-0.5",
                  selectedCategory === key ? "text-white/80" : "text-muted-foreground"
                )}>
                  ({stats?.categories[key] || 0})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search effects by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select 
            value={selectedCategory} 
            onValueChange={(v) => setSelectedCategory(v as EffectCategory | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryEntries.map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty Filter */}
          <Select 
            value={selectedDifficulty} 
            onValueChange={(v) => setSelectedDifficulty(v as EffectDifficulty | 'all')}
          >
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

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredEffects.length}</span> of{' '}
            <span className="font-medium text-foreground">{stats?.totalEffects || 0}</span> effects
          </p>
          
          {/* Active Filters */}
          {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active:</span>
              {selectedCategory !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer gap-1"
                  onClick={() => setSelectedCategory('all')}
                >
                  {CATEGORY_METADATA[selectedCategory]?.name || selectedCategory}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {selectedDifficulty !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer gap-1"
                  onClick={() => setSelectedDifficulty('all')}
                >
                  {selectedDifficulty}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {searchQuery && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer gap-1"
                  onClick={() => setSearchQuery('')}
                >
                  &quot;{searchQuery}&quot;
                  <X className="w-3 h-3" />
                </Badge>
              )}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSearchQuery('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Effects Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEffects.map((effect) => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onClick={handleEffectClick}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEffects.map((effect) => {
              const categoryMeta = CATEGORY_METADATA[effect.category];
              return (
                <Card 
                  key={effect.id}
                  className="group cursor-pointer border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
                  onClick={() => handleEffectClick(effect)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Mini Preview */}
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center">
                      <style>{effect.css}</style>
                      <EffectPreviewRenderer effect={effect} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {effect.name}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className="shrink-0 text-[10px]"
                          style={{ backgroundColor: `${categoryMeta?.color}20`, color: categoryMeta?.color }}
                        >
                          {effect.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {effect.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {effect.difficulty}
                        </Badge>
                        {effect.tailwind && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: '#06b6d4', color: '#06b6d4' }}>
                            TW
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          {effect.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredEffects.length === 0 && (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No effects found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria.
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}

        {/* Popular Tags Section */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-muted-foreground" />
            Browse by Tag
          </h3>
          <div className="flex flex-wrap gap-2">
            {['fade', 'slide', 'bounce', 'hover', 'glow', 'neon', 'gradient', 'shadow', 'glass', 'pulse', 'zoom', 'flip', 'rotate', 'shake', 'scale'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      {/* Effect Detail Modal */}
      <EffectDetailModal
        effect={selectedEffect}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}

// Chevron Right Icon
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default EffectsPageClient;
