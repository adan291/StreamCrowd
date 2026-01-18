/**
 * Auth Slice
 * 
 * Redux slice for authentication state management.
 * Handles user authentication, token management, and auth status.
 * 
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  platform: 'twitch' | 'youtube' | 'firebase';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Start login process
     */
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    /**
     * Login success
     * @requirements 5.1 - Store user data and authentication status
     */
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Login failure
     */
    loginFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isAuthenticated = false;
    },

    /**
     * Logout
     * @requirements 5.2 - Clear all user data and reset to initial state
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Update user data
     */
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    /**
     * Update token
     * @requirements 5.3 - Update authentication status when token expires
     */
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },

    /**
     * Token expired
     * @requirements 5.3 - Update authentication status when token expires
     */
    tokenExpired: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.error = 'Token expired';
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },
});

// Actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateToken,
  tokenExpired,
  clearError,
} = authSlice.actions;

// Selectors
/**
 * Select user
 * @requirements 5.6 - Provide isAuthenticated, user, and loading states
 */
export const selectUser = (state: RootState) => state.auth.user;

/**
 * Select token
 */
export const selectToken = (state: RootState) => state.auth.token;

/**
 * Select isAuthenticated
 * @requirements 5.6 - Provide isAuthenticated, user, and loading states
 */
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

/**
 * Select isLoading
 * @requirements 5.6 - Provide isAuthenticated, user, and loading states
 */
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;

/**
 * Select error
 */
export const selectAuthError = (state: RootState) => state.auth.error;

/**
 * Memoized selector for user ID
 */
export const selectUserId = createSelector(
  [selectUser],
  (user) => user?.id || null
);

/**
 * Memoized selector for username
 */
export const selectUsername = createSelector(
  [selectUser],
  (user) => user?.username || null
);

/**
 * Memoized selector for user avatar
 */
export const selectUserAvatar = createSelector(
  [selectUser],
  (user) => user?.avatar || null
);

/**
 * Memoized selector for user platform
 */
export const selectUserPlatform = createSelector(
  [selectUser],
  (user) => user?.platform || null
);

/**
 * Memoized selector for auth status
 */
export const selectAuthStatus = createSelector(
  [selectIsAuthenticated, selectAuthLoading, selectAuthError],
  (isAuthenticated, isLoading, error) => ({
    isAuthenticated,
    isLoading,
    hasError: !!error,
    error,
  })
);

// Reducer
export default authSlice.reducer;
