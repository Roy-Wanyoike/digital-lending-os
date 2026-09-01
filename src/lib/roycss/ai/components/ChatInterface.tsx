'use client';

/**
 * ChatInterface Component
 * @module roycss/ai/components/ChatInterface
 * @description AI chat interface for RoyAI assistant
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  Code2, 
  Eye, 
  Accessibility, 
  Copy, 
  Check,
  Loader2,
  Trash2,
  Download
} from 'lucide-react';

/** Chat message type */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/** AI action types */
type AIAction = 'chat' | 'generate' | 'explain' | 'improve' | 'audit' | 'convert';

/** Action configuration */
const ACTIONS: Record<AIAction, { label: string; icon: React.ReactNode; description: string }> = {
  chat: { label: 'Chat', icon: <Sparkles className="w-4 h-4" />, description: 'General conversation' },
  generate: { label: 'Generate CSS', icon: <Code2 className="w-4 h-4" />, description: 'Generate CSS from description' },
  explain: { label: 'Explain', icon: <Eye className="w-4 h-4" />, description: 'Explain CSS code' },
  improve: { label: 'Improve', icon: <Sparkles className="w-4 h-4" />, description: 'Suggest improvements' },
  audit: { label: 'Audit', icon: <Accessibility className="w-4 h-4" />, description: 'Accessibility check' },
  convert: { label: 'Convert', icon: <Code2 className="w-4 h-4" />, description: 'CSS to Tailwind' }
};

interface ChatInterfaceProps {
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Placeholder text */
  placeholder?: string;
  /** On message send callback */
  onSend?: (message: string, action: AIAction) => Promise<string>;
  /** Show action buttons */
  showActions?: boolean;
  /** Maximum height */
  maxHeight?: string;
  /** Custom class name */
  className?: string;
}

export function ChatInterface({
  initialMessages = [],
  placeholder = 'Ask RoyAI anything about CSS...',
  onSend,
  showActions = true,
  maxHeight = '500px',
  className
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [selectedAction, setSelectedAction] = useState<AIAction>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
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
      if (onSend) {
        const response = await onSend(userMessage.content, selectedAction);
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, content: response, isStreaming: false }
            : m
        ));
      } else {
        // Default mock response
        await simulateResponse(assistantId);
      }
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

  // Simulate AI response (for demo)
  const simulateResponse = async (messageId: string) => {
    const responses = [
      "Here's the CSS you requested:\n\n```css\n.bouncing-button {\n  animation: bounce 0.6s ease-in-out;\n}\n\n@keyframes bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}\n```\n\nThis creates a smooth bouncing effect using CSS animations.",
      "I can help with that! Let me analyze your CSS and provide suggestions for improvement.",
      "Great question! Here's what this CSS does:\n\n1. **Display**: Sets how the element is rendered\n2. **Positioning**: Controls element placement\n3. **Styling**: Visual appearance properties"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate streaming
    for (let i = 0; i <= response.length; i++) {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content: response.slice(0, i), isStreaming: i < response.length }
          : m
      ));
      await new Promise(r => setTimeout(r, 15));
    }
  };

  // Handle copy to clipboard
  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API might not be available
    }
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={`flex flex-col ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            RoyAI Assistant
          </CardTitle>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2 mt-3">
            {(Object.entries(ACTIONS) as [AIAction, typeof ACTIONS[AIAction]][]).map(([key, action]) => (
              <Badge
                key={key}
                variant={selectedAction === key ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedAction(key)}
                title={action.description}
              >
                {action.icon}
                <span className="ml-1 hidden sm:inline">{action.label}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea style={{ maxHeight }} className="px-4 py-2">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Welcome to RoyAI!</p>
                <p className="text-sm">Ask me about CSS, effects, components, or accessibility.</p>
                
                {/* Quick suggestions */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[
                    'Create a bouncing button',
                    'Explain flexbox',
                    'Improve my CSS',
                    'Check accessibility'
                  ].map(suggestion => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                    )}
                  </div>
                  
                  {/* Message actions */}
                  {message.role === 'assistant' && message.content && !message.isStreaming && (
                    <div className="flex gap-1 mt-2 opacity-70">
                      <button
                        onClick={() => handleCopy(message.content, message.id)}
                        className="p-1 hover:bg-background/20 rounded"
                        title="Copy"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
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
              rows={2}
              className="resize-none flex-1"
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
          
          {/* Selected action indicator */}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            Mode: <Badge variant="secondary" className="text-xs">{ACTIONS[selectedAction].label}</Badge>
            <span className="ml-auto">Press Enter to send</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChatInterface;
