/**
 * Export Command
 * @module roycss-cli/commands/export
 * @description Export effects/components to various formats
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import clipboardy from 'clipboardy';
import { logger, createSpinner } from '../utils/logger';

/** Export formats */
type ExportFormat = 'css' | 'jsx' | 'vue' | 'html' | 'json' | 'tailwind';

/** Export options */
interface ExportOptions {
  format?: ExportFormat;
  output?: string;
  clipboard?: boolean;
  minify?: boolean;
  includeHtml?: boolean;
}

/** Sample export data (would come from registry in real implementation) */
const EXPORT_DATA: Record<string, { css: string; html?: string; tailwind?: string }> = {
  'bounce': {
    css: `.roy-bounce {\n  animation: roy-bounce 0.6s ease-in-out;\n}\n\n@keyframes roy-bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}`,
    html: `<div class="roy-bounce">Bouncing content</div>`,
    tailwind: `animate-bounce`
  },
  'fade-in': {
    css: `.roy-fade-in {\n  opacity: 0;\n  animation: roy-fade-in 0.5s ease-out forwards;\n}\n\n@keyframes roy-fade-in {\n  to { opacity: 1; }\n}`,
    html: `<div class="roy-fade-in">Fading content</div>`,
    tailwind: `animate-fade-in`
  },
  'button': {
    css: `.roy-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n  font-weight: 500;\n  border-radius: 0.5rem;\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n}\n\n.roy-button:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}`,
    html: `<button class="roy-button">Click me</button>`,
    tailwind: `inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`
  },
  'card': {
    css: `.roy-card {\n  background: white;\n  border-radius: 1rem;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n  overflow: hidden;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.roy-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);\n}\n\n.roy-card__body {\n  padding: 1.5rem;\n}`,
    html: `<article class="roy-card">\n  <div class="roy-card__body">Card content here</div>\n</article>`,
    tailwind: `bg-white rounded-xl shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden`
  }
};

/**
 * Convert CSS to JSX format
 */
function cssToJsx(css: string, className: string): string {
  // Simple conversion - in production would use proper parser
  return `// Styles for ${className}\nconst styles = \`\n${css}\`;`;
}

/**
 * Convert to Vue SFC format
 */
function toVueFormat(name: string, data: { css: string; html?: string }): string {
  return `<template>\n  ${data.html || `<div class="${name}">${name} component</div>`}\n</template>\n\n<script setup>\n// ${name} component\n</script>\n\n<style scoped>\n${data.css}\n</style>`;
}

/**
 * Convert to JSON format
 */
function toJsonFormat(name: string, data: { css: string; html?: string; tailwind?: string }): string {
  return JSON.stringify({ name, ...data }, null, 2);
}

/**
 * Minify CSS (basic)
 */
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .replace(/\s*{\s*/g, '{')          // Clean braces
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .trim();
}

/**
 * Execute export command
 */
export async function executeExport(name: string, options: ExportOptions): Promise<void> {
  if (!name) {
    logger.error('Please specify an effect or component to export.');
    logger.info('Example: roycss export button-component');
    return;
  }

  // Normalize name
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Get data
  const data = EXPORT_DATA[normalizedName];

  if (!data) {
    logger.error(`"${normalizedName}" not found for export.`);
    logger.info('Available exports: ' + Object.keys(EXPORT_DATA).join(', '));
    return;
  }

  const format = options.format || 'css';
  const spinner = createSpinner({
    text: `Exporting ${normalizedName} as ${format.toUpperCase()}...`
  });

  try {
    let outputContent: string;

    switch (format) {
      case 'css':
        outputContent = options.minify ? minifyCss(data.css) : data.css;
        break;

      case 'jsx':
        outputContent = cssToJsx(data.css, `roy-${normalizedName}`);
        break;

      case 'vue':
        outputContent = toVueFormat(normalizedName, data);
        break;

      case 'html':
        outputContent = `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n${data.css}\n  </style>\n</head>\n<body>\n${data.html || `<div class="roy-${normalizedName}">Exported content</div>`}\n</body>\n</html>`;
        break;

      case 'json':
        outputContent = toJsonFormat(normalizedName, data);
        break;

      case 'tailwind':
        outputContent = data.tailwind || `/* Tailwind classes for ${normalizedName} not yet available */`;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Handle output
    if (options.clipboard) {
      await clipboardy.write(outputContent);
      spinner.succeed('Copied to clipboard!');
    } else if (options.output) {
      const outputPath = path.resolve(process.cwd(), options.output);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, outputContent);
      spinner.succeed(`Exported to ${outputPath}`);
    } else {
      // Print to stdout
      spinner.stop();
      console.log(outputContent);
    }

    // Print metadata
    logger.blank();
    logger.info(`Name: ${normalizedName}`);
    logger.info(`Format: ${format.toUpperCase()}`);

  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : 'Export failed');
  }
}

/** Export command for Commander */
export const exportCommand = new Command('export')
  .description('Export effect or component to various formats')
  .argument('<name>', 'Name of effect or component to export')
  .option('-f, --format <format>', 'Output format (css, jsx, vue, html, json, tailwind)', 'css')
  .option('-o, --output <path>', 'Output file path')
  .option('-c, --clipboard', 'Copy to clipboard')
  .option('-m, --minify', 'Minify output')
  .option('--include-html', 'Include HTML example (for CSS format)')
  .action(executeExport);

export default executeExport;
