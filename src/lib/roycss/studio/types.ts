/**
 * Studio Editor Types
 * @module roycss/studio/types
 * @description Type definitions for the ROYCSS visual studio editor
 */

import { CSSProperties } from 'react';

/** Editor view modes */
export type ViewMode = 'design' | 'code' | 'split' | 'preview';

/** Canvas zoom levels */
export type ZoomLevel = 25 | 50 | 75 | 100 | 125 | 150 | 200;

/** Snap settings */
export interface SnapSettings {
  /** Enable snapping */
  enabled: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Snap to grid */
  toGrid: boolean;
  /** Snap to elements */
  toElements: boolean;
  /** Snap to guides */
  toGuides: boolean;
}

/** Position/coordinates */
export interface Position {
  x: number;
  y: number;
}

/** Dimensions */
export interface Dimensions {
  width: number;
  height: number;
}

/** Bounds (position + dimensions) */
export interface Bounds extends Position, Dimensions {}

/** Layer types in the editor */
export type LayerType = 
  | 'container'
  | 'text'
  | 'image'
  | 'shape'
  | 'component'
  | 'group'
  | 'frame'
  | 'instance';

/** Text layer configuration */
export interface TextLayerConfig {
  content: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
}

/** Image layer configuration */
export interface ImageLayerConfig {
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  opacity: number;
  filters?: {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
  };
}

/** Shape layer configuration */
export interface ShapeLayerConfig {
  shapeType: 'rectangle' | 'ellipse' | 'triangle' | 'polygon' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  cornerRadius?: Partial<{
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  }>;
}

/** Base layer properties */
export interface BaseLayer {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Layer type */
  type: LayerType;
  /** Visibility */
  visible: boolean;
  /** Locked state */
  locked: boolean;
  /** Position on canvas */
  position: Position;
  /** Size dimensions */
  size: Dimensions;
  /** Rotation in degrees */
  rotation: number;
  /** Opacity (0-1) */
  opacity: number;
  /** CSS styles applied */
  styles: CSSProperties;
  /** Custom data attributes */
  data?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
}

/** Complete layer with type-specific config */
export interface Layer extends BaseLayer {
  /** Type-specific configuration */
  config?: TextLayerConfig | ImageLayerConfig | ShapeLayerConfig;
  /** Child layers (for groups/frames) */
  children?: Layer[];
  /** Parent ID if nested */
  parentId?: string;
}

/** Selection state */
export interface SelectionState {
  /** Selected layer IDs */
  selectedIds: string[];
  /** Primary selection (first selected) */
  primaryId: string | null;
  /** Selection bounds */
  bounds: Bounds | null;
  /** Is currently dragging */
  isDragging: boolean;
  /** Is currently resizing */
  isResizing: boolean;
  /** Resize handle being used */
  resizeHandle: ResizeHandle | null;
}

/** Resize handles */
export type ResizeHandle = 
  | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
  | 'top' | 'right' | 'bottom' | 'left';

/** History action types */
export type HistoryActionType = 
  | 'add_layer'
  | 'remove_layer'
  | 'move_layer'
  | 'resize_layer'
  | 'style_change'
  | 'property_change'
  | 'group'
  | 'ungroup'
  | 'duplicate'
  | 'paste'
  | 'rename';

/** History entry */
export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  timestamp: Date;
  description: string;
  /** Previous state snapshot */
  before: unknown;
  /** New state snapshot */
  after: unknown;
  /** Affected layer IDs */
  layerIds: string[];
}

