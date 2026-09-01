'use client';

/**
 * RoyAI Page
 * @module roycss/ai/page
 * @description Main AI assistant interface page
 */

import React from 'react';
import { ChatInterface } from '@/lib/roycss/ai/components/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Code2, 
  Eye, 
  Accessibility, 
  Wand2,
  ArrowRightLeft,
  BookOpen,
  Zap,
  Shield
} from 'lucide-react';

/** Feature card data */
const features = [
  {
    icon: <Code2 className="w-6 h-6" />,
    title: 'CSS Generation',
    description: 'Generate CSS from natural language descriptions',
    example: '"Make a bouncing button with gradient background"',
    action: 'generate'
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: 'Code Explanation',
    description: 'Get detailed explanations of CSS code',
    example: '"Explain this flexbox layout"',
    action: 'explain'
  },
  {
    icon: <Wand2 className="w-6 h-6" />,
    title: 'Improvements',
    description: 'Suggest optimizations and best practices',
    example: '"How can I improve this CSS?"',
    action: 'improve'
  },
  {
    icon: <Accessibility className="w-6 h-6" />,
    title: 'Accessibility Audit',
    description: 'Check code against WCAG guidelines',
    example: '"Audit this component for a11y"',
    action: 'audit'
  },
  {
    icon: <ArrowRightLeft className="w-6 h-6" />,
    title: 'CSS to Tailwind',
    description: 'Convert CSS to Tailwind classes',
    example: '"Convert this to Tailwind"',
    action: 'convert'
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Learn CSS',
    description: 'Educational explanations and tutorials',
    example: '"How does CSS Grid work?"',
    action: 'chat'
  }
];

export default function RoyAIPage() {
  // Handle AI requests (would connect to API in production)
  const handleSend = async (message: string, action: string): Promise<string> => {
    try {
      const response = await fetch('/api/roycss/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, action })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      return data.response || data.content || 'No response received';
    } catch (error) {
      // Fallback mock response for demo
      return generateMockResponse(message, action);
    }
  };

  // Generate mock response for demo mode
  const generateMockResponse = (message: string, action: string): string => {
    switch (action) {
      case 'generate':
        return `Here's your generated CSS:\n\n\`\`\`css\n.roy-generated {\n  /* Generated from: "${message}" */\n  animation: roy-effect 0.3s ease;\n  transition: all 0.2s ease;\n}\n\n@keyframes roy-effect {\n  0% { transform: scale(1); }\n  50% { transform: scale(1.05); }\n  100% { transform: scale(1); }\n}\n\`\`\`\n\n💡 **Tip:** Configure your API key for full AI capabilities!`;
      
      case 'explain':
        return `## CSS Explanation 📚\n\n**Summary:** This code creates modern styling effects.\n\n### Key Properties:\n- **Property**: What it does\n- **Why**: The reasoning behind it\n\n**Tips:**\n- Consider browser compatibility\n- Test on multiple devices`;
      
      case 'improve':
        return `## Improvement Suggestions 🚀\n\n| Category | Score |\n|----------|-------|\n| Performance | 85/100 |\n| Accessibility | 70/100 |\n| Maintainability | 90/100 |\n\n**Recommendations:**\n1. Add focus states for keyboard navigation\n2. Consider using CSS custom properties for theming\n3. Add prefers-reduced-motion support`;
      
      case 'audit':
        return `## Accessibility Report ♿\n\n✅ **Score:** 75/100 (PARTIAL)\n\n**Issues Found:**\n- ⚠️ Warning: Color contrast may be insufficient\n- ⚠️ Warning: Missing focus indicators\n\n**Recommendations:**\n- Ensure 4.5:1 contrast ratio for text\n- Add visible :focus styles`;
      
      case 'convert':
        return `## Tailwind Classes 🎨\n\n\`\`\`html\nclass="transition-all duration-300 ease-in-out hover:scale-105"\n\`\`\`\n\n**Notes:**\n- Some effects may require custom CSS\n- Check documentation for utility class equivalents`;
      
      default:
        return `Thanks for your message! I'm RoyAI, your CSS assistant.\n\nYou asked about: "${message}"\n\nI can help you with:\n- Generating CSS from descriptions\n- Explaining CSS concepts\n- Suggesting improvements\n- Accessibility audits\n- Converting CSS to Tailwind\n\nWhat would you like to know?`;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">RoyAI</h1>
          <Badge variant="secondary" className="ml-2">
            <Zap className="w-3 h-3 mr-1" />
            Beta
          </Badge>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered CSS assistant. Generate, explain, improve, and audit CSS with natural language.
        </p>
      </div>

      {/* Main content */}
      <Tabs defaultValue="chat" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="chat">
            <Sparkles className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="features">
            <Shield className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <ChatInterface
            placeholder="Ask RoyAI anything about CSS..."
            onSend={handleSend}
            maxHeight="600px"
          />
          
          {/* API Status */}
          <Card className="mt-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>API Status:</span>
                <Badge variant="outline" className="text-xs">
                  Demo Mode (Mock Responses)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    {feature.description}
                  </CardDescription>
                  <div className="bg-muted rounded-md p-2 text-xs italic">
                    &quot;{feature.example}&quot;
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Getting Started */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Configure API Key</h4>
                <code className="block bg-muted p-2 rounded text-sm">
                  OPENAI_API_KEY=your-api-key-here
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Start Chatting</h4>
                <p className="text-sm text-muted-foreground">
                  Use natural language to describe what you want. RoyAI will generate appropriate CSS.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Copy & Use</h4>
                <p className="text-sm text-muted-foreground">
                  Copy the generated code directly into your project.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
