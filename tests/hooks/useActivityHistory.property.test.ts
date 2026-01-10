/**
 * Property-Based Tests for useActivityHistory Hook
 * Feature: dynamics-ui-improvements
 * 
 * Tests the core filtering and export functionality using property-based testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  filterByDateRange,
  filterBySearchTerm,
  exportToCSV,
  exportToJSON,
  importFromJSON,
  calculateStatistics,
  type BaseHistoryItem,
  type DateRangeType,
  type ActivityType,
} from '../../hooks/useActivityHistory';

// ============================================
// GENERATORS
// ============================================

const activityTypeArb = fc.constantFrom<ActivityType>('poll', 'prediction', 'game', 'giveaway');

// Fixed reference time for tests (2026-01-09T12:00:00Z)
const FIXED_NOW = new Date('2026-01-09T12:00:00Z').getTime();
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const historyItemArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: activityTypeArb,
  result: fc.string({ minLength: 1, maxLength: 30 }),
  participantCount: fc.integer({ min: 0, max: 10000 }),
  createdAt: fc.integer({ min: FIXED_NOW - YEAR_MS, max: FIXED_NOW }),
  finishedAt: fc.integer({ min: FIXED_NOW - YEAR_MS, max: FIXED_NOW }),
});

// Ensure finishedAt >= createdAt
const validHistoryItemArb = historyItemArb.map(item => ({
  ...item,
  finishedAt: Math.max(item.createdAt, item.finishedAt),
}));

const historyListArb = fc.array(validHistoryItemArb, { minLength: 0, maxLength: 100 });

const dateRangeArb = fc.constantFrom<DateRangeType>('today', 'week', 'month', 'all');

// ============================================
// PROPERTY TESTS
// ============================================

describe('useActivityHistory Property Tests', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Property 2: Date Filter Correctness
   * For any history list and date range filter, all returned items SHALL have 
   * their finishedAt timestamp within the specified date range.
   * Validates: Requirements 2.2, 3.2
   */
  describe('Property 2: Date Filter Correctness', () => {
    it('should return only items within the "today" date range', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const now = Date.now();
          const startOfDay = new Date().setHours(0, 0, 0, 0);
          
          const filtered = filterByDateRange(items, 'today');
          
          // All filtered items should be from today
          return filtered.every(item => item.finishedAt >= startOfDay && item.finishedAt <= now);
        }),
        { numRuns: 100 }
      );
    });

    it('should return only items within the "week" date range', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const now = Date.now();
          const weekAgo = now - 7 * DAY_MS;
          
          const filtered = filterByDateRange(items, 'week');
          
          // All filtered items should be from the last week
          return filtered.every(item => item.finishedAt >= weekAgo && item.finishedAt <= now);
        }),
        { numRuns: 100 }
      );
    });

    it('should return only items within the "month" date range', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const now = Date.now();
          const monthAgo = now - 30 * DAY_MS;
          
          const filtered = filterByDateRange(items, 'month');
          
          // All filtered items should be from the last month
          return filtered.every(item => item.finishedAt >= monthAgo && item.finishedAt <= now);
        }),
        { numRuns: 100 }
      );
    });

    it('should return all items for "all" date range', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const filtered = filterByDateRange(items, 'all');
          
          // Should return all items
          return filtered.length === items.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should return subset of original items for any date range', () => {
      fc.assert(
        fc.property(historyListArb, dateRangeArb, (items, range) => {
          const filtered = filterByDateRange(items, range);
          
          // Filtered should be subset of original
          return filtered.length <= items.length &&
                 filtered.every(f => items.some(i => i.id === f.id));
        }),
        { numRuns: 100 }
      );
    });

    it('should handle custom date range correctly', () => {
      fc.assert(
        fc.property(
          historyListArb,
          fc.date({ min: new Date('2025-01-01'), max: new Date('2026-01-09') }),
          fc.date({ min: new Date('2025-01-01'), max: new Date('2026-01-09') }),
          (items, startDate, endDate) => {
            // Ensure start <= end
            const [start, end] = startDate <= endDate 
              ? [startDate, endDate] 
              : [endDate, startDate];
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            
            const filtered = filterByDateRange(items, 'custom', startStr, endStr);
            
            const startTs = new Date(startStr).getTime();
            const endTs = new Date(endStr).getTime() + DAY_MS;
            
            // All filtered items should be within custom range
            return filtered.every(item => 
              item.finishedAt >= startTs && item.finishedAt <= endTs
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Search Filter Correctness
   * For any history list and search term, all returned items SHALL contain 
   * the search term in the specified search field (case-insensitive).
   * Validates: Requirements 2.3
   */
  describe('Property 3: Search Filter Correctness', () => {
    it('should return only items containing the search term in result field', () => {
      fc.assert(
        fc.property(
          historyListArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          (items, searchTerm) => {
            const filtered = filterBySearchTerm(items, searchTerm, 'result');
            
            // All filtered items should contain the search term (case-insensitive)
            const searchLower = searchTerm.toLowerCase().trim();
            return filtered.every(item => 
              item.result.toLowerCase().includes(searchLower)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only items containing the search term in name field', () => {
      fc.assert(
        fc.property(
          historyListArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          (items, searchTerm) => {
            const filtered = filterBySearchTerm(items, searchTerm, 'name');
            
            const searchLower = searchTerm.toLowerCase();
            return filtered.every(item => 
              item.name.toLowerCase().includes(searchLower)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items for empty search term', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const filtered = filterBySearchTerm(items, '', 'result');
          return filtered.length === items.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should return all items for whitespace-only search term', () => {
      fc.assert(
        fc.property(
          historyListArb,
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 }),
          (items, whitespace) => {
            const filtered = filterBySearchTerm(items, whitespace, 'result');
            return filtered.length === items.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(
          historyListArb,
          fc.string({ minLength: 1, maxLength: 10 }),
          (items, searchTerm) => {
            const lowerFiltered = filterBySearchTerm(items, searchTerm.toLowerCase(), 'result');
            const upperFiltered = filterBySearchTerm(items, searchTerm.toUpperCase(), 'result');
            const mixedFiltered = filterBySearchTerm(items, searchTerm, 'result');
            
            // All should return the same results
            return lowerFiltered.length === upperFiltered.length &&
                   upperFiltered.length === mixedFiltered.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Export/Import Round-Trip
   * For any valid history data, exporting to JSON and then importing SHALL 
   * produce data equivalent to the original.
   * Validates: Requirements 2.5, 9.3, 9.4
   */
  describe('Property 4: Export/Import Round-Trip', () => {
    it('should preserve all items through JSON export/import', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const exported = exportToJSON(items);
          const imported = importFromJSON<BaseHistoryItem>(exported);
          
          if (!imported) return items.length === 0;
          
          // Should have same number of items
          if (imported.length !== items.length) return false;
          
          // Each item should be equivalent
          return items.every((original, index) => {
            const restored = imported[index];
            return (
              original.id === restored.id &&
              original.name === restored.name &&
              original.type === restored.type &&
              original.result === restored.result &&
              original.participantCount === restored.participantCount &&
              original.createdAt === restored.createdAt &&
              original.finishedAt === restored.finishedAt
            );
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should handle import of raw array format', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          // Export as raw array (alternative format)
          const rawJson = JSON.stringify(items);
          const imported = importFromJSON<BaseHistoryItem>(rawJson);
          
          if (!imported) return items.length === 0;
          return imported.length === items.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should return null for invalid JSON', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try { JSON.parse(s); return false; } catch { return true; }
          }),
          (invalidJson) => {
            const result = importFromJSON<BaseHistoryItem>(invalidJson);
            return result === null;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should include exportedAt timestamp in JSON export', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const exported = exportToJSON(items);
          const parsed = JSON.parse(exported);
          
          return (
            typeof parsed.exportedAt === 'string' &&
            typeof parsed.count === 'number' &&
            parsed.count === items.length
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid CSV with correct number of rows', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const csv = exportToCSV(items);
          
          if (items.length === 0) return csv === '';
          
          const lines = csv.split('\n');
          // Header + data rows
          return lines.length === items.length + 1;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Statistics Calculation Correctness
   * For any history list, the calculated statistics SHALL be mathematically 
   * correct based on the input data.
   * Validates: Requirements 2.6, 3.5, 8.2
   */
  describe('Property 5: Statistics Calculation Correctness', () => {
    it('should calculate correct total count', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const stats = calculateStatistics(items);
          return stats.total === items.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should calculate correct average participants', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const stats = calculateStatistics(items);
          
          if (items.length === 0) {
            return stats.averageParticipants === 0;
          }
          
          const expectedAvg = Math.round(
            items.reduce((sum, i) => sum + i.participantCount, 0) / items.length
          );
          return stats.averageParticipants === expectedAvg;
        }),
        { numRuns: 100 }
      );
    });

    it('should count items by type correctly', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const stats = calculateStatistics(items);
          
          const expectedByType = { poll: 0, prediction: 0, game: 0, giveaway: 0 };
          items.forEach(item => {
            expectedByType[item.type]++;
          });
          
          return (
            stats.byType.poll === expectedByType.poll &&
            stats.byType.prediction === expectedByType.prediction &&
            stats.byType.game === expectedByType.game &&
            stats.byType.giveaway === expectedByType.giveaway
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should return top results sorted by count descending', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const stats = calculateStatistics(items);
          
          // Top results should be sorted descending
          for (let i = 1; i < stats.topResults.length; i++) {
            if (stats.topResults[i].count > stats.topResults[i - 1].count) {
              return false;
            }
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should limit top results to 10 items', () => {
      fc.assert(
        fc.property(historyListArb, (items) => {
          const stats = calculateStatistics(items);
          return stats.topResults.length <= 10;
        }),
        { numRuns: 100 }
      );
    });
  });
});
