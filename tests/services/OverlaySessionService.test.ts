/**
 * Tests for OverlaySessionService
 * 
 * Validates session management for overlay access including:
 * - Session creation with UUID
 * - Session validation
 * - Session expiration (24 hours default)
 * - Session revocation
 * 
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OverlaySessionService,
  resetOverlaySessionService,
  getOverlaySessionService,
  type OverlayType,
} from '../../src/application/services/OverlaySessionService';

describe('OverlaySessionService', () => {
  let service: OverlaySessionService;
  const mockUserId = 'user-123';
  const mockOverlayType: OverlayType = 'poll';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset singleton
    resetOverlaySessionService();
    // Create fresh instance
    service = new OverlaySessionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with a valid UUID', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      
      // UUID v4 format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(sessionId).toMatch(uuidRegex);
    });

    it('should create unique session IDs', () => {
      const sessionIds = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const sessionId = service.createSession(mockUserId, mockOverlayType);
        expect(sessionIds.has(sessionId)).toBe(false);
        sessionIds.add(sessionId);
      }
    });

    it('should store session with correct properties', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const session = service.getSession(sessionId);
      
      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.userId).toBe(mockUserId);
      expect(session?.overlayType).toBe(mockOverlayType);
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.expiresAt).toBeInstanceOf(Date);
    });

    it('should set default expiration to 24 hours', () => {
      const before = Date.now();
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const after = Date.now();
      
      const session = service.getSession(sessionId);
      const expectedExpiration = 24 * 60 * 60 * 1000; // 24 hours in ms
      
      expect(session).not.toBeNull();
      const expiresAtMs = session!.expiresAt.getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + expectedExpiration);
      expect(expiresAtMs).toBeLessThanOrEqual(after + expectedExpiration);
    });

    it('should allow custom TTL', () => {
      const customTTL = 60 * 60 * 1000; // 1 hour
      const before = Date.now();
      const sessionId = service.createSession(mockUserId, mockOverlayType, { ttlMs: customTTL });
      const after = Date.now();
      
      const session = service.getSession(sessionId);
      
      expect(session).not.toBeNull();
      const expiresAtMs = session!.expiresAt.getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + customTTL);
      expect(expiresAtMs).toBeLessThanOrEqual(after + customTTL);
    });

    it('should store metadata if provided', () => {
      const metadata = { theme: 'dark', customField: 'value' };
      const sessionId = service.createSession(mockUserId, mockOverlayType, { metadata });
      
      const session = service.getSession(sessionId);
      expect(session?.metadata).toEqual(metadata);
    });
  });

  describe('validateSession', () => {
    it('should return valid for active session', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      
      const result = service.validateSession(sessionId);
      
      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.id).toBe(sessionId);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for non-existent session', () => {
      const result = service.validateSession('00000000-0000-4000-8000-000000000000');
      
      expect(result.valid).toBe(false);
      expect(result.session).toBeUndefined();
      expect(result.error).toBe('Session not found');
    });

    it('should return invalid for malformed session ID', () => {
      const result = service.validateSession('not-a-valid-uuid');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid session ID format');
    });

    it('should return invalid for expired session', () => {
      // Create service with very short TTL
      const shortTTLService = new OverlaySessionService(1); // 1ms TTL
      const sessionId = shortTTLService.createSession(mockUserId, mockOverlayType);
      
      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = shortTTLService.validateSession(sessionId);
          
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Session has expired');
          resolve();
        }, 10);
      });
    });

    it('should clean up expired session on validation', () => {
      const shortTTLService = new OverlaySessionService(1);
      const sessionId = shortTTLService.createSession(mockUserId, mockOverlayType);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          shortTTLService.validateSession(sessionId);
          
          // Session should be removed
          const session = shortTTLService.getSession(sessionId);
          expect(session).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke existing session', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      
      const result = service.revokeSession(sessionId);
      
      expect(result).toBe(true);
      expect(service.getSession(sessionId)).toBeNull();
    });

    it('should return false for non-existent session', () => {
      const result = service.revokeSession('00000000-0000-4000-8000-000000000000');
      
      expect(result).toBe(false);
    });

    it('should make session invalid after revocation', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      service.revokeSession(sessionId);
      
      const result = service.validateSession(sessionId);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user', () => {
      const sessionId1 = service.createSession(mockUserId, 'poll');
      const sessionId2 = service.createSession(mockUserId, 'giveaway');
      const sessionId3 = service.createSession('other-user', 'poll');
      
      const count = service.revokeAllUserSessions(mockUserId);
      
      expect(count).toBe(2);
      expect(service.getSession(sessionId1)).toBeNull();
      expect(service.getSession(sessionId2)).toBeNull();
      expect(service.getSession(sessionId3)).not.toBeNull();
    });

    it('should return 0 if user has no sessions', () => {
      const count = service.revokeAllUserSessions('non-existent-user');
      
      expect(count).toBe(0);
    });
  });

  describe('generateOverlayUrl', () => {
    it('should generate URL with session ID', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const baseUrl = 'https://example.com';
      
      const url = service.generateOverlayUrl(sessionId, baseUrl);
      
      expect(url).toBe(`https://example.com/overlay?sessionId=${sessionId}`);
    });

    it('should include additional non-sensitive params', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const baseUrl = 'https://example.com';
      
      const url = service.generateOverlayUrl(sessionId, baseUrl, {
        theme: 'dark',
        lang: 'en',
      });
      
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('sessionId')).toBe(sessionId);
      expect(parsedUrl.searchParams.get('theme')).toBe('dark');
      expect(parsedUrl.searchParams.get('lang')).toBe('en');
    });

    it('should NOT include sensitive params', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const baseUrl = 'https://example.com';
      
      const url = service.generateOverlayUrl(sessionId, baseUrl, {
        theme: 'dark',
        token: 'secret-token',
        access_token: 'secret-access',
        api_key: 'secret-key',
        password: 'secret-pass',
      });
      
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('sessionId')).toBe(sessionId);
      expect(parsedUrl.searchParams.get('theme')).toBe('dark');
      expect(parsedUrl.searchParams.has('token')).toBe(false);
      expect(parsedUrl.searchParams.has('access_token')).toBe(false);
      expect(parsedUrl.searchParams.has('api_key')).toBe(false);
      expect(parsedUrl.searchParams.has('password')).toBe(false);
    });
  });

  describe('listUserSessions', () => {
    it('should list all active sessions for a user', () => {
      service.createSession(mockUserId, 'poll');
      service.createSession(mockUserId, 'giveaway');
      service.createSession('other-user', 'poll');
      
      const sessions = service.listUserSessions(mockUserId);
      
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.userId === mockUserId)).toBe(true);
    });

    it('should not include expired sessions', () => {
      const shortTTLService = new OverlaySessionService(1);
      shortTTLService.createSession(mockUserId, 'poll');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const sessions = shortTTLService.listUserSessions(mockUserId);
          expect(sessions).toHaveLength(0);
          resolve();
        }, 10);
      });
    });
  });

  describe('extendSession', () => {
    it('should extend session expiration', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      const originalSession = service.getSession(sessionId);
      const originalExpiration = originalSession!.expiresAt.getTime();
      
      const additionalTime = 60 * 60 * 1000; // 1 hour
      const result = service.extendSession(sessionId, additionalTime);
      
      expect(result).toBe(true);
      const updatedSession = service.getSession(sessionId);
      expect(updatedSession!.expiresAt.getTime()).toBe(originalExpiration + additionalTime);
    });

    it('should return false for non-existent session', () => {
      const result = service.extendSession('00000000-0000-4000-8000-000000000000', 60000);
      
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', () => {
      const shortTTLService = new OverlaySessionService(1);
      shortTTLService.createSession(mockUserId, 'poll');
      shortTTLService.createSession(mockUserId, 'giveaway');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const count = shortTTLService.cleanupExpiredSessions();
          
          expect(count).toBe(2);
          expect(shortTTLService.getActiveSessionCount()).toBe(0);
          resolve();
        }, 10);
      });
    });

    it('should not remove active sessions', () => {
      service.createSession(mockUserId, 'poll');
      service.createSession(mockUserId, 'giveaway');
      
      const count = service.cleanupExpiredSessions();
      
      expect(count).toBe(0);
      expect(service.getActiveSessionCount()).toBe(2);
    });
  });

  describe('persistence', () => {
    it('should persist sessions to localStorage', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      
      const stored = localStorage.getItem('streamcrowd_overlay_sessions');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(sessionId);
    });

    it('should load sessions from localStorage on init', () => {
      const sessionId = service.createSession(mockUserId, mockOverlayType);
      
      // Create new instance (simulating app restart)
      const newService = new OverlaySessionService();
      
      const session = newService.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(mockUserId);
    });

    it('should not load expired sessions from storage', () => {
      // Create session with very short TTL
      const shortTTLService = new OverlaySessionService(1);
      const sessionId = shortTTLService.createSession(mockUserId, mockOverlayType);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Create new instance
          const newService = new OverlaySessionService();
          
          const session = newService.getSession(sessionId);
          expect(session).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getOverlaySessionService();
      const instance2 = getOverlaySessionService();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getOverlaySessionService();
      resetOverlaySessionService();
      const instance2 = getOverlaySessionService();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});
