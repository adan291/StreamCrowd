/**
 * Property-based tests for usePoll hook
 * Uses fast-check for property-based testing
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { usePoll, CreatePollConfig } from '../../hooks/usePoll';

// Arbitrary for generating valid poll option configs
const pollOptionConfigArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
  icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  image: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

// Arbitrary for generating valid poll configs
const createPollConfigArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  question: fc.string({ minLength: 1, maxLength: 200 }),
  options: fc.array(pollOptionConfigArb, { minLength: 2, maxLength: 10 }),
  maxVotes: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  duration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined }),
  progressBarColor: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { nil: undefined }),
  limitIndicatorColor: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { nil: undefined }),
}) as fc.Arbitrary<CreatePollConfig>;

// Arbitrary for generating vote records
const voteRecordArb = (maxOptionId: number) => fc.record({
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  optionId: fc.integer({ min: 1, max: maxOptionId }),
  timestamp: fc.integer({ min: 0 }),
});

describe('usePoll Property Tests', () => {
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
   * **Feature: app-refactoring, Property 3: usePoll State Initialization**
   * 
   * *For any* valid poll configuration, creating a poll should result in a poll
   * with isActive=true, totalVotes=0, and options with votes=0.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 3: usePoll State Initialization', () => {
    it('should initialize poll with isActive=true and totalVotes=0', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          (config) => {
            const { result } = renderHook(() => usePoll());
            
            let createdPoll: ReturnType<typeof result.current.createPoll>;
            act(() => {
              createdPoll = result.current.createPoll(config);
            });

            // Poll should be active
            expect(createdPoll!.isActive).toBe(true);
            
            // Total votes should be 0
            expect(createdPoll!.totalVotes).toBe(0);
            
            // All options should have 0 votes
            createdPoll!.options.forEach(option => {
              expect(option.votes).toBe(0);
            });
            
            // Current poll state should match
            expect(result.current.currentPoll).not.toBeNull();
            expect(result.current.currentPoll!.isActive).toBe(true);
            expect(result.current.currentPoll!.totalVotes).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should initialize poll with correct number of options', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          (config) => {
            const { result } = renderHook(() => usePoll());
            
            let createdPoll: ReturnType<typeof result.current.createPoll>;
            act(() => {
              createdPoll = result.current.createPoll(config);
            });

            // Number of options should match config
            expect(createdPoll!.options.length).toBe(config.options.length);
            
            // Each option should have sequential IDs starting from 1
            createdPoll!.options.forEach((option, index) => {
              expect(option.id).toBe(index + 1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear vote history and voted users on poll creation', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          createPollConfigArb,
          (config1, config2) => {
            const { result } = renderHook(() => usePoll());
            
            // Create first poll and add some votes
            act(() => {
              result.current.createPoll(config1);
            });
            
            // Add a vote to first poll
            act(() => {
              result.current.addVote({
                userId: 'user1',
                username: 'TestUser',
                optionId: 1,
                timestamp: Date.now(),
              }, 1);
            });
            
            // Verify vote was added
            expect(result.current.voteHistory.length).toBe(1);
            expect(result.current.votedUserIds.size).toBe(1);
            
            // Create second poll
            act(() => {
              result.current.createPoll(config2);
            });
            
            // Vote history and voted users should be cleared
            expect(result.current.voteHistory.length).toBe(0);
            expect(result.current.votedUserIds.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: app-refactoring, Property 4: usePoll Stop Preserves History**
   * 
   * *For any* active poll, stopping it should result in isActive=false
   * and the poll being present in pastPolls.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 4: usePoll Stop Preserves History', () => {
    it('should set isActive=false when poll is stopped', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          (config) => {
            const { result } = renderHook(() => usePoll());
            
            // Create and start a poll
            act(() => {
              result.current.createPoll(config);
            });
            
            // Verify poll is active
            expect(result.current.currentPoll!.isActive).toBe(true);
            
            // Stop the poll
            let stoppedPoll: ReturnType<typeof result.current.stopPoll>;
            act(() => {
              stoppedPoll = result.current.stopPoll();
            });
            
            // Poll should be inactive
            expect(stoppedPoll!.isActive).toBe(false);
            expect(result.current.currentPoll!.isActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add stopped poll to pastPolls', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          (config) => {
            const { result } = renderHook(() => usePoll());
            
            // Create and start a poll
            act(() => {
              result.current.createPoll(config);
            });
            
            const pollId = result.current.currentPoll!.id;
            
            // Stop the poll
            act(() => {
              result.current.stopPoll();
            });
            
            // Poll should be in pastPolls
            expect(result.current.pastPolls.length).toBe(1);
            expect(result.current.pastPolls[0].id).toBe(pollId);
            expect(result.current.pastPolls[0].isActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve vote counts when poll is stopped', () => {
      fc.assert(
        fc.property(
          createPollConfigArb.filter(c => c.options.length >= 2),
          fc.integer({ min: 1, max: 10 }),
          (config, numVotes) => {
            const { result } = renderHook(() => usePoll());
            
            // Create poll
            act(() => {
              result.current.createPoll(config);
            });
            
            // Add votes
            for (let i = 0; i < numVotes; i++) {
              act(() => {
                result.current.addVote({
                  userId: `user${i}`,
                  username: `User${i}`,
                  optionId: 1,
                  timestamp: Date.now(),
                }, 1);
              });
            }
            
            const votesBeforeStop = result.current.currentPoll!.options[0].votes;
            
            // Stop the poll
            act(() => {
              result.current.stopPoll();
            });
            
            // Votes should be preserved
            expect(result.current.currentPoll!.options[0].votes).toBe(votesBeforeStop);
            expect(result.current.pastPolls[0].options[0].votes).toBe(votesBeforeStop);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when stopping with no active poll', () => {
      const { result } = renderHook(() => usePoll());
      
      let stoppedPoll: ReturnType<typeof result.current.stopPoll>;
      act(() => {
        stoppedPoll = result.current.stopPoll();
      });
      
      expect(stoppedPoll).toBeNull();
    });
  });


  /**
   * **Feature: app-refactoring, Property 5: usePoll Reset Clears State**
   * 
   * *For any* poll state, resetting should result in currentPoll=null,
   * empty voteHistory, and empty votedUserIds.
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 5: usePoll Reset Clears State', () => {
    it('should clear currentPoll on reset', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          (config) => {
            const { result } = renderHook(() => usePoll());
            
            // Create a poll
            act(() => {
              result.current.createPoll(config);
            });
            
            // Verify poll exists
            expect(result.current.currentPoll).not.toBeNull();
            
            // Reset
            act(() => {
              result.current.resetPoll();
            });
            
            // Poll should be null
            expect(result.current.currentPoll).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear voteHistory on reset', () => {
      fc.assert(
        fc.property(
          createPollConfigArb.filter(c => c.options.length >= 1),
          fc.integer({ min: 1, max: 10 }),
          (config, numVotes) => {
            const { result } = renderHook(() => usePoll());
            
            // Create poll and add votes
            act(() => {
              result.current.createPoll(config);
            });
            
            for (let i = 0; i < numVotes; i++) {
              act(() => {
                result.current.addVote({
                  userId: `user${i}`,
                  username: `User${i}`,
                  optionId: 1,
                  timestamp: Date.now(),
                }, 1);
              });
            }
            
            // Verify votes exist
            expect(result.current.voteHistory.length).toBe(numVotes);
            
            // Reset
            act(() => {
              result.current.resetPoll();
            });
            
            // Vote history should be empty
            expect(result.current.voteHistory.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear votedUserIds on reset', () => {
      fc.assert(
        fc.property(
          createPollConfigArb.filter(c => c.options.length >= 1),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          (config, userIds) => {
            const { result } = renderHook(() => usePoll());
            
            // Create poll and add votes from different users
            act(() => {
              result.current.createPoll(config);
            });
            
            // Use unique user IDs
            const uniqueUserIds = [...new Set(userIds)];
            
            for (const userId of uniqueUserIds) {
              act(() => {
                result.current.addVote({
                  userId,
                  username: userId,
                  optionId: 1,
                  timestamp: Date.now(),
                }, 1);
              });
            }
            
            // Verify voted users exist
            expect(result.current.votedUserIds.size).toBe(uniqueUserIds.length);
            
            // Reset
            act(() => {
              result.current.resetPoll();
            });
            
            // Voted user IDs should be empty
            expect(result.current.votedUserIds.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect pastPolls on reset', () => {
      fc.assert(
        fc.property(
          createPollConfigArb,
          createPollConfigArb,
          (config1, config2) => {
            const { result } = renderHook(() => usePoll());
            
            // Create and stop first poll
            act(() => {
              result.current.createPoll(config1);
            });
            act(() => {
              result.current.stopPoll();
            });
            
            // Create second poll
            act(() => {
              result.current.createPoll(config2);
            });
            
            const pastPollsCount = result.current.pastPolls.length;
            
            // Reset current poll
            act(() => {
              result.current.resetPoll();
            });
            
            // Past polls should remain unchanged
            expect(result.current.pastPolls.length).toBe(pastPollsCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
