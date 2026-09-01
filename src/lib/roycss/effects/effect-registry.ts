/**
 * ROYCSS Effect Registry System
 * 
 * Central registry for managing all CSS effects in the library.
 * Provides search, filter, and discovery functionality.
 * 
 * @module roycss/effects/effect-registry
 * @version 1.0.0
 */

import {
  RoyCSSEffect,
  EffectCategory,
  EffectSearchFilters,
  EffectSearchResult,
  BrowserSupport,
  CATEGORY_METADATA,
} from './types';

// Import all effect catalogs
import { animationEffects } from './catalog/animations';
import { transitionEffects } from './catalog/transitions';
import { visualEffects } from './catalog/visual';
import { layoutEffects } from './catalog/layout';
import { interactiveEffects } from './catalog/interactive';
import { textEffects } from './catalog/text';

// ============================================================================
// Registry State
// ============================================================================

/**
 * Master collection of all effects organized by category
 */
const effectCollections: Map<EffectCategory, RoyCSSEffect[]> = new Map([
  ['animation', animationEffects],
  ['transition', transitionEffects],
  ['visual', visualEffects],
  ['layout', layoutEffects],
  ['interactive', interactiveEffects],
  ['text', textEffects],
]);

/**
 * Flat array of all effects for quick access
 */
let allEffects: RoyCSSEffect[] = [];

/**
 * Index of effects by ID for O(1) lookup
 */
const effectIndex: Map<string, RoyCSSEffect> = new Map();

/**
 * Tag index for efficient tag-based search
 */
const tagIndex: Map<string, RoyCSSEffect[]> = new Map();

/**
 * Flag indicating if registry is initialized
 */
let isInitialized = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the effect registry
 * Builds indexes for fast lookups
 */
function initializeRegistry(): void {
  if (isInitialized) return;

  // Build flat array and ID index
  allEffects = [];
  effectCollections.forEach((effects) => {
    effects.forEach((effect) => {
      allEffects.push(effect);
      effectIndex.set(effect.id, effect);

      // Build tag index
      effect.tags.forEach((tag) => {
        const normalizedTag = tag.toLowerCase();
        if (!tagIndex.has(normalizedTag)) {
          tagIndex.set(normalizedTag, []);
        }
        tagIndex.get(normalizedTag)!.push(effect);
      });
    });
  });

  // Update category metadata with actual counts
  effectCollections.forEach((effects, category) => {
    const meta = CATEGORY_METADATA[category];
    if (meta) {
      meta.effectCount = effects.length;
    }
  });

  isInitialized = true;
}

// ============================================================================
// Public API - Get Effects
// ============================================================================

/**
 * Get all effects from the registry
 * @returns Array of all registered effects
 */
export function getAllEffects(): RoyCSSEffect[] {
  initializeRegistry();
  return [...allEffects];
}

/**
 * Get total count of all effects
 * @returns Total number of effects
 */
export function getTotalEffectCount(): number {
  initializeRegistry();
  return allEffects.length;
}

/**
 * Get an effect by its unique ID
 * @param id - Effect identifier
 * @returns The effect or undefined if not found
 */
export function getEffectById(id: string): RoyCSSEffect | undefined {
  initializeRegistry();
  return effectIndex.get(id);
}

/**
 * Get multiple effects by their IDs
 * @param ids - Array of effect identifiers
 * @returns Array of found effects
 */
export function getEffectsByIds(ids: string[]): RoyCSSEffect[] {
  initializeRegistry();
  return ids.map((id) => effectIndex.get(id)).filter(Boolean) as RoyCSSEffect[];
}

/**
 * Get all effects in a specific category
 * @param category - Category to filter by
 * @returns Array of effects in the category
 */
export function getEffectsByCategory(category: EffectCategory): RoyCSSEffect[] {
  initializeRegistry();
  return effectCollections.get(category) || [];
}

/**
 * Get effects by sub-category
 * @param category - Parent category
 * @param subCategory - Sub-category name
 * @returns Array of matching effects
 */
export function getEffectsBySubCategory(
  category: EffectCategory,
  subCategory: string
): RoyCSSEffect[] {
  const categoryEffects = getEffectsByCategory(category);
  return categoryEffects.filter(
    (effect) => effect.subCategory === subCategory
  );
}

