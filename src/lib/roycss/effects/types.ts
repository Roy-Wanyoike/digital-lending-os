/**
 * ROYCSS Effect Library - Type Definitions
 * 
 * Comprehensive type system for the CSS Effects Library
 * supporting 500+ effects across multiple categories.
 * 
 * @module roycss/effects/types
 * @version 1.0.0
 */

// ============================================================================
// Effect Categories
// ============================================================================

/**
 * Main categories of CSS effects in the ROYCSS library
 */
export type EffectCategory =
  | 'animation'      // Animation effects (entrance, exit, attention seekers)
  | 'transition'     // Transition effects (smooth, page, state transitions)
  | 'visual'         // Visual effects (shadows, gradients, filters, glassmorphism)
  | 'layout'         // Layout effects (grid, flexbox, masonry patterns)
  | 'interactive'    // Interactive effects (hover, click, scroll-triggered)
  | 'text';          // Text effects (gradients, shadows, glitch, neon)

/**
 * Sub-categories for more granular organization
 */
export type EffectSubCategory = {
  animation: 'entrance' | 'exit' | 'attention-seeker' | 'loading' | 'looping';
  transition: 'smooth' | 'page-transition' | 'state-change' | 'timing';
  visual: 'shadow' | 'gradient' | 'filter' | 'backdrop-filter' | 'glassmorphism' | 'neumorphism';
  layout: 'grid' | 'flexbox' | 'masonry' | 'card' | 'responsive';
  interactive: 'hover' | 'click' | 'drag' | 'scroll' | 'focus';
  text: 'gradient' | 'shadow' | 'typewriter' | 'glitch' | 'neon' | 'outline';
};

/**
 * Get subcategories for a given category
 */
export type GetSubCategories<T extends EffectCategory> = EffectSubCategory[T];

// ============================================================================
// Difficulty Levels
// ============================================================================

/**
 * Difficulty level for implementing/customizing an effect
 */
export type EffectDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Difficulty metadata for display purposes
 */
export const DIFFICULTY_META: Record<EffectDifficulty, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#22c55e' },
  intermediate: { label: 'Intermediate', color: '#f59e0b' },
  advanced: { label: 'Advanced', color: '#ef4444' },
};

// ============================================================================
// Browser Support
// ============================================================================

/**
 * Supported browsers for an effect
 */
export type BrowserSupport = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'ie';

/**
 * Browser support information structure
 */
export interface BrowserSupportInfo {
  /** Browsers that fully support this effect */
  supported: BrowserSupport[];
  /** Browsers with partial support */
  partialSupport?: BrowserSupport[];
  /** Browsers not supported */
  unsupported?: BrowserSupport[];
  /** Notes about browser compatibility */
  notes?: string;
}

/**
 * Default browser support for modern CSS features
 */
export const DEFAULT_BROWSER_SUPPORT: BrowserSupportInfo = {
  supported: ['chrome', 'firefox', 'safari', 'edge', 'opera'],
  partialSupport: [],
  unsupported: ['ie'],
  notes: 'Requires modern browser with CSS3 support',
};

// ============================================================================
// Effect Property Types
// ============================================================================

/**
 * Property value types
 */
export type PropertyType = 
  | 'string'
  | 'number'
  | 'color'
  | 'length'
  | 'time'
  | 'angle'
  | 'easing-function'
  | 'boolean'
  | 'enum';

/**
 * A customizable property of a CSS effect
 */
export interface EffectProperty {
  /** Property name (CSS property or custom name) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Description of what this property does */
  description: string;
  /** Type of the property value */
  type: PropertyType;
  /** Default value */
  defaultValue: string | number | boolean;
  /** Minimum value (for numeric types) */
  min?: number;
  /** Maximum value (for numeric types) */
  max?: number;
  /** Step increment (for numeric ranges) */
  step?: number;
  /** Allowed enum values */
  options?: string[];
  /** CSS unit if applicable */
  unit?: string;
  /** Whether this property is required */
  required?: boolean;
}

// ============================================================================
// Core Effect Interface
// ============================================================================

/**
 * Main effect interface - represents a single CSS effect
 * This is the primary data structure for the entire library
 */
