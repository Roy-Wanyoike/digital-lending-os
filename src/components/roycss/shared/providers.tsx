/**
 * ROYCSS Shared Providers
 * @module roycss/shared/providers
 * @description Context providers for ROYCSS component system
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { type ToastNotification, type ToastType } from '@/lib/roycss/types';

// ============================================================================
// Toast Context
// ============================================================================

interface ToastContextValue {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastNotification, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastNotification = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
      };

      setToasts(prev => [...prev, newToast]);

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [defaultDuration, removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast, clearToasts }),
    [toasts, addToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

// ============================================================================
// Theme Context (Extended)
// ============================================================================

export interface RoyCSSThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontSize: 'sm' | 'base' | 'lg';
  density: 'comfortable' | 'normal' | 'compact';
}

interface ThemeContextValue {
  theme: RoyCSSThemeConfig;
  setTheme: (theme: Partial<RoyCSSThemeConfig>) => void;
  resolvedMode: 'light' | 'dark';
}

const defaultTheme: RoyCSSThemeConfig = {
  mode: 'system',
  primaryColor: 'emerald',
  accentColor: 'amber',
  borderRadius: 'md',
  fontSize: 'base',
  density: 'normal',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useRoyCSSTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useRoyCSSTheme must be used within a RoyCSSThemeProvider');
  }
  return context;
}

interface RoyCSSThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Partial<RoyCSSThemeConfig>;
}

export function RoyCSSThemeProvider({
  children,
  defaultTheme: initialTheme,
}: RoyCSSThemeProviderProps) {
  const [theme, setThemeState] = useState<RoyCSSThemeConfig>({
    ...defaultTheme,
    ...initialTheme,
  });

  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  );

  const setTheme = useCallback((updates: Partial<RoyCSSThemeConfig>) => {
    setThemeState(prev => ({ ...prev, ...updates }));
  }, []);

  const resolvedMode = theme.mode === 'system' ? systemMode : theme.mode;

  const value = useMemo(
    () => ({ theme, setTheme, resolvedMode }),
    [theme, setTheme, resolvedMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// Component Registry Context
// ============================================================================

interface RegisteredComponent {
  name: string;
  category: string;
  component: React.ComponentType<Record<string, unknown>>;
}

interface RegistryContextValue {
  components: Map<string, RegisteredComponent>;
  register: (component: RegisteredComponent) => void;
  unregister: (name: string) => void;
  get: (name: string) => RegisteredComponent | undefined;
  getByCategory: (category: string) => RegisteredComponent[];
}

const RegistryContext = createContext<RegistryContextValue | null>(null);

export function useComponentRegistry(): RegistryContextValue {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error('useComponentRegistry must be used within a RegistryProvider');
  }
  return context;
}

interface RegistryProviderProps {
  children: ReactNode;
}

export function RegistryProvider({ children }: RegistryProviderProps) {
  const [components] = useState<Map<string, RegisteredComponent>>(new Map());

  const register = useCallback((component: RegisteredComponent) => {
    components.set(component.name, component);
  }, [components]);

  const unregister = useCallback((name: string) => {
    components.delete(name);
  }, [components]);

  const get = useCallback(
    (name: string): RegisteredComponent | undefined => {
      return components.get(name);
    },
    [components]
  );

  const getByCategory = useCallback(
    (category: string): RegisteredComponent[] => {
      return Array.from(components.values()).filter(
        c => c.category === category
      );
    },
    [components]
  );

  const value = useMemo(
    () => ({ components, register, unregister, get, getByCategory }),
    [components, register, unregister, get, getByCategory]
  );

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
}

// ============================================================================
// Combined Provider
// ============================================================================

interface RoyCSSProvidersProps {
  children: ReactNode;
  toastDuration?: number;
  defaultTheme?: Partial<RoyCSSThemeConfig>;
}

/**
 * Main provider that wraps all ROYCSS context providers
 */
export function RoyCSSProviders({
  children,
  toastDuration,
  defaultTheme,
}: RoyCSSProvidersProps) {
  return (
    <RegistryProvider>
      <ToastProvider defaultDuration={toastDuration}>
        <RoyCSSThemeProvider defaultTheme={defaultTheme}>
          {children}
        </RoyCSSThemeProvider>
      </ToastProvider>
    </RegistryProvider>
  );
}

// ============================================================================
// Toast Helper Hook
// ============================================================================

/**
 * Hook for showing toast notifications
 * @returns Object with toast helper functions
 */
export function useToast() {
  const { addToast } = useToastContext();

  return {
    /**
     * Show a success toast
     */
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),

    /**
     * Show an error toast
     */
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),

    /**
     * Show a warning toast
     */
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),

    /**
     * Show an info toast
     */
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),

    /**
     * Show a custom toast with action button
     */
    custom: (toast: Omit<ToastNotification, 'id'>) => addToast(toast),
  };
}

export default RoyCSSProviders;
