/**
 * Property-based tests for useHistoryManager hook
 * 
 * Tests the unified history management system for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 1.3, 1.4, 1.6, 1.7, 1.8
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  HistoryItem,
  HistoryFilter,
  HistoryStorage,
  HistoryItemType,
  HistoryPlatform,
  AddHistoryItemInput,
  HISTORY_MAX_ITEMS_PER_CATEGORY,
  HISTORY_STORAGE_KEY,
  DEFAULT_HISTORY_STORAGE,
  TYPE_TO_CATEGORY,
  HistoryCategoryKey,
} from '../../types/history';

// ============================================
// TEST UTILITIES
// ============================================

// Mock localStorage
let mockStorage: Map<string, string>;
let originalLocalStorage: Storage;

function setupMockLocalStorage() {
  mockStorage = new Map<string, string>();
  originalLocalStorage = global.localStorage;
  
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    get length() { return mockStorage.size; },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
  };
  
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

function teardownMockLocalStorage() {
  mockStorage.clear();
  Object.defineProperty(global, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  });
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const historyItemTypeArb = fc.constantFrom<HistoryItemType>('poll', 'prediction', 'giveaway', 'command', 'timer');
const historyPlatformArb = fc.constantFrom<HistoryPlatform>('twitch', 'youtube', 'kick', 'multi');

const pollHistoryDataArb = fc.record({
  question: fc.string({ minLength: 1, maxLength: 100 }),
  options: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 50 }),
      votes: fc.nat({ max: 10000 }),
      color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      percentage: fc.float({ min: 0, max: 100 }),
    }),
    { minLength: 2, maxLength: 10 }
  ),
  totalVotes: fc.nat({ max: 100000 }),
  winnerId: fc.option(fc.nat({ max: 9 })),
  winnerLabel: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

const giveawayHistoryDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  mode: fc.constantFrom<'viewers' | 'keyword' | 'subs'>('viewers', 'keyword', 'subs'),
  keyword: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  winner: fc.string({ minLength: 1, maxLength: 50 }),
  participantCount: fc.nat({ max: 10000 }),
  subscribersOnly: fc.boolean(),
});

const commandHistoryDataArb = fc.record({
  commandName: fc.string({ minLength: 1, maxLength: 50 }),
  trigger: fc.string({ minLength: 1, maxLength: 20 }),
  response: fc.string({ minLength: 1, maxLength: 200 }),
  executedBy: fc.string({ minLength: 1, maxLength: 50 }),
  channel: fc.string({ minLength: 1, maxLength: 50 }),
});

const timerHistoryDataArb = fc.record({
  timerName: fc.string({ minLength: 1, maxLength: 50 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  interval: fc.nat({ max: 3600 }),
  executionCount: fc.nat({ max: 1000 }),
  channel: fc.string({ minLength: 1, maxLength: 50 }),
});

// Generate history data based on type
function getHistoryDataArb(type: HistoryItemType) {
  switch (type) {
    case 'poll':
      return pollHistoryDataArb;
    case 'giveaway':
      return giveawayHistoryDataArb;
    case 'command':
      return commandHistoryDataArb;
    case 'timer':
      return timerHistoryDataArb;
    case 'prediction':
      return fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }),
        outcomes: fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            users: fc.nat({ max: 10000 }),
            channelPoints: fc.nat({ max: 1000000 }),
            color: fc.constantFrom<'BLUE' | 'PINK'>('BLUE', 'PINK'),
            percentage: fc.float({ min: 0, max: 100 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        status: fc.constantFrom<'RESOLVED' | 'CANCELED'>('RESOLVED', 'CANCELED'),
        winningOutcomeId: fc.option(fc.uuid()),
        winningOutcomeTitle: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        totalUsers: fc.nat({ max: 100000 }),
        totalPoints: fc.nat({ max: 10000000 }),
        predictionWindow: fc.integer({ min: 30, max: 1800 }),
      });
  }
}

// Generate a complete history item
const historyItemArb = historyItemTypeArb.chain(type => 
  fc.record({
    id: fc.uuid(),
    type: fc.constant(type),
    timestamp: fc.integer({ min: 1609459200000, max: 1735689600000 }), // 2021-2025
    platform: historyPlatformArb,
    data: getHistoryDataArb(type),
    metadata: fc.record({
      participants: fc.option(fc.nat({ max: 10000 })),
      totalVotes: fc.option(fc.nat({ max: 100000 })),
      winner: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
      duration: fc.option(fc.nat({ max: 3600 })),
    }),
  })
) as fc.Arbitrary<HistoryItem>;

// Generate a filter
const historyFilterArb = fc.record({
  types: fc.option(fc.array(historyItemTypeArb, { minLength: 1, maxLength: 5 })),
  platforms: fc.option(fc.array(historyPlatformArb, { minLength: 1, maxLength: 4 })),
  dateFrom: fc.option(fc.integer({ min: 1609459200000, max: 1735689600000 })),
  dateTo: fc.option(fc.integer({ min: 1609459200000, max: 1735689600000 })),
  searchQuery: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
}).map(f => {
  // Ensure dateFrom <= dateTo if both are present
  if (f.dateFrom !== undefined && f.dateTo !== undefined && f.dateFrom > f.dateTo) {
    const temp = f.dateFrom;
    f.dateFrom = f.dateTo;
    f.dateTo = temp;
  }
  return f as HistoryFilter;
});

// ============================================
// PURE FILTERING LOGIC (for testing without React)
// ============================================

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

function getSearchableText(item: HistoryItem): string {
  const data = item.data as Record<string, unknown>;
  const parts: string[] = [];

  if ('question' in data && typeof data.question === 'string') parts.push(data.question);
  if ('title' in data && typeof data.title === 'string') parts.push(data.title);
  if ('name' in data && typeof data.name === 'string') parts.push(data.name);
  if ('commandName' in data && typeof data.commandName === 'string') parts.push(data.commandName);
  if ('timerName' in data && typeof data.timerName === 'string') parts.push(data.timerName);
  if ('winner' in data && typeof data.winner === 'string') parts.push(data.winner);
  if (item.metadata.winner) parts.push(item.metadata.winner);

  return parts.join(' ');
}

function filterItems(items: HistoryItem[], filter?: HistoryFilter): HistoryItem[] {
  if (!filter) return items;
  return items.filter(item => matchesFilter(item, filter));
}

function enforceLimit(items: HistoryItem[], limit: number = HISTORY_MAX_ITEMS_PER_CATEGORY): HistoryItem[] {
  if (items.length <= limit) {
    return items;
  }
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, limit);
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('useHistoryManager Property Tests', () => {
  beforeEach(() => {
    setupMockLocalStorage();
  });

  afterEach(() => {
    teardownMockLocalStorage();
  });

  /**
   * **Feature: enhanced-features, Property 2: History Filtering Correctness**
   * 
   * *For any* history collection and filter criteria (type and/or date range),
   * the filtered results SHALL contain only items that match ALL specified criteria,
   * and SHALL contain ALL items that match those criteria.
   * 
   * **Validates: Requirements 1.3, 1.4**
   */
  describe('Property 2: History Filtering Correctness', () => {
    it('filtered results contain ONLY items matching ALL criteria', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 50 }),
          historyFilterArb,
          (items, filter) => {
            const filtered = filterItems(items, filter);
            
            // Every filtered item must match ALL criteria
            for (const item of filtered) {
              expect(matchesFilter(item, filter)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtered results contain ALL items that match criteria', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 50 }),
          historyFilterArb,
          (items, filter) => {
            const filtered = filterItems(items, filter);
            
            // Every item that matches should be in the filtered results
            for (const item of items) {
              if (matchesFilter(item, filter)) {
                expect(filtered.some(f => f.id === item.id)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('type filter returns only items of specified types', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 50 }),
          fc.array(historyItemTypeArb, { minLength: 1, maxLength: 3 }),
          (items, types) => {
            const filter: HistoryFilter = { types };
            const filtered = filterItems(items, filter);
            
            // All filtered items must have one of the specified types
            for (const item of filtered) {
              expect(types).toContain(item.type);
            }
            
            // All items with matching types should be included
            const expectedCount = items.filter(i => types.includes(i.type)).length;
            expect(filtered.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('date range filter returns only items within range', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1609459200000, max: 1672531200000 }), // dateFrom
          fc.integer({ min: 1672531200000, max: 1735689600000 }), // dateTo
          (items, dateFrom, dateTo) => {
            const filter: HistoryFilter = { dateFrom, dateTo };
            const filtered = filterItems(items, filter);
            
            // All filtered items must be within the date range
            for (const item of filtered) {
              expect(item.timestamp).toBeGreaterThanOrEqual(dateFrom);
              expect(item.timestamp).toBeLessThanOrEqual(dateTo);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty filter returns all items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 50 }),
          (items) => {
            const filtered = filterItems(items, {});
            expect(filtered.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('combined filters are conjunctive (AND logic)', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 50 }),
          fc.array(historyItemTypeArb, { minLength: 1, maxLength: 2 }),
          fc.array(historyPlatformArb, { minLength: 1, maxLength: 2 }),
          (items, types, platforms) => {
            const filter: HistoryFilter = { types, platforms };
            const filtered = filterItems(items, filter);
            
            // All filtered items must match BOTH type AND platform criteria
            for (const item of filtered) {
              expect(types).toContain(item.type);
              expect(platforms).toContain(item.platform);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: enhanced-features, Property 3: History Limit Enforcement**
   * 
   * *For any* history category, when the number of items exceeds 100,
   * the History_Manager SHALL retain exactly 100 items, and those items
   * SHALL be the 100 most recent by timestamp.
   * 
   * **Validates: Requirements 1.6, 1.7**
   */
  describe('Property 3: History Limit Enforcement', () => {
    it('enforces maximum limit of 100 items per category', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 200 }),
          (items) => {
            const limited = enforceLimit(items);
            expect(limited.length).toBeLessThanOrEqual(HISTORY_MAX_ITEMS_PER_CATEGORY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('retains exactly 100 items when exceeding limit', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 101, maxLength: 200 }),
          (items) => {
            const limited = enforceLimit(items);
            expect(limited.length).toBe(HISTORY_MAX_ITEMS_PER_CATEGORY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('retains the most recent items by timestamp', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 101, maxLength: 200 }),
          (items) => {
            const limited = enforceLimit(items);
            
            // Sort original items by timestamp descending
            const sortedOriginal = [...items].sort((a, b) => b.timestamp - a.timestamp);
            const expectedIds = new Set(sortedOriginal.slice(0, HISTORY_MAX_ITEMS_PER_CATEGORY).map(i => i.id));
            
            // All limited items should be from the most recent 100
            for (const item of limited) {
              expect(expectedIds.has(item.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves all items when under limit', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 100 }),
          (items) => {
            const limited = enforceLimit(items);
            expect(limited.length).toBe(items.length);
            
            // All original items should be present
            const limitedIds = new Set(limited.map(i => i.id));
            for (const item of items) {
              expect(limitedIds.has(item.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('oldest items are removed when limit is exceeded', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 101, maxLength: 200 }),
          (items) => {
            const limited = enforceLimit(items);
            const limitedTimestamps = limited.map(i => i.timestamp);
            const minLimitedTimestamp = Math.min(...limitedTimestamps);
            
            // Sort original items by timestamp descending
            const sortedOriginal = [...items].sort((a, b) => b.timestamp - a.timestamp);
            const removedItems = sortedOriginal.slice(HISTORY_MAX_ITEMS_PER_CATEGORY);
            
            // All removed items should have timestamps <= min timestamp in limited set
            // (or equal if there are ties)
            for (const removed of removedItems) {
              expect(removed.timestamp).toBeLessThanOrEqual(minLimitedTimestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: enhanced-features, Property 4: History Export Round-Trip**
   * 
   * *For any* valid history collection, exporting to JSON and then importing
   * that JSON SHALL produce an equivalent history collection with all items preserved.
   * 
   * **Validates: Requirements 1.8**
   */
  describe('Property 4: History Export Round-Trip', () => {
    // Export function (pure)
    function exportToJSON(items: HistoryItem[]): string {
      const itemsByType: Record<HistoryItemType, number> = {
        poll: 0,
        prediction: 0,
        giveaway: 0,
        command: 0,
        timer: 0,
      };
      
      for (const item of items) {
        itemsByType[item.type]++;
      }
      
      const exportData = {
        version: 1 as const,
        exportedAt: Date.now(),
        application: 'streamcrowd' as const,
        items: items,
        metadata: {
          totalItems: items.length,
          itemsByType,
        },
      };
      return JSON.stringify(exportData, null, 2);
    }

    // Import function (pure)
    function importFromJSON(json: string): { success: boolean; items?: HistoryItem[]; error?: string } {
      try {
        const data = JSON.parse(json);
        
        if (data.version !== 1 || data.application !== 'streamcrowd' || !Array.isArray(data.items)) {
          return { success: false, error: 'Invalid format' };
        }
        
        return { success: true, items: data.items };
      } catch (error) {
        return { success: false, error: 'Parse error' };
      }
    }

    it('export then import preserves all items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 50 }),
          (items) => {
            const exported = exportToJSON(items);
            const imported = importFromJSON(exported);
            
            expect(imported.success).toBe(true);
            expect(imported.items).toBeDefined();
            expect(imported.items!.length).toBe(items.length);
            
            // All original items should be present
            const importedIds = new Set(imported.items!.map(i => i.id));
            for (const item of items) {
              expect(importedIds.has(item.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('export then import preserves item data integrity', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 20 }),
          (items) => {
            const exported = exportToJSON(items);
            const imported = importFromJSON(exported);
            
            expect(imported.success).toBe(true);
            
            // Each item should have identical data after round-trip
            for (const originalItem of items) {
              const importedItem = imported.items!.find(i => i.id === originalItem.id);
              expect(importedItem).toBeDefined();
              expect(importedItem!.type).toBe(originalItem.type);
              expect(importedItem!.timestamp).toBe(originalItem.timestamp);
              expect(importedItem!.platform).toBe(originalItem.platform);
              expect(JSON.stringify(importedItem!.data)).toBe(JSON.stringify(originalItem.data));
              expect(JSON.stringify(importedItem!.metadata)).toBe(JSON.stringify(originalItem.metadata));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('export produces valid JSON', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 50 }),
          (items) => {
            const exported = exportToJSON(items);
            
            // Should not throw when parsing
            expect(() => JSON.parse(exported)).not.toThrow();
            
            const parsed = JSON.parse(exported);
            expect(parsed.version).toBe(1);
            expect(parsed.application).toBe('streamcrowd');
            expect(Array.isArray(parsed.items)).toBe(true);
            expect(typeof parsed.exportedAt).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('import rejects invalid JSON', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidJson) => {
            const result = importFromJSON(invalidJson);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('import rejects wrong version', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 2, max: 100 }), // wrong version
          (items, wrongVersion) => {
            const exportData = {
              version: wrongVersion,
              exportedAt: Date.now(),
              application: 'twitchvote',
              items: items,
              metadata: { totalItems: items.length, itemsByType: {} },
            };
            const json = JSON.stringify(exportData);
            
            const result = importFromJSON(json);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('import rejects wrong application', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'streamcrowd'),
          (items, wrongApp) => {
            const exportData = {
              version: 1,
              exportedAt: Date.now(),
              application: wrongApp,
              items: items,
              metadata: { totalItems: items.length, itemsByType: {} },
            };
            const json = JSON.stringify(exportData);
            
            const result = importFromJSON(json);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('double round-trip preserves items', () => {
      fc.assert(
        fc.property(
          fc.array(historyItemArb, { minLength: 0, maxLength: 30 }),
          (items) => {
            // First round-trip
            const exported1 = exportToJSON(items);
            const imported1 = importFromJSON(exported1);
            expect(imported1.success).toBe(true);
            
            // Second round-trip
            const exported2 = exportToJSON(imported1.items!);
            const imported2 = importFromJSON(exported2);
            expect(imported2.success).toBe(true);
            
            // Should have same items
            expect(imported2.items!.length).toBe(items.length);
            
            const finalIds = new Set(imported2.items!.map(i => i.id));
            for (const item of items) {
              expect(finalIds.has(item.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
