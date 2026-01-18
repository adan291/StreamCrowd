/**
 * Secure Token Storage Service
 * 
 * Provides secure storage for OAuth tokens with encryption.
 * Access tokens are stored in sessionStorage (encrypted) to prevent XSS attacks.
 * Tokens are NEVER stored in plaintext in localStorage.
 * 
 * Security Properties:
 * - Access tokens encrypted with AES-GCM before storage
 * - Tokens stored in sessionStorage (cleared on tab close)
 * - No plaintext tokens in localStorage
 * - Device-specific encryption key derivation
 * 
 * @module infrastructure/auth/TokenStorage
 * 
 * **Validates: Requirements 3.2, 3.6**
 */

import { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  isEncrypted 
} from '../../application/utils/encryption';

// ============================================
// Types
// ============================================

export interface StoredToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  tokenType: 'Bearer';
  scopes?: string[];
  provider: TokenProvider;
}

export interface TokenMetadata {
  provider: TokenProvider;
  userId?: string;
  username?: string;
  createdAt: number;
  lastUsed: number;
}

export type TokenProvider = 'twitch' | 'youtube' | 'google' | 'streamlabs' | 'streamelements';

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  ACCESS_TOKEN_PREFIX: 'secure_token:',
  TOKEN_METADATA_PREFIX: 'token_meta:',
  ENCRYPTION_KEY: '_ek_v2',
} as const;

// ============================================
// Token Storage Class
// ============================================

/**
 * Secure Token Storage Service
 * 
 * Handles secure storage and retrieval of OAuth tokens.
 * All tokens are encrypted before storage and decrypted on retrieval.
 * 
 * Usage:
 * ```typescript
 * const storage = new TokenStorage();
 * 
 * // Store a token
 * await storage.storeAccessToken({
 *   accessToken: 'oauth_token_here',
 *   expiresAt: Date.now() + 3600000,
 *   tokenType: 'Bearer',
 *   provider: 'twitch'
 * });
 * 
 * // Retrieve a token
 * const token = await storage.getAccessToken('twitch');
 * ```
 * 
 * **Validates: Requirements 3.2, 3.6**
 */
export class TokenStorage {
  /**
   * Store an access token securely.
   * 
   * The token is encrypted using AES-GCM before being stored in sessionStorage.
   * This ensures tokens are never stored in plaintext.
   * 
   * @param token - The token data to store
   * @throws Error if encryption fails
   * 
   * **Validates: Requirements 3.2**
   */
  async storeAccessToken(token: StoredToken): Promise<void> {
    const key = this.getStorageKey(token.provider);
    
    // Encrypt the token data
    const encrypted = await encryptSensitiveData(token);
    
    // Store in sessionStorage (not localStorage) for security
    // sessionStorage is cleared when the tab closes
    sessionStorage.setItem(key, encrypted);
    
    // Store non-sensitive metadata separately
    await this.updateTokenMetadata(token.provider, {
      provider: token.provider,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    });
  }

  /**
   * Retrieve an access token.
   * 
   * The token is decrypted from sessionStorage.
   * Returns null if no token exists or if decryption fails.
   * 
   * @param provider - The OAuth provider
   * @returns The decrypted token or null
   * 
   * **Validates: Requirements 3.2**
   */
  async getAccessToken(provider: TokenProvider): Promise<StoredToken | null> {
    const key = this.getStorageKey(provider);
    const encrypted = sessionStorage.getItem(key);
    
    if (!encrypted) {
      return null;
    }
    
    try {
      // Verify it's actually encrypted
      if (!isEncrypted(encrypted)) {
        // If not encrypted, it's a security risk - clear it
        this.clearToken(provider);
        console.warn(`[TokenStorage] Found unencrypted token for ${provider}, clearing for security`);
        return null;
      }
      
      const token = await decryptSensitiveData<StoredToken>(encrypted);
      
      // Update last used timestamp
      await this.updateTokenMetadata(provider, {
        provider,
        lastUsed: Date.now(),
      });
      
      return token;
    } catch (error) {
      console.error(`[TokenStorage] Failed to decrypt token for ${provider}:`, error);
      // Clear corrupted token
      this.clearToken(provider);
      return null;
    }
  }

  /**
   * Check if a valid (non-expired) token exists.
   * 
   * @param provider - The OAuth provider
   * @returns true if a valid token exists
   */
  async hasValidToken(provider: TokenProvider): Promise<boolean> {
    const token = await this.getAccessToken(provider);
    
    if (!token) {
      return false;
    }
    
    // Check if token is expired
    return token.expiresAt > Date.now();
  }

  /**
   * Check if a token is expired or about to expire.
   * 
   * @param provider - The OAuth provider
   * @param bufferMs - Buffer time in milliseconds (default: 5 minutes)
   * @returns true if token is expired or will expire within buffer time
   */
  async isTokenExpired(provider: TokenProvider, bufferMs: number = 5 * 60 * 1000): Promise<boolean> {
    const token = await this.getAccessToken(provider);
    
    if (!token) {
      return true;
    }
    
    return token.expiresAt <= Date.now() + bufferMs;
  }

