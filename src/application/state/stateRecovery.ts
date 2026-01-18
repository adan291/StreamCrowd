/**
 * State Recovery Service
 * 
 * Provides state snapshot and rollback functionality for error recovery.
 * Integrates with Redux store to preserve state before risky operations
 * and restore it on error.
 * 
 * @requirements 7.1 - Form data preservation on error
 * @requirements 7.2 - Giveaway participant list preservation
 * @requirements 7.3 - Poll vote counts preservation
 * @requirements 7.4 - State restoration from Redux/localStorage
 * @requirements 7.5 - User notification on recovery failure
 */

import { store, RootState } from './store';
import { logService } from '../../infrastructure/logging/LogService';

/**
 * Snapshot metadata for tracking and management
 */
export interface SnapshotMetadata {
  id: string;
  feature: string;
  timestamp: string;
  description?: string;
}

/**
 * A state snapshot with metadata
 */
export interface StateSnapshot {
  metadata: SnapshotMetadata;
  state: Partial<RootState>;
}

/**
 * Result of a recovery operation
 */
export interface RecoveryResult {
  success: boolean;
  snapshotId?: string;
  error?: string;
  restoredFeatures?: string[];
}

/**
 * Options for creating a snapshot
 */
export interface SnapshotOptions {
  /** Feature name for the snapshot */
  feature: string;
  /** Optional description of the operation */
  description?: string;
  /** Specific state slices to snapshot (defaults to all) */
  slices?: (keyof RootState)[];
}

/**
 * Options for executing with recovery
 */
export interface WithRecoveryOptions<T> extends SnapshotOptions {
  /** The risky operation to execute */
  operation: () => Promise<T>;
  /** Callback when recovery is attempted */
  onRecoveryAttempt?: (snapshot: StateSnapshot) => void;
  /** Callback when recovery fails */
  onRecoveryFailed?: (error: Error) => void;
}

/**
 * Maximum number of snapshots to keep in memory
 */
const MAX_SNAPSHOTS = 10;

/**
 * Storage key for persisted snapshots
 */
const SNAPSHOT_STORAGE_KEY = 'streamcrowd_state_snapshots';

/**
 * StateRecoveryService - Manages state snapshots and recovery
 * 
 * Features:
 * - Create snapshots before risky operations
 * - Rollback to previous state on error
 * - Persist snapshots to localStorage for crash recovery
 * - Integrate with Redux store
 * 
 * @example
 * // Create a snapshot before a risky operation
 * const snapshotId = stateRecoveryService.createSnapshot({
 *   feature: 'giveaway',
 *   description: 'Before selecting winner'
 * });
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   stateRecoveryService.rollback(snapshotId);
 * }
 */
class StateRecoveryService {
  private snapshots: Map<string, StateSnapshot> = new Map();
  private snapshotOrder: string[] = [];

  constructor() {
    this.loadPersistedSnapshots();
  }

