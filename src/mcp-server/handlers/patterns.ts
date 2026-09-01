/**
 * Patterns Handler - MCP Endpoints for Patterns
 * @module mcp-server/handlers/patterns
 * @description MCP handlers for CSS pattern operations
 */

import { MCPTool } from '../index';
import { createSuccessResponse, createErrorResponse } from '../utils/response-formatter';

/** Pattern data structure */
export interface PatternData {
  id: string;
  name: string;
  useCase: string;
  category: string;
  description: string;
  css: string;
  exampleHtml?: string;
  bestPractices: string[];
  alternatives: string[];
  tags: string[];
}

/** Mock patterns database */
const PATTERNS_DATABASE: PatternData[] = [
  {
    id: 'centering-flexbox',
    name: 'Centering with Flexbox',
    useCase: 'layout-centering',
    category: 'layout',
    description: 'Center elements both horizontally and vertically using Flexbox',
    css: `.center-container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}`,
    exampleHtml: `<div class="center-container">\n  <div class="centered-content">I am centered!</div>\n</div>`,
    bestPractices: [
      'Use min-height instead of height to allow content expansion',
      'Add gap property for spacing between items',
      'Consider flex-wrap for responsive behavior'
    ],
    alternatives: ['centering-grid', 'centering-absolute'],
    tags: ['centering', 'flexbox', 'layout', 'common']
  },
  {
    id: 'responsive-grid',
    name: 'Responsive Grid Layout',
    useCase: 'layout-responsive',
    category: 'layout',
    description: 'Create a responsive grid that adapts to screen size',
    css: `.responsive-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));\n  gap: 1.5rem;\n  padding: 1rem;\n}`,
    exampleHtml: `<div class="responsive-grid">\n  <div class="grid-item">Item 1</div>\n  <div class="grid-item">Item 2</div>\n  <div class="grid-item">Item 3</div>\n</div>`,
    bestPractices: [
      'Use auto-fit for automatic column creation',
      'minmax() ensures minimum item width',
      'Combine with container queries for advanced control'
    ],
    alternatives: ['flexbox-wrap', 'masonry-layout'],
    tags: ['grid', 'responsive', 'layout', 'auto-fit']
  },
  {
    id: 'sticky-header',
    name: 'Sticky Header',
    useCase: 'navigation-sticky',
    category: 'navigation',
    description: 'Header that sticks to top when scrolling',
    css: `.sticky-header {\n  position: sticky;\n  top: 0;\n  z-index: 100;\n  background: white;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n}`,
    bestPractices: [
      'Always set z-index to ensure header stays above content',
      'Add background color to prevent content showing through',
      'Consider backdrop-filter for blur effect'
    ],
    alternatives: ['fixed-header', 'static-header-scroll-spy'],
    tags: ['sticky', 'header', 'navigation', 'scroll']
  },
  {
    id: 'dark-mode-toggle',
    name: 'Dark Mode Toggle',
    useCase: 'theming-dark-mode',
    category: 'theming',
    description: 'Implement dark mode using CSS custom properties',
    css: `:root {\n  --bg-color: #ffffff;\n  --text-color: #1a1a1a;\n  --primary-color: #3b82f6;\n}\n\n[data-theme="dark"] {\n  --bg-color: #1a1a1a;\n  --text-color: #ffffff;\n  --primary-color: #60a5fa;\n}\n\nbody {\n  background-color: var(--bg-color);\n  color: var(--text-color);\n  transition: background-color 0.3s, color 0.3s;\n}`,
    bestPractices: [
      'Define all colors as custom properties',
      'Respect prefers-color-scheme media query',
      'Smooth transitions between themes'
    ],
    alternatives: ['class-based-dark-mode', 'media-query-only'],
    tags: ['dark-mode', 'theme', 'custom-properties', 'accessibility']
  },
  {
    id: 'mobile-first-typography',
    name: 'Mobile-First Typography',
    useCase: 'typography-responsive',
    category: 'typography',
    description: 'Fluid typography that scales with viewport',
    css: `html {\n  font-size: clamp(1rem, 0.95rem + 0.25vw, 1.25rem);\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 4rem);\n  line-height: 1.1;\n}\n\nh2 {\n  font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem);\n  line-height: 1.2;\n}\n\np {\n  max-width: 65ch;\n  line-height: 1.6;\n}`,
    bestPractices: [
      'Use clamp() for fluid scaling without media queries',
      'Set max-width on paragraphs for readability',
      'Maintain comfortable line heights'
    ],
    alternatives: ['fixed-breakpoint-typography', 'container-query-type'],
    tags: ['typography', 'fluid', 'responsive', 'clamp']
  },
  {
    id: 'aspect-ratio-box',
    name: 'Aspect Ratio Container',
    useCase: 'layout-aspect-ratio',
    category: 'layout',
    description: 'Maintain aspect ratio for responsive containers',
    css: `.aspect-box {\n  aspect-ratio: 16 / 9;\n  width: 100%;\n  object-fit: cover;\n}\n\n/* Fallback for older browsers */\n@supports not (aspect-ratio: 16 / 9) {\n  .aspect-box {\n    position: relative;\n    padding-bottom: 56.25%; /* 9/16 * 100 */\n    height: 0;\n    overflow: hidden;\n  }\n  \n  .aspect-box > * {\n    position: absolute;\n    inset: 0;\n    width: 100%;\n    height: 100%;\n  }\n}`,
    exampleHtml: `<div class="aspect-box">\n  <img src="image.jpg" alt="Description" />\n</div>`,
    bestPractices: [
      'Use native aspect-ratio property',
      'Provide fallback for older browsers',
      'Combine with object-fit for images'
    ],
    alternatives: ['padding-hack', 'intrinsic-ratio'],
    tags: ['aspect-ratio', 'responsive', 'video', 'images']
  },
  {
    id: 'loading-skeleton',
    name: 'Loading Skeleton',
    useCase: 'feedback-loading',
    category: 'feedback',
    description: 'Animated skeleton placeholder while content loads',
    css: `.skeleton {\n  background: linear-gradient(\n    90deg,\n    #f0f0f0 25%,\n    #e0e0e0 50%,\n    #f0f0f0 75%\n  );\n  background-size: 200% 100%;\n  animation: skeleton-loading 1.5s infinite;\n  border-radius: 0.25rem;\n}\n\n@keyframes skeleton-loading {\n  0% { background-position: 200% 0; }\n  100% { background-position: -200% 0; }\n}\n\n.skeleton-text {\n  height: 1em;\n  margin-bottom: 0.5rem;\n}\n\n.skeleton-text:last-child {\n  width: 80%;\n}`,
    exampleHtml: `<div class="skeleton-card">\n  <div class="skeleton skeleton-avatar" style="width: 48px; height: 48px; border-radius: 50%;"></div>\n  <div class="skeleton skeleton-text" style="width: 60%;"></div>\n  <div class="skeleton skeleton-text" style="width: 100%;"></div>\n  <div class="skeleton skeleton-text" style="width: 40%;"></div>\n</div>`,
    bestPractices: [
      'Match skeleton shape to actual content',
      'Use subtle animation speed',
      'Consider prefers-reduced-motion'
    ],
    alternatives: ['spinner-loader', 'progress-bar'],
    tags: ['loading', 'skeleton', 'placeholder', 'ux']
  },
  {
    id: 'focus-visible-ring',
    name: 'Focus Visible Ring',
    useCase: 'accessibility-focus',
    category: 'accessibility',
    description: 'Custom focus indicator for keyboard navigation',
    css: `:focus-visible {\n  outline: 2px solid #3b82f6;\n  outline-offset: 2px;\n  border-radius: 2px;\n}\n\n/* Remove outline for mouse users */\n:focus:not(:focus-visible) {\n  outline: none;\n}\n\n/* Custom focus ring variant */\n.focus-ring {\n  transition: box-shadow 0.2s;\n}\n\n.focus-ring:focus-visible {\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);\n}`,
    bestPractices: [
      'Always provide visible focus indicators',
      'Use :focus-visible for keyboard-only focus',
      'Ensure sufficient contrast for focus ring'
    ],
    alternatives: ['outline-focus', 'box-shadow-focus'],
    tags: ['focus', 'accessibility', 'keyboard', 'a11y']
  }
];

