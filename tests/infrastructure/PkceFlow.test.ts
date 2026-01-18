/**
 * Unit tests for PKCE Flow implementation
 * 
 * Tests the PKCE (Proof Key for Code Exchange) flow for OAuth 2.0.
 * 
 * @module tests/infrastructure/PkceFlow.test
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { PkceFlow, verifyPkceChallenge, isValidCodeVerifier, isValidCodeChallenge } from '../../src/infrastructure/auth/PkceFlow';

// ============================================
// Mock Web Crypto API for Node.js environment
// ============================================

const mockSubtle = {
  digest: vi.fn().mockImplementation(async (algorithm: string, data: ArrayBuffer) => {
    // Simple mock hash - in real tests, use actual crypto
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
// Unit Tests
// ============================================

describe('PkceFlow', () => {
  let pkce: PkceFlow;

  beforeEach(() => {
    pkce = new PkceFlow();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier of 128 characters', () => {
      const verifier = pkce.generateCodeVerifier();
      expect(verifier.length).toBe(128);
    });

    it('should generate a valid code verifier', () => {
      const verifier = pkce.generateCodeVerifier();
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = pkce.generateCodeVerifier();
      const pkce2 = new PkceFlow();
      const verifier2 = pkce2.generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should only contain URL-safe characters', () => {
      const verifier = pkce.generateCodeVerifier();
      // Base64url characters: A-Z, a-z, 0-9, -, _
      const validPattern = /^[A-Za-z0-9\-_]+$/;
      expect(validPattern.test(verifier)).toBe(true);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should throw if code verifier not generated', async () => {
      await expect(pkce.generateCodeChallenge()).rejects.toThrow(
        'Code verifier not generated'
      );
    });

    it('should generate a valid code challenge', async () => {
      pkce.generateCodeVerifier();
      const challenge = await pkce.generateCodeChallenge();
      expect(isValidCodeChallenge(challenge)).toBe(true);
    });

    it('should generate a 43-character challenge (SHA256 base64url)', async () => {
      pkce.generateCodeVerifier();
      const challenge = await pkce.generateCodeChallenge();
      expect(challenge.length).toBe(43);
    });

    it('should only contain base64url characters', async () => {
      pkce.generateCodeVerifier();
      const challenge = await pkce.generateCodeChallenge();
      const validPattern = /^[A-Za-z0-9\-_]+$/;
      expect(validPattern.test(challenge)).toBe(true);
    });
  });

  describe('generateChallenge', () => {
    it('should return complete PKCE challenge object', async () => {
      const challenge = await pkce.generateChallenge();
      
      expect(challenge).toHaveProperty('codeVerifier');
      expect(challenge).toHaveProperty('codeChallenge');
      expect(challenge).toHaveProperty('codeChallengeMethod');
      expect(challenge.codeChallengeMethod).toBe('S256');
    });

    it('should generate valid verifier and challenge', async () => {
      const challenge = await pkce.generateChallenge();
      
      expect(isValidCodeVerifier(challenge.codeVerifier)).toBe(true);
      expect(isValidCodeChallenge(challenge.codeChallenge)).toBe(true);
    });
  });

  describe('getCodeVerifier', () => {
    it('should throw if code verifier not generated', () => {
      expect(() => pkce.getCodeVerifier()).toThrow('Code verifier not generated');
    });

    it('should return the generated code verifier', () => {
      const generated = pkce.generateCodeVerifier();
      const retrieved = pkce.getCodeVerifier();
      expect(retrieved).toBe(generated);
    });
  });

  describe('hasCodeVerifier', () => {
    it('should return false before generating', () => {
      expect(pkce.hasCodeVerifier()).toBe(false);
    });

    it('should return true after generating', () => {
      pkce.generateCodeVerifier();
      expect(pkce.hasCodeVerifier()).toBe(true);
    });

    it('should return false after clearing', () => {
      pkce.generateCodeVerifier();
      pkce.clear();
      expect(pkce.hasCodeVerifier()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear the stored code verifier', () => {
      pkce.generateCodeVerifier();
      pkce.clear();
      expect(() => pkce.getCodeVerifier()).toThrow('Code verifier not generated');
    });
  });
});

describe('Utility Functions', () => {
  describe('verifyPkceChallenge', () => {
    it('should verify matching verifier and challenge', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      
      const isValid = await verifyPkceChallenge(
        challenge.codeVerifier,
        challenge.codeChallenge
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject mismatched verifier and challenge', async () => {
      const pkce1 = new PkceFlow();
      const pkce2 = new PkceFlow();
      
      const challenge1 = await pkce1.generateChallenge();
      const challenge2 = await pkce2.generateChallenge();
      
      const isValid = await verifyPkceChallenge(
        challenge1.codeVerifier,
        challenge2.codeChallenge
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('isValidCodeVerifier', () => {
    it('should accept valid 128-character verifier', () => {
      const pkce = new PkceFlow();
      const verifier = pkce.generateCodeVerifier();
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });

    it('should reject verifier shorter than 43 characters', () => {
      expect(isValidCodeVerifier('short')).toBe(false);
    });

    it('should reject verifier longer than 128 characters', () => {
      const longVerifier = 'a'.repeat(129);
      expect(isValidCodeVerifier(longVerifier)).toBe(false);
    });

    it('should reject verifier with invalid characters', () => {
      const invalidVerifier = 'a'.repeat(50) + '!@#$%' + 'a'.repeat(50);
      expect(isValidCodeVerifier(invalidVerifier)).toBe(false);
    });

    it('should accept minimum length verifier (43 chars)', () => {
      const minVerifier = 'a'.repeat(43);
      expect(isValidCodeVerifier(minVerifier)).toBe(true);
    });
  });

  describe('isValidCodeChallenge', () => {
    it('should accept valid 43-character challenge', async () => {
      const pkce = new PkceFlow();
      const challenge = await pkce.generateChallenge();
      expect(isValidCodeChallenge(challenge.codeChallenge)).toBe(true);
    });

    it('should reject challenge not 43 characters', () => {
      expect(isValidCodeChallenge('short')).toBe(false);
      expect(isValidCodeChallenge('a'.repeat(44))).toBe(false);
    });

    it('should reject challenge with invalid characters', () => {
      const invalidChallenge = 'a'.repeat(40) + '!@#';
      expect(isValidCodeChallenge(invalidChallenge)).toBe(false);
    });
  });
});
