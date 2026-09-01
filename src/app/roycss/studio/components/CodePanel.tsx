'use client';

/**
 * Code Panel Component
 * @module roycss/studio/components/CodePanel
 * @description Display generated code from canvas
 */

import React, { useMemo } from 'react';
import { useEditorStore } from '../lib/editor-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Download, Code2 } from 'lucide-react';
import { useState } from 'react';

/** Code panel component */
export function CodePanel() {
  const { elements } = useEditorStore();
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('css');

  /** Generate CSS code */
  const cssCode = useMemo(() => {
    if (Object.keys(elements).length === 0) {
      return '/* Add elements to generate CSS */';
    }

    let css = `/* ROYCSS Studio - Generated CSS */\n`;
    css += `/* Generated: ${new Date().toISOString()} */\n\n`;

    Object.values(elements).forEach(el => {
      css += `/* ${el.name} */\n`;
      css += `.${el.id} {\n`;
      
      // Position and size
      css += `  position: absolute;\n`;
      css += `  left: ${el.position.x}px;\n`;
      css += `  top: ${el.position.y}px;\n`;
      css += `  width: ${el.size.width}px;\n`;
      css += `  height: ${el.size.height}px;\n`;
      
      // Style properties
      Object.entries(el.style).forEach(([prop, value]) => {
        if (value) {
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          css += `  ${cssProp}: ${value};\n`;
        }
      });
      
      css += `}\n\n`;
    });

    return css;
  }, [elements]);

  /** Generate HTML code */
  const htmlCode = useMemo(() => {
    if (Object.keys(elements).length === 0) {
      return '<!-- Add elements to generate HTML -->';
    }

    let html = '<!-- ROYCSS Studio - Generated HTML -->\n';
    
    Object.values(elements).forEach(el => {
      switch (el.type) {
        case 'container':
          html += `<div class="${el.id}">${el.content || ''}</div>\n`;
          break;
        case 'text':
          html += `<p class="${el.id}">${el.content || 'Text'}</p>\n`;
          break;
        case 'button':
          html += `<button class="${el.id}" type="button">${el.content || 'Button'}</button>\n`;
          break;
        case 'image':
          html += `<img class="${el.id}" src="..." alt="" />\n`;
          break;
        case 'input':
          html += `<input class="${el.id}" type="text" placeholder="${el.content || ''}" />\n`;
          break;
        default:
          html += `<div class="${el.id}">${el.content || ''}</div>\n`;
      }
    });

    return html;
  }, [elements]);

  /** Copy to clipboard */
  const copyToClipboard = async (code: string, format: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /** Download file */
  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Code
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(
                activeTab === 'css' ? cssCode : activeTab === 'html' ? htmlCode : '',
                activeTab
              )}
            >
              {copiedFormat === activeTab ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCode(
                activeTab === 'css' ? cssCode : activeTab === 'html' ? htmlCode : '',
                `studio-export.${activeTab}`
              )}
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="css" className="flex-1 text-xs">CSS</TabsTrigger>
            <TabsTrigger value="html" className="flex-1 text-xs">HTML</TabsTrigger>
            <TabsTrigger value="jsx" className="flex-1 text-xs">JSX</TabsTrigger>
          </TabsList>

          {/* CSS Tab */}
          <TabsContent value="css" className="m-0">
            <pre className="p-4 bg-muted text-sm overflow-auto max-h-[400px] font-mono">
              <code>{cssCode}</code>
            </pre>
          </TabsContent>

          {/* HTML Tab */}
          <TabsContent value="html" className="m-0">
            <pre className="p-4 bg-muted text-sm overflow-auto max-h-[400px] font-mono">
              <code>{htmlCode}</code>
            </pre>
          </TabsContent>

          {/* JSX Tab */}
          <TabsContent value="jsx" className="m-0">
            <pre className="p-4 bg-muted text-sm overflow-auto max-h-[400px] font-mono">
              <code>{`// JSX output would be generated here
// Based on your canvas elements

export default function StudioComponent() {
  return (
    <div className="studio-container">
${Object.values(elements).map(el => `      <${el.type === 'button' ? 'button' : 'div'} className="${el.id}">${el.content || ''}</${el.type === 'button' ? 'button' : 'div'}>`).join('\n')}
    </div>
  );
}`}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CodePanel;
