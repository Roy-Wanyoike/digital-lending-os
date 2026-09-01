/**
 * ROYCSS Collection System - Types
 * @module roycss/collections/types
 * @description Type definitions for the collection system
 */

import type { CollectionCategory, ThemeConfig } from '../types';

// ============================================================================
// Collection Types
// ============================================================================

/** Collection metadata */
export interface CollectionMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  category: CollectionCategory;
  author?: string;
  tags: string[];
  previewImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Component reference in a collection */
export interface CollectionComponentRef {
  componentId: string;
  props?: Record<string, unknown>;
  variant?: string;
}

/** Pattern reference in a collection */
export interface CollectionPatternRef {
  patternId: string;
  props?: Record<string, unknown>;
}

/** Full collection definition */
export interface CollectionDefinition {
  meta: CollectionMeta;
  components: CollectionComponentRef[];
  patterns: CollectionPatternRef[];
  theme: ThemeConfig;
  dependencies?: string[];
  customStyles?: string;
  documentation?: {
    overview?: string;
    installation?: string;
    usage?: string;
    customization?: string;
  };
}

// ============================================================================
// Preset Types
// ============================================================================

/** Dashboard preset configuration */
export interface DashboardPresetConfig {
  layout: 'sidebar' | 'top-nav' | 'collapsible';
  widgets: Array<{
    type: 'stat' | 'chart' | 'table' | 'list' | 'activity';
    title: string;
    size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    position: { x: number; y: number };
  }>;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  colorScheme: 'light' | 'dark' | 'system';
}

/** Landing page preset configuration */
export interface LandingPagePresetConfig {
  sections: Array<{
    type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'cta' | 'footer';
    title?: string;
    subtitle?: string;
    variant?: string;
    background?: 'default' | 'muted' | 'gradient' | 'image';
  }>;
  navigation: 'sticky' | 'static' | 'transparent';
  colorScheme: 'light' | 'dark';
  primaryColor: string;
}

/** Admin panel preset configuration */
export interface AdminPanelPresetConfig {
  density: 'comfortable' | 'compact';
  sidebarStyle: 'expanded' | 'collapsed' | 'icons-only';
  tableDensity: 'comfortable' | 'normal' | 'compact';
  enableBulkActions: boolean;
  enableFilters: boolean;
  enableExport: boolean;
  colorScheme: 'light' | 'dark';
}

/** E-commerce preset configuration */
export interface EcommercePresetConfig {
  productCardStyle: 'standard' | 'compact' | 'detailed' | 'grid';
  cartType: 'drawer' | 'page' | 'modal';
  checkoutFlow: 'single-page' | 'multi-step';
  showWishlist: boolean;
  showReviews: boolean;
  currency: string;
  colorScheme: 'light' | 'dark';
}

/** Fintech preset configuration (for Digital Lending OS) */
export interface FintechPresetConfig {
  dashboardType: 'lender' | 'borrower' | 'admin';
  showCreditScore: boolean;
  showLoanCalculator: boolean;
  showPaymentHistory: boolean;
  documentUploadEnabled: boolean;
  kycRequired: boolean;
  currency: string;
  dateFormat: string;
  numberFormat: 'en-US' | 'en-KE' | 'custom';
  colorScheme: 'light' | 'dark';
  accentColor: 'emerald' | 'blue' | 'purple' | 'orange';
  securityFeatures: {
    twoFactorAuth: boolean;
    sessionTimeout: boolean;
    auditLog: boolean;
  };
}
