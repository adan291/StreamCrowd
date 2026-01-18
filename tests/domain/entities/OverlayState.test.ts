/**
 * Unit tests for OverlayState entities
 * 
 * These tests verify the basic functionality of overlay state entities,
 * validation functions, and error handling.
 */

import { describe, it, expect } from 'vitest';
import {
  createOverlayState,
  updateOverlayState,
  deactivateOverlayState,
  isPollOverlayState,
  isGiveawayOverlayState,
  isGameOverlayState,
  isPredictionOverlayState,
  cloneOverlayState,
  type PollOverlayState,
  type GiveawayOverlayState,
  type GameOverlayState,
  type PredictionOverlayState,
} from '@/src/domain/entities/OverlayState';

import {
  validateOverlayState,
  validateAndMigrateSchema,
  areOverlayStatesEqual,
  sanitizeOverlayStateForLogging,
  OVERLAY_STATE_SCHEMA,
} from '@/src/domain/entities/OverlayStateValidation';

import {
  OverlaySyncError,
  ConnectionSyncError,
  ValidationSyncError,
  SyncErrorType,
  createSyncErrorFromGeneric,
  formatErrorForUser,
} from '@/src/domain/errors/OverlaySyncErrors';

describe('OverlayState Entities', () => {
  describe('createOverlayState', () => {
    it('should create a valid poll overlay state', () => {
      const pollData = {
        question: 'What is your favorite color?',
        options: [
          { id: 1, label: 'Red', votes: 0, color: '#ff0000' },
          { id: 2, label: 'Blue', votes: 0, color: '#0000ff' },
        ],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      };

      const pollState = createOverlayState<PollOverlayState>(
        'poll',
        'test-channel',
        pollData
      );

      expect(pollState.type).toBe('poll');
      expect(pollState.channelId).toBe('test-channel');
      expect(pollState.isActive).toBe(true);
      expect(pollState.version).toBe(1);
      expect(pollState.data).toEqual(pollData);
      expect(pollState.id).toMatch(/^poll_\d+_[a-z0-9]+$/);
    });

    it('should create a valid giveaway overlay state', () => {
      const giveawayData = {
        winner: null,
        isSpinning: false,
        participants: ['user1', 'user2', 'user3'],
        mode: 'viewers' as const,
      };

      const giveawayState = createOverlayState<GiveawayOverlayState>(
        'giveaway',
        'test-channel',
        giveawayData
      );

      expect(giveawayState.type).toBe('giveaway');
      expect(giveawayState.data).toEqual(giveawayData);
      expect(isGiveawayOverlayState(giveawayState)).toBe(true);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify poll overlay states', () => {
      const pollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      expect(isPollOverlayState(pollState)).toBe(true);
      expect(isGiveawayOverlayState(pollState)).toBe(false);
      expect(isGameOverlayState(pollState)).toBe(false);
      expect(isPredictionOverlayState(pollState)).toBe(false);
    });
  });

  describe('State Manipulation', () => {
    it('should update overlay state correctly', async () => {
      const initialState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const updatedState = updateOverlayState(initialState, {
        showResults: true,
        totalVotes: 5,
      });

      expect(updatedState.data.showResults).toBe(true);
      expect(updatedState.data.totalVotes).toBe(5);
      expect(updatedState.data.question).toBe('Test?'); // Unchanged
      expect(updatedState.updatedAt).toBeGreaterThanOrEqual(initialState.updatedAt);
    });

    it('should deactivate overlay state', async () => {
      const activeState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const deactivatedState = deactivateOverlayState(activeState);

      expect(deactivatedState.isActive).toBe(false);
      expect(deactivatedState.updatedAt).toBeGreaterThanOrEqual(activeState.updatedAt);
    });

    it('should clone overlay state correctly', () => {
      const originalState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 5, color: '#00ff00' }],
        totalVotes: 5,
        showResults: true,
        startTime: Date.now(),
      });

      const clonedState = cloneOverlayState(originalState);

      expect(clonedState).toEqual(originalState);
      expect(clonedState).not.toBe(originalState); // Different object reference
      expect(clonedState.data).not.toBe(originalState.data); // Deep clone
    });
  });
});

