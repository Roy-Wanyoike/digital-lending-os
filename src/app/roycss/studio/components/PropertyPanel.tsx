'use client';

/**
 * Property Panel Component
 * @module roycss/studio/components/PropertyPanel
 * @description Edit element properties in the studio
 */

import React from 'react';
import { useEditorStore } from '../lib/editor-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Move, 
  Maximize2, 
  Palette, 
  Type, 
  Layout,
  RotateCcw,
  Trash2
} from 'lucide-react';

/** Property panel component */
export function PropertyPanel() {
  const {
    elements,
    selectedElementId,
    updateElement,
    removeElement,
    duplicateElement
  } = useEditorStore();

  const selectedElement = selectedElementId ? elements[selectedElementId] : null;

  /** Update element property */
  const updateProperty = (property: string, value: string | number) => {
    if (!selectedElementId) return;
    
    if (property.startsWith('position.')) {
      const prop = property.split('.')[1] as 'x' | 'y';
      updateElement(selectedElementId, {
        position: { ...selectedElement!.position, [prop]: Number(value) }
      });
    } else if (property.startsWith('size.')) {
      const prop = property.split('.')[1] as 'width' | 'height';
      updateElement(selectedElementId, {
        size: { ...selectedElement!.size, [prop]: Number(value) }
      });
    } else {
      updateElement(selectedElementId, {
        style: { ...selectedElement!.style, [property]: value }
      });
    }
  };

  /** Reset element styles */
  const resetStyles = () => {
    if (!selectedElementId) return;
    updateElement(selectedElementId, { style: {} });
  };

  // No selection state
  if (!selectedElement) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Move className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Select an element to edit its properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
          <span className="text-xs text-muted-foreground">{selectedElement.name}</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="transform" className="h-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="transform" className="flex-1 text-xs">
              <Move className="w-3 h-3 mr-1" />
              Transform
            </TabsTrigger>
            <TabsTrigger value="size" className="flex-1 text-xs">
              <Maximize2 className="w-3 h-3 mr-1" />
              Size
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1 text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Style
            </TabsTrigger>
          </TabsList>

          {/* Transform Tab */}
          <TabsContent value="transform" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">X Position</Label>
                <Input
                  type="number"
                  value={selectedElement.position.x}
                  onChange={(e) => updateProperty('position.x', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Y Position</Label>
                <Input
                  type="number"
                  value={selectedElement.position.y}
                  onChange={(e) => updateProperty('position.y', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Transform</Label>
              <Input
                value={selectedElement.style.transform || ''}
                onChange={(e) => updateProperty('transform', e.target.value)}
                placeholder="rotate(0deg)"
                className="h-8 mt-1"
              />
            </div>
          </TabsContent>

          {/* Size Tab */}
          <TabsContent value="size" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={selectedElement.size.width}
                  onChange={(e) => updateProperty('size.width', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={selectedElement.size.height}
                  onChange={(e) => updateProperty('size.height', e.target.value)}
                  className="h-8 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Padding</Label>
                <Input
                  value={selectedElement.style.padding || ''}
                  onChange={(e) => updateProperty('padding', e.target.value)}
                  placeholder="16px"
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Margin</Label>
                <Input
                  value={selectedElement.style.margin || ''}
                  onChange={(e) => updateProperty('margin', e.target.value)}
                  placeholder="0"
                  className="h-8 mt-1"
                />
              </div>
            </div>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Typography */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Type className="w-3 h-3" />
                Typography
              </div>
              
              <div>
                <Label className="text-xs">Font Size</Label>
                <Input
                  value={selectedElement.style.fontSize || ''}
                  onChange={(e) => updateProperty('fontSize', e.target.value)}
                  placeholder="16px"
                  className="h-8 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs">Font Family</Label>
                <Input
                  value={selectedElement.style.fontFamily || ''}
                  onChange={(e) => updateProperty('fontFamily', e.target.value)}
                  placeholder="system-ui, sans-serif"
                  className="h-8 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={selectedElement.style.color || ''}
                    onChange={(e) => updateProperty('color', e.target.value)}
                    placeholder="#000000"
                    className="h-8 flex-1"
                  />
                  <input
                    type="color"
                    value={selectedElement.style.color || '#000000'}
                    onChange={(e) => updateProperty('color', e.target.value)}
                    className="h-8 w-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Background & Border */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Palette className="w-3 h-3" />
                Background & Border
              </div>
              
              <div>
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={selectedElement.style.backgroundColor || ''}
                    onChange={(e) => updateProperty('backgroundColor', e.target.value)}
                    placeholder="transparent"
                    className="h-8 flex-1"
                  />
                  <input
                    type="color"
                    value={selectedElement.style.backgroundColor || '#ffffff'}
                    onChange={(e) => updateProperty('backgroundColor', e.target.value)}
                    className="h-8 w-10 rounded cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-xs">Border Radius</Label>
                <Input
                  value={selectedElement.style.borderRadius || ''}
                  onChange={(e) => updateProperty('borderRadius', e.target.value)}
                  placeholder="8px"
                  className="h-8 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs">Box Shadow</Label>
                <Input
                  value={selectedElement.style.boxShadow || ''}
                  onChange={(e) => updateProperty('boxShadow', e.target.value)}
                  placeholder="none"
                  className="h-8 mt-1"
                />
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Layout className="w-3 h-3" />
                Layout
              </div>
              
              <div>
                <Label className="text-xs">Display</Label>
                <Input
                  value={selectedElement.style.display || ''}
                  onChange={(e) => updateProperty('display', e.target.value)}
                  placeholder="block"
                  className="h-8 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs">Opacity</Label>
                <Input
                  value={selectedElement.style.opacity || ''}
                  onChange={(e) => updateProperty('opacity', e.target.value)}
                  placeholder="1"
                  className="h-8 mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs">Transition</Label>
                <Input
                  value={selectedElement.style.transition || ''}
                  onChange={(e) => updateProperty('transition', e.target.value)}
                  placeholder="all 0.3s ease"
                  className="h-8 mt-1"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateElement(selectedElementId!)}
            className="flex-1"
          >
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetStyles}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => removeElement(selectedElementId!)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PropertyPanel;
