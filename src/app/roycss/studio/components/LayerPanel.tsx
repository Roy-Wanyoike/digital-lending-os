'use client';

/**
 * Layer Panel Component
 * @module roycss/studio/components/LayerPanel
 * @description Layer management panel for Studio
 */

import React from 'react';
import { useEditorStore } from '../lib/editor-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  GripVertical,
  Trash2,
  Copy,
  Layers
} from 'lucide-react';

/** Layer item component */
function LayerItem({ 
  id, 
  name, 
  type, 
  visible, 
  locked, 
  selected 
}: { 
  id: string; 
  name: string; 
  type: string; 
  visible?: boolean; 
  locked?: boolean; 
  selected: boolean;
}) {
  const { selectElement, updateElement, removeElement, duplicateElement } = useEditorStore();

  /** Toggle visibility */
  const toggleVisibility = () => {
    updateElement(id, { visible: !visible });
  };

  /** Toggle lock */
  const toggleLock = () => {
    updateElement(id, { locked: !locked });
  };

  /** Get icon for element type */
  const getTypeIcon = () => {
    switch (type) {
      case 'container': return '📦';
      case 'text': return '📝';
      case 'button': return '🔘';
      case 'image': return '🖼️';
      case 'input': return '✏️';
      default: return '⬜';
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
        selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
      }`}
      onClick={() => selectElement(id)}
    >
      {/* Drag handle */}
      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Type icon */}
      <span className="w-5 text-center text-sm">{getTypeIcon()}</span>
      
      {/* Name */}
      <span className="flex-1 text-sm truncate">{name}</span>
      
      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); toggleVisibility(); }}
          className="p-1 hover:bg-background rounded"
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); toggleLock(); }}
          className="p-1 hover:bg-background rounded"
          title={locked ? 'Unlock' : 'Lock'}
        >
          {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); duplicateElement(id); }}
          className="p-1 hover:bg-background rounded"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); removeElement(id); }}
          className="p-1 hover:bg-destructive/10 text-destructive rounded"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/** Layer panel component */
export function LayerPanel() {
  const { elements, selectedElementId } = useEditorStore();
  const elementList = Object.values(elements);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span className="font-medium text-sm">Layers</span>
        </div>
        <span className="text-xs text-muted-foreground">{elementList.length}</span>
      </div>

      {/* Layer list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {elementList.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No layers yet</p>
              <p className="text-xs">Add elements to see them here</p>
            </div>
          ) : (
            // Render in reverse order (top layer first)
            [...elementList].reverse().map(el => (
              <LayerItem
                key={el.id}
                id={el.id}
                name={el.name}
                type={el.type}
                visible={el.visible}
                locked={el.locked}
                selected={el.id === selectedElementId}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LayerPanel;
