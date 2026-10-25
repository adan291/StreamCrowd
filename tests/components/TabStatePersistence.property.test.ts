/**
 * Property-based tests for Tab State Persistence
 * 
 * Uses fast-check for property-based testing to validate the tab state
 * persistence behavior in StreamActivity component.
 * 
 * Feature: stream-activity-refactor
 * Property 8: Tab State Persistence
 * @validates Requirements 8.2, 8.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ============ TAB PERSISTENCE IMPLEMENTATION (extracted for testing) ============

const TAB_STORAGE_KEY = 'stream_activity_selected_tab';
const VALID_TABS = ['live', 'history', 'viewers', 'api'] as const;
type ActivityTab = typeof VALID_TABS[number];

/**
 * Mock localStorage for testing
 */
function createMockStorage(): Storage {
  // Map, not a plain object: random keys such as "__proto__" broke the mock
  // (store["__proto__"] returns Object.prototype) and failed intermittently.
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

/**
 * Tab state manager matching the StreamActivity implementation
 */
function createTabStateManager(storage: Storage) {
  return {
    /**
     * Load the persisted tab from storage
     * Returns 'live' as default if no valid tab is stored
     */
    loadTab: (): ActivityTab => {
      try {
        const stored = storage.getItem(TAB_STORAGE_KEY);
        if (stored && VALID_TABS.includes(stored as ActivityTab)) {
          return stored as ActivityTab;
        }
      } catch {}
      return 'live';
    },

    /**
     * Save the current tab to storage
     */
    saveTab: (tab: ActivityTab): void => {
      try {
        storage.setItem(TAB_STORAGE_KEY, tab);
      } catch {}
    },

    /**
     * Check if a tab value is valid
     */
    isValidTab: (tab: string): tab is ActivityTab => {
      return VALID_TABS.includes(tab as ActivityTab);
    },

    /**
     * Get all valid tabs
     */
    getValidTabs: (): readonly ActivityTab[] => VALID_TABS,
  };
}

// ============ ARBITRARIES ============

// Generate valid tab values
const validTabArb = fc.constantFrom(...VALID_TABS);

// Generate invalid tab values (strings that are not valid tabs)
const invalidTabArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => !VALID_TABS.includes(s as ActivityTab));

// Generate sequences of tab selections
const tabSequenceArb = fc.array(validTabArb, { minLength: 1, maxLength: 20 });

// ============ TESTS ============

