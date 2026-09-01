/**
 * Export Manager
 * @module roycss/studio/lib/export-manager
 * @description Export studio projects to various formats
 */

import { useEditorStore, CanvasElement } from './editor-state';

/** Export format types */
export type ExportFormat = 'html' | 'jsx' | 'vue' | 'css-only' | 'json';

/** Export options */
export interface ExportOptions {
  format: ExportFormat;
  includeStyles?: boolean;
  minify?: boolean;
  prettier?: boolean;
  framework?: 'react' | 'vue' | 'svelte' | 'vanilla';
}

/** Generated export result */
export interface ExportResult {
  success: boolean;
  files: Array<{ name: string; content: string; language: string }>;
  warnings?: string[];
}

/**
 * Generate CSS from element styles
 */
function generateCSS(element: CanvasElement): string {
  const styles: string[] = [];
  const { style } = element;

  for (const [property, value] of Object.entries(style)) {
    if (value !== undefined && value !== '') {
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      styles.push(`  ${cssProperty}: ${value};`);
    }
  }

  return `.${element.id} {\n${styles.join('\n')}\n}`;
}

/**
 * Generate HTML for an element
 */
function generateHTML(element: CanvasElement, indent: string = ''): string {
  const { type, content, children } = element;
  
  switch (type) {
    case 'container':
      return `${indent}<div class="${element.id}">\n${indent}  ${content || ''}\n${indent}</div>`;
    
    case 'text':
      return `${indent}<p class="${element.id}">${content || 'Text content'}</p>`;
    
    case 'button':
      return `${indent}<button class="${element.id}" type="button">${content || 'Button'}</button>`;
    
    case 'image':
      return `${indent}<img class="${element.id}" src="${content || 'placeholder.jpg'}" alt="" />`;
    
    case 'input':
      return `${indent}<input class="${element.id}" type="text" placeholder="${content || 'Enter text...'}" />`;
    
    default:
      return `${indent}<div class="${element.id}">${content || ''}</div>`;
  }
}

/**
 * Generate JSX for React
 */
function generateJSX(element: CanvasElement): string {
  const { type, content, style } = element;
  const styleStr = JSON.stringify(style).replace(/"/g, "'");
  
  switch (type) {
    case 'container':
      return `<div className="${element.id}" style={${styleStr}}>${content || ''}</div>`;
    case 'text':
      return `<p className="${element.id}" style={${styleStr}}>${content || 'Text'}</p>`;
    case 'button':
      return `<button className="${element.id}" style={${styleStr}}>${content || 'Button'}</button>`;
    case 'input':
      return `<input className="${element.id}" style={${styleStr}} placeholder="${content || ''}" />`;
    default:
      return `<div className="${element.id}" style={${styleStr}}>${content || ''}</div>`;
  }
}

/**
 * Generate Vue SFC component
 */
function generateVue(element: CanvasElement): string {
  const html = generateHTML(element);
  const css = generateCSS(element);
  
  return `<template>\n  ${html}\n</template>\n\n<script setup>\n// Component code\n</script>\n\n<style scoped>\n${css}\n</style>`;
}

/**
 * Main export function
 */
export function exportProject(options: ExportOptions): ExportResult {
  const state = useEditorStore.getState();
  const elements = Object.values(state.elements);
  const files: ExportResult['files'] = [];
  const warnings: string[] = [];

  if (elements.length === 0) {
    return {
      success: false,
      files: [],
      warnings: ['No elements to export']
    };
  }

  switch (options.format) {
    case 'html': {
      let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
      html += '  <meta charset="UTF-8">\n';
      html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
      html += '  <title>ROYCSS Studio Export</title>\n';
      html += '  <style>\n';
      
      // Add CSS for each element
      elements.forEach(el => {
        html += generateCSS(el) + '\n';
      });
      
      html += '  </style>\n</head>\n<body>\n';
      
      // Add HTML for each element
      elements.forEach(el => {
        html += generateHTML(el, '  ') + '\n';
      });
      
      html += '</body>\n</html>';
      
      files.push({ name: 'index.html', content: html, language: 'html' });
      break;
    }

    case 'jsx': {
      let jsx = "import React from 'react';\n\n";
      jsx += 'export default function StudioExport() {\n';
      jsx += '  return (\n';
      jsx += '    <div className="studio-container">\n';
      
      elements.forEach(el => {
        jsx += '      ' + generateJSX(el) + '\n';
      });
      
      jsx += '    </div>\n'; 
      jsx += '  );\n';
      jsx += '}';
      
      files.push({ name: 'StudioExport.jsx', content: jsx, language: 'javascript' });
      
      // Also export CSS file
      let cssContent = '/* ROYCSS Studio Export */\n\n';
      elements.forEach(el => {
        cssContent += generateCSS(el) + '\n';
      });
      files.push({ name: 'StudioExport.css', content: cssContent, language: 'css' });
      break;
    }

    case 'vue': {
      let vueTemplate = '<template>\n  <div class="studio-container">\n';
      elements.forEach(el => {
        vueTemplate += '    ' + generateHTML(el) + '\n';
      });
      vueTemplate += '  </div>\n</template>';

      let vueScript = '<script setup>\n// ROYCSS Studio Export\n</script>';

      let vueStyle = '<style scoped>\n/* ROYCSS Studio Export */\n\n';
      elements.forEach(el => {
        vueStyle += generateCSS(el) + '\n';
      });
      vueStyle += '</style>';

      files.push({ 
        name: 'StudioExport.vue', 
        content: `${vueTemplate}\n\n${vueScript}\n\n${vueStyle}`, 
        language: 'vue' 
      });
      break;
    }

    case 'css-only': {
      let css = '/* ROYCSS Studio Export */\n/* Generated at: ' + new Date().toISOString() + ' */\n\n';
      elements.forEach(el => {
        css += `/* ${el.name} (${el.type}) */\n`;
        css += generateCSS(el) + '\n\n';
      });
      files.push({ name: 'styles.css', content: css, language: 'css' });
      break;
    }

    case 'json': {
      const json = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        canvasSize: state.canvasSize,
        elements: elements.map(el => ({
          id: el.id,
          type: el.type,
          name: el.name,
          position: el.position,
          size: el.size,
          style: el.style,
          content: el.content
        }))
      };
      files.push({ 
        name: 'project.json', 
        content: JSON.stringify(json, null, 2), 
        language: 'json' 
      });
      break;
    }
  }

  return {
    success: true,
    files,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Copy export to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
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

export default { exportProject, copyToClipboard, downloadFile };
