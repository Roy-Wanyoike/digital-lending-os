/**
 * ROYCSS Preview Generator Utility
 * 
 * Generates preview configurations for effect visualization.
 * 
 * @module roycss/effects/utils/preview-generator
 * @version 1.0.0
 */

import { RoyCSSEffect, EffectPreviewConfig } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Preview size configuration
 */
export interface PreviewSize {
  width: number;
  height: number;
  label: string;
}

/** Available preview sizes */
export const PREVIEW_SIZES: Record<string, PreviewSize> = {
  small: { width: 200, height: 150, label: 'Small' },
  medium: { width: 400, height: 300, label: 'Medium' },
  large: { width: 600, height: 450, label: 'Large' },
};

/**
 * Preview theme configuration
 */
export interface PreviewTheme {
  name: string;
  background: string;
  textColor: string;
  gridColor?: string;
}

/** Available preview themes */
export const PREVIEW_THEMES: Record<string, PreviewTheme> = {
  light: {
    name: 'Light',
    background: '#ffffff',
    textColor: '#1f2937',
    gridColor: '#f3f4f6',
  },
  dark: {
    name: 'Dark',
    background: '#1f2937',
    textColor: '#f9fafb',
    gridColor: '#374151',
  },
  gradient: {
    name: 'Gradient',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
  },
};

// ============================================================================
// Preview Configuration Generator
// ============================================================================

/**
 * Generate complete preview configuration for an effect
 * 
 * @param effect - The effect to generate preview config for
 * @param overrides - Optional configuration overrides
 * @returns Complete preview configuration
 */
