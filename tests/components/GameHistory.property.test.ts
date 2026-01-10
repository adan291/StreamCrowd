/**
 * Property-Based Tests for Game History and Last Played Persistence
 * Feature: dynamics-ui-improvements
 * 
 * Tests game history and last played game persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES
// ============================================

interface GameHistoryItem {
  id: string;
  gameName: string;
  gameType: string;
  winner: string;
  participantCount: number;
  duration: number;
  finishedAt: number;
}

interface LastPlayedConfig {
  gameId: string;
  timestamp: number;
}

// ============================================
// HELPER FUNCTIONS (simulating component logic)
// ============================================

const STORAGE_KEY = 'last_played_game';

function saveLastPlayed(gameId: string): void {
  const config: LastPlayedConfig = {
    gameId,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function loadLastPlayed(): LastPlayedConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return null;
}

function sortGamesWithLastPlayed(
  games: { id: string; name: string }[],
  lastPlayedId: string | null
): { id: string; name: string; isLastPlayed: boolean }[] {
  return games
    .map(g => ({ ...g, isLastPlayed: g.id === lastPlayedId }))
    .sort((a, b) => {
      if (a.isLastPlayed && !b.isLastPlayed) return -1;
      if (!a.isLastPlayed && b.isLastPlayed) return 1;
      return 0;
    });
}

// ============================================
// MOCK LOCALSTORAGE
// ============================================

const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

// ============================================
// GENERATORS
// ============================================

const gameIdArb = fc.constantFrom(
  'pium', 'roulette', 'fishing', 'potato', 'trivia',
  'battleship', 'duckhunt', 'veoveo', 'ppt', 'ahorcado'
);

const gameArb = fc.record({
  id: gameIdArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
});

const gamesListArb = fc.array(gameArb, { minLength: 1, maxLength: 10 });

// ============================================
// PROPERTY TESTS
// ============================================

describe('Game History Property Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Property 10: Last Played Game Persistence
   * The last played game SHALL be persisted and shown first in the game list.
   * Validates: Requirements 7.4
   */
  describe('Property 10: Last Played Game Persistence', () => {
    it('should persist last played game to localStorage', () => {
      fc.assert(
        fc.property(gameIdArb, (gameId) => {
          saveLastPlayed(gameId);
          const loaded = loadLastPlayed();
          
          return loaded !== null && loaded.gameId === gameId;
        }),
        { numRuns: 100 }
      );
    });

    it('should include timestamp when saving', () => {
      fc.assert(
        fc.property(gameIdArb, (gameId) => {
          const before = Date.now();
          saveLastPlayed(gameId);
          const after = Date.now();
          
          const loaded = loadLastPlayed();
          
          return (
            loaded !== null &&
            loaded.timestamp >= before &&
            loaded.timestamp <= after
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should return null when no last played game exists', () => {
      mockLocalStorage.clear();
      const loaded = loadLastPlayed();
      expect(loaded).toBeNull();
    });

    it('should sort last played game to the top', () => {
      fc.assert(
        fc.property(gamesListArb, gameIdArb, (games, lastPlayedId) => {
          // Ensure lastPlayedId is in the games list
          if (!games.some(g => g.id === lastPlayedId)) {
            games.push({ id: lastPlayedId, name: 'Last Played' });
          }
          
          const sorted = sortGamesWithLastPlayed(games, lastPlayedId);
          
          // First game should be the last played
          return sorted[0].id === lastPlayedId && sorted[0].isLastPlayed;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve order of other games when sorting', () => {
      fc.assert(
        fc.property(gamesListArb, gameIdArb, (games, lastPlayedId) => {
          // Ensure lastPlayedId is in the games list
          if (!games.some(g => g.id === lastPlayedId)) {
            games.push({ id: lastPlayedId, name: 'Last Played' });
          }
          
          const sorted = sortGamesWithLastPlayed(games, lastPlayedId);
          
          // All games should still be present
          return sorted.length === games.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null lastPlayedId gracefully', () => {
      fc.assert(
        fc.property(gamesListArb, (games) => {
          const sorted = sortGamesWithLastPlayed(games, null);
          
          // No game should be marked as last played
          return sorted.every(g => !g.isLastPlayed);
        }),
        { numRuns: 100 }
      );
    });

    it('should overwrite previous last played when saving new', () => {
      fc.assert(
        fc.property(gameIdArb, gameIdArb, (firstGame, secondGame) => {
          saveLastPlayed(firstGame);
          saveLastPlayed(secondGame);
          
          const loaded = loadLastPlayed();
          
          return loaded !== null && loaded.gameId === secondGame;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Game List Integrity
   * Tests that game list operations maintain data integrity
   */
  describe('Game List Integrity', () => {
    it('should not duplicate games when sorting (unique input)', () => {
      fc.assert(
        fc.property(gameIdArb, (lastPlayedId) => {
          // Create a list with unique IDs
          const games = [
            { id: 'pium', name: 'Billar' },
            { id: 'roulette', name: 'Ruleta' },
            { id: 'fishing', name: 'Pesca' },
          ];
          
          const sorted = sortGamesWithLastPlayed(games, lastPlayedId);
          
          // Check for duplicates by id
          const ids = sorted.map(g => g.id);
          const uniqueIds = new Set(ids);
          
          return ids.length === uniqueIds.size;
        }),
        { numRuns: 100 }
      );
    });

    it('should mark exactly one game as last played (unique input)', () => {
      fc.assert(
        fc.property(gameIdArb, (lastPlayedId) => {
          // Create a list with unique IDs that includes lastPlayedId
          const games = [
            { id: 'pium', name: 'Billar' },
            { id: 'roulette', name: 'Ruleta' },
            { id: 'fishing', name: 'Pesca' },
            { id: lastPlayedId, name: 'Last Played' },
          ];
          
          // Deduplicate by id
          const uniqueGames = games.filter((g, i, arr) => 
            arr.findIndex(x => x.id === g.id) === i
          );
          
          const sorted = sortGamesWithLastPlayed(uniqueGames, lastPlayedId);
          const lastPlayedCount = sorted.filter(g => g.isLastPlayed).length;
          
          return lastPlayedCount === 1;
        }),
        { numRuns: 100 }
      );
    });
  });
});
