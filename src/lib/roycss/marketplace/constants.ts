/**
 * Marketplace Constants
 * @module roycss/marketplace/constants
 * @description Constants and enums for the marketplace
 */

/** Supported item types */
export const ITEM_TYPES = {
  EFFECT: 'effect',
  COMPONENT: 'component',
  PATTERN: 'pattern',
  TEMPLATE: 'template',
  THEME: 'theme',
  PLUGIN: 'plugin'
} as const;

/** Item type display names */
export const ITEM_TYPE_NAMES: Record<string, string> = {
  effect: 'Effect',
  component: 'Component',
  pattern: 'Pattern',
  template: 'Template',
  theme: 'Theme',
  plugin: 'Plugin'
};

/** Item type icons (emoji) */
export const ITEM_TYPE_ICONS: Record<string, string> = {
  effect: '✨',
  component: '🧩',
  pattern: '📐',
  template: '📄',
  theme: '🎨',
  plugin: '🔌'
};

/** Default categories */
export const CATEGORIES = {
  effect: ['animation', 'transition', 'interaction', 'loading', 'scroll', 'hover'],
  component: ['navigation', 'form', 'layout', 'feedback', 'overlay', 'display', 'media'],
  pattern: ['layout-centering', 'layout-responsive', 'navigation-sticky', 'theming-dark-mode', 'typography-responsive'],
  template: ['landing-page', 'dashboard', 'portfolio', 'blog', 'ecommerce', 'documentation'],
  theme: ['minimal', 'dark', 'colorful', 'corporate', 'creative', 'retro'],
  plugin: ['utility', 'integration', 'extension', 'tool']
} as const;

/** Supported licenses */
export const LICENSES = [
  { value: 'MIT', name: 'MIT License', url: 'https://opensource.org/licenses/MIT' },
  { value: 'Apache-2.0', name: 'Apache 2.0', url: 'https://opensource.org/licenses/Apache-2.0' },
  { value: 'GPL-3.0', name: 'GPL 3.0', url: 'https://www.gnu.org/licenses/gpl-3.0' },
  { value: 'BSD-3-Clause', name: 'BSD 3-Clause', url: 'https://opensource.org/licenses/BSD-3-Clause' },
  { value: 'ISC', name: 'ISC License', url: 'https://opensource.org/licenses/ISC' },
  { value: 'UNLICENSED', name: 'All Rights Reserved', url: null },
  { value: 'COMMERCIAL', name: 'Commercial License', url: null }
];

/** Sort options */
export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'updated', label: 'Recently Updated' }
];

/** Price ranges */
export const PRICE_RANGES = [
  { label: 'Free', min: 0, max: 0 },
  { label: 'Under $5', min: 0, max: 5 },
  { label: '$5 - $15', min: 5, max: 15 },
  { label: '$15 - $50', min: 15, max: 50 },
  { label: '$50+', min: 50, max: Infinity }
];

/** Review status labels */
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived'
};

/** Visibility labels */
export const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  private: 'Private',
  unlisted: 'Unlisted'
};

/** API endpoints */
export const API_ENDPOINTS = {
  ITEMS: '/items',
  ITEM_BY_ID: (id: string) => `/items/${id}`,
  FEATURED: '/items/featured',
  POPULAR: '/items/popular',
  NEW: '/items/new',
  CATEGORIES: '/categories',
  COLLECTIONS: '/collections',
  SEARCH: '/items/search',
  DOWNLOAD: (id: string) => `/items/${id}/download`,
  REVIEWS: (id: string) => `/items/${id}/reviews`,
  USER_STATS: (userId: string) => `/users/${userId}/stats`,
  PUBLISH: '/items/publish',
  MY_ITEMS: '/items/mine'
};

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1
};

/** Rating bounds */
export const RATING = {
  MIN: 1,
  MAX: 5,
  INCREMENT: 0.5
};

/** File upload limits */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SCREENSHOTS: 10,
  MAX_SOURCE_FILES: 50,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_ARCHIVE_TYPES: ['application/zip', 'application/x-gzip']
};