/** Use cases */
export const USE_CASES = [
  'layout-centering',
  'layout-responsive',
  'layout-aspect-ratio',
  'navigation-sticky',
  'theming-dark-mode',
  'typography-responsive',
  'feedback-loading',
  'accessibility-focus'
];

/**
 * List all patterns
 */
export async function listPatterns(): Promise<PatternData[]> {
  return [...PATTERNS_DATABASE];
}

/**
 * Get patterns by use case
 */
export async function getPatternsByUseCase(useCase: string): Promise<PatternData[]> {
  return PATTERNS_DATABASE.filter(p => p.useCase === useCase);
}

/**
 * Search patterns
 */
export async function searchPatterns(query: string): Promise<PatternData[]> {
  const lowerQuery = query.toLowerCase();
  return PATTERNS_DATABASE.filter(pattern =>
    pattern.name.toLowerCase().includes(lowerQuery) ||
    pattern.description.toLowerCase().includes(lowerQuery) ||
    pattern.useCase.toLowerCase().includes(lowerQuery) ||
    pattern.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all use cases
 */
export async function getUseCases(): Promise<Array<{ id: string; label: string; count: number }>> {
  return USE_CASES.map(useCase => ({
    id: useCase,
    label: useCase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    count: PATTERNS_DATABASE.filter(p => p.useCase === useCase).length
  }));
}

/** Export MCP tools for patterns */
export const patternTools: MCPTool[] = [
  {
    name: 'list_patterns',
    description: 'List all available CSS patterns',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const patterns = await listPatterns();
      return createSuccessResponse(patterns.map(p => ({
        id: p.id,
        name: p.name,
        useCase: p.useCase,
        category: p.category,
        description: p.description,
        tags: p.tags
      })));
    }
  },
  {
    name: 'get_patterns_by_use_case',
    description: 'Get patterns for a specific use case',
    inputSchema: {
      type: 'object',
      properties: {
        useCase: {
          type: 'string',
          enum: USE_CASES,
          description: 'The use case to filter by'
        }
      },
      required: ['useCase']
    },
    handler: async (params) => {
      const patterns = await getPatternsByUseCase(params.useCase as string);
      return createSuccessResponse(patterns);
    }
  },
  {
    name: 'search_patterns',
    description: 'Search patterns by name, description, or tags',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        }
      },
      required: ['query']
    },
    handler: async (params) => {
      const results = await searchPatterns(params.query as string);
      return createSuccessResponse(results);
    }
  },
  {
    name: 'get_use_cases',
    description: 'Get all available use case categories',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const useCases = await getUseCases();
      return createSuccessResponse(useCases);
    }
  }
];

export default {
  listPatterns,
  getPatternsByUseCase,
  searchPatterns,
  getUseCases,
  patternTools
};