describe('OverlayState Validation', () => {
  describe('validateOverlayState', () => {
    it('should validate a correct poll overlay state', () => {
      const validPollState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'What is your favorite color?',
        options: [
          { id: 1, label: 'Red', votes: 5, color: '#ff0000' },
          { id: 2, label: 'Blue', votes: 3, color: '#0000ff' },
        ],
        totalVotes: 8,
        showResults: true,
        startTime: Date.now() - 60000, // 1 minute ago
      });

      const result = validateOverlayState(validPollState);

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

      const result = validateOverlayState(invalidPollState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'data.question')).toBe(true);
      expect(result.errors.some(e => e.field === 'data.options')).toBe(true);
      expect(result.errors.some(e => e.field === 'data.totalVotes')).toBe(true);
    });
  });

  describe('Schema Migration', () => {
    it('should migrate old schema to current version', () => {
      const oldState = {
        id: 'test-poll',
        type: 'poll',
        isActive: true,
        version: 1,
        data: {
          question: 'Test?',
          options: [],
          totalVotes: 0,
          showResults: false,
          startTime: Date.now(),
        },
      };

      const result = validateAndMigrateSchema(oldState);

      expect(result).not.toBeNull();
      expect(result!.migrated).toBe(true);
      expect(result!.state.version).toBe(OVERLAY_STATE_SCHEMA.version);
      expect(result!.state.channelId).toBe('default');
    });

    it('should not migrate current schema version', () => {
      const currentState = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      // Set to current version
      currentState.version = OVERLAY_STATE_SCHEMA.version;

      const result = validateAndMigrateSchema(currentState);

      expect(result).not.toBeNull();
      expect(result!.migrated).toBe(false);
      expect(result!.state.version).toBe(OVERLAY_STATE_SCHEMA.version);
    });
  });

  describe('State Comparison', () => {
    it('should detect identical states', () => {
      const state1 = createOverlayState<PollOverlayState>('poll', 'test', {
        question: 'Test?',
        options: [{ id: 1, label: 'Yes', votes: 0, color: '#00ff00' }],
        totalVotes: 0,
        showResults: false,
        startTime: 1234567890,
      });

      const state2 = { ...state1 };

      expect(areOverlayStatesEqual(state1, state2)).toBe(true);
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

      expect(areOverlayStatesEqual(state1, state2)).toBe(false);
    });
  });

  describe('State Sanitization', () => {
    it('should sanitize state for logging', () => {
      const state = createOverlayState<PollOverlayState>('poll', 'sensitive-channel-id-12345', {
        question: 'Test?',
        options: [],
        totalVotes: 0,
        showResults: false,
        startTime: Date.now(),
      });

      const sanitized = sanitizeOverlayStateForLogging(state);

      expect(sanitized.channelId).toBe('sensitiv...');
      expect(sanitized.id).toBe(state.id);
      expect(sanitized.type).toBe('poll');
      expect(sanitized).not.toHaveProperty('data');
    });
  });
});

describe('OverlaySync Errors', () => {
  describe('Error Creation', () => {
    it('should create connection sync error', () => {
      const error = new ConnectionSyncError('Network connection failed');

      expect(error.syncErrorType).toBe(SyncErrorType.CONNECTION);
      expect(error.isRetryable).toBe(true);
      expect(error.requiresReauth).toBe(false);
      expect(error.message).toBe('Network connection failed');
    });

    it('should create validation sync error', () => {
      const error = new ValidationSyncError('Invalid data format', 'INVALID_FORMAT', {
        context: { field: 'options' },
      });

      expect(error.syncErrorType).toBe(SyncErrorType.VALIDATION);
      expect(error.isRetryable).toBe(false);
      expect(error.context.field).toBe('options');
    });
  });

  describe('Error Classification', () => {
    it('should classify generic network error', () => {
      const genericError = new Error('Network request failed');
      const syncError = createSyncErrorFromGeneric(genericError);

      expect(syncError.syncErrorType).toBe(SyncErrorType.CONNECTION);
      expect(syncError.originalError).toBe(genericError);
    });

    it('should classify generic permission error', () => {
      const genericError = new Error('Unauthorized access');
      const syncError = createSyncErrorFromGeneric(genericError);

      expect(syncError.syncErrorType).toBe(SyncErrorType.PERMISSION);
      expect(syncError.requiresReauth).toBe(true); // Permission errors require reauth by default
    });
  });

  describe('Error Formatting', () => {
    it('should format connection error for user', () => {
      const error = new ConnectionSyncError('Network failed');
      const userMessage = formatErrorForUser(error);

      expect(userMessage).toBe('Connection lost. Trying to reconnect...');
    });

    it('should format validation error for user', () => {
      const error = new ValidationSyncError('Invalid data');
      const userMessage = formatErrorForUser(error);

      expect(userMessage).toBe('Invalid data provided. Please check your input.');
    });
  });

  describe('SyncError Interface', () => {
    it('should convert OverlaySyncError to SyncError interface', () => {
      const error = new ValidationSyncError('Test error', 'TEST_ERROR', {
        context: { test: true },
      });

      const syncError = error.toSyncError();

      expect(syncError.type).toBe(SyncErrorType.VALIDATION);
      expect(syncError.code).toBe('TEST_ERROR');
      expect(syncError.message).toBe('Test error');
      expect(syncError.isRetryable).toBe(false);
      expect(syncError.context.test).toBe(true);
      expect(syncError.timestamp).toBeGreaterThan(0);
    });
  });
});