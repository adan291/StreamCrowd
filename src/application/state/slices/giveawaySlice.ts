/**
 * Giveaway Slice
 * 
 * Redux slice for giveaway state management.
 * Handles giveaway creation, participant management, winner selection, and cloud sync.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export interface Participant {
  id: string;
  username: string;
  platform: 'twitch' | 'youtube';
  joinedAt: string;
}

export interface Giveaway {
  id: string;
  title: string;
  participants: Participant[];
  winner: Participant | null;
  createdAt: string;
  status: 'active' | 'selecting' | 'ended';
}

export interface GiveawayState {
  active: Giveaway | null;
  history: Giveaway[];
  isSelecting: boolean;
  error: string | null;
  cloudSyncEnabled: boolean;
  lastSyncedAt: string | null;
}

// Initial state
const initialState: GiveawayState = {
  active: null,
  history: [],
  isSelecting: false,
  error: null,
  cloudSyncEnabled: false,
  lastSyncedAt: null,
};

// Slice
const giveawaySlice = createSlice({
  name: 'giveaway',
  initialState,
  reducers: {
    /**
     * Create a new giveaway
     * @requirements 3.1 - Store giveaway data with title, participants, and configuration
     */
    createGiveaway: (state, action: PayloadAction<{ title: string }>) => {
      state.active = {
        id: crypto.randomUUID(),
        title: action.payload.title,
        participants: [],
        winner: null,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      state.error = null;
    },

    /**
     * Add a participant to the active giveaway
     * @requirements 3.2 - Update participant list
     */
    addParticipant: (state, action: PayloadAction<Omit<Participant, 'id' | 'joinedAt'>>) => {
      if (state.active) {
        // Check if participant already exists
        const exists = state.active.participants.some(
          p => p.username.toLowerCase() === action.payload.username.toLowerCase()
        );
        
        if (!exists) {
          state.active.participants.push({
            ...action.payload,
            id: crypto.randomUUID(),
            joinedAt: new Date().toISOString(),
          });
        }
      }
    },

    /**
     * Remove a participant from the active giveaway
     */
    removeParticipant: (state, action: PayloadAction<{ participantId: string }>) => {
      if (state.active) {
        state.active.participants = state.active.participants.filter(
          p => p.id !== action.payload.participantId
        );
      }
    },

    /**
     * Clear all participants from the active giveaway
     */
    clearParticipants: (state) => {
      if (state.active) {
        state.active.participants = [];
      }
    },

    /**
     * Select a random winner from participants
     * @requirements 3.3 - Store winner and update giveaway status
     */
    selectWinner: (state) => {
      if (state.active && state.active.participants.length > 0) {
        state.isSelecting = true;
        const randomIndex = Math.floor(Math.random() * state.active.participants.length);
        state.active.winner = state.active.participants[randomIndex];
        state.active.status = 'selecting';
      }
    },

    /**
     * Confirm the selected winner
     */
    confirmWinner: (state) => {
      if (state.active) {
        state.active.status = 'ended';
        state.isSelecting = false;
      }
    },

    /**
     * Reroll the winner (select a new random winner)
     */
    rerollWinner: (state) => {
      if (state.active && state.active.participants.length > 0) {
        const randomIndex = Math.floor(Math.random() * state.active.participants.length);
        state.active.winner = state.active.participants[randomIndex];
      }
    },

    /**
     * End the active giveaway
     * @requirements 3.4 - Move giveaway to history
     */
    endGiveaway: (state) => {
      if (state.active) {
        state.history.unshift(state.active);
        state.active = null;
        state.isSelecting = false;
      }
    },

    /**
     * Reset the active giveaway without saving to history
     */
    resetGiveaway: (state) => {
      state.active = null;
      state.isSelecting = false;
      state.error = null;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isSelecting = false;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Clear giveaway history
     */
    clearHistory: (state) => {
      state.history = [];
    },

    /**
     * Remove a specific giveaway from history
     */
    removeFromHistory: (state, action: PayloadAction<{ giveawayId: string }>) => {
      state.history = state.history.filter(g => g.id !== action.payload.giveawayId);
    },

    /**
     * Enable cloud sync
     * @requirements 3.6 - Sync with Firebase
     */
    enableCloudSync: (state) => {
      state.cloudSyncEnabled = true;
    },

    /**
     * Disable cloud sync
     */
    disableCloudSync: (state) => {
      state.cloudSyncEnabled = false;
    },

    /**
     * Update last synced timestamp
     */
    updateLastSynced: (state) => {
      state.lastSyncedAt = new Date().toISOString();
    },

    /**
     * Restore giveaway from cloud (for sync)
     * @requirements 3.5 - Restore from localStorage
     */
    restoreGiveaway: (state, action: PayloadAction<{ giveaway: Giveaway }>) => {
      state.active = action.payload.giveaway;
    },
  },
});

// Actions
export const {
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
} = giveawaySlice.actions;

// Selectors
/**
 * Select active giveaway
 * @requirements 3.4 - Components re-render only if selected data changed
 */
export const selectActiveGiveaway = (state: RootState) => state.giveaway.active;

/**
 * Select giveaway history
 */
export const selectGiveawayHistory = (state: RootState) => state.giveaway.history;

/**
 * Select giveaway error
 */
export const selectGiveawayError = (state: RootState) => state.giveaway.error;

/**
 * Select giveaway selecting state
 */
export const selectGiveawaySelecting = (state: RootState) => state.giveaway.isSelecting;

/**
 * Select cloud sync enabled state
 */
export const selectCloudSyncEnabled = (state: RootState) => state.giveaway.cloudSyncEnabled;

/**
 * Select last synced timestamp
 */
export const selectLastSyncedAt = (state: RootState) => state.giveaway.lastSyncedAt;

/**
 * Memoized selector for participants
 */
export const selectParticipants = createSelector(
  [selectActiveGiveaway],
  (giveaway) => giveaway?.participants || []
);

/**
 * Memoized selector for participant count
 */
export const selectParticipantCount = createSelector(
  [selectParticipants],
  (participants) => participants.length
);

/**
 * Memoized selector for winner
 */
export const selectGiveawayWinner = createSelector(
  [selectActiveGiveaway],
  (giveaway) => giveaway?.winner || null
);

/**
 * Memoized selector for giveaway status
 */
export const selectGiveawayStatus = createSelector(
  [selectActiveGiveaway],
  (giveaway) => giveaway?.status || null
);

/**
 * Memoized selector for history count
 */
export const selectGiveawayHistoryCount = createSelector(
  [selectGiveawayHistory],
  (history) => history.length
);

/**
 * Memoized selector for participants by platform
 */
export const selectParticipantsByPlatform = createSelector(
  [selectParticipants],
  (participants) => {
    const byPlatform: Record<string, Participant[]> = {
      twitch: [],
      youtube: [],
    };
    
    participants.forEach(p => {
      if (byPlatform[p.platform]) {
        byPlatform[p.platform].push(p);
      }
    });
    
    return byPlatform;
  }
);

// Reducer
export default giveawaySlice.reducer;
