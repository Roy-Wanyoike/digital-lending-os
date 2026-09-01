'use client';

/**
 * Toolbar Component
 * @module roycss/studio/components/Toolbar
 * @description Main toolbar for Studio editor
 */

import React from 'react';
import { useEditorStore } from '../lib/editor-state';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer2,
  Square,
  Type,
  Image,
  Undo2,
  Redo2,
  Grid3X3,
  Ruler,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Code,
  Download,
  Save
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportProject } from '../lib/export-manager';

/** Tool type */
type ToolType = 'select' | 'rectangle' | 'text' | 'image' | 'hand';

/** Toolbar component */
export function Toolbar() {
  const {
    viewMode,
    setViewMode,
    zoomLevel,
    setZoomLevel,
    showGrid,
    toggleGrid,
    showRulers,
    toggleRulers,
    snapToGrid,
    toggleSnapToGrid,
    addElement,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditorStore();

  /** Handle zoom in */
  const handleZoomIn = () => {
    const levels: number[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = levels.indexOf(zoomLevel as any);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1] as any);
    }
  };

  /** Handle zoom out */
  const handleZoomOut = () => {
    const levels: number[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = levels.indexOf(zoomLevel as any);
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1] as any);
    }
  };

  /** Handle tool selection */
  const handleToolSelect = (tool: ToolType) => {
    switch (tool) {
      case 'rectangle':
        addElement({ type: 'container', name: 'New Container', content: '' });
        break;
      case 'text':
        addElement({ type: 'text', name: 'Text Element', content: 'Text content' });
        break;
      case 'image':
        addElement({ type: 'image', name: 'Image', content: '' });
        break;
    }
  };

  /** Handle export */
  const handleExport = () => {
    const result = exportProject({ format: 'html' });
    if (result.success && result.files[0]) {
      const blob = new Blob([result.files[0].content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.files[0].name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="h-12 border-b bg-background flex items-center px-4 gap-2">
      {/* Left section - Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === 'design' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('design')}
          title="Design Mode"
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToolSelect('rectangle')}
          title="Add Container"
        >
          <Square className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToolSelect('text')}
          title="Add Text"
        >
          <Type className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToolSelect('image')}
          title="Add Image"
        >
          <Image className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Center section - History & View options */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant={showGrid ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>

        <Button
          variant={showRulers ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleRulers}
          title="Toggle Rulers"
        >
          <Ruler className="w-4 h-4" />
        </Button>

        <Button
          variant={snapToGrid ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleSnapToGrid}
          title="Snap to Grid"
        >
          <Magnet className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Right section - View mode & zoom */}
      <div className="flex items-center gap-1 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="w-4 h-4" />
              {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewMode('design')}>
              Design Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('preview')}>
              Preview Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('code')}>
              Code Mode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <span className="text-sm w-12 text-center">{Math.round((zoomLevel as number) * 100)}%</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoomLevel(1)}
          title="Reset Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="Export Project"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default Toolbar;
