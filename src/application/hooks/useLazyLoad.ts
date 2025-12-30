/**
 * useLazyLoad Hook
 * 
 * Lazy loading utilities for components and data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LazyLoadOptions {
  /** Delay before loading (ms) */
  delay?: number;
  /** Whether to load immediately */
  immediate?: boolean;
}

export interface LazyLoadResult<T> {
  /** The loaded data */
  data: T | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether data has been loaded */
  isLoaded: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Trigger loading manually */
  load: () => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for lazy loading data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, load } = useLazyLoad(
 *   () => fetchTemplates(),
 *   { immediate: false }
 * );
 * 
 * // Load when tab is selected
 * useEffect(() => {
 *   if (activeTab === 'templates') {
 *     load();
 *   }
 * }, [activeTab, load]);
 * ```
 */
export function useLazyLoad<T>(
  loader: () => T | Promise<T>,
  options: LazyLoadOptions = {}
): LazyLoadResult<T> {
  const { delay = 0, immediate = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current || isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await loader();
      setData(result);
      setIsLoaded(true);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, [loader, delay, isLoading]);

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    setIsLoaded(false);
    setError(null);
    loadedRef.current = false;
  }, []);

  useEffect(() => {
    if (immediate) {
      load();
    }
  }, [immediate, load]);

  return { data, isLoading, isLoaded, error, load, reset };
}

/**
 * Hook for caching expensive computations
 */
export function useCachedValue<T>(
  key: string,
  compute: () => T,
  ttl: number = 60000 // 1 minute default
): T {
  const cacheRef = useRef<Map<string, { value: T; timestamp: number }>>(new Map());
  
  const cached = cacheRef.current.get(key);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < ttl) {
    return cached.value;
  }
  
  const value = compute();
  cacheRef.current.set(key, { value, timestamp: now });
  
  return value;
}

export default useLazyLoad;
