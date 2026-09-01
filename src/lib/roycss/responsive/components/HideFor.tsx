'use client';

/**
 * HideFor Component
 * 
 * Conditionally hides children at specified breakpoints.
 */

import React from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { Breakpoint } from '../breakpoints';

interface HideForProps {
  children: React.ReactNode;
  /** Hide at and above this breakpoint */
  breakpoint?: Breakpoint | Breakpoint[];
  /** Hide on mobile devices */
  mobile?: boolean;
  /** Hide on tablet devices */
  tablet?: boolean;
  /** Hide on desktop devices */
  desktop?: boolean;
}

export function HideFor({
  children,
  breakpoint,
  mobile = false,
  tablet = false,
  desktop = false,
}: HideForProps) {
  const bp = useBreakpoint();

  // Check if we should hide based on breakpoint
  if (breakpoint) {
    const breakpoints = Array.isArray(breakpoint) ? breakpoint : [breakpoint];
    const shouldHide = breakpoints.some(b => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIdx = order.indexOf(bp.breakpoint);
      const targetIdx = order.indexOf(b);
      return currentIdx >= targetIdx;
    });
    
    if (shouldHide) return null;
  }

  // Check device conditions
  if (mobile && bp.isMobile) return null;
  if (tablet && bp.isTablet) return null;
  if (desktop && bp.isDesktop) return null;

  return <>{children}</>;
}

// Convenience components
export function HideOnMobile({ children }: { children: React.ReactNode }) {
  return <HideFor mobile>{children}</HideOn>;
}

export function HideOnTablet({ children }: { children: React.ReactNode }) {
  return <HideFor tablet>{children}</HideOn>;
}

export function HideOnDesktop({ children }: { children: React.ReactNode }) {
  return <HideFor desktop>{children}</HideOn>;
}

export default HideFor;
