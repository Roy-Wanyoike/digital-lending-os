/**
 * useBreakpoint Hook
 * 
 * React hook for getting and tracking the current breakpoint.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { breakpoints, type Breakpoint, getCurrentBreakpoint } from '../breakpoints';

interface UseBreakpointReturn {
  breakpoint: Breakpoint;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number | null;
}

export function useBreakpoint(): UseBreakpointReturn {
  const [width, setWidth] = useState<number | null>(null);
  
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window !== 'undefined') {
      return getCurrentBreakpoint(window.innerWidth);
    }
    return 'xs';
  });

  useEffect(() => {
    // Set initial values
    setWidth(window.innerWidth);
    setBreakpoint(getCurrentBreakpoint(window.innerWidth));

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);
      setBreakpoint(getCurrentBreakpoint(newWidth));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm' || breakpoint === 'xs',
    isMd: ['xs', 'sm', 'md'].includes(breakpoint),
    isLg: ['xs', 'sm', 'md', 'lg'].includes(breakpoint),
    isXl: ['xs', 'sm', 'md', 'lg', 'xl'].includes(breakpoint),
    is2xl: breakpoint === '2xl',
    isMobile: ['xs', 'sm'].includes(breakpoint),
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    width,
  };
}

export default useBreakpoint;
