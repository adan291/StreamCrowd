/**
 * OverlayStateManager - Application service for overlay state management
 * 
 * This service handles state validation, transformation, comparison, and migration
 * for overlay synchronization. It follows hexagonal architecture principles by
 * implementing business logic without external dependencies.
 * 
 * Requirements: 1.2, 1.3, 6.4
 */

import {
  OverlayState,
  OverlayType,
  BaseOverlayState,
  PollOverlayState,
  GiveawayOverlayState,
  GameOverlayState,
  PredictionOverlayState,
  cloneOverlayState,
} from '@/src/domain/entities/OverlayState';

import {
  ValidationResult,
  validateOverlayState,
  validateAndMigrateSchema,
  areOverlayStatesEqual,
  sanitizeOverlayStateForLogging,
  OVERLAY_STATE_SCHEMA,
} from '@/src/domain/entities/OverlayStateValidation';

import {
  ValidationSyncError,
  SchemaMismatchSyncError,
  SerializationSyncError,
} from '@/src/domain/errors/OverlaySyncErrors';

/**
 * State transformation options
 */
export interface StateTransformOptions {
  /** Whether to sanitize sensitive data */
  sanitize?: boolean;
  
  /** Whether to normalize timestamps */
  normalizeTimestamps?: boolean;
  
  /** Whether to validate before transformation */
  validate?: boolean;
  
  /** Target schema version for migration */
  targetVersion?: number;
}

/**
 * State comparison options
 */
export interface StateComparisonOptions {
  /** Fields to ignore during comparison */
  ignoreFields?: string[];
  
  /** Whether to ignore timestamp differences */
  ignoreTimestamps?: boolean;
  
  /** Whether to perform deep comparison */
  deep?: boolean;
  
  /** Tolerance for numeric comparisons (in milliseconds for timestamps) */
  tolerance?: number;
}

/**
 * State migration result
 */
export interface StateMigrationResult {
  /** Whether migration was performed */
  migrated: boolean;
  
  /** The migrated state */
  state: OverlayState;
  
  /** Original version before migration */
  originalVersion: number;
  
  /** Target version after migration */
  targetVersion: number;
  
  /** Migration steps applied */
  migrationsApplied: number[];
  
  /** Any warnings during migration */
  warnings: string[];
}

/**
 * State snapshot metadata
 */
export interface StateSnapshot {
  /** The state data */
  state: OverlayState;
  
  /** Timestamp when snapshot was created */
  timestamp: number;
  
  /** Checksum for integrity verification */
  checksum: string;
  
  /** Snapshot metadata */
  metadata: {
    version: number;
    source: string;
    reason: string;
  };
}

/**
 * OverlayStateManager service class
 * 
 * Provides comprehensive state management functionality including validation,
 * transformation, comparison, and migration for overlay states.
 */
export class OverlayStateManager {
  private readonly maxSnapshotHistory = 10;
  private readonly snapshotHistory: Map<string, StateSnapshot[]> = new Map();

