/**
 * Property-based tests for useCompactMode hook
 * 
 * Feature: activity-ui-improvements
 * Property 4: Compact Mode Persistence
 * Validates: Requirements 7.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { saveCompactMode, loadCompactMode } from '../../src/application/hooks/useCompactMode';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Setup localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useCompactMode Property Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Property 4: Compact Mode Persistence (Round-trip)', () => {
    /**
     * Property: For any boolean value, saving then loading should return the same value
     * This is a round-trip property test
     */
    it('should persist and retrieve the same boolean value (round-trip)', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (compactValue) => {
            // Clear storage before each test
            localStorageMock.clear();
            
            // Save the value
            saveCompactMode(compactValue);
            
            // Load the value
            const loadedValue = loadCompactMode();
            
            // Should be the same
            expect(loadedValue).toBe(compactValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Multiple saves should only keep the last value
     */
    it('should only keep the last saved value', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (values) => {
            localStorageMock.clear();
            
            // Save all values
            values.forEach(v => saveCompactMode(v));
            
            // Load should return the last value
            const loadedValue = loadCompactMode();
            expect(loadedValue).toBe(values[values.length - 1]);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Loading from empty storage should return false (default)
     */
    it('should return false when localStorage is empty', () => {
      localStorageMock.clear();
      const result = loadCompactMode();
      expect(result).toBe(false);
    });

    /**
     * Property: Save should call localStorage.setItem with correct key
     */
    it('should use correct localStorage key', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (value) => {
            localStorageMock.clear();
            vi.clearAllMocks();
            
            saveCompactMode(value);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
              'activity_compact_mode',
              JSON.stringify(value)
            );
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property: Load should call localStorage.getItem with correct key
     */
    it('should read from correct localStorage key', () => {
      localStorageMock.clear();
      vi.clearAllMocks();
      
      loadCompactMode();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('activity_compact_mode');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Property: Should handle invalid JSON gracefully
     */
    it('should return false for invalid JSON in localStorage', () => {
      localStorageMock.setItem('activity_compact_mode', 'not-valid-json');
      
      // Should not throw and return default
      const result = loadCompactMode();
      expect(result).toBe(false);
    });

    /**
     * Property: Should handle non-boolean values gracefully
     */
    it('should return false for non-boolean values', () => {
      const nonBooleanValues = ['"string"', '123', 'null', '{}', '[]'];
      
      nonBooleanValues.forEach(value => {
        localStorageMock.setItem('activity_compact_mode', value);
        const result = loadCompactMode();
        expect(result).toBe(false);
      });
    });

    /**
     * Property: Should handle true specifically
     */
    it('should return true only when stored value is exactly true', () => {
      localStorageMock.setItem('activity_compact_mode', 'true');
      const result = loadCompactMode();
      expect(result).toBe(true);
    });
  });
});
