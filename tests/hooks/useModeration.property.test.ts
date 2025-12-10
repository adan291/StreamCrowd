/**
 * Property-based tests for useModeration hook
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useModeration, VoteContext } from '../../hooks/useModeration';
import { DEFAULT_MODERATION_STATS, ModerationConfig } from '../../types';

// Arbitrary for generating valid vote contexts
const voteContextArb = (validOptionIds: number[]): fc.Arbitrary<VoteContext> => fc.record({
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  optionId: fc.constantFrom(...validOptionIds),
  isSubscriber: fc.boolean(),
  isFollower: fc.boolean(),
  accountAgeDays: fc.option(fc.integer({ min: 0, max: 3650 }), { nil: undefined }),
});

// Arbitrary for generating invalid vote contexts (invalid option IDs)
const invalidVoteContextArb = (validOptionIds: number[]): fc.Arbitrary<VoteContext> => fc.record({
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  optionId: fc.integer({ min: 100, max: 999 }), // IDs that won't be in validOptionIds
  isSubscriber: fc.boolean(),
  isFollower: fc.boolean(),
  accountAgeDays: fc.option(fc.integer({ min: 0, max: 3650 }), { nil: undefined }),
});

// Arbitrary for generating moderation configs
const moderationConfigArb: fc.Arbitrary<ModerationConfig> = fc.record({
  minAccountAgeDays: fc.integer({ min: 0, max: 365 }),
  voteChangeEnabled: fc.boolean(),
  voteChangeCooldownSeconds: fc.integer({ min: 0, max: 3600 }),
  weights: fc.record({
    subscriber: fc.integer({ min: 1, max: 5 }),
    follower: fc.integer({ min: 1, max: 5 }),
    regular: fc.constant(1),
  }),
});

// Arbitrary for generating vote contexts that will be rejected due to account age
const youngAccountVoteContextArb = (validOptionIds: number[], minAge: number): fc.Arbitrary<VoteContext> => fc.record({
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  optionId: fc.constantFrom(...validOptionIds),
  isSubscriber: fc.boolean(),
  isFollower: fc.boolean(),
  accountAgeDays: fc.integer({ min: 0, max: Math.max(0, minAge - 1) }),
});


describe('useModeration Property Tests', () => {
  // Standard valid option IDs for testing
  const validOptionIds = [1, 2, 3, 4, 5];

  /**
   * **Feature: app-refactoring, Property 6: useModeration Vote Processing Updates Stats**
   * 
   * *For any* vote processed through moderation, the stats should reflect the outcome
   * (accepted count increases for valid votes, rejected count increases for invalid votes).
   * 
   * **Validates: Requirements 2.2**
   */
  describe('Property 6: useModeration Vote Processing Updates Stats', () => {
    it('should increment acceptedVotes for valid votes', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 20 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Use unique user IDs to avoid vote change logic
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}_${ctx.userId}`,
              accountAgeDays: 365, // Ensure account is old enough
            }));
            
            let acceptedCount = 0;
            
            for (const context of uniqueContexts) {
              act(() => {
                const res = result.current.processVote(context, validOptionIds);
                if (res.isValid) {
                  acceptedCount++;
                }
              });
            }
            
            // Stats should reflect accepted votes
            expect(result.current.stats.acceptedVotes).toBe(acceptedCount);
            expect(result.current.stats.totalAttempts).toBe(uniqueContexts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increment rejected count for invalid option votes', () => {
      fc.assert(
        fc.property(
          fc.array(invalidVoteContextArb(validOptionIds), { minLength: 1, maxLength: 10 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            for (const context of voteContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // All votes should be rejected due to invalid option
            expect(result.current.stats.rejectedByReason.INVALID_OPTION).toBe(voteContexts.length);
            expect(result.current.stats.acceptedVotes).toBe(0);
            expect(result.current.stats.totalAttempts).toBe(voteContexts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate correct acceptance rate', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 10 }),
          fc.array(invalidVoteContextArb(validOptionIds), { minLength: 0, maxLength: 10 }),
          (validContexts, invalidContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Process valid votes with unique user IDs
            const uniqueValidContexts = validContexts.map((ctx, i) => ({
              ...ctx,
              userId: `valid_user_${i}`,
              accountAgeDays: 365,
            }));
            
            let acceptedCount = 0;
            
            for (const context of uniqueValidContexts) {
              act(() => {
                const res = result.current.processVote(context, validOptionIds);
                if (res.isValid) acceptedCount++;
              });
            }
            
            // Process invalid votes
            for (const context of invalidContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            const totalAttempts = uniqueValidContexts.length + invalidContexts.length;
            const expectedRate = totalAttempts > 0 
              ? (acceptedCount / totalAttempts) * 100 
              : 100;
            
            expect(result.current.stats.acceptanceRate).toBeCloseTo(expectedRate, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track vote changes in stats', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...validOptionIds),
          fc.constantFrom(...validOptionIds),
          (userId, username, firstOption, secondOption) => {
            // Skip if same option (not a real change)
            if (firstOption === secondOption) return;
            
            const { result } = renderHook(() => useModeration());
            
            // Enable vote changes
            act(() => {
              result.current.setConfig({
                ...result.current.config,
                voteChangeEnabled: true,
                voteChangeCooldownSeconds: 0,
              });
            });
            
            const context1: VoteContext = {
              userId,
              username,
              optionId: firstOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 365,
            };
            
            const context2: VoteContext = {
              userId,
              username,
              optionId: secondOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 365,
            };
            
            // First vote
            act(() => {
              result.current.processVote(context1, validOptionIds);
            });
            
            // Vote change
            act(() => {
              result.current.processVote(context2, validOptionIds);
            });
            
            // Both should be counted as accepted (vote change is still accepted)
            expect(result.current.stats.acceptedVotes).toBe(2);
            expect(result.current.stats.totalAttempts).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: app-refactoring, Property 7: useModeration Rejection Logging**
   * 
   * *For any* rejected vote, the moderation log should contain an entry
   * with the correct rejection reason.
   * 
   * **Validates: Requirements 2.4**
   */
  describe('Property 7: useModeration Rejection Logging', () => {
    it('should log INVALID_OPTION rejection with correct reason', () => {
      fc.assert(
        fc.property(
          invalidVoteContextArb(validOptionIds),
          (context) => {
            const { result } = renderHook(() => useModeration());
            
            act(() => {
              result.current.processVote(context, validOptionIds);
            });
            
            // Log should contain the rejection
            expect(result.current.log.length).toBe(1);
            expect(result.current.log[0].action).toBe('REJECTED');
            expect(result.current.log[0].reason).toBe('INVALID_OPTION');
            expect(result.current.log[0].userId).toBe(context.userId);
            expect(result.current.log[0].username).toBe(context.username);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log ACCOUNT_TOO_YOUNG rejection when account age filter is active', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 365 }), // minAccountAgeDays
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...validOptionIds),
          (minAge, userId, username, optionId) => {
            const { result } = renderHook(() => useModeration());
            
            // Set config with account age requirement
            act(() => {
              result.current.setConfig({
                ...result.current.config,
                minAccountAgeDays: minAge,
              });
            });
            
            const context: VoteContext = {
              userId,
              username,
              optionId,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: minAge - 1, // Account is too young
            };
            
            act(() => {
              result.current.processVote(context, validOptionIds);
            });
            
            // Log should contain the rejection
            expect(result.current.log.length).toBe(1);
            expect(result.current.log[0].action).toBe('REJECTED');
            expect(result.current.log[0].reason).toBe('ACCOUNT_TOO_YOUNG');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log VOTE_CHANGE_DISABLED rejection when vote change is disabled', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(1, 2),
          fc.constantFrom(3, 4),
          (userId, username, firstOption, secondOption) => {
            const { result } = renderHook(() => useModeration());
            
            // Disable vote changes
            act(() => {
              result.current.setConfig({
                ...result.current.config,
                voteChangeEnabled: false,
              });
            });
            
            const context1: VoteContext = {
              userId,
              username,
              optionId: firstOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 365,
            };
            
            const context2: VoteContext = {
              userId,
              username,
              optionId: secondOption,
              isSubscriber: false,
              isFollower: false,
              accountAgeDays: 365,
            };
            
            // First vote should succeed
            act(() => {
              result.current.processVote(context1, validOptionIds);
            });
            
            // Second vote should be rejected
            act(() => {
              result.current.processVote(context2, validOptionIds);
            });
            
            // Log should contain both entries
            expect(result.current.log.length).toBe(2);
            expect(result.current.log[0].action).toBe('ACCEPTED');
            expect(result.current.log[1].action).toBe('REJECTED');
            expect(result.current.log[1].reason).toBe('VOTE_CHANGE_DISABLED');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all rejection reasons correctly in sequence', () => {
      fc.assert(
        fc.property(
          fc.array(invalidVoteContextArb(validOptionIds), { minLength: 1, maxLength: 10 }),
          (contexts) => {
            const { result } = renderHook(() => useModeration());
            
            for (const context of contexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // All log entries should have REJECTED action with INVALID_OPTION reason
            expect(result.current.log.length).toBe(contexts.length);
            result.current.log.forEach((entry, i) => {
              expect(entry.action).toBe('REJECTED');
              expect(entry.reason).toBe('INVALID_OPTION');
              expect(entry.userId).toBe(contexts[i].userId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: app-refactoring, Property 8: useModeration Reset Restores Defaults**
   * 
   * *For any* moderation state, resetting should restore stats to DEFAULT_MODERATION_STATS
   * and clear the log.
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Property 8: useModeration Reset Restores Defaults', () => {
    it('should restore stats to defaults on reset', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 20 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Process some votes with unique user IDs
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}`,
              accountAgeDays: 365,
            }));
            
            for (const context of uniqueContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // Verify stats have changed
            expect(result.current.stats.totalAttempts).toBeGreaterThan(0);
            
            // Reset
            act(() => {
              result.current.reset();
            });
            
            // Stats should be restored to defaults
            expect(result.current.stats).toEqual(DEFAULT_MODERATION_STATS);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear log on reset', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 20 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Process some votes with unique user IDs
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}`,
              accountAgeDays: 365,
            }));
            
            for (const context of uniqueContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // Verify log has entries
            expect(result.current.log.length).toBeGreaterThan(0);
            
            // Reset
            act(() => {
              result.current.reset();
            });
            
            // Log should be empty
            expect(result.current.log.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear userVoteStates on reset', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 10 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Process some votes with unique user IDs
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}`,
              accountAgeDays: 365,
            }));
            
            for (const context of uniqueContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // Verify userVoteStates has entries
            expect(result.current.userVoteStates.size).toBeGreaterThan(0);
            
            // Reset
            act(() => {
              result.current.reset();
            });
            
            // userVoteStates should be empty
            expect(result.current.userVoteStates.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear userWeights on reset', () => {
      fc.assert(
        fc.property(
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 10 }),
          (voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Process some votes with unique user IDs
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}`,
              accountAgeDays: 365,
            }));
            
            for (const context of uniqueContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // Verify userWeights has entries
            expect(result.current.userWeights.size).toBeGreaterThan(0);
            
            // Reset
            act(() => {
              result.current.reset();
            });
            
            // userWeights should be empty
            expect(result.current.userWeights.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect config on reset', () => {
      fc.assert(
        fc.property(
          moderationConfigArb,
          fc.array(voteContextArb(validOptionIds), { minLength: 1, maxLength: 5 }),
          (customConfig, voteContexts) => {
            const { result } = renderHook(() => useModeration());
            
            // Set custom config
            act(() => {
              result.current.setConfig(customConfig);
            });
            
            // Process some votes
            const uniqueContexts = voteContexts.map((ctx, i) => ({
              ...ctx,
              userId: `user_${i}`,
              accountAgeDays: 365,
            }));
            
            for (const context of uniqueContexts) {
              act(() => {
                result.current.processVote(context, validOptionIds);
              });
            }
            
            // Reset
            act(() => {
              result.current.reset();
            });
            
            // Config should remain unchanged
            expect(result.current.config).toEqual(customConfig);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
