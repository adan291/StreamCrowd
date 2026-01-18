/**
 * useThrottle - Throttle hook for performance optimization
 * Limits execution to at most once per specified interval
 * Critical for scroll events, resize events, and real-time updates
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Throttle a value - limits updates to at most once per interval
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      // Update immediately if enough time has passed
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      // Schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}

/**
 * Throttle a callback function with advanced options
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number,
  options: ThrottleOptions = {}
): [T, () => void] {
  const { leading = true, trailing = true } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout>();
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
    timeoutRef.current = setTimeout(trailingEdge, interval);
    return leading ? invokeFunc() : resultRef.current;
  }, [leading, invokeFunc, interval]);

  const trailingEdge = useCallback(() => {
    timeoutRef.current = undefined;
    if (trailing && argsRef.current) {
      return invokeFunc();
    }
  }, [trailing, invokeFunc]);

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

    return (
      lastCallTimeRef.current === 0 ||
      timeSinceLastCall >= interval ||
      timeSinceLastCall < 0 ||
      timeSinceLastInvoke >= interval
    );
  }, [interval]);

  const throttledFunc = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastCallTimeRef.current = time;
    argsRef.current = args;

    if (isInvoking) {
      if (timeoutRef.current === undefined) {
        return leadingEdge();
      }
    }

    if (timeoutRef.current === undefined) {
      timeoutRef.current = setTimeout(trailingEdge, interval);
    }

    return resultRef.current;
  }, [shouldInvoke, leadingEdge, trailingEdge, interval]) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
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

  return [throttledFunc, cancel];
}

/**
 * Throttle scroll events for performance
 */
export function useScrollThrottle(
  callback: (event: Event) => void,
  interval: number = 16 // ~60fps
) {
  const [throttledCallback] = useThrottledCallback(callback, interval, {
    leading: true,
    trailing: true
  });

  useEffect(() => {
    window.addEventListener('scroll', throttledCallback, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
}

/**
 * Throttle resize events for performance
 */
export function useResizeThrottle(
  callback: (event: Event) => void,
  interval: number = 100
) {
  const [throttledCallback] = useThrottledCallback(callback, interval, {
    leading: true,
    trailing: true
  });

  useEffect(() => {
    window.addEventListener('resize', throttledCallback, { passive: true });
    return () => {
      window.removeEventListener('resize', throttledCallback);
    };
  }, [throttledCallback]);
}

/**
 * Throttle mouse move events for performance
 */
export function useMouseMoveThrottle(
  callback: (event: MouseEvent) => void,
  interval: number = 16 // ~60fps
) {
  const [throttledCallback] = useThrottledCallback(callback, interval, {
    leading: true,
    trailing: false // Don't need trailing for mouse moves
  });

  return throttledCallback;
}

/**
 * Throttle real-time data updates (chat messages, viewer count, etc.)
 */
export function useRealTimeThrottle<T>(
  data: T,
  interval: number = 100,
  options: { 
    maxUpdatesPerSecond?: number;
    priorityUpdates?: (prev: T, next: T) => boolean;
  } = {}
) {
  const { maxUpdatesPerSecond = 10, priorityUpdates } = options;
  const [throttledData, setThrottledData] = useState<T>(data);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<NodeJS.Timeout>();
  const updateCountRef = useRef<number>(0);
  const resetCounterRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const minInterval = 1000 / maxUpdatesPerSecond;

    // Check if this is a priority update
    const isPriority = priorityUpdates ? priorityUpdates(throttledData, data) : false;

    // Reset update counter every second
    if (!resetCounterRef.current) {
      resetCounterRef.current = setTimeout(() => {
        updateCountRef.current = 0;
        resetCounterRef.current = undefined;
      }, 1000);
    }

    if (
      isPriority || 
      (timeSinceLastUpdate >= minInterval && updateCountRef.current < maxUpdatesPerSecond)
    ) {
      // Update immediately
      setThrottledData(data);
      lastUpdateRef.current = now;
      updateCountRef.current++;
      
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = undefined;
      }
    } else if (!pendingUpdateRef.current) {
      // Schedule update for later
      const delay = Math.max(minInterval - timeSinceLastUpdate, interval);
      pendingUpdateRef.current = setTimeout(() => {
        if (updateCountRef.current < maxUpdatesPerSecond) {
          setThrottledData(data);
          lastUpdateRef.current = Date.now();
          updateCountRef.current++;
        }
        pendingUpdateRef.current = undefined;
      }, delay);
    }

    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
      if (resetCounterRef.current) {
        clearTimeout(resetCounterRef.current);
      }
    };
  }, [data, interval, maxUpdatesPerSecond, priorityUpdates, throttledData]);

  return throttledData;
}

/**
 * Specialized throttle for chat messages to prevent spam
 */
export function useChatMessageThrottle(
  messages: any[],
  maxMessagesPerSecond: number = 5
) {
  return useRealTimeThrottle(messages, 200, {
    maxUpdatesPerSecond: maxMessagesPerSecond,
    priorityUpdates: (prev, next) => {
      // Priority for first message or significant change in count
      return prev.length === 0 || Math.abs(next.length - prev.length) > 10;
    }
  });
}

/**
 * Specialized throttle for viewer count updates
 */
export function useViewerCountThrottle(
  viewerCount: number,
  interval: number = 5000 // Update every 5 seconds max
) {
  return useRealTimeThrottle(viewerCount, interval, {
    maxUpdatesPerSecond: 1,
    priorityUpdates: (prev, next) => {
      // Priority for significant changes (>10% or first viewers)
      const change = Math.abs(next - prev);
      return prev === 0 || change > Math.max(prev * 0.1, 5);
    }
  });
}

/**
 * Performance monitoring for throttled operations
 */
export function useThrottlePerformance() {
  const metricsRef = useRef({
    throttledCalls: 0,
    actualExecutions: 0,
    averageDelay: 0,
    maxDelay: 0
  });

  const recordThrottledCall = useCallback((delayed: boolean, delay?: number) => {
    metricsRef.current.throttledCalls++;
    if (!delayed) {
      metricsRef.current.actualExecutions++;
    }
    if (delay !== undefined) {
      metricsRef.current.averageDelay = 
        (metricsRef.current.averageDelay + delay) / 2;
      metricsRef.current.maxDelay = Math.max(metricsRef.current.maxDelay, delay);
    }
  }, []);

  const getMetrics = useCallback(() => {
    const metrics = metricsRef.current;
    return {
      ...metrics,
      throttleEfficiency: metrics.throttledCalls > 0 
        ? (metrics.throttledCalls - metrics.actualExecutions) / metrics.throttledCalls 
        : 0
    };
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      throttledCalls: 0,
      actualExecutions: 0,
      averageDelay: 0,
      maxDelay: 0
    };
  }, []);

  return { recordThrottledCall, getMetrics, resetMetrics };
}