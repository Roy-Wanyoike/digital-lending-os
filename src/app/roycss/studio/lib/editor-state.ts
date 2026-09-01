/**
 * Editor State Management
 * @module roycss/studio/lib/editor-state
 * @description Zustand store for Studio editor state
 */

import { create } from 'zustand';

/** Position type */
export interface Position {
  x: number;
  y: number;
}

/** Size type */
export interface Size {
  width: number;
  height: number;
}

/** Element style properties */
export interface ElementStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: string;
  transform?: string;
  transition?: string;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  [key: string]: string | undefined;
}

/** Canvas element */
export interface CanvasElement {
  id: string;
  type: 'container' | 'text' | 'button' | 'image' | 'input' | 'custom';
  name: string;
  position: Position;
  size: Size;
  style: ElementStyle;
  content?: string;
  children?: string[];
  parentId?: string;
  locked?: boolean;
  visible?: boolean;
  selected?: boolean;
}

/** Editor view mode */
export type ViewMode = 'design' | 'preview' | 'code';

/** Editor zoom level */
export type ZoomLevel = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

/** Editor state interface */
export interface EditorState {
  // Elements
  elements: Record<string, CanvasElement>;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  
  // View
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Canvas
  canvasSize: Size;
  canvasBackgroundColor: string;
  
  // UI state
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activeTab: 'layers' | 'assets' | 'properties' | 'code';
  
  // Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'position' | 'size'>) => string;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  selectElement: (id: string | null) => void;
  hoverElement: (id: string | null) => void;
  
  // Element position/size
  moveElement: (id: string, position: Position) => void;
  resizeElement: (id: string, size: Size) => void;
  
  // View actions
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnapToGrid: () => void;
  
  // Panel actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActiveTab: (tab: EditorState['activeTab']) => void;
  
  // Bulk operations
  duplicateElement: (id: string) => string;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/** Generate unique ID */
let idCounter = 0;
const generateId = (): string => `el_${Date.now()}_${++idCounter}`;

/** Default element styles by type */
const defaultStyles: Record<CanvasElement['type'], ElementStyle> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px'
  },
  text: {
    fontSize: '16px',
    fontFamily: 'system-ui, sans-serif',
    color: '#1f2937'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: '#6366f1',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  },
  image: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px'
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  },
  custom: {}
};

/** Default sizes by type */
const defaultSizes: Record<CanvasElement['type'], Size> = {
  container: { width: 300, height: 200 },
  text: { width: 200, height: 40 },
  button: { width: 120, height: 44 },
  image: { width: 200, height: 150 },
  input: { width: 200, height: 44 },
  custom: { width: 100, height: 100 }
};

/**
 * Create editor store
 */
export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  elements: {},
  selectedElementId: null,
  hoveredElementId: null,
  
  viewMode: 'design',
  zoomLevel: 1,
  showGrid: true,
  showRulers: true,
  snapToGrid: true,
  gridSize: 8,
  
  canvasSize: { width: 1200, height: 800 },
  canvasBackgroundColor: '#ffffff',
  
  leftPanelOpen: true,
  rightPanelOpen: true,
  activeTab: 'layers',
  
  // History state
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  // Add element
  addElement: (elementData) => {
    const id = generateId();
    const newElement: CanvasElement = {
      ...elementData,
      id,
      position: { x: 50 + Object.keys(get().elements).length * 20, y: 50 + Object.keys(get().elements).length * 20 },
      size: defaultSizes[elementData.type] || defaultSizes.custom,
      style: { ...defaultStyles[elementData.type], ...elementData.style }
    };

    set(state => ({
      elements: { ...state.elements, [id]: newElement }
    }));

    return id;
  },

  // Remove element
  removeElement: (id) => {
    set(state => {
      const newElements = { ...state.elements };
      delete newElements[id];
      
      return {
        elements: newElements,
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId
      };
    });
  },

  // Update element
  updateElement: (id, updates) => {
    set(state => ({
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], ...updates }
      }
    }));
  },

  // Select element
  selectElement: (id) => {
    set({ selectedElementId: id });
    
    // Switch to properties tab when selecting
    if (id) {
      set({ activeTab: 'properties' });
    }
  },

  // Hover element
  hoverElement: (id) => {
    set({ hoveredElementId: id });
  },

  // Move element
  moveElement: (id, position) => {
    set(state => ({
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], position }
      }
    }));
  },

  // Resize element
  resizeElement: (id, size) => {
    set(state => ({
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], size }
      }
    }));
  },

  // Set view mode
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  // Set zoom level
  setZoomLevel: (level) => {
    set({ zoomLevel: level });
  },

  // Toggle grid
  toggleGrid: () => {
    set(state => ({ showGrid: !state.showGrid }));
  },

  // Toggle rulers
  toggleRulers: () => {
    set(state => ({ showRulers: !state.showRulers }));
  },

  // Toggle snap to grid
  toggleSnapToGrid: () => {
    set(state => ({ snapToGrid: !state.snapToGrid }));
  },

  // Toggle left panel
  toggleLeftPanel: () => {
    set(state => ({ leftPanelOpen: !state.leftPanelOpen }));
  },

  // Toggle right panel
  toggleRightPanel: () => {
    set(state => ({ rightPanelOpen: !state.rightPanelOpen }));
  },

  // Set active tab
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  // Duplicate element
  duplicateElement: (id) => {
    const state = get();
    const original = state.elements[id];
    if (!original) return '';

    const newId = generateId();
    const duplicated: CanvasElement = {
      ...original,
      id: newId,
      name: `${original.name} (copy)`,
      position: { x: original.position.x + 20, y: original.position.y + 20 }
    };

    set({
      elements: { ...state.elements, [newId]: duplicated },
      selectedElementId: newId
    });

    return newId;
  },

  // Bring to front
  bringToFront: (id) => {
    // In a real implementation, this would manage z-index/ordering
    console.log('Bring to front:', id);
  },

  // Send to back
  sendToBack: (id) => {
    console.log('Send to back:', id);
  },

  // Undo (simplified)
  undo: () => {
    console.log('Undo');
  },

  // Redo (simplified)
  redo: () => {
    console.log('Redo');
  },

  canUndo: false,
  canRedo: false
}));

export default useEditorStore;
