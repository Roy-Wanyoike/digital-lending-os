/**
 * useResponsive Hook
 * 
 * Comprehensive responsive hook combining all responsive utilities.
 */

'use client';

import { useMediaQuery } from './useMediaQuery';
import { useBreakpoint } from './useBreakpoint';
import { mediaQueries } from '../breakpoints';

interface UseResponsiveReturn {
  // Breakpoint info
  breakpoint: ReturnType<typeof useBreakpoint>['breakpoint'];
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  
  // Device categories
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Screen dimensions
  width: number | null;
  
  // Media query states
  isPortrait: boolean;
  isLandscape: boolean;
  canHover: boolean;
  isTouchDevice: boolean;
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
  prefersLightMode: boolean;
}

export function useResponsive(): UseResponsiveReturn {
  const bp = useBreakpoint();
  
  const isPortrait = useMediaQuery(mediaQueries.portrait);
  const isLandscape = useMediaQuery(mediaQueries.landscape);
  const canHover = useMediaQuery(mediaQueries.hover);
  const isTouchDevice = useMediaQuery(mediaQueries.touch);
  const prefersReducedMotion = useMediaQuery(mediaQueries.reduceMotion);
  const prefersDarkMode = useMediaQuery(mediaQueries.dark);
  const prefersLightMode = useMediaQuery(mediaQueries.light);

  return {
    // Breakpoint info
    breakpoint: bp.breakpoint,
    isXs: bp.isXs,
    isSm: bp.isSm,
    isMd: bp.isMd,
    isLg: bp.isLg,
    isXl: bp.isXl,
    is2xl: bp.is2xl,
    
    // Device categories
    isMobile: bp.isMobile,
    isTablet: bp.isTablet,
    isDesktop: bp.isDesktop,
    
    // Screen dimensions
    width: bp.width,
    
    // Media query states
    isPortrait,
    isLandscape,
    canHover,
    isTouchDevice,
    prefersReducedMotion,
    prefersDarkMode,
    prefersLightMode,
  };
}

export default useResponsive;
