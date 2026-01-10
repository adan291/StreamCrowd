/**
 * Property-Based Tests for useActivityConfig Hook
 * Feature: dynamics-ui-improvements
 * 
 * Tests configuration persistence and round-trip functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  validateConfigStructure,
  mergeWithDefaults,
  exportConfigToJSON,
  importConfigFromJSON,
} from '../../hooks/useActivityConfig';

// ============================================
// TEST CONFIG TYPES
// ============================================

interface TestSoundConfig {
  enabled: boolean;
  volume: number;
  soundFile: string;
}

interface TestConfig {
  name: string;
  enabled: boolean;
  count: number;
  sound: TestSoundConfig;
  tags: string[];
}

const DEFAULT_CONFIG: TestConfig = {
  name: 'default',
  enabled: true,
  count: 0,
  sound: {
    enabled: false,
    volume: 50,
    soundFile: 'default.mp3',
  },
  tags: [],
};

// ============================================
// GENERATORS
// ============================================

const soundConfigArb = fc.record({
  enabled: fc.boolean(),
  volume: fc.integer({ min: 0, max: 100 }),
  soundFile: fc.string({ minLength: 1, maxLength: 50 }),
});

const testConfigArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  enabled: fc.boolean(),
  count: fc.integer({ min: 0, max: 10000 }),
  sound: soundConfigArb,
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
});

const partialConfigArb = fc.record({
  name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  count: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('useActivityConfig Property Tests', () => {
  const CONFIG_VERSION = 1;

  /**
   * Property 9: Configuration Persistence Round-Trip
   * For any valid configuration, exporting and then importing SHALL produce 
   * a configuration equivalent to the original.
   * Validates: Requirements 9.1, 9.2
   */
  describe('Property 9: Configuration Persistence Round-Trip', () => {
    it('should preserve config through export/import cycle', () => {
      fc.assert(
        fc.property(testConfigArb, (config) => {
          const exported = exportConfigToJSON(config, CONFIG_VERSION);
          const imported = importConfigFromJSON<TestConfig>(exported, DEFAULT_CONFIG, CONFIG_VERSION);
          
          if (!imported) return false;
          
          return (
            imported.name === config.name &&
            imported.enabled === config.enabled &&
            imported.count === config.count &&
            imported.sound.enabled === config.sound.enabled &&
            imported.sound.volume === config.sound.volume &&
            imported.sound.soundFile === config.sound.soundFile &&
            imported.tags.length === config.tags.length &&
            imported.tags.every((tag, i) => tag === config.tags[i])
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should include version and timestamp in export', () => {
      fc.assert(
        fc.property(testConfigArb, (config) => {
          const exported = exportConfigToJSON(config, CONFIG_VERSION);
          const parsed = JSON.parse(exported);
          
          return (
            parsed.version === CONFIG_VERSION &&
            typeof parsed.updatedAt === 'string' &&
            parsed.config !== undefined
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle raw config object import (without wrapper)', () => {
      fc.assert(
        fc.property(testConfigArb, (config) => {
          // Export as raw object (no version wrapper)
          const rawJson = JSON.stringify(config);
          const imported = importConfigFromJSON<TestConfig>(rawJson, DEFAULT_CONFIG, CONFIG_VERSION);
          
          if (!imported) return false;
          
          return (
            imported.name === config.name &&
            imported.enabled === config.enabled
          );
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
            const result = importConfigFromJSON<TestConfig>(invalidJson, DEFAULT_CONFIG, CONFIG_VERSION);
            return result === null;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle version mismatch gracefully', () => {
      fc.assert(
        fc.property(
          testConfigArb,
          fc.integer({ min: 1, max: 100 }),
          (config, differentVersion) => {
            const exported = exportConfigToJSON(config, differentVersion);
            // Import with different version - should still work
            const imported = importConfigFromJSON<TestConfig>(exported, DEFAULT_CONFIG, CONFIG_VERSION);
            
            // Should import successfully despite version mismatch
            return imported !== null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Config Structure Validation
   * Validates that config structure checking works correctly
   */
  describe('Config Structure Validation', () => {
    it('should validate correct config structure', () => {
      fc.assert(
        fc.property(testConfigArb, (config) => {
          return validateConfigStructure(config, DEFAULT_CONFIG);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject non-object values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          (value) => {
            return !validateConfigStructure(value, DEFAULT_CONFIG);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject objects missing required keys', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('name', 'enabled', 'count', 'sound', 'tags'),
          (keyToRemove) => {
            const config = { ...DEFAULT_CONFIG };
            delete (config as Record<string, unknown>)[keyToRemove];
            return !validateConfigStructure(config, DEFAULT_CONFIG);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Additional Property: Merge With Defaults
   * Validates that partial configs are correctly merged with defaults
   */
  describe('Merge With Defaults', () => {
    it('should fill missing keys from defaults', () => {
      fc.assert(
        fc.property(partialConfigArb, (partial) => {
          const merged = mergeWithDefaults(partial as Partial<TestConfig>, DEFAULT_CONFIG);
          
          // All keys from default should exist
          return (
            'name' in merged &&
            'enabled' in merged &&
            'count' in merged &&
            'sound' in merged &&
            'tags' in merged
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve provided values over defaults', () => {
      fc.assert(
        fc.property(testConfigArb, (config) => {
          const merged = mergeWithDefaults(config, DEFAULT_CONFIG);
          
          return (
            merged.name === config.name &&
            merged.enabled === config.enabled &&
            merged.count === config.count
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should return default when given empty object', () => {
      const merged = mergeWithDefaults({}, DEFAULT_CONFIG);
      
      expect(merged.name).toBe(DEFAULT_CONFIG.name);
      expect(merged.enabled).toBe(DEFAULT_CONFIG.enabled);
      expect(merged.count).toBe(DEFAULT_CONFIG.count);
    });

    it('should handle nested object merging', () => {
      fc.assert(
        fc.property(
          fc.record({
            sound: fc.record({
              volume: fc.integer({ min: 0, max: 100 }),
            }),
          }),
          (partial) => {
            const merged = mergeWithDefaults(partial as Partial<TestConfig>, DEFAULT_CONFIG);
            
            // Provided volume should be preserved
            return merged.sound.volume === partial.sound.volume;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
