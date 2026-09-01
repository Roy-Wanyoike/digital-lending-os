'use client';

/**
 * Asset Browser Component
 * @module roycss/studio/components/AssetBrowser
 * @description Browse effects and components to add to canvas
 */

import React, { useState } from 'react';
import { useEditorStore } from '../lib/editor-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Layout, 
  Type, 
  MousePointerClick,
  Image,
  FileInput,
  Box,
  Sparkles
} from 'lucide-react';

/** Asset category */
type AssetCategory = 'elements' | 'effects' | 'components';

/** Asset definition */
interface AssetDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  type: CanvasElementType;
}

/** Canvas element types */
type CanvasElementType = 'container' | 'text' | 'button' | 'image' | 'input' | 'custom';

/** Available assets */
const ASSETS: AssetDefinition[] = [
  // Basic Elements
  { id: 'container', name: 'Container', category: 'layout', description: 'Flex container for grouping', icon: <Box className="w-4 h-4" />, type: 'container' },
  { id: 'text', name: 'Text', category: 'basic', description: 'Text paragraph element', icon: <Type className="w-4 h-4" />, type: 'text' },
  { id: 'heading', name: 'Heading', category: 'basic', description: 'Large heading text', icon: <Type className="w-4 h-4" />, type: 'text' },
  { id: 'button', name: 'Button', category: 'interactive', description: 'Clickable button', icon: <MousePointerClick className="w-4 h-4" />, type: 'button' },
  { id: 'button-primary', name: 'Primary Button', category: 'interactive', description: 'Primary action button', icon: <MousePointerClick className="w-4 h-4" />, type: 'button' },
  { id: 'button-secondary', name: 'Secondary Button', category: 'interactive', description: 'Secondary action button', icon: <MousePointerClick className="w-4 h-4" />, type: 'button' },
  { id: 'image', name: 'Image', category: 'media', description: 'Image placeholder', icon: <Image className="w-4 h-4" />, type: 'image' },
  { id: 'input-text', name: 'Text Input', category: 'form', description: 'Text input field', icon: <FileInput className="w-4 h-4" />, type: 'input' },
  { id: 'card', name: 'Card', category: 'layout', description: 'Card container with shadow', icon: <Layout className="w-4 h-4" />, type: 'container' },
];

/** Effect assets */
const EFFECT_ASSETS: AssetDefinition[] = [
  { id: 'bounce-effect', name: 'Bounce', category: 'animation', description: 'Bouncing animation effect', icon: <Sparkles className="w-4 h-4" />, type: 'custom' },
  { id: 'fade-in-effect', name: 'Fade In', category: 'transition', description: 'Fade in on appear', icon: <Sparkles className="w-4 h-4" />, type: 'custom' },
  { id: 'pulse-effect', name: 'Pulse', category: 'animation', description: 'Pulsing attention effect', icon: <Sparkles className="w-4 h-4" />, type: 'custom' },
  { id: 'shake-effect', name: 'Shake', category: 'animation', description: 'Shaking error effect', icon: <Sparkles className="w-4 h-4" />, type: 'custom' },
  { id: 'glow-effect', name: 'Glow', category: 'effect', description: 'Glowing box-shadow', icon: <Sparkles className="w-4 h-4" />, type: 'custom' },
];

/** Component assets */
const COMPONENT_ASSETS: AssetDefinition[] = [
  { id: 'nav-bar', name: 'Navigation Bar', category: 'navigation', description: 'Top navigation bar', icon: <Layout className="w-4 h-4" />, type: 'container' },
  { id: 'hero-section', name: 'Hero Section', category: 'sections', description: 'Hero banner section', icon: <Layout className="w-4 h-4" />, type: 'container' },
  { id: 'feature-card', name: 'Feature Card', category: 'cards', description: 'Feature showcase card', icon: <Layout className="w-4 h-4" />, type: 'container' },
  { id: 'testimonial', name: 'Testimonial', category: 'sections', description: 'Customer testimonial', icon: <Layout className="w-4 h-4" />, type: 'container' },
  { id: 'footer', name: 'Footer', category: 'sections', description: 'Page footer', icon: <Layout className="w-4 h-4" />, type: 'container' },
];

/** Asset card component */
function AssetCard({ asset }: { asset: AssetDefinition }) {
  const { addElement } = useEditorStore();

  /** Add asset to canvas */
  const handleAdd = () => {
    addElement({
      type: asset.type,
      name: asset.name,
      content: getDefaultContent(asset.type, asset.name),
      style: getDefaultStyle(asset.type)
    });
  };

  return (
    <div className="group p-3 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          {asset.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{asset.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleAdd}
      >
        <Plus className="w-3 h-3 mr-1" />
        Add
      </Button>
    </div>
  );
}

/** Get default content for element type */
function getDefaultContent(type: CanvasElementType, name: string): string {
  switch (type) {
    case 'text': return name.includes('Heading') ? 'Heading Text' : 'Text content goes here';
    case 'button': return name.includes('Primary') ? 'Get Started' : name.includes('Secondary') ? 'Learn More' : 'Click Me';
    case 'input': return 'Enter text...';
    default: return '';
  }
}

/** Get default style for element type */
function getDefaultStyle(type: CanvasElementType): Record<string, string> {
  switch (type) {
    case 'button':
      return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#ffffff',
        backgroundColor: '#6366f1',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer'
      };
    case 'text':
      return {
        fontSize: '16px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1f2937'
      };
    default:
      return {};
  }
}

/** Asset browser component */
export function AssetBrowser() {
  const [searchQuery, setSearchQuery] = useState('');

  /** Filter assets by search query */
  const filterAssets = (assets: AssetDefinition[]) => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4" />
          <span className="font-medium text-sm">Assets</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Categories tabs */}
      <Tabs defaultValue="elements" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-3">
          <TabsTrigger value="elements" className="text-xs flex-1">Elements</TabsTrigger>
          <TabsTrigger value="effects" className="text-xs flex-1">Effects</TabsTrigger>
          <TabsTrigger value="components" className="text-xs flex-1">Components</TabsTrigger>
        </TabsList>

        {/* Elements tab */}
        <TabsContent value="elements" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {filterAssets(ASSETS).map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
              {filterAssets(ASSETS).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No elements found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Effects tab */}
        <TabsContent value="effects" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {filterAssets(EFFECT_ASSETS).map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
              {filterAssets(EFFECT_ASSETS).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No effects found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Components tab */}
        <TabsContent value="components" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {filterAssets(COMPONENT_ASSETS).map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
              {filterAssets(COMPONENT_ASSETS).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No components found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssetBrowser;
