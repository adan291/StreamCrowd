/**
 * Poll Slice
 * 
 * Redux slice for poll state management.
 * Handles poll creation, voting, and lifecycle management.
 * 
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdAt: string;
  endsAt?: string;
  status: 'active' | 'ended';
}

export interface PollState {
  active: Poll | null;
  history: Poll[];
  isCreating: boolean;
  error: string | null;
}

// Initial state
const initialState: PollState = {
  active: null,
  history: [],
  isCreating: false,
  error: null,
};

// Slice
const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    /**
     * Create a new poll
     * @requirements 2.1 - Store poll data with title, options, and configuration
     */
    createPoll: (state, action: PayloadAction<Omit<Poll, 'id' | 'createdAt' | 'status'>>) => {
      state.active = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      state.isCreating = false;
      state.error = null;
    },

    /**
     * Add a vote to a poll option
     * @requirements 2.2 - Update vote count for selected option
     */
    addVote: (state, action: PayloadAction<{ optionId: string }>) => {
      if (state.active) {
        const option = state.active.options.find(o => o.id === action.payload.optionId);
        if (option) {
          option.votes += 1;
        }
      }
    },

    /**
     * End the active poll
     * @requirements 2.3 - Move poll to history and clear active poll
     */
    endPoll: (state) => {
      if (state.active) {
        state.active.status = 'ended';
        state.history.unshift(state.active);
        state.active = null;
      }
    },

    /**
     * Reset the active poll without saving to history
     */
    resetPoll: (state) => {
      state.active = null;
      state.error = null;
    },

    /**
     * Set creating state
     */
    setCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCreating = false;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Clear poll history
     */
    clearHistory: (state) => {
      state.history = [];
    },

    /**
     * Remove a specific poll from history
     */
    removeFromHistory: (state, action: PayloadAction<{ pollId: string }>) => {
      state.history = state.history.filter(p => p.id !== action.payload.pollId);
    },
  },
});

// Actions
export const {
  createPoll,
  addVote,
  endPoll,
  resetPoll,
  setCreating,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
} = pollSlice.actions;

// Selectors
/**
 * Select active poll
 * @requirements 2.4 - Components re-render only if selected data changed
 */
export const selectActivePoll = (state: RootState) => state.poll.active;

/**
 * Select poll history
 * @requirements 2.4 - Components re-render only if selected data changed
 */
export const selectPollHistory = (state: RootState) => state.poll.history;

/**
 * Select poll error
 */
export const selectPollError = (state: RootState) => state.poll.error;

/**
 * Select poll creating state
 */
export const selectPollCreating = (state: RootState) => state.poll.isCreating;

/**
 * Memoized selector for active poll options
 * @requirements 2.6 - Memoized selectors to prevent unnecessary recalculations
 */
export const selectActivePollOptions = createSelector(
  [selectActivePoll],
  (poll) => poll?.options || []
);

/**
 * Memoized selector for total votes in active poll
 * @requirements 2.6 - Memoized selectors to prevent unnecessary recalculations
 */
export const selectActivePollTotalVotes = createSelector(
  [selectActivePollOptions],
  (options) => options.reduce((total, option) => total + option.votes, 0)
);

/**
 * Memoized selector for poll results (sorted by votes)
 * @requirements 2.6 - Memoized selectors to prevent unnecessary recalculations
 */
export const selectActivePollResults = createSelector(
  [selectActivePollOptions],
  (options) => [...options].sort((a, b) => b.votes - a.votes)
);

/**
 * Memoized selector for winning option
 * @requirements 2.6 - Memoized selectors to prevent unnecessary recalculations
 */
export const selectActivePollWinner = createSelector(
  [selectActivePollResults],
  (results) => results[0] || null
);

/**
 * Memoized selector for poll history count
 */
export const selectPollHistoryCount = createSelector(
  [selectPollHistory],
  (history) => history.length
);

// Reducer
export default pollSlice.reducer;
