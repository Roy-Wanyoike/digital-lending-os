/**
 * ROYCSS Integration Layer
 * @module roycss/integration
 * @description shadcn/ui compatibility layer, Tailwind config extensions, and theme customization
 */

import type { ThemeConfig } from '../types';

// ============================================================================
// shadcn/ui Compatibility Layer
// ============================================================================

/**
 * Map ROYCSS components to shadcn/ui equivalents for seamless migration
 */
export const shadcnCompatibilityMap = {
  // Form Components
  'MaskedInput': { shadcn: 'Input', notes: 'Add mask prop support' },
  'ValidatedInput': { shadcn: 'Input + Form', notes: 'Use with react-hook-form' },
  'Select': { shadcn: 'Select', notes: 'Direct replacement' },
  'DatePicker': { shadcn: 'Popover + Calendar', notes: 'Combine components' },
  'FileUpload': { shadcn: 'Custom', notes: 'No direct equivalent' },
  'FormWizard': { shadcn: 'Custom', notes: 'Use Stepper pattern' },

  // Data Display Components
  'DataTable': { shadcn: 'Table', notes: 'Add sorting/filtering props' },
  'StatCard': { shadcn: 'Card', notes: 'Specialized variant' },
  'ProfileCard': { shadcn: 'Card', notes: 'Specialized variant' },
  'ProductCard': { shadcn: 'Card', notes: 'Specialized variant' },
  'Badge': { shadcn: 'Badge', notes: 'Direct replacement' },
  'Avatar': { shadcn: 'Avatar', notes: 'Direct replacement' },
  'Progress': { shadcn: 'Progress', notes: 'Direct replacement' },

  // Navigation Components
  'Breadcrumb': { shadcn: 'Breadcrumb', notes: 'Direct replacement' },
  'Tabs': { shadcn: 'Tabs', notes: 'Direct replacement with more variants' },
  'Pagination': { shadcn: 'Custom', notes: 'Use DataTable pagination' },
  'Sidebar': { shadcn: 'Sidebar (new)', notes: 'Direct replacement' },
  'CommandPalette': { shadcn: 'Command', notes: 'Direct replacement' },

  // Overlay Components
  'Modal': { shadcn: 'Dialog', notes: 'Alias to Dialog' },
  'Drawer': { shadcn: 'Sheet', notes: 'Direct replacement' },
  'ToastContainer': { shadcn: 'Sonner/Toaster', notes: 'Direct replacement' },
  'Popover': { shadcn: 'Popover', notes: 'Direct replacement' },
  'Tooltip': { shadcn: 'Tooltip', notes: 'Direct replacement' },

  // Feedback Components
  'Alert': { shadcn: 'Alert', notes: 'Direct replacement' },
  'ConfirmDialog': { shadcn: 'AlertDialog', notes: 'Direct replacement' },
  'EmptyState': { shadcn: 'Custom', notes: 'No direct equivalent' },
  'ErrorBoundary': { shadcn: 'Custom', notes: 'React component' },
};

/**
 * Get shadcn equivalent for a ROYCSS component
 */
export function getShadcnEquivalent(componentName: string): typeof shadcnCompatibilityMap[string] | undefined {
  return shadcnCompatibilityMap[componentName as keyof typeof shadcnCompatibilityMap];
}

/**
 * Generate migration guide from ROYCSS to shadcn/ui
 */
export function generateMigrationGuide(): string {
  let guide = '# ROYCSS to shadcn/ui Migration Guide\n\n';
  
  guide += '| ROYCSS Component | shadcn/ui Equivalent | Notes |\n';
  guide += '|------------------|---------------------|-------|\n';

  for (const [roycss, info] of Object.entries(shadcnCompatibilityMap)) {
    guide += `| \`${roycss}\` | \`${info.shadcn}\` | ${info.notes} |\n`;
  }

  return guide;
}

// ============================================================================
// Tailwind CSS Config Extensions
// ============================================================================

/**
 * Extended Tailwind configuration for ROYCSS
 * Add these to your tailwind.config.ts
 */
