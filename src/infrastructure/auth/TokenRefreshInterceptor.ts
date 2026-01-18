/**
 * Token Refresh Interceptor
 * 
 * Provides automatic token refresh functionality before API calls.
 * Intercepts requests and ensures tokens are valid before proceeding.
 * 
 * Security Properties:
 * - Automatically refreshes expired tokens before API calls
 * - Handles refresh failures gracefully
 * - Redirects to login if refresh fails
 * - Prevents concurrent refresh attempts (token refresh lock)
 * 
 * @module infrastructure/auth/TokenRefreshInterceptor
 * 
 * **Validates: Requirements 3.4, 3.5**
 */

import { tokenStorage, TokenProvider, StoredToken } from './TokenStorage';

// ============================================
// Types
// ============================================

export interface TokenRefreshResult {
  success: boolean;
  token?: StoredToken;
  error?: string;
  requiresReauth?: boolean;
}

export interface RefreshConfig {
  /** Buffer time in ms before expiration to trigger refresh (default: 5 minutes) */
  refreshBuffer?: number;
  /** Maximum time to wait for refresh lock (default: 10 seconds) */
  lockTimeout?: number;
  /** Callback when re-authentication is required */
  onRequireReauth?: (provider: TokenProvider) => void;
  /** Callback when refresh succeeds */
  onRefreshSuccess?: (provider: TokenProvider) => void;
  /** Callback when refresh fails */
  onRefreshFailed?: (provider: TokenProvider, error: string) => void;
}

export type TokenRefreshHandler = (
  provider: TokenProvider,
  currentToken: StoredToken
) => Promise<StoredToken | null>;

// ============================================
// Constants
// ============================================

const DEFAULT_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
const DEFAULT_LOCK_TIMEOUT = 10 * 1000; // 10 seconds

// ============================================
// Token Refresh Interceptor Class
// ============================================

/**
 * Token Refresh Interceptor
 * 
 * Manages automatic token refresh before API calls.
 * Ensures tokens are valid and handles refresh failures gracefully.
 * 
 * Usage:
 * ```typescript
 * const interceptor = new TokenRefreshInterceptor({
 *   onRequireReauth: (provider) => {
 *     // Redirect to login
 *     window.location.href = `/auth/${provider}`;
 *   }
 * });
 * 
 * // Register a refresh handler for a provider
 * interceptor.registerRefreshHandler('twitch', async (provider, token) => {
 *   // Call refresh endpoint
 *   const newToken = await refreshTwitchToken(token);
 *   return newToken;
 * });
 * 
 * // Before making an API call
 * const result = await interceptor.ensureValidToken('twitch');
 * if (result.success) {
 *   // Make API call with result.token
 * }
 * ```
 * 
 * **Validates: Requirements 3.4, 3.5**
 */
export class TokenRefreshInterceptor {
  private config: Required<RefreshConfig>;
  private refreshHandlers = new Map<TokenProvider, TokenRefreshHandler>();
  private refreshLocks = new Map<TokenProvider, Promise<TokenRefreshResult>>();
  private refreshInProgress = new Map<TokenProvider, boolean>();

  constructor(config: RefreshConfig = {}) {
    this.config = {
      refreshBuffer: config.refreshBuffer ?? DEFAULT_REFRESH_BUFFER,
      lockTimeout: config.lockTimeout ?? DEFAULT_LOCK_TIMEOUT,
      onRequireReauth: config.onRequireReauth ?? (() => {}),
      onRefreshSuccess: config.onRefreshSuccess ?? (() => {}),
      onRefreshFailed: config.onRefreshFailed ?? (() => {}),
    };
  }

  /**
   * Register a token refresh handler for a provider.
   * 
   * The handler is called when a token needs to be refreshed.
   * It should return the new token or null if refresh failed.
   * 
   * @param provider - The OAuth provider
   * @param handler - Function to refresh the token
   */
  registerRefreshHandler(provider: TokenProvider, handler: TokenRefreshHandler): void {
    this.refreshHandlers.set(provider, handler);
  }

  /**
   * Unregister a token refresh handler.
   * 
   * @param provider - The OAuth provider
   */
  unregisterRefreshHandler(provider: TokenProvider): void {
    this.refreshHandlers.delete(provider);
  }

  /**
   * Ensure a valid token exists for the provider.
   * 
   * This method checks if the token is expired or about to expire,
   * and automatically refreshes it if needed.
   * 
   * @param provider - The OAuth provider
   * @returns Result with success status and token if available
   * 
   * **Validates: Requirements 3.4**
   */
  async ensureValidToken(provider: TokenProvider): Promise<TokenRefreshResult> {
    // Check if token exists
    const token = await tokenStorage.getAccessToken(provider);
    
    if (!token) {
      return {
        success: false,
        error: 'No token found',
        requiresReauth: true,
      };
    }

    // Check if token is expired or about to expire
    const isExpired = await tokenStorage.isTokenExpired(provider, this.config.refreshBuffer);
    
    if (!isExpired) {
      // Token is valid, return it
      return {
        success: true,
        token,
      };
    }

    // Token needs refresh
    return this.refreshToken(provider, token);
  }

