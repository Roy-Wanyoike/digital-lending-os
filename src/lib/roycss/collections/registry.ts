/**
 * ROYCSS Collection System - Registry
 * @module roycss/collections/registry
 * @description Collection registry for managing component collections and presets
 */

import type {
  CollectionDefinition,
  CollectionMeta,
  CollectionCategory,
} from './types';
import type { ThemeConfig } from '../types';

// ============================================================================
// In-Memory Store
// ============================================================================

const collections = new Map<string, CollectionDefinition>();
const presets = new Map<string, CollectionDefinition>();

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Register a new collection
 */
export function registerCollection(collection: CollectionDefinition): void {
  collections.set(collection.meta.id, collection);
}

/**
 * Get a collection by ID
 */
export function getCollection(id: string): CollectionDefinition | undefined {
  return collections.get(id);
}

/**
 * Get all collections
 */
export function getAllCollections(): CollectionDefinition[] {
  return Array.from(collections.values());
}

/**
 * Get collections by category
 */
export function getCollectionsByCategory(category: CollectionCategory): CollectionDefinition[] {
  return Array.from(collections.values()).filter(
    (c) => c.meta.category === category
  );
}

/**
 * Unregister a collection
 */
export function unregisterCollection(id: string): boolean {
  return collections.delete(id);
}

/**
 * Search collections by query
 */
export function searchCollections(query: string): CollectionDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(collections.values()).filter(
    (c) =>
      c.meta.name.toLowerCase().includes(lowerQuery) ||
      c.meta.description.toLowerCase().includes(lowerQuery) ||
      c.meta.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// ============================================================================
// Preset Management
// ============================================================================

/**
 * Register a preset collection
 */
export function registerPreset(preset: CollectionDefinition): void {
  presets.set(preset.meta.id, preset);
}

/**
 * Get a preset by ID
 */
export function getPreset(id: string): CollectionDefinition | undefined {
  return presets.get(id);
}

/**
 * Get all presets
 */
export function getAllPresets(): CollectionDefinition[] {
  return Array.from(presets.values());
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: CollectionCategory): CollectionDefinition[] {
  return Array.from(presets.values()).filter(
    (p) => p.meta.category === category
  );
}

// ============================================================================
// Default Themes
// ============================================================================

export const defaultThemes: Record<string, ThemeConfig> = {
  light: {
    primaryColor: '#10b981',
    secondaryColor: '#6366f1',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
  dark: {
    primaryColor: '#34d399',
    secondaryColor: '#818cf8',
    accentColor: '#fbbf24',
    backgroundColor: '#0f172a',
    textColor: '#f1f5f9',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
  fintech: {
    primaryColor: '#059669', // Emerald green - trust, finance
    secondaryColor: '#7c3aed', // Purple - innovation
    accentColor: '#f59e0b', // Amber - warnings, highlights
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
};

// ============================================================================
// Export utilities
// ============================================================================

/**
 * Export collection as JSON
 */
export function exportCollectionAsJSON(id: string): string | null {
  const collection = collections.get(id);
  if (!collection) return null;
  return JSON.stringify(collection, null, 2);
}

/**
 * Import collection from JSON
 */
export function importCollectionFromJSON(json: string): CollectionDefinition | null {
  try {
    const collection = JSON.parse(json) as CollectionDefinition;
    // Basic validation
    if (!collection.meta?.id || !collection.meta?.name) {
      throw new Error('Invalid collection format');
    }
    return collection;
  } catch {
    return null;
  }
}
