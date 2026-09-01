/**
 * ROYCSS Collection System - Presets
 * @module roycss/collections/presets
 * @description Pre-built collection presets for common use cases
 */

import type { CollectionDefinition } from './types';
import { registerPreset } from '../collections/registry';

// ============================================================================
// Dashboard Preset
// ============================================================================

const dashboardPreset: CollectionDefinition = {
  meta: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Complete dashboard layout with stats, charts, and data tables',
    version: '1.0.0',
    category: 'dashboard',
    tags: ['dashboard', 'analytics', 'stats', 'charts'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  components: [
    { componentId: 'StatCard' },
    { componentId: 'DataTable' },
    { componentId: 'Progress' },
    { componentId: 'Avatar' },
    { componentId: 'Badge' },
    { componentId: 'Breadcrumb' },
    { componentId: 'Tabs' },
    { componentId: 'Pagination' },
  ],
  patterns: [
    { patternId: 'DashboardGrid' },
  ],
  theme: {
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
  documentation: {
    overview: 'A comprehensive dashboard layout featuring stat cards, data tables, and navigation components.',
    installation: 'Import the Dashboard preset to get started with a full-featured admin dashboard.',
    usage: 'Use the DashboardGrid pattern as your main layout, then add StatCard and DataTable components.',
  },
};

// ============================================================================
// Landing Page Preset
// ============================================================================

const landingPagePreset: CollectionDefinition = {
  meta: {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Modern landing page with hero, features, testimonials, and pricing sections',
    version: '1.0.0',
    category: 'landing-page',
    tags: ['landing', 'marketing', 'hero', 'pricing'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  components: [
    { componentId: 'Button' },
    { componentId: 'Card' },
    { componentId: 'Avatar' },
    { componentId: 'Badge' },
    { componentId: 'Progress' },
  ],
  patterns: [
    { patternId: 'PricingTable' },
    { patternId: 'TestimonialCarousel' },
    { patternId: 'FeatureComparison' },
  ],
  theme: {
    primaryColor: '#6366f1',
    secondaryColor: '#ec4899',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderRadius: '0.75rem',
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
// Admin Panel Preset
// ============================================================================

const adminPanelPreset: CollectionDefinition = {
  meta: {
    id: 'admin-panel',
    name: 'Admin Panel',
    description: 'Full-featured admin panel with CRUD operations, filters, and bulk actions',
    version: '1.0.0',
    category: 'admin-panel',
    tags: ['admin', 'crud', 'table', 'forms', 'management'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  components: [
    { componentId: 'DataTable' },
    { componentId: 'ValidatedInput' },
    { componentId: 'Select' },
    { componentId: 'DatePicker' },
    { componentId: 'FileUpload' },
    { componentId: 'Modal' },
    { componentId: 'ConfirmDialog' },
    { componentId: 'Alert' },
    { componentId: 'ToastContainer' },
    { componentId: 'Pagination' },
    { componentId: 'SearchFilterBar' },
    { componentId: 'BulkEditBar' },
    { componentId: 'InlineEdit' },
    { componentId: 'Sidebar' },
    { componentId: 'Breadcrumb' },
  ],
  patterns: [
    { patternId: 'SettingsLayout' },
    { patternId: 'ListDetail' },
    { patternId: 'MasterDetailLayout' },
    { patternId: 'AdvancedSearchPanel' },
  ],
  theme: {
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    accentColor: '#f97316',
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
};

// ============================================================================
// E-commerce Preset
// ============================================================================

const ecommercePreset: CollectionDefinition = {
  meta: {
    id: 'e-commerce',
    name: 'E-Commerce',
    description: 'Online store components with product cards, cart, checkout flow',
    version: '1.0.0',
    category: 'e-commerce',
    tags: ['ecommerce', 'store', 'products', 'cart', 'checkout'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  components: [
    { componentId: 'ProductCard' },
    { componentId: 'Badge' },
    { componentId: 'Avatar' },
    { componentId: 'Rating' }, // Would need to be added
    { componentId: 'Drawer' },
    { componentId: 'Modal' },
    { componentId: 'FormWizard' },
    { componentId: 'Select' },
    { componentId: 'MaskedInput' },
    { componentId: 'Progress' },
    { componentId: 'EmptyState' },
  ],
  patterns: [
    { patternId: 'PricingTable' },
    { patternId: 'ArticleLayout' },
  ],
  theme: {
    primaryColor: '#ef4444',
    secondaryColor: '#3b82f6',
    accentColor: '#22c55e',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderRadius: '0.75rem',
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
// Fintech / Digital Lending OS Preset
// ============================================================================

const fintechPreset: CollectionDefinition = {
  meta: {
    id: 'fintech',
    name: 'Digital Lending OS',
    description: 'Specialized components for financial services, lending platforms, and banking applications',
    version: '1.0.0',
    category: 'fintech',
    tags: ['fintech', 'banking', 'lending', 'finance', 'loans', 'credit'],
    author: 'ROYCSS Team',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  components: [
    // Form Components
    { componentId: 'MaskedInput', props: { mask: 'currency' } },
    { componentId: 'MaskedInput', props: { mask: 'phone' } },
    { componentId: 'MaskedInput', props: { mask: 'ssn' } },
    { componentId: 'ValidatedInput', props: { type: 'email' } },
    { componentId: 'ValidatedInput', props: { type: 'number' } },
    { componentId: 'Select', props: { searchable: true } },
    { componentId: 'DatePicker', props: { variant: 'range' } },
    { componentId: 'FileUpload', props: { showPreview: true, multiple: true } },
    { componentId: 'FormWizard' },

    // Data Display
    { componentId: 'StatCard', variant: 'success' },
    { componentId: 'StatCard', variant: 'warning' },
    { componentId: 'StatCard', variant: 'error' },
    { componentId: 'DataTable', props: { selectable: true, sortable: true } },
    { componentId: 'Progress', variant: 'linear' },
    { componentId: 'CircularProgress' },
    { componentId: 'SegmentedProgress' },
    { componentId: 'ProfileCard' },
    { componentId: 'Badge' },
    { componentId: 'AvatarGroup' },

    // Navigation
    { componentId: 'Breadcrumb' },
    { componentId: 'Tabs', variant: 'enclosed' },
    { componentId: 'Sidebar' },
    { componentId: 'CommandPalette' },

    // Overlay
    { componentId: 'Modal', size: 'lg' },
    { componentId: 'Drawer', position: 'right' },
    { componentId: 'Popover' },
    { componentId: 'Tooltip' },

    // Feedback
    { componentId: 'Alert' },
    { componentId: 'ConfirmDialog', variant: 'destructive' },
    { componentId: 'ToastContainer' },
    { componentId: 'EmptyState' },
    { componentId: 'SuccessAnimation' },
    { componentId: 'ErrorBoundary' },
  ],
  patterns: [
    // Layout Patterns
    { patternId: 'DashboardGrid' },
    { patternId: 'SettingsLayout' },
    { patternId: 'ListDetail' },
    { patternId: 'MasterDetailLayout' },

    // Content Patterns
    { patternId: 'DocumentationLayout' },
    { patternId: 'FeatureComparison' },

    // Form Patterns
    { patternId: 'SearchFilterBar' },
    { patternId: 'AdvancedSearchPanel' },
    { patternId: 'InlineEdit' },
    { patternId: 'BulkEditBar' },
  ],
  theme: {
    primaryColor: '#059669', // Emerald - trust, finance, growth
    secondaryColor: '#7c3aed', // Purple - innovation, technology
    accentColor: '#d97706', // Amber/Orange - warnings, attention
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
  },
  dependencies: ['react', 'tailwindcss', 'clsx', 'tailwind-merge'],
  customStyles: `
    /* Fintech-specific custom styles */
    .fintech-gradient {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    
    .fintech-card-glow {
      box-shadow: 0 0 20px rgba(5, 150, 105, 0.15);
    }
    
    .amount-positive {
      color: #059669;
    }
    
    .amount-negative {
      color: #dc2626;
    }
    
    .risk-low { background-color: #d1fae5; color: #065f46; }
    .risk-medium { background-color: #fef3c7; color: #92400e; }
    .risk-high { background-color: #fee2e2; color: #991b1b; }
  `,
  documentation: {
    overview: `The Digital Lending OS preset is specifically designed for financial service applications.
It includes specialized form inputs for currency, phone numbers, SSN validation, document uploads,
and multi-step loan application wizards.`,
    installation: `Install the fintech preset and configure your theme with emerald/green primary colors
to convey trust and financial stability.`,
    usage: `Use FormWizard for multi-step loan applications, StatCards for portfolio metrics,
and DataTable with advanced filtering for customer/loan management.`,
    customization: `Customize the accent colors based on your brand identity while maintaining
the green/emerald primary for trust signals in financial interfaces.`,
  },
};

// ============================================================================
// Register All Presets
// ============================================================================

export function registerAllPresets(): void {
  registerPreset(dashboardPreset);
  registerPreset(landingPagePreset);
  registerPreset(adminPanelPreset);
  registerPreset(ecommercePreset);
  registerPreset(fintechPreset);
}

// Export presets individually for direct use
export { dashboardPreset, landingPagePreset, adminPanelPreset, ecommercePreset, fintechPreset };
