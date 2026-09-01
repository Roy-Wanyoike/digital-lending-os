/**
 * Components Handler - MCP Endpoints for Components
 * @module mcp-server/handlers/components
 * @description MCP handlers for UI component operations
 */

import { MCPTool } from '../index';
import { createSuccessResponse, createErrorResponse } from '../utils/response-formatter';

/** Component data structure */
export interface ComponentData {
  id: string;
  name: string;
  category: string;
  description: string;
  html: string;
  css: string;
  javascript?: string;
  props?: ComponentProp[];
  variants?: string[];
  accessibilityFeatures: string[];
  tags: string[];
}

/** Component prop definition */
export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

/** Mock components database */
const COMPONENTS_DATABASE: ComponentData[] = [
  {
    id: 'button',
    name: 'Button',
    category: 'interactive',
    description: 'Versatile button component with multiple variants',
    html: `<button class="roy-button roy-button--primary" type="button">\n  <span class="roy-button__text">Button Text</span>\n</button>`,
    css: `.roy-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n  font-weight: 500;\n  border-radius: 0.5rem;\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.roy-button--primary {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n}\n\n.roy-button--primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}\n\n.roy-button--secondary {\n  background: #f3f4f6;\n  color: #374151;\n}\n\n.roy-button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}`,
    props: [
      { name: 'variant', type: 'string', required: false, defaultValue: 'primary', description: 'Button style variant' },
      { name: 'size', type: 'string', required: false, defaultValue: 'md', description: 'Button size' },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disabled state' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' }
    ],
    variants: ['primary', 'secondary', 'outline', 'ghost'],
    accessibilityFeatures: ['keyboard-navigation', 'focus-visible', 'aria-pressed', 'screen-reader-support'],
    tags: ['button', 'interactive', 'form', 'cta']
  },
  {
    id: 'card',
    name: 'Card',
    category: 'layout',
    description: 'Container component for grouping related content',
    html: `<article class="roy-card">\n  <div class="roy-card__header">\n    <h3 class="roy-card__title">Card Title</h3>\n  </div>\n  <div class="roy-card__body">\n    <p class="roy-card__text">Card content goes here.</p>\n  </div>\n  <div class="roy-card__footer">\n    <button class="roy-button">Action</button>\n  </div>\n</article>`,
    css: `.roy-card {\n  background: white;\n  border-radius: 1rem;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n  overflow: hidden;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.roy-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);\n}\n\n.roy-card__header {\n  padding: 1.5rem 1.5rem 0;\n}\n\n.roy-card__title {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin: 0;\n}\n\n.roy-card__body {\n  padding: 1rem 1.5rem;\n  color: #6b7280;\n}\n\n.roy-card__footer {\n  padding: 0 1.5rem 1.5rem;\n}`,
    props: [
      { name: 'hoverable', type: 'boolean', required: false, defaultValue: 'true', description: 'Enable hover effect' },
      { name: 'padding', type: 'string', required: false, defaultValue: 'normal', description: 'Padding size' }
    ],
    variants: ['default', 'flat', 'bordered', 'elevated'],
    accessibilityFeatures: ['semantic-article', 'landmark-region'],
    tags: ['card', 'container', 'layout', 'content']
  },
  {
    id: 'input',
    name: 'Input',
    category: 'form',
    description: 'Text input field with validation states',
    html: `<div class="roy-input-group">\n  <label class="roy-input__label" for="input-id">Label</label>\n  <input \n    class="roy-input" \n    type="text" \n    id="input-id"\n    placeholder="Enter text..."\n    aria-describedby="input-hint"\n  />\n  <span class="roy-input__hint" id="input-hint">Helper text</span>\n  <span class="roy-input__error" role="alert"></span>\n</div>`,
    css: `.roy-input-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n\n.roy-input__label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: #374151;\n}\n\n.roy-input {\n  padding: 0.75rem 1rem;\n  font-size: 1rem;\n  border: 2px solid #e5e7eb;\n  border-radius: 0.5rem;\n  transition: border-color 0.2s, box-shadow 0.2s;\n}\n\n.roy-input:focus {\n  outline: none;\n  border-color: #667eea;\n  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);\n}\n\n.roy-input--error {\n  border-color: #ef4444;\n}\n\n.roy-input__hint {\n  font-size: 0.875rem;\n  color: #6b7280;\n}\n\n.roy-input__error {\n  font-size: 0.875rem;\n  color: #ef4444;\n}`,
    props: [
      { name: 'type', type: 'string', required: false, defaultValue: 'text', description: 'Input type' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false', description: 'Disabled state' },
      { name: 'error', type: 'string', required: false, description: 'Error message' }
    ],
    variants: ['default', 'underlined', 'filled'],
    accessibilityFeatures: ['label-association', 'aria-describedby', 'error-announcement', 'focus-ring'],
    tags: ['input', 'form', 'field', 'text']
  },
  {
    id: 'modal',
    name: 'Modal',
    category: 'overlay',
    description: 'Dialog overlay for focused interactions',
    html: `<div class="roy-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">\n  <div class="roy-modal">\n    <header class="roy-modal__header">\n      <h2 class="roy-modal__title" id="modal-title">Modal Title</h2>\n      <button class="roy-modal__close" aria-label="Close modal">&times;</button>\n    </header>\n    <div class="roy-modal__body">\n      <p>Modal content goes here.</p>\n    </div>\n    <footer class="roy-modal__footer">\n      <button class="roy-button roy-button--secondary">Cancel</button>\n      <button class="roy-button roy-button--primary">Confirm</button>\n    </footer>\n  </div>\n</div>`,
    css: `.roy-modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n  opacity: 0;\n  visibility: hidden;\n  transition: opacity 0.3s, visibility 0.3s;\n}\n\n.roy-modal-overlay.active {\n  opacity: 1;\n  visibility: visible;\n}\n\n.roy-modal {\n  background: white;\n  border-radius: 1rem;\n  max-width: 500px;\n  width: 90%;\n  max-height: 80vh;\n  overflow: auto;\n  transform: scale(0.9);\n  transition: transform 0.3s;\n}\n\n.roy-modal-overlay.active .roy-modal {\n  transform: scale(1);\n}\n\n.roy-modal__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1.5rem;\n  border-bottom: 1px solid #e5e7eb;\n}\n\n.roy-modal__title {\n  margin: 0;\n  font-size: 1.25rem;\n}\n\n.roy-modal__close {\n  background: none;\n  border: none;\n  font-size: 1.5rem;\n  cursor: pointer;\n  color: #6b7280;\n}\n\n.roy-modal__body {\n  padding: 1.5rem;\n}\n\n.roy-modal__footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 0.75rem;\n  padding: 1rem 1.5rem;\n  border-top: 1px solid #e5e7eb;\n}`,
    javascript: `// Modal functionality\nclass RoyModal {\n  constructor(element) {\n    this.modal = element;\n    this.overlay = element.closest('.roy-modal-overlay');\n    this.closeBtn = element.querySelector('.roy-modal__close');\n    \n    this.init();\n  }\n  \n  init() {\n    this.closeBtn?.addEventListener('click', () => this.close());\n    this.overlay?.addEventListener('click', (e) => {\n      if (e.target === this.overlay) this.close();\n    });\n    document.addEventListener('keydown', (e) => {\n      if (e.key === 'Escape') this.close();\n    });\n  }\n  \n  open() {\n    this.overlay?.classList.add('active');\n    document.body.style.overflow = 'hidden';\n    this.closeBtn?.focus();\n  }\n  \n  close() {\n    this.overlay?.classList.remove('active');\n    document.body.style.overflow = '';\n  }\n}`,
    props: [
      { name: 'open', type: 'boolean', required: false, defaultValue: 'false', description: 'Controlled open state' },
      { name: 'size', type: 'string', required: false, defaultValue: 'medium', description: 'Modal size' },
      { name: 'closable', type: 'boolean', required: false, defaultValue: 'true', description: 'Show close button' }
    ],
    variants: ['default', 'fullscreen', 'drawer'],
    accessibilityFeatures: ['focus-trap', 'aria-modal', 'escape-close', 'screen-reader-announce'],
    tags: ['modal', 'dialog', 'overlay', 'popup']
  },
  {
    id: 'avatar',
    name: 'Avatar',
    category: 'display',
    description: 'User avatar/image component',
    html: `<div class="roy-avatar roy-avatar--md">\n  <img class="roy-avatar__image" src="/avatar.jpg" alt="User name" />\n  <span class="roy-avatar__fallback">JD</span>\n</div>`,
    css: `.roy-avatar {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 9999px;\n  overflow: hidden;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  font-weight: 600;\n}\n\n.roy-avatar--sm { width: 32px; height: 32px; font-size: 0.75rem; }\n.roy-avatar--md { width: 40px; height: 40px; font-size: 0.875rem; }\n.roy-avatar--lg { width: 56px; height: 56px; font-size: 1.125rem; }\n.roy-avatar--xl { width: 80px; height: 80px; font-size: 1.5rem; }\n\n.roy-avatar__image {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n.roy-avatar__fallback {\n  display: none;\n}\n\n.roy-avatar__image:not(src) ~ .roy-avatar__fallback,\n.roy-avatar__image[src=""] + .roy-avatar__fallback {\n  display: block;\n}`,
    props: [
      { name: 'src', type: 'string', required: false, description: 'Image source URL' },
      { name: 'alt', type: 'string', required: false, description: 'Alt text for image' },
      { name: 'size', type: 'string', required: false, defaultValue: 'md', description: 'Avatar size' },
      { name: 'fallback', type: 'string', required: false, description: 'Fallback initials' }
    ],
    variants: ['sm', 'md', 'lg', 'xl'],
    accessibilityFeatures: ['alt-text', 'fallback-text'],
    tags: ['avatar', 'user', 'image', 'profile']
  }
];

