/**
 * useThrottledCallback Hook
 * 
 * Creates a throttled version of a callback function.
 * The callback will be invoked at most once per specified interval.
 * 
 * @example
 * const handleScroll = useThrottledCallback((position: number) => {
 *   updateScrollIndicator(position);
 * }, 100);
 * 
 * // In a scroll handler:
 * window.addEventListener('scroll', () => handleScroll(window.scrollY));
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Creates a throttled callback function
 * @param callback - The function to throttle
 * @param interval - The minimum interval between calls in milliseconds (default: 100ms)
 * @param options - Configuration options
 * @returns A throttled version of the callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 100,
  options: {
    leading?: boolean;  // Call on leading edge (default: true)
    trailing?: boolean; // Call on trailing edge (default: true)
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  
  const lastCalledRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

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
      const now = Date.now();
      const timeSinceLastCall = now - lastCalledRef.current;

      // Store args for potential trailing call
      pendingArgsRef.current = args;

      // Clear any existing trailing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (timeSinceLastCall >= interval) {
        // Enough time has passed, call immediately if leading is enabled
        if (leading) {
          lastCalledRef.current = now;
          callbackRef.current(...args);
          pendingArgsRef.current = null;
        }
      }

      // Schedule trailing call if enabled
      if (trailing) {
        const remainingTime = interval - timeSinceLastCall;
        const delay = remainingTime > 0 ? remainingTime : interval;

        timeoutRef.current = setTimeout(() => {
          if (pendingArgsRef.current) {
            lastCalledRef.current = Date.now();
            callbackRef.current(...pendingArgsRef.current);
            pendingArgsRef.current = null;
          }
          timeoutRef.current = null;
        }, delay);
      }
    },
    [interval, leading, trailing]
  );
}

/**
 * Creates a throttled callback with cancel capability
 */
export function useThrottledCallbackWithCancel<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 100
): {
  throttledCallback: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  const lastCalledRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

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
  }, []);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCalledRef.current;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (timeSinceLastCall >= interval) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
      } else {
        const remainingTime = interval - timeSinceLastCall;
        timeoutRef.current = setTimeout(() => {
          lastCalledRef.current = Date.now();
          callbackRef.current(...args);
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [interval]
  );

  return { throttledCallback, cancel };
}

export default useThrottledCallback;
