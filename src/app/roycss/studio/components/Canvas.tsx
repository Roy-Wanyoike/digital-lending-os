'use client';

/**
 * Canvas Component
 * @module roycss/studio/components/Canvas
 * @description Visual canvas for designing elements
 */

import React, { useRef, useCallback } from 'react';
import { useEditorStore, CanvasElement } from '../lib/editor-state';

/** Canvas props */
interface CanvasProps {
  className?: string;
}

export function Canvas({ className = '' }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const {
    elements,
    selectedElementId,
    hoveredElementId,
    viewMode,
    zoomLevel,
    showGrid,
    snapToGrid,
    gridSize,
    canvasSize,
    canvasBackgroundColor,
    selectElement,
    hoverElement,
    moveElement,
    resizeElement
  } = useEditorStore();

  /** Handle canvas click (deselect) */
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  }, [selectElement]);

  /** Snap value to grid */
  const snapToGridValue = useCallback((value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  /** Handle element drag start */
  const handleDragStart = useCallback((e: React.DragEvent, elementId: string) => {
    e.dataTransfer.setData('text/plain', elementId);
    selectElement(elementId);
  }, [selectElement]);

  /** Render single element */
  const renderElement = (element: CanvasElement): React.ReactNode => {
    if (element.visible === false) return null;

    const isSelected = element.id === selectedElementId;
    const isHovered = element.id === hoveredElementId;

    // Build inline styles from element style properties
    const inlineStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      ...Object.fromEntries(
        Object.entries(element.style).map(([k, v]) => [
          // Convert to camelCase for React
          k.replace(/-([a-z])/g, (_, l) => l.toUpperCase()),
          v
        ])
      )
    };

    // Selection/hover overlay styles
    const selectionStyle: React.CSSProperties = {
      outline: isSelected ? '2px solid #6366f1' : isHovered ? '2px solid #a5b4fc' : 'none',
      outlineOffset: '2px',
      cursor: element.locked ? 'not-allowed' : 'move'
    };

    // Render based on type
    let content: React.ReactNode;
    
    switch (element.type) {
      case 'container':
        content = (
          <div style={{ width: '100%', height: '100%' }}>
            {element.content || 'Container'}
          </div>
        );
        break;
      case 'text':
        content = element.content || 'Text Element';
        break;
      case 'button':
        content = element.content || 'Button';
        break;
      case 'image':
        content = (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#e5e7eb', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            📷 Image
          </div>
        );
        break;
      case 'input':
        content = (
          <input 
            type="text" 
            placeholder={element.content || 'Enter text...'}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              padding: '0 12px'
            }}
            readOnly
          />
        );
        break;
      default:
        content = element.content || 'Element';
    }

    return (
      <div
        key={element.id}
        data-element-id={element.id}
        style={{ ...inlineStyle, ...selectionStyle }}
        draggable={!element.locked && viewMode === 'design'}
        onDragStart={(e) => handleDragStart(e, element.id)}
        onMouseDown={() => selectElement(element.id)}
        onMouseEnter={() => hoverElement(element.id)}
        onMouseLeave={() => hoverElement(null)}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
      >
        {content}
        
        {/* Selection handles */}
        {isSelected && viewMode === 'design' && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-500 rounded-full cursor-nw-resize" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full cursor-ne-resize" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-indigo-500 rounded-full cursor-sw-resize" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full cursor-se-resize" />
            
            {/* Element label */}
            <div className="absolute -top-6 left-0 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded">
              {element.name}
            </div>
          </>
        )}
      </div>
    );
  };

  /** Grid pattern for background */
  const GridPattern = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          id="grid"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx="0.5" cy="0.5" r="0.5" fill="#d1d5db" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );

  return (
    <div 
      ref={canvasRef}
      className={`relative overflow-auto bg-gray-50 ${className}`}
      onClick={handleCanvasClick}
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left'
      }}
    >
      {/* Canvas area */}
      <div
        className="relative shadow-lg"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: canvasBackgroundColor,
          minHeight: '100%'
        }}
      >
        {/* Grid */}
        {showGrid && viewMode === 'design' && <GridPattern />}
        
        {/* Elements */}
        {viewMode !== 'code' && Object.values(elements).map(renderElement)}

        {/* Empty state */}
        {Object.keys(elements).length === 0 && viewMode === 'design' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 mb-4 opacity-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-medium">Drop elements here</p>
            <p className="text-sm">or select from the asset browser</p>
          </div>
        )}
      </div>

      {/* Rulers placeholder */}
      {/* In a real implementation, would show pixel rulers */}
    </div>
  );
}

export default Canvas;
