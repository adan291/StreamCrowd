/**
 * useTokenRefresh Hook
 * 
 * Provides automatic token refresh functionality for React components.
 * Integrates with TokenRefreshInterceptor to ensure tokens are valid before API calls.
 * 
 * Security Properties:
 * - Automatically refreshes expired tokens
 * - Handles refresh failures gracefully
 * - Redirects to login if refresh fails
 * 
 * @module src/application/hooks/useTokenRefresh
 * 
 * **Validates: Requirements 3.4, 3.5**
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TokenRefreshInterceptor, 
  tokenRefreshInterceptor,
  TokenRefreshResult,
  TokenRefreshHandler,
  RefreshConfig
} from '../../infrastructure/auth/TokenRefreshInterceptor';
import { TokenProvider, StoredToken } from '../../infrastructure/auth/TokenStorage';

// ============================================
// Types
// ============================================

export interface UseTokenRefreshState {
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Last refresh result */
  lastResult: TokenRefreshResult | null;
  /** Whether re-authentication is required */
  requiresReauth: boolean;
  /** Provider that requires re-auth (if any) */
  reauthProvider: TokenProvider | null;
  /** Error message (if any) */
  error: string | null;
}

export interface UseTokenRefreshOptions {
  /** Providers to manage (default: all) */
  providers?: TokenProvider[];
  /** Custom interceptor instance (default: singleton) */
  interceptor?: TokenRefreshInterceptor;
  /** Callback when re-authentication is required */
  onRequireReauth?: (provider: TokenProvider) => void;
  /** Callback when refresh succeeds */
  onRefreshSuccess?: (provider: TokenProvider) => void;
  /** Callback when refresh fails */
  onRefreshFailed?: (provider: TokenProvider, error: string) => void;
  /** Whether to auto-register default refresh handlers */
  autoRegisterHandlers?: boolean;
}

export interface UseTokenRefreshReturn extends UseTokenRefreshState {
  /** Ensure a valid token exists for a provider */
  ensureValidToken: (provider: TokenProvider) => Promise<TokenRefreshResult>;
  /** Manually trigger a token refresh */
  refreshToken: (provider: TokenProvider) => Promise<TokenRefreshResult>;
  /** Register a custom refresh handler */
  registerRefreshHandler: (provider: TokenProvider, handler: TokenRefreshHandler) => void;
  /** Clear the re-auth requirement */
  clearReauthRequirement: () => void;
  /** Check if a provider needs refresh */
  needsRefresh: (provider: TokenProvider) => Promise<boolean>;
}

// ============================================
// Constants
// ============================================

const DEFAULT_PROVIDERS: TokenProvider[] = ['twitch', 'youtube', 'google', 'streamlabs', 'streamelements'];

// ============================================
// Default Refresh Handlers
// ============================================

/**
 * Create a default refresh handler for Twitch.
 * 
 * Note: Twitch token refresh requires a backend server to securely
 * exchange the refresh token. For client-side apps, we return null
 * to trigger re-authentication.
 */
const createTwitchRefreshHandler = (): TokenRefreshHandler => {
  return async (_provider: TokenProvider, _currentToken: StoredToken): Promise<StoredToken | null> => {
    // Twitch token refresh requires client_secret which should not be exposed
    // in client-side code. In a production app, this would call a backend endpoint.
    console.log('[useTokenRefresh] Twitch token refresh requires backend support');
    return null;
  };
};

/**
 * Create a default refresh handler for YouTube.
 * 
 * Note: YouTube token refresh requires a backend server to securely
 * exchange the refresh token. For client-side apps, we return null
 * to trigger re-authentication.
 */
const createYouTubeRefreshHandler = (): TokenRefreshHandler => {
  return async (_provider: TokenProvider, _currentToken: StoredToken): Promise<StoredToken | null> => {
    // YouTube token refresh requires client_secret which should not be exposed
    // in client-side code. In a production app, this would call a backend endpoint.
    console.log('[useTokenRefresh] YouTube token refresh requires backend support');
    return null;
  };
};

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for automatic token refresh functionality.
 * 
 * @example
 * ```tsx
 * const { ensureValidToken, requiresReauth, reauthProvider } = useTokenRefresh({
 *   onRequireReauth: (provider) => {
 *     // Show re-auth modal or redirect
 *     navigate(`/auth/${provider}`);
 *   },
 * });
 * 
 * // Before making an API call
 * const result = await ensureValidToken('twitch');
 * if (result.success) {
 *   // Make API call
 * }
 * ```
 * 
 * **Validates: Requirements 3.4, 3.5**
 */
