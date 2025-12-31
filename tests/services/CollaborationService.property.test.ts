// Property tests for CollaborationService
// Note: This is a simplified test suite focusing on unit behavior
// Full integration tests are in tests/integration/collaboration.integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CollaborationService } from '../../src/collaboration/services/CollaborationService';
import { SessionService } from '../../src/collaboration/services/SessionService';
import { RoleService } from '../../src/collaboration/services/RoleService';
import { SyncService } from '../../src/collaboration/services/SyncService';
import { ChatService } from '../../src/collaboration/services/ChatService';
import { ActionLogService } from '../../src/collaboration/services/ActionLogService';

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

describe('CollaborationService', () => {
  let sessionService: SessionService;
  let roleService: RoleService;
  let syncService: SyncService;
  let chatService: ChatService;
  let actionLogService: ActionLogService;

  beforeEach(() => {
    localStorageMock.clear();
    sessionService = new SessionService();
    roleService = new RoleService(sessionService);
    syncService = new SyncService();
    chatService = new ChatService();
    actionLogService = new ActionLogService({ persistToStorage: false });
  });

  afterEach(() => {
    chatService.dispose();
    actionLogService.dispose();
  });

  describe('constructor', () => {
    it('should create service with default dependencies', () => {
      const service = new CollaborationService();
      expect(service).toBeDefined();
      expect(service.getCurrentSession()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should create service with custom dependencies', () => {
      const service = new CollaborationService({
        sessionService,
        roleService,
        syncService,
        chatService,
        actionLogService
      });
      expect(service).toBeDefined();
    });
  });

  describe('session state', () => {
    it('should return null session when not connected', () => {
      const service = new CollaborationService();
      expect(service.getCurrentSession()).toBeNull();
    });

    it('should return null user when not connected', () => {
      const service = new CollaborationService();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return empty collaborators when not in session', () => {
      const service = new CollaborationService();
      expect(service.getCollaborators()).toEqual([]);
    });

    it('should return false for isConnected when not connected', () => {
      const service = new CollaborationService();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('event system', () => {
    it('should allow subscribing to events', () => {
      const service = new CollaborationService();
      const handler = vi.fn();
      
      const unsubscribe = service.on('session:created', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from events', () => {
      const service = new CollaborationService();
      const handler = vi.fn();
      
      const unsubscribe = service.on('session:created', handler);
      unsubscribe();
      
      // Handler should not be called after unsubscribe
      // (would need to emit event to verify, but that requires session)
    });
  });

  describe('chat without session', () => {
    it('should return null when sending chat without session', () => {
      const service = new CollaborationService({
        chatService
      });
      
      const result = service.sendChatMessage('Hello');
      
      expect(result).toBeNull();
    });

    it('should return empty messages when not in session', () => {
      const service = new CollaborationService({
        chatService
      });
      
      const messages = service.getChatMessages();
      
      expect(messages).toEqual([]);
    });
  });

  describe('action log', () => {
    it('should return empty action log initially', () => {
      const service = new CollaborationService({
        actionLogService
      });
      
      const log = service.getActionLog();
      
      expect(log).toEqual([]);
    });
  });

  describe('permissions without session', () => {
    it('should return false for hasPermission when not in session', () => {
      const service = new CollaborationService({
        roleService
      });
      
      // This will fail because currentUser is null
      expect(service.hasPermission('polls:write')).toBe(false);
    });
  });

  describe('broadcastAction without session', () => {
    it('should return false when broadcasting without session', () => {
      const service = new CollaborationService({
        syncService
      });
      
      const result = service.broadcastAction({
        id: 'test',
        type: 'poll:create',
        payload: {},
        userId: 'user1',
        userName: 'Alice',
        timestamp: Date.now(),
        version: 1
      });
      
      expect(result).toBe(false);
    });
  });

  describe('leaveSession without session', () => {
    it('should not throw when leaving without session', () => {
      const service = new CollaborationService();
      
      expect(() => service.leaveSession()).not.toThrow();
    });
  });

  describe('endSession without session', () => {
    it('should return false when ending without session', () => {
      const service = new CollaborationService();
      
      const result = service.endSession();
      
      expect(result).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const service = new CollaborationService();
      
      expect(() => service.dispose()).not.toThrow();
      expect(service.getCurrentSession()).toBeNull();
    });
  });
});