  /**
   * Validates an overlay state against its schema
   * 
   * @param state - The overlay state to validate
   * @returns Validation result with errors and warnings
   */
  validateState<T extends OverlayState>(state: T): ValidationResult {
    try {
      return validateOverlayState(state);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'root',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_EXCEPTION',
          value: state,
        }],
        warnings: [],
      };
    }
  }

  /**
   * Transforms overlay state for synchronization
   * 
   * @param state - The overlay state to transform
   * @param options - Transformation options
   * @returns Transformed state
   * @throws ValidationSyncError if validation fails
   * @throws SerializationSyncError if transformation fails
   */
  transformForSync<T extends OverlayState>(
    state: T,
    options: StateTransformOptions = {}
  ): T {
    try {
      // Validate if requested
      if (options.validate !== false) {
        const validation = this.validateState(state);
        if (!validation.isValid) {
          throw new ValidationSyncError(
            `State validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
            'TRANSFORM_VALIDATION_FAILED',
            {
              context: {
                errors: validation.errors,
                warnings: validation.warnings,
                stateType: state.type,
                stateId: state.id,
              },
            }
          );
        }
      }

      let transformedState = cloneOverlayState(state);

      // Normalize timestamps if requested
      if (options.normalizeTimestamps) {
        transformedState = this.normalizeTimestamps(transformedState);
      }

      // Migrate to target version if specified
      if (options.targetVersion && options.targetVersion !== transformedState.version) {
        const migrationResult = this.migrateStateVersion(transformedState, options.targetVersion);
        transformedState = migrationResult.state as T;
      }

      // Sanitize if requested
      if (options.sanitize) {
        transformedState = this.sanitizeState(transformedState);
      }

      return transformedState;
    } catch (error) {
      if (error instanceof ValidationSyncError) {
        throw error;
      }
      
      throw new SerializationSyncError(
        `State transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSFORM_FAILED',
        {
          context: {
            stateType: state.type,
            stateId: state.id,
            options,
          },
          originalError: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Compares two overlay states for equality
   * 
   * @param current - Current state
   * @param previous - Previous state to compare against
   * @param options - Comparison options
   * @returns True if states are considered equal
   */
  compareStates<T extends OverlayState>(
    current: T,
    previous: T,
    options: StateComparisonOptions = {}
  ): boolean {
    try {
      // Quick reference check
      if (current === previous) return true;

      // Type check
      if (current.type !== previous.type) return false;

      // ID check (unless ignored)
      if (!options.ignoreFields?.includes('id') && current.id !== previous.id) {
        return false;
      }

      // Use built-in equality check if no special options
      if (!options.ignoreFields && !options.ignoreTimestamps && !options.tolerance) {
        return areOverlayStatesEqual(current, previous);
      }

      // Custom comparison with options
      return this.performCustomComparison(current, previous, options);
    } catch (error) {
      // If comparison fails, assume states are different
      return false;
    }
  }

  /**
   * Creates a snapshot of the current state
   * 
   * @param state - The state to snapshot
   * @param metadata - Additional metadata for the snapshot
   * @returns State snapshot
   */
  createStateSnapshot<T extends OverlayState>(
    state: T,
    metadata: {
      source?: string;
      reason?: string;
    } = {}
  ): StateSnapshot {
    const timestamp = Date.now();
    const clonedState = cloneOverlayState(state);
    const checksum = this.calculateChecksum(clonedState);

    const snapshot: StateSnapshot = {
      state: clonedState,
      timestamp,
      checksum,
      metadata: {
        version: state.version,
        source: metadata.source || 'unknown',
        reason: metadata.reason || 'manual',
      },
    };

    // Store in history
    this.storeSnapshot(state.id, snapshot);

    return snapshot;
  }

  /**
   * Migrates overlay state to a target version
   * 
   * @param state - The state to migrate
   * @param targetVersion - Target schema version
   * @returns Migration result
   * @throws SchemaMismatchSyncError if migration fails
   */
  migrateStateVersion<T extends OverlayState>(
    state: T,
    targetVersion: number
  ): StateMigrationResult {
    try {
      const originalVersion = state.version;
      
      // Check if migration is needed
      if (originalVersion === targetVersion) {
        return {
          migrated: false,
          state,
          originalVersion,
          targetVersion,
          migrationsApplied: [],
          warnings: [],
        };
      }

      // Validate target version
      if (targetVersion < OVERLAY_STATE_SCHEMA.minVersion || 
          targetVersion > OVERLAY_STATE_SCHEMA.maxVersion) {
        throw new SchemaMismatchSyncError(
          `Target version ${targetVersion} is not supported. Supported range: ${OVERLAY_STATE_SCHEMA.minVersion}-${OVERLAY_STATE_SCHEMA.maxVersion}`,
          'UNSUPPORTED_TARGET_VERSION',
          {
            expectedVersion: OVERLAY_STATE_SCHEMA.version,
            actualVersion: targetVersion,
          }
        );
      }

      // Perform migration using domain validation logic
      const migrationResult = validateAndMigrateSchema(state as Record<string, unknown>);
      
      if (!migrationResult) {
        // Return a non-migrated result for invalid states instead of throwing
        return {
          migrated: false,
          state,
          originalVersion,
          targetVersion: originalVersion,
          migrationsApplied: [],
          warnings: ['Migration failed due to invalid state structure'],
        };
      }

      // Calculate applied migrations
      const migrationsApplied: number[] = [];
      if (originalVersion < targetVersion) {
        for (let v = originalVersion; v < targetVersion; v++) {
          if (OVERLAY_STATE_SCHEMA.migrations[v + 1]) {
            migrationsApplied.push(v + 1);
          }
        }
      }

      return {
        migrated: migrationResult.migrated,
        state: migrationResult.state as T,
        originalVersion,
        targetVersion: migrationResult.state.version,
        migrationsApplied,
        warnings: [],
      };
    } catch (error) {
      if (error instanceof SchemaMismatchSyncError) {
        throw error;
      }
      
      throw new SchemaMismatchSyncError(
        `State migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MIGRATION_ERROR',
        {
          expectedVersion: targetVersion,
          actualVersion: state.version,
          context: {
            stateType: state.type,
            stateId: state.id,
          },
          originalError: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Gets the snapshot history for a state
   * 
   * @param stateId - The state ID to get history for
   * @returns Array of snapshots ordered by timestamp (newest first)
   */
  getSnapshotHistory(stateId: string): StateSnapshot[] {
    return this.snapshotHistory.get(stateId) || [];
  }

  /**
   * Clears snapshot history for a state
   * 
   * @param stateId - The state ID to clear history for
   */
  clearSnapshotHistory(stateId: string): void {
    this.snapshotHistory.delete(stateId);
  }

  /**
   * Verifies the integrity of a state snapshot
   * 
   * @param snapshot - The snapshot to verify
   * @returns True if snapshot is valid
   */
  verifySnapshotIntegrity(snapshot: StateSnapshot): boolean {
    try {
      const calculatedChecksum = this.calculateChecksum(snapshot.state);
      return calculatedChecksum === snapshot.checksum;
    } catch {
      return false;
    }
  }

  /**
   * Gets performance metrics for the state manager
   * 
   * @returns Performance metrics
   */
  getPerformanceMetrics(): {
    totalSnapshots: number;
    snapshotsByState: Record<string, number>;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  } {
    let totalSnapshots = 0;
    const snapshotsByState: Record<string, number> = {};
    let oldestSnapshot: number | null = null;
    let newestSnapshot: number | null = null;

    for (const [stateId, snapshots] of this.snapshotHistory.entries()) {
      totalSnapshots += snapshots.length;
      snapshotsByState[stateId] = snapshots.length;

      for (const snapshot of snapshots) {
        if (oldestSnapshot === null || snapshot.timestamp < oldestSnapshot) {
          oldestSnapshot = snapshot.timestamp;
        }
        if (newestSnapshot === null || snapshot.timestamp > newestSnapshot) {
          newestSnapshot = snapshot.timestamp;
        }
      }
    }

    return {
      totalSnapshots,
      snapshotsByState,
      oldestSnapshot,
      newestSnapshot,
    };
  }

  // Private helper methods

  /**
   * Normalizes timestamps in overlay state
   */
  private normalizeTimestamps<T extends OverlayState>(state: T): T {
    const normalized = cloneOverlayState(state);
    const now = Date.now();

    // Normalize base timestamps
    if (normalized.updatedAt > now + 60000) { // Future timestamp beyond 1 minute
      normalized.updatedAt = now;
    }

    // Normalize type-specific timestamps
    switch (normalized.type) {
      case 'poll':
        const pollData = (normalized as PollOverlayState).data;
        if (pollData.startTime > now + 60000) {
          pollData.startTime = now;
        }
        if (pollData.endTime && pollData.endTime > now + 86400000) { // Future beyond 24 hours
          pollData.endTime = now + 3600000; // Set to 1 hour from now
        }
        break;

      case 'prediction':
        const predictionData = (normalized as PredictionOverlayState).data;
        if (predictionData.startTime > now + 60000) {
          predictionData.startTime = now;
        }
        if (predictionData.endTime && predictionData.endTime > now + 86400000) {
          predictionData.endTime = now + 3600000;
        }
        break;

      case 'game':
        const gameData = (normalized as GameOverlayState).data;
        if (gameData.startTime && gameData.startTime > now + 60000) {
          gameData.startTime = now;
        }
        if (gameData.endTime && gameData.endTime > now + 86400000) {
          gameData.endTime = now + 3600000;
        }
        break;
    }

    return normalized;
  }

  /**
   * Sanitizes overlay state for safe transmission
   */
  private sanitizeState<T extends OverlayState>(state: T): T {
    const sanitized = cloneOverlayState(state);

    // Use domain sanitization function for base properties
    const baseSanitized = sanitizeOverlayStateForLogging(sanitized);
    
    // Apply base sanitization
    sanitized.channelId = baseSanitized.channelId || sanitized.channelId;

    // Type-specific sanitization
    switch (sanitized.type) {
      case 'giveaway':
        const giveawayData = (sanitized as GiveawayOverlayState).data;
        // Limit participant list size for performance
        if (giveawayData.participants.length > 1000) {
          giveawayData.participants = giveawayData.participants.slice(0, 1000);
        }
        break;

      case 'game':
        const gameData = (sanitized as GameOverlayState).data;
        // Sanitize potentially large game state
        if (gameData.state && typeof gameData.state === 'object') {
          const stateSize = JSON.stringify(gameData.state).length;
          if (stateSize > 10000) { // 10KB limit
            gameData.state = { truncated: true, originalSize: stateSize };
          }
        }
        break;
    }

    return sanitized;
  }

  /**
   * Performs custom state comparison with options
   */
  private performCustomComparison<T extends OverlayState>(
    current: T,
    previous: T,
    options: StateComparisonOptions
  ): boolean {
    const currentCopy = cloneOverlayState(current);
    const previousCopy = cloneOverlayState(previous);

    // Remove ignored fields
    if (options.ignoreFields) {
      for (const field of options.ignoreFields) {
        this.removeField(currentCopy, field);
        this.removeField(previousCopy, field);
      }
    }

    // Handle timestamp ignoring
    if (options.ignoreTimestamps) {
      currentCopy.updatedAt = 0;
      previousCopy.updatedAt = 0;
      
      // Type-specific timestamp handling
      this.normalizeTimestampsForComparison(currentCopy, previousCopy);
    }

    // Handle tolerance for numeric fields
    if (options.tolerance) {
      this.applyToleranceComparison(currentCopy, previousCopy, options.tolerance);
    }

    return areOverlayStatesEqual(currentCopy, previousCopy);
  }

  /**
   * Removes a field from an object using dot notation
   */
  private removeField(obj: Record<string, unknown>, fieldPath: string): void {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] && typeof current[parts[i]] === 'object') {
        current = current[parts[i]] as Record<string, unknown>;
      } else {
        return; // Path doesn't exist
      }
    }
    
    delete current[parts[parts.length - 1]];
  }

  /**
   * Normalizes timestamps for comparison purposes
   */
  private normalizeTimestampsForComparison<T extends OverlayState>(
    current: T,
    previous: T
  ): void {
    // Type-specific timestamp normalization
    switch (current.type) {
      case 'poll':
        const currentPoll = current as PollOverlayState;
        const previousPoll = previous as PollOverlayState;
        currentPoll.data.startTime = 0;
        previousPoll.data.startTime = 0;
        if (currentPoll.data.endTime) currentPoll.data.endTime = 0;
        if (previousPoll.data.endTime) previousPoll.data.endTime = 0;
        break;

      case 'prediction':
        const currentPred = current as PredictionOverlayState;
        const previousPred = previous as PredictionOverlayState;
        currentPred.data.startTime = 0;
        previousPred.data.startTime = 0;
        if (currentPred.data.endTime) currentPred.data.endTime = 0;
        if (previousPred.data.endTime) previousPred.data.endTime = 0;
        break;

      case 'game':
        const currentGame = current as GameOverlayState;
        const previousGame = previous as GameOverlayState;
        if (currentGame.data.startTime) currentGame.data.startTime = 0;
        if (previousGame.data.startTime) previousGame.data.startTime = 0;
        if (currentGame.data.endTime) currentGame.data.endTime = 0;
        if (previousGame.data.endTime) previousGame.data.endTime = 0;
        break;
    }
  }

  /**
   * Applies tolerance-based comparison for numeric fields
   */
  private applyToleranceComparison<T extends OverlayState>(
    current: T,
    previous: T,
    tolerance: number
  ): void {
    // Apply tolerance to updatedAt if not ignored
    if (Math.abs(current.updatedAt - previous.updatedAt) <= tolerance) {
      current.updatedAt = previous.updatedAt;
    }

    // Type-specific tolerance application
    switch (current.type) {
      case 'poll':
        const currentPoll = current as PollOverlayState;
        const previousPoll = previous as PollOverlayState;
        if (Math.abs(currentPoll.data.startTime - previousPoll.data.startTime) <= tolerance) {
          currentPoll.data.startTime = previousPoll.data.startTime;
        }
        break;
    }
  }

  /**
   * Calculates a checksum for state integrity verification
   */
  private calculateChecksum(state: OverlayState): string {
    try {
      const stateString = JSON.stringify(state, Object.keys(state).sort());
      let hash = 0;
      for (let i = 0; i < stateString.length; i++) {
        const char = stateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    } catch {
      return 'invalid';
    }
  }

  /**
   * Stores a snapshot in the history with size limits
   */
  private storeSnapshot(stateId: string, snapshot: StateSnapshot): void {
    let history = this.snapshotHistory.get(stateId) || [];
    
    // Add new snapshot at the beginning (newest first)
    history.unshift(snapshot);
    
    // Limit history size
    if (history.length > this.maxSnapshotHistory) {
      history = history.slice(0, this.maxSnapshotHistory);
    }
    
    this.snapshotHistory.set(stateId, history);
  }
}