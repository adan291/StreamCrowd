// Hook para historial de acciones
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ActionLogEntry, ActionLogFilter, ActionCategory } from '../types/collaboration';
import { getActionLogService } from '../src/collaboration/services/ActionLogService';

export interface UseActionLogOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  defaultLimit?: number;
}

export interface UseActionLogReturn {
  // State
  entries: ActionLogEntry[];
  isLoading: boolean;
  
  // Queries
  getEntries: (filter?: ActionLogFilter) => ActionLogEntry[];
  getEntriesByUser: (userId: string) => ActionLogEntry[];
  getEntriesByCategory: (category: ActionCategory) => ActionLogEntry[];
  
  // Actions
  refresh: () => void;
  clearLog: () => void;
  exportToCSV: (filter?: ActionLogFilter) => string;
  exportToJSON: (filter?: ActionLogFilter) => string;
  
  // Computed
  entryCount: number;
  countByCategory: Record<ActionCategory, number>;
  recentUsers: Array<{ userId: string; userName: string; count: number }>;
}

export function useActionLog(options: UseActionLogOptions = {}): UseActionLogReturn {
  const { defaultLimit = 100 } = options;
  
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with action log service
  useEffect(() => {
    const service = getActionLogService();

    // Subscribe to updates
    const unsubscribe = service.subscribe((newEntries) => {
      setEntries(newEntries.slice(-defaultLimit));
    });

    // Initial load
    setEntries(service.getRecentActions(defaultLimit));

    return () => {
      unsubscribe();
    };
  }, [defaultLimit]);

  // Get entries with filter
  const getEntries = useCallback((filter?: ActionLogFilter): ActionLogEntry[] => {
    const service = getActionLogService();
    return service.getActions(filter);
  }, []);

  // Get entries by user
  const getEntriesByUser = useCallback((userId: string): ActionLogEntry[] => {
    const service = getActionLogService();
    return service.getActionsByUser(userId);
  }, []);

  // Get entries by category
  const getEntriesByCategory = useCallback((category: ActionCategory): ActionLogEntry[] => {
    const service = getActionLogService();
    return service.getActionsByCategory(category);
  }, []);

  // Refresh entries
  const refresh = useCallback(() => {
    setIsLoading(true);
    const service = getActionLogService();
    setEntries(service.getRecentActions(defaultLimit));
    setIsLoading(false);
  }, [defaultLimit]);

  // Clear log
  const clearLog = useCallback(() => {
    const service = getActionLogService();
    service.clearLog();
  }, []);

  // Export to CSV
  const exportToCSV = useCallback((filter?: ActionLogFilter): string => {
    const service = getActionLogService();
    return service.exportToCSV(filter);
  }, []);

  // Export to JSON
  const exportToJSON = useCallback((filter?: ActionLogFilter): string => {
    const service = getActionLogService();
    return service.exportToJSON(filter);
  }, []);

  // Count by category
  const countByCategory = useMemo(() => {
    const service = getActionLogService();
    return service.getActionCountByCategory();
  }, [entries]);

  // Recent users
  const recentUsers = useMemo(() => {
    const userCounts = new Map<string, { userName: string; count: number }>();
    
    entries.forEach(entry => {
      const existing = userCounts.get(entry.userId);
      if (existing) {
        existing.count++;
      } else {
        userCounts.set(entry.userId, { userName: entry.userName, count: 1 });
      }
    });

    return Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [entries]);

  return {
    entries,
    isLoading,
    getEntries,
    getEntriesByUser,
    getEntriesByCategory,
    refresh,
    clearLog,
    exportToCSV,
    exportToJSON,
    entryCount: entries.length,
    countByCategory,
    recentUsers
  };
}
