/**
 * useAuth Hook
 * 
 * React hook for accessing authentication state and capabilities.
 * Provides reactive updates when auth state changes.
 * 
 * @module src/application/hooks/useAuth
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  AuthService, 
  AuthState, 
  AuthCapabilities, 
  AuthMode,
  getAuthToken,
  canAccessTwitchAPI,
} from '../services/AuthService';

export interface UseAuthReturn {
  /** Current authentication state */
  authState: AuthState;
  /** Current authentication mode */
  mode: AuthMode;
  /** Whether user is authenticated with OAuth */
  isAuthenticated: boolean;
  /** Whether connected (OAuth or anonymous) */
  isConnected: boolean;
  /** Current capabilities */
  capabilities: AuthCapabilities;
  /** OAuth token (null if not authenticated) */
  token: string | null;
  /** User/Broadcaster ID */
  userId: string | null;
  /** Channel name */
  channelName: string | null;
  /** Check if a specific capability is available */
  hasCapability: (capability: keyof AuthCapabilities) => boolean;
  /** Set OAuth authentication */
  setOAuthAuth: (params: {
    token: string;
    userId?: string;
    channelName?: string;
    scopes?: string[];
    expiresIn?: number;
  }) => void;
  /** Set anonymous connection */
  setAnonymousAuth: (channelName: string) => void;
  /** Update user ID */
  setUserId: (userId: string) => void;
  /** Update channel name */
  setChannelName: (channelName: string) => void;
  /** Update scopes */
  setScopes: (scopes: string[]) => void;
  /** Clear authentication */
  clearAuth: () => void;
}

/**
 * Hook for accessing and managing authentication state
 * 
 * @example
 * ```tsx
 * const { isAuthenticated, capabilities, token } = useAuth();
 * 
 * if (capabilities.canReadChatters) {
 *   // Safe to call chatters API
 *   const chatters = await getChatters(token);
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(AuthService.getState());

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = AuthService.subscribe((newState) => {
      setAuthState(newState);
    });
    return unsubscribe;
  }, []);

  const hasCapability = useCallback((capability: keyof AuthCapabilities): boolean => {
    return AuthService.hasCapability(capability);
  }, []);

  const setOAuthAuth = useCallback((params: {
    token: string;
    userId?: string;
    channelName?: string;
    scopes?: string[];
    expiresIn?: number;
  }) => {
    AuthService.setOAuthAuth(params);
  }, []);

  const setAnonymousAuth = useCallback((channelName: string) => {
    AuthService.setAnonymousAuth(channelName);
  }, []);

  const setUserId = useCallback((userId: string) => {
    AuthService.setUserId(userId);
  }, []);

  const setChannelName = useCallback((channelName: string) => {
    AuthService.setChannelName(channelName);
  }, []);

  const setScopes = useCallback((scopes: string[]) => {
    AuthService.setScopes(scopes);
  }, []);

  const clearAuth = useCallback(() => {
    AuthService.clear();
  }, []);

  return {
    authState,
    mode: authState.mode,
    isAuthenticated: AuthService.isAuthenticated(),
    isConnected: AuthService.isConnected(),
    capabilities: AuthService.getCapabilities(),
    token: authState.token,
    userId: authState.userId,
    channelName: authState.channelName,
    hasCapability,
    setOAuthAuth,
    setAnonymousAuth,
    setUserId,
    setChannelName,
    setScopes,
    clearAuth,
  };
}

// Re-export utilities
export { getAuthToken, canAccessTwitchAPI };
export type { AuthState, AuthCapabilities, AuthMode };

export default useAuth;
