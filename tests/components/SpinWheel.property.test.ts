/**
 * Property Test: SpinWheel Availability
 * Property 10: Spin Wheel Availability
 * Validates: Requirements 7.1 - SpinWheel should only be available when participants ≤ 20
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// PROPERTY: SpinWheel Availability
// ============================================

/**
 * The SpinWheel component should only be available when:
 * 1. Number of participants is between 1 and 20 (inclusive)
 * 2. Mode is not 'subs' (subs mode doesn't support wheel)
 */

// Simulates the availability check from RaffleTab
const canUseSpinWheel = (
  participantCount: number,
  mode: 'viewers' | 'keyword' | 'subs'
): boolean => {
  return participantCount > 0 && participantCount <= 20 && mode !== 'subs';
};

describe('SpinWheel Availability Property Tests', () => {
  describe('Property 10: SpinWheel Availability', () => {
    it('should be available when participants are between 1 and 20 (non-subs mode)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.constantFrom('viewers', 'keyword') as fc.Arbitrary<'viewers' | 'keyword'>,
          (participantCount, mode) => {
            const available = canUseSpinWheel(participantCount, mode);
            expect(available).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT be available when participants exceed 20', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 21, max: 1000 }),
          fc.constantFrom('viewers', 'keyword') as fc.Arbitrary<'viewers' | 'keyword'>,
          (participantCount, mode) => {
            const available = canUseSpinWheel(participantCount, mode);
            expect(available).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT be available when participants are 0', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('viewers', 'keyword', 'subs') as fc.Arbitrary<'viewers' | 'keyword' | 'subs'>,
          (mode) => {
            const available = canUseSpinWheel(0, mode);
            expect(available).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should NEVER be available in subs mode regardless of participant count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (participantCount) => {
            const available = canUseSpinWheel(participantCount, 'subs');
            expect(available).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent availability at boundary (20 participants)', () => {
      // Exactly 20 should be available
      expect(canUseSpinWheel(20, 'viewers')).toBe(true);
      expect(canUseSpinWheel(20, 'keyword')).toBe(true);
      
      // 21 should NOT be available
      expect(canUseSpinWheel(21, 'viewers')).toBe(false);
      expect(canUseSpinWheel(21, 'keyword')).toBe(false);
    });

    it('should have consistent availability at boundary (1 participant)', () => {
      // Exactly 1 should be available
      expect(canUseSpinWheel(1, 'viewers')).toBe(true);
      expect(canUseSpinWheel(1, 'keyword')).toBe(true);
      
      // 0 should NOT be available
      expect(canUseSpinWheel(0, 'viewers')).toBe(false);
      expect(canUseSpinWheel(0, 'keyword')).toBe(false);
    });
  });
});
