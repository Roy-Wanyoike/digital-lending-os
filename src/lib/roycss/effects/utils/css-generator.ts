/**
 * ROYCSS CSS Generator Utility
 * 
 * Generates CSS code from effect definitions with customization support.
 * 
 * @module roycss/effects/utils/css-generator
 * @version 1.0.0
 */

import { RoyCSSEffect, EffectProperty } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Customization values for an effect
 */
export type CustomValues = Record<string, string | number | boolean>;

/**
 * Generation options
 */
export interface CssGenerationOptions {
  /** Include vendor prefixes */
  includePrefixes?: boolean;
  /** Minify output */
  minify?: boolean;
  /** Include comments */
  includeComments?: boolean;
  /** Custom property values */
  customValues?: CustomValues;
}

// ============================================================================
// CSS Generation Functions
// ============================================================================

/**
 * Generate CSS from an effect with optional customization
 * 
 * @param effect - The effect to generate CSS for
 * @param options - Generation options
 * @returns Generated CSS string
 */
export function generateCSS(effect: RoyCSSEffect, options: CssGenerationOptions = {}): string {
  const {
    includePrefixes = true,
    minify = false,
    includeComments = true,
    customValues = {},
  } = options;

  let css = effect.css;

  // Apply custom values to properties
  if (Object.keys(customValues).length > 0) {
    css = applyCustomValues(css, effect.properties, customValues);
  }

  // Add vendor prefixes if requested
  if (includePrefixes) {
    css = addVendorPrefixes(css);
  }

  // Add header comment if requested
  if (includeComments && !minify) {
    const comment = `/* ${effect.name} - ROYCSS Effect Library */\n`;
    css = comment + css;
  }

  // Minify if requested
  if (minify) {
    css = minifyCSS(css);
  }

  return css;
}

/**
 * Apply custom values to CSS template
 * 
 * @param css - CSS template string
 * @param properties - Effect properties for reference
 * @param customValues - User-provided custom values
 * @returns Modified CSS with custom values applied
 */
function applyCustomValues(
  css: string,
  properties: EffectProperty[],
  customValues: CustomValues
): string {
  let result = css;

  for (const [key, value] of Object.entries(customValues)) {
    const property = properties.find(p => p.name === key);
    if (!property) continue;

    const stringValue = String(value);
    
    // Replace default values in CSS with custom values
    // This is a simple replacement strategy
    const regex = new RegExp(`(${escapeRegex(property.defaultValue)})`, 'g');
    result = result.replace(regex, stringValue);
  }

  return result;
}

/**
 * Add vendor prefixes to CSS
 * 
 * @param css - Input CSS
 * @returns CSS with vendor prefixes added
 */
function addVendorPrefixes(css: string): string {
  let result = css;

  // Common properties that need prefixes
  const prefixMap: Record<string, { webkit: string; moz?: string }> = {
    'backdrop-filter': { webkit: '-webkit-backdrop-filter' },
    'background-clip': { webkit: '-webkit-background-clip' },
    'text-fill-color': { webkit: '-webkit-text-fill-color' },
    'text-stroke': { webkit: '-webkit-text-stroke' },
    'appearance': { 
      webkit: '-webkit-appearance', 
      moz: '-moz-appearance' 
    },
    'transform': { webkit: '-webkit-transform' },
    'animation': { webkit: '-webkit-animation' },
    'keyframes': { webkit: '-webkit-keyframes' },
    'filter': { webkit: '-webkit-filter' },
    'mask': { webkit: '-webkit-mask' },
    'clip-path': { webkit: '-webkit-clip-path' },
    'user-select': { webkit: '-webkit-user-select' },
    'box-decoration-break': { webkit: '-webkit-box-decoration-break' },
  };

  for (const [property, prefixes] of Object.entries(prefixMap)) {
    const propRegex = new RegExp(`(?<![\\w-])${escapeRegex(property)}\\s*:`, 'g');
    
    result = result.replace(propRegex, (match) => {
      let prefixed = match;
      if (prefixes.webkit && !result.includes(prefixes.webkit)) {
        prefixed = `${prefixes.webkit}:` + result.substring(match.length + match.indexOf(':') + 1);
      }
      return `${prefixes.webkit}: ` + prefixed.substring(match.indexOf(':') + 1).trimStart();
    });
  }

  return result;
}

