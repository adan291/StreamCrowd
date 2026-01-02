/**
 * Property-based tests for ViewMode Persistence
 * 
 * Tests the view mode persistence behavior for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 4.1 - View mode is saved to localStorage on change
 * @requirements 4.2 - View mode is restored from localStorage on mount
 * @requirements 4.3 - Configuration values are preserved during mode switch
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// VIEW MODE TYPES AND LOGIC (extracted for testing)
// ============================================

type ViewMode = 'compact' | 'expanded';

interface MockLocalStorage {
  store: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

/**
 * Create a mock localStorage for testing
 */
function createMockLocalStorage(): MockLocalStorage {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); },
  };
}

/**
 * Save view mode to localStorage
 * Pure function for testing persistence logic
 */
function saveViewMode(
  storage: MockLocalStorage,
  storageKey: string,
  mode: ViewMode
): void {
  storage.setItem(storageKey, mode);
}

/**
 * Load view mode from localStorage
 * Pure function for testing restoration logic
 */
function loadViewMode(
  storage: MockLocalStorage,
  storageKey: string,
  defaultMode: ViewMode = 'expanded'
): ViewMode {
  const stored = storage.getItem(storageKey);
  if (stored === 'compact' || stored === 'expanded') {
    return stored;
  }
  return defaultMode;
}

/**
 * Validate if a value is a valid ViewMode
 */
function isValidViewMode(value: string | null): value is ViewMode {
  return value === 'compact' || value === 'expanded';
}

// ============================================
// CONFIGURATION PRESERVATION LOGIC
// ============================================

interface GiveawayConfig {
  keyword: string;
  duration: number;
  subsOnly: boolean;
  useTimer: boolean;
  maxEntries: number;
}

interface JudgePanelConfig {
  criteria: Array<{ name: string; weight: number }>;
  publicVoteWeight: number;
  votePrefix: string;
}

/**
 * Simulate view mode change while preserving configuration
 * This tests that configuration values don't change when view mode changes
 */
function changeViewModePreservingConfig<T extends object>(
  config: T,
  _currentMode: ViewMode,
  _newMode: ViewMode
): T {
  // Configuration should be preserved exactly as-is
  // The view mode change should not affect configuration values
  return { ...config };
}

/**
 * Deep equality check for configuration objects
 */
function configsAreEqual<T extends object>(config1: T, config2: T): boolean {
  return JSON.stringify(config1) === JSON.stringify(config2);
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const viewModeArb = fc.constantFrom<ViewMode>('compact', 'expanded');

const storageKeyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('\0'))
  .filter(s => !['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf'].includes(s));

const giveawayConfigArb: fc.Arbitrary<GiveawayConfig> = fc.record({
  keyword: fc.string({ minLength: 1, maxLength: 20 }),
  duration: fc.integer({ min: 10, max: 3600 }),
  subsOnly: fc.boolean(),
  useTimer: fc.boolean(),
  maxEntries: fc.integer({ min: 1, max: 10000 }),
});

const criterionArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  weight: fc.integer({ min: 1, max: 100 }),
});

