/**
 * ROYCSS Export Utilities
 * 
 * Utilities for exporting effects in various formats.
 * 
 * @module roycss/effects/utils/export-utils
 * @version 1.0.0
 */

import { RoyCSSEffect, ExportFormat, ExportOptions, ExportResult } from '../types';
import { generateCSS, generateJSX, getTailwindClasses } from './css-generator';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export an effect in the specified format
 * 
 * @param effect - The effect to export
 * @param options - Export options
 * @returns Export result with content and metadata
 */
export function exportEffect(
  effect: RoyCSSEffect,
  options: ExportOptions
): ExportResult {
  const {
    format,
    includeComments = true,
    minify = false,
    includePrefixes = true,
    filename = effect.id,
  } = options;

  switch (format) {
    case 'css':
      return exportAsCSS(effect, { includeComments, minify, includePrefixes, filename });
    
    case 'jsx':
      return exportAsJSX(effect, { filename });
    
    case 'tailwind':
      return exportAsTailwind(effect, { filename });
    
    case 'json':
      return exportAsJSON(effect, { filename });
    
    case 'codepen':
      return exportAsCodePen(effect);
    
    case 'codesandbox':
      return exportAsCodeSandbox(effect);
    
    case 'gist':
      return exportAsGist(effect);
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ============================================================================
// CSS Export
// ============================================================================

interface CSSExportOptions {
  includeComments?: boolean;
  minify?: boolean;
  includePrefixes?: boolean;
  filename: string;
}

function exportAsCSS(
  effect: RoyCSSEffect,
  options: CSSExportOptions
): ExportResult {
  const css = generateCSS(effect, {
    includeComments: options.includeComments,
    minify: options.minify,
    includePrefixes: options.includePrefixes,
  });

  let content = css;

  if (options.includeComments && !options.minify) {
    content = `/*\n * ${effect.name}\n * ROYCSS Effect Library\n * Category: ${effect.category}\n * Difficulty: ${effect.difficulty}\n */\n\n${css}`;
  }

  return {
    content,
    filename: `${options.filename}.css`,
    mimeType: 'text/css',
    format: 'css',
  };
}

// ============================================================================
// JSX/React Export
// ============================================================================

interface JSXExportOptions {
  filename: string;
}

function exportAsJSX(
  effect: RoyCSSEffect,
  options: JSXExportOptions
): ExportResult {
  const jsx = generateJSX(effect, {
    componentName: toComponentName(options.filename),
  });

  // Wrap with imports if not already present
  const hasImports = jsx.includes('import');
  let content = jsx;

  if (!hasImports) {
    content = `'use client';\n\n${jsx}`;
  }

  return {
    content,
    filename: `${options.filename}.tsx`,
    mimeType: 'text/typescript',
    format: 'jsx',
  };
}

// ============================================================================
// Tailwind Export
// ============================================================================

interface TailwindExportOptions {
  filename: string;
}

function exportAsTailwind(
  effect: RoyCSSEffect,
  options: TailwindExportOptions
): ExportResult {
  const tailwindClasses = getTailwindClasses(effect);

  if (!tailwindClasses) {
    // Return a message if no Tailwind equivalent exists
    return {
      content: `/* ${effect.name} does not have a direct Tailwind equivalent.\n * Use the CSS version instead.\n */\n\n/* Original CSS:\n${effect.css}`,
      filename: `${options.filename}-tailwind.txt`,
      mimeType: 'text/plain',
      format: 'tailwind',
    };
  }

  const content = `/* ${effect.name} - Tailwind CSS Classes */\n\n/* HTML Element */\nclass="${tailwindClasses}"\n\n/* React/JSX */\nclassName="${tailwindClasses}"\n\n/* Full Example */\n<div className="${tailwindClasses}">\n  {/* Your content */}\n</div>`;

  return {
    content,
    filename: `${options.filename}-tailwind.css`,
    mimeType: 'text/css',
    format: 'tailwind',
  };
}

// ============================================================================
// JSON Export
// ============================================================================

interface JSONExportOptions {
  filename: string;
}

function exportAsJSON(
  effect: RoyCSSEffect,
  options: JSONExportOptions
): ExportResult {
  const jsonEffect = {
    id: effect.id,
    name: effect.name,
    category: effect.category,
    subCategory: effect.subCategory,
    description: effect.description,
    tags: effect.tags,
    difficulty: effect.difficulty,
    customizable: effect.customizable,
    properties: effect.properties,
    browserSupport: effect.browserSupport,
    css: effect.css,
    tailwind: effect.tailwind || null,
  };

  const content = JSON.stringify(jsonEffect, null, 2);

  return {
    content,
    filename: `${options.filename}.json`,
    mimeType: 'application/json',
    format: 'json',
  };
}

// ============================================================================
// CodePen Export
// ============================================================================

function exportAsCodePen(effect: RoyCSSEffect): ExportResult {
  const htmlContent = generatePreviewHTML(effect);
  
  const penConfig = {
    title: `${effect.name} - ROYCSS Effect`,
    description: effect.description,
    html: htmlContent,
    css: effect.css,
    js: '',
    css_pre_processor: 'none',
    js_pre_processor: 'none',
    css_external: '',
    js_external: '',
    editors: '101', // Show CSS panel by default
    layout: 'left',
  };

  // Generate CodePen share URL
  const params = new URLSearchParams({
    title: penConfig.title,
    description: penConfig.description,
    css: penConfig.css,
    html: penConfig.html,
  });

  const codepenUrl = `https://codepen.io/pen/pen/guide?${params.toString()}`;

  const content = `/* CodePen Export for ${effect.name} */

/* Option 1: Open directly in CodePen */
URL: ${codepenUrl}

/* Option 2: Copy this to CodePen's CSS editor */
${effect.css}

/* Option 3: HTML Structure */
${htmlContent}`;

  return {
    content,
    filename: `${effect.id}-codepen.txt`,
    mimeType: 'text/plain',
    format: 'codepen',
  };
}

// ============================================================================
// CodeSandbox Export
// ============================================================================

function exportAsCodeSandbox(effect: RoyCSSEffect): ExportResult {
  const componentName = toComponentName(effect.id);

  const content = `// CodeSandbox Export for ${effect.name}
// Create a new React sandbox and paste these files:

// === App.tsx ===
import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ padding: '40px', minHeight: '100vh', background: '#f3f4f6' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>
        ${effect.name}
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <${componentName} />
      </div>
    </div>
  );
};

export default App;

// === ${componentName}.tsx ===
${generateJSX(effect, { componentName })}

// === styles.css (add to main.tsx or App.tsx) ===
${effect.css}`;

  return {
    content,
    filename: `${effect.id}-codesandbox.txt`,
    mimeType: 'text/plain',
    format: 'codesandbox',
  };
}

// ============================================================================
// GitHub Gist Export
// ============================================================================

function exportAsGist(effect: RoyCSSEffect): ExportResult {
  const content = `# ${effect.name}

**Category:** ${effect.category}${effect.subCategory ? ` / ${effect.subCategory}` : ''}  
**Difficulty:** ${effect.difficulty}  
**Tags:** ${effect.tags.join(', ')}

## Description

${effect.description}

## CSS

\`\`\`css
${effect.css}
\`\`\`

${effect.tailwind ? `## Tailwind CSS Alternative

\`\`\`html
class="${effect.tailwind}"
\`\`\`` : ''}

## Properties

${effect.properties.length > 0 
  ? effect.properties.map(p => `- **${p.name}** (${p.type}): ${p.description}`).join('\n')
  : 'No customizable properties.'
}

## Browser Support

- Supported: ${effect.browserSupport.supported.join(', ')}
${effect.browserSupport.partialSupport?.length ? `- Partial: ${effect.browserSupport.partialSupport.join(', ')}` : ''}
${effect.browserSupport.unsupported?.length ? `- Unsupported: ${effect.browserSupport.unsupported.join(', ')}` : ''}

---
*Generated by [ROYCSS Effect Library](https://roycss.dev)*`;

  return {
    content,
    filename: `${effect.id}.md`,
    mimeType: 'text/markdown',
    format: 'gist',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert string to component name format
 */
function toComponentName(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generate preview HTML for exports
 */
function generatePreviewHTML(effect: RoyCSSEffect): string {
  const className = effect.id;
  
  switch (effect.category) {
    case 'text':
      return `<div class="${className}">${effect.name}</div>`;
    case 'animation':
      return `<div class="${className}"></div>`;
    default:
      return `<div class="${className}">
  <span>Preview Content</span>
</div>`;
  }
}

// ============================================================================
// Batch Export
// ============================================================================

/**
 * Export multiple effects at once
 * 
 * @param effects - Array of effects to export
 * @param format - Export format
 * @param options - Export options
 * @returns Array of export results
 */
export function batchExportEffects(
  effects: RoyCSSEffect[],
  format: Exclude<ExportFormat, 'codepen' | 'codesandbox' | 'gist'>,
  options: Omit<ExportOptions, 'format'>
): ExportResult[] {
  return effects.map(effect => 
    exportEffect(effect, { ...options, format })
  );
}

/**
 * Generate a complete library export (all effects as JSON)
 * 
 * @param effects - All effects to include
 * @returns Complete library JSON
 */
export function exportLibraryCatalog(effects: RoyCSSEffect[]): string {
  const catalog = {
    name: 'ROYCSS Effect Library',
    version: '1.0.0',
    description: 'Comprehensive CSS Effects Library',
    exportedAt: new Date().toISOString(),
    totalEffects: effects.length,
    categories: groupEffectsByCategory(effects),
    effects: effects.map(({ jsx, ...rest }) => rest), // Exclude JSX from bulk export
  };

  return JSON.stringify(catalog, null, 2);
}

/**
 * Group effects by category
 */
function groupEffectsByCategory(effects: RoyCSSEffect[]) {
  const groups: Record<string, number> = {};
  
  effects.forEach(effect => {
    groups[effect.category] = (groups[effect.category] || 0) + 1;
  });

  return groups;
}

// ============================================================================
// Clipboard Utilities
// ============================================================================

/**
 * Copy text to clipboard
 * 
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Copy effect CSS to clipboard
 * 
 * @param effect - Effect to copy CSS from
 * @returns Promise that resolves when copied
 */
export async function copyEffectCSS(effect: RoyCSSEffect): Promise<boolean> {
  const css = generateCSS(effect);
  return copyToClipboard(css);
}

/**
 * Copy effect Tailwind classes to clipboard
 * 
 * @param effect - Effect to copy Tailwind from
 * @returns Promise that resolves when copied, or false if no Tailwind equivalent
 */
export async function copyEffectTailwind(effect: RoyCSSEffect): Promise<boolean> {
  const tailwind = getTailwindClasses(effect);
  if (!tailwind) return false;
  return copyToClipboard(tailwind);
}

// ============================================================================
// Download Utilities
// ============================================================================

/**
 * Trigger file download in browser
 * 
 * @param content - File content
 * @param filename - Download filename
 * @param mimeType - File MIME type
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download effect as CSS file
 * 
 * @param effect - Effect to download
 */
export function downloadEffectCSS(effect: RoyCSSEffect): void {
  const result = exportAsCSS(effect, { filename: effect.id });
  downloadFile(result.content, result.filename, result.mimeType);
}

/**
 * Download effect as JSON
 * 
 * @param effect - Effect to download
 */
export function downloadEffectJSON(effect: RoyCSSEffect): void {
  const result = exportAsJSON(effect, { filename: effect.id });
  downloadFile(result.content, result.filename, result.mimeType);
}

// ============================================================================
// Exports
// ============================================================================

export {
  exportAsCSS,
  exportAsJSX,
  exportAsTailwind,
  exportAsJSON,
  exportAsCodePen,
  exportAsCodeSandbox,
  exportAsGist,
};

export default {
  exportEffect,
  batchExportEffects,
  exportLibraryCatalog,
  copyToClipboard,
  copyEffectCSS,
  copyEffectTailwind,
  downloadFile,
  downloadEffectCSS,
  downloadEffectJSON,
};