/**
 * Get effects with a specific tag
 * @param tag - Tag to search for
 * @returns Array of effects with the tag
 */
export function getEffectsByTag(tag: string): RoyCSSEffect[] {
  initializeRegistry();
  return tagIndex.get(tag.toLowerCase()) || [];
}

/**
 * Get related/similar effects for a given effect
 * @param effectId - ID of the reference effect
 * @param limit - Maximum number of results
 * @returns Array of similar effects
 */
export function getRelatedEffects(effectId: string, limit: number = 6): RoyCSSEffect[] {
  const effect = getEffectById(effectId);
  if (!effect) return [];

  // Start with explicitly related effects
  let related: RoyCSSEffect[] = [];
  
  if (effect.relatedEffects && effect.relatedEffects.length > 0) {
    related = getEffectsByIds(effect.relatedEffects).slice(0, limit);
  }

  // If we need more, find by shared tags
  if (related.length < limit) {
    const tagMatches = new Map<string, number>();
    
    effect.tags.forEach((tag) => {
      getEffectsByTag(tag).forEach((e) => {
        if (e.id !== effectId) {
          tagMatches.set(e.id, (tagMatches.get(e.id) || 0) + 1);
        }
      });
    });

    // Sort by number of shared tags
    const sorted = Array.from(tagMatches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit - related.length)
      .map(([id]) => effectIndex.get(id))
      .filter(Boolean) as RoyCSSEffect[];

    related = [...related, ...sorted];
  }

  // If still need more, add same category effects
  if (related.length < limit) {
    const sameCategory = getEffectsByCategory(effect.category)
      .filter((e) => e.id !== effectId && !related.find((r) => r.id === e.id))
      .slice(0, limit - related.length);
    
    related = [...related, ...sameCategory];
  }

  return related.slice(0, limit);
}

// ============================================================================
// Public API - Search & Filter
// ============================================================================

/**
 * Search and filter effects
 * @param filters - Search and filter criteria
 * @returns Search result with matched effects
 */
