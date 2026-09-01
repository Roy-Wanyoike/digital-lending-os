'use client';

/**
 * AIChatInterface Component
 * @module components/roycss/AIChatInterface
 * @description Advanced AI chat interface with code rendering, history, and copy functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Sparkles,
  Code2,
  Copy,
  Check,
  Loader2,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Wand2,
  Eye,
  Accessibility,
  ArrowRightLeft,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

/** Chat message interface */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
}

/** Code block data */
export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  copied?: boolean;
}

/** Chat session for history */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/** Suggestion item */
interface SuggestionItem {
  text: string;
  icon: React.ReactNode;
  category: string;
}

/** Pre-built suggestions */
const SUGGESTIONS: SuggestionItem[] = [
  { text: 'Create a bouncing button effect', icon: <Wand2 className="w-4 h-4" />, category: 'effect' },
  { text: 'Explain CSS Grid layout', icon: <Eye className="w-4 h-4" />, category: 'learn' },
  { text: 'Convert this to Tailwind', icon: <ArrowRightLeft className="w-4 h-4" />, category: 'convert' },
  { text: 'Check accessibility', icon: <Accessibility className="w-4 h-4" />, category: 'audit' },
  { text: 'Design a card component', icon: <Sparkles className="w-4 h-4" />, category: 'component' },
  { text: 'Improve my CSS', icon: <Lightbulb className="w-4 h-4" />, category: 'improve' }
];