  /**
   * Refresh a token for the provider.
   * 
   * Uses a lock to prevent concurrent refresh attempts.
   * If a refresh is already in progress, waits for it to complete.
   * 
   * @param provider - The OAuth provider
   * @param currentToken - The current (expired) token
   * @returns Result with success status and new token if available
   * 
   * **Validates: Requirements 3.4, 3.5**
   */
  async refreshToken(
    provider: TokenProvider,
    currentToken: StoredToken
  ): Promise<TokenRefreshResult> {
    // Check if refresh is already in progress
    if (this.refreshInProgress.get(provider)) {
      // Wait for existing refresh to complete
      const existingRefresh = this.refreshLocks.get(provider);
      if (existingRefresh) {
        return existingRefresh;
      }
    }

    // Start new refresh
    this.refreshInProgress.set(provider, true);
    
    const refreshPromise = this.executeRefresh(provider, currentToken);
    this.refreshLocks.set(provider, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshInProgress.set(provider, false);
      this.refreshLocks.delete(provider);
    }
  }

  /**
   * Execute the actual token refresh.
   * 
   * @param provider - The OAuth provider
   * @param currentToken - The current (expired) token
   * @returns Result with success status and new token if available
   */
  private async executeRefresh(
    provider: TokenProvider,
    currentToken: StoredToken
  ): Promise<TokenRefreshResult> {
    const handler = this.refreshHandlers.get(provider);
    
    if (!handler) {
      // No refresh handler registered - require re-authentication
      console.warn(`[TokenRefreshInterceptor] No refresh handler for ${provider}, requiring re-auth`);
      this.config.onRequireReauth(provider);
      return {
        success: false,
        error: 'No refresh handler registered',
        requiresReauth: true,
      };
    }

    try {
      console.log(`[TokenRefreshInterceptor] Refreshing token for ${provider}`);
      
      // Execute refresh with timeout
      const newToken = await Promise.race([
        handler(provider, currentToken),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Refresh timeout')), this.config.lockTimeout)
        ),
      ]);

      if (!newToken) {
        // Refresh failed - require re-authentication
        console.warn(`[TokenRefreshInterceptor] Refresh failed for ${provider}, requiring re-auth`);
        this.config.onRefreshFailed(provider, 'Refresh returned null');
        this.config.onRequireReauth(provider);
        return {
          success: false,
          error: 'Token refresh failed',
          requiresReauth: true,
        };
      }

      // Store the new token
      await tokenStorage.storeAccessToken(newToken);
      
      console.log(`[TokenRefreshInterceptor] Token refreshed successfully for ${provider}`);
      this.config.onRefreshSuccess(provider);
      
      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TokenRefreshInterceptor] Error refreshing token for ${provider}:`, error);
      
      this.config.onRefreshFailed(provider, errorMessage);
      this.config.onRequireReauth(provider);
      
      return {
        success: false,
        error: errorMessage,
        requiresReauth: true,
      };
    }
  }

  /**
   * Check if a token needs refresh.
   * 
   * @param provider - The OAuth provider
   * @returns true if token is expired or about to expire
   */
  async needsRefresh(provider: TokenProvider): Promise<boolean> {
    return tokenStorage.isTokenExpired(provider, this.config.refreshBuffer);
  }

  /**
   * Check if a refresh is currently in progress.
   * 
   * @param provider - The OAuth provider
   * @returns true if refresh is in progress
   */
  isRefreshing(provider: TokenProvider): boolean {
    return this.refreshInProgress.get(provider) ?? false;
  }

  /**
   * Update configuration.
   * 
   * @param config - New configuration values
   */
  updateConfig(config: Partial<RefreshConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      onRequireReauth: config.onRequireReauth ?? this.config.onRequireReauth,
      onRefreshSuccess: config.onRefreshSuccess ?? this.config.onRefreshSuccess,
      onRefreshFailed: config.onRefreshFailed ?? this.config.onRefreshFailed,
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): Required<RefreshConfig> {
    return { ...this.config };
  }

  /**
   * Clear all refresh handlers and locks.
   */
  clear(): void {
    this.refreshHandlers.clear();
    this.refreshLocks.clear();
    this.refreshInProgress.clear();
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Default TokenRefreshInterceptor instance for convenience.
 * 
 * Usage:
 * ```typescript
 * import { tokenRefreshInterceptor } from './TokenRefreshInterceptor';
 * 
 * const result = await tokenRefreshInterceptor.ensureValidToken('twitch');
 * ```
 */
export const tokenRefreshInterceptor = new TokenRefreshInterceptor();

// ============================================
// Default Export
// ============================================

export default TokenRefreshInterceptor;
