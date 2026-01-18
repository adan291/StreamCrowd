/**
 * Tests for session-based overlay URL generation
 * 
 * Tests the secure overlay URL generation with session IDs to ensure
 * tokens are never exposed in URLs.
 * 
 * @requirements 4.1, 4.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateSecureOverlayURL,
  generateOverlayURL,
  OVERLAY_TYPES,
} from '../../src/application/services/OverlayURLService';
import { 
  resetOverlaySessionService,
  getOverlaySessionService,
} from '../../src/application/services/OverlaySessionService';

describe('OverlayURLService - Session-based URLs', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    // Reset session service before each test
    resetOverlaySessionService();
  });

  afterEach(() => {
    // Clean up
    resetOverlaySessionService();
  });

  describe('generateSecureOverlayURL', () => {
    it('should generate URL with session ID', () => {
      const { sessionId, url } = generateSecureOverlayURL(mockUserId, 'poll');

      // Should return a session ID
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);

      // URL should be valid
      expect(() => new URL(url)).not.toThrow();

      // URL should contain sessionId parameter
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('sessionId')).toBe(sessionId);
      expect(urlObj.searchParams.get('overlayType')).toBe('poll');
    });

    it('should generate different session IDs for each call', () => {
      const result1 = generateSecureOverlayURL(mockUserId, 'poll');
      const result2 = generateSecureOverlayURL(mockUserId, 'poll');

      expect(result1.sessionId).not.toBe(result2.sessionId);
      expect(result1.url).not.toBe(result2.url);
    });

    it('should include overlay type in URL', () => {
      const { url } = generateSecureOverlayURL(mockUserId, 'giveaway');

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('overlayType')).toBe('giveaway');
    });

    it('should include additional options in URL', () => {
      const { url } = generateSecureOverlayURL(mockUserId, 'poll', {
        bg: '#00FF00',
        channel: 'testchannel',
      });

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('bg')).toBe('#00FF00');
      expect(urlObj.searchParams.get('channel')).toBe('testchannel');
    });

    it('should work for all overlay types', () => {
      for (const overlayType of OVERLAY_TYPES) {
        const { sessionId, url } = generateSecureOverlayURL(mockUserId, overlayType.id);

        expect(sessionId).toBeDefined();
        expect(() => new URL(url)).not.toThrow();

        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('sessionId')).toBe(sessionId);
        expect(urlObj.searchParams.get('overlayType')).toBe(overlayType.id);
      }
    });

    it('should throw for invalid overlay type', () => {
      expect(() => {
        generateSecureOverlayURL(mockUserId, 'invalid-type');
      }).toThrow('Unknown overlay type');
    });
  });

  describe('generateOverlayURL with sessionId', () => {
    it('should use sessionId when provided in options', () => {
      const sessionId = 'test-session-123';
      const url = generateOverlayURL('poll', { sessionId });

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('sessionId')).toBe(sessionId);
      expect(urlObj.searchParams.get('overlayType')).toBe('poll');
    });

    it('should use legacy mode when no sessionId provided', () => {
      const url = generateOverlayURL('poll');

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('sessionId')).toBeNull();
      expect(urlObj.searchParams.get('overlayPoll')).toBe('true');
    });
  });

  describe('Security: No tokens in URLs', () => {
    it('should never include "token" in URL parameters', () => {
      const { url } = generateSecureOverlayURL(mockUserId, 'poll', {
        channel: 'testchannel',
      });

      const urlObj = new URL(url);
      const params = Array.from(urlObj.searchParams.keys());

      // Check that no parameter contains "token"
      for (const param of params) {
        expect(param.toLowerCase()).not.toContain('token');
      }
    });

    it('should not include sensitive data even if passed in options', () => {
      const { url } = generateSecureOverlayURL(mockUserId, 'poll', {
        channel: 'testchannel',
        // @ts-expect-error - Testing that sensitive params are filtered
        token: 'should-not-appear',
        // @ts-expect-error - Testing that sensitive params are filtered
        api_key: 'should-not-appear',
      });

      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('token')).toBeNull();
      expect(urlObj.searchParams.get('api_key')).toBeNull();
    });

    it('should only include sessionId, overlayType, and safe parameters', () => {
      const { url } = generateSecureOverlayURL(mockUserId, 'poll', {
        bg: '#00FF00',
        channel: 'testchannel',
      });

      const urlObj = new URL(url);
      const params = Array.from(urlObj.searchParams.keys());

      // Should only have safe parameters
      const allowedParams = ['sessionId', 'overlayType', 'bg', 'channel'];
      for (const param of params) {
        expect(allowedParams).toContain(param);
      }
    });
  });

  describe('Session validation', () => {
    it('should create a valid session that can be validated', () => {
      const sessionService = getOverlaySessionService();
      
      const { sessionId } = generateSecureOverlayURL(mockUserId, 'poll');

      const result = sessionService.validateSession(sessionId);
      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.userId).toBe(mockUserId);
    });

    it('should create sessions with correct overlay type mapping', () => {
      const typeMapping = [
        { typeId: 'poll', expectedSessionType: 'poll' },
        { typeId: 'giveaway', expectedSessionType: 'giveaway' },
        { typeId: 'trivia', expectedSessionType: 'game' },
        { typeId: 'countdown', expectedSessionType: 'timer' },
      ];

      const sessionService = getOverlaySessionService();

      for (const { typeId, expectedSessionType } of typeMapping) {
        const { sessionId } = generateSecureOverlayURL(mockUserId, typeId);
        const result = sessionService.validateSession(sessionId);

        expect(result.valid).toBe(true);
        expect(result.session?.overlayType).toBe(expectedSessionType);
      }
    });
  });
});
