// Property Tests for SessionService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SessionService } from '../../src/collaboration/services/SessionService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('SessionService Property Tests', () => {
  let service: SessionService;
  let counter = 0;

  const generateUserId = () => `user-${Date.now()}-${counter++}`;
  const generateUserName = () => `User ${counter}`;

  beforeEach(() => {
    localStorageMock.clear();
    counter = 0;
    service = new SessionService();
  });

  describe('Property 1: Session codes are unique', () => {
    it('should generate unique codes for multiple sessions', () => {
      const codes = new Set<string>();
      const numSessions = 50;

      for (let i = 0; i < numSessions; i++) {
        const session = service.createSession(generateUserId(), generateUserName());
        expect(codes.has(session.code)).toBe(false);
        codes.add(session.code);
      }

      expect(codes.size).toBe(numSessions);
    });

    it('should generate codes with valid characters only', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
          const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          
          for (let i = 0; i < count; i++) {
            const session = service.createSession(generateUserId(), generateUserName());
            
            expect(session.code.length).toBe(6);
            for (const char of session.code) {
              expect(validChars.includes(char)).toBe(true);
            }
          }
        }),
        { numRuns: 10 }
      );
    });

    it('should validate code format correctly', () => {
      // Valid codes (using only valid chars: ABCDEFGHJKLMNPQRSTUVWXYZ23456789)
      expect(service.isCodeValid('ABC234')).toBe(true);
      expect(service.isCodeValid('XYZDEF')).toBe(true);
      expect(service.isCodeValid('HJK789')).toBe(true);
      
      // Invalid codes
      expect(service.isCodeValid('ABC12')).toBe(false); // Too short
      expect(service.isCodeValid('ABC1234')).toBe(false); // Too long
      expect(service.isCodeValid('ABC1OO')).toBe(false); // Contains O
      expect(service.isCodeValid('ABCIII')).toBe(false); // Contains I
      expect(service.isCodeValid('ABC100')).toBe(false); // Contains 0 and 1
    });
  });

  describe('Property 2: Only owner can close session', () => {
    it('should allow owner to close session', () => {
      const ownerId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      const result = service.closeSession(session.id);
      expect(result).toBe(true);
      expect(service.getSession(session.id)).toBeNull();
    });

    it('should close session when owner leaves', () => {
      const ownerId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      // Add another collaborator
      service.joinSession(session.code, generateUserId(), 'Mod');
      
      // Owner leaves
      const result = service.leaveSession(session.id, ownerId);
      expect(result).toBe(true);
      expect(service.getSession(session.id)).toBeNull();
    });

    it('should not close session when non-owner leaves', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.joinSession(session.code, modId, 'Mod');
      
      // Mod leaves
      const result = service.leaveSession(session.id, modId);
      expect(result).toBe(true);
      expect(service.getSession(session.id)).not.toBeNull();
    });
  });

  describe('Property 3: Sessions expire correctly', () => {
    it('should create session with correct expiration', () => {
      const session = service.createSession(generateUserId(), 'Owner', {
        autoExpireMinutes: 60
      });
      
      const expectedExpiration = session.createdAt + 60 * 60 * 1000;
      expect(session.expiresAt).toBe(expectedExpiration);
    });

    it('should reject joining expired sessions', () => {
      // Create session with very short expiration
      const session = service.createSession(generateUserId(), 'Owner', {
        autoExpireMinutes: 0 // Expires immediately
      });
      
      // Manually set expiration to past
      const storedSession = service.getSession(session.id);
      if (storedSession) {
        storedSession.expiresAt = Date.now() - 1000;
      }
      
      const result = service.joinSession(session.code, generateUserId(), 'Mod');
      expect(result.success).toBe(false);
      expect(result.error).toContain('expirado');
    });

    it('should clean up expired sessions', () => {
      // Create sessions
      const session1 = service.createSession(generateUserId(), 'Owner1');
      const session2 = service.createSession(generateUserId(), 'Owner2');
      
      // Manually expire session1
      const stored1 = service.getSession(session1.id);
      if (stored1) {
        stored1.expiresAt = Date.now() - 1000;
      }
      
      const cleaned = service.cleanupExpiredSessions();
      expect(cleaned).toBe(1);
      expect(service.getSession(session1.id)).toBeNull();
      expect(service.getSession(session2.id)).not.toBeNull();
    });

    it('should extend session expiration', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      const originalExpiration = session.expiresAt;
      
      service.extendSession(session.id, 30);
      
      const updated = service.getSession(session.id);
      expect(updated?.expiresAt).toBe(originalExpiration + 30 * 60 * 1000);
    });
  });

  describe('Property 4: Session joining', () => {
    it('should allow joining with valid code', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      const result = service.joinSession(session.code, generateUserId(), 'Mod');
      expect(result.success).toBe(true);
      expect(result.session?.collaborators.length).toBe(2);
    });

    it('should reject invalid codes', () => {
      const result = service.joinSession('INVALID', generateUserId(), 'Mod');
      expect(result.success).toBe(false);
      expect(result.error).toContain('inválido');
    });

    it('should handle case-insensitive codes', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      const result = service.joinSession(session.code.toLowerCase(), generateUserId(), 'Mod');
      expect(result.success).toBe(true);
    });

    it('should reject when session is full', () => {
      const session = service.createSession(generateUserId(), 'Owner', {
        maxCollaborators: 2
      });
      
      service.joinSession(session.code, generateUserId(), 'Mod1');
      
      const result = service.joinSession(session.code, generateUserId(), 'Mod2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('llena');
    });

    it('should reconnect existing user instead of adding duplicate', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      const modId = generateUserId();
      
      service.joinSession(session.code, modId, 'Mod');
      
      // Update status to offline
      service.updateCollaboratorStatus(session.id, modId, 'offline');
      
      // Rejoin
      const result = service.joinSession(session.code, modId, 'Mod');
      expect(result.success).toBe(true);
      
      const updated = service.getSession(session.id);
      expect(updated?.collaborators.length).toBe(2); // Still 2, not 3
      
      const mod = updated?.collaborators.find(c => c.id === modId);
      expect(mod?.status).toBe('online');
    });
  });

  describe('Property 5: Collaborator management', () => {
    it('should kick collaborators correctly', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.joinSession(session.code, modId, 'Mod');
      expect(service.getSession(session.id)?.collaborators.length).toBe(2);
      
      const result = service.kickCollaborator(session.id, modId, ownerId);
      expect(result).toBe(true);
      expect(service.getSession(session.id)?.collaborators.length).toBe(1);
    });

    it('should not allow kicking owner', () => {
      const ownerId = generateUserId();
      const adminId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.joinSession(session.code, adminId, 'Admin');
      
      const result = service.kickCollaborator(session.id, ownerId, adminId);
      expect(result).toBe(false);
    });

    it('should not allow moderator to kick', () => {
      const ownerId = generateUserId();
      const mod1Id = generateUserId();
      const mod2Id = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.joinSession(session.code, mod1Id, 'Mod1');
      service.joinSession(session.code, mod2Id, 'Mod2');
      
      const result = service.kickCollaborator(session.id, mod2Id, mod1Id);
      expect(result).toBe(false);
    });

    it('should update collaborator status', () => {
      const ownerId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.updateCollaboratorStatus(session.id, ownerId, 'away');
      
      const collaborator = service.getCollaborator(session.id, ownerId);
      expect(collaborator?.status).toBe('away');
    });

    it('should track editing state', () => {
      const ownerId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.setCollaboratorEditing(session.id, ownerId, 'poll-123');
      
      const collaborator = service.getCollaborator(session.id, ownerId);
      expect(collaborator?.currentlyEditing).toBe('poll-123');
      
      service.setCollaboratorEditing(session.id, ownerId, null);
      
      const updated = service.getCollaborator(session.id, ownerId);
      expect(updated?.currentlyEditing).toBeUndefined();
    });
  });

  describe('Property 6: State version management', () => {
    it('should increment state version', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      expect(session.stateVersion).toBe(0);
      
      const v1 = service.incrementStateVersion(session.id);
      expect(v1).toBe(1);
      
      const v2 = service.incrementStateVersion(session.id);
      expect(v2).toBe(2);
      
      expect(service.getStateVersion(session.id)).toBe(2);
    });

    it('should return -1 for non-existent session', () => {
      expect(service.getStateVersion('non-existent')).toBe(-1);
      expect(service.incrementStateVersion('non-existent')).toBe(-1);
    });
  });

  describe('Property 7: Session validation', () => {
    it('should validate existing session', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      const result = service.validateSession(session.code);
      expect(result.valid).toBe(true);
      expect(result.info?.ownerName).toBe('Owner');
      expect(result.info?.collaboratorCount).toBe(1);
    });

    it('should reject invalid code', () => {
      const result = service.validateSession('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired session', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      // Manually expire
      const stored = service.getSession(session.id);
      if (stored) {
        stored.expiresAt = Date.now() - 1000;
      }
      
      const result = service.validateSession(session.code);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expirado');
    });
  });

  describe('Property 8: Persistence', () => {
    it('should persist sessions to localStorage', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      // Create new service instance
      const newService = new SessionService();
      
      const loaded = newService.getSessionByCode(session.code);
      expect(loaded).not.toBeNull();
      expect(loaded?.ownerName).toBe('Owner');
    });

    it('should mark collaborators as offline on load', () => {
      const ownerId = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      // Create new service instance
      const newService = new SessionService();
      
      const loaded = newService.getSession(session.id);
      const owner = loaded?.collaborators.find(c => c.id === ownerId);
      expect(owner?.status).toBe('offline');
    });

    it('should not load expired sessions', () => {
      const session = service.createSession(generateUserId(), 'Owner');
      
      // Manually expire
      const stored = service.getSession(session.id);
      if (stored) {
        stored.expiresAt = Date.now() - 1000;
        // Force save
        localStorage.setItem('twitchvote_collab_sessions', JSON.stringify([stored]));
      }
      
      // Create new service instance
      const newService = new SessionService();
      
      expect(newService.getSession(session.id)).toBeNull();
    });
  });

  describe('Property 9: Subscription notifications', () => {
    it('should notify listeners on session changes', () => {
      const listener = vi.fn();
      service.subscribe(listener);
      
      service.createSession(generateUserId(), 'Owner');
      expect(listener).toHaveBeenCalledTimes(1);
      
      const sessions = listener.mock.calls[0][0];
      expect(sessions.length).toBe(1);
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);
      
      service.createSession(generateUserId(), 'Owner');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      service.createSession(generateUserId(), 'Owner2');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Property 10: Online collaborators', () => {
    it('should return only online collaborators', () => {
      const ownerId = generateUserId();
      const mod1Id = generateUserId();
      const mod2Id = generateUserId();
      const session = service.createSession(ownerId, 'Owner');
      
      service.joinSession(session.code, mod1Id, 'Mod1');
      service.joinSession(session.code, mod2Id, 'Mod2');
      
      // Set one to offline
      service.updateCollaboratorStatus(session.id, mod1Id, 'offline');
      
      const online = service.getOnlineCollaborators(session.id);
      expect(online.length).toBe(2); // Owner and Mod2
      expect(online.some(c => c.id === mod1Id)).toBe(false);
    });
  });
});
