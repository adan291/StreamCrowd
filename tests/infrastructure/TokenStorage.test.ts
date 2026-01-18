/**
 * Token Storage Tests
 * 
 * Tests for the secure token storage service.
 * Verifies that tokens are encrypted and stored securely.
 * 
 * **Validates: Requirements 3.2, 3.6**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenStorage, StoredToken, TokenProvider } from '../../src/infrastructure/auth/TokenStorage';

// Mock the encryption module
vi.mock('../../src/application/utils/encryption', () => ({
  encryptSensitiveData: vi.fn(async (data: unknown) => {
    // Simulate encryption by prefixing with enc:v1: and base64 encoding
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const base64 = Buffer.from(jsonStr).toString('base64');
    return `enc:v1:${base64}`;
  }),
  decryptSensitiveData: vi.fn(async <T>(encrypted: string): Promise<T> => {
    // Simulate decryption by removing prefix and base64 decoding
    if (!encrypted.startsWith('enc:v1:')) {
      throw new Error('Invalid encrypted data format');
    }
    const base64 = encrypted.slice(7);
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr) as T;
  }),
  isEncrypted: vi.fn((value: string) => {
    return typeof value === 'string' && value.startsWith('enc:v1:');
  }),
}));

// Import the mocked functions for assertions
import { isEncrypted } from '../../src/application/utils/encryption';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
  };
})();

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => { store = newStore; },
  };
})();

// Apply mocks
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('TokenStorage', () => {
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    vi.clearAllMocks();
    tokenStorage = new TokenStorage();
  });

  afterEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
  });

  describe('storeAccessToken', () => {
    it('should store token in sessionStorage (not localStorage)', async () => {
      const token: StoredToken = {
        accessToken: 'test_access_token_12345',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);

      // Should be stored in sessionStorage
      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      
      // Should NOT be stored in localStorage
      const localStorageStore = mockLocalStorage._getStore();
      const hasPlaintextToken = Object.values(localStorageStore).some(
        value => value.includes('test_access_token_12345')
      );
      expect(hasPlaintextToken).toBe(false);
    });

    it('should encrypt the token before storage', async () => {
      const token: StoredToken = {
        accessToken: 'secret_token_value',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);

      // Get the stored value
      const storedValue = mockSessionStorage._getStore()['secure_token:twitch'];
      
      // Should be encrypted (starts with enc:v1:)
      expect(storedValue).toBeDefined();
      expect(isEncrypted(storedValue)).toBe(true);
      
      // Should NOT contain plaintext token (it's base64 encoded)
      expect(storedValue).not.toBe('secret_token_value');
    });

    it('should store metadata separately', async () => {
      const token: StoredToken = {
        accessToken: 'test_token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'youtube',
      };

      await tokenStorage.storeAccessToken(token);

      // Check metadata was stored
      const metadataKey = 'token_meta:youtube';
      const metadata = mockSessionStorage._getStore()[metadataKey];
      expect(metadata).toBeDefined();
      
      const parsedMetadata = JSON.parse(metadata);
      expect(parsedMetadata.provider).toBe('youtube');
      expect(parsedMetadata.createdAt).toBeDefined();
    });
  });

  describe('getAccessToken', () => {
    it('should retrieve and decrypt stored token', async () => {
      const originalToken: StoredToken = {
        accessToken: 'my_secret_token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
        scopes: ['chat:read', 'chat:edit'],
      };

      await tokenStorage.storeAccessToken(originalToken);
      const retrieved = await tokenStorage.getAccessToken('twitch');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe('my_secret_token');
      expect(retrieved?.tokenType).toBe('Bearer');
      expect(retrieved?.provider).toBe('twitch');
      expect(retrieved?.scopes).toEqual(['chat:read', 'chat:edit']);
    });

    it('should return null for non-existent token', async () => {
      const token = await tokenStorage.getAccessToken('google');
      expect(token).toBeNull();
    });

    it('should clear unencrypted tokens for security', async () => {
      // Manually set an unencrypted token (simulating legacy data)
      mockSessionStorage._getStore()['secure_token:twitch'] = JSON.stringify({
        accessToken: 'plaintext_token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
      });

      const token = await tokenStorage.getAccessToken('twitch');
      
      // Should return null (cleared for security)
      expect(token).toBeNull();
      
      // Should have been removed
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('secure_token:twitch');
    });
  });

  describe('hasValidToken', () => {
    it('should return true for valid non-expired token', async () => {
      const token: StoredToken = {
        accessToken: 'valid_token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      const isValid = await tokenStorage.hasValidToken('twitch');

      expect(isValid).toBe(true);
    });

    it('should return false for expired token', async () => {
      const token: StoredToken = {
        accessToken: 'expired_token',
        expiresAt: Date.now() - 1000, // 1 second ago
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      const isValid = await tokenStorage.hasValidToken('twitch');

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent token', async () => {
      const isValid = await tokenStorage.hasValidToken('youtube');
      expect(isValid).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for token expiring after buffer', async () => {
      const token: StoredToken = {
        accessToken: 'fresh_token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      const isExpired = await tokenStorage.isTokenExpired('twitch');

      expect(isExpired).toBe(false);
    });

    it('should return true for token expiring within buffer', async () => {
      const token: StoredToken = {
        accessToken: 'expiring_soon_token',
        expiresAt: Date.now() + 60000, // 1 minute from now
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      // Default buffer is 5 minutes
      const isExpired = await tokenStorage.isTokenExpired('twitch');

      expect(isExpired).toBe(true);
    });

    it('should return true for non-existent token', async () => {
      const isExpired = await tokenStorage.isTokenExpired('google');
      expect(isExpired).toBe(true);
    });
  });

  describe('clearToken', () => {
    it('should remove token and metadata', async () => {
      const token: StoredToken = {
        accessToken: 'token_to_clear',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      tokenStorage.clearToken('twitch');

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('secure_token:twitch');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token_meta:twitch');
    });
  });

  describe('clearAllTokens', () => {
    it('should clear all provider tokens', async () => {
      const providers: TokenProvider[] = ['twitch', 'youtube', 'google'];
      
      for (const provider of providers) {
        await tokenStorage.storeAccessToken({
          accessToken: `token_${provider}`,
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer',
          provider,
        });
      }

      tokenStorage.clearAllTokens();

      for (const provider of providers) {
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(`secure_token:${provider}`);
      }
    });
  });

  describe('auditPlaintextTokens', () => {
    it('should detect plaintext tokens in localStorage', () => {
      // Set up plaintext tokens in localStorage
      mockLocalStorage._setStore({
        'twitch_token': 'plaintext_token_value',
        'some_other_key': 'not_a_token',
        'oauth_token': 'another_plaintext_token',
      });

      const riskyKeys = tokenStorage.auditPlaintextTokens();

      expect(riskyKeys).toContain('twitch_token');
      expect(riskyKeys).toContain('oauth_token');
      expect(riskyKeys).not.toContain('some_other_key');
    });

    it('should not flag encrypted tokens', () => {
      // Set up encrypted token in localStorage
      mockLocalStorage._setStore({
        'twitch_token': 'enc:v1:encrypted_data_here',
      });

      const riskyKeys = tokenStorage.auditPlaintextTokens();

      expect(riskyKeys).not.toContain('twitch_token');
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return correct time until expiration', async () => {
      const expiresIn = 3600000; // 1 hour
      const token: StoredToken = {
        accessToken: 'test_token',
        expiresAt: Date.now() + expiresIn,
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      const timeUntil = await tokenStorage.getTimeUntilExpiration('twitch');

      // Should be approximately 1 hour (allow some tolerance for test execution time)
      expect(timeUntil).toBeGreaterThan(expiresIn - 1000);
      expect(timeUntil).toBeLessThanOrEqual(expiresIn);
    });

    it('should return -1 for non-existent token', async () => {
      const timeUntil = await tokenStorage.getTimeUntilExpiration('google');
      expect(timeUntil).toBe(-1);
    });
  });

  describe('getTokenMetadata', () => {
    it('should return metadata for stored token', async () => {
      const token: StoredToken = {
        accessToken: 'test_token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        provider: 'twitch',
      };

      await tokenStorage.storeAccessToken(token);
      const metadata = tokenStorage.getTokenMetadata('twitch');

      expect(metadata).not.toBeNull();
      expect(metadata?.provider).toBe('twitch');
      expect(metadata?.createdAt).toBeDefined();
      expect(metadata?.lastUsed).toBeDefined();
    });

    it('should return null for non-existent metadata', () => {
      const metadata = tokenStorage.getTokenMetadata('youtube');
      expect(metadata).toBeNull();
    });
  });
});

describe('TokenStorage Security Properties', () => {
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    vi.clearAllMocks();
    tokenStorage = new TokenStorage();
  });

  it('SECURITY: tokens should never be stored in plaintext localStorage', async () => {
    const sensitiveToken = 'super_secret_oauth_token_12345';
    
    await tokenStorage.storeAccessToken({
      accessToken: sensitiveToken,
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
      provider: 'twitch',
    });

    // Check all localStorage values
    const localStorageStore = mockLocalStorage._getStore();
    for (const value of Object.values(localStorageStore)) {
      expect(value).not.toContain(sensitiveToken);
    }
  });

  it('SECURITY: stored tokens should be encrypted', async () => {
    await tokenStorage.storeAccessToken({
      accessToken: 'plaintext_should_not_appear',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
      provider: 'twitch',
    });

    const sessionStorageStore = mockSessionStorage._getStore();
    const tokenKey = 'secure_token:twitch';
    const storedValue = sessionStorageStore[tokenKey];

    // Should be encrypted
    expect(isEncrypted(storedValue)).toBe(true);
    
    // Plaintext should not appear directly (it's encoded)
    expect(storedValue.startsWith('enc:v1:')).toBe(true);
  });

  it('SECURITY: should use sessionStorage not localStorage for tokens', async () => {
    await tokenStorage.storeAccessToken({
      accessToken: 'test_token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
      provider: 'twitch',
    });

    // sessionStorage should have the token
    expect(mockSessionStorage.setItem).toHaveBeenCalled();
    
    // localStorage should NOT have the token key
    const localStorageStore = mockLocalStorage._getStore();
    expect(localStorageStore['secure_token:twitch']).toBeUndefined();
  });
});
