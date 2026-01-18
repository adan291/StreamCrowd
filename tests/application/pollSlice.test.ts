/**
 * Poll Slice Tests
 * 
 * Tests for poll Redux slice including reducers, selectors, and persistence.
 * 
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import pollReducer, {
  createPoll,
  addVote,
  endPoll,
  resetPoll,
  setCreating,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
  selectActivePoll,
  selectPollHistory,
  selectPollError,
  selectPollCreating,
  selectActivePollOptions,
  selectActivePollTotalVotes,
  selectActivePollResults,
  selectActivePollWinner,
  selectPollHistoryCount,
  type PollState,
  type Poll,
} from '../../src/application/state/slices/pollSlice';
import * as fc from 'fast-check';

// Helper to create a test store
function createTestStore(initialState?: Partial<PollState>) {
  return configureStore({
    reducer: {
      poll: pollReducer,
    },
    preloadedState: initialState ? { poll: { ...getInitialState(), ...initialState } } : undefined,
  });
}

function getInitialState(): PollState {
  return {
    active: null,
    history: [],
    isCreating: false,
    error: null,
  };
}

describe('Poll Slice', () => {
  describe('Reducers', () => {
    describe('createPoll', () => {
      /**
       * @requirements 2.1 - Store poll data with title, options, and configuration
       */
      it('should create a new poll with generated id and timestamp', () => {
        const store = createTestStore();
        
        const pollData = {
          title: 'Favorite Game',
          options: [
            { id: '1', text: 'Minecraft', votes: 0 },
            { id: '2', text: 'Fortnite', votes: 0 },
          ],
        };
        
        store.dispatch(createPoll(pollData));
        
        const state = store.getState().poll;
        expect(state.active).not.toBeNull();
        expect(state.active?.title).toBe('Favorite Game');
        expect(state.active?.options).toHaveLength(2);
        expect(state.active?.id).toBeDefined();
        expect(state.active?.createdAt).toBeDefined();
        expect(state.active?.status).toBe('active');
        expect(state.isCreating).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should clear error when creating poll', () => {
        const store = createTestStore({ error: 'Previous error' });
        
        store.dispatch(createPoll({
          title: 'Test',
          options: [{ id: '1', text: 'Option 1', votes: 0 }],
        }));
        
        expect(store.getState().poll.error).toBeNull();
      });
    });

    describe('addVote', () => {
      /**
       * @requirements 2.2 - Update vote count for selected option
       */
      it('should increment vote count for the selected option', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test Poll',
            options: [
              { id: 'opt1', text: 'Option 1', votes: 0 },
              { id: 'opt2', text: 'Option 2', votes: 0 },
            ],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(addVote({ optionId: 'opt1' }));
        
        const state = store.getState().poll;
        expect(state.active?.options[0].votes).toBe(1);
        expect(state.active?.options[1].votes).toBe(0);
      });

      it('should handle multiple votes to the same option', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test Poll',
            options: [{ id: 'opt1', text: 'Option 1', votes: 0 }],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(addVote({ optionId: 'opt1' }));
        store.dispatch(addVote({ optionId: 'opt1' }));
        store.dispatch(addVote({ optionId: 'opt1' }));
        
        expect(store.getState().poll.active?.options[0].votes).toBe(3);
      });

      it('should not crash when voting on non-existent option', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test Poll',
            options: [{ id: 'opt1', text: 'Option 1', votes: 0 }],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(addVote({ optionId: 'nonexistent' }));
        
        // Should not crash, votes should remain unchanged
        expect(store.getState().poll.active?.options[0].votes).toBe(0);
      });

      it('should not crash when no active poll exists', () => {
        const store = createTestStore();
        
        store.dispatch(addVote({ optionId: 'opt1' }));
        
        // Should not crash
        expect(store.getState().poll.active).toBeNull();
      });
    });

    describe('endPoll', () => {
      /**
       * @requirements 2.3 - Move poll to history and clear active poll
       */
      it('should move active poll to history and clear active', () => {
        const activePoll: Poll = {
          id: '1',
          title: 'Test Poll',
          options: [{ id: 'opt1', text: 'Option 1', votes: 5 }],
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        
        const store = createTestStore({ active: activePoll });
        
        store.dispatch(endPoll());
        
        const state = store.getState().poll;
        expect(state.active).toBeNull();
        expect(state.history).toHaveLength(1);
        expect(state.history[0].id).toBe('1');
        expect(state.history[0].status).toBe('ended');
      });

      it('should add poll to beginning of history', () => {
        const existingPoll: Poll = {
          id: '0',
          title: 'Old Poll',
          options: [],
          createdAt: new Date().toISOString(),
          status: 'ended',
        };
        
        const activePoll: Poll = {
          id: '1',
          title: 'New Poll',
          options: [],
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        
        const store = createTestStore({
          active: activePoll,
          history: [existingPoll],
        });
        
        store.dispatch(endPoll());
        
        const state = store.getState().poll;
        expect(state.history).toHaveLength(2);
        expect(state.history[0].id).toBe('1'); // New poll at beginning
        expect(state.history[1].id).toBe('0'); // Old poll after
      });

      it('should not crash when no active poll exists', () => {
        const store = createTestStore();
        
        store.dispatch(endPoll());
        
        expect(store.getState().poll.active).toBeNull();
        expect(store.getState().poll.history).toHaveLength(0);
      });
    });

    describe('resetPoll', () => {
      it('should clear active poll without saving to history', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            options: [],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(resetPoll());
        
        const state = store.getState().poll;
        expect(state.active).toBeNull();
        expect(state.history).toHaveLength(0);
      });

      it('should clear error', () => {
        const store = createTestStore({ error: 'Test error' });
        
        store.dispatch(resetPoll());
        
        expect(store.getState().poll.error).toBeNull();
      });
    });

    describe('setCreating', () => {
      it('should set creating state to true', () => {
        const store = createTestStore();
        
        store.dispatch(setCreating(true));
        
        expect(store.getState().poll.isCreating).toBe(true);
      });

      it('should set creating state to false', () => {
        const store = createTestStore({ isCreating: true });
        
        store.dispatch(setCreating(false));
        
        expect(store.getState().poll.isCreating).toBe(false);
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        const store = createTestStore();
        
        store.dispatch(setError('Test error'));
        
        expect(store.getState().poll.error).toBe('Test error');
      });

      it('should set isCreating to false', () => {
        const store = createTestStore({ isCreating: true });
        
        store.dispatch(setError('Error'));
        
        expect(store.getState().poll.isCreating).toBe(false);
      });
    });

    describe('clearError', () => {
      it('should clear error message', () => {
        const store = createTestStore({ error: 'Test error' });
        
        store.dispatch(clearError());
        
        expect(store.getState().poll.error).toBeNull();
      });
    });

    describe('clearHistory', () => {
      it('should clear all poll history', () => {
        const store = createTestStore({
          history: [
            {
              id: '1',
              title: 'Poll 1',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
            {
              id: '2',
              title: 'Poll 2',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
          ],
        });
        
        store.dispatch(clearHistory());
        
        expect(store.getState().poll.history).toHaveLength(0);
      });
    });

    describe('removeFromHistory', () => {
      it('should remove specific poll from history', () => {
        const store = createTestStore({
          history: [
            {
              id: '1',
              title: 'Poll 1',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
            {
              id: '2',
              title: 'Poll 2',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
          ],
        });
        
        store.dispatch(removeFromHistory({ pollId: '1' }));
        
        const state = store.getState().poll;
        expect(state.history).toHaveLength(1);
        expect(state.history[0].id).toBe('2');
      });
    });
  });

  describe('Selectors', () => {
    /**
     * @requirements 2.4 - Components re-render only if selected data changed
     * @requirements 2.6 - Memoized selectors to prevent unnecessary recalculations
     */
    describe('Basic Selectors', () => {
      it('selectActivePoll should return active poll', () => {
        const activePoll: Poll = {
          id: '1',
          title: 'Test',
          options: [],
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        
        const store = createTestStore({ active: activePoll });
        const state = store.getState();
        
        expect(selectActivePoll(state)).toEqual(activePoll);
      });

      it('selectPollHistory should return history', () => {
        const history: Poll[] = [
          {
            id: '1',
            title: 'Poll 1',
            options: [],
            createdAt: new Date().toISOString(),
            status: 'ended',
          },
        ];
        
        const store = createTestStore({ history });
        const state = store.getState();
        
        expect(selectPollHistory(state)).toEqual(history);
      });

      it('selectPollError should return error', () => {
        const store = createTestStore({ error: 'Test error' });
        const state = store.getState();
        
        expect(selectPollError(state)).toBe('Test error');
      });

      it('selectPollCreating should return creating state', () => {
        const store = createTestStore({ isCreating: true });
        const state = store.getState();
        
        expect(selectPollCreating(state)).toBe(true);
      });
    });

    describe('Memoized Selectors', () => {
      it('selectActivePollOptions should return options array', () => {
        const options = [
          { id: '1', text: 'Option 1', votes: 5 },
          { id: '2', text: 'Option 2', votes: 3 },
        ];
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            options,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        expect(selectActivePollOptions(state)).toEqual(options);
      });

      it('selectActivePollOptions should return empty array when no active poll', () => {
        const store = createTestStore();
        const state = store.getState();
        
        expect(selectActivePollOptions(state)).toEqual([]);
      });

      it('selectActivePollTotalVotes should calculate total votes', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            options: [
              { id: '1', text: 'Option 1', votes: 5 },
              { id: '2', text: 'Option 2', votes: 3 },
              { id: '3', text: 'Option 3', votes: 2 },
            ],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        expect(selectActivePollTotalVotes(state)).toBe(10);
      });

      it('selectActivePollResults should return options sorted by votes', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            options: [
              { id: '1', text: 'Option 1', votes: 3 },
              { id: '2', text: 'Option 2', votes: 7 },
              { id: '3', text: 'Option 3', votes: 5 },
            ],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        const results = selectActivePollResults(state);
        
        expect(results[0].votes).toBe(7);
        expect(results[1].votes).toBe(5);
        expect(results[2].votes).toBe(3);
      });

      it('selectActivePollWinner should return option with most votes', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            options: [
              { id: '1', text: 'Option 1', votes: 3 },
              { id: '2', text: 'Option 2', votes: 7 },
              { id: '3', text: 'Option 3', votes: 5 },
            ],
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        const winner = selectActivePollWinner(state);
        
        expect(winner?.id).toBe('2');
        expect(winner?.votes).toBe(7);
      });

      it('selectPollHistoryCount should return history length', () => {
        const store = createTestStore({
          history: [
            {
              id: '1',
              title: 'Poll 1',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
            {
              id: '2',
              title: 'Poll 2',
              options: [],
              createdAt: new Date().toISOString(),
              status: 'ended',
            },
          ],
        });
        
        const state = store.getState();
        expect(selectPollHistoryCount(state)).toBe(2);
      });
    });
  });

  describe('Property Tests', () => {
    /**
     * Property: Vote counts should always be non-negative
     */
    it('should maintain non-negative vote counts', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            id: fc.string(),
            text: fc.string(),
            votes: fc.nat(),
          }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.nat(), { maxLength: 50 }),
          (options, voteIndices) => {
            const store = createTestStore({
              active: {
                id: '1',
                title: 'Test',
                options,
                createdAt: new Date().toISOString(),
                status: 'active',
              },
            });
            
            // Add votes
            voteIndices.forEach(index => {
              const optionIndex = index % options.length;
              store.dispatch(addVote({ optionId: options[optionIndex].id }));
            });
            
            // Check all votes are non-negative
            const state = store.getState().poll;
            const allNonNegative = state.active?.options.every(opt => opt.votes >= 0) ?? true;
            
            expect(allNonNegative).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Total votes should equal sum of individual option votes
     */
    it('should maintain vote count consistency', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            id: fc.string(),
            text: fc.string(),
            votes: fc.nat({ max: 100 }),
          }), { minLength: 1, maxLength: 5 }),
          (options) => {
            const store = createTestStore({
              active: {
                id: '1',
                title: 'Test',
                options,
                createdAt: new Date().toISOString(),
                status: 'active',
              },
            });
            
            const state = store.getState();
            const totalVotes = selectActivePollTotalVotes(state);
            const expectedTotal = options.reduce((sum, opt) => sum + opt.votes, 0);
            
            expect(totalVotes).toBe(expectedTotal);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: History should preserve poll order (newest first)
     */
    it('should maintain history order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (numPolls) => {
            const store = createTestStore();
            
            // Create and end multiple polls
            for (let i = 0; i < numPolls; i++) {
              store.dispatch(createPoll({
                title: `Poll ${i}`,
                options: [{ id: '1', text: 'Option', votes: 0 }],
              }));
              store.dispatch(endPoll());
            }
            
            const state = store.getState().poll;
            
            // Check history is in reverse chronological order
            for (let i = 0; i < state.history.length - 1; i++) {
              const current = new Date(state.history[i].createdAt).getTime();
              const next = new Date(state.history[i + 1].createdAt).getTime();
              expect(current).toBeGreaterThanOrEqual(next);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