/** Props for AIChatInterface */
interface AIChatInterfaceProps {
  /** Initial messages to display */
  initialMessages?: ChatMessage[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Callback when message is sent */
  onSend?: (message: string) => Promise<string>;
  /** Show suggestions panel */
  showSuggestions?: boolean;
  /** Show history sidebar */
  showHistory?: boolean;
  /** Maximum height of chat area */
  maxHeight?: string;
  /** Custom class name */
  className?: string;
  /** Theme variant */
  variant?: 'default' | 'compact' | 'fullscreen';
}

/**
 * Extract code blocks from markdown content
 */
function extractCodeBlocks(content: string): { content: string; codeBlocks: CodeBlock[] } {
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const codeBlocks: CodeBlock[] = [];
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    codeBlocks.push({
      id: `code-${index++}`,
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  // Remove code blocks from content for plain text display
  const cleanContent = content.replace(regex, '[Code Block]').trim();

  return { content: cleanContent, codeBlocks };
}

/**
 * Render message content with code blocks
 */
function MessageContent({ message }: { message: ChatMessage }) {
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>(message.codeBlocks || []);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract code blocks if not already done
  useEffect(() => {
    if (!message.codeBlocks || message.codeBlocks.length === 0) {
      const { codeBlocks: extracted } = extractCodeBlocks(message.content);
      setCodeBlocks(extracted);
    }
  }, [message.content, message.codeBlocks]);

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      
      // Update local state
      setCodeBlocks(prev => 
        prev.map(cb => cb.id === id ? { ...cb, copied: true } : cb)
      );
      setTimeout(() => {
        setCodeBlocks(prev => 
          prev.map(cb => cb.id === id ? { ...cb, copied: false } : cb)
        );
      }, 2000);
    } catch {
      // Clipboard not available
    }
  };

  // Get plain text content
  const plainContent = message.codeBlocks?.length
    ? message.content.replace(/```[\s\S]*?```/g, '').trim()
    : message.content;

  return (
    <div className="space-y-3">
      {/* Plain text content */}
      {plainContent && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {formatMarkdown(plainContent)}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
          )}
        </div>
      )}

      {/* Code blocks */}
      {codeBlocks.map((block) => (
        <div key={block.id} className="relative group">
          {/* Code header */}
          <div className="flex items-center justify-between bg-muted px-3 py-1.5 rounded-t-md border border-b-0">
            <span className="text-xs font-mono text-muted-foreground">
              {block.language}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleCopy(block.code, block.id)}
            >
              {block.copied || copiedId === block.id ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Code content */}
          <pre className="bg-muted/50 p-3 rounded-b-md border overflow-x-auto text-sm">
            <code className="font-mono text-muted-foreground">{block.code}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}

/**
 * Simple markdown formatter (basic)
 */
function formatMarkdown(text: string): React.ReactNode {
  // Bold
  let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');
  
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}

/**
 * Main AIChatInterface Component
 */
export function AIChatInterface({
  initialMessages = [],
  placeholder = 'Ask RoyAI anything about CSS...',
  onSend,
  showSuggestions = true,
  showHistory = true,
  maxHeight = '600px',
  className,
  variant = 'default'
}: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add streaming placeholder
    const assistantId = `asst-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      let response: string;

      if (onSend) {
        response = await onSend(userMessage.content);
      } else {
        // Use mock response
        response = await getMockResponse(userMessage.content);
      }

      // Parse response for code blocks
      const { content, codeBlocks } = extractCodeBlocks(response);

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: response, isStreaming: false, codeBlocks }
          : m
      ));
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Get mock response based on keywords
  const getMockResponse = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    await new Promise(r => setTimeout(r, 800)); // Simulate delay

    if (lowerQuery.includes('bounce') || lowerQuery.includes('animation')) {
      return `Here's a bouncing animation:\n\n\`\`\`css\n.bounce {\n  animation: bounce 0.6s ease-in-out infinite;\n}\n\n@keyframes bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}\n\`\`\`\n\n**How it works:** Uses \`translateY\` for GPU-accelerated animation.`;
    }
    
    if (lowerQuery.includes('gradient') || lowerQuery.includes('button')) {
      return `Here's a gradient button:\n\n\`\`\`css\n.gradient-btn {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  padding: 12px 24px;\n  border-radius: 8px;\n  border: none;\n  cursor: pointer;\n  transition: transform 0.2s;\n}\n\n.gradient-btn:hover {\n  transform: translateY(-2px);\n}\n\`\`\``;
    }

    if (lowerQuery.includes('card')) {
      return `Here's a modern card component:\n\n\`\`\`css\n.card {\n  background: white;\n  border-radius: 16px;\n  padding: 24px;\n  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);\n  transition: box-shadow 0.3s, transform 0.3s;\n}\n\n.card:hover {\n  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);\n  transform: translateY(-4px);\n}\n\`\`\``;
    }

    return `I'd be happy to help with that! You asked about: **${query}**\n\nI can assist with:\n- **CSS Generation** - Create effects and components\n- **Code Explanation** - Understand complex CSS\n- **Optimization** - Improve performance\n- **Accessibility** - WCAG compliance\n\nCould you provide more details about what you need?`;
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
  };

  // Save current session
  const saveSession = () => {
    if (messages.length === 0) return;

    const session: ChatSession = {
      id: `session-${Date.now()}`,
      title: messages[0]?.content.slice(0, 50) || 'New Chat',
      messages: [...messages],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSessions(prev => [session, ...prev].slice(0, 20)); // Keep max 20 sessions
  };

  // Load session
  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setHistoryOpen(false);
  };

  // Keyboard handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Variant-specific classes
  const containerClasses = variant === 'fullscreen'
    ? 'fixed inset-0 z-50'
    : '';

  return (
    <Card className={`flex flex-col ${className || ''} ${containerClasses}`}>
      <CardHeader className="pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            RoyAI Assistant
            <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
          </CardTitle>
          
          <div className="flex gap-1">
            {showHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(!historyOpen)}
                title="Chat history"
              >
                <History className="w-4 h-4" />
              </Button>
            )}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              Try asking about:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3"
                  onClick={() => setInput(suggestion.text)}
                >
                  <span className="mr-1.5 opacity-60">{suggestion.icon}</span>
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* History sidebar */}
        {historyOpen && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Chat History</h4>
              <Button variant="ghost" size="sm" onClick={saveSession} disabled={messages.length === 0}>
                Save current
              </Button>
            </div>
            
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved sessions yet</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    className="w-full text-left p-2 rounded hover:bg-muted text-sm truncate"
                    onClick={() => loadSession(session)}
                  >
                    {session.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : maxHeight }} className="px-4 py-2">
          <div className="space-y-4">
            {messages.length === 0 && !showSuggestions && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Welcome to RoyAI!</p>
                <p className="text-sm">Your AI-powered CSS assistant.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <MessageContent message={message} />
                  
                  {/* Timestamp */}
                  <div className={`text-[10px] mt-2 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={variant === 'compact' ? 1 : 2}
              className="resize-none flex-1 min-h-[40px]"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Footer info */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <Badge variant="outline" className="text-xs">Demo Mode</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Named exports
export default AIChatInterface;
