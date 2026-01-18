/**
 * Giveaway Slice Tests
 * 
 * Tests for giveaway Redux slice including reducers, selectors, and cloud sync.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import giveawayReducer, {
  createGiveaway,
  addParticipant,
  removeParticipant,
  clearParticipants,
  selectWinner,
  confirmWinner,
  rerollWinner,
  endGiveaway,
  resetGiveaway,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
  enableCloudSync,
  disableCloudSync,
  updateLastSynced,
  restoreGiveaway,
  selectActiveGiveaway,
  selectGiveawayHistory,
  selectParticipants,
  selectParticipantCount,
  selectGiveawayWinner,
  selectGiveawayStatus,
  selectParticipantsByPlatform,
  type GiveawayState,
  type Giveaway,
  type Participant,
} from '../../src/application/state/slices/giveawaySlice';
import * as fc from 'fast-check';

// Helper to create a test store
function createTestStore(initialState?: Partial<GiveawayState>) {
  return configureStore({
    reducer: {
      giveaway: giveawayReducer,
    },
    preloadedState: initialState ? { giveaway: { ...getInitialState(), ...initialState } } : undefined,
  });
}

function getInitialState(): GiveawayState {
  return {
    active: null,
    history: [],
    isSelecting: false,
    error: null,
    cloudSyncEnabled: false,
    lastSyncedAt: null,
  };
}

describe('Giveaway Slice', () => {
  describe('Reducers', () => {
    describe('createGiveaway', () => {
      /**
       * @requirements 3.1 - Store giveaway data with title, participants, and configuration
       */
      it('should create a new giveaway with generated id and timestamp', () => {
        const store = createTestStore();
        
        store.dispatch(createGiveaway({ title: 'Stream Giveaway' }));
        
        const state = store.getState().giveaway;
        expect(state.active).not.toBeNull();
        expect(state.active?.title).toBe('Stream Giveaway');
        expect(state.active?.participants).toEqual([]);
        expect(state.active?.winner).toBeNull();
        expect(state.active?.id).toBeDefined();
        expect(state.active?.createdAt).toBeDefined();
        expect(state.active?.status).toBe('active');
        expect(state.error).toBeNull();
      });

      it('should clear error when creating giveaway', () => {
        const store = createTestStore({ error: 'Previous error' });
        
        store.dispatch(createGiveaway({ title: 'Test' }));
        
        expect(store.getState().giveaway.error).toBeNull();
      });
    });

    describe('addParticipant', () => {
      /**
       * @requirements 3.2 - Update participant list
       */
      it('should add a participant to the active giveaway', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test Giveaway',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(addParticipant({ username: 'user1', platform: 'twitch' }));
        
        const state = store.getState().giveaway;
        expect(state.active?.participants).toHaveLength(1);
        expect(state.active?.participants[0].username).toBe('user1');
        expect(state.active?.participants[0].platform).toBe('twitch');
        expect(state.active?.participants[0].id).toBeDefined();
        expect(state.active?.participants[0].joinedAt).toBeDefined();
      });

      it('should not add duplicate participants (case-insensitive)', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(addParticipant({ username: 'User1', platform: 'twitch' }));
        store.dispatch(addParticipant({ username: 'user1', platform: 'twitch' }));
        store.dispatch(addParticipant({ username: 'USER1', platform: 'youtube' }));
        
        expect(store.getState().giveaway.active?.participants).toHaveLength(1);
      });

      it('should not crash when no active giveaway exists', () => {
        const store = createTestStore();
        
        store.dispatch(addParticipant({ username: 'user1', platform: 'twitch' }));
        
        expect(store.getState().giveaway.active).toBeNull();
      });
    });

    describe('removeParticipant', () => {
      it('should remove a participant from the active giveaway', () => {
        const participant: Participant = {
          id: 'p1',
          username: 'user1',
          platform: 'twitch',
          joinedAt: new Date().toISOString(),
        };
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [participant],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(removeParticipant({ participantId: 'p1' }));
        
        expect(store.getState().giveaway.active?.participants).toHaveLength(0);
      });
    });

    describe('clearParticipants', () => {
      it('should clear all participants from the active giveaway', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [
              { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
              { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
            ],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(clearParticipants());
        
        expect(store.getState().giveaway.active?.participants).toHaveLength(0);
      });
    });

    describe('selectWinner', () => {
      /**
       * @requirements 3.3 - Store winner and update giveaway status
       */
      it('should select a random winner from participants', () => {
        const participants: Participant[] = [
          { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
          { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
          { id: 'p3', username: 'user3', platform: 'twitch', joinedAt: new Date().toISOString() },
        ];
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants,
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(selectWinner());
        
        const state = store.getState().giveaway;
        expect(state.active?.winner).not.toBeNull();
        expect(state.active?.status).toBe('selecting');
        expect(state.isSelecting).toBe(true);
        
        // Winner should be one of the participants
        const winnerIsParticipant = participants.some(p => p.id === state.active?.winner?.id);
        expect(winnerIsParticipant).toBe(true);
      });

      it('should not crash when no participants exist', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(selectWinner());
        
        expect(store.getState().giveaway.active?.winner).toBeNull();
      });

      it('should not crash when no active giveaway exists', () => {
        const store = createTestStore();
        
        store.dispatch(selectWinner());
        
        expect(store.getState().giveaway.active).toBeNull();
      });
    });

    describe('confirmWinner', () => {
      it('should confirm the winner and end the giveaway', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner: { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
            createdAt: new Date().toISOString(),
            status: 'selecting',
          },
          isSelecting: true,
        });
        
        store.dispatch(confirmWinner());
        
        const state = store.getState().giveaway;
        expect(state.active?.status).toBe('ended');
        expect(state.isSelecting).toBe(false);
      });
    });

    describe('rerollWinner', () => {
      it('should select a new random winner', () => {
        const participants: Participant[] = [
          { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
          { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
        ];
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants,
            winner: participants[0],
            createdAt: new Date().toISOString(),
            status: 'selecting',
          },
        });
        
        store.dispatch(rerollWinner());
        
        const state = store.getState().giveaway;
        expect(state.active?.winner).not.toBeNull();
        
        // Winner should be one of the participants
        const winnerIsParticipant = participants.some(p => p.id === state.active?.winner?.id);
        expect(winnerIsParticipant).toBe(true);
      });
    });

    describe('endGiveaway', () => {
      /**
       * @requirements 3.4 - Move giveaway to history
       */
      it('should move active giveaway to history and clear active', () => {
        const activeGiveaway: Giveaway = {
          id: '1',
          title: 'Test Giveaway',
          participants: [],
          winner: null,
          createdAt: new Date().toISOString(),
          status: 'ended',
        };
        
        const store = createTestStore({ active: activeGiveaway });
        
        store.dispatch(endGiveaway());
        
        const state = store.getState().giveaway;
        expect(state.active).toBeNull();
        expect(state.history).toHaveLength(1);
        expect(state.history[0].id).toBe('1');
        expect(state.isSelecting).toBe(false);
      });

      it('should add giveaway to beginning of history', () => {
        const existingGiveaway: Giveaway = {
          id: '0',
          title: 'Old Giveaway',
          participants: [],
          winner: null,
          createdAt: new Date().toISOString(),
          status: 'ended',
        };
        
        const activeGiveaway: Giveaway = {
          id: '1',
          title: 'New Giveaway',
          participants: [],
          winner: null,
          createdAt: new Date().toISOString(),
          status: 'ended',
        };
        
        const store = createTestStore({
          active: activeGiveaway,
          history: [existingGiveaway],
        });
        
        store.dispatch(endGiveaway());
        
        const state = store.getState().giveaway;
        expect(state.history).toHaveLength(2);
        expect(state.history[0].id).toBe('1'); // New giveaway at beginning
        expect(state.history[1].id).toBe('0'); // Old giveaway after
      });
    });

    describe('resetGiveaway', () => {
      it('should clear active giveaway without saving to history', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        store.dispatch(resetGiveaway());
        
        const state = store.getState().giveaway;
        expect(state.active).toBeNull();
        expect(state.history).toHaveLength(0);
        expect(state.isSelecting).toBe(false);
        expect(state.error).toBeNull();
      });
    });

    describe('Cloud Sync', () => {
      /**
       * @requirements 3.6 - Sync with Firebase
       */
      it('should enable cloud sync', () => {
        const store = createTestStore();
        
        store.dispatch(enableCloudSync());
        
        expect(store.getState().giveaway.cloudSyncEnabled).toBe(true);
      });

      it('should disable cloud sync', () => {
        const store = createTestStore({ cloudSyncEnabled: true });
        
        store.dispatch(disableCloudSync());
        
        expect(store.getState().giveaway.cloudSyncEnabled).toBe(false);
      });

      it('should update last synced timestamp', () => {
        const store = createTestStore();
        
        store.dispatch(updateLastSynced());
        
        expect(store.getState().giveaway.lastSyncedAt).not.toBeNull();
      });

      /**
       * @requirements 3.5 - Restore from localStorage
       */
      it('should restore giveaway from cloud', () => {
        const giveaway: Giveaway = {
          id: '1',
          title: 'Restored Giveaway',
          participants: [
            { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
          ],
          winner: null,
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        
        const store = createTestStore();
        
        store.dispatch(restoreGiveaway({ giveaway }));
        
        const state = store.getState().giveaway;
        expect(state.active).toEqual(giveaway);
      });
    });
  });

  describe('Selectors', () => {
    describe('Basic Selectors', () => {
      it('selectActiveGiveaway should return active giveaway', () => {
        const activeGiveaway: Giveaway = {
          id: '1',
          title: 'Test',
          participants: [],
          winner: null,
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        
        const store = createTestStore({ active: activeGiveaway });
        const state = store.getState();
        
        expect(selectActiveGiveaway(state)).toEqual(activeGiveaway);
      });

      it('selectGiveawayHistory should return history', () => {
        const history: Giveaway[] = [
          {
            id: '1',
            title: 'Giveaway 1',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'ended',
          },
        ];
        
        const store = createTestStore({ history });
        const state = store.getState();
        
        expect(selectGiveawayHistory(state)).toEqual(history);
      });
    });

    describe('Memoized Selectors', () => {
      it('selectParticipants should return participants array', () => {
        const participants: Participant[] = [
          { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
          { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
        ];
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants,
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        expect(selectParticipants(state)).toEqual(participants);
      });

      it('selectParticipantCount should return participant count', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [
              { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
              { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
            ],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        expect(selectParticipantCount(state)).toBe(2);
      });

      it('selectWinner should return winner', () => {
        const winner: Participant = {
          id: 'p1',
          username: 'user1',
          platform: 'twitch',
          joinedAt: new Date().toISOString(),
        };
        
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner,
            createdAt: new Date().toISOString(),
            status: 'selecting',
          },
        });
        
        const state = store.getState();
        expect(selectGiveawayWinner(state)).toEqual(winner);
      });

      it('selectGiveawayStatus should return status', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        expect(selectGiveawayStatus(state)).toBe('active');
      });

      it('selectParticipantsByPlatform should group participants by platform', () => {
        const store = createTestStore({
          active: {
            id: '1',
            title: 'Test',
            participants: [
              { id: 'p1', username: 'user1', platform: 'twitch', joinedAt: new Date().toISOString() },
              { id: 'p2', username: 'user2', platform: 'youtube', joinedAt: new Date().toISOString() },
              { id: 'p3', username: 'user3', platform: 'twitch', joinedAt: new Date().toISOString() },
            ],
            winner: null,
            createdAt: new Date().toISOString(),
            status: 'active',
          },
        });
        
        const state = store.getState();
        const byPlatform = selectParticipantsByPlatform(state);
        
        expect(byPlatform.twitch).toHaveLength(2);
        expect(byPlatform.youtube).toHaveLength(1);
      });
    });
  });

  describe('Property Tests', () => {
    /**
     * Property: Participants should be unique (case-insensitive)
     */
    it('should maintain unique participants', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            username: fc.string({ minLength: 1, maxLength: 20 }),
            platform: fc.constantFrom('twitch', 'youtube'),
          }), { minLength: 1, maxLength: 20 }),
          (participants) => {
            const store = createTestStore({
              active: {
                id: '1',
                title: 'Test',
                participants: [],
                winner: null,
                createdAt: new Date().toISOString(),
                status: 'active',
              },
            });
            
            // Add all participants
            participants.forEach(p => {
              store.dispatch(addParticipant(p));
            });
            
            const state = store.getState().giveaway;
            const usernames = state.active?.participants.map(p => p.username.toLowerCase()) || [];
            const uniqueUsernames = new Set(usernames);
            
            // All usernames should be unique (case-insensitive)
            expect(usernames.length).toBe(uniqueUsernames.size);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Winner should always be one of the participants
     */
    it('should select winner from participants', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            username: fc.string({ minLength: 1, maxLength: 20 }),
            platform: fc.constantFrom('twitch', 'youtube'),
          }), { minLength: 1, maxLength: 10 }),
          (participants) => {
            if (participants.length === 0) return true;
            
            const store = createTestStore({
              active: {
                id: '1',
                title: 'Test',
                participants: [],
                winner: null,
                createdAt: new Date().toISOString(),
                status: 'active',
              },
            });
            
            // Add participants
            participants.forEach(p => {
              store.dispatch(addParticipant(p));
            });
            
            // Select winner
            store.dispatch(selectWinner());
            
            const state = store.getState().giveaway;
            const winner = state.active?.winner;
            
            if (winner) {
              // Winner should be one of the participants
              const winnerIsParticipant = state.active?.participants.some(
                p => p.id === winner.id
              );
              expect(winnerIsParticipant).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
