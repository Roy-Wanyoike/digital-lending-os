/**
 * MCP Response Formatter
 * @module mcp-server/utils/response-formatter
 * @description Utilities for formatting MCP responses
 */

/** MCP Error Codes */
export const MCPErrorCodes = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // ROYCSS-specific errors
  TOOL_NOT_FOUND: -32701,
  TOOL_EXECUTION_ERROR: -32702,
  RESOURCE_NOT_FOUND: -32703,
  PROMPT_NOT_FOUND: -32704
} as const;

/** MCP Error code type */
export type MCPErrorCode = typeof MCPErrorCodes[keyof typeof MCPErrorCodes];

/**
 * Create successful MCP response
 */
export function createMCPResponse(
  result: unknown,
  errorCode?: number,
  errorMessage?: string,
  id?: number | string
): object {
  if (errorCode !== undefined && errorMessage) {
    return {
      jsonrpc: '2.0',
      error: {
        code: errorCode,
        message: errorMessage
      },
      id: id ?? null
    };
  }

  return {
    jsonrpc: '2.0',
    result,
    id: id ?? null
  };
}

/**
 * Create success response with metadata
 */
export function createSuccessResponse(
  data: unknown,
  message?: string
): object {
  const response: Record<string, unknown> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): object {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format tool content for MCP response
 */
export function formatToolContent(content: string | object): Array<{ type: 'text'; text: string }> {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  // Split large responses into chunks (max 10000 chars per chunk)
  const maxChunkSize = 10000;
  const chunks: Array<{ type: 'text'; text: string }> = [];
  
  if (text.length <= maxChunkSize) {
    chunks.push({ type: 'text', text });
  } else {
    let remaining = text;
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, maxChunkSize);
      remaining = remaining.slice(maxChunkSize);
      chunks.push({ type: 'text', text: chunk });
    }
  }
  
  return chunks;
}

/**
 * Format resource content for MCP response
 */
export function formatResourceContent(
  uri: string,
  content: string,
  mimeType: string = 'text/plain'
): object {
  return {
    contents: [{
      uri,
      mimeType,
      text: content
    }]
  };
}

/**
 * Validate MCP request format
 */
export function validateMCPRequest(request: unknown): 
  | { valid: true; method: string; params?: unknown; id?: number | string }
  | { valid: false; error: object } {
  
  if (!request || typeof request !== 'object') {
    return {
      valid: false,
      error: createMCPResponse(null, MCPErrorCodes.PARSE_ERROR, 'Invalid request')
    };
  }

  const req = request as Record<string, unknown>;

  if (req.jsonrpc !== '2.0') {
    return {
      valid: false,
      error: createMCPResponse(null, MCPErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC version')
    };
  }

  if (typeof req.method !== 'string' || !req.method) {
    return {
      valid: false,
      error: createMCPResponse(null, MCPErrorCodes.INVALID_REQUEST, 'Method is required')
    };
  }

  return {
    valid: true,
    method: req.method,
    params: req.params,
    id: req.id as number | string | undefined
  };
}

/**
 * Create server info response
 */
export function createServerInfo(): object {
  return {
    name: 'roycss-mcp-server',
    version: '1.0.0',
    description: 'ROYCSS Model Context Protocol Server',
    capabilities: {
      tools: { listChanged: true },
      resources: { subscribe: false },
      prompts: {}
    },
    endpoints: [
      '/api/mcp'
    ]
  };
}

export default {
  MCPErrorCodes,
  createMCPResponse,
  createSuccessResponse,
  createErrorResponse,
  formatToolContent,
  formatResourceContent,
  validateMCPRequest,
  createServerInfo
};
