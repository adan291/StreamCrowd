/**
 * Integration tests for Twitch OAuth PKCE flow
 * 
 * Tests the integration of PKCE with TwitchAdapter OAuth methods.
 * 
 * **Validates: Requirements 2.3, 2.4, 2.6**
 * 
 * @module tests/infrastructure/TwitchPkceIntegration.test
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TwitchAdapter } from '../../src/infrastructure/adapters/TwitchAdapter';
import { PkceFlow, isValidCodeChallenge } from '../../src/infrastructure/auth/PkceFlow';

// ============================================
// Mock Web Crypto API for Node.js environment
// ============================================

const mockSubtle = {
  digest: vi.fn().mockImplementation(async (_algorithm: string, data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    const hash = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) {
      hash[i % 32] = (hash[i % 32] + bytes[i]) % 256;
    }
    return hash.buffer;
  }),
};

const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: <T extends ArrayBufferView>(array: T): T => {
    const bytes = array as unknown as Uint8Array;
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};

beforeAll(() => {
  vi.stubGlobal('crypto', mockCrypto);
});

// ============================================
// Tests
// ============================================

describe('TwitchAdapter PKCE Integration', () => {
  describe('buildAuthUrl with PKCE', () => {
    it('should build auth URL with PKCE parameters when challenge is provided', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      const state = 'test-state-123';
      const redirectUri = 'https://example.com/callback';
      
      const url = TwitchAdapter.buildAuthUrl(state, redirectUri, challenge);
      const urlObj = new URL(url);
      
      // Verify PKCE parameters are present
      expect(urlObj.searchParams.get('code_challenge')).toBe(challenge.codeChallenge);
      expect(urlObj.searchParams.get('code_challenge_method')).toBe('S256');
      expect(urlObj.searchParams.get('response_type')).toBe('code');
    });
    
    it('should build auth URL without PKCE parameters when no challenge is provided', () => {
      const state = 'test-state-123';
      const redirectUri = 'https://example.com/callback';
      
      const url = TwitchAdapter.buildAuthUrl(state, redirectUri);
      const urlObj = new URL(url);
      
      // Verify PKCE parameters are NOT present
      expect(urlObj.searchParams.get('code_challenge')).toBeNull();
      expect(urlObj.searchParams.get('code_challenge_method')).toBeNull();
      expect(urlObj.searchParams.get('response_type')).toBe('token');
    });
    
    it('should include all required OAuth parameters with PKCE', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      const state = 'test-state-123';
      const redirectUri = 'https://example.com/callback';
      
      const url = TwitchAdapter.buildAuthUrl(state, redirectUri, challenge);
      const urlObj = new URL(url);
      
      // Verify all required parameters
      expect(urlObj.searchParams.get('client_id')).toBeTruthy();
      expect(urlObj.searchParams.get('redirect_uri')).toBe(redirectUri);
      expect(urlObj.searchParams.get('state')).toBe(state);
      expect(urlObj.searchParams.get('scope')).toBeTruthy();
      expect(urlObj.searchParams.get('force_verify')).toBe('false');
    });
    
    it('should use correct Twitch authorization endpoint', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      const url = TwitchAdapter.buildAuthUrl('state', 'https://example.com/callback', challenge);
      
      expect(url.startsWith('https://id.twitch.tv/oauth2/authorize')).toBe(true);
    });
  });
  
  describe('createPkceFlow', () => {
    it('should create a new PkceFlow instance', () => {
      const pkce = TwitchAdapter.createPkceFlow();
      
      expect(pkce).toBeInstanceOf(PkceFlow);
      expect(pkce.hasCodeVerifier()).toBe(false);
    });
    
    it('should create independent PkceFlow instances', async () => {
      const pkce1 = TwitchAdapter.createPkceFlow();
      const pkce2 = TwitchAdapter.createPkceFlow();
      
      const challenge1 = await pkce1.generateChallenge();
      const challenge2 = await pkce2.generateChallenge();
      
      expect(challenge1.codeVerifier).not.toBe(challenge2.codeVerifier);
      expect(challenge1.codeChallenge).not.toBe(challenge2.codeChallenge);
    });
  });
  
  describe('PKCE flow end-to-end', () => {
    it('should generate valid PKCE challenge for Twitch OAuth', async () => {
      const pkce = TwitchAdapter.createPkceFlow();
      const challenge = await pkce.generateChallenge();
      
      // Verify challenge is valid
      expect(challenge.codeVerifier.length).toBe(128);
      expect(isValidCodeChallenge(challenge.codeChallenge)).toBe(true);
      expect(challenge.codeChallengeMethod).toBe('S256');
    });
    
    it('should preserve code verifier for token exchange', async () => {
      const pkce = TwitchAdapter.createPkceFlow();
      const challenge = await pkce.generateChallenge();
      
      // Simulate storing the verifier during auth flow
      const storedVerifier = pkce.getCodeVerifier();
      
      // Verify verifier matches
      expect(storedVerifier).toBe(challenge.codeVerifier);
    });
    
    it('should clear PKCE state after use', async () => {
      const pkce = TwitchAdapter.createPkceFlow();
      await pkce.generateChallenge();
      
      expect(pkce.hasCodeVerifier()).toBe(true);
      
      pkce.clear();
      
      expect(pkce.hasCodeVerifier()).toBe(false);
    });
  });
  
  describe('getRequiredScopes', () => {
    it('should return array of required scopes', () => {
      const scopes = TwitchAdapter.getRequiredScopes();
      
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
    });
    
    it('should include essential chat scopes', () => {
      const scopes = TwitchAdapter.getRequiredScopes();
      
      expect(scopes).toContain('chat:read');
      expect(scopes).toContain('chat:edit');
    });
  });
});

describe('TwitchAdapter.exchangeCodeForTokens', () => {
  it('should be a static method', () => {
    expect(typeof TwitchAdapter.exchangeCodeForTokens).toBe('function');
  });
  
  // Note: Actual token exchange tests would require mocking fetch
  // and are better suited for integration tests with a test server
});
