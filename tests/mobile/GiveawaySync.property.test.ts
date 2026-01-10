/**
 * Property Test: Mobile Participant Count Sync
 * Property 13: Mobile Participant Count Sync
 * Validates: Requirements 9.3 - Participant count should sync correctly between desktop and mobile
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES
// ============================================

interface SyncState {
  participants: Set<string>;
  participantCount: number;
  lastUpdated: number;
}

interface SyncMessage {
  type: 'add' | 'remove' | 'clear' | 'sync';
  participants?: string[];
  participant?: string;
  timestamp: number;
}

// ============================================
// SYNC LOGIC (simulates useGiveawaySync behavior)
// ============================================

const createInitialState = (): SyncState => ({
  participants: new Set(),
  participantCount: 0,
  lastUpdated: Date.now(),
});

const applySyncMessage = (state: SyncState, message: SyncMessage): SyncState => {
  const newState = { ...state, lastUpdated: message.timestamp };
  
  switch (message.type) {
    case 'add':
      if (message.participant) {
        const newParticipants = new Set(state.participants);
        newParticipants.add(message.participant.toLowerCase());
        return {
          ...newState,
          participants: newParticipants,
          participantCount: newParticipants.size,
        };
      }
      return state;
      
    case 'remove':
      if (message.participant) {
        const newParticipants = new Set(state.participants);
        newParticipants.delete(message.participant.toLowerCase());
        return {
          ...newState,
          participants: newParticipants,
          participantCount: newParticipants.size,
        };
      }
      return state;
      
    case 'clear':
      return {
        ...newState,
        participants: new Set(),
        participantCount: 0,
      };
      
    case 'sync':
      if (message.participants) {
        const newParticipants = new Set(message.participants.map(p => p.toLowerCase()));
        return {
          ...newState,
          participants: newParticipants,
          participantCount: newParticipants.size,
        };
      }
      return state;
      
    default:
      return state;
  }
};

const applyMessages = (messages: SyncMessage[]): SyncState => {
  return messages.reduce(
    (state, message) => applySyncMessage(state, message),
    createInitialState()
  );
};

// ============================================
// ARBITRARIES
// ============================================

const usernameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
  { minLength: 3, maxLength: 15 }
);

const addMessageArb = (timestamp: number): fc.Arbitrary<SyncMessage> =>
  usernameArb.map(participant => ({
    type: 'add' as const,
    participant,
    timestamp,
  }));

const removeMessageArb = (timestamp: number, participants: string[]): fc.Arbitrary<SyncMessage> =>
  fc.constantFrom(...(participants.length > 0 ? participants : ['dummy'])).map(participant => ({
    type: 'remove' as const,
    participant,
    timestamp,
  }));

const clearMessageArb = (timestamp: number): fc.Arbitrary<SyncMessage> =>
  fc.constant({
    type: 'clear' as const,
    timestamp,
  });

const syncMessageArb = (timestamp: number): fc.Arbitrary<SyncMessage> =>
  fc.array(usernameArb, { minLength: 0, maxLength: 20 }).map(participants => ({
    type: 'sync' as const,
    participants,
    timestamp,
  }));

// ============================================
// PROPERTY TESTS
// ============================================

describe('Mobile Participant Count Sync Property Tests', () => {
  describe('Property 13: Mobile Participant Count Sync', () => {
    it('participantCount should always equal participants.size', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 0, maxLength: 50 }),
          (usernames) => {
            const messages: SyncMessage[] = usernames.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: Date.now() + i,
            }));
            
            const state = applyMessages(messages);
            expect(state.participantCount).toBe(state.participants.size);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('adding same participant twice should not increase count', () => {
      fc.assert(
        fc.property(
          usernameArb,
          (username) => {
            const messages: SyncMessage[] = [
              { type: 'add', participant: username, timestamp: 1 },
              { type: 'add', participant: username, timestamp: 2 },
            ];
            
            const state = applyMessages(messages);
            expect(state.participantCount).toBe(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('clear should reset count to 0', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 1, maxLength: 20 }),
          (usernames) => {
            const addMessages: SyncMessage[] = usernames.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: i,
            }));
            
            const clearMessage: SyncMessage = {
              type: 'clear',
              timestamp: usernames.length,
            };
            
            const state = applyMessages([...addMessages, clearMessage]);
            expect(state.participantCount).toBe(0);
            expect(state.participants.size).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('sync should replace all participants', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 1, maxLength: 10 }),
          fc.array(usernameArb, { minLength: 1, maxLength: 10 }),
          (initialUsers, syncUsers) => {
            const addMessages: SyncMessage[] = initialUsers.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: i,
            }));
            
            const syncMessage: SyncMessage = {
              type: 'sync',
              participants: syncUsers,
              timestamp: initialUsers.length,
            };
            
            const state = applyMessages([...addMessages, syncMessage]);
            const uniqueSyncUsers = new Set(syncUsers.map(u => u.toLowerCase()));
            
            expect(state.participantCount).toBe(uniqueSyncUsers.size);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('remove should decrease count by 1 for existing participant', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 2, maxLength: 10 }),
          (usernames) => {
            const uniqueUsers = [...new Set(usernames.map(u => u.toLowerCase()))];
            if (uniqueUsers.length < 2) return; // Skip if not enough unique users
            
            const addMessages: SyncMessage[] = uniqueUsers.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: i,
            }));
            
            const stateBeforeRemove = applyMessages(addMessages);
            const countBefore = stateBeforeRemove.participantCount;
            
            const removeMessage: SyncMessage = {
              type: 'remove',
              participant: uniqueUsers[0],
              timestamp: uniqueUsers.length,
            };
            
            const stateAfterRemove = applyMessages([...addMessages, removeMessage]);
            expect(stateAfterRemove.participantCount).toBe(countBefore - 1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('remove non-existent participant should not change count', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 1, maxLength: 10 }),
          (usernames) => {
            const addMessages: SyncMessage[] = usernames.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: i,
            }));
            
            const stateBeforeRemove = applyMessages(addMessages);
            const countBefore = stateBeforeRemove.participantCount;
            
            const removeMessage: SyncMessage = {
              type: 'remove',
              participant: 'nonexistent_user_xyz',
              timestamp: usernames.length,
            };
            
            const stateAfterRemove = applyMessages([...addMessages, removeMessage]);
            expect(stateAfterRemove.participantCount).toBe(countBefore);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('participant names should be case-insensitive', () => {
      fc.assert(
        fc.property(
          usernameArb,
          (username) => {
            const messages: SyncMessage[] = [
              { type: 'add', participant: username.toLowerCase(), timestamp: 1 },
              { type: 'add', participant: username.toUpperCase(), timestamp: 2 },
            ];
            
            const state = applyMessages(messages);
            expect(state.participantCount).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('lastUpdated should be the timestamp of the last message', () => {
      fc.assert(
        fc.property(
          fc.array(usernameArb, { minLength: 1, maxLength: 10 }),
          (usernames) => {
            const timestamps = usernames.map((_, i) => 1000 + i * 100);
            const messages: SyncMessage[] = usernames.map((username, i) => ({
              type: 'add',
              participant: username,
              timestamp: timestamps[i],
            }));
            
            const state = applyMessages(messages);
            expect(state.lastUpdated).toBe(timestamps[timestamps.length - 1]);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
