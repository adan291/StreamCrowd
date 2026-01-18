/**
 * Games Slice
 * 
 * Redux slice for games state management.
 * Handles game lifecycle, scores, and game history.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export type GameType = 
  | 'veoVeo'
  | 'fishing'
  | 'pium'
  | 'roulette'
  | 'battleship'
  | 'duckHunt'
  | 'ppt'
  | 'ahorcado'
  | 'carrera'
  | 'memoria'
  | 'potato'
  | 'trivia'
  | 'partyCo';

export interface GameScore {
  playerId: string;
  playerName: string;
  score: number;
}

export interface Game {
  id: string;
  type: GameType;
  config: Record<string, any>;
  scores: GameScore[];
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'ended';
}

export interface GamesState {
  active: Game | null;
  scores: Record<string, number>; // playerId -> score
  history: Game[];
  error: string | null;
}

// Initial state
const initialState: GamesState = {
  active: null,
  scores: {},
  history: [],
  error: null,
};

// Slice
const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    /**
     * Start a new game
     * @requirements 4.1 - Store active game type and configuration
     */
    startGame: (state, action: PayloadAction<{ type: GameType; config?: Record<string, any> }>) => {
      state.active = {
        id: crypto.randomUUID(),
        type: action.payload.type,
        config: action.payload.config || {},
        scores: [],
        startedAt: new Date().toISOString(),
        status: 'active',
      };
      state.scores = {};
      state.error = null;
    },

    /**
     * Update score for a player
     * @requirements 4.2 - Update scores for each player
     */
    updateScore: (state, action: PayloadAction<{ playerId: string; playerName: string; score: number }>) => {
      if (state.active) {
        const { playerId, playerName, score } = action.payload;
        
        // Update scores map
        state.scores[playerId] = score;
        
        // Update or add score in active game
        const existingScore = state.active.scores.find(s => s.playerId === playerId);
        if (existingScore) {
          existingScore.score = score;
        } else {
          state.active.scores.push({ playerId, playerName, score });
        }
      }
    },

    /**
     * Increment score for a player
     */
    incrementScore: (state, action: PayloadAction<{ playerId: string; playerName: string; amount?: number }>) => {
      if (state.active) {
        const { playerId, playerName, amount = 1 } = action.payload;
        
        // Update scores map
        const currentScore = state.scores[playerId] || 0;
        state.scores[playerId] = currentScore + amount;
        
        // Update or add score in active game
        const existingScore = state.active.scores.find(s => s.playerId === playerId);
        if (existingScore) {
          existingScore.score += amount;
        } else {
          state.active.scores.push({ playerId, playerName, score: amount });
        }
      }
    },

    /**
     * End the active game
     * @requirements 4.3 - Store results and clear active game
     */
    endGame: (state) => {
      if (state.active) {
        state.active.endedAt = new Date().toISOString();
        state.active.status = 'ended';
        state.history.unshift(state.active);
        state.active = null;
        state.scores = {};
      }
    },

    /**
     * Reset the active game without saving to history
     */
    resetGame: (state) => {
      state.active = null;
      state.scores = {};
      state.error = null;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Clear game history
     */
    clearHistory: (state) => {
      state.history = [];
    },

    /**
     * Remove a specific game from history
     */
    removeFromHistory: (state, action: PayloadAction<{ gameId: string }>) => {
      state.history = state.history.filter(g => g.id !== action.payload.gameId);
    },
  },
});

// Actions
export const {
  startGame,
  updateScore,
  incrementScore,
  endGame,
  resetGame,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
} = gamesSlice.actions;

// Selectors
/**
 * Select active game
 * @requirements 4.4 - Track which game is currently active
 */
export const selectActiveGame = (state: RootState) => state.games.active;

/**
 * Select game scores
 */
export const selectGameScores = (state: RootState) => state.games.scores;

/**
 * Select game history
 */
export const selectGameHistory = (state: RootState) => state.games.history;

/**
 * Select game error
 */
export const selectGameError = (state: RootState) => state.games.error;

/**
 * Memoized selector for active game type
 */
export const selectActiveGameType = createSelector(
  [selectActiveGame],
  (game) => game?.type || null
);

/**
 * Memoized selector for active game config
 */
export const selectActiveGameConfig = createSelector(
  [selectActiveGame],
  (game) => game?.config || {}
);

/**
 * Memoized selector for active game scores
 */
export const selectActiveGameScores = createSelector(
  [selectActiveGame],
  (game) => game?.scores || []
);

/**
 * Memoized selector for sorted scores (highest first)
 */
export const selectSortedScores = createSelector(
  [selectActiveGameScores],
  (scores) => [...scores].sort((a, b) => b.score - a.score)
);

/**
 * Memoized selector for game leader
 */
export const selectGameLeader = createSelector(
  [selectSortedScores],
  (scores) => scores[0] || null
);

/**
 * Memoized selector for game status
 */
export const selectGameStatus = createSelector(
  [selectActiveGame],
  (game) => game?.status || null
);

/**
 * Memoized selector for history count
 */
export const selectGameHistoryCount = createSelector(
  [selectGameHistory],
  (history) => history.length
);

/**
 * Memoized selector for games by type
 */
export const selectGamesByType = createSelector(
  [selectGameHistory],
  (history) => {
    const byType: Record<string, Game[]> = {};
    
    history.forEach(game => {
      if (!byType[game.type]) {
        byType[game.type] = [];
      }
      byType[game.type].push(game);
    });
    
    return byType;
  }
);

// Reducer
export default gamesSlice.reducer;
