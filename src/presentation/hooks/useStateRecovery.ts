/**
 * React Hook for State Recovery
 * 
 * Provides a convenient way to use state recovery in React components.
 * Manages snapshot lifecycle and provides recovery status.
 * 
 * @requirements 7.1 - Form data preservation on error
 * @requirements 7.2 - Giveaway participant list preservation
 * @requirements 7.3 - Poll vote counts preservation
 * @requirements 7.4 - State restoration from Redux/localStorage
 * @requirements 7.5 - User notification on recovery failure
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  stateRecoveryService, 
  withStateRecovery,
  StateSnapshot,
  RecoveryResult,
} from '../../application/state/stateRecovery';
import { RootState } from '../../application/state/store';

/**
 * State returned by useStateRecovery hook
 */
export interface UseStateRecoveryState {
  /** Whether a recovery operation is in progress */
  isRecovering: boolean;
  /** Whether the last operation was recovered */
  wasRecovered: boolean;
  /** Error from the last recovery attempt */
  recoveryError: string | null;
  /** ID of the current snapshot (if any) */
  currentSnapshotId: string | null;
  /** Timestamp of the last recovery */
  lastRecoveryTime: string | null;
}

/**
 * Actions returned by useStateRecovery hook
 */
export interface UseStateRecoveryActions {
  /** Create a snapshot before a risky operation */
  createSnapshot: (description?: string) => string;
  /** Rollback to a specific snapshot */
  rollback: (snapshotId: string) => RecoveryResult;
  /** Rollback to the most recent snapshot for this feature */
  rollbackToLatest: () => RecoveryResult;
  /** Execute an operation with automatic recovery */
  executeWithRecovery: <T>(
    operation: () => Promise<T>,
    description?: string
  ) => Promise<T>;
  /** Clear recovery state */
  clearRecoveryState: () => void;
  /** Get all snapshots for this feature */
  getSnapshots: () => StateSnapshot[];
}

/**
 * Options for useStateRecovery hook
 */
export interface UseStateRecoveryOptions {
  /** Feature name for snapshots */
  feature: string;
  /** Specific state slices to snapshot */
  slices?: (keyof RootState)[];
  /** Callback when recovery is attempted */
  onRecoveryAttempt?: (snapshot: StateSnapshot) => void;
  /** Callback when recovery succeeds */
  onRecoverySuccess?: (result: RecoveryResult) => void;
  /** Callback when recovery fails */
  onRecoveryFailed?: (error: string) => void;
}

/**
 * React hook for state recovery functionality
 * 
 * Provides snapshot creation, rollback, and automatic recovery
 * for risky operations in React components.
 * 
 * @param options - Hook configuration
 * @returns State and actions for state recovery
 * 
 * @example
 * function GiveawayForm() {
 *   const { 
 *     executeWithRecovery, 
 *     wasRecovered, 
 *     recoveryError 
 *   } = useStateRecovery({
 *     feature: 'giveaway',
 *     slices: ['giveaway'],
 *     onRecoveryFailed: (error) => {
 *       toast.error(`Recovery failed: ${error}`);
 *     }
 *   });
 * 
 *   const handleSelectWinner = async () => {
 *     try {
 *       await executeWithRecovery(
 *         () => selectWinner(),
 *         'Selecting giveaway winner'
 *       );
 *     } catch (error) {
 *       // Error handled, state was recovered
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {wasRecovered && <Alert>State was recovered after an error</Alert>}
 *       {recoveryError && <Alert type="error">{recoveryError}</Alert>}
 *       <button onClick={handleSelectWinner}>Select Winner</button>
 *     </div>
 *   );
 * }
 */
