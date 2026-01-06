/**
 * usePlatformAuth - Hook for managing platform authentication state
 * 
 * Provides authentication state and methods for each platform (Twitch, YouTube, Kick).
 * Handles OAuth login flow, logout, and credential management.
 * 
 * @requirements 1.1 - WHEN a user navigates to a Platform_Section without being authenticated, THE Platform_Section SHALL display a Login_Button
 * @requirements 1.2 - WHEN the user is already authenticated in a platform, THE Platform_Section SHALL NOT display the Login_Button
 * @requirements 1.3 - WHEN the Login_Button is clicked, THE Auth_Service SHALL initiate the OAuth flow for that specific platform
 * @module src/application/hooks/usePlatformAuth
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Platform } from '../../../types/platform';
import { PlatformAuthService } from '../services/PlatformAuthService';
import { TokenStorage, type PlatformCredentials } from '../services/TokenStorage';

// ============================================
// Types
// ============================================

/**
 * Authentication state for a single platform
 */
export interface PlatformAuthState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** User credentials if authenticated */
  credentials: PlatformCredentials | null;
  /** Error message if authentication failed */
  error: string | null;
}

/**
 * Return type for usePlatformAuth hook
 */
export interface UsePlatformAuthReturn {
  /** Authentication state for the specified platform */
  authState: PlatformAuthState;
  /** Initiate OAuth login flow */
  login: () => Promise<void>;
  /** Logout and clear credentials */
  logout: () => Promise<void>;
  /** Check if user is authenticated */
  isAuthenticated: () => boolean;
  /** Get current credentials */
  getCredentials: () => PlatformCredentials | null;
  /** Refresh credentials (validate and refresh if needed) */
  refreshCredentials: () => Promise<boolean>;
}

/**
 * Return type for useMultiPlatformAuth hook
 */
export interface UseMultiPlatformAuthReturn {
  /** Authentication states for all platforms */
  authStates: Record<Platform, PlatformAuthState>;
  /** Login to a specific platform */
  login: (platform: Platform) => Promise<void>;
  /** Logout from a specific platform */
  logout: (platform: Platform) => Promise<void>;
  /** Check if authenticated for a platform */
  isAuthenticated: (platform: Platform) => boolean;
  /** Get credentials for a platform */
  getCredentials: (platform: Platform) => PlatformCredentials | null;
  /** Get list of authenticated platforms */
  getAuthenticatedPlatforms: () => Platform[];
  /** Whether any platform is loading */
  isAnyLoading: boolean;
}

// ============================================
// Constants
// ============================================

const ALL_PLATFORMS: Platform[] = ['twitch', 'youtube', 'kick'];

const DEFAULT_AUTH_STATE: PlatformAuthState = {
  isAuthenticated: false,
  isLoading: true,
  credentials: null,
  error: null,
};

// ============================================
// usePlatformAuth Hook (Single Platform)
// ============================================

/**
 * Hook for managing authentication state for a single platform
 * 
 * @param platform - The platform to manage authentication for
 * @returns Authentication state and methods
 * 
 * @example
 * ```tsx
 * const { authState, login, logout, isAuthenticated } = usePlatformAuth('twitch');
 * 
 * if (!authState.isAuthenticated) {
 *   return <LoginButton onClick={login} platform="twitch" />;
 * }
 * 
 * return <div>Welcome, {authState.credentials?.username}!</div>;
 * ```
 */
export function usePlatformAuth(platform: Platform): UsePlatformAuthReturn {
  const [authState, setAuthState] = useState<PlatformAuthState>(DEFAULT_AUTH_STATE);
  const mountedRef = useRef(true);

  // Initialize and subscribe to auth changes
  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Initialize the auth service
        await PlatformAuthService.initialize();

        // Subscribe to auth changes
        unsubscribe = PlatformAuthService.onAuthChange(platform, (credentials) => {
          if (!mountedRef.current) return;

          setAuthState({
            isAuthenticated: credentials !== null,
            isLoading: false,
            credentials,
            error: null,
          });
        });
      } catch (err) {
        if (!mountedRef.current) return;

        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          credentials: null,
          error: err instanceof Error ? err.message : 'Failed to initialize auth',
        });
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [platform]);

  /**
   * Initiate OAuth login flow
   * @requirements 1.3 - Initiate OAuth flow when Login_Button is clicked
   */
  const login = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await PlatformAuthService.initiateAuth(platform);
      // Auth state will be updated via the subscription callback
    } catch (err) {
      if (!mountedRef.current) return;

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      }));
    }
  }, [platform]);

  /**
   * Logout and clear credentials
   */
  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      await PlatformAuthService.logout(platform);
      // Auth state will be updated via the subscription callback
    } catch (err) {
      if (!mountedRef.current) return;

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Logout failed',
      }));
    }
  }, [platform]);

  /**
   * Check if user is authenticated
   * @requirements 1.2 - Check authentication status
   */
  const isAuthenticated = useCallback(() => {
    return authState.isAuthenticated;
  }, [authState.isAuthenticated]);

  /**
   * Get current credentials
   */
  const getCredentials = useCallback(() => {
    return authState.credentials;
  }, [authState.credentials]);

  /**
   * Refresh credentials (validate and refresh if needed)
   */
  const refreshCredentials = useCallback(async () => {
    try {
      const valid = await PlatformAuthService.validateCredentials(platform);
      if (!valid) {
        // Try to refresh
        const refreshed = await PlatformAuthService.refreshToken(platform);
        return refreshed;
      }
      return true;
    } catch {
      return false;
    }
  }, [platform]);

  return {
    authState,
    login,
    logout,
    isAuthenticated,
    getCredentials,
    refreshCredentials,
  };
}

