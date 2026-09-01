'use client';

/**
 * Studio Page
 * @module roycss/studio/page
 * @description Visual editor interface for ROYCSS
 */

import React from 'react';
import { useEditorStore } from './lib/editor-state';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PropertyPanel } from './components/PropertyPanel';
import { LayerPanel } from './components/LayerPanel';
import { AssetBrowser } from './components/AssetBrowser';
import { CodePanel } from './components/CodePanel';
import { Button } from '@/components/ui/button';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen,
  Layers,
  Package,
  SlidersHorizontal,
  Code2
} from 'lucide-react';

/** Studio main page */
export default function StudioPage() {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    activeTab,
    setActiveTab,
    viewMode
  } = useEditorStore();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {leftPanelOpen && (
          <aside className="w-72 border-r bg-card flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === 'layers'
                    ? 'bg-border text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('layers')}
              >
                <Layers className="w-4 h-4 inline mr-1.5" />
                Layers
              </button>
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === 'assets'
                    ? 'bg-border text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('assets')}
              >
                <Package className="w-4 h-4 inline mr-1.5" />
                Assets
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'layers' ? <LayerPanel /> : <AssetBrowser />}
            </div>
          </aside>
        )}

        {/* Toggle left panel button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-20 z-10 rounded-r-md"
          onClick={toggleLeftPanel}
        >
          {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </Button>

        {/* Canvas area */}
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
          <Canvas className="min-h-full p-8" />
        </main>

        {/* Toggle right panel button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-20 z-10 rounded-l-md"
          onClick={toggleRightPanel}
        >
          {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </Button>

        {/* Right sidebar */}
        {rightPanelOpen && (
          <aside className="w-80 border-l bg-card flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === 'properties'
                    ? 'bg-border text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('properties')}
              >
                <SlidersHorizontal className="w-4 h-4 inline mr-1.5" />
                Properties
              </button>
              <button
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === 'code'
                    ? 'bg-border text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Code2 className="w-4 h-4 inline mr-1.5" />
                Code
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'properties' ? <PropertyPanel /> : <CodePanel />}
            </div>
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className="h-7 border-t bg-muted px-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>ROYCSS Studio v1.0.0</span>
          <span>•</span>
          <span>{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ready</span>
          <span>•</span>
          <span>Press ? for shortcuts</span>
        </div>
      </footer>
    </div>
  );
}
