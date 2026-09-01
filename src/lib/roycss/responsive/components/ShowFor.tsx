'use client';

/**
 * ShowFor Component
 * 
 * Conditionally renders children only at specified breakpoints.
 */

import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { Breakpoint } from '../breakpoints';

interface ShowForProps {
  children: React.ReactNode;
  /** Show at and above this breakpoint */
  breakpoint?: Breakpoint | Breakpoint[];
  /** Show only on mobile devices (xs, sm) */
  mobile?: boolean;
  /** Show only on tablet devices (md) */
  tablet?: boolean;
  /** Show only on desktop devices (lg, xl, 2xl) */
  desktop?: boolean;
  /** Show when hover is available */
  hover?: boolean;
  /** Show on touch devices */
  touch?: boolean;
}

export function ShowFor({
  children,
  breakpoint,
  mobile = false,
  tablet = false,
  desktop = false,
  hover: showOnHover = false,
  touch: showOnTouch = false,
}: ShowForProps) {
  const bp = useBreakpoint();

  // Check breakpoint condition
  if (breakpoint) {
    const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
    const shouldShow = breakpoints.some(b => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIdx = order.indexOf(bp.breakpoint);
      const targetIdx = order.indexOf(b);
      return currentIdx >= targetIdx;
    });
    
    if (!shouldShow) return null;
  }

  // Check device conditions
  if (mobile && !bp.isMobile) return null;
  if (tablet && !bp.isTablet) return null;
  if (desktop && !bp.isDesktop) return null;

  // For hover/touch, we'd need additional hooks
  // These are simplified checks based on screen size
  if (showOnHover && bp.isMobile) return null;
  if (showOnTouch && bp.isDesktop) return null;

  return <>{children}</>;
}

// Convenience components
export function MobileOnly({ children }: { children: React.ReactNode }) {
  return <ShowFor mobile>{children}</ShowFor>;
}

export function TabletOnly({ children }: { children: React.ReactNode }) {
  return <ShowFor tablet>{children}</ShowFor>;
}

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <ShowFor desktop>{children}</ShowFor>;
}

export function HideOnMobile({ children }: { children: React.ReactNode }) {
  return <ShowFor breakpoint={['md', 'lg', 'xl', '2xl']}>{children}</ShowFor>;
}

export function HideOnDesktop({ children }: { children: React.ReactNode }) {
  return <ShowFor breakpoint={['xs', 'sm']}>{children}</ShowFor>;
}

export default ShowFor;
