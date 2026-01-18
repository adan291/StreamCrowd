/**
 * Redux Store Configuration
 * 
 * Configures the Redux store with:
 * - Redux Toolkit for simplified state management
 * - Redux Persist for localStorage persistence
 * - DevTools integration for development debugging
 * - State recovery support for error handling
 * 
 * @see Requirements 2.1, 2.2, 2.3, 2.4
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5 (State Recovery)
 */

import { configureStore, combineReducers, Reducer, AnyAction } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import pollReducer from './slices/pollSlice';
import giveawayReducer from './slices/giveawaySlice';
import gamesReducer from './slices/gamesSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import connectionReducer from './slices/connectionSlice';

// State Recovery Action Type
export const STATE_RECOVERY_RESTORE = 'STATE_RECOVERY/RESTORE';

// Combine all reducers
const combinedReducer = combineReducers({
  poll: pollReducer,
  giveaway: giveawayReducer,
  games: gamesReducer,
  auth: authReducer,
  ui: uiReducer,
  connection: connectionReducer,
});

/**
 * Root reducer with state recovery support
 * 
 * Handles the STATE_RECOVERY/RESTORE action to restore state from snapshots.
 * This enables rollback functionality for error recovery.
 * 
 * @requirements 7.4 - State restoration from Redux/localStorage
 */
const rootReducer: Reducer = (state, action: AnyAction) => {
  // Handle state recovery restore action
  if (action.type === STATE_RECOVERY_RESTORE) {
    const restoredState = action.payload;
    
    // Merge restored state with current state
    // Only restore slices that are present in the payload
    const newState = { ...state };
    
    for (const key of Object.keys(restoredState)) {
      if (key in newState) {
        (newState as any)[key] = restoredState[key];
      }
    }
    
    return newState;
  }
  
  return combinedReducer(state, action);
};

// Persistence configuration
const persistConfig = {
  key: 'streamcrowd',
  version: 1,
  storage,
  // Whitelist: slices that should be persisted
  whitelist: ['poll', 'giveaway', 'auth', 'ui'],
  // Blacklist: slices that should NOT be persisted (transient state)
  blacklist: ['connection'],
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions for serializable check
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  // Enable DevTools in development only
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor for PersistGate
export const persistor = persistStore(store);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export for testing purposes
export { rootReducer, persistConfig, combinedReducer };
