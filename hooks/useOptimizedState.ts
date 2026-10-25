import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * useOptimizedState - Hooks for optimizing state updates and reducing re-renders
 * @requirements Task 8.2 - Auditar y reducir re-renders
 */

/**
 * useDebounce - Debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle - Throttle a value
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useThrottledCallback - Throttle a callback function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number
): T {
  const lastCalledRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCalledRef.current;

      if (timeSinceLastCall >= interval) {
        lastCalledRef.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCalledRef.current = Date.now();
          callbackRef.current(...args);
          timeoutRef.current = undefined;
        }, interval - timeSinceLastCall);
      }
    },
    [interval]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * usePrevious - Get the previous value of a state
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useStableCallback - Create a stable callback that doesn't change reference
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * useBatchedUpdates - Batch multiple state updates
 */
export function useBatchedUpdates<T>(
  initialValue: T,
  batchInterval: number = 100
): [T, (updater: (prev: T) => T) => void, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const pendingUpdatesRef = useRef<Array<(prev: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const queueUpdate = useCallback(
    (updater: (prev: T) => T) => {
      pendingUpdatesRef.current.push(updater);

      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          setValue((prev) => {
            let result = prev;
            for (const update of pendingUpdatesRef.current) {
              result = update(result);
            }
            pendingUpdatesRef.current = [];
            return result;
          });
          timeoutRef.current = undefined;
        }, batchInterval);
      }
    },
    [batchInterval]
  );

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (pendingUpdatesRef.current.length > 0) {
      setValue((prev) => {
        let result = prev;
        for (const update of pendingUpdatesRef.current) {
          result = update(result);
        }
        pendingUpdatesRef.current = [];
        return result;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, queueUpdate, flush];
}

/**
 * useDeepMemo - Memoize with deep comparison
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T } | undefined>(undefined);

  const depsChanged = !ref.current || !deepEqual(ref.current.deps, deps);

  if (depsChanged) {
    ref.current = { deps, value: factory() };
  }

  return ref.current!.value;
}

// Simple deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * useRenderCount - Debug hook to count renders
 */
export function useRenderCount(componentName?: string): number {
  const countRef = useRef(0);
  countRef.current++;

  if (process.env.NODE_ENV === 'development' && componentName) {
    console.log(`[${componentName}] Render count: ${countRef.current}`);
  }

  return countRef.current;
}

export default {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
  usePrevious,
  useStableCallback,
  useBatchedUpdates,
  useDeepMemo,
  useRenderCount,
};
