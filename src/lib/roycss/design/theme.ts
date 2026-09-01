/**
 * ROYCSS Theme Configuration
 * 
 * Light and dark theme definitions with CSS custom properties.
 * Supports system preference detection and manual toggle.
 */

import { tokens } from './tokens';

export interface ThemeConfig {
  name: 'light' | 'dark';
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    // ROYCSS specific
    gradient: string;
    surface: string;
    surfaceHover: string;
    overlay: string;
  };
}

export const themes: Record<'light' | 'dark', ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      popover: '#ffffff',
      popoverForeground: '#0f172a',
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#3b82f6',
      gradient: tokens.colors.gradient.primary,
      surface: '#f8fafc',
      surfaceHover: '#f1f5f9',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      cardForeground: '#f8fafc',
      popover: '#1e293b',
      popoverForeground: '#f8fafc',
      primary: '#60a5fa',
      primaryForeground: '#0f172a',
      secondary: '#334155',
      secondaryForeground: '#f8fafc',
      muted: '#334155',
      mutedForeground: '#94a3b8',
      accent: '#334155',
      accentForeground: '#f8fafc',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#334155',
      input: '#334155',
      ring: '#60a5fa',
      gradient: tokens.colors.gradient.primary,
      surface: '#1e293b',
      surfaceHover: '#334155',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
  },
};

/**
 * Generate CSS custom properties for a theme
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  const { colors } = theme;
  
  return `
    --background: ${colors.background};
    --foreground: ${colors.foreground};
    --card: ${colors.card};
    --card-foreground: ${colors.cardForeground};
    --popover: ${colors.popover};
    --popover-foreground: ${colors.popoverForeground};
    --primary: ${colors.primary};
    --primary-foreground: ${colors.primaryForeground};
    --secondary: ${colors.secondary};
    --secondary-foreground: ${colors.secondaryForeground};
    --muted: ${colors.muted};
    --muted-foreground: ${colors.mutedForeground};
    --accent: ${colors.accent};
    --accent-foreground: ${colors.accentForeground};
    --destructive: ${colors.destructive};
    --destructive-foreground: ${colors.destructiveForeground};
    --border: ${colors.border};
    --input: ${colors.input};
    --ring: ${colors.ring};
    --roycss-gradient: ${colors.gradient};
    --roycss-surface: ${colors.surface};
    --roycss-surface-hover: ${colors.surfaceHover};
    --roycss-overlay: ${colors.overlay};
  `;
}

/**
 * Get theme based on system preference or stored preference
 */
export function getPreferredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  const stored = localStorage.getItem('roycss-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  localStorage.setItem('roycss-theme', theme);
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): 'light' | 'dark' {
  const current = getPreferredTheme();
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

// Theme class names for Tailwind
export const themeClassNames = {
  light: 'light',
  dark: 'dark',
} as const;

export default themes;
