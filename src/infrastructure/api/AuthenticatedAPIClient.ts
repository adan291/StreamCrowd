/**
 * Authenticated API Client
 * 
 * Extends RetryableAPIClient with automatic token refresh functionality.
 * Ensures tokens are valid before making API calls and handles 401 responses.
 * 
 * Security Properties:
 * - Automatically refreshes expired tokens before API calls
 * - Handles 401 responses by triggering token refresh
 * - Redirects to login if refresh fails
 * 
 * @module infrastructure/api/AuthenticatedAPIClient
 * 
 * **Validates: Requirements 3.4, 3.5**
 */

import { RetryableAPIClient, RetryableAPIClientConfig } from './RetryableAPIClient';
import { tokenRefreshInterceptor, TokenRefreshResult } from '../auth/TokenRefreshInterceptor';
import { tokenStorage, TokenProvider } from '../auth/TokenStorage';
import { logService } from '../logging/LogService';

// ============================================
// Types
// ============================================

export interface AuthenticatedAPIClientConfig extends RetryableAPIClientConfig {
  /** OAuth provider for token management */
  provider: TokenProvider;
  /** Callback when re-authentication is required */
  onRequireReauth?: (provider: TokenProvider) => void;
  /** Whether to automatically add Authorization header */
  autoAddAuthHeader?: boolean;
}

// ============================================
// Authenticated API Client Class
// ============================================

/**
 * Authenticated API Client
 * 
 * Wraps HTTP requests with automatic token refresh and authentication.
 * 
 * Usage:
 * ```typescript
 * const client = new AuthenticatedAPIClient({
 *   provider: 'twitch',
 *   onRequireReauth: (provider) => {
 *     // Redirect to login
 *     window.location.href = `/auth/${provider}`;
 *   }
 * });
 * 
 * // Make authenticated request
 * const data = await client.get('/api/user');
 * ```
 * 
 * **Validates: Requirements 3.4, 3.5**
 */
export class AuthenticatedAPIClient extends RetryableAPIClient {
  private provider: TokenProvider;
  private onRequireReauth?: (provider: TokenProvider) => void;
  private autoAddAuthHeader: boolean;

  constructor(config: AuthenticatedAPIClientConfig) {
    super(config);
    this.provider = config.provider;
    this.onRequireReauth = config.onRequireReauth;
    this.autoAddAuthHeader = config.autoAddAuthHeader ?? true;
  }

