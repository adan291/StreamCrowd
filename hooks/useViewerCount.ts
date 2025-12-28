import { useState, useEffect, useCallback, useRef } from 'react';
import { getTwitchService } from '../src/application/services/TwitchService';

interface UseViewerCountOptions {
  /** Update interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether to fetch viewer count (default: true when connected) */
  enabled?: boolean;
}

interface UseViewerCountReturn {
  /** Current viewer count (null if unavailable) */
  viewerCount: number | null;
  /** Whether currently fetching */
  isLoading: boolean;
  /** Last error message (if any) */
  error: string | null;
  /** Manually refresh the viewer count */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and track real-time viewer count from Twitch
 * Updates periodically while enabled
 */
export function useViewerCount(options: UseViewerCountOptions = {}): UseViewerCountReturn {
  const { interval = 30000, enabled = true } = options;
  
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchViewerCount = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const twitchService = getTwitchService();
      const count = await twitchService.getViewerCount();
      setViewerCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch viewer count');
      setViewerCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    if (!enabled) {
      setViewerCount(null);
      return;
    }

    // Fetch immediately
    fetchViewerCount();

    // Set up interval
    intervalRef.current = setInterval(fetchViewerCount, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, fetchViewerCount]);

  return {
    viewerCount,
    isLoading,
    error,
    refresh: fetchViewerCount,
  };
}

export default useViewerCount;