// ============================================
// useMultiPlatformAuth Hook (All Platforms)
// ============================================

/**
 * Hook for managing authentication state for all platforms
 * 
 * @returns Authentication states and methods for all platforms
 * 
 * @example
 * ```tsx
 * const { authStates, login, logout, getAuthenticatedPlatforms } = useMultiPlatformAuth();
 * 
 * const authenticatedPlatforms = getAuthenticatedPlatforms();
 * 
 * return (
 *   <div>
 *     {ALL_PLATFORMS.map(platform => (
 *       <PlatformCard
 *         key={platform}
 *         platform={platform}
 *         isAuthenticated={authStates[platform].isAuthenticated}
 *         onLogin={() => login(platform)}
 *         onLogout={() => logout(platform)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useMultiPlatformAuth(): UseMultiPlatformAuthReturn {
  const [authStates, setAuthStates] = useState<Record<Platform, PlatformAuthState>>({
    twitch: { ...DEFAULT_AUTH_STATE },
    youtube: { ...DEFAULT_AUTH_STATE },
    kick: { ...DEFAULT_AUTH_STATE },
  });

  const mountedRef = useRef(true);
  const unsubscribesRef = useRef<Map<Platform, () => void>>(new Map());

  // Initialize and subscribe to auth changes for all platforms
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        // Initialize the auth service
        await PlatformAuthService.initialize();

        // Subscribe to auth changes for each platform
        for (const platform of ALL_PLATFORMS) {
          const unsubscribe = PlatformAuthService.onAuthChange(platform, (credentials) => {
            if (!mountedRef.current) return;

            setAuthStates(prev => ({
              ...prev,
              [platform]: {
                isAuthenticated: credentials !== null,
                isLoading: false,
                credentials,
                error: null,
              },
            }));
          });

          unsubscribesRef.current.set(platform, unsubscribe);
        }
      } catch (err) {
        if (!mountedRef.current) return;

        // Set error state for all platforms
        const errorState: PlatformAuthState = {
          isAuthenticated: false,
          isLoading: false,
          credentials: null,
          error: err instanceof Error ? err.message : 'Failed to initialize auth',
        };

        setAuthStates({
          twitch: { ...errorState },
          youtube: { ...errorState },
          kick: { ...errorState },
        });
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      // Unsubscribe from all platforms
      for (const unsubscribe of unsubscribesRef.current.values()) {
        unsubscribe();
      }
      unsubscribesRef.current.clear();
    };
  }, []);

  /**
   * Login to a specific platform
   */
  const login = useCallback(async (platform: Platform) => {
    setAuthStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], isLoading: true, error: null },
    }));

    try {
      await PlatformAuthService.initiateAuth(platform);
      // Auth state will be updated via the subscription callback
    } catch (err) {
      if (!mountedRef.current) return;

      setAuthStates(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Login failed',
        },
      }));
    }
  }, []);

  /**
   * Logout from a specific platform
   */
  const logout = useCallback(async (platform: Platform) => {
    setAuthStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], isLoading: true },
    }));

    try {
      await PlatformAuthService.logout(platform);
      // Auth state will be updated via the subscription callback
    } catch (err) {
      if (!mountedRef.current) return;

      setAuthStates(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Logout failed',
        },
      }));
    }
  }, []);

  /**
   * Check if authenticated for a platform
   */
  const isAuthenticated = useCallback((platform: Platform) => {
    return authStates[platform].isAuthenticated;
  }, [authStates]);

  /**
   * Get credentials for a platform
   */
  const getCredentials = useCallback((platform: Platform) => {
    return authStates[platform].credentials;
  }, [authStates]);

  /**
   * Get list of authenticated platforms
   */
  const getAuthenticatedPlatforms = useCallback(() => {
    return ALL_PLATFORMS.filter(p => authStates[p].isAuthenticated);
  }, [authStates]);

  /**
   * Check if any platform is loading
   */
  const isAnyLoading = ALL_PLATFORMS.some(p => authStates[p].isLoading);

  return {
    authStates,
    login,
    logout,
    isAuthenticated,
    getCredentials,
    getAuthenticatedPlatforms,
    isAnyLoading,
  };
}

export default usePlatformAuth;
