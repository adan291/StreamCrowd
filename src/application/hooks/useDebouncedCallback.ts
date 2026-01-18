/**
 * useDebouncedCallback Hook
 * 
 * Creates a debounced version of a callback function.
 * The callback will only be invoked after the specified delay
 * has passed since the last call.
 * 
 * @example
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   searchAPI(query);
 * }, 300);
 * 
 * // In an input onChange:
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Creates a debounced callback function
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );
}

/**
 * Creates a debounced callback with cancel and flush capabilities
 */
export function useDebouncedCallbackWithControls<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): {
  debouncedCallback: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && pendingArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
    }
  }, []);

  const isPending = useCallback(() => {
    return timeoutRef.current !== null;
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      pendingArgsRef.current = args;
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
        pendingArgsRef.current = null;
      }, delay);
    },
    [delay]
  );

  return { debouncedCallback, cancel, flush, isPending };
}

export default useDebouncedCallback;
