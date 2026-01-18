/**
 * Integration tests for game components using Redux
 * Tests that VeoVeo and ChatFishing components properly integrate with Redux store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import gamesReducer from '../../src/application/state/slices/gamesSlice';
import { useGame } from '../../src/application/hooks/useGame';

describe('Game Components Redux Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        games: gamesReducer,
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  describe('VeoVeo Game', () => {
    it('should start a VeoVeo game in Redux', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.activeGame).toBeNull();

      act(() => {
        result.current.startGame('veoVeo', { secretWord: 'test', hint: 'test hint' });
      });

      expect(result.current.activeGame).not.toBeNull();
      expect(result.current.activeGameType).toBe('veoVeo');
      expect(result.current.activeGameConfig).toEqual({ secretWord: 'test', hint: 'test hint' });
    });

    it('should update player scores in VeoVeo', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
      });

      act(() => {
        result.current.updateScore('player1', 'Alice', 100);
      });

      expect(result.current.scores).toEqual({ player1: 100 });

      act(() => {
        result.current.updateScore('player2', 'Bob', 50);
      });

      expect(result.current.scores).toEqual({ player1: 100, player2: 50 });
    });

    it('should end VeoVeo game and move to history', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
        result.current.updateScore('player1', 'Alice', 100);
      });

      expect(result.current.activeGame).not.toBeNull();
      expect(result.current.history).toHaveLength(0);

      act(() => {
        result.current.endGame();
      });

      expect(result.current.activeGame).toBeNull();
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].type).toBe('veoVeo');
    });
  });

  describe('Fishing Game', () => {
    it('should start a Fishing game in Redux', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('fishing');
      });

      expect(result.current.activeGame).not.toBeNull();
      expect(result.current.activeGameType).toBe('fishing');
    });

    it('should update catch scores in Fishing', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('fishing');
      });

      // Simulate catching fish
      act(() => {
        result.current.updateScore('fish1', 'user1', 10); // common fish
      });

      expect(result.current.scores).toEqual({ fish1: 10 });

      act(() => {
        result.current.updateScore('fish2', 'user2', 50); // epic fish
      });

      expect(result.current.scores).toEqual({ fish1: 10, fish2: 50 });
    });

    it('should track multiple catches from same user', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('fishing');
      });

      act(() => {
        result.current.updateScore('user1-catch1', 'user1', 10);
        result.current.updateScore('user1-catch2', 'user1', 25);
        result.current.updateScore('user1-catch3', 'user1', 50);
      });

      // Each catch is tracked separately by fish ID
      expect(result.current.scores['user1-catch1']).toBe(10);
      expect(result.current.scores['user1-catch2']).toBe(25);
      expect(result.current.scores['user1-catch3']).toBe(50);
    });

    it('should end Fishing game and preserve history', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('fishing');
        result.current.updateScore('fish1', 'user1', 100);
      });

      act(() => {
        result.current.endGame();
      });

      expect(result.current.activeGame).toBeNull();
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].type).toBe('fishing');
    });
  });

  describe('Game State Management', () => {
    it('should handle multiple game sessions', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      // First game
      act(() => {
        result.current.startGame('veoVeo');
        result.current.updateScore('p1', 'Alice', 100);
        result.current.endGame();
      });

      expect(result.current.history).toHaveLength(1);

      // Second game
      act(() => {
        result.current.startGame('fishing');
        result.current.updateScore('f1', 'Bob', 50);
        result.current.endGame();
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].type).toBe('fishing'); // Most recent first
      expect(result.current.history[1].type).toBe('veoVeo');
    });

    it('should clear history when requested', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
        result.current.endGame();
        result.current.startGame('fishing');
        result.current.endGame();
      });

      expect(result.current.history).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
    });

    it('should reset game state', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
        result.current.updateScore('p1', 'Alice', 100);
      });

      expect(result.current.activeGame).not.toBeNull();
      expect(result.current.scores).toEqual({ p1: 100 });

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.activeGame).toBeNull();
      expect(result.current.scores).toEqual({});
    });
  });

  describe('Game Selectors', () => {
    it('should provide sorted scores', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
        result.current.updateScore('p1', 'Alice', 50);
        result.current.updateScore('p2', 'Bob', 100);
        result.current.updateScore('p3', 'Charlie', 75);
      });

      const sorted = result.current.sortedScores;
      expect(sorted).toHaveLength(3);
      expect(sorted[0].score).toBe(100); // Bob
      expect(sorted[1].score).toBe(75);  // Charlie
      expect(sorted[2].score).toBe(50);  // Alice
    });

    it('should identify game leader', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      act(() => {
        result.current.startGame('veoVeo');
        result.current.updateScore('p1', 'Alice', 50);
        result.current.updateScore('p2', 'Bob', 100);
      });

      const leader = result.current.gameLeader;
      expect(leader).not.toBeNull();
      expect(leader?.playerName).toBe('Bob');
      expect(leader?.score).toBe(100);
    });

    it('should track game status', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.gameStatus).toBeNull();

      act(() => {
        result.current.startGame('veoVeo');
      });

      expect(result.current.gameStatus).toBe('active');

      act(() => {
        result.current.endGame();
      });

      expect(result.current.gameStatus).toBeNull();
    });
  });
});
