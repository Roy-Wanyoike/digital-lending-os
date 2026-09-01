/**
 * ROYCSS Breakpoints
 * 
 * Responsive breakpoint definitions for the design system.
 * Mobile-first approach: styles apply from that breakpoint up.
 */

export const breakpoints = {
  // Extra small devices (phones, 320px+)
  xs: '320px',
  
  // Small devices (phones in landscape, 640px+)
  sm: '640px',
  
  // Medium devices (tablets, 768px+)
  md: '768px',
  
  // Large devices (laptops/desktops, 1024px+)
  lg: '1024px',
  
  // Extra large devices (large desktops, 1280px+)
  xl: '1280px',
  
  // 2X large devices (large screens, 1536px+)
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Breakpoint order (smallest to largest)
export const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

// Media query strings for each breakpoint
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries (for mobile-first overrides)
  'max-xs': `(max-width: ${breakpoints.xs})`,
  'max-sm': `(max-width: ${breakpoints.sm})`,
  'max-md': `(max-width: ${breakpoints.md})`,
  'max-lg': `(max-width: ${breakpoints.lg})`,
  'max-xl': `(max-width: ${breakpoints.xl})`,
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Interaction
  hover: '(hover: hover)',
  touch: '(hover: none)',
  
  // Motion preference
  reduceMotion: '(prefers-reduced-motion: reduce)',
  noReduceMotion: '(prefers-reduced-motion: no-preference)',
  
  // Color scheme
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)',
  
  // High contrast
  highContrast: '(prefers-contrast: high)',
} as const;

/**
 * Get the current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
}

/**
 * Check if a breakpoint is at or above another breakpoint
 */
export function isBreakpointUp(current: Breakpoint, target: Breakpoint): boolean {
  const currentIndex = breakpointOrder.indexOf(current);
  const targetIndex = breakpointOrder.indexOf(target);
  return currentIndex >= targetIndex;
}

/**
 * Check if a breakpoint is at or below another breakpoint
 */
export function isBreakpointDown(current: Breakpoint, target: Breakpoint): boolean {
  const currentIndex = breakpointOrder.indexOf(current);
  const targetIndex = breakpointOrder.indexOf(target);
  return currentIndex <= targetIndex;
}

// Container widths for each breakpoint
export const containerWidths = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid configurations
export const gridConfigs = {
  columns: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
    '2xl': 6,
  },
  gap: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '1.5rem',
    '2xl': '2rem',
  },
} as const;

export default breakpoints;
