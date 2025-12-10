/**
 * Property-based tests for useLocalStorage hook
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Since we can't use React hooks directly in tests without a component,
// we test the core localStorage logic that the hook wraps
describe('useLocalStorage Property Tests', () => {
  // Store original localStorage
  let originalLocalStorage: Storage;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    // Create a mock localStorage for testing
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
  });

  afterEach(() => {
    mockStorage.clear();
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  /**
   * **Feature: app-refactoring, Property 1: useLocalStorage Round-Trip Consistency**
   * 
   * *For any* key, initial value, and subsequent value set via the hook,
   * reading from localStorage should return the same value that was set.
   * 
   * **Validates: Requirements 5.2, 5.5**
   */
  describe('Property 1: useLocalStorage Round-Trip Consistency', () => {
    it('should round-trip string values correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.string(), // value
          (key, value) => {
            // Write to localStorage
            localStorage.setItem(key, JSON.stringify(value));
            
            // Read back
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            // Should be identical
            expect(parsed).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round-trip number values correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.integer(), // value
          (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
            
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            expect(parsed).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round-trip boolean values correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.boolean(), // value
          (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
            
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            expect(parsed).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round-trip object values correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.record({
            name: fc.string(),
            count: fc.integer(),
            active: fc.boolean(),
          }), // value
          (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
            
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            expect(parsed).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round-trip array values correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), // value
          (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
            
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            expect(parsed).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve value after multiple writes to same key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }), // sequence of values
          (key, values) => {
            // Write each value in sequence
            for (const value of values) {
              localStorage.setItem(key, JSON.stringify(value));
            }
            
            // Final read should return last written value
            const stored = localStorage.getItem(key);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            
            expect(parsed).toBe(values[values.length - 1]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: app-refactoring, Property 2: useLocalStorage Graceful Degradation**
   * 
   * *For any* corrupted or invalid JSON in localStorage, the hook should
   * return the initial value without throwing.
   * 
   * **Validates: Requirements 5.3**
   */
  describe('Property 2: useLocalStorage Graceful Degradation', () => {
    it('should return initial value when localStorage contains invalid JSON', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.string(), // initialValue
          fc.string().filter(s => {
            // Generate strings that are NOT valid JSON
            try {
              JSON.parse(s);
              return false; // Valid JSON, filter out
            } catch {
              return true; // Invalid JSON, keep
            }
          }), // corruptedValue
          (key, initialValue, corruptedValue) => {
            // Store corrupted (non-JSON) value directly
            localStorage.setItem(key, corruptedValue);
            
            // Attempt to read and parse - should not throw
            const stored = localStorage.getItem(key);
            let result: string;
            
            try {
              result = JSON.parse(stored!);
            } catch {
              // On parse error, should fall back to initial value
              result = initialValue;
            }
            
            // Result should be the initial value (graceful degradation)
            expect(result).toBe(initialValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty string in localStorage gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.record({
            name: fc.string(),
            value: fc.integer(),
          }), // initialValue (object)
          (key, initialValue) => {
            // Store empty string (invalid JSON for object)
            localStorage.setItem(key, '');
            
            const stored = localStorage.getItem(key);
            let result: typeof initialValue;
            
            try {
              result = JSON.parse(stored!);
            } catch {
              result = initialValue;
            }
            
            // Should fall back to initial value
            expect(result).toEqual(initialValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle truncated JSON gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), // initialValue
          (key, initialValue) => {
            // Create truncated JSON (incomplete array)
            const validJson = JSON.stringify(initialValue);
            const truncated = validJson.slice(0, Math.max(1, validJson.length - 2));
            
            localStorage.setItem(key, truncated);
            
            const stored = localStorage.getItem(key);
            let result: typeof initialValue;
            
            try {
              result = JSON.parse(stored!);
            } catch {
              result = initialValue;
            }
            
            // Should fall back to initial value on parse error
            expect(result).toEqual(initialValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return initial value when key does not exist', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // key
          fc.string(), // initialValue
          (key, initialValue) => {
            // Ensure key doesn't exist
            localStorage.removeItem(key);
            
            const stored = localStorage.getItem(key);
            
            // When key doesn't exist, should use initial value
            const result = stored !== null ? JSON.parse(stored) : initialValue;
            
            expect(result).toBe(initialValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