  /**
   * Make a GET request with automatic token refresh.
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response data
   * @throws Error if request fails after retries
   * 
   * **Validates: Requirements 3.4**
   */
  async get<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.authenticatedRequest<T>(() => super.get<T>(url, options), options);
  }

  /**
   * Make a POST request with automatic token refresh.
   * 
   * @param url - URL to fetch
   * @param body - Request body
   * @param options - Fetch options
   * @returns Response data
   * @throws Error if request fails after retries
   */
  async post<T>(url: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    return this.authenticatedRequest<T>(() => super.post<T>(url, body, options), options);
  }

  /**
   * Make a PUT request with automatic token refresh.
   * 
   * @param url - URL to fetch
   * @param body - Request body
   * @param options - Fetch options
   * @returns Response data
   * @throws Error if request fails after retries
   */
  async put<T>(url: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    return this.authenticatedRequest<T>(() => super.put<T>(url, body, options), options);
  }

  /**
   * Make a DELETE request with automatic token refresh.
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response data
   * @throws Error if request fails after retries
   */
  async delete<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.authenticatedRequest<T>(() => super.delete<T>(url, options), options);
  }

  /**
   * Execute an authenticated request with automatic token refresh.
   * 
   * @param requestFn - Function that makes the actual request
   * @param options - Original request options
   * @returns Response data
   * 
   * **Validates: Requirements 3.4, 3.5**
   */
  private async authenticatedRequest<T>(
    requestFn: () => Promise<T>,
    options: RequestInit
  ): Promise<T> {
    // Ensure valid token before making request
    const tokenResult = await this.ensureValidToken();
    
    if (!tokenResult.success) {
      if (tokenResult.requiresReauth) {
        this.handleRequireReauth();
      }
      throw new Error(tokenResult.error || 'Failed to obtain valid token');
    }

    // Add authorization header if configured
    if (this.autoAddAuthHeader && tokenResult.token) {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${tokenResult.token.accessToken}`);
      options.headers = headers;
    }

    try {
      return await requestFn();
    } catch (error) {
      // Check if error is a 401 Unauthorized
      if (this.isUnauthorizedError(error)) {
        logService.warn(`[AuthenticatedAPIClient] Received 401, attempting token refresh for ${this.provider}`);
        
        // Try to refresh token and retry
        const refreshResult = await this.refreshAndRetry(requestFn, options);
        if (refreshResult !== null) {
          return refreshResult;
        }
        
        // Refresh failed, require re-auth
        this.handleRequireReauth();
      }
      
      throw error;
    }
  }

  /**
   * Ensure a valid token exists.
   * 
   * @returns Token refresh result
   */
  private async ensureValidToken(): Promise<TokenRefreshResult> {
    return tokenRefreshInterceptor.ensureValidToken(this.provider);
  }

  /**
   * Refresh token and retry the request.
   * 
   * @param requestFn - Function that makes the actual request
   * @param options - Original request options
   * @returns Response data or null if refresh failed
   * 
   * **Validates: Requirements 3.4, 3.5**
   */
  private async refreshAndRetry<T>(
    requestFn: () => Promise<T>,
    options: RequestInit
  ): Promise<T | null> {
    try {
      // Get current token
      const currentToken = await tokenStorage.getAccessToken(this.provider);
      
      if (!currentToken) {
        return null;
      }

      // Attempt refresh
      const refreshResult = await tokenRefreshInterceptor.refreshToken(this.provider, currentToken);
      
      if (!refreshResult.success || !refreshResult.token) {
        return null;
      }

      // Update authorization header with new token
      if (this.autoAddAuthHeader) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${refreshResult.token.accessToken}`);
        options.headers = headers;
      }

      // Retry the request
      return await requestFn();
    } catch (error) {
      logService.error({
        message: `[AuthenticatedAPIClient] Token refresh and retry failed for ${this.provider}`,
        context: { error: error instanceof Error ? error.message : String(error) }
      });
      return null;
    }
  }

  /**
   * Check if an error is a 401 Unauthorized error.
   * 
   * @param error - Error to check
   * @returns true if error is 401 Unauthorized
   */
  private isUnauthorizedError(error: unknown): boolean {
    if (error instanceof Error) {
      // Check for common 401 error patterns
      const message = error.message.toLowerCase();
      return (
        message.includes('401') ||
        message.includes('unauthorized') ||
        message.includes('authentication required')
      );
    }
    return false;
  }

  /**
   * Handle re-authentication requirement.
   * 
   * **Validates: Requirements 3.5**
   */
  private handleRequireReauth(): void {
    logService.warn(`[AuthenticatedAPIClient] Re-authentication required for ${this.provider}`);
    
    // Clear the invalid token
    tokenStorage.clearToken(this.provider);
    
    // Notify callback
    if (this.onRequireReauth) {
      this.onRequireReauth(this.provider);
    }
  }

  /**
   * Get the current provider.
   */
  getProvider(): TokenProvider {
    return this.provider;
  }

  /**
   * Update the re-auth callback.
   * 
   * @param callback - New callback function
   */
  setOnRequireReauth(callback: (provider: TokenProvider) => void): void {
    this.onRequireReauth = callback;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create an authenticated API client for Twitch.
 * 
 * @param config - Optional configuration
 * @returns AuthenticatedAPIClient configured for Twitch
 */
export function createTwitchAPIClient(
  config: Partial<AuthenticatedAPIClientConfig> = {}
): AuthenticatedAPIClient {
  return new AuthenticatedAPIClient({
    provider: 'twitch',
    ...config,
  });
}

/**
 * Create an authenticated API client for YouTube.
 * 
 * @param config - Optional configuration
 * @returns AuthenticatedAPIClient configured for YouTube
 */
export function createYouTubeAPIClient(
  config: Partial<AuthenticatedAPIClientConfig> = {}
): AuthenticatedAPIClient {
  return new AuthenticatedAPIClient({
    provider: 'youtube',
    ...config,
  });
}

// ============================================
// Default Export
// ============================================

export default AuthenticatedAPIClient;
