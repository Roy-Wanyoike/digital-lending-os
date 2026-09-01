/**
 * Marketplace Validators
 * @module roycss/marketplace/validators
 * @description Validation utilities for marketplace items
 */

import { 
  MarketplaceItem, 
  PublishRequest, 
  MarketplaceItemType,
  Review 
} from './types';

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/** Validation warning */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/** Required fields per item type */
const REQUIRED_FIELDS: Record<MarketplaceItemType, string[]> = {
  effect: ['name', 'description', 'type', 'license'],
  component: ['name', 'description', 'type', 'license'],
  pattern: ['name', 'description', 'type', 'license'],
  template: ['name', 'description', 'type', 'license'],
  theme: ['name', 'description', 'type', 'license'],
  plugin: ['name', 'description', 'type', 'license']
};

/** Valid licenses */
const VALID_LICENSES = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0',
  'BSD-3-Clause',
  'ISC',
  'UNLICENSED',
  'COMMERCIAL'
];

/** Maximum lengths */
const MAX_LENGTHS = {
  name: 100,
  description: 500,
  longDescription: 10000,
  tags: 10,
  categories: 5,
  screenshots: 10
};

/**
 * Validate publish request
 */
export function validatePublishRequest(data: PublishRequest): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate required fields
  const required = REQUIRED_FIELDS[data.type] || REQUIRED_FIELDS.effect;
  
  for (const field of required) {
    if (!(data as any)[field]) {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED_FIELD_MISSING'
      });
    }
  }

  // Validate name
  if (data.name) {
    if (data.name.length > MAX_LENGTHS.name) {
      errors.push({
        field: 'name',
        message: `Name must be ${MAX_LENGTHS.name} characters or less`,
        code: 'NAME_TOO_LONG'
      });
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.name)) {
      errors.push({
        field: 'name',
        message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
        code: 'NAME_INVALID_CHARS'
      });
    }
  }

  // Validate description
  if (data.description && data.description.length > MAX_LENGTHS.description) {
    errors.push({
      field: 'description',
      message: `Description must be ${MAX_LENGTHS.description} characters or less`,
      code: 'DESCRIPTION_TOO_LONG'
    });
  }

  // Validate license
  if (data.license && !VALID_LICENSES.includes(data.license)) {
    errors.push({
      field: 'license',
      message: `Invalid license. Must be one of: ${VALID_LICENSES.join(', ')}`,
      code: 'INVALID_LICENSE'
    });
  }

  // Validate tags
  if (data.tags) {
    if (data.tags.length > MAX_LENGTHS.tags) {
      errors.push({
        field: 'tags',
        message: `Maximum ${MAX_LENGTHS.tags} tags allowed`,
        code: 'TOO_MANY_TAGS'
      });
    }

    // Check for invalid tag formats
    const invalidTags = data.tags.filter(tag => 
      !/^[a-z0-9][a-z0-9\-]*$/.test(tag)
    );
    
    if (invalidTags.length > 0) {
      warnings.push({
        field: 'tags',
        message: `Tags should be lowercase and use hyphens: ${invalidTags.join(', ')}`,
        code: 'TAG_FORMAT_WARNING'
      });
    }
  }

  // Validate price
  if (data.price !== null && data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push({
        field: 'price',
        message: 'Price must be a positive number or null (free)',
        code: 'INVALID_PRICE'
      });
    }

    if (data.price > 99999) {
      warnings.push({
        field: 'price',
        message: 'Price seems unusually high',
        code: 'HIGH_PRICE_WARNING'
      });
    }
  }

  // Validate URLs
  const urls = ['demoUrl', 'docsUrl', 'repositoryUrl'] as const;
  
  for (const urlField of urls) {
    const urlValue = data[urlField];
    if (urlValue && !isValidURL(urlValue)) {
      errors.push({
        field: urlField,
        message: `Invalid URL format for ${urlField}`,
        code: 'INVALID_URL'
      });
    }
  }

  // Validate source files
  if (data.sourceFiles && data.sourceFiles.length === 0) {
    errors.push({
      field: 'sourceFiles',
      message: 'At least one source file is required',
      code: 'NO_SOURCE_FILES'
    });
  }

  // Type-specific validations
  validateTypeSpecific(data, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Type-specific validations
 */
function validateTypeSpecific(
  data: PublishRequest, 
  errors: ValidationError[], 
  warnings: ValidationWarning[]
): void {
  switch (data.type) {
    case 'effect':
      // Effects should have animation-related keywords in tags
      if (data.tags && !data.tags.some(t => ['animation', 'transition', 'hover', 'effect'].includes(t))) {
        warnings.push({
          field: 'tags',
          message: 'Consider adding animation-related tags for better discoverability',
          code: 'EFFECT_TAG_SUGGESTION'
        });
      }
      break;

    case 'component':
      // Components benefit from having screenshots
      if (!data.screenshots || data.screenshots.length === 0) {
        warnings.push({
          field: 'screenshots',
          message: 'Components with screenshots get more downloads',
          code: 'SCREENSHOT_RECOMMENDATION'
        });
      }
      break;

    case 'theme':
      // Themes should include color palette info
      if (data.longDescription && !data.longDescription.toLowerCase().includes('color')) {
        warnings.push({
          field: 'longDescription',
          message: 'Consider documenting the color palette in your description',
          code: 'THEME_COLOR_DOCUMENTATION'
        });
      }
      break;

    case 'plugin':
      // Plugins need clear documentation
      if (!data.docsUrl) {
        warnings.push({
          field: 'docsUrl',
          message: 'Plugins should include documentation',
          code: 'PLUGIN_DOCS_RECOMMENDED'
        });
      }
      break;
  }
}

/**
 * Validate review
 */
export function validateReview(review: { rating: number; content: string }): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rating validation
  if (!review.rating || review.rating < 1 || review.rating > 5) {
    errors.push({
      field: 'rating',
      message: 'Rating must be between 1 and 5',
      code: 'INVALID_RATING'
    });
  }

  // Content validation
  if (!review.content || review.content.trim().length < 10) {
    errors.push({
      field: 'content',
      message: 'Review content must be at least 10 characters',
      code: 'REVIEW_TOO_SHORT'
    });
  }

  if (review.content.length > 5000) {
    errors.push({
      field: 'content',
      message: 'Review content must be 5000 characters or less',
      code: 'REVIEW_TOO_LONG'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate URL format
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate item score for search ranking
 */
export function calculateSearchScore(item: MarketplaceItem, query: string): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();

  // Exact name match
  if (item.name.toLowerCase() === lowerQuery) score += 100;
  else if (item.name.toLowerCase().includes(lowerQuery)) score += 50;

  // Description match
  if (item.description.toLowerCase().includes(lowerQuery)) score += 25;

  // Tag matches
  const tagMatches = item.tags.filter(tag => tag.includes(lowerQuery)).length;
  score += tagMatches * 15;

  // Category match
  if (item.categories.some(cat => cat.includes(lowerQuery))) score += 20;

  // Popularity boost
  score += Math.log(item.downloads + 1) * 2;
  score += item.rating * 5;

  // Recency boost (items updated in last 30 days)
  const daysSinceUpdate = (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 30) score += 10 - daysSinceUpdate / 3;

  return score;
}
