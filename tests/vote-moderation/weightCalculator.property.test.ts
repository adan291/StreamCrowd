/**
 * Property-based tests for Weight Calculator
 * Uses fast-check for property-based testing
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidWeight,
  calculateWeight,
  calculateWeightedTotal,
  ModerationConfig,
} from '../../services/voteModerationService';

describe('WeightCalculator Property Tests', () => {
  /**
   * **Feature: vote-moderation, Property 3: Vote weight bounds validation**
   *
   * *For any* weight configuration input, the system accepts the value
   * if and only if it is an integer between 1 and 5 inclusive.
   *
   * **Validates: Requirements 2.1**
   */
  describe('Property 3: Vote weight bounds validation', () => {
    it('should accept weights that are integers between 1 and 5 inclusive', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (weight) => {
            expect(isValidWeight(weight)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject weights less than 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),
          (weight) => {
            expect(isValidWeight(weight)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject weights greater than 5', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 6, max: 1000 }),
          (weight) => {
            expect(isValidWeight(weight)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-integer weights', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1.01, max: 4.99, noNaN: true }),
          (weight) => {
            // Only test non-integer values
            if (!Number.isInteger(weight)) {
              expect(isValidWeight(weight)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly validate any number against the 1-5 integer range', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: 100 }),
            fc.double({ min: -10, max: 10, noNaN: true })
          ),
          (weight) => {
            const result = isValidWeight(weight);
            const expected = Number.isInteger(weight) && weight >= 1 && weight <= 5;
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vote-moderation, Property 4: Vote weight calculation correctness**
   *
   * *For any* user with a known trust level (subscriber, follower, or regular)
   * and *any* valid weight configuration, the calculated vote weight equals
   * the configured weight for that trust level, with regular users always receiving weight 1.
   *
   * **Validates: Requirements 2.2, 2.3, 2.4**
   */
  describe('Property 4: Vote weight calculation correctness', () => {
    // Generator for valid weight configuration
    const validWeightConfigArb = fc.record({
      minAccountAgeDays: fc.integer({ min: 0, max: 365 }),
      voteChangeEnabled: fc.boolean(),
      voteChangeCooldownSeconds: fc.integer({ min: 0, max: 3600 }),
      weights: fc.record({
        subscriber: fc.integer({ min: 1, max: 5 }),
        follower: fc.integer({ min: 1, max: 5 }),
        regular: fc.constant(1), // Regular is always 1
      }),
    });

    it('should return subscriber weight when user is a subscriber', () => {
      fc.assert(
        fc.property(
          validWeightConfigArb,
          (config) => {
            const weight = calculateWeight(true, false, config);
            expect(weight).toBe(config.weights.subscriber);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return subscriber weight when user is both subscriber and follower', () => {
      fc.assert(
        fc.property(
          validWeightConfigArb,
          (config) => {
            // Subscriber takes priority over follower
            const weight = calculateWeight(true, true, config);
            expect(weight).toBe(config.weights.subscriber);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return follower weight when user is a follower but not subscriber', () => {
      fc.assert(
        fc.property(
          validWeightConfigArb,
          (config) => {
            const weight = calculateWeight(false, true, config);
            expect(weight).toBe(config.weights.follower);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return 1 for regular users (non-subscriber, non-follower)', () => {
      fc.assert(
        fc.property(
          validWeightConfigArb,
          (config) => {
            const weight = calculateWeight(false, false, config);
            // Regular users always get weight 1 regardless of config (Requirement 2.4)
            expect(weight).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate weight for any trust level combination', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isSubscriber
          fc.boolean(), // isFollower
          validWeightConfigArb,
          (isSubscriber, isFollower, config) => {
            const weight = calculateWeight(isSubscriber, isFollower, config);
            
            // Determine expected weight based on trust level priority
            let expected: number;
            if (isSubscriber) {
              expected = config.weights.subscriber;
            } else if (isFollower) {
              expected = config.weights.follower;
            } else {
              expected = 1; // Regular users always get 1
            }
            
            expect(weight).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vote-moderation, Property 5: Weighted totals display accuracy**
   *
   * *For any* poll with weighted votes, the displayed weighted total equals
   * the sum of (vote count × weight) for each vote.
   *
   * **Validates: Requirements 2.5**
   */
  describe('Property 5: Weighted totals display accuracy', () => {
    // Generator for vote records
    const voteRecordArb = fc.record({
      userId: fc.uuid(),
    });

    // Generator for array of vote records with unique userIds
    const uniqueVotesArb = fc.array(voteRecordArb, { minLength: 0, maxLength: 50 })
      .map(votes => {
        // Ensure unique userIds
        const seen = new Set<string>();
        return votes.filter(v => {
          if (seen.has(v.userId)) return false;
          seen.add(v.userId);
          return true;
        });
      });

    it('should return 0 for empty votes array', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          fc.constant(new Map<string, number>()),
          (votes, weights) => {
            const total = calculateWeightedTotal(votes, weights);
            expect(total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sum weights correctly for all votes', () => {
      fc.assert(
        fc.property(
          uniqueVotesArb,
          fc.integer({ min: 1, max: 5 }), // weight value
          (votes, weightValue) => {
            // Create weights map with same weight for all users
            const weights = new Map<string, number>();
            votes.forEach(v => weights.set(v.userId, weightValue));

            const total = calculateWeightedTotal(votes, weights);
            const expected = votes.length * weightValue;
            expect(total).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default weight of 1 for users not in weights map', () => {
      fc.assert(
        fc.property(
          uniqueVotesArb.filter(v => v.length > 0),
          (votes) => {
            // Empty weights map - all users should get default weight of 1
            const weights = new Map<string, number>();
            const total = calculateWeightedTotal(votes, weights);
            expect(total).toBe(votes.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate mixed weights', () => {
      fc.assert(
        fc.property(
          uniqueVotesArb.filter(v => v.length > 0),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
          (votes, weightValues) => {
            // Assign weights to votes
            const weights = new Map<string, number>();
            let expectedTotal = 0;
            
            votes.forEach((vote, index) => {
              const weight = weightValues[index % weightValues.length];
              weights.set(vote.userId, weight);
              expectedTotal += weight;
            });

            const total = calculateWeightedTotal(votes, weights);
            expect(total).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should equal sum of individual weights for each vote', () => {
      fc.assert(
        fc.property(
          uniqueVotesArb,
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
          (votes, weightValues) => {
            const weights = new Map<string, number>();
            votes.forEach((vote, index) => {
              weights.set(vote.userId, weightValues[index % weightValues.length]);
            });

            const total = calculateWeightedTotal(votes, weights);
            
            // Manually calculate expected total
            const expected = votes.reduce((sum, vote) => {
              return sum + (weights.get(vote.userId) ?? 1);
            }, 0);

            expect(total).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
