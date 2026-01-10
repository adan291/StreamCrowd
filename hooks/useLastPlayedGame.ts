/**
 * useLastPlayedGame Hook
 * Persists and retrieves the last played game
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface LastPlayedInfo {
  gameId: string;
  timestamp: number;
  playCount: number;
}

export interface UseLastPlayedGameOptions {
  storageKey?: string;
}

export interface UseLastPlayedGameReturn {
  lastPlayed: LastPlayedInfo | null;
  setLastPlayed: (gameId: string) => void;
  isLastPlayed: (gameId: string) => boolean;
  getPlayCount: (gameId: string) => number;
  clearLastPlayed: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_STORAGE_KEY = 'last_played_game';
const PLAY_COUNTS_KEY = 'game_play_counts';

// ============================================
// HOOK
// ============================================

export function useLastPlayedGame(
  options: UseLastPlayedGameOptions = {}
): UseLastPlayedGameReturn {
  const { storageKey = DEFAULT_STORAGE_KEY } = options;

  // State
  const [lastPlayed, setLastPlayedState] = useState<LastPlayedInfo | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(PLAY_COUNTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      if (lastPlayed) {
        localStorage.setItem(storageKey, JSON.stringify(lastPlayed));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore storage errors
    }
  }, [lastPlayed, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(playCounts));
    } catch {
      // Ignore storage errors
    }
  }, [playCounts]);

  // Set last played game
  const setLastPlayed = useCallback((gameId: string) => {
    const newPlayCount = (playCounts[gameId] || 0) + 1;
    
    setPlayCounts(prev => ({
      ...prev,
      [gameId]: newPlayCount,
    }));

    setLastPlayedState({
      gameId,
      timestamp: Date.now(),
      playCount: newPlayCount,
    });
  }, [playCounts]);

  // Check if a game is the last played
  const isLastPlayed = useCallback((gameId: string): boolean => {
    return lastPlayed?.gameId === gameId;
  }, [lastPlayed]);

  // Get play count for a game
  const getPlayCount = useCallback((gameId: string): number => {
    return playCounts[gameId] || 0;
  }, [playCounts]);

  // Clear last played
  const clearLastPlayed = useCallback(() => {
    setLastPlayedState(null);
  }, []);

  return {
    lastPlayed,
    setLastPlayed,
    isLastPlayed,
    getPlayCount,
    clearLastPlayed,
  };
}

export default useLastPlayedGame;
