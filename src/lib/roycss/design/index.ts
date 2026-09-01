/**
 * ROYCSS Design System
 * 
 * Main entry point for all design tokens, themes, animations, and shadows.
 */

export { tokens, type DesignTokens } from './tokens';
export { 
  themes, 
  type ThemeConfig,
  generateThemeCSS, 
  getPreferredTheme, 
  applyTheme, 
  toggleTheme,
  themeClassNames 
} from './theme';
export { 
  durations, 
  easings, 
  transitions, 
  variants, 
  keyframes, 
  animationClasses,
  generateAnimationCSS 
} from './animations';
export { 
  shadows, 
  type ElevationLevel,
  elevationMap, 
  getShadow, 
  getGlowShadow, 
  getElevation,
  shadowClasses,
  generateShadowCSS 
} from './shadows';

// Re-export commonly used items
export type { AnimationProps } from './animations';
