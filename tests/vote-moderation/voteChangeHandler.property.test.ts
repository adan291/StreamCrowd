/**
 * Property-based tests for Vote Change Handler
 * Uses fast-check for property-based testing
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  handleVoteChange,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  updateStats,
  RejectionReason,
} from '../../services/voteModerationService';

/**
 * Generator for a valid ModeratedPoll with configurable options
 */
const moderatedPollArbitrary = (numOptions: number = 4) =>
  fc.record({
    id: fc.uuid(),
    question: fc.string({ minLength: 1, maxLength: 100 }),
    options: fc.array(
      fc.record({
        id: fc.integer({ min: 1, max: 100 }),
        label: fc.string({ minLength: 1, maxLength: 50 }),
        votes: fc.integer({ min: 0, max: 10000 }),
        color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
      }),
      { minLength: numOptions, maxLength: numOptions }
    ).map(options => options.map((opt, idx) => ({ ...opt, id: idx + 1 }))), // Ensure unique sequential IDs
    isActive: fc.boolean(),
    totalVotes: fc.integer({ min: 0, max: 100000 }),
    startTime: fc.integer({ min: 0, max: Date.now() }),
    moderationConfig: fc.constant(DEFAULT_MODERATION_CONFIG),
    moderationStats: fc.constant(DEFAULT_MODERATION_STATS),
    moderationLog: fc.constant([]),
  });

/**
 * **Feature: vote-moderation, Property 11: Vote change count invariant**
 * 
 * *For any* successful vote change from option A to option B, the total vote count
 * remains unchanged, option A's count decreases by the user's weight, and option B's
 * count increases by the user's weight.
 * 
 * **Validates: Requirements 4.4**
 */
