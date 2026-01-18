/**
 * useTokenValidation Hook
 * 
 * Validates stored tokens on application startup and triggers refresh if expired.
 * This hook should be used at the app root level to ensure tokens are validated
 * before any API calls are made.
 * 
 * Security Properties:
 * - Validates token expiration on app load
 * - Triggers refresh flow for expired tokens
 * - Clears invalid tokens to prevent unauthorized access attempts
 * - Integrates with TokenRefreshInterceptor for automatic refresh
 * 
 * @module src/application/hooks/useTokenValidation
 * 
 * **Validates: Requirements 3.3, 3.4, 3.5**
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { tokenStorage, TokenProvider } from '../../infrastructure/auth/TokenStorage';
import { tokenRefreshInterceptor } from '../../infrastructure/auth/TokenRefreshInterceptor';
import { AuthService } from '../services/AuthService';

// ============================================
// Types
// ============================================

export interface TokenValidationState {
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether validation has completed (regardless of result) */
  isComplete: boolean;
  /** Validation results per provider */
  results: Record<TokenProvider, TokenValidationResult>;
  /** Providers that need re-authentication */
  expiredProviders: TokenProvider[];
  /** Providers with valid tokens */
  validProviders: TokenProvider[];
  /** Any error that occurred during validation */
  error: string | null;
}

export interface TokenValidationResult {
  /** Whether the token exists */
  exists: boolean;
  /** Whether the token is valid (not expired) */
  isValid: boolean;
  /** Whether the token is expiring soon (within buffer) */
  isExpiringSoon: boolean;
  /** Time until expiration in milliseconds (-1 if no token) */
  timeUntilExpiration: number;
  /** Whether refresh was attempted */
  refreshAttempted: boolean;
  /** Whether refresh was successful */
  refreshSuccessful: boolean;
}

export interface UseTokenValidationOptions {
  /** Providers to validate (default: all) */
  providers?: TokenProvider[];
  /** Buffer time in ms to consider token "expiring soon" (default: 5 minutes) */
  expirationBuffer?: number;
  /** Whether to automatically trigger refresh for expired tokens */
  autoRefresh?: boolean;
  /** Callback when a token needs re-authentication */
  onTokenExpired?: (provider: TokenProvider) => void;
  /** Callback when validation completes */
  onValidationComplete?: (state: TokenValidationState) => void;
  /** Whether to skip validation (for overlay mode) */
  skip?: boolean;
}

