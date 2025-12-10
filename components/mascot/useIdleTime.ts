// Custom hook for tracking idle time with proper interval-based updates
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeOptions {
  /** Interval in ms to update idle time (default: 10000 = 10s) */
  updateInterval?: number;
  /** Threshold in ms to consider as idle (default: 60000 = 1min) */
  idleThreshold?: number;
}

interface UseIdleTimeReturn {
  /** Current idle time in milliseconds */
  idleTime: number;
  /** Whether the user is considered idle */
  isIdle: boolean;
  /** Reset the idle timer (call when activity detected) */
  resetIdleTime: () => void;
}

/**
 * Custom hook for tracking idle time efficiently
 * Uses intervals instead of recalculating on every render
 */
export const useIdleTime = ({
  updateInterval = 10000,
  idleThreshold = 60000,
}: UseIdleTimeOptions = {}): UseIdleTimeReturn => {
  const [idleTime, setIdleTime] = useState(0);
  const lastActivityRef = useRef(Date.now());

  const resetIdleTime = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleTime(0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      setIdleTime(elapsed);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return {
    idleTime,
    isIdle: idleTime >= idleThreshold,
    resetIdleTime,
  };
};

export default useIdleTime;