  /**
   * Get the time until token expiration.
   * 
   * @param provider - The OAuth provider
   * @returns Time in milliseconds until expiration, or -1 if no token
   */
  async getTimeUntilExpiration(provider: TokenProvider): Promise<number> {
    const token = await this.getAccessToken(provider);
    
    if (!token) {
      return -1;
    }
    
    return Math.max(0, token.expiresAt - Date.now());
  }

  /**
   * Clear a specific token.
   * 
   * @param provider - The OAuth provider
   */
  clearToken(provider: TokenProvider): void {
    const key = this.getStorageKey(provider);
    sessionStorage.removeItem(key);
    
    // Also clear metadata
    const metaKey = this.getMetadataKey(provider);
    sessionStorage.removeItem(metaKey);
  }

  /**
   * Clear all stored tokens.
   */
  clearAllTokens(): void {
    const providers: TokenProvider[] = ['twitch', 'youtube', 'google', 'streamlabs', 'streamelements'];
    
    for (const provider of providers) {
      this.clearToken(provider);
    }
  }

  /**
   * Get token metadata (non-sensitive information).
   * 
   * @param provider - The OAuth provider
   * @returns Token metadata or null
   */
  getTokenMetadata(provider: TokenProvider): TokenMetadata | null {
    const key = this.getMetadataKey(provider);
    const data = sessionStorage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Check if any tokens are stored in plaintext localStorage.
   * This is a security audit function.
   * 
   * @returns Array of keys that contain plaintext tokens (security risk)
   */
  auditPlaintextTokens(): string[] {
    const riskyKeys: string[] = [];
    const tokenPatterns = [
      /token/i,
      /access_token/i,
      /oauth/i,
      /bearer/i,
    ];
    
    // Check localStorage for plaintext tokens
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Check if key name suggests it's a token
      const isTokenKey = tokenPatterns.some(pattern => pattern.test(key));
      
      if (isTokenKey) {
        const value = localStorage.getItem(key);
        
        // If it's not encrypted, it's a security risk
        if (value && !isEncrypted(value)) {
          riskyKeys.push(key);
        }
      }
    }
    
    return riskyKeys;
  }

  /**
   * Migrate legacy plaintext tokens to secure storage.
   * 
   * This function finds plaintext tokens in localStorage and migrates them
   * to encrypted sessionStorage, then removes the plaintext versions.
   * 
   * @returns Number of tokens migrated
   */
  async migrateLegacyTokens(): Promise<number> {
    let migratedCount = 0;
    
    // Known legacy token keys
    const legacyKeys: { key: string; provider: TokenProvider }[] = [
      { key: 'twitch_token', provider: 'twitch' },
      { key: 'youtube_token', provider: 'youtube' },
      { key: 'google_token', provider: 'google' },
    ];
    
    for (const { key, provider } of legacyKeys) {
      const legacyToken = localStorage.getItem(key);
      const legacyExpires = localStorage.getItem(`${key}_expires`);
      
      if (legacyToken && !isEncrypted(legacyToken)) {
        try {
          // Migrate to secure storage
          await this.storeAccessToken({
            accessToken: legacyToken,
            expiresAt: legacyExpires ? parseInt(legacyExpires, 10) : Date.now() + 3600000,
            tokenType: 'Bearer',
            provider,
          });
          
          // Remove legacy plaintext token
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_expires`);
          
          migratedCount++;
          console.log(`[TokenStorage] Migrated legacy ${provider} token to secure storage`);
        } catch (error) {
          console.error(`[TokenStorage] Failed to migrate ${provider} token:`, error);
        }
      }
    }
    
    return migratedCount;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Get the storage key for a provider's token.
   */
  private getStorageKey(provider: TokenProvider): string {
    return `${STORAGE_KEYS.ACCESS_TOKEN_PREFIX}${provider}`;
  }

  /**
   * Get the storage key for a provider's metadata.
   */
  private getMetadataKey(provider: TokenProvider): string {
    return `${STORAGE_KEYS.TOKEN_METADATA_PREFIX}${provider}`;
  }

  /**
   * Update token metadata.
   */
  private async updateTokenMetadata(
    provider: TokenProvider, 
    updates: Partial<TokenMetadata>
  ): Promise<void> {
    const key = this.getMetadataKey(provider);
    const existing = this.getTokenMetadata(provider);
    
    const metadata: TokenMetadata = {
      provider,
      createdAt: existing?.createdAt ?? Date.now(),
      lastUsed: Date.now(),
      ...existing,
      ...updates,
    };
    
    // Metadata is non-sensitive, can be stored as JSON
    sessionStorage.setItem(key, JSON.stringify(metadata));
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Default TokenStorage instance for convenience.
 * 
 * Usage:
 * ```typescript
 * import { tokenStorage } from './TokenStorage';
 * 
 * const token = await tokenStorage.getAccessToken('twitch');
 * ```
 */
export const tokenStorage = new TokenStorage();

// ============================================
// Default Export
// ============================================

export default TokenStorage;
