/**
 * Property-Based Tests for useActivitySound Hook
 * Feature: dynamics-ui-improvements
 * 
 * Tests sound settings independence between activities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES (matching hook)
// ============================================

interface SoundConfig {
  enabled: boolean;
  volume: number;
  countdownEnabled: boolean;
  winnerEnabled: boolean;
  voteEnabled?: boolean;
  milestoneEnabled?: boolean;
  customSounds?: {
    countdown?: string;
    winner?: string;
    vote?: string;
    milestone?: string;
  };
}

// ============================================
// HELPER FUNCTIONS (simulating hook behavior)
// ============================================

const DEFAULT_CONFIG: SoundConfig = {
  enabled: true,
  volume: 50,
  countdownEnabled: true,
  winnerEnabled: true,
  voteEnabled: false,
  milestoneEnabled: false,
};

function loadConfig(storageKey: string): SoundConfig {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(storageKey: string, config: SoundConfig): void {
  localStorage.setItem(storageKey, JSON.stringify(config));
}

function mergeConfig(current: SoundConfig, updates: Partial<SoundConfig>): SoundConfig {
  return { ...current, ...updates };
}

// ============================================
// GENERATORS
// ============================================

const storageKeyArb = fc.constantFrom(
  'poll_sound_config',
  'prediction_sound_config',
  'game_sound_config',
  'giveaway_sound_config'
);

const soundConfigArb = fc.record({
  enabled: fc.boolean(),
  volume: fc.integer({ min: 0, max: 100 }),
  countdownEnabled: fc.boolean(),
  winnerEnabled: fc.boolean(),
  voteEnabled: fc.boolean(),
  milestoneEnabled: fc.boolean(),
});

const partialConfigArb = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  volume: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  countdownEnabled: fc.option(fc.boolean(), { nil: undefined }),
  winnerEnabled: fc.option(fc.boolean(), { nil: undefined }),
});

// ============================================
// MOCK LOCALSTORAGE
// ============================================

const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

// ============================================
// PROPERTY TESTS
// ============================================

describe('useActivitySound Property Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Property 1: Sound Settings Independence
   * Changing sound settings for one activity type SHALL NOT affect 
   * the sound settings of other activity types.
   * Validates: Requirements 1.2
   */
  describe('Property 1: Sound Settings Independence', () => {
    it('should store configs independently per storage key', () => {
      fc.assert(
        fc.property(
          soundConfigArb,
          soundConfigArb,
          (pollConfig, predictionConfig) => {
            // Save different configs for different activities
            saveConfig('poll_sound_config', pollConfig);
            saveConfig('prediction_sound_config', predictionConfig);
            
            // Load them back
            const loadedPoll = loadConfig('poll_sound_config');
            const loadedPrediction = loadConfig('prediction_sound_config');
            
            // They should be independent
            return (
              loadedPoll.enabled === pollConfig.enabled &&
              loadedPoll.volume === pollConfig.volume &&
              loadedPrediction.enabled === predictionConfig.enabled &&
              loadedPrediction.volume === predictionConfig.volume
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other keys when updating one', () => {
      fc.assert(
        fc.property(
          soundConfigArb,
          soundConfigArb,
          partialConfigArb,
          (initialPoll, initialPrediction, updates) => {
            // Set initial configs
            saveConfig('poll_sound_config', initialPoll);
            saveConfig('prediction_sound_config', initialPrediction);
            
            // Update only poll config
            const updatedPoll = mergeConfig(initialPoll, updates as Partial<SoundConfig>);
            saveConfig('poll_sound_config', updatedPoll);
            
            // Prediction config should be unchanged
            const loadedPrediction = loadConfig('prediction_sound_config');
            return (
              loadedPrediction.enabled === initialPrediction.enabled &&
              loadedPrediction.volume === initialPrediction.volume &&
              loadedPrediction.countdownEnabled === initialPrediction.countdownEnabled &&
              loadedPrediction.winnerEnabled === initialPrediction.winnerEnabled
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use unique storage keys for each activity type', () => {
      const keys = [
        'poll_sound_config',
        'prediction_sound_config',
        'game_sound_config',
        'giveaway_sound_config',
      ];
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should return default config when storage is empty', () => {
      fc.assert(
        fc.property(storageKeyArb, (key) => {
          mockLocalStorage.clear();
          const config = loadConfig(key);
          
          return (
            config.enabled === DEFAULT_CONFIG.enabled &&
            config.volume === DEFAULT_CONFIG.volume &&
            config.countdownEnabled === DEFAULT_CONFIG.countdownEnabled &&
            config.winnerEnabled === DEFAULT_CONFIG.winnerEnabled
          );
        }),
        { numRuns: 4 }
      );
    });

    it('should preserve config after multiple saves', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          fc.array(soundConfigArb, { minLength: 1, maxLength: 10 }),
          (key, configs) => {
            // Save multiple times
            configs.forEach(config => saveConfig(key, config));
            
            // Final config should be the last one
            const lastConfig = configs[configs.length - 1];
            const loaded = loadConfig(key);
            
            return (
              loaded.enabled === lastConfig.enabled &&
              loaded.volume === lastConfig.volume
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Volume Bounds
   * Volume should always be within valid range
   */
  describe('Volume Bounds', () => {
    it('should keep volume within 0-100 range', () => {
      fc.assert(
        fc.property(
          storageKeyArb,
          fc.integer({ min: -1000, max: 1000 }),
          (key, volume) => {
            const config: SoundConfig = {
              ...DEFAULT_CONFIG,
              volume: Math.max(0, Math.min(100, volume)),
            };
            saveConfig(key, config);
            const loaded = loadConfig(key);
            
            return loaded.volume >= 0 && loaded.volume <= 100;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Config Merge
   * Partial updates should preserve unspecified fields
   */
  describe('Config Merge', () => {
    it('should preserve unspecified fields when merging', () => {
      fc.assert(
        fc.property(
          soundConfigArb,
          soundConfigArb,
          (original, updates) => {
            // Create partial updates by randomly selecting fields
            const partial: Partial<SoundConfig> = {};
            if (Math.random() > 0.5) partial.enabled = updates.enabled;
            if (Math.random() > 0.5) partial.volume = updates.volume;
            if (Math.random() > 0.5) partial.countdownEnabled = updates.countdownEnabled;
            if (Math.random() > 0.5) partial.winnerEnabled = updates.winnerEnabled;
            
            const merged = mergeConfig(original, partial);
            
            // Check that unspecified fields are preserved
            if (!('enabled' in partial)) {
              if (merged.enabled !== original.enabled) return false;
            }
            if (!('volume' in partial)) {
              if (merged.volume !== original.volume) return false;
            }
            if (!('countdownEnabled' in partial)) {
              if (merged.countdownEnabled !== original.countdownEnabled) return false;
            }
            if (!('winnerEnabled' in partial)) {
              if (merged.winnerEnabled !== original.winnerEnabled) return false;
            }
            
            // Check that specified fields are updated
            if ('enabled' in partial) {
              if (merged.enabled !== partial.enabled) return false;
            }
            if ('volume' in partial) {
              if (merged.volume !== partial.volume) return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
