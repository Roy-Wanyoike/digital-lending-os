'use client';

/**
 * Inspector Panel Component
 * @module roycss/Inspector
 * @description React component for the Inspector DevTool panel
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Crosshair, 
  Copy, 
  Download, 
  Eye,
  Code,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { analyzeCSS, analyzeElement, getElementSelector } from '../lib/roycss/inspector/analyzer';
import { highlightElement, clearHighlight } from '../lib/roycss/inspector/overlay';
import { exportElement } from '../lib/roycss/inspector/exporter';

/** Inspector state */
interface InspectionResult {
  selector: string;
  tagName: string;
  size: { width: number; height: number };
  colors: { background: string; color: string };
  font: { family: string; size: string; weight: string };
  fullAnalysis: any;
}

/** Inspector component props */
interface InspectorProps {
  className?: string;
  onInspect?: (result: InspectionResult) => void;
}

export function Inspector({ className, onInspect }: InspectorProps) {
  const [isInspecting, setIsInspecting] = useState(false);
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  /** Start inspection mode */
  const startInspection = useCallback(() => {
    setIsInspecting(true);
    document.body.style.cursor = 'crosshair';
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target !== document.body) {
        setHoveredElement(target);
        highlightElement(target, { showTag: true });
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (target && target !== document.body) {
        const result = performInspection(target);
        setCurrentResult(result);
        onInspect?.(result);
        stopInspection();
      }
    };
    
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick, true);
    
    // Store handlers for cleanup
    (document as any).__roycss_inspect_handlers = { handleMouseOver, handleClick };
  }, [onInspect]);

  /** Stop inspection mode */
  const stopInspection = useCallback(() => {
    setIsInspecting(false);
    document.body.style.cursor = '';
    clearHighlight();
    
    const handlers = (document as any).__roycss_inspect_handlers;
    if (handlers) {
      document.removeEventListener('mouseover', handlers.handleMouseOver);
      document.removeEventListener('click', handlers.handleClick, true);
      delete (document as any).__roycss_inspect_handlers;
    }
  }, []);

  /** Perform full inspection */
  const performInspection = (element: HTMLElement): InspectionResult => {
    const quick = analyzeElement(element);
    const full = analyzeCSS(element);
    
    return {
      selector: quick.selector,
      tagName: quick.tagName,
      size: quick.size,
      colors: quick.colors,
      font: quick.font,
      fullAnalysis: full
    };
  };

  /** Copy to clipboard */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /** Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (isInspecting) {
        stopInspection();
      }
    };
  }, [isInspecting, stopInspection]);

  return (
    <Card className={`w-full max-w-md ${className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          ROYCSS Inspector
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Inspect button */}
        <Button
          variant={isInspecting ? "destructive" : "default"}
          className="w-full mb-4"
          onClick={isInspecting ? stopInspection : startInspection}
        >
          <Crosshair className="w-4 h-4 mr-2" />
          {isInspecting ? 'Stop Inspecting' : 'Start Inspecting'}
        </Button>

        {/* Results */}
        {currentResult && (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="styles" className="text-xs">Styles</TabsTrigger>
              <TabsTrigger value="code" className="text-xs">Code</TabsTrigger>
              <TabsTrigger value="a11y" className="text-xs">A11y</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview" className="space-y-3 mt-3">
              <div>
                <span className="text-xs text-muted-foreground">Selector</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">
                    {currentResult.selector}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentResult.selector)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Size</span>
                  <p className="text-sm font-medium">
                    {currentResult.size.width} × {currentResult.size.height}px
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Element</span>
                  <p className="text-sm font-medium uppercase">{currentResult.tagName}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Colors</span>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: currentResult.colors.background }}
                  />
                  <span className="text-xs">{currentResult.colors.background}</span>
                  <div 
                    className="w-4 h-4 rounded border ml-2"
                    style={{ backgroundColor: currentResult.colors.color }}
                  />
                  <span className="text-xs">{currentResult.colors.color}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Font</span>
                <p className="text-sm">
                  {currentResult.font.weight} {currentResult.font.size} {currentResult.font.family.split(',')[0]}
                </p>
              </div>
            </TabsContent>

            {/* Styles tab */}
            <TabsContent value="styles" className="mt-3">
              <ScrollArea className="max-h-[300px]">
                <pre className="text-xs p-3 bg-muted rounded overflow-auto">
                  {JSON.stringify(currentResult.fullAnalysis?.computedStyles || {}, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* Code tab */}
            <TabsContent value="code" className="space-y-3 mt-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">HTML</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(exportElement(currentResult.fullAnalysis, 'html'))}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <pre className="text-xs p-3 bg-muted rounded overflow-auto max-h-[150px]">
                  <code>{exportElement(currentResult.fullAnalysis, 'html')}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">CSS</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(exportElement(currentResult.fullAnalysis, 'css'))}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <pre className="text-xs p-3 bg-muted rounded overflow-auto max-h-[150px]">
                  <code>{exportElement(currentResult.fullAnalysis, 'css')}</code>
                </pre>
              </div>
            </TabsContent>

            {/* Accessibility tab */}
            <TabsContent value="a11y" className="mt-3">
              {currentResult.fullAnalysis?.accessibility?.issues?.length > 0 ? (
                <div className="space-y-2">
                  {currentResult.fullAnalysis.accessibility.issues.map((issue: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted">
                      {issue.severity === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {issue.code}
                        </Badge>
                        <p className="text-xs">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mb-2 text-green-500" />
                  <p className="text-sm">No accessibility issues found!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state */}
        {!currentResult && (
          <div className="py-8 text-center text-muted-foreground">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Start Inspecting" to select an element</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Inspector;
