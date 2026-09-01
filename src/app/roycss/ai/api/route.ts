/**
 * RoyAI API Route
 * @module roycss/ai/api/route
 * @description API endpoint for AI chat functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoyAIService } from '@/lib/roycss/ai/services/openai-service';
import { PromptEngineering } from '@/lib/roycss/ai/services/prompt-engineering';

/** Request body type */
interface AIRequest {
  message: string;
  action?: string;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/** POST handler - Process AI request */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: AIRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedMessage = PromptEngineering.sanitizeInput(body.message);
    const action = body.action || 'chat';

    // Get AI service instance
    const aiService = getRoyAIService();

    // Check configuration
    if (!aiService.isConfigured()) {
      // Return helpful error with config instructions
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'AI service is not configured. Please set OPENAI_API_KEY environment variable.',
          retryable: false
        },
        response: getFallbackResponse(sanitizedMessage, action)
      });
    }

    // Process based on action type
    let result;

    switch (action) {
      case 'generate':
        result = await aiService.generateCSS({
          description: sanitizedMessage,
          options: body.options as any
        });
        break;
        
      case 'explain':
        // Extract code from message if present
        const codeToExplain = extractCodeFromMessage(sanitizedMessage);
        result = await aiService.explainCSS(codeToExplain || sanitizedMessage);
        break;
        
      case 'improve':
        const codeToImprove = extractCodeFromMessage(sanitizedMessage);
        result = await aiService.suggestImprovements(codeToImprove || sanitizedMessage);
        break;
        
      case 'audit':
        const codeToAudit = extractCodeFromMessage(sanitizedMessage);
        result = await aiService.accessibilityAudit(codeToAudit || sanitizedMessage);
        break;
        
      case 'convert':
        const cssToConvert = extractCodeFromMessage(sanitizedMessage);
        result = await aiService.cssToTailwind(cssToConvert || sanitizedMessage);
        break;
        
      case 'chat':
      default:
        result = await aiService.chat([
          {
            id: 'system',
            role: 'system',
            content: PromptEngineering.buildSystemPrompt(body.context as any),
            timestamp: new Date()
          },
          {
            id: 'user',
            role: 'user',
            content: sanitizedMessage,
            timestamp: new Date()
          }
        ]);
        break;
    }

    // Return response
    if (result.success && result.data) {
      const data = result.data as any;
      return NextResponse.json({
        success: true,
        response: data.content || JSON.stringify(data, null, 2),
        usage: result.usage,
        requestId: result.requestId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        response: getFallbackResponse(sanitizedMessage, action),
        requestId: result.requestId
      });
    }

  } catch (error) {
    console.error('RoyAI API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

/** GET handler - Service status */
export async function GET() {
  const aiService = getRoyAIService();
  const status = aiService.getConfigStatus();

  return NextResponse.json({
    service: 'RoyAI',
    version: '1.0.0',
    status: status.configured ? 'operational' : 'not_configured',
    config: status,
    endpoints: {
      chat: 'POST /api/roycss/ai',
      actions: ['generate', 'explain', 'improve', 'audit', 'convert', 'chat']
    },
    features: [
      'Natural language CSS generation',
      'Code explanation',
      'Improvement suggestions',
      'WCAG accessibility audits',
      'CSS to Tailwind conversion'
    ]
  });
}

/** Extract code block from message */
function extractCodeFromMessage(message: string): string | null {
  // Try to extract code from markdown code blocks
  const codeBlockMatch = message.match(/```(?:css|scss|less)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Try to detect raw CSS (contains common CSS patterns)
  const cssPattern = /[\w-]+\s*:\s*[^;]+;/g;
  const matches = message.match(cssPattern);
  if (matches && matches.length >= 2) {
    return message.trim();
  }
  
  return null;
}

/** Generate fallback response when AI is not available */
function getFallbackResponse(message: string, action: string): string {
  const responses: Record<string, string> = {
    generate: `/* Generated by RoyAI (Demo Mode) */\n\n.roy-effect {\n  animation: roy-pulse 0.3s ease-in-out;\n}\n\n@keyframes roy-pulse {\n  0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.02); }\n}\n\n/* Configure OPENAI_API_KEY for full AI capabilities */`,
    explain: `## CSS Explanation\n\nYour code uses modern CSS properties to create visual effects.\n\n**Key Points:**\n- Properties control visual appearance\n- Values determine the specific styling\n- Consider browser compatibility\n\n*Configure API key for detailed explanations.*`,
    improve: `## Suggestions\n\n**Quick Wins:**\n1. Add CSS custom properties for theming\n2. Include focus states for accessibility\n3. Use relative units for responsiveness\n\n**Score Estimate:** 75/100`,
    audit: `## Accessibility Audit\n\n**Overall: Partial Compliance**\n\n⚠️ Items to check:\n- Color contrast ratios\n- Focus visibility\n- Screen reader compatibility\n\n*Full audit requires API configuration.*`,
    convert: `/* Tailwind Classes */\n\nclass="transition-all duration-300 ease-in-out hover:scale-105"\n\n/* Some styles may require custom CSS */`,
    chat: `Hello! I'm RoyAI, your CSS assistant. 👋\n\nI can help you:\n- • Generate CSS from descriptions\n- • Explain CSS concepts\n- • Suggest improvements\n- • Audit for accessibility\n- • Convert to Tailwind\n\nWhat would you like to work on?`
  };

  return responses[action] || responses.chat;
}
