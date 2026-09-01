/**
 * OpenAI Service (Compatible API)
 * @module roycss/ai/services/openai-service
 * @description AI service layer supporting OpenAI-compatible APIs
 */

import {
  AIServiceConfig,
  AIMessage,
  AIResponse,
  AIError,
  AIUsage,
  StreamCallback,
  AIGenerationOptions
} from '../types';

/** Default configuration */
const DEFAULT_CONFIG: AIServiceConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.7
};

/** Environment variable for API key */
const API_KEY_ENV = 'OPENAI_API_KEY';
const API_BASE_URL_ENV = 'OPENAI_BASE_URL';

/**
 * RoyAI Service Class
 * Provides AI-powered CSS assistance
 */
export class RoyAIService {
  private config: AIServiceConfig;
  private apiKey: string | null = null;
  private baseUrl: string | null = null;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeFromEnv();
  }

  /**
   * Initialize configuration from environment variables
   */
  private initializeFromEnv(): void {
    if (typeof process !== 'undefined' && process.env) {
      this.apiKey = process.env[API_KEY_ENV] || null;
      this.baseUrl = process.env[API_BASE_URL_ENV] || null;
    }
    
    // Also support NEXT_PUBLIC_ prefix for client-side
    if (typeof process !== 'undefined' && process.env) {
      if (!this.apiKey) {
        this.apiKey = process.env[`NEXT_PUBLIC_${API_KEY_ENV}`] || null;
      }
      if (!this.baseUrl) {
        this.baseUrl = process.env[`NEXT_PUBLIC_${API_BASE_URL_ENV}`] || null;
      }
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey || this.config.provider === 'mock';
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; provider: string; hasApiKey: boolean } {
    return {
      configured: this.isConfigured(),
      provider: this.config.provider,
      hasApiKey: !!this.apiKey
    };
  }

  /**
   * Send chat completion request
   */
  async chat(
    messages: AIMessage[],
    options?: Partial<AIGenerationOptions>
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();

    try {
      // If mock mode or no API key, return mock response
      if (this.config.provider === 'mock' || !this.apiKey) {
        return this.getMockResponse(messages, requestId);
      }

      const chatUrl = (this.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error?.code || 'API_ERROR',
          errorData.error?.message || 'API request failed',
          response.status === 429
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        success: true,
        data: {
          content: choice?.message?.content || '',
          role: choice?.message?.role as AIRole || 'assistant'
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        requestId,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  /**
   * Stream chat completion
   */
  async chatStream(
    messages: AIMessage[],
    callback: StreamCallback,
    options?: Partial<AIGenerationOptions>
  ): Promise<void> {
    try {
      if (this.config.provider === 'mock' || !this.apiKey) {
        // Mock streaming response
        const mockContent = this.generateMockContent(messages);
        const words = mockContent.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          callback(words[i] + (i < words.length - 1 ? ' ' : ''), i === words.length - 1);
          await this.delay(30);
        }
        return;
      }

      const streamUrl = (this.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true
        })
      });

      if (!response.ok) {
        throw new APIError('STREAM_ERROR', 'Failed to start stream', false);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new APIError('STREAM_ERROR', 'No response body', false);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          callback('', true);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                callback(content, false);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } catch (error) {
      callback(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }

  /**
   * Generate CSS from natural language
   */
  async generateCSS(request: {
    description: string;
    element?: string;
    options?: AIGenerationOptions;
  }): Promise<AIResponse> {
    const systemPrompt = `You are RoyAI, an expert CSS generator for the ROYCSS platform.
Generate clean, modern CSS from natural language descriptions.
Return valid JSON with "css" property containing the generated CSS.`;

    const userPrompt = `Generate CSS for: ${request.description}
${request.element ? `Target element: ${request.element}` : ''}
${request.options?.targetFramework ? `Format: ${request.options.targetFramework}` : ''}

Return JSON: {"css": "...", "html": "...", "classes": {...}}`;

    const messages: AIMessage[] = [
      { id: '1', role: 'system', content: systemPrompt, timestamp: new Date() },
      { id: '2', role: 'user', content: userPrompt, timestamp: new Date() }
    ];

    return this.chat(messages, request.options);
  }

  /**
   * Explain CSS code
   */
  async explainCSS(code: string): Promise<AIResponse> {
    const systemPrompt = `You are RoyAI, a CSS educator.
Explain CSS code clearly and thoroughly.`;

    const userPrompt = `Explain this CSS code:
\`\`\`css
${code}
\`\`\`

Provide a detailed explanation of each property and its effect.`;

    const messages: AIMessage[] = [
      { id: '1', role: 'system', content: systemPrompt, timestamp: new Date() },
      { id: '2', role: 'user', content: userPrompt, timestamp: new Date() }
    ];

    return this.chat(messages);
  }

  /**
   * Suggest improvements for CSS
   */
  async suggestImprovements(code: string): Promise<AIResponse> {
    const systemPrompt = `You are RoyAI, a CSS optimization expert.
Suggest improvements for performance, accessibility, and maintainability.`;

    const userPrompt = `Review and improve this CSS:
\`\`\`css
${code}
\`\`\`

Suggest improvements with explanations.`;

    const messages: AIMessage[] = [
      { id: '1', role: 'system', content: systemPrompt, timestamp: new Date() },
      { id: '2', role: 'user', content: userPrompt, timestamp: new Date() }
    ];

    return this.chat(messages);
  }

  /**
   * Run accessibility audit
   */
  async accessibilityAudit(code: string): Promise<AIResponse> {
    const systemPrompt = `You are RoyAI, a WCAG accessibility auditor.
Audit CSS/code for accessibility issues following WCAG 2.1 guidelines.`;

    const userPrompt = `Audit this code for accessibility:
\`\`\`css
${code}
\`\`\`

Check for:
- Color contrast issues
- Focus visibility
- Screen reader compatibility
- Keyboard navigation support

Return findings as structured JSON.`;

    const messages: AIMessage[] = [
      { id: '1', role: 'system', content: systemPrompt, timestamp: new Date() },
      { id: '2', role: 'user', content: userPrompt, timestamp: new Date() }
    ];

    return this.chat(messages);
  }

  /**
   * Convert CSS to Tailwind classes
   */
  async cssToTailwind(css: string): Promise<AIResponse> {
    const systemPrompt = `You are RoyAI, a CSS to Tailwind converter.
Convert CSS to equivalent Tailwind CSS classes.`;

    const userPrompt = `Convert this CSS to Tailwind classes:
\`\`\`css
${css}
\`\`\`

Return the Tailwind classes that achieve the same styling.`;

    const messages: AIMessage[] = [
      { id: '1', role: 'system', content: systemPrompt, timestamp: new Date() },
      { id: '2', role: 'user', content: userPrompt, timestamp: new Date() }
    ];

    return this.chat(messages);
  }

  /**
   * Generate mock response when no API available
   */
  private getMockResponse(messages: AIMessage[], requestId: string): AIResponse {
    const lastMessage = messages[messages.length - 1];
    const content = this.generateMockContent(messages);

    return {
      success: true,
      data: {
        content,
        role: 'assistant'
      },
      usage: {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250
      },
      requestId,
      timestamp: new Date()
    };
  }

  /**
   * Generate mock content based on messages
   */
  private generateMockContent(messages: AIMessage[]): string {
    const lastUserMsg = messages.find(m => m.role === 'user')?.content || '';
    
    if (lastUserMsg.toLowerCase().includes('bounce')) {
      return JSON.stringify({
        css: `.roy-bounce {\n  animation: roy-bounce 0.6s ease-in-out;\n}\n\n@keyframes roy-bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}`,
        html: '<button class="roy-bounce">Bouncing Button</button>',
        classes: { 'roy-bounce': 'Applies bounce animation on interaction' }
      }, null, 2);
    }
    
    if (lastUserMsg.toLowerCase().includes('explain')) {
      return JSON.stringify({
        summary: 'This CSS creates a modern button with hover effects.',
        properties: [],
        tips: ['Consider adding focus states for accessibility']
      }, null, 2);
    }

    return JSON.stringify({
      css: `/* Generated by RoyAI */\n.roy-generated {\n  /* Your generated styles will appear here */\n  transition: all 0.3s ease;\n}`,
      html: '<div class="roy-generated">Generated Element</div>',
      note: 'Configure OPENAI_API_KEY for full AI capabilities'
    }, null, 2);
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: unknown, requestId: string): AIResponse {
    const aiError: AIError = error instanceof APIError
      ? { code: error.code, message: error.message, retryable: error.retryable }
      : { 
          code: 'UNKNOWN_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          retryable: false 
        };

    return {
      success: false,
      error: aiError,
      requestId,
      timestamp: new Date()
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Custom API Error class */
class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/** Singleton instance */
let instance: RoyAIService | null = null;

/**
 * Get RoyAI service singleton instance
 */
export function getRoyAIService(config?: Partial<AIServiceConfig>): RoyAIService {
  if (!instance) {
    instance = new RoyAIService(config);
  }
  return instance;
}

export default RoyAIService;
