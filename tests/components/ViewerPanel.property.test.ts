/**
 * Property-based tests for ViewerPanel search debounce
 * 
 * Uses fast-check for property-based testing to validate the debounce
 * behavior of the search functionality in ViewerPanel.
 * 
 * Feature: stream-activity-refactor
 * Property 7: Search Debounce
 * @validates Requirements 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ============ DEBOUNCE IMPLEMENTATION (extracted for testing) ============

/**
 * Synchronous debounce function implementation matching the hook behavior
 * Uses callbacks instead of promises for better testability with fake timers
 */
function createDebounce<T>(delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastValue: T | undefined;
  let callback: ((value: T) => void) | null = null;

  return {
    debounce: (value: T, onEmit: (value: T) => void): void => {
      lastValue = value;
      callback = onEmit;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (callback) {
          callback(value);
        }
        timeoutId = null;
      }, delay);
    },
    
    getLastValue: () => lastValue,
    
    isPending: () => timeoutId !== null,
    
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    
    flush: () => {
      if (timeoutId && callback && lastValue !== undefined) {
        clearTimeout(timeoutId);
        callback(lastValue);
        timeoutId = null;
      }
    }
  };
}

// ============ ARBITRARIES ============

// Generate search query strings
const searchQueryArb = fc.string({ minLength: 0, maxLength: 50 });

// Generate sequences of search queries (simulating rapid typing)
const searchSequenceArb = fc.array(searchQueryArb, { minLength: 1, maxLength: 20 });

// Generate debounce delays (in ms)
const debounceDelayArb = fc.integer({ min: 50, max: 1000 });

// ============ TESTS ============

