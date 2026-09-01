/**
 * Responsive Utilities
 * 
 * Utility functions for responsive design.
 */

import { breakpoints, type Breakpoint } from './breakpoints';

/**
 * Generate a media query string
 */
export function mq(breakpoint: Breakpoint): string {
  return `(min-width: ${breakpoints[breakpoint]})`;
}

/**
 * Generate a max-width media query string
 */
export function mqMax(breakpoint: Breakpoint): string {
  const px = parseInt(breakpoints[breakpoint]) - 1;
  return `(max-width: ${px}px)`;
}

/**
 * Get CSS class for hiding at specific breakpoint
 */
export function hideAt(breakpoint: Breakpoint): string {
  return `max-${breakpoint}:hidden`;
}

/**
 * Get CSS class for showing at specific breakpoint
 */
export function showFrom(breakpoint: Breakpoint): string {
  return `${breakpoint}:block`;
}

/**
 * Responsive value helper - returns different values based on breakpoint
 * Useful for inline styles or conditional logic
 */
export function responsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  defaultValue: T
): T {
  const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = order.indexOf(currentBreakpoint);
  
  // Find the largest matching breakpoint with a defined value
  for (let i = currentIndex; i >= 0; i--) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return defaultValue;
}

/**
 * Clamp a value between min and max based on viewport width
 * Returns a CSS calc() expression for fluid sizing
 */
export function fluidSize(
  minSize: number,
  maxSize: number,
  minViewport: number = 320,
  maxViewport: number = 1536
): string {
  // Calculate the slope and intercept for linear interpolation
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;
  
  return `clamp(${minSize}px, ${intercept.toFixed(2)}px + ${(slope * 100).toFixed(2)}vw, ${maxSize}px)`;
}

/**
 * Common fluid size presets
 */
export const fluidSizes = {
  text: {
    xs: fluidSize(12, 14),
    sm: fluidSize(14, 16),
    base: fluidSize(16, 18),
    lg: fluidSize(18, 20),
    xl: fluidSize(20, 24),
    '2xl': fluidSize(24, 30),
    '3xl': fluidSize(30, 36),
    '4xl': fluidSize(36, 48),
    '5xl': fluidSize(48, 60),
  },
  spacing: {
    xs: fluidSize(4, 8),
    sm: fluidSize(8, 12),
    md: fluidSize(12, 16),
    lg: fluidSize(16, 24),
    xl: fluidSize(24, 32),
    '2xl': fluidSize(32, 48),
    '3xl': fluidSize(48, 64),
  },
} as const;

/**
 * Container padding helper
 */
export function containerPadding(breakpoint: Breakpoint): string {
  switch (breakpoint) {
    case 'xs':
    case 'sm':
      return '1rem';
    case 'md':
      return '1.5rem';
    case 'lg':
      return '2rem';
    default:
      return '3rem';
  }
}
