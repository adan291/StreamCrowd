/**
 * Tests para GameService - Clase base de juegos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseGameService, BaseGameState, GameConfig, createGameService } from '../../src/application/services/GameService';
import type { ChatMessage } from '../../src/domain/ports/IChatProvider';

// Mock BroadcastChannel
vi.stubGlobal('BroadcastChannel', class {
  name: string;
  constructor(name: string) { this.name = name; }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
});

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('GameService', () => {
  const testConfig: GameConfig = {
    gameId: 'test_game',
    channelName: 'test_channel',
    storageKey: 'test_storage',
    maxPlayers: 10,
    joinCommands: ['!join', '!play'],
    autoSync: false, // Disable for tests
  };

  const initialState: BaseGameState = {
    gameState: 'idle',
    players: [],
    round: 1,
    startTime: null,
    endTime: null,
  };

  let service: ReturnType<typeof createGameService>;

  beforeEach(() => {
    localStorageMock.clear();
    service = createGameService(testConfig, { ...initialState });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Player Management', () => {
    it('should add a player', () => {
      const player = service.addPlayer('user1', 'TestUser', '#ff0000');

      expect(player).not.toBeNull();
      expect(player?.username).toBe('TestUser');
      expect(player?.color).toBe('#ff0000');
      expect(player?.score).toBe(0);
      expect(player?.isActive).toBe(true);
    });

    it('should not add duplicate players', () => {
      service.addPlayer('user1', 'TestUser', '#ff0000');
      const duplicate = service.addPlayer('user1', 'TestUser', '#ff0000');

      expect(service.getPlayers()).toHaveLength(1);
      expect(duplicate?.oderId).toBe('user1'); // Returns existing
    });

    it('should respect maxPlayers limit', () => {
      for (let i = 0; i < 15; i++) {
        service.addPlayer(`user${i}`, `User${i}`, '#fff');
      }

      expect(service.getPlayers()).toHaveLength(10); // maxPlayers = 10
    });

    it('should remove a player', () => {
      service.addPlayer('user1', 'TestUser', '#ff0000');
      service.removePlayer('user1');

      expect(service.getPlayers()).toHaveLength(0);
    });

    it('should update player data', () => {
      service.addPlayer('user1', 'TestUser', '#ff0000');
      service.updatePlayer('user1', { score: 100, isActive: false });

      const player = service.getPlayer('user1');
      expect(player?.score).toBe(100);
      expect(player?.isActive).toBe(false);
    });

    it('should add score to player', () => {
      service.addPlayer('user1', 'TestUser', '#ff0000');
      service.addScore('user1', 50);
      service.addScore('user1', 30);

      const player = service.getPlayer('user1');
      expect(player?.score).toBe(80);
    });

    it('should get active players only', () => {
      service.addPlayer('user1', 'Active', '#fff');
      service.addPlayer('user2', 'Inactive', '#fff');
      service.updatePlayer('user2', { isActive: false });

      const active = service.getActivePlayers();
      expect(active).toHaveLength(1);
      expect(active[0].username).toBe('Active');
    });
  });

  describe('Game Lifecycle', () => {
    it('should start the game', () => {
      service.start();

      const state = service.getState();
      expect(state.gameState).toBe('playing');
      expect(state.startTime).not.toBeNull();
    });

    it('should not start if already playing', () => {
      service.start();
      const firstStartTime = service.getState().startTime;

      service.start();
      const secondStartTime = service.getState().startTime;

      expect(firstStartTime).toBe(secondStartTime);
    });

    it('should pause the game', () => {
      service.start();
      service.pause();

      expect(service.getState().gameState).toBe('paused');
    });

    it('should resume the game', () => {
      service.start();
      service.pause();
      service.resume();

      expect(service.getState().gameState).toBe('playing');
    });

    it('should stop the game', () => {
      service.start();
      service.stop();

      const state = service.getState();
      expect(state.gameState).toBe('finished');
      expect(state.endTime).not.toBeNull();
    });

    it('should reset the game', () => {
      service.addPlayer('user1', 'Test', '#fff');
      service.start();
      service.reset();

      const state = service.getState();
      expect(state.gameState).toBe('idle');
      expect(state.players).toHaveLength(0);
      expect(state.round).toBe(1);
      expect(state.startTime).toBeNull();
    });

    it('should report isPlaying correctly', () => {
      expect(service.isPlaying()).toBe(false);

      service.start();
      expect(service.isPlaying()).toBe(true);

      service.pause();
      expect(service.isPlaying()).toBe(false);

      service.resume();
      expect(service.isPlaying()).toBe(true);

      service.stop();
      expect(service.isPlaying()).toBe(false);
    });
  });

  describe('Message Processing', () => {
    const createMessage = (text: string, userId: string = 'user1'): ChatMessage => ({
      id: Date.now().toString(),
      username: userId,
      displayName: userId,
      message: text,
      timestamp: Date.now(),
      userId,
      color: '#ffffff',
      provider: 'twitch',
    });

    it('should process join commands in idle state', () => {
      service.processMessage(createMessage('!join', 'user1'));

      expect(service.getPlayers()).toHaveLength(1);
    });

    it('should process join commands in waiting state', () => {
      service.updateState({ gameState: 'waiting' });
      service.processMessage(createMessage('!play', 'user1'));

      expect(service.getPlayers()).toHaveLength(1);
    });

    it('should not process join commands while playing', () => {
      service.start();
      service.processMessage(createMessage('!join', 'user1'));

      expect(service.getPlayers()).toHaveLength(0);
    });
  });

  describe('State Callbacks', () => {
    it('should notify on state change', () => {
      const callback = vi.fn();
      service.onStateChange(callback);

      // Should be called immediately with current state
      expect(callback).toHaveBeenCalledTimes(1);

      service.start();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should allow unsubscribing from state changes', () => {
      const callback = vi.fn();
      const unsubscribe = service.onStateChange(callback);

      unsubscribe();
      service.start();

      // Only initial call, not the start
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
