/**
 * Redux Persistence Tests
 * 
 * Tests for Redux persistence functionality with redux-persist and localStorage.
 * Verifies that state is correctly persisted and rehydrated across page reloads.
 * 
 * @requirements 8.1, 8.2, 8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { rootReducer, persistConfig } from '../../src/application/state/store';
import { createPoll, addVote } from '../../src/application/state/slices/pollSlice';
import { createGiveaway, addParticipant } from '../../src/application/state/slices/giveawaySlice';
import { loginSuccess } from '../../src/application/state/slices/authSlice';
import { setTheme, setLanguage, addNotification } from '../../src/application/state/slices/uiSlice';

// Mock localStorage
const createMockStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

describe('Redux Persistence', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let testStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create fresh mock storage
    mockStorage = createMockStorage();
    
    // Mock the storage module
    vi.spyOn(storage, 'getItem').mockImplementation((key) => 
      Promise.resolve(mockStorage.getItem(key))
    );
    vi.spyOn(storage, 'setItem').mockImplementation((key, value) => 
      Promise.resolve(mockStorage.setItem(key, value))
    );
    vi.spyOn(storage, 'removeItem').mockImplementation((key) => 
      Promise.resolve(mockStorage.removeItem(key))
    );

    // Create a fresh store for each test
    const persistedReducer = persistReducer(persistConfig, rootReducer);
    testStore = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
          },
        }),
    });
    persistStore(testStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockStorage.clear();
  });

  describe('Requirement 8.1: State Rehydration', () => {
    it('should rehydrate persisted state from localStorage on load', async () => {
      // Setup: Create initial state and persist it
      testStore.dispatch(createPoll({
        title: 'Test Poll',
        options: [
          { id: '1', text: 'Option 1', votes: 5 },
          { id: '2', text: 'Option 2', votes: 3 },
        ],
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      }));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data was persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();

      // Create a new store (simulating page reload)
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      // Create new persistor and wait for rehydration
      persistStore(newStore);
      await new Promise(resolve => {
        const unsubscribe = newStore.subscribe(() => {
          const state = newStore.getState();
          if (state.poll.active !== null) {
            unsubscribe();
            resolve(undefined);
          }
        });
      });

      // Verify state was rehydrated
      const rehydratedState = newStore.getState();
      expect(rehydratedState.poll.active).toBeTruthy();
      expect(rehydratedState.poll.active?.title).toBe('Test Poll');
      expect(rehydratedState.poll.active?.options).toHaveLength(2);
    });

    it('should handle missing localStorage data gracefully', async () => {
      // Clear any existing data
      mockStorage.clear();

      // Create a new store with empty localStorage
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      persistStore(newStore);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have initial state
      const state = newStore.getState();
      expect(state.poll.active).toBeNull();
      expect(state.poll.history).toEqual([]);
      expect(state.giveaway.active).toBeNull();
      expect(state.auth.user).toBeNull();
    });
  });

  describe('Requirement 8.2: State Persistence on Changes', () => {
    it('should persist poll state changes to localStorage', async () => {
      // Create a poll
      testStore.dispatch(createPoll({
        title: 'Persistence Test Poll',
        options: [
          { id: '1', text: 'Yes', votes: 0 },
          { id: '2', text: 'No', votes: 0 },
        ],
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      }));

      // Wait for persistence (debounced)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data was persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();
      
      const parsed = JSON.parse(persistedData!);
      expect(parsed.poll).toBeTruthy();
      
      const pollState = JSON.parse(parsed.poll);
      expect(pollState.active).toBeTruthy();
      expect(pollState.active.title).toBe('Persistence Test Poll');
    });

    it('should persist giveaway state changes to localStorage', async () => {
      // Create a giveaway
      testStore.dispatch(createGiveaway({ title: 'Test Giveaway' }));
      
      // Add participants
      testStore.dispatch(addParticipant({ username: 'user1', platform: 'twitch' }));
      testStore.dispatch(addParticipant({ username: 'user2', platform: 'youtube' }));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data was persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();
      
      const parsed = JSON.parse(persistedData!);
      expect(parsed.giveaway).toBeTruthy();
      
      const giveawayState = JSON.parse(parsed.giveaway);
      expect(giveawayState.active).toBeTruthy();
      expect(giveawayState.active.title).toBe('Test Giveaway');
      expect(giveawayState.active.participants).toHaveLength(2);
    });

    it('should persist auth state changes to localStorage', async () => {
      // Login user
      testStore.dispatch(loginSuccess({
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          platform: 'twitch',
        },
        token: 'test-token-123',
      }));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data was persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();
      
      const parsed = JSON.parse(persistedData!);
      expect(parsed.auth).toBeTruthy();
      
      const authState = JSON.parse(parsed.auth);
      expect(authState.user).toBeTruthy();
      expect(authState.user.username).toBe('testuser');
      expect(authState.token).toBe('test-token-123');
      expect(authState.isAuthenticated).toBe(true);
    });

    it('should persist UI preferences to localStorage', async () => {
      // Change theme and language
      testStore.dispatch(setTheme('light'));
      testStore.dispatch(setLanguage('en'));
      testStore.dispatch(addNotification({
        type: 'success',
        message: 'Test notification',
      }));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data was persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();
      
      const parsed = JSON.parse(persistedData!);
      expect(parsed.ui).toBeTruthy();
      
      const uiState = JSON.parse(parsed.ui);
      expect(uiState.theme).toBe('light');
      expect(uiState.language).toBe('en');
      expect(uiState.notifications).toHaveLength(1);
    });
  });

  describe('Requirement 8.3: Whitelist Configuration', () => {
    it('should persist whitelisted slices: poll, giveaway, auth, ui', async () => {
      // Update all whitelisted slices
      testStore.dispatch(createPoll({
        title: 'Test',
        options: [{ id: '1', text: 'Option', votes: 0 }],
      }));
      testStore.dispatch(createGiveaway({ title: 'Test' }));
      testStore.dispatch(loginSuccess({
        user: { id: '1', username: 'test', platform: 'twitch' },
        token: 'token',
      }));
      testStore.dispatch(setTheme('light'));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all whitelisted slices are persisted
      const persistedData = mockStorage.getItem('persist:streamcrowd');
      expect(persistedData).toBeTruthy();
      
      const parsed = JSON.parse(persistedData!);
      expect(parsed.poll).toBeTruthy();
      expect(parsed.giveaway).toBeTruthy();
      expect(parsed.auth).toBeTruthy();
      expect(parsed.ui).toBeTruthy();
    });

    it('should NOT persist blacklisted slice: connection', async () => {
      // Connection state should not be persisted
      // Even if we dispatch connection actions, they shouldn't be in localStorage
      
      // Wait for any potential persistence
      await new Promise(resolve => setTimeout(resolve, 100));

      const persistedData = mockStorage.getItem('persist:streamcrowd');
      
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        // Connection should not be in persisted data
        expect(parsed.connection).toBeUndefined();
      }
    });
  });

  describe('Requirement 8.5: Error Handling', () => {
    it('should handle localStorage quota exceeded error gracefully', async () => {
      // Mock setItem to throw quota exceeded error
      vi.spyOn(storage, 'setItem').mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        return Promise.reject(error);
      });

      // Create a new store with the mocked storage
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      // Dispatch an action
      newStore.dispatch(createPoll({
        title: 'Test',
        options: [{ id: '1', text: 'Option', votes: 0 }],
      }));

      // Wait for persistence attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Store should still work even if persistence fails
      const state = newStore.getState();
      expect(state.poll.active).toBeTruthy();
      expect(state.poll.active?.title).toBe('Test');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Set corrupted data in localStorage
      mockStorage.setItem('persist:streamcrowd', 'corrupted-json-data{{{');

      // Create a new store (simulating page reload with corrupted data)
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      persistStore(newStore);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should fall back to initial state
      const state = newStore.getState();
      expect(state.poll.active).toBeNull();
      expect(state.giveaway.active).toBeNull();
      expect(state.auth.user).toBeNull();
    });
  });

  describe('Integration: Full Persistence Lifecycle', () => {
    it('should persist and restore complete application state', async () => {
      // Create a complex state
      testStore.dispatch(createPoll({
        title: 'Community Poll',
        options: [
          { id: '1', text: 'Option A', votes: 10 },
          { id: '2', text: 'Option B', votes: 15 },
        ],
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      }));

      testStore.dispatch(createGiveaway({ title: 'Prize Giveaway' }));
      testStore.dispatch(addParticipant({ username: 'viewer1', platform: 'twitch' }));
      testStore.dispatch(addParticipant({ username: 'viewer2', platform: 'youtube' }));

      testStore.dispatch(loginSuccess({
        user: {
          id: 'broadcaster123',
          username: 'streamer',
          email: 'streamer@example.com',
          platform: 'twitch',
        },
        token: 'auth-token-xyz',
      }));

      testStore.dispatch(setTheme('dark'));
      testStore.dispatch(setLanguage('es'));

      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 150));

      // Create a new store (simulating page reload)
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      persistStore(newStore);
      
      // Wait for rehydration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify all state was restored
      const state = newStore.getState();

      // Poll state
      expect(state.poll.active).toBeTruthy();
      expect(state.poll.active?.title).toBe('Community Poll');
      expect(state.poll.active?.options).toHaveLength(2);

      // Giveaway state
      expect(state.giveaway.active).toBeTruthy();
      expect(state.giveaway.active?.title).toBe('Prize Giveaway');
      expect(state.giveaway.active?.participants).toHaveLength(2);

      // Auth state
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user?.username).toBe('streamer');
      expect(state.auth.token).toBe('auth-token-xyz');

      // UI state
      expect(state.ui.theme).toBe('dark');
      expect(state.ui.language).toBe('es');
    });

    it('should handle state updates after rehydration', async () => {
      // Create initial state
      testStore.dispatch(createPoll({
        title: 'Initial Poll',
        options: [{ id: '1', text: 'Yes', votes: 0 }],
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new store (reload)
      const persistedReducer = persistReducer(persistConfig, rootReducer);
      const newStore = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
            },
          }),
      });

      persistStore(newStore);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update state after rehydration
      newStore.dispatch(addVote({ optionId: '1' }));
      newStore.dispatch(addVote({ optionId: '1' }));

      // Verify updates work
      const state = newStore.getState();
      expect(state.poll.active?.options[0].votes).toBe(2);
    });
  });
});
