/**
 * useMediaQuery Hook
 * 
 * React hook for listening to media query changes.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseMediaQueryOptions {
  defaultValue?: boolean;
  initializeWithValue?: boolean;
}

export function useMediaQuery(
  query: string,
  options: UseMediaQueryOptions = {}
): boolean {
  const { defaultValue = false, initializeWithValue = true } = options;

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      if (typeof window !== 'undefined') {
        return window.matchMedia(query).matches;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    let mounted = true;
    const mql = window.matchMedia(query);

    const onChange = (event: MediaQueryListEvent) => {
      if (!mounted) return;
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mql.matches);

    // Listen for changes
    mql.addEventListener('change', onChange);

    return () => {
      mounted = false;
      mql.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
