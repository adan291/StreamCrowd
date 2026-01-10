/**
 * useActivityHistory Hook - Generic History Management
 * Reusable history tracking for all activities (polls, predictions, games, giveaways)
 * Provides filtering, search, and export functionality
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type ActivityType = 'poll' | 'prediction' | 'game' | 'giveaway';
export type DateRangeType = 'today' | 'week' | 'month' | 'all' | 'custom';

export interface BaseHistoryItem {
  id: string;
  name: string;
  type: ActivityType;
  result: string;
  participantCount: number;
  createdAt: number;
  finishedAt: number;
  metadata?: Record<string, unknown>;
}

export interface HistoryFilters {
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  searchTerm?: string;
  searchField?: string;
}

export interface UseActivityHistoryOptions<T extends BaseHistoryItem> {
  storageKey: string;
  maxItems?: number;
  defaultFilters?: Partial<HistoryFilters>;
}

export interface UseActivityHistoryReturn<T extends BaseHistoryItem> {
  items: T[];
  filteredItems: T[];
  filters: HistoryFilters;
  setFilters: (filters: Partial<HistoryFilters>) => void;
  addItem: (item: T) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
  filterByDate: (items: T[], range: DateRangeType, customStart?: string, customEnd?: string) => T[];
  filterBySearch: <K extends keyof T>(items: T[], term: string, field: K) => T[];
  exportCSV: (items?: T[], fields?: (keyof T)[]) => string;
  exportJSON: (items?: T[]) => string;
  importJSON: (json: string) => boolean;
  getStatistics: () => HistoryStatistics;
}

export interface HistoryStatistics {
  total: number;
  averageParticipants: number;
  topResults: { result: string; count: number }[];
  byType: Record<ActivityType, number>;
  byDateRange: { date: string; count: number }[];
}

// ============================================
// CONSTANTS
// ============================================

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_FILTERS: HistoryFilters = {
  dateRange: 'all',
  searchTerm: '',
  searchField: 'result',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Filter items by date range
 */
export function filterByDateRange<T extends BaseHistoryItem>(
  items: T[],
  range: DateRangeType,
  customStart?: string,
  customEnd?: string
): T[] {
  const now = Date.now();
  
  switch (range) {
    case 'today': {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      return items.filter(item => item.finishedAt >= startOfDay);
    }
    case 'week': {
      const weekAgo = now - 7 * DAY_MS;
      return items.filter(item => item.finishedAt >= weekAgo);
    }
    case 'month': {
      const monthAgo = now - 30 * DAY_MS;
      return items.filter(item => item.finishedAt >= monthAgo);
    }
    case 'custom': {
      if (!customStart) return items;
      const start = new Date(customStart).getTime();
      const end = customEnd 
        ? new Date(customEnd).getTime() + DAY_MS 
        : now;
      return items.filter(item => item.finishedAt >= start && item.finishedAt <= end);
    }
    case 'all':
    default:
      return items;
  }
}

/**
 * Filter items by search term (case-insensitive)
 */
export function filterBySearchTerm<T extends BaseHistoryItem, K extends keyof T>(
  items: T[],
  term: string,
  field: K
): T[] {
  if (!term || term.trim() === '') return items;
  
  const searchLower = term.toLowerCase().trim();
  return items.filter(item => {
    const value = item[field];
    if (typeof value === 'string') {
      return value.toLowerCase().includes(searchLower);
    }
    if (typeof value === 'number') {
      return value.toString().includes(searchLower);
    }
    return false;
  });
}

/**
 * Calculate statistics from history items
 */
export function calculateStatistics<T extends BaseHistoryItem>(items: T[]): HistoryStatistics {
  if (items.length === 0) {
    return {
      total: 0,
      averageParticipants: 0,
      topResults: [],
      byType: { poll: 0, prediction: 0, game: 0, giveaway: 0 },
      byDateRange: [],
    };
  }

  // Count by result
  const resultCounts: Record<string, number> = {};
  items.forEach(item => {
    resultCounts[item.result] = (resultCounts[item.result] || 0) + 1;
  });

  // Top results
  const topResults = Object.entries(resultCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([result, count]) => ({ result, count }));

  // Count by type
  const byType: Record<ActivityType, number> = { poll: 0, prediction: 0, game: 0, giveaway: 0 };
  items.forEach(item => {
    byType[item.type] = (byType[item.type] || 0) + 1;
  });

  // Count by date (last 7 days)
  const dateCounts: Record<string, number> = {};
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS);
    const dateStr = date.toISOString().split('T')[0];
    dateCounts[dateStr] = 0;
  }
  items.forEach(item => {
    const dateStr = new Date(item.finishedAt).toISOString().split('T')[0];
    if (dateCounts[dateStr] !== undefined) {
      dateCounts[dateStr]++;
    }
  });
  const byDateRange = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));

  // Average participants
  const totalParticipants = items.reduce((sum, item) => sum + item.participantCount, 0);
  const averageParticipants = Math.round(totalParticipants / items.length);

  return {
    total: items.length,
    averageParticipants,
    topResults,
    byType,
    byDateRange,
  };
}