export function useStateRecovery(
  options: UseStateRecoveryOptions
): UseStateRecoveryState & UseStateRecoveryActions {
  const { 
    feature, 
    slices, 
    onRecoveryAttempt, 
    onRecoverySuccess,
    onRecoveryFailed 
  } = options;

  // State
  const [isRecovering, setIsRecovering] = useState(false);
  const [wasRecovered, setWasRecovered] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | null>(null);
  const [lastRecoveryTime, setLastRecoveryTime] = useState<string | null>(null);

  // Ref to track mounted state
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Create a snapshot before a risky operation
   */
  const createSnapshot = useCallback((description?: string): string => {
    const snapshotId = stateRecoveryService.createSnapshot({
      feature,
      description,
      slices,
    });
    
    if (isMountedRef.current) {
      setCurrentSnapshotId(snapshotId);
    }
    
    return snapshotId;
  }, [feature, slices]);

  /**
   * Rollback to a specific snapshot
   */
  const rollback = useCallback((snapshotId: string): RecoveryResult => {
    if (isMountedRef.current) {
      setIsRecovering(true);
      setRecoveryError(null);
    }

    const snapshot = stateRecoveryService.getSnapshot(snapshotId);
    if (snapshot) {
      onRecoveryAttempt?.(snapshot);
    }

    const result = stateRecoveryService.rollback(snapshotId);

    if (isMountedRef.current) {
      setIsRecovering(false);
      
      if (result.success) {
        setWasRecovered(true);
        setLastRecoveryTime(new Date().toISOString());
        onRecoverySuccess?.(result);
      } else {
        setRecoveryError(result.error || 'Unknown recovery error');
        onRecoveryFailed?.(result.error || 'Unknown recovery error');
      }
    }

    return result;
  }, [onRecoveryAttempt, onRecoverySuccess, onRecoveryFailed]);

  /**
   * Rollback to the most recent snapshot for this feature
   */
  const rollbackToLatest = useCallback((): RecoveryResult => {
    const latestSnapshot = stateRecoveryService.getLatestSnapshot(feature);
    
    if (!latestSnapshot) {
      const result: RecoveryResult = {
        success: false,
        error: `No snapshots found for feature: ${feature}`,
      };
      
      if (isMountedRef.current) {
        setRecoveryError(result.error);
        onRecoveryFailed?.(result.error);
      }
      
      return result;
    }

    return rollback(latestSnapshot.metadata.id);
  }, [feature, rollback, onRecoveryFailed]);

  /**
   * Execute an operation with automatic recovery
   */
  const executeWithRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    description?: string
  ): Promise<T> => {
    if (isMountedRef.current) {
      setWasRecovered(false);
      setRecoveryError(null);
    }

    try {
      return await withStateRecovery({
        feature,
        description,
        slices,
        operation,
        onRecoveryAttempt: (snapshot) => {
          if (isMountedRef.current) {
            setIsRecovering(true);
          }
          onRecoveryAttempt?.(snapshot);
        },
        onRecoveryFailed: (error) => {
          if (isMountedRef.current) {
            setIsRecovering(false);
            setRecoveryError(error.message);
          }
          onRecoveryFailed?.(error.message);
        },
      });
    } catch (error) {
      // State was recovered (if possible), update UI state
      if (isMountedRef.current) {
        setIsRecovering(false);
        setWasRecovered(true);
        setLastRecoveryTime(new Date().toISOString());
      }
      
      // Re-throw so the caller can handle the error
      throw error;
    }
  }, [feature, slices, onRecoveryAttempt, onRecoveryFailed]);

  /**
   * Clear recovery state
   */
  const clearRecoveryState = useCallback(() => {
    setWasRecovered(false);
    setRecoveryError(null);
    setCurrentSnapshotId(null);
  }, []);

  /**
   * Get all snapshots for this feature
   */
  const getSnapshots = useCallback((): StateSnapshot[] => {
    return stateRecoveryService.getSnapshotsForFeature(feature);
  }, [feature]);

  return {
    // State
    isRecovering,
    wasRecovered,
    recoveryError,
    currentSnapshotId,
    lastRecoveryTime,
    // Actions
    createSnapshot,
    rollback,
    rollbackToLatest,
    executeWithRecovery,
    clearRecoveryState,
    getSnapshots,
  };
}

/**
 * Hook for displaying recovery notifications
 * 
 * @param wasRecovered - Whether state was recovered
 * @param recoveryError - Error from recovery attempt
 * @returns Notification props
 */
export function useRecoveryNotification(
  wasRecovered: boolean,
  recoveryError: string | null
) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (wasRecovered) {
      setNotificationType('success');
      setNotificationMessage('Your data was recovered after an error occurred.');
      setShowNotification(true);
    } else if (recoveryError) {
      setNotificationType('error');
      setNotificationMessage(`Recovery failed: ${recoveryError}. Your data may have been lost.`);
      setShowNotification(true);
    }
  }, [wasRecovered, recoveryError]);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  return {
    showNotification,
    notificationType,
    notificationMessage,
    dismissNotification,
  };
}
