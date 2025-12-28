/**
 * Property-based tests for ModerationService
 * 
 * Uses fast-check for property-based testing to validate universal properties
 * of the moderation system.
 * 
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ModerationService, VoteInput } from '../../src/application/services/ModerationService';
import { ModerationConfig } from '../../src/domain/entities/ModerationConfig';

// ============ ARBITRARIES ============

// Generate valid user IDs
const userIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

// Generate valid usernames
const usernameArb = fc.string({ minLength: 3, maxLength: 25 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s));

// Generate account age in days (0-3650, ~10 years)
const accountAgeDaysArb = fc.integer({ min: 0, max: 3650 });

// Generate a valid VoteInput
const voteInputArb = (validOptionIds: number[]): fc.Arbitrary<VoteInput> => fc.record({
  userId: userIdArb,
  username: usernameArb,
  optionId: fc.constantFrom(...validOptionIds),
  isSubscriber: fc.boolean(),
  isFollower: fc.boolean(),
  accountAgeDays: accountAgeDaysArb,
});

// Generate a VoteInput with invalid option
const invalidOptionVoteInputArb = (validOptionIds: number[]): fc.Arbitrary<VoteInput> => fc.record({
  userId: userIdArb,
  username: usernameArb,
  optionId: fc.integer({ min: 100, max: 999 }), // IDs outside valid range
  isSubscriber: fc.boolean(),
  isFollower: fc.boolean(),
  accountAgeDays: fc.integer({ min: 30, max: 3650 }), // Old enough account
});

// Generate moderation config
const moderationConfigArb: fc.Arbitrary<ModerationConfig> = fc.record({
  minAccountAgeDays: fc.integer({ min: 0, max: 365 }),
  voteChangeEnabled: fc.boolean(),
  voteChangeCooldownSeconds: fc.integer({ min: 0, max: 3600 }),
  weights: fc.record({
    subscriber: fc.integer({ min: 1, max: 5 }),
    follower: fc.integer({ min: 1, max: 5 }),
    regular: fc.constant(1),
  }),
  whitelist: fc.record({
    enabled: fc.constant(false),
    usernames: fc.constant([]),
  }),
  blacklist: fc.record({
    enabled: fc.constant(false),
    usernames: fc.constant([]),
  }),
});

// ============ TESTS ============

describe('ModerationService Property Tests', () => {
  const validOptionIds = [1, 2, 3, 4, 5];

  describe('Property 1: Validation Consistency - Valid votes are accepted', () => {
    /**
     * For any vote with a valid option and sufficiently old account,
     * the vote should be accepted.
     * 
     * @validates Requirements 1.1, 1.2, 1.3
     */
    it('should accept votes with valid options and old enough accounts', () => {
      fc.assert(
        fc.property(
          voteInputArb(validOptionIds),
          fc.integer({ min: 0, max: 30 }), // minAccountAgeDays config
          (input, minAge) => {
            // Ensure account is old enough
            const adjustedInput = {
              ...input,
              accountAgeDays: minAge + 100, // Always older than minimum
            };

            const service = new ModerationService({ minAccountAgeDays: minAge });
            const result = service.processVote(adjustedInput, validOptionIds);

            expect(result.isValid).toBe(true);
            expect(result.weight).toBeGreaterThanOrEqual(1);
            expect(result.rejectionReason).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Validation Consistency - Invalid options are rejected', () => {
    /**
     * For any vote with an invalid option ID, the vote should be rejected
     * with INVALID_OPTION reason.
     * 
     * @validates Requirements 1.1, 1.6
     */
    it('should reject votes with invalid option IDs', () => {
      fc.assert(
        fc.property(
          invalidOptionVoteInputArb(validOptionIds),
          (input) => {
            const service = new ModerationService();
            const result = service.processVote(input, validOptionIds);

            expect(result.isValid).toBe(false);
            expect(result.rejectionReason).toBe('INVALID_OPTION');
            expect(result.weight).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Account age filtering', () => {
    /**
     * For any account younger than minAccountAgeDays, the vote should be
     * rejected with ACCOUNT_TOO_YOUNG reason.
     * 
     * @validates Requirements 1.2, 1.3
     */
    it('should reject votes from accounts younger than minimum age', () => {
      fc.assert(
        fc.property(
          voteInputArb(validOptionIds),
          fc.integer({ min: 10, max: 365 }), // minAccountAgeDays (positive)
          (input, minAge) => {
            // Ensure account is younger than minimum
            const adjustedInput = {
              ...input,
              accountAgeDays: Math.max(0, minAge - 5), // Always younger
            };

            const service = new ModerationService({ minAccountAgeDays: minAge });
            const result = service.processVote(adjustedInput, validOptionIds);

            expect(result.isValid).toBe(false);
            expect(result.rejectionReason).toBe('ACCOUNT_TOO_YOUNG');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all accounts when minAccountAgeDays is 0', () => {
      fc.assert(
        fc.property(
          voteInputArb(validOptionIds),
          (input) => {
            const service = new ModerationService({ minAccountAgeDays: 0 });
            const result = service.processVote(input, validOptionIds);

            // Should not be rejected for account age
            expect(result.rejectionReason).not.toBe('ACCOUNT_TOO_YOUNG');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Statistics Accuracy - Total attempts', () => {
    /**
     * totalAttempts should equal acceptedVotes + sum of all rejectedByReason counts.
     * 
     * @validates Requirements 1.4
     */
    it('should maintain accurate total attempts count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 30 }), // Number of valid votes
          fc.integer({ min: 0, max: 15 }), // Number of invalid votes
          (validCount, invalidCount) => {
            // Create fresh service with vote change enabled to avoid duplicate rejections
            const service = new ModerationService({ 
              minAccountAgeDays: 0,
              voteChangeEnabled: true, // Allow vote changes to simplify counting
            });

            // Process valid votes with unique user IDs
            for (let i = 0; i < validCount; i++) {
              service.processVote({
                userId: `valid_user_${i}`,
                username: `user${i}`,
                optionId: validOptionIds[i % validOptionIds.length],
                isSubscriber: false,
                isFollower: false,
                accountAgeDays: 100,
              }, validOptionIds);
            }

            // Process invalid votes with unique user IDs
            for (let i = 0; i < invalidCount; i++) {
              service.processVote({
                userId: `invalid_user_${i}`,
                username: `baduser${i}`,
                optionId: 999, // Invalid option
                isSubscriber: false,
                isFollower: false,
                accountAgeDays: 100,
              }, validOptionIds);
            }

            const stats = service.getStats();
            const totalRejected = Object.values(stats.rejectedByReason).reduce((a, b) => a + b, 0);

            expect(stats.totalAttempts).toBe(stats.acceptedVotes + totalRejected);
            expect(stats.totalAttempts).toBe(validCount + invalidCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Statistics Accuracy - Acceptance rate', () => {
    /**
     * acceptanceRate should equal (acceptedVotes / totalAttempts) * 100.
     * 
     * @validates Requirements 1.4
     */
    it('should calculate correct acceptance rate', () => {
      fc.assert(
        fc.property(
          fc.array(voteInputArb(validOptionIds), { minLength: 1, maxLength: 30 }),
          (inputs) => {
            const service = new ModerationService({ minAccountAgeDays: 0 });

            // Process votes with unique user IDs
            inputs.forEach((input, i) => {
              service.processVote({ ...input, userId: `user_${i}`, accountAgeDays: 100 }, validOptionIds);
            });

            const stats = service.getStats();
            const expectedRate = stats.totalAttempts > 0
              ? (stats.acceptedVotes / stats.totalAttempts) * 100
              : 0;

            expect(stats.acceptanceRate).toBeCloseTo(expectedRate, 5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Preset Round-Trip - Save and Load', () => {
    /**
     * savePreset followed by loadPreset should return equivalent config.
     * 
     * @validates Requirements 1.5
     */
    it('should preserve config through save/load cycle', () => {
      // Mock localStorage
      const storage = new Map<string, string>();
      const originalLocalStorage = global.localStorage;
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
        },
        writable: true,
      });

      try {
        fc.assert(
          fc.property(
            moderationConfigArb,
            fc.string({ minLength: 1, maxLength: 50 }),
            (config, presetName) => {
              storage.clear();
              
              const service = new ModerationService();
              service.setConfig(config);

              const presetId = service.savePreset(presetName);
              
              // Create new service and load preset
              const service2 = new ModerationService();
              const loadedConfig = service2.loadPreset(presetId);

              expect(loadedConfig).not.toBeNull();
              expect(loadedConfig!.minAccountAgeDays).toBe(config.minAccountAgeDays);
              expect(loadedConfig!.voteChangeEnabled).toBe(config.voteChangeEnabled);
              expect(loadedConfig!.voteChangeCooldownSeconds).toBe(config.voteChangeCooldownSeconds);
              expect(loadedConfig!.weights.subscriber).toBe(config.weights.subscriber);
              expect(loadedConfig!.weights.follower).toBe(config.weights.follower);
            }
          ),
          { numRuns: 50 }
        );
      } finally {
        Object.defineProperty(global, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
        });
      }
    });
  });

  describe('Property 7: Preset Round-Trip - Delete', () => {
    /**
     * deletePreset followed by loadPreset should return null.
     * 
     * @validates Requirements 1.5
     */
    it('should return null when loading deleted preset', () => {
      const storage = new Map<string, string>();
      const originalLocalStorage = global.localStorage;
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
        },
        writable: true,
      });

      try {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }),
            (presetName) => {
              storage.clear();
              
              const service = new ModerationService();
              const presetId = service.savePreset(presetName);

              // Delete the preset
              const deleted = service.deletePreset(presetId);
              expect(deleted).toBe(true);

              // Try to load deleted preset
              const loadedConfig = service.loadPreset(presetId);
              expect(loadedConfig).toBeNull();
            }
          ),
          { numRuns: 50 }
        );
      } finally {
        Object.defineProperty(global, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
        });
      }
    });
  });

  describe('Property 8: Vote change disabled', () => {
    /**
     * When voteChangeEnabled is false, second votes from same user should be rejected.
     * 
     * @validates Requirements 1.6
     */
    it('should reject vote changes when disabled', () => {
      fc.assert(
        fc.property(
          userIdArb,
          usernameArb,
          fc.constantFrom(1, 2),
          fc.constantFrom(3, 4),
          (userId, username, firstOption, secondOption) => {
            const service = new ModerationService({
              minAccountAgeDays: 0,
              voteChangeEnabled: false,
            });

            const input1: VoteInput = {
              userId,
              username,
              optionId: firstOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 100,
            };

            const input2: VoteInput = {
              userId,
              username,
              optionId: secondOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 100,
            };

            // First vote should succeed
            const result1 = service.processVote(input1, validOptionIds);
            expect(result1.isValid).toBe(true);

            // Second vote should be rejected
            const result2 = service.processVote(input2, validOptionIds);
            expect(result2.isValid).toBe(false);
            expect(result2.rejectionReason).toBe('VOTE_CHANGE_DISABLED');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: Weight calculation', () => {
    /**
     * Subscribers should get subscriber weight, followers should get follower weight,
     * and regular users should get regular weight (1).
     * 
     * @validates Requirements 1.1
     */
    it('should assign correct weights based on user type', () => {
      fc.assert(
        fc.property(
          voteInputArb(validOptionIds),
          fc.integer({ min: 1, max: 5 }), // subscriber weight
          fc.integer({ min: 1, max: 5 }), // follower weight
          (input, subWeight, followerWeight) => {
            const service = new ModerationService({
              minAccountAgeDays: 0,
              weights: {
                subscriber: subWeight,
                follower: followerWeight,
                regular: 1,
              },
            });

            const adjustedInput = { ...input, accountAgeDays: 100 };
            const result = service.processVote(adjustedInput, validOptionIds);

            if (result.isValid) {
              if (adjustedInput.isSubscriber) {
                expect(result.weight).toBe(subWeight);
              } else if (adjustedInput.isFollower) {
                expect(result.weight).toBe(followerWeight);
              } else {
                expect(result.weight).toBe(1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
