/**
 * ROYCSS Effects Library - Main Entry Point
 * 
 * Comprehensive CSS Effects Library with 500+ effects
 * organized by category: animations, transitions, visual,
 * layout, interactive, and text effects.
 * 
 * @module roycss/effects
 * @version 1.0.0
 */

// Export types and interfaces
export type {
  RoyCSSEffect,
  EffectCategory,
  EffectSubCategory,
  EffectDifficulty,
  BrowserSupport,
  BrowserSupportInfo,
  EffectProperty,
  EffectCollection,
  EffectSearchFilters,
  EffectSearchResult,
  EffectPreviewConfig,
  ExportFormat,
  ExportOptions,
  ExportResult,
  PlaygroundState,
  PlaygroundAction,
  CategoryMetadata,
} from './types';

export {
  DIFFICULTY_META,
  DEFAULT_BROWSER_SUPPORT,
  CATEGORY_METADATA,
  EffectDifficulty,
} from './types';

// Export registry functions
export {
  getAllEffects,
  getTotalEffectCount,
  getEffectById,
  getEffectsByIds,
  getEffectsByCategory,
  getEffectsBySubCategory,
  getEffectsByTag,
  getRelatedEffects,
  searchEffects,
  quickSearch,
  getPopularEffects,
  getRecentEffects,
  getBeginnerEffects,
  getLibraryStats,
  getAllTags,
  getCategoryTags,
  exportRegistryAsJSON,
  importEffects,
} from './effect-registry';

// Re-export category metadata
export { CATEGORY_METADATA } from './effect-registry';

// Export effect catalogs (for direct access)
export { animationEffects } from './catalog/animations';
export { transitionEffects } from './catalog/transitions';
export { visualEffects } from './catalog/visual';
export { layoutEffects } from './catalog/layout';
export { interactiveEffects } from './catalog/interactive';
export { textEffects } from './catalog/text';

// Export utilities
export { generateCSS, generateJSX, getTailwindClasses, hasTailwindEquivalent } from './utils/css-generator';
export type { CustomValues, CssGenerationOptions } from './utils/css-generator';

export {
  generatePreviewConfig,
  generateStandalonePreviewHTML,
  generateThumbnailPlaceholder,
  formatCodeForDisplay,
  generateShareParams,
  parseShareParams,
  PREVIEW_SIZES,
  PREVIEW_THEMES,
} from './preview-generator';
export type { PreviewSize, PreviewTheme } from './preview-generator';

export {
  exportEffect,
  batchExportEffects,
  exportLibraryCatalog,
  copyToClipboard,
  copyEffectCSS,
  copyEffectTailwind,
  downloadFile,
  downloadEffectCSS,
  downloadEffectJSON,
} from './export-utils';

// Default export is the registry
import { getAllEffects as _getAllEffects } from './effect-registry';
export default _getAllEffects;
