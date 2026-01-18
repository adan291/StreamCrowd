/**
 * useAuth Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for authentication feature.
 * Provides a clean API for components to interact with auth state.
 * 
 * @requirements 9.3
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateToken,
  tokenExpired,
  clearError,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUserId,
  selectUsername,
  selectUserAvatar,
  selectUserPlatform,
  selectAuthStatus,
  type User,
} from '../state/slices/authSlice';

export interface UseAuthReturn {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  username: string | null;
  userAvatar: string | null;
  userPlatform: 'twitch' | 'youtube' | 'firebase' | null;
  authStatus: {
    isAuthenticated: boolean;
    isLoading: boolean;
    hasError: boolean;
    error: string | null;
  };

  // Actions
  loginStart: () => void;
  loginSuccess: (user: User, token: string) => void;
  loginFailure: (error: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateToken: (token: string) => void;
  tokenExpired: () => void;
  clearError: () => void;
}

/**
 * Custom hook for authentication state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, loginSuccess, logout } = useAuth();
 * 
 * // Login
 * loginSuccess(
 *   { id: '123', username: 'user', platform: 'twitch' },
 *   'access_token_here'
 * );
 * 
 * // Check authentication
 * if (isAuthenticated) {
 *   console.log('User is logged in:', user?.username);
 * }
 * 
 * // Logout
 * logout();
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useAuth(): UseAuthReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const userId = useAppSelector(selectUserId);
  const username = useAppSelector(selectUsername);
  const userAvatar = useAppSelector(selectUserAvatar);
  const userPlatform = useAppSelector(selectUserPlatform);
  const authStatus = useAppSelector(selectAuthStatus);

  // Action creators wrapped in useCallback for stability
  const handleLoginStart = useCallback(() => {
    dispatch(loginStart());
  }, [dispatch]);

  const handleLoginSuccess = useCallback(
    (user: User, token: string) => {
      dispatch(loginSuccess({ user, token }));
    },
    [dispatch]
  );

  const handleLoginFailure = useCallback(
    (errorMsg: string) => {
      dispatch(loginFailure(errorMsg));
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleUpdateUser = useCallback(
    (updates: Partial<User>) => {
      dispatch(updateUser(updates));
    },
    [dispatch]
  );

  const handleUpdateToken = useCallback(
    (newToken: string) => {
      dispatch(updateToken(newToken));
    },
    [dispatch]
  );

  const handleTokenExpired = useCallback(() => {
    dispatch(tokenExpired());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    userId,
    username,
    userAvatar,
    userPlatform,
    authStatus,

    // Actions
    loginStart: handleLoginStart,
    loginSuccess: handleLoginSuccess,
    loginFailure: handleLoginFailure,
    logout: handleLogout,
    updateUser: handleUpdateUser,
    updateToken: handleUpdateToken,
    tokenExpired: handleTokenExpired,
    clearError: handleClearError,
  };
}

export default useAuth;
