/**
 * Overlay - Visual Highlight Overlay
 * @module roycss/inspector/overlay
 * @description Creates visual overlay for inspected elements
 */

import { BoxModelData } from './index';

/** Overlay options */
interface OverlayOptions {
  /** Show box model dimensions */
  showBoxModel?: boolean;
  /** Show element tag */
  showTag?: boolean;
  /** Highlight color */
  color?: string;
  /** Opacity */
  opacity?: number;
}

/** Active overlay state */
let overlayContainer: HTMLDivElement | null = null;
let activeElement: HTMLElement | null = null;

/**
 * Create the overlay container
 */
export function createOverlay(): HTMLDivElement {
  if (overlayContainer) {
    return overlayContainer;
  }

  // Create main container
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'roycss-inspector-overlay';
  overlayContainer.setAttribute('data-roycss', 'inspector');
  
  Object.assign(overlayContainer.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '2147483647', // Maximum z-index
    display: 'none'
  });

  document.body.appendChild(overlayContainer);
  
  return overlayContainer;
}

/**
 * Destroy the overlay container
 */
export function destroyOverlay(): void {
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
    activeElement = null;
  }
}

/**
 * Highlight an element with overlay
 */
export function highlightElement(
  element: HTMLElement, 
  options: OverlayOptions = {}
): void {
  const overlay = createOverlay();
  const {
    showBoxModel = false,
    showTag = true,
    color = '#6366f1',
    opacity = 0.3
  } = options;

  // Clear previous highlight
  clearHighlight();

  // Get element position
  const rect = element.getBoundingClientRect();
  
  // Create highlight elements
  const fragment = document.createDocumentFragment();

  // Main outline
  const outline = document.createElement('div');
  Object.assign(outline.style, {
    position: 'absolute',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    outline: `2px solid ${color}`,
    backgroundColor: hexToRgba(color, opacity),
    pointerEvents: 'none'
  });
  fragment.appendChild(outline);

  // Tag label
  if (showTag) {
    const tagLabel = createTagLabel(element, rect);
    fragment.appendChild(tagLabel);
  }

  // Box model visualization
  if (showBoxModel) {
    const boxModelElements = createBoxModelVisualization(element, rect, color);
    boxModelElements.forEach(el => fragment.appendChild(el));
  }

  // Add to overlay
  while (fragment.firstChild) {
    overlay.appendChild(fragment.firstChild!);
  }
  
  overlay.style.display = 'block';
  activeElement = element;
}

/**
 * Clear current highlight
 */
export function clearHighlight(): void {
  if (overlayContainer) {
    while (overlayContainer.firstChild) {
      overlayContainer.removeChild(overlayContainer.firstChild);
    }
    overlayContainer.style.display = 'none';
  }
  activeElement = null;
}

/**
 * Get currently highlighted element
 */
export function getActiveElement(): HTMLElement | null {
  return activeElement;
}

/**
 * Create tag label element
 */
function createTagLabel(element: HTMLElement, rect: DOMRect): HTMLElement {
  const label = document.createElement('div');
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className && typeof element.className === 'string' 
    ? `.${element.className.split(' ').slice(0, 2).join('.')}`
    : '';
  
  label.textContent = `${tagName}${id}${classes}`;
  
  Object.assign(label.style, {
    position: 'absolute',
    top: `${rect.top - 24}px`,
    left: `${rect.left}px`,
    padding: '2px 6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#6366f1',
    color: 'white',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  });

  return label;
}

/**
 * Create box model visualization
 */
function createBoxModelVisualization(
  element: HTMLElement, 
  rect: DOMRect, 
  color: string
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const styles = getComputedStyle(element);
  
  const boxModel: BoxModelData = {
    content: {
      top: parseFloat(styles.paddingTop || '0'),
      right: parseFloat(styles.paddingRight || '0'),
      bottom: parseFloat(styles.paddingBottom || '0'),
      left: parseFloat(styles.paddingLeft || '0'),
      width: rect.width - parseFloat(styles.paddingLeft || '0') - parseFloat(styles.paddingRight || '0'),
      height: rect.height - parseFloat(styles.paddingTop || '0') - parseFloat(styles.paddingBottom || '0')
    },
    padding: {
      top: parseFloat(styles.paddingTop || '0'),
      right: parseFloat(styles.paddingRight || '0'),
      bottom: parseFloat(styles.paddingBottom || '0'),
      left: parseFloat(styles.paddingLeft || '0'),
      width: 0,
      height: 0
    },
    border: {
      top: parseFloat(styles.borderTopWidth || '0'),
      right: parseFloat(styles.borderRightWidth || '0'),
      bottom: parseFloat(styles.borderBottomWidth || '0'),
      left: parseFloat(styles.borderLeftWidth || '0'),
      width: 0,
      height: 0
    },
    margin: {
      top: parseFloat(styles.marginTop || '0'),
      right: parseFloat(styles.marginRight || '0'),
      bottom: parseFloat(styles.marginBottom || '0'),
      left: parseFloat(styles.marginLeft || '0'),
      width: 0,
      height: 0
    }
  };

  // Colors for different areas
  const colors = {
    margin: hexToRgba('#ff6b6b', 0.2),
    border: hexToRgba('#ffd93d', 0.2),
    padding: hexToRgba('#6bcb77', 0.2),
    content: hexToRgba('#4d96ff', 0.2)
  };

  // Margin area
  const marginEl = document.createElement('div');
  Object.assign(marginEl.style, {
    position: 'absolute',
    top: `${rect.top - boxModel.margin.top}px`,
    left: `${rect.left - boxModel.margin.left}px`,
    width: `${rect.width + boxModel.margin.left + boxModel.margin.right}px`,
    height: `${rect.height + boxModel.margin.top + boxModel.margin.bottom}px`,
    backgroundColor: colors.margin,
    pointerEvents: 'none'
  });
  elements.push(marginEl);

  // Border area
  const borderEl = document.createElement('div');
  Object.assign(borderEl.style, {
    position: 'absolute',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: colors.border,
    pointerEvents: 'none'
  });
  elements.push(borderEl);

  // Padding area
  const paddingEl = document.createElement('div');
  Object.assign(paddingEl.style, {
    position: 'absolute',
    top: `${rect.top + boxModel.border.top}px`,
    left: `${rect.left + boxModel.border.left}px`,
    width: `${rect.width - boxModel.border.left - boxModel.border.right}px`,
    height: `${rect.height - boxModel.border.top - boxModel.border.bottom}px`,
    backgroundColor: colors.padding,
    pointerEvents: 'none'
  });
  elements.push(paddingEl);

  return elements;
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