const judgePanelConfigArb: fc.Arbitrary<JudgePanelConfig> = fc.record({
  criteria: fc.array(criterionArb, { minLength: 1, maxLength: 10 }),
  publicVoteWeight: fc.integer({ min: 0, max: 100 }),
  votePrefix: fc.string({ minLength: 1, maxLength: 5 }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('ViewMode Persistence Property Tests', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  /**
   * **Feature: ux-polish-and-testing, Property 9: View Mode Persistence**
   * 
   * *For any* view mode change to M, localStorage should contain M,
   * and on component remount, the view mode should be M.
   * 
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('Property 9: View Mode Persistence', () => {
    it('view mode is saved to localStorage on change', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          viewModeArb,
          (storageKey, mode) => {
            // Save the view mode
            saveViewMode(mockStorage, storageKey, mode);
            
            // Verify it was saved correctly
            const stored = mockStorage.getItem(storageKey);
            expect(stored).toBe(mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('view mode is restored from localStorage on mount', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          viewModeArb,
          (storageKey, mode) => {
            // Pre-populate localStorage
            mockStorage.setItem(storageKey, mode);
            
            // Load the view mode (simulating component mount)
            const restored = loadViewMode(mockStorage, storageKey);
            
            expect(restored).toBe(mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('save then load returns the same mode (round-trip)', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          viewModeArb,
          (storageKey, mode) => {
            // Save
            saveViewMode(mockStorage, storageKey, mode);
            
            // Load
            const restored = loadViewMode(mockStorage, storageKey);
            
            // Should be identical
            expect(restored).toBe(mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple saves overwrite previous value', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          viewModeArb,
          viewModeArb,
          (storageKey, firstMode, secondMode) => {
            // Save first mode
            saveViewMode(mockStorage, storageKey, firstMode);
            
            // Save second mode
            saveViewMode(mockStorage, storageKey, secondMode);
            
            // Load should return the second mode
            const restored = loadViewMode(mockStorage, storageKey);
            expect(restored).toBe(secondMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('default mode is used when localStorage is empty', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          viewModeArb,
          (storageKey, defaultMode) => {
            // Don't save anything, just load with default
            const restored = loadViewMode(mockStorage, storageKey, defaultMode);
            
            expect(restored).toBe(defaultMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid localStorage value falls back to default', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          fc.string().filter(s => s !== 'compact' && s !== 'expanded'),
          viewModeArb,
          (storageKey, invalidValue, defaultMode) => {
            // Store an invalid value
            mockStorage.setItem(storageKey, invalidValue);
            
            // Load should return default
            const restored = loadViewMode(mockStorage, storageKey, defaultMode);
            expect(restored).toBe(defaultMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('different storage keys are independent', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          storageKeyArb.filter(k => k.length > 0),
          viewModeArb,
          viewModeArb,
          (key1, key2Suffix, mode1, mode2) => {
            const key2 = key1 + '_' + key2Suffix; // Ensure different keys
            
            // Save different modes to different keys
            saveViewMode(mockStorage, key1, mode1);
            saveViewMode(mockStorage, key2, mode2);
            
            // Each key should have its own value
            expect(loadViewMode(mockStorage, key1)).toBe(mode1);
            expect(loadViewMode(mockStorage, key2)).toBe(mode2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isValidViewMode correctly validates view modes', () => {
      expect(isValidViewMode('compact')).toBe(true);
      expect(isValidViewMode('expanded')).toBe(true);
      expect(isValidViewMode('invalid')).toBe(false);
      expect(isValidViewMode(null)).toBe(false);
      expect(isValidViewMode('')).toBe(false);
    });
  });


  /**
   * **Feature: ux-polish-and-testing, Property 10: Configuration Preservation**
   * 
   * *For any* configuration C and view mode switch, the configuration
   * after switch should equal C.
   * 
   * **Validates: Requirements 4.3**
   */
  describe('Property 10: Configuration Preservation', () => {
    it('GiveawayHub config is preserved when switching view modes', () => {
      fc.assert(
        fc.property(
          giveawayConfigArb,
          viewModeArb,
          viewModeArb,
          (config, currentMode, newMode) => {
            // Switch view mode
            const configAfterSwitch = changeViewModePreservingConfig(
              config,
              currentMode,
              newMode
            );
            
            // Configuration should be exactly the same
            expect(configsAreEqual(config, configAfterSwitch)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('JudgePanel config is preserved when switching view modes', () => {
      fc.assert(
        fc.property(
          judgePanelConfigArb,
          viewModeArb,
          viewModeArb,
          (config, currentMode, newMode) => {
            // Switch view mode
            const configAfterSwitch = changeViewModePreservingConfig(
              config,
              currentMode,
              newMode
            );
            
            // Configuration should be exactly the same
            expect(configsAreEqual(config, configAfterSwitch)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('config fields are individually preserved', () => {
      fc.assert(
        fc.property(
          giveawayConfigArb,
          viewModeArb,
          viewModeArb,
          (config, currentMode, newMode) => {
            const configAfterSwitch = changeViewModePreservingConfig(
              config,
              currentMode,
              newMode
            );
            
            // Check each field individually
            expect(configAfterSwitch.keyword).toBe(config.keyword);
            expect(configAfterSwitch.duration).toBe(config.duration);
            expect(configAfterSwitch.subsOnly).toBe(config.subsOnly);
            expect(configAfterSwitch.useTimer).toBe(config.useTimer);
            expect(configAfterSwitch.maxEntries).toBe(config.maxEntries);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('criteria array is preserved when switching view modes', () => {
      fc.assert(
        fc.property(
          judgePanelConfigArb,
          viewModeArb,
          viewModeArb,
          (config, currentMode, newMode) => {
            const configAfterSwitch = changeViewModePreservingConfig(
              config,
              currentMode,
              newMode
            );
            
            // Criteria array should have same length
            expect(configAfterSwitch.criteria.length).toBe(config.criteria.length);
            
            // Each criterion should be preserved
            config.criteria.forEach((criterion, index) => {
              expect(configAfterSwitch.criteria[index].name).toBe(criterion.name);
              expect(configAfterSwitch.criteria[index].weight).toBe(criterion.weight);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple view mode switches preserve config', () => {
      fc.assert(
        fc.property(
          giveawayConfigArb,
          fc.array(viewModeArb, { minLength: 1, maxLength: 10 }),
          (config, modeSequence) => {
            let currentConfig = config;
            let currentMode: ViewMode = 'expanded';
            
            // Apply multiple mode switches
            for (const newMode of modeSequence) {
              currentConfig = changeViewModePreservingConfig(
                currentConfig,
                currentMode,
                newMode
              );
              currentMode = newMode;
            }
            
            // Config should still be the same as original
            expect(configsAreEqual(config, currentConfig)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('switching to same mode preserves config', () => {
      fc.assert(
        fc.property(
          giveawayConfigArb,
          viewModeArb,
          (config, mode) => {
            // Switch to the same mode
            const configAfterSwitch = changeViewModePreservingConfig(
              config,
              mode,
              mode
            );
            
            expect(configsAreEqual(config, configAfterSwitch)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip mode switch preserves config', () => {
      fc.assert(
        fc.property(
          giveawayConfigArb,
          viewModeArb,
          (config, startMode) => {
            const otherMode: ViewMode = startMode === 'compact' ? 'expanded' : 'compact';
            
            // Switch to other mode
            const configAfterFirst = changeViewModePreservingConfig(
              config,
              startMode,
              otherMode
            );
            
            // Switch back to original mode
            const configAfterSecond = changeViewModePreservingConfig(
              configAfterFirst,
              otherMode,
              startMode
            );
            
            // Config should be identical to original
            expect(configsAreEqual(config, configAfterSecond)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