export interface RoyCSSEffect {
  /** Unique identifier for the effect (kebab-case) */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Primary category */
  category: EffectCategory;
  /** Sub-category for finer classification */
  subCategory?: GetSubCategories<EffectCategory>;
  /** Short description of the effect */
  description: string;
  /** Detailed explanation of how the effect works */
  detailedDescription?: string;
  
  /**
   * Pure CSS code for the effect
   * Should be copy-paste ready
   */
  css: string;
  
  /**
   * Tailwind CSS classes equivalent (if applicable)
   * May be null for complex effects without Tailwind equivalent
   */
  tailwind?: string;
  
  /**
   * React/JSX component version of the effect
   * Provides a ready-to-use React component
   */
  jsx?: string;
  
  /** Tags for search and discovery */
  tags: string[];
  
  /** Browser support information */
  browserSupport: BrowserSupportInfo;
  
  /** Implementation difficulty level */
  difficulty: EffectDifficulty;
  
  /** Whether the effect can be customized via properties */
  customizable: boolean;
  
  /** List of customizable properties */
  properties: EffectProperty[];
  
  /** Preview thumbnail data URL or placeholder */
  previewThumbnail?: string;
  
  /** Related effect IDs for recommendations */
  relatedEffects?: string[];
  
  /** Creator/attribution information */
  author?: string;
  
  /** Version of this effect definition */
  version?: string;
  
  /** Creation date (ISO format) */
  createdAt?: string;
  
  /** Last updated date (ISO format) */
  updatedAt?: string;
}

// ============================================================================
// Effect Collection Types
// ============================================================================

/**
 * A collection/group of related effects
 */
export interface EffectCollection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Collection description */
  description: string;
  /** Category this collection belongs to */
  category: EffectCategory;
  /** Effects in this collection */
  effects: RoyCSSEffect[];
  /** Total count of effects */
  count: number;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

/**
 * Search filters for finding effects
 */
export interface EffectSearchFilters {
  /** Text search query */
  query?: string;
  /** Filter by category */
  category?: EffectCategory;
  /** Filter by sub-category */
  subCategory?: string;
  /** Filter by difficulty */
  difficulty?: EffectDifficulty;
  /** Filter by tags */
  tags?: string[];
  /** Filter by browser support */
  browserSupport?: BrowserSupport;
  /** Only show customizable effects */
  customizableOnly?: boolean;
  /** Sort order */
  sortBy?: 'name' | 'date' | 'popularity' | 'difficulty';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Pagination offset */
  offset?: number;
  /** Number of results to return */
  limit?: number;
}

/**
 * Search result containing matched effects
 */
