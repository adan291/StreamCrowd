/**
 * Tests for SessionService (alias for OverlaySessionService)
 * 
 * This test file verifies that the SessionService alias works correctly
 * and provides the same functionality as OverlaySessionService.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SessionService,
  getSessionService,
  resetSessionService,
  type OverlayType,
} from '../../src/application/services/SessionService';

describe('SessionService (alias)', () => {
  let service: SessionService;
  const mockUserId = 'user-123';
  const mockOverlayType: OverlayType = 'poll';

  beforeEach(() => {
    localStorage.clear();
    resetSessionService();
    service = new SessionService();
  });

  it('should create a session with UUID', () => {
    const sessionId = service.createSession(mockUserId, mockOverlayType);
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(sessionId).toMatch(uuidRegex);
  });

  it('should validate active sessions', () => {
    const sessionId = service.createSession(mockUserId, mockOverlayType);
    
    const result = service.validateSession(sessionId);
    
    expect(result.valid).toBe(true);
    expect(result.session).toBeDefined();
  });

  it('should set default expiration to 24 hours', () => {
    const before = Date.now();
    const sessionId = service.createSession(mockUserId, mockOverlayType);
    const after = Date.now();
    
    const session = service.getSession(sessionId);
    const expectedExpiration = 24 * 60 * 60 * 1000;
    
    expect(session).not.toBeNull();
    const expiresAtMs = session!.expiresAt.getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + expectedExpiration);
    expect(expiresAtMs).toBeLessThanOrEqual(after + expectedExpiration);
  });

  it('should revoke sessions', () => {
    const sessionId = service.createSession(mockUserId, mockOverlayType);
    
    const result = service.revokeSession(sessionId);
    
    expect(result).toBe(true);
    expect(service.getSession(sessionId)).toBeNull();
  });

  it('should generate overlay URLs without tokens', () => {
    const sessionId = service.createSession(mockUserId, mockOverlayType);
    const baseUrl = 'https://example.com';
    
    const url = service.generateOverlayUrl(sessionId, baseUrl, {
      theme: 'dark',
      token: 'should-not-appear',
      access_token: 'should-not-appear',
    });
    
    const parsedUrl = new URL(url);
    expect(parsedUrl.searchParams.get('sessionId')).toBe(sessionId);
    expect(parsedUrl.searchParams.get('theme')).toBe('dark');
    expect(parsedUrl.searchParams.has('token')).toBe(false);
    expect(parsedUrl.searchParams.has('access_token')).toBe(false);
  });

  it('should work with singleton pattern', () => {
    const instance1 = getSessionService();
    const instance2 = getSessionService();
    
    expect(instance1).toBe(instance2);
  });
});
