/**
 * Tests for useStateRecovery Hook
 * 
 * Tests the React hook for state recovery functionality.
 * 
 * @requirements 7.1 - Form data preservation on error
 * @requirements 7.4 - State restoration from Redux/localStorage
 * @requirements 7.5 - User notification on recovery failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the store before importing
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

// Import after mocks
import { useStateRecovery, useRecoveryNotification } from '@/src/presentation/hooks/useStateRecovery';
import { stateRecoveryService } from '@/src/application/state/stateRecovery';

describe('useStateRecovery', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    expect(result.current.isRecovering).toBe(false);
    expect(result.current.wasRecovered).toBe(false);
    expect(result.current.recoveryError).toBeNull();
    expect(result.current.currentSnapshotId).toBeNull();
  });

  it('should create a snapshot', () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    let snapshotId: string;
    act(() => {
      snapshotId = result.current.createSnapshot('Test snapshot');
    });

    expect(snapshotId!).toBeDefined();
    expect(result.current.currentSnapshotId).toBe(snapshotId!);
  });

  it('should rollback to a snapshot', () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    let snapshotId: string;
    act(() => {
      snapshotId = result.current.createSnapshot('Test snapshot');
    });

    let rollbackResult: any;
    act(() => {
      rollbackResult = result.current.rollback(snapshotId!);
    });

    expect(rollbackResult.success).toBe(true);
    expect(result.current.wasRecovered).toBe(true);
  });

  it('should execute operation with recovery', async () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    const operation = vi.fn().mockResolvedValue('success');

    let operationResult: string;
    await act(async () => {
      operationResult = await result.current.executeWithRecovery(
        operation,
        'Test operation'
      );
    });

    expect(operationResult!).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should set wasRecovered on operation failure', async () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

    await act(async () => {
      try {
        await result.current.executeWithRecovery(operation, 'Test operation');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.wasRecovered).toBe(true);
  });

  it('should call onRecoveryFailed callback', async () => {
    const onRecoveryFailed = vi.fn();
    
    // Mock rollback to fail
    const originalRollback = stateRecoveryService.rollback.bind(stateRecoveryService);
    vi.spyOn(stateRecoveryService, 'rollback').mockReturnValue({
      success: false,
      error: 'Rollback failed',
    });

    const { result } = renderHook(() =>
      useStateRecovery({ 
        feature: 'poll',
        onRecoveryFailed,
      })
    );

    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

    await act(async () => {
      try {
        await result.current.executeWithRecovery(operation, 'Test operation');
      } catch {
        // Expected to throw
      }
    });

    expect(onRecoveryFailed).toHaveBeenCalled();
    
    // Restore original
    vi.spyOn(stateRecoveryService, 'rollback').mockImplementation(originalRollback);
  });

  it('should get snapshots for feature', () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    act(() => {
      result.current.createSnapshot('Snapshot 1');
      result.current.createSnapshot('Snapshot 2');
    });

    const snapshots = result.current.getSnapshots();
    expect(snapshots).toHaveLength(2);
  });

  it('should clear recovery state', () => {
    const { result } = renderHook(() =>
      useStateRecovery({ feature: 'poll' })
    );

    act(() => {
      result.current.createSnapshot('Test');
    });

    expect(result.current.currentSnapshotId).not.toBeNull();

    act(() => {
      result.current.clearRecoveryState();
    });

    expect(result.current.currentSnapshotId).toBeNull();
    expect(result.current.wasRecovered).toBe(false);
    expect(result.current.recoveryError).toBeNull();
  });
});

describe('useRecoveryNotification', () => {
  it('should show success notification when wasRecovered is true', async () => {
    const { result, rerender } = renderHook(
      ({ wasRecovered, recoveryError }) =>
        useRecoveryNotification(wasRecovered, recoveryError),
      { initialProps: { wasRecovered: false, recoveryError: null } }
    );

    expect(result.current.showNotification).toBe(false);

    rerender({ wasRecovered: true, recoveryError: null });

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
      expect(result.current.notificationType).toBe('success');
    });
  });

  it('should show error notification when recoveryError is set', async () => {
    const { result, rerender } = renderHook(
      ({ wasRecovered, recoveryError }) =>
        useRecoveryNotification(wasRecovered, recoveryError),
      { initialProps: { wasRecovered: false, recoveryError: null } }
    );

    rerender({ wasRecovered: false, recoveryError: 'Recovery failed' });

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
      expect(result.current.notificationType).toBe('error');
      expect(result.current.notificationMessage).toContain('Recovery failed');
    });
  });

  it('should dismiss notification', async () => {
    const { result, rerender } = renderHook(
      ({ wasRecovered, recoveryError }) =>
        useRecoveryNotification(wasRecovered, recoveryError),
      { initialProps: { wasRecovered: true, recoveryError: null } }
    );

    await waitFor(() => {
      expect(result.current.showNotification).toBe(true);
    });

    act(() => {
      result.current.dismissNotification();
    });

    expect(result.current.showNotification).toBe(false);
  });
});
