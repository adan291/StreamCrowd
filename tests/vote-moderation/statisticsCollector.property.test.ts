/**
 * Property-based tests for Statistics Collector
 * Uses fast-check for property-based testing
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  updateStats,
  calculateAcceptanceRate,
  shouldShowWarning,
  DEFAULT_MODERATION_STATS,
  RejectionReason,
  ModerationStats,
} from '../../services/voteModerationService';

// Generator for valid rejection reasons
const rejectionReasonArb = fc.constantFrom<RejectionReason>(
  'ACCOUNT_TOO_YOUNG',
  'COOLDOWN_ACTIVE',
  'VOTE_CHANGE_DISABLED',
  'INVALID_OPTION'
);

// Generator for valid ModerationStats
const moderationStatsArb = fc.record({
  totalAttempts: fc.integer({ min: 0, max: 10000 }),
  acceptedVotes: fc.integer({ min: 0, max: 10000 }),
  rejectedByReason: fc.record({
    ACCOUNT_TOO_YOUNG: fc.integer({ min: 0, max: 1000 }),
    COOLDOWN_ACTIVE: fc.integer({ min: 0, max: 1000 }),
    VOTE_CHANGE_DISABLED: fc.integer({ min: 0, max: 1000 }),
    INVALID_OPTION: fc.integer({ min: 0, max: 1000 }),
  }),
  acceptanceRate: fc.double({ min: 0, max: 100 }),
}).filter(stats => stats.acceptedVotes <= stats.totalAttempts);

/**
 * **Feature: vote-moderation, Property 12: Statistics accuracy**
 * 
 * *For any* poll state, the acceptance rate equals (acceptedVotes / totalAttempts) × 100,
 * and the sum of rejectedByReason values plus acceptedVotes equals totalAttempts.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
describe('Property 12: Statistics accuracy', () => {
  it('should calculate acceptance rate as (acceptedVotes / totalAttempts) * 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }), // totalAttempts (at least 1 to avoid division by zero)
        fc.integer({ min: 0, max: 10000 }), // acceptedVotes
        (totalAttempts, acceptedVotes) => {
          // Ensure acceptedVotes <= totalAttempts
          const validAcceptedVotes = Math.min(acceptedVotes, totalAttempts);
          
          const stats: ModerationStats = {
            totalAttempts,
            acceptedVotes: validAcceptedVotes,
            rejectedByReason: {
              ACCOUNT_TOO_YOUNG: 0,
              COOLDOWN_ACTIVE: 0,
              VOTE_CHANGE_DISABLED: 0,
              INVALID_OPTION: 0,
            },
            acceptanceRate: 0,
          };
          
          const rate = calculateAcceptanceRate(stats);
          const expectedRate = (validAcceptedVotes / totalAttempts) * 100;
          
          expect(rate).toBeCloseTo(expectedRate, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 100% acceptance rate when totalAttempts is 0', () => {
    fc.assert(
      fc.property(
        fc.constant(0), // totalAttempts = 0
        () => {
          const stats: ModerationStats = {
            ...DEFAULT_MODERATION_STATS,
            totalAttempts: 0,
            acceptedVotes: 0,
          };
          
          expect(calculateAcceptanceRate(stats)).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain invariant: acceptedVotes + sum(rejectedByReason) = totalAttempts after updates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            isAccepted: fc.boolean(),
            reason: rejectionReasonArb,
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (voteAttempts) => {
          let stats = { ...DEFAULT_MODERATION_STATS };
          
          // Apply all vote attempts
          for (const attempt of voteAttempts) {
            stats = updateStats(
              stats,
              attempt.isAccepted,
              attempt.isAccepted ? undefined : attempt.reason
            );
          }
          
          // Calculate sum of rejected votes
          const totalRejected = Object.values(stats.rejectedByReason).reduce(
            (sum, count) => sum + count,
            0
          );
          
          // Invariant: acceptedVotes + totalRejected = totalAttempts
          expect(stats.acceptedVotes + totalRejected).toBe(stats.totalAttempts);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increment totalAttempts by 1 for each vote attempt', () => {
    fc.assert(
      fc.property(
        moderationStatsArb,
        fc.boolean(), // isAccepted
        rejectionReasonArb, // reason
        (initialStats, isAccepted, reason) => {
          const newStats = updateStats(
            initialStats,
            isAccepted,
            isAccepted ? undefined : reason
          );
          
          expect(newStats.totalAttempts).toBe(initialStats.totalAttempts + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increment acceptedVotes by 1 when vote is accepted', () => {
    fc.assert(
      fc.property(
        moderationStatsArb,
        (initialStats) => {
          const newStats = updateStats(initialStats, true);
          
          expect(newStats.acceptedVotes).toBe(initialStats.acceptedVotes + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not change acceptedVotes when vote is rejected', () => {
    fc.assert(
      fc.property(
        moderationStatsArb,
        rejectionReasonArb,
        (initialStats, reason) => {
          const newStats = updateStats(initialStats, false, reason);
          
          expect(newStats.acceptedVotes).toBe(initialStats.acceptedVotes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increment the correct rejection reason counter when vote is rejected', () => {
    fc.assert(
      fc.property(
        moderationStatsArb,
        rejectionReasonArb,
        (initialStats, reason) => {
          const newStats = updateStats(initialStats, false, reason);
          
          // The specific reason counter should be incremented by 1
          expect(newStats.rejectedByReason[reason]).toBe(
            initialStats.rejectedByReason[reason] + 1
          );
          
          // Other reason counters should remain unchanged
          const otherReasons: RejectionReason[] = [
            'ACCOUNT_TOO_YOUNG',
            'COOLDOWN_ACTIVE',
            'VOTE_CHANGE_DISABLED',
            'INVALID_OPTION',
          ].filter(r => r !== reason) as RejectionReason[];
          
          for (const otherReason of otherReasons) {
            expect(newStats.rejectedByReason[otherReason]).toBe(
              initialStats.rejectedByReason[otherReason]
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly update acceptance rate after each vote attempt', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }), // sequence of accepted/rejected votes
        (voteResults) => {
          let stats = { ...DEFAULT_MODERATION_STATS };
          
          for (const isAccepted of voteResults) {
            stats = updateStats(
              stats,
              isAccepted,
              isAccepted ? undefined : 'ACCOUNT_TOO_YOUNG'
            );
          }
          
          const expectedRate = (stats.acceptedVotes / stats.totalAttempts) * 100;
          expect(stats.acceptanceRate).toBeCloseTo(expectedRate, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: vote-moderation, Property 13: Warning threshold trigger**
 * 
 * *For any* poll where acceptance rate < 50%, the warning indicator is displayed;
 * for acceptance rate >= 50%, the warning is not displayed.
 * 
 * **Validates: Requirements 5.4**
 */
