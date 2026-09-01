/**
 * Effects Handler - MCP Endpoints for Effects
 * @module mcp-server/handlers/effects
 * @description MCP handlers for CSS effects operations
 */

import { MCPTool } from '../index';
import { createSuccessResponse, createErrorResponse } from '../utils/response-formatter';

/** Effect data structure */
export interface EffectData {
  id: string;
  name: string;
  category: string;
  description: string;
  css: string;
  previewUrl?: string;
  tags: string[];
  dependencies?: string[];
  browserSupport: string[];
}

/** Mock effects database */
const EFFECTS_DATABASE: EffectData[] = [
  {
    id: 'bounce',
    name: 'Bounce',
    category: 'animation',
    description: 'Creates a bouncing animation effect',
    css: `.roy-bounce {\n  animation: roy-bounce 0.6s ease-in-out;\n}\n\n@keyframes roy-bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}`,
    tags: ['animation', 'attention', 'playful'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'transition',
    description: 'Smooth fade-in effect for elements appearing on page',
    css: `.roy-fade-in {\n  opacity: 0;\n  animation: roy-fade-in 0.5s ease-out forwards;\n}\n\n@keyframes roy-fade-in {\n  to { opacity: 1; }\n}`,
    tags: ['transition', 'entrance', 'subtle'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'slide-in-right',
    name: 'Slide In Right',
    category: 'transition',
    description: 'Slides element in from the right side',
    css: `.roy-slide-in-right {\n  transform: translateX(100%);\n  animation: roy-slide-in-right 0.4s ease-out forwards;\n}\n\n@keyframes roy-slide-in-right {\n  to { transform: translateX(0); }\n}`,
    tags: ['transition', 'entrance', 'sidebar'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'animation',
    description: 'Creates a pulsing/glowing attention effect',
    css: `.roy-pulse {\n  animation: roy-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n}\n\n@keyframes roy-pulse {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.5; }\n}`,
    tags: ['animation', 'attention', 'loading'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'shake',
    name: 'Shake',
    category: 'animation',
    description: 'Shaking effect for errors or alerts',
    css: `.roy-shake {\n  animation: roy-shake 0.5s ease-in-out;\n}\n\n@keyframes roy-shake {\n  0%, 100% { transform: translateX(0); }\n  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }\n  20%, 40%, 60%, 80% { transform: translateX(5px); }\n}`,
    tags: ['animation', 'error', 'alert'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'scale-on-hover',
    name: 'Scale on Hover',
    category: 'interaction',
    description: 'Scales element up when hovered',
    css: `.roy-scale-hover {\n  transition: transform 0.3s ease;\n}\n\n.roy-scale-hover:hover {\n  transform: scale(1.05);\n}`,
    tags: ['hover', 'interaction', 'card'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'glow',
    name: 'Glow',
    category: 'effect',
    description: 'Adds a glowing box-shadow effect',
    css: `.roy-glow {\n  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);\n  transition: box-shadow 0.3s ease;\n}\n\n.roy-glow:hover,\n.roy-glow.active {\n  box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4);\n}`,
    tags: ['glow', 'neon', 'accent'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  {
    id: 'rotate-in',
    name: 'Rotate In',
    category: 'transition',
    description: 'Rotates element into view',
    css: `.roy-rotate-in {\n  transform: rotate(-180deg) scale(0);\n  opacity: 0;\n  animation: roy-rotate-in 0.6s ease-out forwards;\n}\n\n@keyframes roy-rotate-in {\n  to {\n    transform: rotate(0) scale(1);\n    opacity: 1;\n  }\n}`,
    tags: ['transition', 'entrance', 'dramatic'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  }
];

/** Categories */
export const EFFECT_CATEGORIES = [
  'animation',
  'transition',
  'interaction',
  'effect',
  'loading',
  'scroll'
];

/**
 * List all effects
 */
export async function listEffects(options?: { category?: string; tag?: string }): Promise<EffectData[]> {
  let effects = [...EFFECTS_DATABASE];
  
  if (options?.category) {
    effects = effects.filter(e => e.category === options.category);
  }
  
  if (options?.tag) {
    effects = effects.filter(e => e.tags.includes(options.tag!));
  }
  
  return effects;
}

/**
 * Get specific effect by ID
 */
export async function getEffect(id: string): Promise<EffectData | null> {
  return EFFECTS_DATABASE.find(e => e.id === id) || null;
}

/**
 * Search effects by query
 */
export async function searchEffects(query: string): Promise<EffectData[]> {
  const lowerQuery = query.toLowerCase();
  return EFFECTS_DATABASE.filter(effect =>
    effect.name.toLowerCase().includes(lowerQuery) ||
    effect.description.toLowerCase().includes(lowerQuery) ||
    effect.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    effect.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get effects by category
 */
export async function getEffectsByCategory(category: string): Promise<EffectData[]> {
  return EFFECTS_DATABASE.filter(e => e.category === category);
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<string[]> {
  return EFFECT_CATEGORIES;
}

/** Export MCP tools for effects */
export const effectTools: MCPTool[] = [
  {
    name: 'list_effects',
    description: 'List all available CSS effects, optionally filtered by category or tag',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: EFFECT_CATEGORIES,
          description: 'Filter by effect category'
        },
        tag: {
          type: 'string',
          description: 'Filter by tag'
        }
      }
    },
    handler: async (params) => {
      const effects = await listEffects(params as any);
      return createSuccessResponse(effects, `Found ${effects.length} effects`);
    }
  },
  {
    name: 'get_effect',
    description: 'Get detailed information about a specific effect',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Effect ID (e.g., bounce, fade-in, pulse)'
        }
      },
      required: ['id']
    },
    handler: async (params) => {
      const effect = await getEffect(params.id as string);
      if (!effect) {
        return createErrorResponse('NOT_FOUND', `Effect not found: ${params.id}`);
      }
      return createSuccessResponse(effect);
    }
  },
  {
    name: 'search_effects',
    description: 'Search effects by name, description, or tags',
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
      const results = await searchEffects(params.query as string);
      return createSuccessResponse(results, `Found ${results.length} matching effects`);
    }
  },
  {
    name: 'get_effect_categories',
    description: 'Get all available effect categories',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const categories = await getCategories();
      return createSuccessResponse(categories);
    }
  }
];

export default {
  listEffects,
  getEffect,
  searchEffects,
  getEffectsByCategory,
  getCategories,
  effectTools
};
