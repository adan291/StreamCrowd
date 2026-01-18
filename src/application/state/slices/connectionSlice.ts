/**
 * Connection Slice
 * 
 * Redux slice for connection state management.
 * Handles connection status for Twitch, OBS, and Firebase.
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export interface ConnectionStatus {
  connected: boolean;
  error: string | null;
  lastConnected: string | null;
}

export interface ConnectionState {
  twitch: ConnectionStatus;
  obs: ConnectionStatus;
  firebase: ConnectionStatus;
}

// Initial state
const initialState: ConnectionState = {
  twitch: {
    connected: false,
    error: null,
    lastConnected: null,
  },
  obs: {
    connected: false,
    error: null,
    lastConnected: null,
  },
  firebase: {
    connected: false,
    error: null,
    lastConnected: null,
  },
};

// Slice
const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    /**
     * Set Twitch connection status
     * @requirements 7.1 - Update Twitch connection status
     */
    setTwitchStatus: (state, action: PayloadAction<{ connected: boolean; error?: string }>) => {
      state.twitch.connected = action.payload.connected;
      state.twitch.error = action.payload.error || null;
      if (action.payload.connected) {
        state.twitch.lastConnected = new Date().toISOString();
      }
    },

    /**
     * Set OBS connection status
     * @requirements 7.2 - Update OBS connection status
     */
    setOBSStatus: (state, action: PayloadAction<{ connected: boolean; error?: string }>) => {
      state.obs.connected = action.payload.connected;
      state.obs.error = action.payload.error || null;
      if (action.payload.connected) {
        state.obs.lastConnected = new Date().toISOString();
      }
    },

    /**
     * Set Firebase connection status
     * @requirements 7.3 - Update Firebase connection status
     */
    setFirebaseStatus: (state, action: PayloadAction<{ connected: boolean; error?: string }>) => {
      state.firebase.connected = action.payload.connected;
      state.firebase.error = action.payload.error || null;
      if (action.payload.connected) {
        state.firebase.lastConnected = new Date().toISOString();
      }
    },

    /**
     * Clear connection error
     */
    clearConnectionError: (state, action: PayloadAction<{ service: 'twitch' | 'obs' | 'firebase' }>) => {
      state[action.payload.service].error = null;
    },

    /**
     * Reset all connections
     */
    resetConnections: (state) => {
      state.twitch = initialState.twitch;
      state.obs = initialState.obs;
      state.firebase = initialState.firebase;
    },
  },
});

// Actions
export const {
  setTwitchStatus,
  setOBSStatus,
  setFirebaseStatus,
  clearConnectionError,
  resetConnections,
} = connectionSlice.actions;

// Selectors
/**
 * Select Twitch connection status
 * @requirements 7.5 - Provide status for each service
 */
export const selectTwitchStatus = (state: RootState) => state.connection.twitch;

/**
 * Select OBS connection status
 * @requirements 7.5 - Provide status for each service
 */
export const selectOBSStatus = (state: RootState) => state.connection.obs;

/**
 * Select Firebase connection status
 * @requirements 7.5 - Provide status for each service
 */
export const selectFirebaseStatus = (state: RootState) => state.connection.firebase;

/**
 * Memoized selector for all connection statuses
 */
export const selectAllConnectionStatuses = createSelector(
  [selectTwitchStatus, selectOBSStatus, selectFirebaseStatus],
  (twitch, obs, firebase) => ({
    twitch,
    obs,
    firebase,
  })
);

/**
 * Memoized selector for connected services count
 */
export const selectConnectedServicesCount = createSelector(
  [selectTwitchStatus, selectOBSStatus, selectFirebaseStatus],
  (twitch, obs, firebase) => {
    let count = 0;
    if (twitch.connected) count++;
    if (obs.connected) count++;
    if (firebase.connected) count++;
    return count;
  }
);

/**
 * Memoized selector for any connection errors
 */
export const selectHasConnectionErrors = createSelector(
  [selectTwitchStatus, selectOBSStatus, selectFirebaseStatus],
  (twitch, obs, firebase) => {
    return !!(twitch.error || obs.error || firebase.error);
  }
);

/**
 * Memoized selector for connection errors
 */
export const selectConnectionErrors = createSelector(
  [selectTwitchStatus, selectOBSStatus, selectFirebaseStatus],
  (twitch, obs, firebase) => {
    const errors: Array<{ service: string; error: string }> = [];
    
    if (twitch.error) errors.push({ service: 'twitch', error: twitch.error });
    if (obs.error) errors.push({ service: 'obs', error: obs.error });
    if (firebase.error) errors.push({ service: 'firebase', error: firebase.error });
    
    return errors;
  }
);

// Reducer
export default connectionSlice.reducer;
