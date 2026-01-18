/**
 * useGame Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for games feature.
 * Provides a clean API for components to interact with game state.
 * 
 * @requirements 9.3
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  startGame,
  updateScore,
  incrementScore,
  endGame,
  resetGame,
  setError,
  clearError,
  clearHistory,
  removeFromHistory,
  selectActiveGame,
  selectGameScores,
  selectGameHistory,
  selectGameError,
  selectActiveGameType,
  selectActiveGameConfig,
  selectActiveGameScores,
  selectSortedScores,
  selectGameLeader,
  selectGameStatus,
  selectGameHistoryCount,
  selectGamesByType,
  type Game,
  type GameType,
  type GameScore,
} from '../state/slices/gamesSlice';

export interface UseGameReturn {
  // State
  activeGame: Game | null;
  scores: Record<string, number>;
  history: Game[];
  error: string | null;
  activeGameType: GameType | null;
  activeGameConfig: Record<string, any>;
  activeGameScores: GameScore[];
  sortedScores: GameScore[];
  gameLeader: GameScore | null;
  gameStatus: 'active' | 'ended' | null;
  historyCount: number;
  gamesByType: Record<string, Game[]>;

  // Actions
  startGame: (type: GameType, config?: Record<string, any>) => void;
  updateScore: (playerId: string, playerName: string, score: number) => void;
  incrementScore: (playerId: string, playerName: string, amount?: number) => void;
  endGame: () => void;
  resetGame: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  clearHistory: () => void;
  removeFromHistory: (gameId: string) => void;
}

/**
 * Custom hook for game state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * 
 * @example
 * ```tsx
 * const { activeGame, scores, startGame, updateScore, endGame } = useGame();
 * 
 * // Start a game
 * startGame('veoVeo', { difficulty: 'medium' });
 * 
 * // Update scores
 * updateScore('player1', 'Alice', 100);
 * incrementScore('player2', 'Bob', 10);
 * 
 * // End the game
 * endGame();
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useGame(): UseGameReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  const activeGame = useAppSelector(selectActiveGame);
  const scores = useAppSelector(selectGameScores);
  const history = useAppSelector(selectGameHistory);
  const error = useAppSelector(selectGameError);
  const activeGameType = useAppSelector(selectActiveGameType);
  const activeGameConfig = useAppSelector(selectActiveGameConfig);
  const activeGameScores = useAppSelector(selectActiveGameScores);
  const sortedScores = useAppSelector(selectSortedScores);
  const gameLeader = useAppSelector(selectGameLeader);
  const gameStatus = useAppSelector(selectGameStatus);
  const historyCount = useAppSelector(selectGameHistoryCount);
  const gamesByType = useAppSelector(selectGamesByType);

  // Action creators wrapped in useCallback for stability
  const handleStartGame = useCallback(
    (type: GameType, config?: Record<string, any>) => {
      dispatch(startGame({ type, config }));
    },
    [dispatch]
  );

  const handleUpdateScore = useCallback(
    (playerId: string, playerName: string, score: number) => {
      dispatch(updateScore({ playerId, playerName, score }));
    },
    [dispatch]
  );

  const handleIncrementScore = useCallback(
    (playerId: string, playerName: string, amount?: number) => {
      dispatch(incrementScore({ playerId, playerName, amount }));
    },
    [dispatch]
  );

  const handleEndGame = useCallback(() => {
    dispatch(endGame());
  }, [dispatch]);

  const handleResetGame = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  const handleSetError = useCallback(
    (errorMsg: string) => {
      dispatch(setError(errorMsg));
    },
    [dispatch]
  );

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleClearHistory = useCallback(() => {
    dispatch(clearHistory());
  }, [dispatch]);

  const handleRemoveFromHistory = useCallback(
    (gameId: string) => {
      dispatch(removeFromHistory({ gameId }));
    },
    [dispatch]
  );

  return {
    // State
    activeGame,
    scores,
    history,
    error,
    activeGameType,
    activeGameConfig,
    activeGameScores,
    sortedScores,
    gameLeader,
    gameStatus,
    historyCount,
    gamesByType,

    // Actions
    startGame: handleStartGame,
    updateScore: handleUpdateScore,
    incrementScore: handleIncrementScore,
    endGame: handleEndGame,
    resetGame: handleResetGame,
    setError: handleSetError,
    clearError: handleClearError,
    clearHistory: handleClearHistory,
    removeFromHistory: handleRemoveFromHistory,
  };
}

export default useGame;
