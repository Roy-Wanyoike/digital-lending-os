/**
 * ROYCSS Shared Utilities
 * @module roycss/shared/utils
 * @description Common utility functions for ROYCSS components
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper deduplication
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID for components
 * @param prefix - Optional prefix for the ID
 * @returns Unique identifier string
 */
export function generateId(prefix = 'roycss'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format file size to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Debounce function calls
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if code is running on client side
 * @returns Boolean indicating client-side execution
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get keyboard modifier keys state
 * @param event - Keyboard event
 * @returns Object with modifier key states
 */
export function getModifierKeys(
  event: KeyboardEvent
): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
  return {
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };
}

/**
 * Focus trap utilities for modals and drawers
 */
export const focusTrap = {
  /**
   * Create a focus trap within an element
   * @param container - Container element to trap focus within
   * @returns Cleanup function to remove focus trap
   */
  create(container: HTMLElement): () => void {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },
};

/**
 * Scroll lock utilities for modals and drawers
 */
export const scrollLock = {
  /** Enable scroll lock */
  enable(): void {
    if (typeof document === 'undefined') return;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  },

  /** Disable scroll lock */
  disable(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  },
};

/**
 * Animation utilities
 */
export const animation = {
  /**
   * Animate element with CSS transition
   * @param element - Element to animate
   * @param from - Starting styles
   * @param to - Ending styles
   * @param duration - Animation duration in ms
   * @returns Promise that resolves when animation completes
   */
  transition(
    element: HTMLElement,
    from: Record<string, string>,
    to: Record<string, string>,
    duration = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      Object.assign(element.style, from);
      
      // Force reflow
      element.offsetHeight;
      
      Object.assign(element.style, to, { transitionDuration: `${duration}ms` });
      
      setTimeout(() => {
        element.style.transitionDuration = '';
        resolve();
      }, duration);
    });
  },

  /**
   * Easing functions for animations
   */
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

/**
 * Date formatting utilities
 */
export const dateUtils = {
  /**
   * Format date to localized string
   * @param date - Date to format
   * @param options - Intl.DateTimeFormat options
   * @returns Formatted date string
   */
  format(
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    });
  },

  /**
   * Format time to localized string
   * @param date - Date to format
   * @param options - Intl.DateTimeFormat options
   * @returns Formatted time string
   */
  formatTime(
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  },

  /**
   * Get relative time string (e.g., "2 hours ago")
   * @param date - Date to compare
   * @returns Relative time string
   */
  relativeTime(date: Date | string | number): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return this.format(date);
  },
};

/**
 * Number formatting utilities
 */
export const numberUtils = {
  /**
   * Format number with commas
   * @param num - Number to format
   * @returns Formatted number string
   */
  format(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  },

  /**
   * Format as currency
   * @param amount - Amount to format
   * @param currency - Currency code (default: USD)
   * @returns Formatted currency string
   */
  currency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  /**
   * Format as percentage
   * @param value - Value to format (0-100 or 0-1)
   * @param decimals - Decimal places
   * @returns Formatted percentage string
   */
  percent(value: number, decimals = 1): string {
    const normalized = value > 1 ? value : value * 100;
    return `${normalized.toFixed(decimals)}%`;
  },

  /**
   * Abbreviate large numbers (e.g., 1.2K, 3.4M)
   * @param num - Number to abbreviate
   * @returns Abbreviated number string
   */
  abbreviate(num: number): string {
    const abbreviations = [
      { threshold: 1e12, suffix: 'T' },
      { threshold: 1e9, suffix: 'B' },
      { threshold: 1e6, suffix: 'M' },
      { threshold: 1e3, suffix: 'K' },
    ];

    for (const { threshold, suffix } of abbreviations) {
      if (Math.abs(num) >= threshold) {
        return `${(num / threshold).toFixed(1)}${suffix}`;
      }
    }

    return num.toString();
  },
};

/**
 * String manipulation utilities
 */
export const stringUtils = {
  /**
   * Capitalize first letter
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Convert to title case
   * @param str - String to convert
   * @returns Title case string
   */
  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[\s_-]+/)
      .map(word => this.capitalize(word))
      .join(' ');
  },

  /**
   * Truncate string with ellipsis
   * @param str - String to truncate
   * @param maxLength - Maximum length
   * @returns Truncated string
   */
  truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength)}...`;
  },

  /**
   * Generate initials from name
   * @param name - Full name
   * @param maxInitials - Maximum number of initials
   * @returns Initials string
   */
  initials(name: string, maxInitials = 2): string {
    return name
      .split(/\s+/)
      .map(word => word.charAt(0))
      .slice(0, maxInitials)
      .join('')
      .toUpperCase();
  },
};
