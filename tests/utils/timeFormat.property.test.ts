/**
 * Property-based tests for timeFormat utilities
 * 
 * Feature: activity-ui-improvements
 * Property 1: Relative Time Formatting
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatRelativeTime, formatDuration, isValidTimestamp } from '../../src/application/utils/timeFormat';

describe('timeFormat Property Tests', () => {
  describe('Property 1: Relative Time Formatting', () => {
    /**
     * Property: For any valid timestamp in the past, formatRelativeTime SHALL return
     * a string that starts with "hace " or equals "ahora"
     */
    it('should return valid relative time format for any past timestamp', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          // Generate timestamps from 1 second ago to 30 days ago
          fc.integer({ min: 1000, max: 30 * 24 * 60 * 60 * 1000 }),
          (msAgo) => {
            const timestamp = now - msAgo;
            const result = formatRelativeTime(timestamp, now);
            
            // Result should be "ahora" or start with "hace "
            const isValid = result === 'ahora' || result.startsWith('hace ');
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For timestamps within 60 seconds, should return "ahora"
     */
    it('should return "ahora" for timestamps within 60 seconds', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59999 }), // 0 to 59.999 seconds
          (msAgo) => {
            const timestamp = now - msAgo;
            const result = formatRelativeTime(timestamp, now);
            expect(result).toBe('ahora');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For timestamps 1-59 minutes ago, should return "hace Xm"
     */
    it('should return minutes format for 1-59 minutes ago', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 59 }), // 1 to 59 minutes
          (minutesAgo) => {
            const msAgo = minutesAgo * 60 * 1000;
            const timestamp = now - msAgo;
            const result = formatRelativeTime(timestamp, now);
            
            expect(result).toMatch(/^hace \d+m$/);
            
            // Extract the number and verify it matches
            const match = result.match(/^hace (\d+)m$/);
            expect(match).not.toBeNull();
            if (match) {
              expect(parseInt(match[1])).toBe(minutesAgo);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For timestamps 1-23 hours ago, should return "hace Xh"
     */
    it('should return hours format for 1-23 hours ago', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 23 }), // 1 to 23 hours
          (hoursAgo) => {
            const msAgo = hoursAgo * 60 * 60 * 1000;
            const timestamp = now - msAgo;
            const result = formatRelativeTime(timestamp, now);
            
            expect(result).toMatch(/^hace \d+h$/);
            
            const match = result.match(/^hace (\d+)h$/);
            expect(match).not.toBeNull();
            if (match) {
              expect(parseInt(match[1])).toBe(hoursAgo);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For timestamps 1+ days ago, should return "hace Xd"
     */
    it('should return days format for 1+ days ago', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // 1 to 30 days
          (daysAgo) => {
            const msAgo = daysAgo * 24 * 60 * 60 * 1000;
            const timestamp = now - msAgo;
            const result = formatRelativeTime(timestamp, now);
            
            expect(result).toMatch(/^hace \d+d$/);
            
            const match = result.match(/^hace (\d+)d$/);
            expect(match).not.toBeNull();
            if (match) {
              expect(parseInt(match[1])).toBe(daysAgo);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Invalid timestamps should return "ahora"
     */
    it('should return "ahora" for invalid timestamps', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.constant(0),
            fc.constant(-1),
            fc.integer({ min: -1000000, max: 0 })
          ),
          (invalidTimestamp) => {
            const result = formatRelativeTime(invalidTimestamp);
            expect(result).toBe('ahora');
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Future timestamps should return "ahora"
     */
    it('should return "ahora" for future timestamps', () => {
      const now = Date.now();
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 1000000 }), // 1 second to ~16 minutes in future
          (msInFuture) => {
            const timestamp = now + msInFuture;
            const result = formatRelativeTime(timestamp, now);
            expect(result).toBe('ahora');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('formatDuration Property Tests', () => {
    /**
     * Property: Duration formatting should produce valid format
     */
    it('should return valid duration format for any positive number', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 * 24 * 60 * 60 }), // 0 to 30 days in seconds
          (seconds) => {
            const result = formatDuration(seconds);
            
            // Should match one of the valid formats
            const isValid = /^\d+[smhd]$/.test(result);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Seconds format for < 60 seconds
     */
    it('should return seconds format for < 60 seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59 }),
          (seconds) => {
            const result = formatDuration(seconds);
            expect(result).toMatch(/^\d+s$/);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Invalid durations should return "0s"
     */
    it('should return "0s" for invalid durations', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.integer({ min: -1000, max: -1 })
          ),
          (invalidDuration) => {
            const result = formatDuration(invalidDuration);
            expect(result).toBe('0s');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('isValidTimestamp Property Tests', () => {
    /**
     * Property: Valid timestamps should return true
     */
    it('should return true for valid positive timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
          (timestamp) => {
            expect(isValidTimestamp(timestamp)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Invalid timestamps should return false
     */
    it('should return false for invalid timestamps', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.constant(0),
            fc.integer({ min: -1000000, max: 0 })
          ),
          (invalidTimestamp) => {
            expect(isValidTimestamp(invalidTimestamp)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
