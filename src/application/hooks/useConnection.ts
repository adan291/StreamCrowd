/**
 * useConnection Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for connection state.
 * Provides a clean API for components to interact with connection status.
 * 
 * @requirements 9.3
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  setTwitchStatus,
  setOBSStatus,
  setFirebaseStatus,
  clearConnectionError,
  resetConnections,
  selectTwitchStatus,
  selectOBSStatus,
  selectFirebaseStatus,
  selectAllConnectionStatuses,
  selectConnectedServicesCount,
  selectHasConnectionErrors,
  selectConnectionErrors,
  type ConnectionStatus,
} from '../state/slices/connectionSlice';

export interface UseConnectionReturn {
  // State
  twitchStatus: ConnectionStatus;
  obsStatus: ConnectionStatus;
  firebaseStatus: ConnectionStatus;
  allStatuses: {
    twitch: ConnectionStatus;
    obs: ConnectionStatus;
    firebase: ConnectionStatus;
  };
  connectedServicesCount: number;
  hasConnectionErrors: boolean;
  connectionErrors: Array<{ service: string; error: string }>;

  // Actions
  setTwitchStatus: (connected: boolean, error?: string) => void;
  setOBSStatus: (connected: boolean, error?: string) => void;
  setFirebaseStatus: (connected: boolean, error?: string) => void;
  clearConnectionError: (service: 'twitch' | 'obs' | 'firebase') => void;
  resetConnections: () => void;
}

/**
 * Custom hook for connection state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * 
 * @example
 * ```tsx
 * const { twitchStatus, setTwitchStatus, connectedServicesCount } = useConnection();
 * 
 * // Update connection status
 * setTwitchStatus(true);
 * 
 * // Check connection
 * if (twitchStatus.connected) {
 *   console.log('Twitch is connected');
 * }
 * 
 * // Show connected services
 * console.log(`${connectedServicesCount} services connected`);
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useConnection(): UseConnectionReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  const twitchStatus = useAppSelector(selectTwitchStatus);
  const obsStatus = useAppSelector(selectOBSStatus);
  const firebaseStatus = useAppSelector(selectFirebaseStatus);
  const allStatuses = useAppSelector(selectAllConnectionStatuses);
  const connectedServicesCount = useAppSelector(selectConnectedServicesCount);
  const hasConnectionErrors = useAppSelector(selectHasConnectionErrors);
  const connectionErrors = useAppSelector(selectConnectionErrors);

  // Action creators wrapped in useCallback for stability
  const handleSetTwitchStatus = useCallback(
    (connected: boolean, error?: string) => {
      dispatch(setTwitchStatus({ connected, error }));
    },
    [dispatch]
  );

  const handleSetOBSStatus = useCallback(
    (connected: boolean, error?: string) => {
      dispatch(setOBSStatus({ connected, error }));
    },
    [dispatch]
  );

  const handleSetFirebaseStatus = useCallback(
    (connected: boolean, error?: string) => {
      dispatch(setFirebaseStatus({ connected, error }));
    },
    [dispatch]
  );

  const handleClearConnectionError = useCallback(
    (service: 'twitch' | 'obs' | 'firebase') => {
      dispatch(clearConnectionError({ service }));
    },
    [dispatch]
  );

  const handleResetConnections = useCallback(() => {
    dispatch(resetConnections());
  }, [dispatch]);

  return {
    // State
    twitchStatus,
    obsStatus,
    firebaseStatus,
    allStatuses,
    connectedServicesCount,
    hasConnectionErrors,
    connectionErrors,

    // Actions
    setTwitchStatus: handleSetTwitchStatus,
    setOBSStatus: handleSetOBSStatus,
    setFirebaseStatus: handleSetFirebaseStatus,
    clearConnectionError: handleClearConnectionError,
    resetConnections: handleResetConnections,
  };
}

export default useConnection;
