/**
 * Property-based tests for Vote Validator
 * Uses fast-check for property-based testing
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateAccountAge, validateCooldown, canChangeVote } from '../../services/voteModerationService';

describe('VoteValidator Property Tests', () => {
  /**
   * **Feature: vote-moderation, Property 1: Account age filtering correctness**
   * 
   * *For any* user account age and *any* configured minimum age threshold,
   * a vote is accepted if and only if the account age is greater than or equal
   * to the threshold, with the special case that threshold 0 accepts all accounts.
   * 
   * **Validates: Requirements 1.2, 1.3**
   */
  describe('Property 1: Account age filtering correctness', () => {
    it('should accept all accounts when minAge is 0 regardless of account age', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }), // accountAgeDays
          (accountAgeDays) => {
            // When minAge is 0, all accounts should be accepted (Requirement 1.3)
            expect(validateAccountAge(accountAgeDays, 0)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept accounts with age >= minAge when minAge > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // minAge (positive threshold)
          fc.integer({ min: 0, max: 10000 }), // accountAgeDays
          (minAge, accountAgeDays) => {
            const result = validateAccountAge(accountAgeDays, minAge);
            // Account should be accepted if and only if age >= minAge (Requirement 1.2)
            expect(result).toBe(accountAgeDays >= minAge);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject accounts younger than minAge', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // minAge (positive threshold)
          (minAge) => {
            // Generate an account age strictly less than minAge
            const accountAgeDays = minAge - 1;
            if (accountAgeDays >= 0) {
              expect(validateAccountAge(accountAgeDays, minAge)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept accounts exactly at the threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // minAge
          (minAge) => {
            // Account age exactly equal to minAge should be accepted
            expect(validateAccountAge(minAge, minAge)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


  /**
   * **Feature: vote-moderation, Property 9: Cooldown enforcement**
   * 
   * *For any* vote change attempt where (current time - last vote time) < cooldown period,
   * the change is rejected and the original vote is preserved.
   * 
   * **Validates: Requirements 4.2**
   */
  describe('Property 9: Cooldown enforcement', () => {
    it('should reject vote changes when cooldown has not expired', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3600 }), // cooldownSeconds (1 second to 1 hour)
          fc.integer({ min: 1000, max: 1000000 }), // lastVoteTime (timestamp)
          (cooldownSeconds, lastVoteTime) => {
            // Current time is less than cooldown period after last vote
            const currentTime = lastVoteTime + (cooldownSeconds * 1000) - 1;
            expect(validateCooldown(lastVoteTime, cooldownSeconds, currentTime)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow vote changes when cooldown has expired', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3600 }), // cooldownSeconds
          fc.integer({ min: 1000, max: 1000000 }), // lastVoteTime
          fc.integer({ min: 0, max: 10000 }), // extra time after cooldown
          (cooldownSeconds, lastVoteTime, extraTime) => {
            // Current time is at or after cooldown period
            const currentTime = lastVoteTime + (cooldownSeconds * 1000) + extraTime;
            expect(validateCooldown(lastVoteTime, cooldownSeconds, currentTime)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow first vote when user has never voted (lastVoteTime = 0)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3600 }), // cooldownSeconds
          fc.integer({ min: 1000, max: 1000000 }), // currentTime
          (cooldownSeconds, currentTime) => {
            // First vote should always be allowed
            expect(validateCooldown(0, cooldownSeconds, currentTime)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow vote exactly at cooldown boundary', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3600 }), // cooldownSeconds
          fc.integer({ min: 1000, max: 1000000 }), // lastVoteTime
          (cooldownSeconds, lastVoteTime) => {
            // Current time is exactly at cooldown boundary
            const currentTime = lastVoteTime + (cooldownSeconds * 1000);
            expect(validateCooldown(lastVoteTime, cooldownSeconds, currentTime)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: vote-moderation, Property 10: Vote change prevention when disabled**
   * 
   * *For any* user who has already voted, when vote changing is disabled,
   * all subsequent vote attempts from that user are rejected.
   * 
   * **Validates: Requirements 4.3**
   */
  describe('Property 10: Vote change prevention when disabled', () => {
    it('should reject vote changes when vote changing is disabled and user has voted', () => {
      fc.assert(
        fc.property(
          fc.constant(true), // hasVoted = true (user has already voted)
          fc.constant(false), // voteChangeEnabled = false
          (hasVoted, voteChangeEnabled) => {
            // When user has voted and vote changing is disabled, should reject
            expect(canChangeVote(hasVoted, voteChangeEnabled)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow vote changes when vote changing is enabled and user has voted', () => {
      fc.assert(
        fc.property(
          fc.constant(true), // hasVoted = true
          fc.constant(true), // voteChangeEnabled = true
          (hasVoted, voteChangeEnabled) => {
            // When user has voted and vote changing is enabled, should allow
            expect(canChangeVote(hasVoted, voteChangeEnabled)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always allow first vote regardless of voteChangeEnabled setting', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // voteChangeEnabled (any value)
          (voteChangeEnabled) => {
            // First vote (hasVoted = false) should always be allowed
            expect(canChangeVote(false, voteChangeEnabled)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly handle all combinations of hasVoted and voteChangeEnabled', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // hasVoted
          fc.boolean(), // voteChangeEnabled
          (hasVoted, voteChangeEnabled) => {
            const result = canChangeVote(hasVoted, voteChangeEnabled);
            // If user hasn't voted, always allow
            // If user has voted, only allow if vote changing is enabled
            const expected = !hasVoted || voteChangeEnabled;
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
