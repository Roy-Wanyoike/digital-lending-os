/**
 * ROYCSS Shadow/Elevation System
 * 
 * Comprehensive shadow system for depth and elevation.
 * Supports both light and dark modes with glow effects.
 */

import { tokens } from './tokens';

// Shadow definitions
export const shadows = {
  // Base shadows (subtle to prominent)
  none: 'none',
  
  xs: {
    light: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    dark: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  },
  
  sm: {
    light: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    dark: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  },
  
  base: {
    light: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    dark: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  },
  
  md: {
    light: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    dark: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
  },
  
  lg: {
    light: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    dark: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  },
  
  xl: {
    light: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    dark: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
  },
  
  '2xl': {
    light: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    dark: '0 25px 50px -12px rgb(0 0 0 / 0.6)',
  },
  
  inner: {
    light: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    dark: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
  },

  // Glow effects (for interactive elements)
  glow: {
    primary: {
      light: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
      dark: '0 0 20px rgba(96, 165, 250, 0.4), 0 0 40px rgba(96, 165, 250, 0.2)',
    },
    purple: {
      light: '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
      dark: '0 0 20px rgba(167, 139, 250, 0.4), 0 0 40px rgba(167, 139, 250, 0.2)',
    },
    cyan: {
      light: '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
      dark: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)',
    },
    pink: {
      light: '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',
      dark: '0 0 20px rgba(244, 114, 182, 0.4), 0 0 40px rgba(244, 114, 182, 0.2)',
    },
    success: {
      light: '0 0 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1)',
      dark: '0 0 20px rgba(74, 222, 128, 0.4), 0 0 40px rgba(74, 222, 128, 0.2)',
    },
    warning: {
      light: '0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1)',
      dark: '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2)',
    },
    error: {
      light: '0 0 20px rgba(239, 68, 68, 0.3), 0 0 40px rgba(239, 68, 68, 0.1)',
      dark: '0 0 20px rgba(248, 113, 113, 0.4), 0 0 40px rgba(248, 113, 113, 0.2)',
    },
  },

  // Colored shadows for cards/elements
  colored: {
    primary: {
      light: '0 4px 14px 0 rgba(59, 130, 246, 0.15)',
      dark: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
    },
    purple: {
      light: '0 4px 14px 0 rgba(139, 92, 246, 0.15)',
      dark: '0 4px 14px 0 rgba(139, 92, 246, 0.3)',
    },
    cyan: {
      light: '0 4px 14px 0 rgba(6, 182, 212, 0.15)',
      dark: '0 4px 14px 0 rgba(6, 182, 212, 0.3)',
    },
    pink: {
      light: '0 4px 14px 0 rgba(236, 72, 153, 0.15)',
      dark: '0 4px 14px 0 rgba(236, 72, 153, 0.3)',
    },
  },
} as const;

// Elevation levels for semantic use
export type ElevationLevel = 
  | 'flat'
  | 'raised'
  | 'floating'
  | 'overlay'
  | 'modal'
  | 'popover';

export const elevationMap: Record<ElevationLevel, keyof typeof shadows> = {
  flat: 'none',
  raised: 'sm',
  floating: 'lg',
  overlay: 'xl',
  modal: '2xl',
  popover: 'md',
};

/**
 * Get shadow value for current theme
 */
export function getShadow(
  level: keyof typeof shadows,
  isDark = false
): string {
  const shadow = shadows[level];
  if (typeof shadow === 'string') return shadow;
  return isDark ? shadow.dark : shadow.light;
}

/**
 * Get glow shadow value
 */
export function getGlowShadow(
  color: keyof typeof shadows.glow,
  isDark = false
): string {
  return shadows.glow[color][isDark ? 'dark' : 'light'];
}

/**
 * Get elevation shadow by semantic level
 */
export function getElevation(
  level: ElevationLevel,
  isDark = false
): string {
  const shadowKey = elevationMap[level];
  return getShadow(shadowKey, isDark);
}

// CSS class names for shadows
export const shadowClasses = {
  // Base shadows
  'shadow-xs': 'shadow-xs',
  'shadow-sm': 'shadow-sm',
  'shadow-base': 'shadow',
  'shadow-md': 'shadow-md',
  'shadow-lg': 'shadow-lg',
  'shadow-xl': 'shadow-xl',
  'shadow-2xl': 'shadow-2xl',
  'shadow-inner': 'shadow-inner',
  'shadow-none': 'shadow-none',
  
  // Glow effects
  'glow-primary': 'glow-primary',
  'glow-purple': 'glow-purple',
  'glow-cyan': 'glow-cyan',
  'glow-pink': 'glow-pink',
  'glow-success': 'glow-success',
  'glow-warning': 'glow-warning',
  'glow-error': 'glow-error',
} as const;

/**
 * Generate CSS custom properties for shadows
 */
export function generateShadowCSS(): string {
  return `
    --shadow-xs: ${shadows.xs.light};
    --shadow-sm: ${shadows.sm.light};
    --shadow-base: ${shadows.base.light};
    --shadow-md: ${shadows.md.light};
    --shadow-lg: ${shadows.lg.light};
    --shadow-xl: ${shadows.xl.light};
    --shadow-2xl: ${shadows['2xl'].light};
    --shadow-inner: ${shadows.inner.light};
    
    .dark {
      --shadow-xs: ${shadows.xs.dark};
      --shadow-sm: ${shadows.sm.dark};
      --shadow-base: ${shadows.base.dark};
      --shadow-md: ${shadows.md.dark};
      --shadow-lg: ${shadows.lg.dark};
      --shadow-xl: ${shadows.xl.dark};
      --shadow-2xl: ${shadows['2xl'].dark};
      --shadow-inner: ${shadows.inner.dark};
    }
  `;
}

export default shadows;