export function generatePreviewConfig(
  effect: RoyCSSEffect,
  overrides: Partial<EffectPreviewConfig> = {}
): EffectPreviewConfig {
  const defaultConfig: EffectPreviewConfig = {
    effect,
    customValues: {},
    size: getRecommendedSize(effect),
    showCode: false,
    theme: 'light',
    autoPlay: shouldAutoPlay(effect),
    speedMultiplier: 1,
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * Get recommended preview size based on effect type
 */
function getRecommendedSize(effect: RoyCSSEffect): EffectPreviewConfig['size'] {
  switch (effect.category) {
    case 'text':
      return 'medium';
    case 'layout':
      if (effect.subCategory === 'card') {
        return 'large';
      }
      return 'large';
    case 'animation':
      if (effect.subCategory === 'loading') {
        return 'small';
      }
      return 'medium';
    case 'visual':
      return 'medium';
    case 'interactive':
    case 'transition':
      return 'medium';
    default:
      return 'medium';
  }
}

/**
 * Determine if effect should auto-play animations
 */
function shouldAutoPlay(effect: RoyCSSEffect): boolean {
  // Auto-play for looping animations and loading effects
  if (effect.category === 'animation') {
    return ['looping', 'loading'].includes(effect.subCategory || '');
  }
  
  // Auto-play for some visual effects with animation
  if (effect.category === 'visual') {
    const animatedEffects = [
      'animated-shadow', 'floating-shadow', 'animated-gradient',
      'gradient-shift', 'morph-blob', 'hue-rotate-loop'
    ];
    return animatedEffects.includes(effect.id);
  }

  return false;
}

// ============================================================================
// Preview HTML Generation
// ============================================================================

/**
 * Generate complete HTML document for standalone preview
 * 
 * @param effect - The effect to generate preview for
 * @returns Complete HTML string
 */
export function generateStandalonePreviewHTML(effect: RoyCSSEffect): string {
  const css = effect.css;
  const htmlContent = generatePreviewContent(effect);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${effect.name} - ROYCSS Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px;
    }
    
    .preview-container {
      max-width: 800px;
      width: 100%;
    }
    
    .preview-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .preview-header h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 8px;
    }
    
    .preview-header p {
      color: #6b7280;
      font-size: 14px;
    }
    
    .preview-area {
      background: white;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }
    
    /* Effect CSS */
    ${css}
    
    .preview-content {
      ${getPreviewStyles(effect)}
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h1>${effect.name}</h1>
      <p>${effect.description}</p>
    </div>
    <div class="preview-area">
      <div class="preview-content">
        ${htmlContent}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get additional styles for preview container
 */
function getPreviewStyles(effect: RoyCSSEffect): string {
  switch (effect.category) {
    case 'text':
      return 'font-size: 32px; font-weight: bold;';
    case 'animation':
      if (effect.subCategory === 'loading') {
        return '';
      }
      return 'width: 120px; height: 120px; background: #3b82f6; border-radius: 12px;';
    case 'layout':
      if (effect.subCategory === 'card') {
        return 'width: 320px;';
      }
      return 'width: 100%;';
    case 'visual':
      return 'width: 160px; height: 160px; border-radius: 12px;';
    case 'interactive':
    case 'transition':
      return '';
    default:
      return 'padding: 24px;';
  }
}

/**
 * Generate preview content HTML based on effect type
 */
function generatePreviewContent(effect: RoyCSSEffect): string {
  const className = effect.id;

  switch (effect.category) {
    case 'text':
      return `<span class="${className}">${effect.name.replace(/([A-Z])/g, ' $1').trim()}</span>`;
    
    case 'animation':
      if (effect.subCategory === 'loading') {
        return `<div class="${className}"></div>`;
      }
      return `<div class="${className}"></div>`;
    
    case 'layout':
      if (effect.subCategory === 'card') {
        return `<div class="${className}">
          <img src="https://via.placeholder.com/400x200" alt="Preview" style="width:100%;border-radius:8px;margin-bottom:16px;">
          <h3 style="margin-bottom:8px;">Card Title</h3>
          <p style="color:#6b7280;">This is a sample card with the applied effect.</p>
        </div>`;
      }
      return `<div class="${className}">
        <div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;"></div>
        <div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;"></div>
        <div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;"></div>
        <div style="width:60px;height:60px;background:#e5e7eb;border-radius:8px;"></div>
      </div>`;
    
    case 'visual':
      return `<div class="${className}"></div>`;
    
    case 'interactive':
    case 'transition':
      return `<button class="${className}" style="padding:14px 28px;font-size:16px;cursor:pointer;">
        Hover or Click Me
      </button>`;
    
    default:
      return `<div class="${className}">
        <span>Effect Preview</span>
      </div>`;
  }
}

// ============================================================================
// Thumbnail Generation
// ============================================================================

/**
 * Generate placeholder thumbnail data URL
 * In production, this would render actual preview
 * 
 * @param effect - The effect to generate thumbnail for
 * @returns SVG data URL as placeholder
 */
export function generateThumbnailPlaceholder(effect: RoyCSSEffect): string {
  const categoryColors: Record<string, string> = {
    animation: '#8b5cf6',
    transition: '#06b6d4',
    visual: '#f59e0b',
    layout: '#10b981',
    interactive: '#ef4444',
    text: '#ec4899',
  };

  const color = categoryColors[effect.category] || '#6b7280';
  const initials = effect.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
      <rect width="200" height="150" fill="#f3f4f6" rx="8"/>
      <rect x="10" y="10" width="180" height="130" fill="white" rx="6"/>
      <circle cx="100" cy="65" r="25" fill="${color}" opacity="0.2"/>
      <text x="100" y="72" text-anchor="middle" fill="${color}" font-family="system-ui" font-size="24" font-weight="bold">${initials}</text>
      <text x="100" y="110" text-anchor="middle" fill="#6b7280" font-family="system-ui" font-size="11">${effect.name}</text>
      <rect x="30" y="125" width="140" height="4" fill="${color}" opacity="0.3" rx="2"/>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

// ============================================================================
// Code Display Utilities
// ============================================================================

/**
 * Format CSS code for display with syntax highlighting info
 * 
 * @param css - Raw CSS code
 * @returns Formatted code object
 */
export function formatCodeForDisplay(css: string): {
  formatted: string;
  lines: Array<{ content: string; type: string }>;
} {
  const lines = css.split('\n');
  const formattedLines = lines.map(line => ({
    content: line || ' ',
    type: detectLineType(line),
  }));

  return {
    formatted: css,
    lines: formattedLines,
  };
}

/**
 * Detect the type of a CSS line for highlighting
 */
function detectLineType(line: string): string {
  const trimmed = line.trim();
  
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return 'comment';
  if (trimmed.startsWith('@')) return 'at-rule';
  if (trimmed.includes('{') && !trimmed.includes(':')) return 'selector';
  if (trimmed.includes(':') && trimmed.includes(';')) return 'property';
  if (trimmed === '{' || trimmed === '}') return 'brace';
  
  return 'unknown';
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Generate shareable URL parameters for an effect
 * 
 * @param effect - The effect to share
 * @returns URL-encoded parameters
 */
export function generateShareParams(effect: RoyCSSEffect): string {
  const params = new URLSearchParams({
    id: effect.id,
    name: effect.name,
    category: effect.category,
  });

  return params.toString();
}

/**
 * Parse shared effect from URL params
 * 
 * @param params - URL search params
 * @returns Effect ID or null
 */
export function parseShareParams(params: URLSearchParams): string | null {
  return params.get('id');
}

// ============================================================================
// Exports
// ============================================================================

export {
  generatePreviewContent,
  getRecommendedSize,
  shouldAutoPlay,
};

export default {
  generatePreviewConfig,
  generateStandalonePreviewHTML,
  generateThumbnailPlaceholder,
  formatCodeForDisplay,
  generateShareParams,
  parseShareParams,
  PREVIEW_SIZES,
  PREVIEW_THEMES,
};
