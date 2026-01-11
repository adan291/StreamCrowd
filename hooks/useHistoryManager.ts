/**
 * useHistoryManager - Unified History Management Hook
 * 
 * Provides centralized history management for all user activities:
 * polls, predictions, giveaways, commands, and timers.
 * 
 * Features:
 * - Add, get, delete history items
 * - Filter by type and date range
 * - Automatic limit enforcement (100 items per category)
 * - Export/import to JSON
 * - Persistent storage via localStorage
 * 
 * @requirements 1.2, 1.3, 1.4, 1.6, 1.7, 1.8
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  HistoryItem,
  HistoryFilter,
  HistoryStorage,
  HistoryExport,
  HistoryItemType,
  HistoryCategoryKey,
  AddHistoryItemInput,
  HISTORY_STORAGE_KEY,
  HISTORY_MAX_ITEMS_PER_CATEGORY,
  DEFAULT_HISTORY_STORAGE,
  TYPE_TO_CATEGORY,
} from '../types/history';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique ID for history items
 */
function generateHistoryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load history from localStorage
 */
function loadHistoryFromStorage(): HistoryStorage {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as HistoryStorage;
      // Validate structure
      if (parsed.version === 1 && parsed.items) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('useHistoryManager: Error loading history from storage:', error);
  }
  return { ...DEFAULT_HISTORY_STORAGE };
}

/**
 * Save history to localStorage
 */
function saveHistoryToStorage(storage: HistoryStorage): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.warn('useHistoryManager: Error saving history to storage:', error);
  }
}

/**
 * Get category key from item type
 */
function getCategoryKey(type: HistoryItemType): HistoryCategoryKey {
  return TYPE_TO_CATEGORY[type];
}

/**
 * Enforce the maximum items limit per category
 * Removes oldest items when limit is exceeded
 * 
 * @requirements 1.6, 1.7 - Maximum 100 items, remove oldest automatically
 */
function enforceLimit(items: HistoryItem[], limit: number = HISTORY_MAX_ITEMS_PER_CATEGORY): HistoryItem[] {
  if (items.length <= limit) {
    return items;
  }
  // Sort by timestamp descending and keep only the most recent
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, limit);
}

/**
 * Check if an item matches the filter criteria
 * 
 * @requirements 1.3, 1.4 - Filtering by type and date range
 */