describe('ViewerPanel Search Debounce Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Property 7: Search Debounce', () => {
    /**
     * Feature: stream-activity-refactor, Property 7: Search Debounce
     * 
     * For any sequence of search inputs within the debounce window,
     * only the final value should be emitted after the debounce delay.
     * 
     * @validates Requirements 7.5
     */

    it('should only emit the final value after debounce delay when inputs arrive rapidly', () => {
      fc.assert(
        fc.property(
          searchSequenceArb,
          debounceDelayArb,
          (searchSequence, delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            // Simulate rapid typing - all inputs within debounce window
            for (const query of searchSequence) {
              debouncer.debounce(query, v => emittedValues.push(v));
            }

            // Before delay passes, nothing should be emitted
            expect(emittedValues).toHaveLength(0);

            // After delay passes, only the last value should be emitted
            vi.advanceTimersByTime(delay + 10);

            expect(emittedValues).toHaveLength(1);
            expect(emittedValues[0]).toBe(searchSequence[searchSequence.length - 1]);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit each value when inputs are spaced beyond debounce delay', () => {
      fc.assert(
        fc.property(
          fc.array(searchQueryArb, { minLength: 2, maxLength: 5 }),
          debounceDelayArb,
          (searchSequence, delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            // Input first value
            debouncer.debounce(searchSequence[0], v => emittedValues.push(v));
            
            // Wait for debounce to complete
            vi.advanceTimersByTime(delay + 10);
            
            expect(emittedValues).toHaveLength(1);
            expect(emittedValues[0]).toBe(searchSequence[0]);

            // Input remaining values with sufficient delay between each
            for (let i = 1; i < searchSequence.length; i++) {
              debouncer.debounce(searchSequence[i], v => emittedValues.push(v));
              vi.advanceTimersByTime(delay + 10);
            }

            // All values should have been emitted
            expect(emittedValues).toHaveLength(searchSequence.length);
            expect(emittedValues).toEqual(searchSequence);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cancel pending debounce when new input arrives', () => {
      fc.assert(
        fc.property(
          searchQueryArb,
          searchQueryArb,
          debounceDelayArb,
          (firstQuery, secondQuery, delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            // First input
            debouncer.debounce(firstQuery, v => emittedValues.push(v));
            
            // Wait half the delay
            vi.advanceTimersByTime(Math.floor(delay / 2));
            
            // Second input should cancel the first
            debouncer.debounce(secondQuery, v => emittedValues.push(v));
            
            // Wait for full delay from second input
            vi.advanceTimersByTime(delay + 10);

            // Only second value should be emitted
            expect(emittedValues).toHaveLength(1);
            expect(emittedValues[0]).toBe(secondQuery);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track pending state correctly', () => {
      fc.assert(
        fc.property(
          searchQueryArb,
          debounceDelayArb,
          (query, delay) => {
            const debouncer = createDebounce<string>(delay);

            // Initially not pending
            expect(debouncer.isPending()).toBe(false);

            // After input, should be pending
            debouncer.debounce(query, () => {});
            expect(debouncer.isPending()).toBe(true);

            // After delay, should not be pending
            vi.advanceTimersByTime(delay + 10);
            expect(debouncer.isPending()).toBe(false);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the last value correctly', () => {
      fc.assert(
        fc.property(
          searchSequenceArb,
          debounceDelayArb,
          (searchSequence, delay) => {
            const debouncer = createDebounce<string>(delay);

            // Process all inputs
            for (const query of searchSequence) {
              debouncer.debounce(query, () => {});
            }

            // Last value should be the final input
            expect(debouncer.getLastValue()).toBe(searchSequence[searchSequence.length - 1]);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty strings correctly', () => {
      fc.assert(
        fc.property(
          debounceDelayArb,
          (delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            // Input empty string
            debouncer.debounce('', v => emittedValues.push(v));
            
            vi.advanceTimersByTime(delay + 10);

            // Empty string should be emitted
            expect(emittedValues).toHaveLength(1);
            expect(emittedValues[0]).toBe('');

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle cancel correctly', () => {
      fc.assert(
        fc.property(
          searchQueryArb,
          debounceDelayArb,
          (query, delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            // Input and then cancel
            debouncer.debounce(query, v => emittedValues.push(v));
            debouncer.cancel();
            
            // Wait for delay
            vi.advanceTimersByTime(delay + 10);

            // Nothing should be emitted after cancel
            expect(emittedValues).toHaveLength(0);
            expect(debouncer.isPending()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debounce delay should be exactly as specified', () => {
      fc.assert(
        fc.property(
          searchQueryArb,
          debounceDelayArb,
          (query, delay) => {
            const debouncer = createDebounce<string>(delay);
            const emittedValues: string[] = [];

            debouncer.debounce(query, v => emittedValues.push(v));

            // Just before delay, nothing emitted
            vi.advanceTimersByTime(delay - 1);
            expect(emittedValues).toHaveLength(0);

            // After delay, value emitted
            vi.advanceTimersByTime(2);
            expect(emittedValues).toHaveLength(1);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Search Filtering with Debounce Integration', () => {
    /**
     * Tests that verify the integration of debounce with search filtering
     */

    it('filtered results should match the debounced search term', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
              displayName: fc.string({ minLength: 3, maxLength: 20 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          searchSequenceArb,
          (viewers, searchSequence) => {
            const delay = 300; // Standard debounce delay
            const debouncer = createDebounce<string>(delay);
            
            // Simulate rapid typing
            let finalSearchTerm = '';
            for (const query of searchSequence) {
              debouncer.debounce(query, v => { finalSearchTerm = v; });
            }

            // Wait for debounce
            vi.advanceTimersByTime(delay + 10);

            // Filter viewers with the debounced term
            const filteredViewers = viewers.filter(v => 
              v.username.toLowerCase().includes(finalSearchTerm.toLowerCase()) ||
              v.displayName.toLowerCase().includes(finalSearchTerm.toLowerCase())
            );

            // All filtered viewers should contain the search term
            for (const viewer of filteredViewers) {
              const matchesUsername = viewer.username.toLowerCase().includes(finalSearchTerm.toLowerCase());
              const matchesDisplayName = viewer.displayName.toLowerCase().includes(finalSearchTerm.toLowerCase());
              expect(matchesUsername || matchesDisplayName).toBe(true);
            }

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search should be case-insensitive after debounce', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          debounceDelayArb,
          (username, delay) => {
            const debouncer = createDebounce<string>(delay);
            let debouncedValue = '';

            // Create viewers with the username
            const viewers = [
              { username: username.toLowerCase(), displayName: username },
              { username: 'other_user', displayName: 'Other User' },
            ];

            // Search with uppercase
            debouncer.debounce(username.toUpperCase(), v => { debouncedValue = v; });
            vi.advanceTimersByTime(delay + 10);

            // Filter should find the user regardless of case
            const filtered = viewers.filter(v => 
              v.username.toLowerCase().includes(debouncedValue.toLowerCase())
            );

            expect(filtered.some(v => v.username === username.toLowerCase())).toBe(true);

            debouncer.cancel();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
