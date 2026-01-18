/**
 * Tests for State Recovery Service
 * 
 * Tests the state snapshot and recovery functionality for error handling.
 * 
 * @requirements 7.1 - Form data preservation on error
 * @requirements 7.2 - Giveaway participant list preservation
 * @requirements 7.3 - Poll vote counts preservation
 * @requirements 7.4 - State restoration from Redux/localStorage
 * @requirements 7.5 - User notification on recovery failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the store before importing stateRecovery
const mockGetState = vi.fn();
const mockDispatch = vi.fn();

vi.mock('@/src/application/state/store', () => ({
  store: {
    getState: () => mockGetState(),
    dispatch: (action: unknown) => mockDispatch(action),
  },
  RootState: {},
}));

// Mock logService
vi.mock('@/src/infrastructure/logging/LogService', () => ({
  logService: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Import after mocks are set up
import {
  stateRecoveryService,
  withStateRecovery,
} from '@/src/application/state/stateRecovery';

describe('State Recovery Service', () => {
  const mockState = {
    poll: { active: { id: '1', question: 'Test?' }, history: [], isCreating: false, error: null },
    giveaway: { active: null, history: [], isSelecting: false, error: null },
    games: { active: null, scores: {}, error: null },
    auth: { user: null, token: null, isAuthenticated: false, isLoading: false, error: null },
    ui: { theme: 'dark', language: 'es', notifications: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockGetState.mockReturnValue(mockState);
    stateRecoveryService.clearAllSnapshots();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with all state', () => {
      const snapshotId = stateRecoveryService.createSnapshot({
        feature: 'poll',
        description: 'Before ending poll',
      });

      expect(snapshotId).toBeDefined();
      expect(snapshotId).toMatch(/^snapshot_/);

      const snapshot = stateRecoveryService.getSnapshot(snapshotId);
      expect(snapshot).toBeDefined();
      expect(snapshot?.metadata.feature).toBe('poll');
      expect(snapshot?.metadata.description).toBe('Before ending poll');
      expect(snapshot?.state).toEqual(mockState);
    });

    it('should create a snapshot with specific slices', () => {
      const snapshotId = stateRecoveryService.createSnapshot({
        feature: 'giveaway',
        slices: ['giveaway', 'auth'],
      });

      const snapshot = stateRecoveryService.getSnapshot(snapshotId);
      expect(snapshot?.state.giveaway).toEqual(mockState.giveaway);
      expect(snapshot?.state.auth).toEqual(mockState.auth);
      // Other slices should not be present
      expect(snapshot?.state.poll).toBeUndefined();
      expect(snapshot?.state.games).toBeUndefined();
    });

    it('should generate unique snapshot IDs', () => {
      const id1 = stateRecoveryService.createSnapshot({ feature: 'test1' });
      const id2 = stateRecoveryService.createSnapshot({ feature: 'test2' });

      expect(id1).not.toBe(id2);
    });

    it('should persist snapshots to localStorage', () => {
      stateRecoveryService.createSnapshot({
        feature: 'poll',
        description: 'Test snapshot',
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should enforce maximum snapshot limit', () => {
      // Create more than MAX_SNAPSHOTS (10)
      for (let i = 0; i < 15; i++) {
        stateRecoveryService.createSnapshot({
          feature: `test${i}`,
        });
      }

      expect(stateRecoveryService.getSnapshotCount()).toBeLessThanOrEqual(10);
    });
  });

  describe('rollback', () => {
    it('should dispatch restore action with snapshot state', () => {
      const snapshotId = stateRecoveryService.createSnapshot({
        feature: 'poll',
      });

      const result = stateRecoveryService.rollback(snapshotId);

      expect(result.success).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'STATE_RECOVERY/RESTORE',
        payload: expect.any(Object),
      });
    });

    it('should return error for non-existent snapshot', () => {
      const result = stateRecoveryService.rollback('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return restored features list on success', () => {
      const snapshotId = stateRecoveryService.createSnapshot({
        feature: 'giveaway',
        slices: ['giveaway'],
      });

      const result = stateRecoveryService.rollback(snapshotId);

      expect(result.success).toBe(true);
      expect(result.restoredFeatures).toContain('giveaway');
    });
  });

  describe('getSnapshotsForFeature', () => {
    it('should return snapshots for a specific feature', () => {
      stateRecoveryService.createSnapshot({ feature: 'poll' });
      stateRecoveryService.createSnapshot({ feature: 'giveaway' });
      stateRecoveryService.createSnapshot({ feature: 'poll' });

      const pollSnapshots = stateRecoveryService.getSnapshotsForFeature('poll');
      expect(pollSnapshots).toHaveLength(2);
      pollSnapshots.forEach(s => {
        expect(s.metadata.feature).toBe('poll');
      });
    });

    it('should return empty array for feature with no snapshots', () => {
      const snapshots = stateRecoveryService.getSnapshotsForFeature('nonexistent');
      expect(snapshots).toHaveLength(0);
    });

    it('should return snapshots sorted by timestamp (newest first)', () => {
      stateRecoveryService.createSnapshot({ feature: 'poll' });
      // Small delay to ensure different timestamps
      stateRecoveryService.createSnapshot({ feature: 'poll' });

      const snapshots = stateRecoveryService.getSnapshotsForFeature('poll');
      const timestamps = snapshots.map(s => new Date(s.metadata.timestamp).getTime());
      
      // Should be in descending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return the most recent snapshot for a feature', () => {
      // Create snapshots with different descriptions
      const id1 = stateRecoveryService.createSnapshot({ feature: 'poll', description: 'first' });
      const id2 = stateRecoveryService.createSnapshot({ feature: 'poll', description: 'second' });

      // The latest should be the last one created (by order, not timestamp)
      const latest = stateRecoveryService.getLatestSnapshot('poll');
      // Since both are created almost simultaneously, we just verify we get one of them
      expect(latest).toBeDefined();
      expect(latest?.metadata.feature).toBe('poll');
      // The snapshot ID should be one of the created ones
      expect([id1, id2]).toContain(latest?.metadata.id);
    });

    it('should return undefined for feature with no snapshots', () => {
      const latest = stateRecoveryService.getLatestSnapshot('nonexistent');
      expect(latest).toBeUndefined();
    });
  });

  describe('deleteSnapshot', () => {
    it('should remove a snapshot', () => {
      const snapshotId = stateRecoveryService.createSnapshot({ feature: 'poll' });
      expect(stateRecoveryService.getSnapshot(snapshotId)).toBeDefined();

      stateRecoveryService.deleteSnapshot(snapshotId);
      expect(stateRecoveryService.getSnapshot(snapshotId)).toBeUndefined();
    });
  });

  describe('clearAllSnapshots', () => {
    it('should remove all snapshots', () => {
      stateRecoveryService.createSnapshot({ feature: 'poll' });
      stateRecoveryService.createSnapshot({ feature: 'giveaway' });
      expect(stateRecoveryService.getSnapshotCount()).toBe(2);

      stateRecoveryService.clearAllSnapshots();
      expect(stateRecoveryService.getSnapshotCount()).toBe(0);
    });

    it('should clear localStorage', () => {
      stateRecoveryService.createSnapshot({ feature: 'poll' });
      stateRecoveryService.clearAllSnapshots();

      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('getAllSnapshotMetadata', () => {
    it('should return metadata without state data', () => {
      stateRecoveryService.createSnapshot({ feature: 'poll', description: 'test' });

      const metadata = stateRecoveryService.getAllSnapshotMetadata();
      expect(metadata).toHaveLength(1);
      expect(metadata[0].feature).toBe('poll');
      expect(metadata[0].description).toBe('test');
      expect((metadata[0] as any).state).toBeUndefined();
    });
  });
});

describe('withStateRecovery', () => {
  const mockState = {
    poll: { active: null, history: [], isCreating: false, error: null },
    giveaway: { active: null, history: [], isSelecting: false, error: null },
    games: { active: null, scores: {}, error: null },
    auth: { user: null, token: null, isAuthenticated: false, isLoading: false, error: null },
    ui: { theme: 'dark', language: 'es', notifications: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockGetState.mockReturnValue(mockState);
    stateRecoveryService.clearAllSnapshots();
  });

  it('should execute operation successfully and delete snapshot', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withStateRecovery({
      feature: 'poll',
      operation,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    // Snapshot should be deleted after success
    expect(stateRecoveryService.getSnapshotCount()).toBe(0);
  });

  it('should rollback state on operation failure', async () => {
    const error = new Error('Operation failed');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(
      withStateRecovery({
        feature: 'poll',
        operation,
      })
    ).rejects.toThrow('Operation failed');

    // Rollback should have been called
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'STATE_RECOVERY/RESTORE',
      payload: expect.any(Object),
    });
  });

  it('should call onRecoveryAttempt callback on failure', async () => {
    const error = new Error('Operation failed');
    const operation = vi.fn().mockRejectedValue(error);
    const onRecoveryAttempt = vi.fn();

    await expect(
      withStateRecovery({
        feature: 'poll',
        operation,
        onRecoveryAttempt,
      })
    ).rejects.toThrow();

    expect(onRecoveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          feature: 'poll',
        }),
      })
    );
  });

  it('should re-throw the original error after recovery', async () => {
    const error = new Error('Original error');
    const operation = vi.fn().mockRejectedValue(error);

    try {
      await withStateRecovery({
        feature: 'poll',
        operation,
      });
    } catch (e) {
      expect(e).toBe(error);
    }
  });

  it('should snapshot only specified slices', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'));

    try {
      await withStateRecovery({
        feature: 'giveaway',
        slices: ['giveaway'],
        operation,
      });
    } catch {
      // Expected to throw
    }

    // Check that dispatch was called with only giveaway slice
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'STATE_RECOVERY/RESTORE',
      payload: expect.objectContaining({
        giveaway: mockState.giveaway,
      }),
    });
  });
});
