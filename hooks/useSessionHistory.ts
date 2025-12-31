// useSessionHistory - Hook for managing session history

import { useState, useEffect, useCallback } from 'react';
import { SessionMetrics, SessionComparison } from '../types/metrics';
import { metricsService } from '../src/application/services/MetricsService';

interface UseSessionHistoryOptions {
  limit?: number;
  autoLoad?: boolean;
}

interface UseSessionHistoryReturn {
  sessions: SessionMetrics[];
  isLoading: boolean;
  error: string | null;
  selectedSessions: string[];
  comparison: SessionComparison | null;
  loadSessions: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  selectSession: (id: string) => void;
  deselectSession: (id: string) => void;
  clearSelection: () => void;
  compareSessions: () => Promise<void>;
  hasMore: boolean;
}

export function useSessionHistory(options: UseSessionHistoryOptions = {}): UseSessionHistoryReturn {
  const { limit = 20, autoLoad = true } = options;

  const [sessions, setSessions] = useState<SessionMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<SessionComparison | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await metricsService.getSessions({ limit, offset: 0 });
      setSessions(loaded);
      setOffset(loaded.length);
      setHasMore(loaded.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading sessions');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Load more sessions
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const loaded = await metricsService.getSessions({ limit, offset });
      setSessions(prev => [...prev, ...loaded]);
      setOffset(prev => prev + loaded.length);
      setHasMore(loaded.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading more sessions');
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, isLoading, hasMore]);

  // Delete a session
  const deleteSession = useCallback(async (id: string) => {
    try {
      await metricsService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      setSelectedSessions(prev => prev.filter(sid => sid !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting session');
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: string) => {
    try {
      await metricsService.toggleFavorite(id);
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error toggling favorite');
    }
  }, []);

  // Select a session for comparison
  const selectSession = useCallback((id: string) => {
    setSelectedSessions(prev => {
      if (prev.includes(id)) return prev;
      if (prev.length >= 3) return prev; // Max 3 sessions
      return [...prev, id];
    });
  }, []);

  // Deselect a session
  const deselectSession = useCallback((id: string) => {
    setSelectedSessions(prev => prev.filter(sid => sid !== id));
    setComparison(null);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSessions([]);
    setComparison(null);
  }, []);

  // Compare selected sessions
  const compareSessions = useCallback(async () => {
    if (selectedSessions.length < 2) {
      setError('Select at least 2 sessions to compare');
      return;
    }

    try {
      const result = await metricsService.compareSessions(selectedSessions);
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error comparing sessions');
    }
  }, [selectedSessions]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadSessions();
    }
  }, [autoLoad, loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    selectedSessions,
    comparison,
    loadSessions,
    loadMore,
    deleteSession,
    toggleFavorite,
    selectSession,
    deselectSession,
    clearSelection,
    compareSessions,
    hasMore,
  };
}