describe('Property 13: Warning threshold trigger', () => {
  it('should show warning when acceptance rate is below 50%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.999999, noNaN: true }), // acceptanceRate below 50%
        (acceptanceRate) => {
          expect(shouldShowWarning(acceptanceRate)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not show warning when acceptance rate is 50% or above', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 100 }), // acceptanceRate at or above 50%
        (acceptanceRate) => {
          expect(shouldShowWarning(acceptanceRate)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly determine warning based on calculated acceptance rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // totalAttempts
        fc.integer({ min: 0, max: 1000 }), // acceptedVotes
        (totalAttempts, acceptedVotes) => {
          // Ensure acceptedVotes <= totalAttempts
          const validAcceptedVotes = Math.min(acceptedVotes, totalAttempts);
          
          const stats: ModerationStats = {
            totalAttempts,
            acceptedVotes: validAcceptedVotes,
            rejectedByReason: {
              ACCOUNT_TOO_YOUNG: 0,
              COOLDOWN_ACTIVE: 0,
              VOTE_CHANGE_DISABLED: 0,
              INVALID_OPTION: 0,
            },
            acceptanceRate: 0,
          };
          
          const rate = calculateAcceptanceRate(stats);
          const showWarning = shouldShowWarning(rate);
          
          // Warning should be shown if and only if rate < 50
          expect(showWarning).toBe(rate < 50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary case at exactly 50%', () => {
    // Exactly 50% should NOT show warning
    expect(shouldShowWarning(50)).toBe(false);
  });

  it('should handle edge case at 0% acceptance rate', () => {
    expect(shouldShowWarning(0)).toBe(true);
  });

  it('should handle edge case at 100% acceptance rate', () => {
    expect(shouldShowWarning(100)).toBe(false);
  });
});