export const roycssTailwindConfig = {
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        success: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        info: {
          DEFAULT: '#3b82f6',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.15)',
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'slide-in-from-top': 'slideDown 0.3s ease-out',
        'slide-in-from-bottom': 'slideUp 0.3s ease-out',
        'slide-in-from-left': 'slideRight 0.3s ease-out',
        'slide-in-from-right': 'slideLeft 0.3s ease-out',
        progress: 'progress 1.5s ease-in-out infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        progress: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
};

/**
 * Get complete merged Tailwind config
 */
export function getMergedTailwindConfig(existingConfig?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...existingConfig,
    content: [
      './src/**/*.{ts,tsx}',
      ...(Array.isArray((existingConfig?.content as unknown)) ? existingConfig.content : []),
    ],
    darkMode: 'class',
    theme: {
      ...existingConfig?.theme,
      extend: {
        ...existingConfig?.theme?.extend,
        ...roycssTailwindConfig.theme.extend,
      },
    },
  };
}

// ============================================================================
// Theme Customization System
// ============================================================================

/** Pre-defined themes */
export const predefinedThemes = {
  default: {
    name: 'Default',
    colors: {
      primary: '#10b981',
      secondary: '#6366f1',
      accent: '#f59e0b',
      background: '#ffffff',
      foreground: '#111827',
      muted: '#f3f4f6',
      'muted-foreground': '#6b7280',
      border: '#e5e7eb',
      ring: '#10b981',
      destructive: '#ef4444',
    },
  },
  fintech: {
    name: 'Fintech',
    colors: {
      primary: '#059669',
      secondary: '#7c3aed',
      accent: '#d97706',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f9fafb',
      'muted-foreground': '#6b7280',
      border: '#e5e7eb',
      ring: '#059669',
      destructive: '#dc2626',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0891b2',
      secondary: '#7c3aed',
      accent: '#f97316',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f1f5f9',
      'muted-foreground': '#64748b',
      border: '#e2e8f0',
      ring: '#0891b2',
      destructive: '#e11d48',
    },
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#ea580c',
      secondary: '#db2777',
      accent: '#eab308',
      background: '#fffbeb',
      foreground: '#451a03',
      muted: '#fef3c7',
      'muted-foreground': '#92400e',
      border: '#fde68a',
      ring: '#ea580c',
      destructive: '#dc2626',
    },
  },
  forest: {
    name: 'Forest',
    colors: {
      primary: '#16a34a',
      secondary: '#059669',
      accent: '#ca8a04',
      background: '#f0fdf4',
      foreground: '#14532d',
      muted: '#dcfce7',
      'muted-foreground': '#166534',
      border: '#bbf7d0',
      ring: '#16a34a',
      destructive: '#dc2626',
    },
  },
} as const;

export type PredefinedThemeName = keyof typeof predefinedThemes;

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Apply theme CSS variables to document root
 */
export function applyTheme(
  themeName: PredefinedThemeName,
  mode: ThemeMode = 'light'
): void {
  if (typeof document === 'undefined') return;

  const theme = predefinedThemes[themeName];
  const root = document.documentElement;

  // Set color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Set mode class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

/**
 * Generate CSS custom properties from theme config
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  return `:root {
  --primary: ${theme.primaryColor};
  --secondary: ${theme.secondaryColor};
  --accent: ${theme.accentColor};
  --background: ${theme.backgroundColor};
  --foreground: ${theme.textColor};
  --radius: ${theme.borderRadius};
  --font-family: ${theme.fontFamily}`;
}

/**
 * Generate dark mode overrides
 */
export function generateDarkModeCSS(): string {
  return `.dark {
  --background: #0f172a;
  --foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --border: #334155;`;
}

// ============================================================================
// Dark/Light Mode Support Utilities
// ============================================================================

/**
 * Initialize dark mode based on user preference or stored value
 */
export function initializeDarkMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';

  const stored = localStorage.getItem('roycss-theme-mode') as ThemeMode | null;
  
  if (stored && ['light', 'dark'].includes(stored)) {
    applyTheme('default', stored);
    return stored;
  }

  // Default to system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme('default', prefersDark ? 'dark' : 'light');
  return 'system';
}

/**
 * Toggle between light and dark modes
 */
export function toggleDarkMode(currentMode: ThemeMode): ThemeMode {
  const newMode = currentMode === 'dark' ? 'light' : 'dark';
  localStorage.setItem('roycss-theme-mode', newMode);
  applyTheme('default', newMode);
  return newMode;
}