function matchesFilter(item: HistoryItem, filter: HistoryFilter): boolean {
  // Filter by types
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(item.type)) {
      return false;
    }
  }

  // Filter by platforms
  if (filter.platforms && filter.platforms.length > 0) {
    if (!filter.platforms.includes(item.platform)) {
      return false;
    }
  }

  // Filter by date range - from
  if (filter.dateFrom !== undefined) {
    if (item.timestamp < filter.dateFrom) {
      return false;
    }
  }

  // Filter by date range - to
  if (filter.dateTo !== undefined) {
    if (item.timestamp > filter.dateTo) {
      return false;
    }
  }

  // Filter by search query
  if (filter.searchQuery && filter.searchQuery.trim() !== '') {
    const query = filter.searchQuery.toLowerCase();
    const searchableText = getSearchableText(item).toLowerCase();
    if (!searchableText.includes(query)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract searchable text from a history item
 */
function getSearchableText(item: HistoryItem): string {
  const data = item.data;
  const parts: string[] = [];

  if ('question' in data) parts.push(data.question);
  if ('title' in data) parts.push(data.title);
  if ('name' in data) parts.push(data.name);
  if ('commandName' in data) parts.push(data.commandName);
  if ('timerName' in data) parts.push(data.timerName);
  if ('winner' in data && typeof data.winner === 'string') parts.push(data.winner);
  if (item.metadata.winner) parts.push(item.metadata.winner);

  return parts.join(' ');
}

/**
 * Validate import data structure
 */
function validateImportData(data: unknown): data is HistoryExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (obj.version !== 1) return false;
  if (obj.application !== 'twitchvote') return false;
  if (!Array.isArray(obj.items)) return false;
  if (typeof obj.exportedAt !== 'number') return false;
  
  // Validate each item has required fields
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false;
    const histItem = item as Record<string, unknown>;
    if (typeof histItem.id !== 'string') return false;
    if (typeof histItem.type !== 'string') return false;
    if (typeof histItem.timestamp !== 'number') return false;
    if (typeof histItem.platform !== 'string') return false;
    if (!histItem.data || typeof histItem.data !== 'object') return false;
  }
  
  return true;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseHistoryManagerReturn {
  /** All history items (flattened from all categories) */
  items: HistoryItem[];
  /** History storage state */
  storage: HistoryStorage;
  /** Add a new history item */
  addItem: (item: AddHistoryItemInput) => HistoryItem;
  /** Get items with optional filtering */
  getItems: (filter?: HistoryFilter) => HistoryItem[];
  /** Get a single item by ID */
  getItemById: (id: string) => HistoryItem | null;
  /** Delete an item by ID */
  deleteItem: (id: string) => boolean;
  /** Clear history (optionally by type) */
  clearHistory: (type?: HistoryItemType) => void;
  /** Export history to JSON string */
  exportToJSON: () => string;
  /** Import history from JSON string */
  importFromJSON: (json: string) => { success: boolean; error?: string; itemsImported?: number };
  /** Get item count by type */
  getCountByType: (type: HistoryItemType) => number;
  /** Check if storage is at limit for a type */
  isAtLimit: (type: HistoryItemType) => boolean;
}

// ============================================
// MAIN HOOK
// ============================================

export function useHistoryManager(): UseHistoryManagerReturn {
  const [storage, setStorage] = useState<HistoryStorage>(() => loadHistoryFromStorage());

  // Persist to localStorage whenever storage changes
  useEffect(() => {
    saveHistoryToStorage(storage);
  }, [storage]);

  // Flatten all items for convenience
  const items = useMemo(() => {
    const allItems: HistoryItem[] = [
      ...storage.items.polls,
      ...storage.items.predictions,
      ...storage.items.giveaways,
      ...storage.items.commands,
      ...storage.items.timers,
    ];
    return allItems.sort((a, b) => b.timestamp - a.timestamp);
  }, [storage]);

  /**
   * Add a new history item
   * @requirements 1.2 - Record events with timestamp and metadata
   */
  const addItem = useCallback((input: AddHistoryItemInput): HistoryItem => {
    const newItem: HistoryItem = {
      ...input,
      id: generateHistoryId(),
      timestamp: Date.now(),
    };

    setStorage((prev) => {
      const categoryKey = getCategoryKey(newItem.type);
      const categoryItems = [...prev.items[categoryKey], newItem];
      const limitedItems = enforceLimit(categoryItems);

      return {
        ...prev,
        items: {
          ...prev.items,
          [categoryKey]: limitedItems,
        },
        lastUpdated: Date.now(),
      };
    });

    return newItem;
  }, []);

  /**
   * Get items with optional filtering
   * @requirements 1.3, 1.4 - Filter by type and date range
   */
  const getItems = useCallback((filter?: HistoryFilter): HistoryItem[] => {
    if (!filter) {
      return items;
    }
    return items.filter((item) => matchesFilter(item, filter));
  }, [items]);

  /**
   * Get a single item by ID
   */
  const getItemById = useCallback((id: string): HistoryItem | null => {
    return items.find((item) => item.id === id) ?? null;
  }, [items]);

  /**
   * Delete an item by ID
   */
  const deleteItem = useCallback((id: string): boolean => {
    let found = false;

    setStorage((prev) => {
      const newItems = { ...prev.items };

      for (const key of Object.keys(newItems) as HistoryCategoryKey[]) {
        const index = newItems[key].findIndex((item) => item.id === id);
        if (index !== -1) {
          newItems[key] = [...newItems[key]];
          newItems[key].splice(index, 1);
          found = true;
          break;
        }
      }

      if (!found) return prev;

      return {
        ...prev,
        items: newItems,
        lastUpdated: Date.now(),
      };
    });

    return found;
  }, []);

  /**
   * Clear history (optionally by type)
   */
  const clearHistory = useCallback((type?: HistoryItemType): void => {
    setStorage((prev) => {
      if (type) {
        const categoryKey = getCategoryKey(type);
        return {
          ...prev,
          items: {
            ...prev.items,
            [categoryKey]: [],
          },
          lastUpdated: Date.now(),
        };
      }

      return {
        ...DEFAULT_HISTORY_STORAGE,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  /**
   * Export history to JSON string
   * @requirements 1.8 - Export to JSON format
   */
  const exportToJSON = useCallback((): string => {
    const exportData: HistoryExport = {
      version: 1,
      exportedAt: Date.now(),
      application: 'streamcrowd',
      items: items,
      metadata: {
        totalItems: items.length,
        itemsByType: {
          poll: storage.items.polls.length,
          prediction: storage.items.predictions.length,
          giveaway: storage.items.giveaways.length,
          command: storage.items.commands.length,
          timer: storage.items.timers.length,
        },
      },
    };
    return JSON.stringify(exportData, null, 2);
  }, [items, storage]);

  /**
   * Import history from JSON string
   * @requirements 1.8 - Import from JSON format
   */
  const importFromJSON = useCallback((json: string): { success: boolean; error?: string; itemsImported?: number } => {
    try {
      const data = JSON.parse(json);
      
      if (!validateImportData(data)) {
        return { success: false, error: 'Invalid history export format' };
      }

      // Group items by category
      const newItems: HistoryStorage['items'] = {
        polls: [],
        predictions: [],
        giveaways: [],
        commands: [],
        timers: [],
      };

      for (const item of data.items) {
        const categoryKey = getCategoryKey(item.type);
        newItems[categoryKey].push(item);
      }

      // Enforce limits on each category
      for (const key of Object.keys(newItems) as HistoryCategoryKey[]) {
        newItems[key] = enforceLimit(newItems[key]);
      }

      setStorage({
        version: 1,
        items: newItems,
        lastUpdated: Date.now(),
      });

      const totalImported = Object.values(newItems).reduce((sum, arr) => sum + arr.length, 0);
      return { success: true, itemsImported: totalImported };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to parse JSON: ${message}` };
    }
  }, []);

  /**
   * Get item count by type
   */
  const getCountByType = useCallback((type: HistoryItemType): number => {
    const categoryKey = getCategoryKey(type);
    return storage.items[categoryKey].length;
  }, [storage]);

  /**
   * Check if storage is at limit for a type
   */
  const isAtLimit = useCallback((type: HistoryItemType): boolean => {
    return getCountByType(type) >= HISTORY_MAX_ITEMS_PER_CATEGORY;
  }, [getCountByType]);

  return {
    items,
    storage,
    addItem,
    getItems,
    getItemById,
    deleteItem,
    clearHistory,
    exportToJSON,
    importFromJSON,
    getCountByType,
    isAtLimit,
  };
}

export default useHistoryManager;
