/**
 * Integration tests for YouTubeAdapter PKCE support
 * 
 * Tests that PKCE flow is properly integrated with YouTube OAuth.
 * 
 * **Validates: Requirements 2.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeAdapter } from '../../src/infrastructure/adapters/YouTubeAdapter';
import { PkceFlow } from '../../src/infrastructure/auth/PkceFlow';

describe('YouTubeAdapter PKCE Integration', () => {
  const mockClientId = 'test-client-id';
  const mockRedirectUri = 'http://localhost:3000/callback';
  const mockState = 'test-state-123';
  
  describe('buildAuthUrl with PKCE', () => {
    it('should build auth URL without PKCE when no challenge provided', () => {
      const url = YouTubeAdapter.buildAuthUrl(mockClientId, mockRedirectUri, mockState);
      
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=${mockClientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockRedirectUri)}`);
      expect(url).toContain(`state=${mockState}`);
      expect(url).toContain('response_type=code');
      expect(url).not.toContain('code_challenge');
      expect(url).not.toContain('code_challenge_method');
    });
    
    it('should build auth URL with PKCE when challenge provided', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      const url = YouTubeAdapter.buildAuthUrl(mockClientId, mockRedirectUri, mockState, challenge);
      
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=${mockClientId}`);
      expect(url).toContain(`code_challenge=${challenge.codeChallenge}`);
      expect(url).toContain('code_challenge_method=S256');
    });
    
    it('should include required YouTube scopes', () => {
      const url = YouTubeAdapter.buildAuthUrl(mockClientId, mockRedirectUri, mockState);
      
      expect(url).toContain('youtube.readonly');
      expect(url).toContain('youtube.force-ssl');
    });
    
    it('should request offline access for refresh tokens', () => {
      const url = YouTubeAdapter.buildAuthUrl(mockClientId, mockRedirectUri, mockState);
      
      expect(url).toContain('access_type=offline');
    });
  });
  
  describe('createPkceFlow', () => {
    it('should create a new PkceFlow instance', () => {
      const pkce = YouTubeAdapter.createPkceFlow();
      
      expect(pkce).toBeInstanceOf(PkceFlow);
    });
    
    it('should create independent PkceFlow instances', async () => {
      const pkce1 = YouTubeAdapter.createPkceFlow();
      const pkce2 = YouTubeAdapter.createPkceFlow();
      
      const challenge1 = await pkce1.generateChallenge();
      const challenge2 = await pkce2.generateChallenge();
      
      expect(challenge1.codeVerifier).not.toBe(challenge2.codeVerifier);
      expect(challenge1.codeChallenge).not.toBe(challenge2.codeChallenge);
    });
  });
  
  describe('generateOAuthState', () => {
    it('should generate a random state string', () => {
      const state1 = YouTubeAdapter.generateOAuthState();
      const state2 = YouTubeAdapter.generateOAuthState();
      
      expect(state1).toBeDefined();
      expect(state1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(state1).not.toBe(state2);
    });
    
    it('should generate hex-encoded state', () => {
      const state = YouTubeAdapter.generateOAuthState();
      
      expect(state).toMatch(/^[0-9a-f]+$/);
    });
  });
  
  describe('exchangeCodeForTokensWithPkce', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    
    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
    });
    
    afterEach(() => {
      fetchSpy.mockRestore();
    });
    
    it('should include code_verifier in token exchange request', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      await YouTubeAdapter.exchangeCodeForTokensWithPkce(
        'test-code',
        mockClientId,
        challenge.codeVerifier,
        mockRedirectUri
      );
      
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      
      // Verify the body contains code_verifier
      const callArgs = fetchSpy.mock.calls[0];
      const body = callArgs[1]?.body as URLSearchParams;
      expect(body.get('code_verifier')).toBe(challenge.codeVerifier);
      expect(body.get('code')).toBe('test-code');
      expect(body.get('client_id')).toBe(mockClientId);
      expect(body.get('redirect_uri')).toBe(mockRedirectUri);
      expect(body.get('grant_type')).toBe('authorization_code');
    });
    
    it('should include client_secret when provided', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      await YouTubeAdapter.exchangeCodeForTokensWithPkce(
        'test-code',
        mockClientId,
        challenge.codeVerifier,
        mockRedirectUri,
        'test-client-secret'
      );
      
      const callArgs = fetchSpy.mock.calls[0];
      const body = callArgs[1]?.body as URLSearchParams;
      expect(body.get('client_secret')).toBe('test-client-secret');
    });
    
    it('should not include client_secret when not provided', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      await YouTubeAdapter.exchangeCodeForTokensWithPkce(
        'test-code',
        mockClientId,
        challenge.codeVerifier,
        mockRedirectUri
      );
      
      const callArgs = fetchSpy.mock.calls[0];
      const body = callArgs[1]?.body as URLSearchParams;
      expect(body.get('client_secret')).toBeNull();
    });
    
    it('should return token response on success', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };
      
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      const result = await YouTubeAdapter.exchangeCodeForTokensWithPkce(
        'test-code',
        mockClientId,
        challenge.codeVerifier,
        mockRedirectUri
      );
      
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
    });
    
    it('should throw error on failed token exchange', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error_description: 'Invalid code verifier' }),
      } as Response);
      
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      await expect(
        YouTubeAdapter.exchangeCodeForTokensWithPkce(
          'invalid-code',
          mockClientId,
          challenge.codeVerifier,
          mockRedirectUri
        )
      ).rejects.toThrow('Failed to exchange code for tokens');
    });
  });
  
  describe('PKCE flow end-to-end', () => {
    it('should support complete PKCE OAuth flow', async () => {
      // Step 1: Create PKCE flow
      const pkce = YouTubeAdapter.createPkceFlow();
      const challenge = await pkce.generateChallenge();
      
      // Verify challenge properties
      expect(challenge.codeVerifier.length).toBe(128);
      expect(challenge.codeChallenge.length).toBe(43);
      expect(challenge.codeChallengeMethod).toBe('S256');
      
      // Step 2: Build auth URL with PKCE
      const state = YouTubeAdapter.generateOAuthState();
      const authUrl = YouTubeAdapter.buildAuthUrl(
        mockClientId,
        mockRedirectUri,
        state,
        challenge
      );
      
      // Verify auth URL contains PKCE parameters
      expect(authUrl).toContain(`code_challenge=${challenge.codeChallenge}`);
      expect(authUrl).toContain('code_challenge_method=S256');
      
      // Step 3: Token exchange would use the code_verifier
      // (This would be done after receiving the authorization code from Google)
      // The code_verifier from the challenge should be used in exchangeCodeForTokensWithPkce
      expect(challenge.codeVerifier).toBeDefined();
    });
  });
});