/** Component categories */
export const COMPONENT_CATEGORIES = [
  'interactive',
  'layout',
  'form',
  'overlay',
  'display',
  'navigation',
  'feedback'
];

/**
 * List all components
 */
export async function listComponents(options?: { category?: string }): Promise<ComponentData[]> {
  let components = [...COMPONENTS_DATABASE];
  
  if (options?.category) {
    components = components.filter(c => c.category === options.category);
  }
  
  return components;
}

/**
 * Get specific component by ID
 */
export async function getComponent(id: string): Promise<ComponentData | null> {
  return COMPONENTS_DATABASE.find(c => c.id === id) || null;
}

/**
 * Search components
 */
export async function searchComponents(query: string): Promise<ComponentData[]> {
  const lowerQuery = query.toLowerCase();
  return COMPONENTS_DATABASE.filter(component =>
    component.name.toLowerCase().includes(lowerQuery) ||
    component.description.toLowerCase().includes(lowerQuery) ||
    component.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Generate component code
 */
export async function generateComponentCode(
  id: string, 
  options?: { format?: 'html' | 'jsx' | 'vue'; includeStyles?: boolean }
): Promise<{ html: string; css: string; js?: string } | null> {
  const component = await getComponent(id);
  if (!component) return null;

  const format = options?.format || 'html';
  let html = component.html;

  if (format === 'jsx') {
    // Convert to JSX-like syntax
    html = html
      .replace(/class=/g, 'className=')
      .replace(/for=/g, 'htmlFor=')
      .replace(/aria-/g, 'aria-'); // Keep aria attributes
  }

  return {
    html,
    css: options?.includeStyles !== false ? component.css : '',
    js: component.javascript
  };
}

/** Export MCP tools for components */
export const componentTools: MCPTool[] = [
  {
    name: 'list_components',
    description: 'List all available UI components',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: COMPONENT_CATEGORIES,
          description: 'Filter by category'
        }
      }
    },
    handler: async (params) => {
      const components = await listComponents(params as any);
      return createSuccessResponse(components.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description,
        tags: c.tags
      })));
    }
  },
  {
    name: 'get_component',
    description: 'Get complete component code (HTML, CSS, JS)',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Component ID (e.g., button, card, modal)'
        },
        format: {
          type: 'string',
          enum: ['html', 'jsx', 'vue'],
          description: 'Output format'
        }
      },
      required: ['id']
    },
    handler: async (params) => {
      const result = await generateComponentCode(params.id as string, params as any);
      if (!result) {
        return createErrorResponse('NOT_FOUND', `Component not found: ${params.id}`);
      }
      return createSuccessResponse(result);
    }
  },
  {
    name: 'search_components',
    description: 'Search components by name or description',
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
      const results = await searchComponents(params.query as string);
      return createSuccessResponse(results);
    }
  }
];

export default {
  listComponents,
  getComponent,
  searchComponents,
  generateComponentCode,
  componentTools
};
