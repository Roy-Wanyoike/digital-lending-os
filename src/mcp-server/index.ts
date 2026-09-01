/**
 * MCP Server - Model Context Protocol Implementation
 * @module mcp-server
 * @description Main entry point for ROYCSS MCP server
 */

import { MCPServer } from './handlers/effects';
import { createMCPResponse, MCPErrorCodes } from './utils/response-formatter';

/** MCP Protocol Version */
export const MCP_VERSION = '2024-11-05';

/** MCP Server Info */
export const SERVER_INFO = {
  name: 'roycss-mcp-server',
  version: '1.0.0',
  description: 'ROYCSS Model Context Protocol Server - Access CSS effects, components, and patterns via MCP',
  author: 'ROYCSS Team',
  homepage: 'https://roycss.dev'
};

/** Tool definitions */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/** Resource definitions */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** Prompt definitions */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

/**
 * ROYCSS MCP Server Class
 */
export class RoyCSSMCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();

  constructor() {
    this.registerDefaultTools();
    this.registerDefaultResources();
    this.registerDefaultPrompts();
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Import and register tools from handlers
    const { effectTools } = require('./handlers/effects');
    const { componentTools } = require('./handlers/components');
    const { patternTools } = require('./handlers/patterns');
    const { generatorTools } = require('./handlers/generator');

    [...effectTools, ...componentTools, ...patternTools, ...generatorTools].forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  /**
   * Register default resources
   */
  private registerDefaultResources(): void {
    const resources: MCPResource[] = [
      {
        uri: 'roycss://effects/list',
        name: 'All Effects',
        description: 'Complete list of available CSS effects'
      },
      {
        uri: 'roycss://components/list',
        name: 'All Components',
        description: 'Complete list of available UI components'
      },
      {
        uri: 'roycss://patterns/list',
        name: 'All Patterns',
        description: 'Complete list of CSS patterns'
      },
      {
        uri: 'roycss://docs/quickstart',
        name: 'Quick Start Guide',
        description: 'Getting started with ROYCSS',
        mimeType: 'text/markdown'
      }
    ];

    resources.forEach(resource => {
      this.resources.set(resource.uri, resource));
    });
  }

  /**
   * Register default prompts
   */
  private registerDefaultPrompts(): void {
    const prompts: MCPPrompt[] = [
      {
        name: 'generate-effect',
        description: 'Generate a CSS effect from natural language',
        arguments: [
          { name: 'description', description: 'Description of the desired effect', required: true },
          { name: 'framework', description: 'Target framework (css, tailwind)', required: false }
        ]
      },
      {
        name: 'explain-css',
        description: 'Explain CSS code in detail',
        arguments: [
          { name: 'code', description: 'CSS code to explain', required: true }
        ]
      }
    ];

    prompts.forEach(prompt => {
      this.prompts.set(prompt.name, prompt);
    });
  }

  /**
   * Handle MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request.params as InitializeParams);
          
        case 'tools/list':
          return this.handleToolsList();
          
        case 'tools/call':
          return await this.handleToolCall(request.params as ToolCallParams);
          
        case 'resources/list':
          return this.handleResourcesList();
          
        case 'resources/read':
          return await this.handleResourceRead(request.params as ResourceReadParams);
          
        case 'prompts/list':
          return this.handlePromptsList();
          
        case 'prompts/get':
          return this.handlePromptGet(request.params as PromptGetParams);
          
        case 'ping':
          return createMCPResponse({ pong: true });
          
        default:
          return createMCPResponse(
            null,
            MCPErrorCodes.METHOD_NOT_FOUND,
            `Unknown method: ${request.method}`
          );
      }
    } catch (error) {
      return createMCPResponse(
        null,
        MCPErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(params: InitializeParams): MCPResponse {
    return createMCPResponse({
      protocolVersion: MCP_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo: SERVER_INFO
    });
  }

  /**
   * Handle tools list
   */
  private handleToolsList(): MCPResponse {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    return createMCPResponse({ tools });
  }

  /**
   * Handle tool call
   */
  private async handleToolCall(params: ToolCallParams): Promise<MCPResponse> {
    const tool = this.tools.get(params.name);
    
    if (!tool) {
      return createMCPResponse(
        null,
        MCPErrorCodes.TOOL_NOT_FOUND,
        `Tool not found: ${params.name}`
      );
    }

    try {
      const result = await tool.handler(params.arguments || {});
      return createMCPResponse({
        content: [{
          type: 'text' as const,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }]
      });
    } catch (error) {
      return createMCPResponse(
        null,
        MCPErrorCodes.TOOL_EXECUTION_ERROR,
        error instanceof Error ? error.message : 'Tool execution failed'
      );
    }
  }

  /**
   * Handle resources list
   */
  private handleResourcesList(): MCPResponse {
    const resources = Array.from(this.resources.values());
    return createMCPResponse({ resources });
  }

  /**
   * Handle resource read
   */
  private async handleResourceRead(params: ResourceReadParams): Promise<MCPResponse> {
    const resource = this.resources.get(params.uri);
    
    if (!resource) {
      return createMCPResponse(
        null,
        MCPErrorCodes.RESOURCE_NOT_FOUND,
        `Resource not found: ${params.uri}`
      );
    }

    // Generate content based on URI
    let content = '';
    
    if (params.uri.startsWith('roycss://effects')) {
      content = await this.generateEffectsContent();
    } else if (params.uri.startsWith('roycss://components')) {
      content = await this.generateComponentsContent();
    } else if (params.uri.startsWith('roycss://patterns')) {
      content = await this.generatePatternsContent();
    } else if (params.uri.includes('docs')) {
      content = this.getDocumentationContent();
    }

    return createMCPResponse({
      contents: [{
        uri: params.uri,
        mimeType: resource.mimeType || 'text/plain',
        text: content
      }]
    });
  }

  /**
   * Handle prompts list
   */
  private handlePromptsList(): MCPResponse {
    const prompts = Array.from(this.prompts.values());
    return createMCPResponse({ prompts });
  }

  /**
   * Handle prompt get
   */
  private handlePromptGet(params: PromptGetParams): MCPResponse {
    const prompt = this.prompts.get(params.name);
    
    if (!prompt) {
      return createMCPResponse(
        null,
        MCPErrorCodes.PROMPT_NOT_FOUND,
        `Prompt not found: ${params.name}`
      );
    }

    return createMCPResponse({
      description: prompt.description || '',
      arguments: prompt.arguments || []
    });
  }

  /** Generate effects content */
  private async generateEffectsContent(): Promise<string> {
    const { listEffects } = require('./handlers/effects');
    const effects = await listEffects();
    return JSON.stringify(effects, null, 2);
  }

  /** Generate components content */
  private async generateComponentsContent(): Promise<string> {
    const { listComponents } = require('./handlers/components');
    const components = await listComponents();
    return JSON.stringify(components, null, 2);
  }

  /** Generate patterns content */
  private async generatePatternsContent(): Promise<string> {
    const { listPatterns } = require('./handlers/patterns');
    const patterns = await listPatterns();
    return JSON.stringify(patterns, null, 2);
  }

  /** Get documentation content */
  private getDocumentationContent(): string {
    return `# ROYCSS Quick Start Guide

## Overview
ROYCSS is a comprehensive CSS library with effects, components, and patterns.

## Getting Started

### Installation
\`\`\`bash
npm install roycss
\`\`\`

### Basic Usage
\`\`\`css
@import 'roycss/effects';

.my-button {
  @include roy-bounce;
}
\`\`\`

## Available Resources

### Effects
- Animations (bounce, fade, slide, etc.)
- Transitions
- Hover effects
- Loading states

### Components
- Buttons
- Cards
- Forms
- Navigation
- Modals

### Patterns
- Layout patterns
- Responsive utilities
- Dark mode support

## MCP Tools Available
- list_effects: List all available effects
- get_effect: Get specific effect details
- search_effects: Search effects by keyword
- list_components: List all components
- generate_component: Generate component code
- validate_css: Validate CSS code
- list_patterns: List patterns by use case

## Support
For more information, visit https://roycss.dev
`;
  }

  /**
   * Register custom tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register custom resource
   */
  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  /**
   * Register custom prompt
   */
  registerPrompt(prompt: MCPPrompt): void {
    this.prompts.set(prompt.name, prompt);
  }
}

// Type definitions for MCP protocol
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: number | string;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  id?: number | string;
}

interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

interface ResourceReadParams {
  uri: string;
}

interface PromptGetParams {
  name: string;
}

// Export singleton
export const mcpServer = new RoyCSSMCPServer();

export default RoyCSSMCPServer;