export function useTokenRefresh(
  options: UseTokenRefreshOptions = {}
): UseTokenRefreshReturn {
  const {
    providers = DEFAULT_PROVIDERS,
    interceptor = tokenRefreshInterceptor,
    onRequireReauth,
    onRefreshSuccess,
    onRefreshFailed,
    autoRegisterHandlers = true,
  } = options;

  // State
  const [state, setState] = useState<UseTokenRefreshState>({
    isRefreshing: false,
    lastResult: null,
    requiresReauth: false,
    reauthProvider: null,
    error: null,
  });

  // Refs to avoid stale closures
  const onRequireReauthRef = useRef(onRequireReauth);
  const onRefreshSuccessRef = useRef(onRefreshSuccess);
  const onRefreshFailedRef = useRef(onRefreshFailed);
  
  onRequireReauthRef.current = onRequireReauth;
  onRefreshSuccessRef.current = onRefreshSuccess;
  onRefreshFailedRef.current = onRefreshFailed;

  // Configure interceptor callbacks
  useEffect(() => {
    const config: Partial<RefreshConfig> = {
      onRequireReauth: (provider) => {
        setState(prev => ({
          ...prev,
          requiresReauth: true,
          reauthProvider: provider,
        }));
        onRequireReauthRef.current?.(provider);
      },
      onRefreshSuccess: (provider) => {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: null,
        }));
        onRefreshSuccessRef.current?.(provider);
      },
      onRefreshFailed: (provider, error) => {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error,
        }));
        onRefreshFailedRef.current?.(provider, error);
      },
    };

    interceptor.updateConfig(config);
  }, [interceptor]);

  // Register default refresh handlers
  useEffect(() => {
    if (!autoRegisterHandlers) return;

    // Register handlers for each provider
    if (providers.includes('twitch')) {
      interceptor.registerRefreshHandler('twitch', createTwitchRefreshHandler());
    }
    if (providers.includes('youtube')) {
      interceptor.registerRefreshHandler('youtube', createYouTubeRefreshHandler());
    }

    // Cleanup on unmount
    return () => {
      // Don't unregister handlers on unmount as other components may use them
    };
  }, [interceptor, providers, autoRegisterHandlers]);

  /**
   * Ensure a valid token exists for a provider.
   */
  const ensureValidToken = useCallback(async (
    provider: TokenProvider
  ): Promise<TokenRefreshResult> => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      const result = await interceptor.ensureValidToken(provider);
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        lastResult: result,
        requiresReauth: result.requiresReauth ?? false,
        reauthProvider: result.requiresReauth ? provider : null,
        error: result.error ?? null,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: errorMessage,
      }));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [interceptor]);

  /**
   * Manually trigger a token refresh.
   */
  const refreshToken = useCallback(async (
    provider: TokenProvider
  ): Promise<TokenRefreshResult> => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      // Get current token
      const { tokenStorage } = await import('../../infrastructure/auth/TokenStorage');
      const currentToken = await tokenStorage.getAccessToken(provider);
      
      if (!currentToken) {
        const result: TokenRefreshResult = {
          success: false,
          error: 'No token to refresh',
          requiresReauth: true,
        };
        
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          lastResult: result,
          requiresReauth: true,
          reauthProvider: provider,
        }));

        return result;
      }

      const result = await interceptor.refreshToken(provider, currentToken);
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        lastResult: result,
        requiresReauth: result.requiresReauth ?? false,
        reauthProvider: result.requiresReauth ? provider : null,
        error: result.error ?? null,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: errorMessage,
      }));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [interceptor]);

  /**
   * Register a custom refresh handler.
   */
  const registerRefreshHandler = useCallback((
    provider: TokenProvider,
    handler: TokenRefreshHandler
  ): void => {
    interceptor.registerRefreshHandler(provider, handler);
  }, [interceptor]);

  /**
   * Clear the re-auth requirement.
   */
  const clearReauthRequirement = useCallback((): void => {
    setState(prev => ({
      ...prev,
      requiresReauth: false,
      reauthProvider: null,
    }));
  }, []);

  /**
   * Check if a provider needs refresh.
   */
  const needsRefresh = useCallback(async (
    provider: TokenProvider
  ): Promise<boolean> => {
    return interceptor.needsRefresh(provider);
  }, [interceptor]);

  return {
    ...state,
    ensureValidToken,
    refreshToken,
    registerRefreshHandler,
    clearReauthRequirement,
    needsRefresh,
  };
}

// ============================================
// Default Export
// ============================================

export default useTokenRefresh;
