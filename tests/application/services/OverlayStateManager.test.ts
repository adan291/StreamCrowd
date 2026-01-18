/**
 * Unit tests for OverlayStateManager service
 * 
 * These tests verify the state validation, transformation, comparison,
 * and migration functionality of the OverlayStateManager.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OverlayStateManager } from '@/src/application/services/OverlayStateManager';
import {
  createOverlayState,
  updateOverlayState,
  type PollOverlayState,
  type GiveawayOverlayState,
  type GameOverlayState,
  type PredictionOverlayState,
} from '@/src/domain/entities/OverlayState';
import {
  ValidationSyncError,
  SchemaMismatchSyncError,
  SerializationSyncError,
} from '@/src/domain/errors/OverlaySyncErrors';

describe('OverlayStateManager', () => {
  let stateManager: OverlayStateManager;

  beforeEach(() => {
    stateManager = new OverlayStateManager();
  });

  describe('validateState', () => {
    it('should validate a correct poll overlay state', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test-channel', {
        question: 'What is your favorite color?',
        options: [
          { id: 1, label: 'Red', votes: 5, color: '#ff0000' },
          { id: 2, label: 'Blue', votes: 3, color: '#0000ff' },
        ],
        totalVotes: 8,
        showResults: true,
        startTime: Date.now() - 60000,
      });

      const result = stateManager.validateState(pollState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid poll overlay state', () => {
      const invalidPollState = {
        id: 'test-poll',
        type: 'poll',
        isActive: true,
        updatedAt: Date.now(),
        version: 1,
        channelId: 'test',
        data: {
          question: '', // Invalid: empty question
          options: [], // Invalid: no options
          totalVotes: -1, // Invalid: negative votes
          showResults: 'yes', // Invalid: should be boolean
          startTime: 0, // Invalid: invalid timestamp
        },
      } as any;

      const result = stateManager.validateState(invalidPollState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle validation exceptions gracefully', () => {
      const malformedState = null as any;

      const result = stateManager.validateState(malformedState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALIDATION_EXCEPTION');
    });
  });

  describe('transformForSync', () => {
    it('should transform valid state without options', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test-channel', {
        question: 'Test question?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const transformed = stateManager.transformForSync(pollState);

      expect(transformed).toEqual(pollState);
      expect(transformed).not.toBe(pollState); // Should be a clone
    });

    it('should normalize timestamps when requested', () => {
      const futureTime = Date.now() + 120000; // 2 minutes in future
      const pollState = createOverlayState<PollOverlayState>('poll', 'test-channel', {
        question: 'Test question?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: futureTime,
      });
      pollState.updatedAt = futureTime;

      const transformed = stateManager.transformForSync(pollState, {
        normalizeTimestamps: true,
      });

      expect(transformed.updatedAt).toBeLessThanOrEqual(Date.now());
      expect(transformed.data.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should sanitize state when requested', () => {
      const giveawayState = createOverlayState<GiveawayOverlayState>('giveaway', 'very-long-sensitive-channel-id-12345', {
        winner: null,
        isSpinning: false,
        participants: Array.from({ length: 1500 }, (_, i) => `user${i}`), // Large participant list
        mode: 'viewers',
      });

      const transformed = stateManager.transformForSync(giveawayState, {
        sanitize: true,
      });

      expect(transformed.channelId).toMatch(/^very-lon\.\.\.$/);
      expect(transformed.data.participants.length).toBeLessThanOrEqual(1000);
    });

    it('should throw ValidationSyncError for invalid state', () => {
      const invalidState = {
        id: 'test',
        type: 'poll',
        isActive: true,
        updatedAt: Date.now(),
        version: 1,
        channelId: 'test',
        data: {
          question: '', // Invalid
          options: [],
          totalVotes: 0,
          showResults: false,
          startTime: Date.now(),
        },
      } as any;

      expect(() => {
        stateManager.transformForSync(invalidState, { validate: true });
      }).toThrow(ValidationSyncError);
    });

    it('should skip validation when validate: false', () => {
      const invalidState = {
        id: 'test',
        type: 'poll',
        data: { invalid: true },
      } as any;

      expect(() => {
        stateManager.transformForSync(invalidState, { validate: false });
      }).not.toThrow();
    });
  });

  describe('compareStates', () => {
    it('should detect identical states', () => {
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: 1234567890,
      });

      const state2 = { ...state1 };

      const isEqual = stateManager.compareStates(state1, state2);

      expect(isEqual).toBe(true);
    });

    it('should detect different states', () => {
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const state2 = updateOverlayState(state1, { totalVotes: 5 });

      const isEqual = stateManager.compareStates(state1, state2);

      expect(isEqual).toBe(false);
    });

    it('should ignore timestamps when requested', () => {
      const baseTime = Date.now();
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: baseTime,
      });

      const state2 = { ...state1, updatedAt: baseTime + 5000 };
      state2.data = { ...state2.data, startTime: baseTime + 1000 };

      const isEqual = stateManager.compareStates(state1, state2, {
        ignoreTimestamps: true,
      });

      expect(isEqual).toBe(true);
    });

    it('should ignore specified fields', () => {
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const state2 = updateOverlayState(state1, { totalVotes: 5 });

      const isEqual = stateManager.compareStates(state1, state2, {
        ignoreFields: ['data.totalVotes'],
      });

      expect(isEqual).toBe(true);
    });

    it('should apply tolerance for numeric comparisons', () => {
      const baseTime = Date.now();
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: baseTime,
      });

      const state2 = { ...state1, updatedAt: baseTime + 50 }; // 50ms difference

      const isEqual = stateManager.compareStates(state1, state2, {
        tolerance: 100, // 100ms tolerance
      });

      expect(isEqual).toBe(true);
    });

    it('should handle comparison errors gracefully', () => {
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Create a state with circular reference to cause comparison error
      const state2 = { ...state1 } as any;
      state2.circular = state2;

      const isEqual = stateManager.compareStates(state1, state2);

      expect(isEqual).toBe(false);
    });
  });

  describe('createStateSnapshot', () => {
    it('should create a valid snapshot', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const snapshot = stateManager.createStateSnapshot(pollState, {
        source: 'test',
        reason: 'unit-test',
      });

      expect(snapshot.state).toEqual(pollState);
      expect(snapshot.state).not.toBe(pollState); // Should be a clone
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.checksum).toBeTruthy();
      expect(snapshot.metadata.source).toBe('test');
      expect(snapshot.metadata.reason).toBe('unit-test');
      expect(snapshot.metadata.version).toBe(pollState.version);
    });

    it('should store snapshot in history', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      stateManager.createStateSnapshot(pollState);
      const history = stateManager.getSnapshotHistory(pollState.id);

      expect(history).toHaveLength(1);
      expect(history[0].state).toEqual(pollState);
    });

    it('should limit snapshot history size', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Create more snapshots than the limit (10)
      for (let i = 0; i < 15; i++) {
        const updatedState = updateOverlayState(pollState, { totalVotes: i });
        stateManager.createStateSnapshot(updatedState);
      }

      const history = stateManager.getSnapshotHistory(pollState.id);

      expect(history.length).toBeLessThanOrEqual(10);
      expect(history[0].state.data.totalVotes).toBe(14); // Newest first
    });
  });

  describe('migrateStateVersion', () => {
    it('should not migrate if versions match', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const result = stateManager.migrateStateVersion(pollState, pollState.version);

      expect(result.migrated).toBe(false);
      expect(result.state).toEqual(pollState);
      expect(result.migrationsApplied).toHaveLength(0);
    });

    it('should throw error for unsupported target version', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      expect(() => {
        stateManager.migrateStateVersion(pollState, 999); // Unsupported version
      }).toThrow(SchemaMismatchSyncError);
    });

    it('should handle migration errors gracefully', () => {
      const invalidState = {
        id: 'test',
        type: 'invalid-type',
        version: 1,
        isActive: true,
        updatedAt: Date.now(),
        channelId: 'test',
      } as any;

      const result = stateManager.migrateStateVersion(invalidState, 2);
      
      // The migration should succeed but with warnings since the domain function
      // will apply migrations even to invalid states
      expect(result.originalVersion).toBe(1);
      expect(result.targetVersion).toBe(2);
    });
  });

  describe('snapshot management', () => {
    it('should verify snapshot integrity', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const snapshot = stateManager.createStateSnapshot(pollState);
      const isValid = stateManager.verifySnapshotIntegrity(snapshot);

      expect(isValid).toBe(true);
    });

    it('should detect corrupted snapshots', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const snapshot = stateManager.createStateSnapshot(pollState);
      
      // Corrupt the snapshot by changing the checksum directly
      snapshot.checksum = 'corrupted-checksum';
      
      const isValid = stateManager.verifySnapshotIntegrity(snapshot);

      expect(isValid).toBe(false);
    });

    it('should clear snapshot history', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      stateManager.createStateSnapshot(pollState);
      expect(stateManager.getSnapshotHistory(pollState.id)).toHaveLength(1);

      stateManager.clearSnapshotHistory(pollState.id);
      expect(stateManager.getSnapshotHistory(pollState.id)).toHaveLength(0);
    });
  });

  describe('performance metrics', () => {
    it('should provide accurate performance metrics', () => {
      const pollState1 = createOverlayState<PollOverlayState>('poll', 'test1', {
        question: 'Test 1?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const pollState2 = createOverlayState<PollOverlayState>('poll', 'test2', {
        question: 'Test 2?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      stateManager.createStateSnapshot(pollState1);
      stateManager.createStateSnapshot(pollState1);
      stateManager.createStateSnapshot(pollState2);

      const metrics = stateManager.getPerformanceMetrics();

      expect(metrics.totalSnapshots).toBe(3);
      expect(metrics.snapshotsByState[pollState1.id]).toBe(2);
      expect(metrics.snapshotsByState[pollState2.id]).toBe(1);
      expect(metrics.oldestSnapshot).toBeGreaterThan(0);
      expect(metrics.newestSnapshot).toBeGreaterThan(0);
    });

    it('should handle empty metrics', () => {
      const metrics = stateManager.getPerformanceMetrics();

      expect(metrics.totalSnapshots).toBe(0);
      expect(metrics.snapshotsByState).toEqual({});
      expect(metrics.oldestSnapshot).toBeNull();
      expect(metrics.newestSnapshot).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle large game states during sanitization', () => {
      const largeGameState = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item${i}` })),
      };

      const gameState = createOverlayState<GameOverlayState>('game', 'test', {
        gameType: 'large-game',
        state: largeGameState,
        players: ['player1'],
        isActive: true,
      });

      const transformed = stateManager.transformForSync(gameState, {
        sanitize: true,
      });

      // Should truncate large state
      expect(transformed.data.state).toHaveProperty('truncated', true);
    });

    it('should handle malformed states gracefully', () => {
      const malformedState = {
        type: 'poll',
        data: null,
      } as any;

      const result = stateManager.validateState(malformedState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle checksum calculation errors', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Test that we can create a snapshot even with potential issues
      const snapshot = stateManager.createStateSnapshot(pollState);

      expect(snapshot.checksum).toBeTruthy();
      expect(snapshot.checksum).not.toBe('invalid');
    });
  });
});