describe('Property 11: Vote change count invariant', () => {
  it('should preserve total vote count after vote change', () => {
    fc.assert(
      fc.property(
        moderatedPollArbitrary(4),
        fc.uuid(), // userId
        fc.integer({ min: 1, max: 5 }), // weight (valid range 1-5)
        (poll, userId, weight) => {
          // Ensure we have at least 2 options to change between
          if (poll.options.length < 2) return true;

          const oldOptionId = poll.options[0].id;
          const newOptionId = poll.options[1].id;

          // Calculate total votes before change
          const totalVotesBefore = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

          // Perform vote change
          const updatedPoll = handleVoteChange(poll, userId, oldOptionId, newOptionId, weight);

          // Calculate total votes after change
          const totalVotesAfter = updatedPoll.options.reduce((sum, opt) => sum + opt.votes, 0);

          // Total vote count should remain unchanged
          expect(totalVotesAfter).toBe(totalVotesBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should decrement old option count by weight', () => {
    fc.assert(
      fc.property(
        moderatedPollArbitrary(4),
        fc.uuid(), // userId
        fc.integer({ min: 1, max: 5 }), // weight
        (poll, userId, weight) => {
          if (poll.options.length < 2) return true;

          const oldOptionId = poll.options[0].id;
          const newOptionId = poll.options[1].id;
          const oldOptionVotesBefore = poll.options[0].votes;

          const updatedPoll = handleVoteChange(poll, userId, oldOptionId, newOptionId, weight);

          const oldOptionAfter = updatedPoll.options.find(opt => opt.id === oldOptionId);
          expect(oldOptionAfter?.votes).toBe(oldOptionVotesBefore - weight);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increment new option count by weight', () => {
    fc.assert(
      fc.property(
        moderatedPollArbitrary(4),
        fc.uuid(), // userId
        fc.integer({ min: 1, max: 5 }), // weight
        (poll, userId, weight) => {
          if (poll.options.length < 2) return true;

          const oldOptionId = poll.options[0].id;
          const newOptionId = poll.options[1].id;
          const newOptionVotesBefore = poll.options[1].votes;

          const updatedPoll = handleVoteChange(poll, userId, oldOptionId, newOptionId, weight);

          const newOptionAfter = updatedPoll.options.find(opt => opt.id === newOptionId);
          expect(newOptionAfter?.votes).toBe(newOptionVotesBefore + weight);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not mutate the original poll', () => {
    fc.assert(
      fc.property(
        moderatedPollArbitrary(4),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        (poll, userId, weight) => {
          if (poll.options.length < 2) return true;

          const oldOptionId = poll.options[0].id;
          const newOptionId = poll.options[1].id;

          // Store original values
          const originalOldVotes = poll.options[0].votes;
          const originalNewVotes = poll.options[1].votes;

          // Perform vote change
          handleVoteChange(poll, userId, oldOptionId, newOptionId, weight);

          // Original poll should be unchanged
          expect(poll.options[0].votes).toBe(originalOldVotes);
          expect(poll.options[1].votes).toBe(originalNewVotes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle vote changes with any valid weight value (1-5)', () => {
    fc.assert(
      fc.property(
        moderatedPollArbitrary(4),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }), // All valid weights
        (poll, userId, weight) => {
          if (poll.options.length < 2) return true;

          const oldOptionId = poll.options[0].id;
          const newOptionId = poll.options[1].id;

          const oldVotesBefore = poll.options[0].votes;
          const newVotesBefore = poll.options[1].votes;

          const updatedPoll = handleVoteChange(poll, userId, oldOptionId, newOptionId, weight);

          const oldOptionAfter = updatedPoll.options.find(opt => opt.id === oldOptionId);
          const newOptionAfter = updatedPoll.options.find(opt => opt.id === newOptionId);

          // Verify the exact change amounts
          expect(oldOptionAfter?.votes).toBe(oldVotesBefore - weight);
          expect(newOptionAfter?.votes).toBe(newVotesBefore + weight);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: vote-moderation, Property 2: Rejection counter invariant**
 * 
 * *For any* sequence of vote attempts, the rejection counter equals the count
 * of votes where isValid is false.
 * 
 * **Validates: Requirements 1.4**
 */
describe('Property 2: Rejection counter invariant', () => {
  // Generator for valid rejection reasons
  const rejectionReasonArb = fc.constantFrom<RejectionReason>(
    'ACCOUNT_TOO_YOUNG',
    'COOLDOWN_ACTIVE',
    'VOTE_CHANGE_DISABLED',
    'INVALID_OPTION'
  );

  // Generator for vote attempt results
  const voteAttemptArb = fc.record({
    isValid: fc.boolean(),
    reason: rejectionReasonArb,
  });

  it('should have rejection counter equal to count of invalid votes', () => {
    fc.assert(
      fc.property(
        fc.array(voteAttemptArb, { minLength: 1, maxLength: 100 }),
        (voteAttempts) => {
          let stats = { ...DEFAULT_MODERATION_STATS };

          // Process all vote attempts
          for (const attempt of voteAttempts) {
            stats = updateStats(
              stats,
              attempt.isValid,
              attempt.isValid ? undefined : attempt.reason
            );
          }

          // Count invalid votes from the input
          const invalidVoteCount = voteAttempts.filter(v => !v.isValid).length;

          // Sum of all rejection counters
          const totalRejections = Object.values(stats.rejectedByReason).reduce(
            (sum, count) => sum + count,
            0
          );

          // Rejection counter should equal count of invalid votes
          expect(totalRejections).toBe(invalidVoteCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increment rejection counter for each rejected vote', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // number of rejections
        rejectionReasonArb,
        (numRejections, reason) => {
          let stats = { ...DEFAULT_MODERATION_STATS };

          // Apply rejections
          for (let i = 0; i < numRejections; i++) {
            stats = updateStats(
              stats,
              false,
              reason
            );
          }

          // The specific reason counter should equal the number of rejections
          expect(stats.rejectedByReason[reason]).toBe(numRejections);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not increment rejection counter for accepted votes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // number of accepted votes
        (numAccepted) => {
          let stats = { ...DEFAULT_MODERATION_STATS };

          // Apply accepted votes
          for (let i = 0; i < numAccepted; i++) {
            stats = updateStats(
              stats,
              true
            );
          }

          // All rejection counters should remain at 0
          const totalRejections = Object.values(stats.rejectedByReason).reduce(
            (sum, count) => sum + count,
            0
          );

          expect(totalRejections).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly track rejections by reason in mixed sequences', () => {
    fc.assert(
      fc.property(
        fc.array(voteAttemptArb, { minLength: 1, maxLength: 100 }),
        (voteAttempts) => {
          let stats = { ...DEFAULT_MODERATION_STATS };

          // Count expected rejections by reason
          const expectedCounts: Record<string, number> = {
            ACCOUNT_TOO_YOUNG: 0,
            COOLDOWN_ACTIVE: 0,
            VOTE_CHANGE_DISABLED: 0,
            INVALID_OPTION: 0,
          };

          for (const attempt of voteAttempts) {
            if (!attempt.isValid) {
              expectedCounts[attempt.reason]++;
            }
            stats = updateStats(
              stats,
              attempt.isValid,
              attempt.isValid ? undefined : attempt.reason
            );
          }

          // Verify each rejection reason counter matches expected
          expect(stats.rejectedByReason.ACCOUNT_TOO_YOUNG).toBe(expectedCounts.ACCOUNT_TOO_YOUNG);
          expect(stats.rejectedByReason.COOLDOWN_ACTIVE).toBe(expectedCounts.COOLDOWN_ACTIVE);
          expect(stats.rejectedByReason.VOTE_CHANGE_DISABLED).toBe(expectedCounts.VOTE_CHANGE_DISABLED);
          expect(stats.rejectedByReason.INVALID_OPTION).toBe(expectedCounts.INVALID_OPTION);
        }
      ),
      { numRuns: 100 }
    );
  });
});
