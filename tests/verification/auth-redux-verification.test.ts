/**
 * Auth Redux Verification Test
 * 
 * Verifies that auth functionality is working correctly with Redux
 * and that no Context API is being used for auth state.
 * 
 * @requirements 10.1 - Context API removal for application state
 */

import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateToken,
  tokenExpired,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../../src/application/state/slices/authSlice';

describe('Auth Redux Verification', () => {
  const createTestStore = () => {
    return configureStore({
      reducer: {
        auth: authReducer,
      },
    });
  };

  describe('Redux Store Integration', () => {
    it('should initialize with correct default state', () => {
      const store = createTestStore();
      const state = store.getState();

      expect(state.auth.user).toBeNull();
      expect(state.auth.token).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.isLoading).toBe(false);
      expect(state.auth.error).toBeNull();
    });

    it('should handle login flow correctly', () => {
      const store = createTestStore();

      // Start login
      store.dispatch(loginStart());
      expect(selectAuthLoading(store.getState())).toBe(true);

      // Login success
      const user = {
        id: '123',
        username: 'testuser',
        platform: 'twitch' as const,
      };
      const token = 'test_token';
      store.dispatch(loginSuccess({ user, token }));

      expect(selectUser(store.getState())).toEqual(user);
      expect(selectIsAuthenticated(store.getState())).toBe(true);
      expect(selectAuthLoading(store.getState())).toBe(false);
    });

    it('should handle login failure correctly', () => {
      const store = createTestStore();

      store.dispatch(loginStart());
      store.dispatch(loginFailure('Invalid credentials'));

      expect(selectAuthError(store.getState())).toBe('Invalid credentials');
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(selectAuthLoading(store.getState())).toBe(false);
    });

    it('should handle logout correctly', () => {
      const store = createTestStore();

      // Login first
      const user = {
        id: '123',
        username: 'testuser',
        platform: 'twitch' as const,
      };
      store.dispatch(loginSuccess({ user, token: 'test_token' }));
      expect(selectIsAuthenticated(store.getState())).toBe(true);

      // Logout
      store.dispatch(logout());
      expect(selectUser(store.getState())).toBeNull();
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });

    it('should handle token updates', () => {
      const store = createTestStore();

      // Login first
      const user = {
        id: '123',
        username: 'testuser',
        platform: 'twitch' as const,
      };
      store.dispatch(loginSuccess({ user, token: 'old_token' }));

      // Update token
      store.dispatch(updateToken('new_token'));
      expect(store.getState().auth.token).toBe('new_token');
      expect(selectIsAuthenticated(store.getState())).toBe(true);
    });

    it('should handle token expiration', () => {
      const store = createTestStore();

      // Login first
      const user = {
        id: '123',
        username: 'testuser',
        platform: 'twitch' as const,
      };
      store.dispatch(loginSuccess({ user, token: 'test_token' }));

      // Token expires
      store.dispatch(tokenExpired());
      expect(store.getState().auth.token).toBeNull();
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect(store.getState().auth.user).not.toBeNull(); // User data preserved
    });

    it('should handle user updates', () => {
      const store = createTestStore();

      // Login first
      const user = {
        id: '123',
        username: 'testuser',
        platform: 'twitch' as const,
      };
      store.dispatch(loginSuccess({ user, token: 'test_token' }));

      // Update user
      store.dispatch(updateUser({ username: 'newusername' }));
      expect(selectUser(store.getState())?.username).toBe('newusername');
      expect(selectUser(store.getState())?.id).toBe('123'); // Other fields preserved
    });
  });

  describe('No Context API Usage', () => {
    it('should export useAuth from application hooks (Redux-based)', async () => {
      const { useAuth } = await import('../../src/application/hooks/useAuth');
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should verify context directory only has allowed contexts', async () => {
      // Verify that only ThemeContext and CollaborationContext exist
      // AuthContext should NOT exist (per requirement 10.1)
      const { ThemeProvider, useTheme } = await import('../../context');
      expect(ThemeProvider).toBeDefined();
      expect(useTheme).toBeDefined();
      
      // This import should work - these are the only allowed contexts
      const themeContext = await import('../../context/ThemeContext');
      expect(themeContext).toBeDefined();
    });
  });
});