describe('Tab State Persistence Property Tests', () => {
  let mockStorage: Storage;
  let tabManager: ReturnType<typeof createTabStateManager>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    tabManager = createTabStateManager(mockStorage);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('Property 8: Tab State Persistence', () => {
    /**
     * Feature: stream-activity-refactor, Property 8: Tab State Persistence
     * 
     * Validates that tab selection is persisted correctly across sessions
     * and that the component maintains state when switching tabs.
     * 
     * @validates Requirements 8.2, 8.4
     */

    it('should persist any valid tab selection to storage', () => {
      fc.assert(
        fc.property(validTabArb, (tab) => {
          tabManager.saveTab(tab);
          const loaded = tabManager.loadTab();
          expect(loaded).toBe(tab);
        }),
        { numRuns: 100 }
      );
    });

    it('should return default tab when storage is empty', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const loaded = tabManager.loadTab();
          expect(loaded).toBe('live');
          expect(VALID_TABS).toContain(loaded);
        }),
        { numRuns: 10 }
      );
    });

    it('should return default tab when storage contains invalid value', () => {
      fc.assert(
        fc.property(invalidTabArb, (invalidTab) => {
          mockStorage.setItem(TAB_STORAGE_KEY, invalidTab);
          const loaded = tabManager.loadTab();
          expect(loaded).toBe('live');
        }),
        { numRuns: 100 }
      );
    });

    it('should persist the last tab in a sequence of selections', () => {
      fc.assert(
        fc.property(tabSequenceArb, (tabSequence) => {
          // Simulate user switching between tabs
          for (const tab of tabSequence) {
            tabManager.saveTab(tab);
          }

          // The last tab should be persisted
          const loaded = tabManager.loadTab();
          expect(loaded).toBe(tabSequence[tabSequence.length - 1]);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain tab state across simulated sessions', () => {
      fc.assert(
        fc.property(validTabArb, (tab) => {
          // Session 1: Select and save tab
          tabManager.saveTab(tab);

          // Session 2: Create new manager with same storage (simulates page reload)
          const newManager = createTabStateManager(mockStorage);
          const loaded = newManager.loadTab();

          expect(loaded).toBe(tab);
        }),
        { numRuns: 100 }
      );
    });

    it('should always return a valid tab regardless of storage state', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            invalidTabArb,
            validTabArb
          ),
          (storageValue) => {
            if (storageValue !== null && storageValue !== undefined) {
              mockStorage.setItem(TAB_STORAGE_KEY, storageValue);
            }

            const loaded = tabManager.loadTab();
            expect(VALID_TABS).toContain(loaded);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify valid tabs', () => {
      fc.assert(
        fc.property(validTabArb, (tab) => {
          expect(tabManager.isValidTab(tab)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify invalid tabs', () => {
      fc.assert(
        fc.property(invalidTabArb, (invalidTab) => {
          expect(tabManager.isValidTab(invalidTab)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle storage errors gracefully', () => {
      // Create a storage that throws on setItem
      const errorStorage: Storage = {
        ...createMockStorage(),
        setItem: () => { throw new Error('Storage full'); },
      };
      const errorManager = createTabStateManager(errorStorage);

      fc.assert(
        fc.property(validTabArb, (tab) => {
          // Should not throw
          expect(() => errorManager.saveTab(tab)).not.toThrow();
          // Should return default since storage failed
          expect(errorManager.loadTab()).toBe('live');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle storage read errors gracefully', () => {
      // Create a storage that throws on getItem
      const errorStorage: Storage = {
        ...createMockStorage(),
        getItem: () => { throw new Error('Storage unavailable'); },
      };
      const errorManager = createTabStateManager(errorStorage);

      fc.assert(
        fc.property(fc.constant(null), () => {
          // Should not throw and return default
          const loaded = errorManager.loadTab();
          expect(loaded).toBe('live');
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Tab State Consistency', () => {
    /**
     * Tests that verify the consistency of tab state management
     */

    it('save followed by load should be idempotent', () => {
      fc.assert(
        fc.property(validTabArb, (tab) => {
          tabManager.saveTab(tab);
          const first = tabManager.loadTab();
          const second = tabManager.loadTab();
          const third = tabManager.loadTab();

          expect(first).toBe(tab);
          expect(second).toBe(tab);
          expect(third).toBe(tab);
        }),
        { numRuns: 100 }
      );
    });

    it('multiple saves of same tab should be idempotent', () => {
      fc.assert(
        fc.property(validTabArb, fc.integer({ min: 1, max: 10 }), (tab, count) => {
          for (let i = 0; i < count; i++) {
            tabManager.saveTab(tab);
          }

          const loaded = tabManager.loadTab();
          expect(loaded).toBe(tab);
        }),
        { numRuns: 100 }
      );
    });

    it('all valid tabs should be persistable and loadable', () => {
      for (const tab of VALID_TABS) {
        mockStorage.clear();
        tabManager.saveTab(tab);
        const loaded = tabManager.loadTab();
        expect(loaded).toBe(tab);
      }
    });

    it('tab persistence should not affect other storage keys', () => {
      fc.assert(
        fc.property(
          validTabArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== TAB_STORAGE_KEY),
          fc.string({ minLength: 1, maxLength: 50 }),
          (tab, otherKey, otherValue) => {
            // Set another key
            mockStorage.setItem(otherKey, otherValue);

            // Save tab
            tabManager.saveTab(tab);

            // Other key should be unchanged
            expect(mockStorage.getItem(otherKey)).toBe(otherValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