export interface EffectSearchResult {
  /** Matched effects */
  effects: RoyCSSEffect[];
  /** Total number of matching effects */
  total: number;
  /** Applied filters */
  filters: EffectSearchFilters;
  /** Pagination info */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Preview & Export Types
// ============================================================================

/**
 * Preview configuration for rendering an effect
 */
export interface EffectPreviewConfig {
  /** Effect to preview */
  effect: RoyCSSEffect;
  /** Custom property values overrides */
  customValues?: Record<string, string | number | boolean>;
  /** Preview size */
  size?: 'small' | 'medium' | 'large';
  /** Show code panel */
  showCode?: boolean;
  /** Theme for code display */
  theme?: 'light' | 'dark';
  /** Auto-play animations */
  autoPlay?: boolean;
  /** Animation speed multiplier */
  speedMultiplier?: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'css' | 'jsx' | 'tailwind' | 'json' | 'codepen' | 'codesandbox' | 'gist';

/**
 * Export options
 */
export interface ExportOptions {
  /** Format to export as */
  format: ExportFormat;
  /** Include comments */
  includeComments?: boolean;
  /** Minify output */
  minify?: boolean;
  /** Include vendor prefixes */
  includePrefixes?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** The exported content */
  content: string;
  /** Suggested filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Format used */
  format: ExportFormat;
}

// ============================================================================
// Playground Types
// ============================================================================

/**
 * Playground state for interactive editing
 */
export interface PlaygroundState {
  /** Currently selected effect */
  currentEffect: RoyCSSEffect | null;
  /** Modified CSS code */
  modifiedCss: string;
  /** Custom property values */
  propertyValues: Record<string, string | number | boolean>;
  /** Active tab */
  activeTab: 'preview' | 'css' | 'jsx' | 'tailwind';
  /** Is playing animation */
  isPlaying: boolean;
  /** Playback speed */
  playbackSpeed: number;
  /** Show grid overlay */
  showGrid: bool;
  /** Theme mode */
  themeMode: 'light' | 'dark';
  /** History stack for undo/redo */
  history: string[];
  historyIndex: number;
}

/**
 * Playground action types
 */
export type PlaygroundAction =
  | { type: 'SELECT_EFFECT'; payload: RoyCSSEffect }
  | { type: 'UPDATE_CSS'; payload: string }
  | { type: 'UPDATE_PROPERTY'; payload: { key: string; value: string | number | boolean } }
  | { type: 'SET_TAB'; payload: PlaygroundState['activeTab'] }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

// ============================================================================
// Category Metadata
// ============================================================================

/**
 * Metadata for each effect category
 */
export interface CategoryMetadata {
  /** Category key */
  id: EffectCategory;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon name (Lucide) */
  icon: string;
  /** Color accent */
  color: string;
  /** Number of effects in this category */
  effectCount: number;
  /** Popular tags in this category */
  popularTags: string[];
}

/**
 * All category metadata
 */
export const CATEGORY_METADATA: Record<EffectCategory, CategoryMetadata> = {
  animation: {
    id: 'animation',
    name: 'Animations',
    description: 'Dynamic motion effects including entrances, exits, attention seekers, and loading states',
    icon: 'Play',
    color: '#8b5cf6',
    effectCount: 100,
    popularTags: ['fade', 'slide', 'bounce', 'zoom', 'spin', 'pulse'],
  },
  transition: {
    id: 'transition',
    name: 'Transitions',
    description: 'Smooth state changes, timing functions, and page transition effects',
    icon: 'ArrowRightLeft',
    color: '#06b6d4',
    effectCount: 80,
    popularTags: ['ease', 'smooth', 'bounce', 'elastic', 'morph'],
  },
  visual: {
    id: 'visual',
    name: 'Visual Effects',
    description: 'Shadows, gradients, filters, glassmorphism, neumorphism, and more',
    icon: 'Sparkles',
    color: '#f59e0b',
    effectCount: 120,
    popularTags: ['shadow', 'gradient', 'blur', 'glass', 'neon', 'glow'],
  },
  layout: {
    id: 'layout',
    name: 'Layout Effects',
    description: 'Grid patterns, flexbox layouts, masonry arrangements, and card designs',
    icon: 'LayoutGrid',
    color: '#10b981',
    effectCount: 60,
    popularTags: ['grid', 'flex', 'masonry', 'card', 'responsive', 'centered'],
  },
  interactive: {
    id: 'interactive',
    name: 'Interactive Effects',
    description: 'Hover states, click feedback, drag interactions, and scroll-triggered animations',
    icon: 'MousePointerClick',
    color: '#ef4444',
    effectCount: 80,
    popularTags: ['hover', 'click', 'scroll', 'drag', 'focus', 'active'],
  },
  text: {
    id: 'text',
    name: 'Text Effects',
    description: 'Text gradients, shadows, typewriter animations, glitch effects, and neon styling',
    icon: 'Type',
    color: '#ec4899',
    effectCount: 60,
    popularTags: ['gradient', 'shadow', 'typewriter', 'glitch', 'neon', 'outline'],
  },
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract effect IDs from an array of effects
 */
export type EffectIds<T extends readonly RoyCSSEffect[]> = T[number]['id'];

/**
 * Pick specific fields from effect
 */
export type EffectPick<T extends RoyCSSEffect, K extends keyof T> = Pick<T, K>;

/**
 * Required fields variant
 */
export type EffectRequired<T extends RoyCSSEffect, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Partial fields variant
 */
export type EffectPartial<T extends RoyCSSEffect, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
