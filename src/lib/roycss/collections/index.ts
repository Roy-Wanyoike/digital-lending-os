/**
 * ROYCSS Collection System - Main Export
 * @module roycss/collections
 * @description Export collection system components and utilities
 */

export type {
  CollectionMeta,
  CollectionDefinition,
  CollectionComponentRef,
  CollectionPatternRef,
  DashboardPresetConfig,
  LandingPagePresetConfig,
  AdminPanelPresetConfig,
  EcommercePresetConfig,
  FintechPresetConfig,
} from './types';

export {
  registerCollection,
  getCollection,
  getAllCollections,
  getCollectionsByCategory,
  unregisterCollection,
  searchCollections,
  registerPreset,
  getPreset,
  getAllPresets,
  getPresetsByCategory,
  exportCollectionAsJSON,
  importCollectionFromJSON,
  defaultThemes,
} from './registry';

export { registerAllPresets, dashboardPreset, landingPagePreset, adminPanelPreset, ecommercePreset, fintechPreset } from './presets';