export interface UseTokenValidationReturn extends TokenValidationState {
  /** Manually trigger validation */
  validate: () => Promise<void>;
  /** Check if a specific provider needs re-auth */
  needsReauth: (provider: TokenProvider) => boolean;
  /** Clear expired tokens */
  clearExpiredTokens: () => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_PROVIDERS: TokenProvider[] = ['twitch', 'youtube', 'google', 'streamlabs', 'streamelements'];
const DEFAULT_EXPIRATION_BUFFER = 5 * 60 * 1000; // 5 minutes

const INITIAL_RESULT: TokenValidationResult = {
  exists: false,
  isValid: false,
  isExpiringSoon: false,
  timeUntilExpiration: -1,
  refreshAttempted: false,
  refreshSuccessful: false,
};

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for validating stored tokens on application startup.
 * 
 * @example
 * ```tsx
 * const { isValidating, expiredProviders, needsReauth } = useTokenValidation({
 *   onTokenExpired: (provider) => {
 *     console.log(`${provider} token expired, please re-authenticate`);
 *   },
 * });
 * 
 * if (needsReauth('twitch')) {
 *   // Show re-authentication prompt
 * }
 * ```
 * 
 * **Validates: Requirements 3.3**
 */
export function useTokenValidation(
  options: UseTokenValidationOptions = {}
): UseTokenValidationReturn {
  const {
    providers = DEFAULT_PROVIDERS,
    expirationBuffer = DEFAULT_EXPIRATION_BUFFER,
    autoRefresh = true,
    onTokenExpired,
    onValidationComplete,
    skip = false,
  } = options;

  // State
  const [state, setState] = useState<TokenValidationState>({
    isValidating: false,
    isComplete: false,
    results: {} as Record<TokenProvider, TokenValidationResult>,
    expiredProviders: [],
    validProviders: [],
    error: null,
  });

  // Refs to avoid stale closures
  const onTokenExpiredRef = useRef(onTokenExpired);
  const onValidationCompleteRef = useRef(onValidationComplete);
  onTokenExpiredRef.current = onTokenExpired;
  onValidationCompleteRef.current = onValidationComplete;

  /**
   * Validate a single provider's token
   */
  const validateProvider = useCallback(async (
    provider: TokenProvider
  ): Promise<TokenValidationResult> => {
    try {
      // Check if token exists
      const token = await tokenStorage.getAccessToken(provider);
      
      if (!token) {
        return { ...INITIAL_RESULT, exists: false };
      }

      // Check expiration
      const isExpired = await tokenStorage.isTokenExpired(provider, 0);
      const isExpiringSoon = await tokenStorage.isTokenExpired(provider, expirationBuffer);
      const timeUntilExpiration = await tokenStorage.getTimeUntilExpiration(provider);

      const result: TokenValidationResult = {
        exists: true,
        isValid: !isExpired,
        isExpiringSoon,
        timeUntilExpiration,
        refreshAttempted: false,
        refreshSuccessful: false,
      };

      // If expired or expiring soon and autoRefresh is enabled, attempt refresh
      if ((isExpired || isExpiringSoon) && autoRefresh) {
        result.refreshAttempted = true;
        
        // Use TokenRefreshInterceptor for automatic refresh
        // This integrates with the centralized token refresh system
        console.log(`[useTokenValidation] Token for ${provider} is ${isExpired ? 'expired' : 'expiring soon'}, attempting refresh`);
        
        try {
          const refreshResult = await tokenRefreshInterceptor.ensureValidToken(provider);
          
          if (refreshResult.success && refreshResult.token) {
            result.refreshSuccessful = true;
            result.isValid = true;
            result.isExpiringSoon = false;
            result.timeUntilExpiration = refreshResult.token.expiresAt - Date.now();
            console.log(`[useTokenValidation] Token refresh successful for ${provider}`);
          } else {
            result.refreshSuccessful = false;
            // Notify callback that re-auth is needed
            if (isExpired || refreshResult.requiresReauth) {
              onTokenExpiredRef.current?.(provider);
            }
          }
        } catch (refreshError) {
          console.error(`[useTokenValidation] Token refresh failed for ${provider}:`, refreshError);
          result.refreshSuccessful = false;
          
          // Notify callback
          if (isExpired) {
            onTokenExpiredRef.current?.(provider);
          }
        }
      }

      return result;
    } catch (error) {
      console.error(`[useTokenValidation] Error validating ${provider} token:`, error);
      return {
        ...INITIAL_RESULT,
        exists: false,
      };
    }
  }, [expirationBuffer, autoRefresh]);

  /**
   * Validate all configured providers
   */
  const validate = useCallback(async () => {
    if (skip) {
      setState(prev => ({
        ...prev,
        isComplete: true,
        isValidating: false,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isValidating: true,
      error: null,
    }));

    try {
      const results: Record<TokenProvider, TokenValidationResult> = {} as Record<TokenProvider, TokenValidationResult>;
      const expiredProviders: TokenProvider[] = [];
      const validProviders: TokenProvider[] = [];

      // Validate each provider
      for (const provider of providers) {
        const result = await validateProvider(provider);
        results[provider] = result;

        if (result.exists) {
          if (result.isValid && !result.isExpiringSoon) {
            validProviders.push(provider);
          } else {
            expiredProviders.push(provider);
          }
        }
      }

      // Migrate any legacy plaintext tokens
      const migratedCount = await tokenStorage.migrateLegacyTokens();
      if (migratedCount > 0) {
        console.log(`[useTokenValidation] Migrated ${migratedCount} legacy tokens to secure storage`);
      }

      // Audit for any remaining plaintext tokens (security check)
      const plaintextTokens = tokenStorage.auditPlaintextTokens();
      if (plaintextTokens.length > 0) {
        console.warn('[useTokenValidation] Found plaintext tokens in localStorage:', plaintextTokens);
        // In production, these should be cleared for security
      }

      const newState: TokenValidationState = {
        isValidating: false,
        isComplete: true,
        results,
        expiredProviders,
        validProviders,
        error: null,
      };

      setState(newState);
      onValidationCompleteRef.current?.(newState);

      // Update AuthService if Twitch token is invalid
      if (expiredProviders.includes('twitch')) {
        AuthService.invalidateToken();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('[useTokenValidation] Validation failed:', error);
      
      setState(prev => ({
        ...prev,
        isValidating: false,
        isComplete: true,
        error: errorMessage,
      }));
    }
  }, [providers, validateProvider, skip]);

  /**
   * Check if a specific provider needs re-authentication
   */
  const needsReauth = useCallback((provider: TokenProvider): boolean => {
    return state.expiredProviders.includes(provider);
  }, [state.expiredProviders]);

  /**
   * Clear all expired tokens
   */
  const clearExpiredTokens = useCallback(() => {
    for (const provider of state.expiredProviders) {
      tokenStorage.clearToken(provider);
    }
    
    setState(prev => ({
      ...prev,
      expiredProviders: [],
    }));
  }, [state.expiredProviders]);

  // Run validation on mount
  useEffect(() => {
    validate();
  }, [validate]);

  return {
    ...state,
    validate,
    needsReauth,
    clearExpiredTokens,
  };
}

// ============================================
// Default Export
// ============================================

export default useTokenValidation;
