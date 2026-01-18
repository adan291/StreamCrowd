/**
 * useDebounce - Debounce hook for performance optimization
 * Delays execution until after specified delay has passed since last call
 * Critical for chat input, search, and real-time updates
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Debounce a value - delays updating until after delay has passed
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function with advanced options
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebounceOptions = {}
): [T, () => void] {
  const { leading = false, trailing = true, maxWait } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T>>();
  const resultRef = useRef<ReturnType<T>>();

  const invokeFunc = useCallback(() => {
    const args = argsRef.current;
    if (args) {
      lastInvokeTimeRef.current = Date.now();
      resultRef.current = callback(...args);
      return resultRef.current;
    }
  }, [callback]);

  const leadingEdge = useCallback(() => {
    lastInvokeTimeRef.current = Date.now();
    if (leading) {
      return invokeFunc();
    }
  }, [leading, invokeFunc]);

  const trailingEdge = useCallback(() => {
    timeoutRef.current = undefined;
    if (trailing && argsRef.current) {
      return invokeFunc();
    }
  }, [trailing, invokeFunc]);

  const timerExpired = useCallback(() => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge();
    }
    // Restart the timer
    timeoutRef.current = setTimeout(timerExpired, remainingWait(time));
  }, [trailingEdge]);

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

    return (
      lastCallTimeRef.current === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const remainingWait = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }, [delay, maxWait]);

  const debouncedFunc = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastCallTimeRef.current = time;
    argsRef.current = args;

    if (isInvoking) {
      if (timeoutRef.current === undefined) {
        return leadingEdge();
      }
      if (maxWait !== undefined) {
        // Handle maxWait
        timeoutRef.current = setTimeout(timerExpired, delay);
        return leading ? invokeFunc() : resultRef.current;
      }
    }

    if (timeoutRef.current === undefined) {
      timeoutRef.current = setTimeout(timerExpired, delay);
    }

    return resultRef.current;
  }, [shouldInvoke, leadingEdge, timerExpired, leading, invokeFunc, delay, maxWait]) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current !== undefined) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    lastCallTimeRef.current = 0;
    lastInvokeTimeRef.current = 0;
    argsRef.current = undefined;
    resultRef.current = undefined;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return [debouncedFunc, cancel];
}

/**
 * Debounce state updates for form inputs and search
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(immediateValue, delay);

  return [immediateValue, debouncedValue, setImmediateValue];
}

/**
 * Debounce async operations like API calls
 */
export function useDebouncedAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  delay: number,
  options: DebounceOptions = {}
): [T, () => void, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  
  const [debouncedFn, cancel] = useDebouncedCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    delay,
    options
  );

  const cancelWithLoading = useCallback(() => {
    cancel();
    setIsLoading(false);
  }, [cancel]);

  return [debouncedFn as T, cancelWithLoading, isLoading];
}

/**
 * Specialized debounce for chat messages to reduce spam
 */
export function useChatDebounce(delay: number = 300) {
  return useDebouncedCallback(
    (message: string, callback: (message: string) => void) => {
      // Only process non-empty messages
      if (message.trim()) {
        callback(message.trim());
      }
    },
    delay,
    { leading: false, trailing: true }
  );
}

/**
 * Specialized debounce for search with minimum length
 */
export function useSearchDebounce(
  delay: number = 300,
  minLength: number = 2
) {
  return useDebouncedCallback(
    (query: string, callback: (query: string) => void) => {
      if (query.length >= minLength) {
        callback(query);
      } else if (query.length === 0) {
        // Clear results when query is empty
        callback('');
      }
    },
    delay,
    { leading: false, trailing: true }
  );
}