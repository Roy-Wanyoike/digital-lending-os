'use client';

/**
 * ResponsiveGrid Component
 * 
 * A responsive grid component that adapts to different breakpoints.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Number of columns at each breakpoint */
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether items should have equal height */
  equalHeight?: boolean;
}

const gapSizes = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  equalHeight = false,
  className,
  ...props
}: ResponsiveGridProps) {
  const gridClasses = [
    'grid',
    cols.xs ? `grid-cols-${cols.xs}` : 'grid-cols-1',
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
    gapSizes[gap],
    equalHeight && 'items-stretch',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn(gridClasses)} {...props}>
      {children}
    </div>
  );
}

// Preset grid configurations
export function AutoGrid({ 
  children, 
  className, 
  ...props 
}: Omit<ResponsiveGridProps, 'cols'>) {
  return (
    <ResponsiveGrid
      cols={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 4, '2xl': 4 }}
      className={className}
      {...props}
    >
      {children}
    </ResponsiveGrid>
  );
}

export function FeatureGrid({ 
  children, 
  className, 
  ...props 
}: Omit<ResponsiveGridProps, 'cols'>) {
  return (
    <ResponsiveGrid
      cols={{ xs: 1, sm: 2, md: 2, lg: 3, '2xl': 3 }}
      gap="lg"
      className={className}
      {...props}
    >
      {children}
    </ResponsiveGrid>
  );
}

export function CardGrid({ 
  children, 
  className, 
  ...props 
}: Omit<ResponsiveGridProps, 'cols'>) {
  return (
    <ResponsiveGrid
      cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
      gap="lg"
      className={className}
      {...props}
    >
      {children}
    </ResponsiveGrid>
  );
}

export default ResponsiveGrid;