  /**
   * Generate a unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load persisted snapshots from localStorage
   */
  private loadPersistedSnapshots(): void {
    try {
      const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StateSnapshot[];
        parsed.forEach(snapshot => {
          this.snapshots.set(snapshot.metadata.id, snapshot);
          this.snapshotOrder.push(snapshot.metadata.id);
        });
        
        logService.debug('Loaded persisted snapshots', { 
          count: parsed.length 
        });
      }
    } catch (error) {
      logService.warn('Failed to load persisted snapshots', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Persist snapshots to localStorage
   */
  private persistSnapshots(): void {
    try {
      const snapshotsArray = Array.from(this.snapshots.values());
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshotsArray));
    } catch (error) {
      logService.warn('Failed to persist snapshots', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Enforce maximum snapshot limit
   */
  private enforceSnapshotLimit(): void {
    while (this.snapshotOrder.length > MAX_SNAPSHOTS) {
      const oldestId = this.snapshotOrder.shift();
      if (oldestId) {
        this.snapshots.delete(oldestId);
      }
    }
  }

  /**
   * Create a state snapshot before a risky operation
   * 
   * @param options - Snapshot configuration
   * @returns Snapshot ID for later rollback
   * 
   * @requirements 7.1, 7.2, 7.3 - Preserve state before risky operations
   * 
   * @example
   * const snapshotId = stateRecoveryService.createSnapshot({
   *   feature: 'poll',
   *   description: 'Before ending poll'
   * });
   */
  createSnapshot(options: SnapshotOptions): string {
    const { feature, description, slices } = options;
    const id = this.generateSnapshotId();
    const currentState = store.getState();

    // Select specific slices or all state
    let stateToSnapshot: Partial<RootState>;
    if (slices && slices.length > 0) {
      stateToSnapshot = {};
      for (const slice of slices) {
        // Use type assertion to handle the slice key properly
        const sliceKey = slice as string;
        if (sliceKey in currentState) {
          (stateToSnapshot as Record<string, unknown>)[sliceKey] = 
            (currentState as Record<string, unknown>)[sliceKey];
        }
      }
    } else {
      stateToSnapshot = { ...currentState };
    }

    const snapshot: StateSnapshot = {
      metadata: {
        id,
        feature,
        timestamp: new Date().toISOString(),
        description,
      },
      state: stateToSnapshot,
    };

    this.snapshots.set(id, snapshot);
    this.snapshotOrder.push(id);
    this.enforceSnapshotLimit();
    this.persistSnapshots();

    logService.debug('State snapshot created', {
      snapshotId: id,
      feature,
      description,
      slices: slices || 'all',
    });

    return id;
  }

  /**
   * Rollback state to a previous snapshot
   * 
   * @param snapshotId - ID of the snapshot to restore
   * @returns Recovery result
   * 
   * @requirements 7.4 - State restoration from Redux/localStorage
   * 
   * @example
   * const result = stateRecoveryService.rollback(snapshotId);
   * if (!result.success) {
   *   console.error('Recovery failed:', result.error);
   * }
   */
  rollback(snapshotId: string): RecoveryResult {
    const snapshot = this.snapshots.get(snapshotId);

    if (!snapshot) {
      logService.warn('Snapshot not found for rollback', { snapshotId });
      return {
        success: false,
        error: `Snapshot ${snapshotId} not found`,
      };
    }

    try {
      // Dispatch a custom action to restore state
      // Note: This requires the store to handle a RESTORE_STATE action
      store.dispatch({
        type: 'STATE_RECOVERY/RESTORE',
        payload: snapshot.state,
      });

      logService.info('State rolled back successfully', {
        snapshotId,
        feature: snapshot.metadata.feature,
        restoredSlices: Object.keys(snapshot.state),
      });

      return {
        success: true,
        snapshotId,
        restoredFeatures: Object.keys(snapshot.state),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logService.error({
        message: 'State rollback failed',
        feature: snapshot.metadata.feature,
        context: { snapshotId, error: errorMessage },
      });

      return {
        success: false,
        snapshotId,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a snapshot by ID
   * 
   * @param snapshotId - Snapshot ID
   * @returns The snapshot or undefined
   */
  getSnapshot(snapshotId: string): StateSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Get all snapshots for a feature
   * 
   * @param feature - Feature name
   * @returns Array of snapshots for the feature
   */
  getSnapshotsForFeature(feature: string): StateSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.metadata.feature === feature)
      .sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - 
        new Date(a.metadata.timestamp).getTime()
      );
  }

  /**
   * Get the most recent snapshot for a feature
   * 
   * @param feature - Feature name
   * @returns Most recent snapshot or undefined
   */
  getLatestSnapshot(feature: string): StateSnapshot | undefined {
    const snapshots = this.getSnapshotsForFeature(feature);
    return snapshots[0];
  }

  /**
   * Delete a snapshot
   * 
   * @param snapshotId - Snapshot ID to delete
   */
  deleteSnapshot(snapshotId: string): void {
    this.snapshots.delete(snapshotId);
    this.snapshotOrder = this.snapshotOrder.filter(id => id !== snapshotId);
    this.persistSnapshots();
    
    logService.debug('Snapshot deleted', { snapshotId });
  }

  /**
   * Clear all snapshots
   */
  clearAllSnapshots(): void {
    this.snapshots.clear();
    this.snapshotOrder = [];
    localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    
    logService.debug('All snapshots cleared');
  }

  /**
   * Get all snapshot metadata (without state data)
   * 
   * @returns Array of snapshot metadata
   */
  getAllSnapshotMetadata(): SnapshotMetadata[] {
    return Array.from(this.snapshots.values())
      .map(s => s.metadata)
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - 
        new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get the number of stored snapshots
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }
}

/**
 * Execute an operation with automatic state recovery on error
 * 
 * Creates a snapshot before the operation and automatically rolls back
 * if the operation fails.
 * 
 * @param options - Recovery options including the operation to execute
 * @returns Result of the operation
 * @throws Re-throws the error after rollback
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4 - Automatic state recovery
 * 
 * @example
 * const result = await withStateRecovery({
 *   feature: 'giveaway',
 *   description: 'Selecting winner',
 *   operation: async () => {
 *     return await selectWinner();
 *   },
 *   onRecoveryAttempt: (snapshot) => {
 *     console.log('Attempting recovery from:', snapshot.metadata.timestamp);
 *   }
 * });
 */
export async function withStateRecovery<T>(
  options: WithRecoveryOptions<T>
): Promise<T> {
  const { 
    feature, 
    description, 
    slices, 
    operation, 
    onRecoveryAttempt,
    onRecoveryFailed 
  } = options;

  // Create snapshot before operation
  const snapshotId = stateRecoveryService.createSnapshot({
    feature,
    description,
    slices,
  });

  try {
    // Execute the risky operation
    const result = await operation();
    
    // Operation succeeded, we can delete the snapshot
    stateRecoveryService.deleteSnapshot(snapshotId);
    
    return result;
  } catch (error) {
    // Operation failed, attempt recovery
    const snapshot = stateRecoveryService.getSnapshot(snapshotId);
    
    if (snapshot) {
      onRecoveryAttempt?.(snapshot);
    }

    const recoveryResult = stateRecoveryService.rollback(snapshotId);

    if (!recoveryResult.success) {
      const recoveryError = new Error(
        `Recovery failed: ${recoveryResult.error}`
      );
      onRecoveryFailed?.(recoveryError);
      
      logService.error({
        message: 'State recovery failed after operation error',
        feature,
        context: {
          originalError: error instanceof Error ? error.message : 'Unknown',
          recoveryError: recoveryResult.error,
        },
      });
    } else {
      logService.info('State recovered after operation error', {
        feature,
        snapshotId,
        originalError: error instanceof Error ? error.message : 'Unknown',
      });
    }

    // Re-throw the original error
    throw error;
  }
}

/**
 * Singleton instance of StateRecoveryService
 */
export const stateRecoveryService = new StateRecoveryService();