/**
 * Export items to CSV format
 */
export function exportToCSV<T extends BaseHistoryItem>(
  items: T[],
  fields?: (keyof T)[]
): string {
  if (items.length === 0) return '';

  const defaultFields: (keyof BaseHistoryItem)[] = [
    'id', 'name', 'type', 'result', 'participantCount', 'createdAt', 'finishedAt'
  ];
  const exportFields = fields || defaultFields;

  // Header
  const headers = exportFields.map(f => String(f));
  
  // Rows
  const rows = items.map(item => {
    return exportFields.map(field => {
      const value = item[field as keyof T];
      if (field === 'createdAt' || field === 'finishedAt') {
        return new Date(value as number).toISOString();
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value ?? '');
    });
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export items to JSON format
 */
export function exportToJSON<T extends BaseHistoryItem>(items: T[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  }, null, 2);
}

/**
 * Import items from JSON
 */
export function importFromJSON<T extends BaseHistoryItem>(json: string): T[] | null {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      return data as T[];
    }
    if (data.items && Array.isArray(data.items)) {
      return data.items as T[];
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useActivityHistory<T extends BaseHistoryItem>(
  options: UseActivityHistoryOptions<T>
): UseActivityHistoryReturn<T> {
  const { storageKey, maxItems = 1000, defaultFilters = {} } = options;

  // Load initial items from localStorage
  const [items, setItems] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });

  // Filters state
  const [filters, setFiltersState] = useState<HistoryFilters>({
    ...DEFAULT_FILTERS,
    ...defaultFilters,
  });

  // Persist items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      // Handle quota exceeded
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[useActivityHistory] localStorage quota exceeded');
      }
    }
  }, [items, storageKey]);

  // Filtered items (memoized)
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Apply date filter
    result = filterByDateRange(
      result, 
      filters.dateRange, 
      filters.customStartDate, 
      filters.customEndDate
    );
    
    // Apply search filter
    if (filters.searchTerm && filters.searchField) {
      result = filterBySearchTerm(result, filters.searchTerm, filters.searchField as keyof T);
    }
    
    // Sort by finishedAt descending (most recent first)
    result.sort((a, b) => b.finishedAt - a.finishedAt);
    
    return result;
  }, [items, filters]);

  // Add item
  const addItem = useCallback((item: T) => {
    setItems(prev => {
      const newItems = [item, ...prev];
      // Limit to maxItems
      if (newItems.length > maxItems) {
        return newItems.slice(0, maxItems);
      }
      return newItems;
    });
  }, [maxItems]);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setItems([]);
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<HistoryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Filter by date (standalone function)
  const filterByDate = useCallback((
    itemsToFilter: T[],
    range: DateRangeType,
    customStart?: string,
    customEnd?: string
  ) => {
    return filterByDateRange(itemsToFilter, range, customStart, customEnd);
  }, []);

  // Filter by search (standalone function)
  const filterBySearch = useCallback(<K extends keyof T>(
    itemsToFilter: T[],
    term: string,
    field: K
  ) => {
    return filterBySearchTerm(itemsToFilter, term, field);
  }, []);

  // Export CSV
  const exportCSV = useCallback((itemsToExport?: T[], fields?: (keyof T)[]) => {
    return exportToCSV(itemsToExport || filteredItems, fields);
  }, [filteredItems]);

  // Export JSON
  const exportJSON = useCallback((itemsToExport?: T[]) => {
    return exportToJSON(itemsToExport || filteredItems);
  }, [filteredItems]);

  // Import JSON
  const importJSON = useCallback((json: string): boolean => {
    const imported = importFromJSON<T>(json);
    if (imported) {
      setItems(prev => {
        // Merge, avoiding duplicates by id
        const existingIds = new Set(prev.map(i => i.id));
        const newItems = imported.filter(i => !existingIds.has(i.id));
        return [...newItems, ...prev].slice(0, maxItems);
      });
      return true;
    }
    return false;
  }, [maxItems]);

  // Get statistics
  const getStatistics = useCallback(() => {
    return calculateStatistics(filteredItems);
  }, [filteredItems]);

  return {
    items,
    filteredItems,
    filters,
    setFilters,
    addItem,
    removeItem,
    clearHistory,
    filterByDate,
    filterBySearch,
    exportCSV,
    exportJSON,
    importJSON,
    getStatistics,
  };
}

export default useActivityHistory;