/**
 * Simple CSS minification
 * 
 * @param css - Input CSS
 * @returns Minified CSS
 */
function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove whitespace around selectors and braces
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    // Remove newlines and multiple spaces
    .replace(/\s+/g, ' ')
    // Remove spaces around colons and semicolons
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    // Remove final semicolon before closing brace
    .replace(/;}\s*/g, '}')
    .trim();
}

// ============================================================================
// Tailwind Class Generation
// ============================================================================

/**
 * Get Tailwind classes for an effect (if available)
 * 
 * @param effect - The effect to get Tailwind classes for
 * @returns Tailwind class string or null
 */
export function getTailwindClasses(effect: RoyCSSEffect): string | null {
  return effect.tailwind || null;
}

/**
 * Check if effect has Tailwind equivalent
 * 
 * @param effect - The effect to check
 * @returns Whether Tailwind classes are available
 */
export function hasTailwindEquivalent(effect: RoyCSSEffect): boolean {
  return !!effect.tailwind;
}

// ============================================================================
// JSX Component Generation
// ============================================================================

/**
 * Generate JSX component code for an effect
 * 
 * @param effect - The effect to generate JSX for
 * @param options - Generation options
 * @returns Generated React/JSX component code
 */
export function generateJSX(
  effect: RoyCSSEffect,
  options: { componentName?: string } = {}
): string {
  const { componentName = toPascalCase(effect.id) } = options;

  if (effect.jsx) {
    return effect.jsx;
  }

  // Auto-generate basic component from CSS
  return generateJSXFromCSS(effect, componentName);
}

/**
 * Generate JSX component from CSS
 * 
 * @param effect - The effect definition
 * @param componentName - Name for the generated component
 * @returns JSX component code
 */
function generateJSXFromCSS(effect: RoyCSSEffect, componentName: string): string {
  const className = effect.id;

  return `'use client';

import React from 'react';

interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={\`${className} ${className}\`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

${componentName}.displayName = '${componentName}';
`;
}

// ============================================================================
// HTML Preview Generation
// ============================================================================

/**
 * Generate HTML preview markup for an effect
 * 
 * @param effect - The effect to generate preview for
 * @returns HTML string for preview
 */
export function generatePreviewHTML(effect: RoyCSSEffect): string {
  const className = effect.id;
  
  // Determine appropriate preview content based on category
  const content = getPreviewContent(effect);

  return `<div class="${className}">
  ${content}
</div>`;
}

/**
 * Get appropriate preview content based on effect type
 */
function getPreviewContent(effect: RoyCSSEffect): string {
  switch (effect.category) {
    case 'text':
      return '<span>Sample Text</span>';
    case 'animation':
      if (effect.subCategory === 'loading') {
        return '';
      }
      return '<div style="width:100px;height:100px;background:#3b82f6;border-radius:8px;"></div>';
    case 'layout':
      if (effect.subCategory === 'card') {
        return `
          <h3>Card Title</h3>
          <p>This is sample card content.</p>
        `;
      }
      return '<div style="width:60px;height:60px;background:#e5e7eb;border-radius:4px;"></div>'.repeat(4);
    case 'visual':
      return '<div style="width:120px;height:120px;border-radius:12px;"></div>';
    case 'interactive':
    case 'transition':
      return '<button style="padding:12px 24px;">Hover Me</button>';
    default:
      return '<div style="padding:20px;">Effect Preview</div>';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Exports
// ============================================================================

export {
  generateJSXFromCSS,
  generatePreviewHTML,
};

export default {
  generateCSS,
  getTailwindClasses,
  hasTailwindEquivalent,
  generateJSX,
  generatePreviewHTML,
};