export function searchEffects(filters: EffectSearchFilters): EffectSearchResult {
  initializeRegistry();

  const {
    query,
    category,
    subCategory,
    difficulty,
    tags,
    browserSupport,
    customizableOnly,
    sortBy = 'name',
    sortOrder = 'asc',
    offset = 0,
    limit = 20,
  } = filters;

  let results = [...allEffects];

  // Text search
  if (query) {
    const searchTerms = query.toLowerCase().split(/\s+/);
    results = results.filter((effect) => {
      const searchText = [
        effect.name,
        effect.description,
        effect.detailedDescription || '',
        ...effect.tags,
        effect.id,
      ].join(' ').toLowerCase();

      return searchTerms.every((term) => searchText.includes(term));
    });
  }

  // Category filter
  if (category) {
    results = results.filter((effect) => effect.category === category);
  }

  // Sub-category filter
  if (subCategory) {
    results = results.filter((effect) => effect.subCategory === subCategory);
  }

  // Difficulty filter
  if (difficulty) {
    results = results.filter((effect) => effect.difficulty === difficulty);
  }

  // Tags filter (AND logic)
  if (tags && tags.length > 0) {
    results = results.filter((effect) =>
      tags.every((tag) =>
        effect.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    );
  }

  // Browser support filter
  if (browserSupport) {
    results = results.filter((effect) =>
      effect.browserSupport.supported.includes(browserSupport)
    );
  }

  // Customizable only filter
  if (customizableOnly) {
    results = results.filter((effect) => effect.customizable);
  }

  // Sorting
  results.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'difficulty':
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        break;
      case 'date':
        comparison = new Date(b.updatedAt || b.createdAt || '').getTime() -
                   new Date(a.updatedAt || a.createdAt || '').getTime();
        break;
      case 'popularity':
        // For now, use related effects count as popularity proxy
        comparison = (b.relatedEffects?.length || 0) - (a.relatedEffects?.length || 0);
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Pagination
  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);

  return {
    effects: paginatedResults,
    total,
    filters,
    pagination: {
      offset,
      limit,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Quick search by query string only
 * @param query - Search query
 * @param limit - Maximum results
 * @returns Matching effects
 */
export function quickSearch(query: string, limit: number = 10): RoyCSSEffect[] {
  return searchEffects({ query, limit }).effects;
}

/**
 * Get popular/trending effects
 * @param limit - Number of effects to return
 * @returns Popular effects
 */
export function getPopularEffects(limit: number = 12): RoyCSSEffect[] {
  initializeRegistry();
  
  // Return effects with most relations (proxy for popularity)
  return [...allEffects]
    .sort((a, b) => (b.relatedEffects?.length || 0) - (a.relatedEffects?.length || 0))
    .slice(0, limit);
}

/**
 * Get recently added effects (by update date)
 * @param limit - Number of effects to return
 * @returns Recent effects
 */
export function getRecentEffects(limit: number = 12): RoyCSSEffect[] {
  return searchEffects({
    sortBy: 'date',
    sortOrder: 'desc',
    limit,
  }).effects;
}

/**
 * Get beginner-friendly effects
 * @param limit - Number of effects to return
 * @returns Beginner effects
 */
export function getBeginnerEffects(limit: number = 12): RoyCSSEffect[] {
  return searchEffects({
    difficulty: 'beginner',
    limit,
  }).effects;
}

// ============================================================================
// Public API - Statistics
// ============================================================================

/**
 * Get statistics about the effect library
 * @returns Library statistics
 */
export function getLibraryStats() {
  initializeRegistry();

  const stats = {
    totalEffects: allEffects.length,
    categories: {} as Record<EffectCategory, number>,
    difficulties: {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    },
    totalTags: tagIndex.size,
    customizableCount: 0,
    browserSupport: {
      chrome: 0,
      firefox: 0,
      safari: 0,
      edge: 0,
      opera: 0,
      ie: 0,
    },
  };

  allEffects.forEach((effect) => {
    // Category counts
    stats.categories[effect.category] = (stats.categories[effect.category] || 0) + 1;
    
    // Difficulty counts
    stats.difficulties[effect.difficulty]++;
    
    // Customizable count
    if (effect.customizable) {
      stats.customizableCount++;
    }
    
    // Browser support counts
    effect.browserSupport.supported.forEach((browser) => {
      stats.browserSupport[browser]++;
    });
  });

  return stats;
}

/**
 * Get all unique tags in the library
 * @returns Array of unique tags sorted alphabetically
 */
export function getAllTags(): string[] {
  initializeRegistry();
  return Array.from(tagIndex.keys()).sort();
}

/**
 * Get tags for a specific category
 * @param category - Category to get tags for
 * @returns Array of tags used in the category
 */
export function getCategoryTags(category: EffectCategory): string[] {
  const effects = getEffectsByCategory(category);
  const tags = new Set<string>();
  effects.forEach((effect) => {
    effect.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

// ============================================================================
// Export utilities
// ============================================================================

/**
 * Export registry data as JSON
 * @returns JSON string of all effects
 */
export function exportRegistryAsJSON(): string {
  initializeRegistry();
  return JSON.stringify(allEffects, null, 2);
}

/**
 * Import effects into the registry (for extensions)
 * @param effects - Effects to add
 */
export function importEffects(effects: RoyCSSEffect[]): void {
  initializeRegistry();
  effects.forEach((effect) => {
    if (!effectIndex.has(effect.id)) {
      allEffects.push(effect);
      effectIndex.set(effect.id, effect);
      
      // Add to category collection
      const categoryEffects = effectCollections.get(effect.category);
      if (categoryEffects) {
        categoryEffects.push(effect);
      }
      
      // Update tag index
      effect.tags.forEach((tag) => {
        const normalizedTag = tag.toLowerCase();
        if (!tagIndex.has(normalizedTag)) {
          tagIndex.set(normalizedTag, []);
        }
        tagIndex.get(normalizedTag)!.push(effect);
      });
    }
  });
}

// Re-export types for convenience
export type {
  RoyCSSEffect,
  EffectCategory,
  EffectSearchFilters,
  EffectSearchResult,
};

export { CATEGORY_METADATA };