/** Editor history state */
export interface EditorHistory {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

/** Property panel sections */
export type PropertySection = 
  | 'transform'
  | 'layout'
  | 'appearance'
  | 'typography'
  | 'effects'
  | 'spacing'
  | 'custom';

/** Property definition */
export interface PropertyDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'toggle' | 'slider';
  section: PropertySection;
  defaultValue: unknown;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/** Code panel language */
export type CodeLanguage = 'css' | 'scss' | 'tailwind' | 'jsx' | 'html';

/** Code panel state */
export interface CodePanelState {
  language: CodeLanguage;
  code: string;
  syncWithDesign: boolean;
  errors: Array<{ line: number; message: string; severity: 'error' | 'warning' }>;
}

/** Asset types */
export type AssetType = 'image' | 'icon' | 'component' | 'template' | 'color' | 'gradient';

/** Asset item */
export interface AssetItem {
  id: string;
  name: string;
  type: AssetType;
  thumbnail?: string;
  preview?: string;
  metadata: Record<string, unknown>;
}

/** Toolbar tool */
export type Tool = 
  | 'select'
  | 'hand'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'image'
  | 'line'
  | 'pen'
  | 'comment';

/** Tool configuration */
export interface ToolConfig {
  id: Tool;
  label: string;
  icon: string;
  shortcut: string;
  cursor: string;
}

/** Breakpoint for responsive design */
export interface Breakpoint {
  id: string;
  name: string;
  width: number;
  icon: string;
  active: boolean;
}

/** Default breakpoints */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: 'mobile', name: 'Mobile', width: 375, icon: '📱', active: false },
  { id: 'tablet', name: 'Tablet', width: 768, icon: '📱', active: false },
  { id: 'desktop', name: 'Desktop', width: 1280, icon: '💻', active: true },
  { id: 'wide', name: 'Wide', width: 1920, icon: '🖥️', active: false }
];

/** Editor state - main store shape */
export interface EditorState {
  // Canvas
  canvasSize: Dimensions;
  zoom: ZoomLevel;
  viewMode: ViewMode;
  
  // Layers
  layers: Layer[];
  layerOrder: string[]; // z-order
  
  // Selection
  selection: SelectionState;
  
  // Tools
  activeTool: Tool;
  snapSettings: SnapSettings;
  
  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activeLeftTab: 'layers' | 'assets';
  activeRightTab: 'properties' | 'code';
  
  // History
  history: EditorHistory;
  
  // Responsive
  breakpoints: Breakpoint[];
  activeBreakpoint: string;
  
  // UI State
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  guides: Array<{ id: string; position: Position; orientation: 'horizontal' | 'vertical' }>;
  
  // Project
  projectName: string;
  projectPath?: string;
  lastSaved?: Date;
  isDirty: boolean;
}

/** Default snap settings */
export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  gridSize: 8,
  toGrid: true,
  toElements: true,
  toGuides: true
};

/** Default editor state */
export const DEFAULT_EDITOR_STATE: EditorState = {
  canvasSize: { width: 1280, height: 800 },
  zoom: 100,
  viewMode: 'design',
  layers: [],
  layerOrder: [],
  selection: {
    selectedIds: [],
    primaryId: null,
    bounds: null,
    isDragging: false,
    isResizing: false,
    resizeHandle: null
  },
  activeTool: 'select',
  snapSettings: DEFAULT_SNAP_SETTINGS,
  leftPanelOpen: true,
  rightPanelOpen: true,
  activeLeftTab: 'layers',
  activeRightTab: 'properties',
  history: {
    entries: [],
    currentIndex: -1,
    maxEntries: 50
  },
  breakpoints: DEFAULT_BREAKPOINTS,
  activeBreakpoint: 'desktop',
  showGrid: true,
  showRulers: true,
  showGuides: true,
  guides: [],
  projectName: 'Untitled Project',
  isDirty: false
};

/** Export format options */
export interface ExportOptions {
  format: 'css' | 'scss' | 'tailwind' | 'jsx' | 'vue' | 'html';
  includeResponsive: boolean;
  prefix: string;
  minify: boolean;
  outputPath?: string;
}

/** Export result */
export interface ExportResult {
  success: boolean;
  files: Array<{ path: string; content: string }>;
  warnings: string[];
  errors: string[];
}
