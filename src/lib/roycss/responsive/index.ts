/**
 * ROYCSS Responsive System
 * 
 * Main entry point for all responsive utilities, hooks, and components.
 */

export { breakpoints, mediaQueries, type Breakpoint } from './breakpoints';
export { 
  getCurrentBreakpoint,
  isBreakpointUp,
  isBreakpointDown,
  containerWidths,
  gridConfigs 
} from './breakpoints';

export { useMediaQuery } from './hooks/useMediaQuery';
export { useBreakpoint } from './hooks/useBreakpoint';
export { useResponsive } from './hooks/useResponsive';

export { 
  ResponsiveGrid, 
  AutoGrid, 
  FeatureGrid, 
  CardGrid 
} from './components/ResponsiveGrid';
export { 
  ShowFor, 
  MobileOnly, 
  TabletOnly, 
  DesktopOnly,
  HideOnMobile as ShowForDesktop,
  HideOnDesktop as ShowForMobile 
} from './components/ShowFor';
export { 
  HideFor, 
  HideOnMobile, 
  HideOnTablet, 
  HideOnDesktop 
} from './components/HideFor';

export {
  mq,
  mqMax,
  hideAt,
  showFrom,
  responsiveValue,
  fluidSize,
  fluidSizes,
  containerPadding,
} from './utilities';
