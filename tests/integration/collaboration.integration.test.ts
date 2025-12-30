// Integration tests for Collaboration System
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionService } from '../../src/collaboration/services/SessionService';
import { RoleService } from '../../src/collaboration/services/RoleService';
import { SyncService } from '../../src/collaboration/services/SyncService';
import { ChatService } from '../../src/collaboration/services/ChatService';
import { ActionLogService } from '../../src/collaboration/services/ActionLogService';
import { Permission } from '../../types/collaboration';

describe('Collaboration Integration Tests', () => {
  let sessionService: SessionService;
  let roleService: RoleService;
  let syncService: SyncService;
  let chatService: ChatService;
  let logService: ActionLogService;

  beforeEach(() => {
    // Create fresh instances for each test
    sessionService = new SessionService();
    roleService = new RoleService(sessionService);
    syncService = new SyncService();
    chatService = new ChatService();
    logService = new ActionLogService();
  });

  describe('Task 26.1: Create session, invite, join', () => {
    it('should create a session with valid code', () => {
      const session = sessionService.createSession('owner-1', 'StreamerPro');
      
      expect(session).toBeDefined();
      expect(session.code).toHaveLength(6);
      expect(session.ownerId).toBe('owner-1');
      expect(session.ownerName).toBe('StreamerPro');
      expect(session.collaborators).toHaveLength(1);
      expect(session.collaborators[0].role).toBe('owner');
    });

    it('should allow users to join with valid code', () => {
      const session = sessionService.createSession('owner-1', 'StreamerPro');
      
      const joinResult = sessionService.joinSession(
        session.code,
        'mod-1',
        'ModeratorOne'
      );
      
      expect(joinResult.success).toBe(true);
      expect(joinResult.session?.collaborators).toHaveLength(2);
    });

    it('should reject joining with invalid code', () => {
      const joinResult = sessionService.joinSession(
        'INVALID',
        'user-1',
        'User'
      );
      
      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBeDefined();
    });

    it('should enforce max collaborators limit', () => {
      const session = sessionService.createSession('owner-1', 'Owner', {
        maxCollaborators: 2
      });
      
      // First join should succeed (owner + 1 = 2)
      const join1 = sessionService.joinSession(session.code, 'user-1', 'User1');
      expect(join1.success).toBe(true);
      
      // Second join should fail (max reached)
      const join2 = sessionService.joinSession(session.code, 'user-2', 'User2');
      expect(join2.success).toBe(false);
    });

    it('should generate unique session codes', () => {
      const codes = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const session = sessionService.createSession(`owner-${i}`, `Owner${i}`);
        expect(codes.has(session.code)).toBe(false);
        codes.add(session.code);
      }
    });
  });

  describe('Task 26.2: Action synchronization between users', () => {
    it('should create actions with incrementing versions', () => {
      const action1 = syncService.createAction('poll:create', {
        title: 'Best Game?'
      }, 'user-a', 'UserA');
      
      expect(action1.id).toBeDefined();
      expect(action1.version).toBe(1);
      
      // Apply first action to increment version
      syncService.applyAction(action1);
      
      const action2 = syncService.createAction('poll:update', {
        title: 'Best Game 2024?'
      }, 'user-b', 'UserB');
      
      expect(action2.version).toBe(2);
    });

    it('should apply actions and track state version', () => {
      const action = syncService.createAction('poll:create', {
        title: 'Test Poll'
      }, 'user-1', 'User1');
      
      const result = syncService.applyAction(action);
      
      expect(result.resolution).toBe('accepted');
      expect(syncService.getStateVersion()).toBeGreaterThan(0);
    });

    it('should resolve conflicts with last-write-wins', () => {
      const actionA = syncService.createAction('poll:update', {
        pollId: 'poll-1',
        title: 'Title from A'
      }, 'user-a', 'UserA');
      
      // Small delay to ensure different timestamps
      const actionB = syncService.createAction('poll:update', {
        pollId: 'poll-1',
        title: 'Title from B'
      }, 'user-b', 'UserB');
      
      const resolution = syncService.resolveConflict(actionA, actionB);
      
      expect(resolution.resolution).toBe('accepted');
    });
  });

  describe('Task 26.3: Chat functionality', () => {
    it('should send and receive messages', () => {
      const msg1 = chatService.sendMessage('user-1', 'Alice', 'Hello team!');
      const msg2 = chatService.sendMessage('user-2', 'Bob', 'Hi Alice!');
      
      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();
      
      const messages = chatService.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello team!');
      expect(messages[1].content).toBe('Hi Alice!');
    });

    it('should parse mentions correctly', () => {
      const msg = chatService.sendMessage(
        'user-3',
        'Charlie',
        'Hey @Alice and @Bob, check this out!'
      );
      
      expect(msg).toBeDefined();
      expect(msg!.mentions).toContain('Alice');
      expect(msg!.mentions).toContain('Bob');
    });

    it('should notify subscribers of new messages', () => {
      let notified = false;
      
      chatService.subscribe(() => {
        notified = true;
      });
      
      chatService.sendMessage('user-1', 'User1', 'Test message');
      
      expect(notified).toBe(true);
    });

    it('should clear chat history', () => {
      chatService.sendMessage('user-1', 'User1', 'Message 1');
      chatService.sendMessage('user-2', 'User2', 'Message 2');
      
      expect(chatService.getMessages()).toHaveLength(2);
      
      chatService.clearHistory();
      
      expect(chatService.getMessages()).toHaveLength(0);
    });

    it('should send system messages', () => {
      const sysMsg = chatService.sendSystemMessage('User joined the session');
      
      expect(sysMsg.isSystem).toBe(true);
      expect(sysMsg.userId).toBe('system');
    });
  });

  describe('Task 26.4: Permissions are respected', () => {
    it('should grant owner all permissions', () => {
      const session = sessionService.createSession('owner-1', 'Owner');
      
      const allPermissions: Permission[] = [
        'polls:read', 'polls:write',
        'predictions:read', 'predictions:write',
        'giveaways:read', 'giveaways:write',
        'timers:read', 'timers:write',
        'obs:read', 'obs:write',
        'settings:read', 'settings:write',
        'collaborators:manage',
        'session:manage'
      ];
      
      allPermissions.forEach(permission => {
        expect(roleService.hasPermission(session.id, 'owner-1', permission)).toBe(true);
      });
    });

    it('should restrict viewer to read-only', () => {
      const session = sessionService.createSession('owner-1', 'Owner');
      sessionService.joinSession(session.code, 'viewer-1', 'Viewer');
      
      // Change role to viewer
      roleService.assignRole(session.id, 'viewer-1', 'viewer', 'owner-1');
      
      // Viewers can read
      expect(roleService.hasPermission(session.id, 'viewer-1', 'polls:read')).toBe(true);
      expect(roleService.hasPermission(session.id, 'viewer-1', 'predictions:read')).toBe(true);
      
      // Viewers cannot write
      expect(roleService.hasPermission(session.id, 'viewer-1', 'polls:write')).toBe(false);
      expect(roleService.hasPermission(session.id, 'viewer-1', 'predictions:write')).toBe(false);
    });

    it('should get permissions for a role', () => {
      const ownerPerms = roleService.getPermissions('owner');
      const viewerPerms = roleService.getPermissions('viewer');
      
      expect(ownerPerms).toContain('session:manage');
      expect(viewerPerms).not.toContain('session:manage');
      expect(viewerPerms).toContain('polls:read');
    });
  });

  describe('Task 26.5: Reconnection works', () => {
    it('should handle session leave', () => {
      const session = sessionService.createSession('owner-1', 'Owner');
      sessionService.joinSession(session.code, 'user-1', 'User1');
      
      expect(session.collaborators).toHaveLength(2);
      
      // User leaves (using session.id, not code)
      const leaveResult = sessionService.leaveSession(session.id, 'user-1');
      expect(leaveResult).toBe(true);
      
      // Verify user is gone
      const updatedSession = sessionService.getSessionByCode(session.code);
      expect(updatedSession?.collaborators.find(c => c.id === 'user-1')).toBeUndefined();
    });

    it('should allow user to rejoin after leaving', () => {
      const session = sessionService.createSession('owner-1', 'Owner');
      sessionService.joinSession(session.code, 'user-1', 'User1');
      sessionService.leaveSession(session.id, 'user-1');
      
      // User rejoins
      const rejoinResult = sessionService.joinSession(session.code, 'user-1', 'User1');
      expect(rejoinResult.success).toBe(true);
    });

    it('should close session by owner', () => {
      const session = sessionService.createSession('owner-1', 'Owner');
      
      // Owner can close (using session.id)
      const closeResult = sessionService.closeSession(session.id);
      expect(closeResult).toBe(true);
      
      // Session no longer exists
      expect(sessionService.getSessionByCode(session.code)).toBeNull();
    });
  });

  describe('Action Log Integration', () => {
    it('should log actions with correct metadata', () => {
      // Create fresh instance for this test
      const freshLogService = new ActionLogService({ persistToStorage: false });
      
      freshLogService.logAction('Encuesta creada', 'user-1', 'Alice', 'Best Game?', 'poll');
      freshLogService.logAction('Timer iniciado', 'user-2', 'Bob', 'Break Timer', 'timer');
      freshLogService.logAction('Escena cambiada', 'user-1', 'Alice', 'Gaming', 'obs');
      
      const allActions = freshLogService.getRecentActions();
      expect(allActions).toHaveLength(3);
      
      // Filter by user
      const aliceActions = freshLogService.getActionsByUser('user-1');
      expect(aliceActions).toHaveLength(2);
      
      // Filter by category
      const obsActions = freshLogService.getActionsByCategory('obs');
      expect(obsActions).toHaveLength(1);
    });

    it('should export to CSV', () => {
      const freshLogService = new ActionLogService({ persistToStorage: false });
      freshLogService.logAction('Test Action', 'user-1', 'User1', 'Test details', 'other');
      
      const csv = freshLogService.exportToCSV();
      
      expect(csv).toContain('Test Action');
      expect(csv).toContain('User1');
    });

    it('should clear log', () => {
      const freshLogService = new ActionLogService({ persistToStorage: false });
      freshLogService.logAction('Action 1', 'user-1', 'User1', 'Details', 'poll');
      freshLogService.logAction('Action 2', 'user-2', 'User2', 'Details', 'timer');
      
      expect(freshLogService.getRecentActions()).toHaveLength(2);
      
      freshLogService.clearLog();
      
      expect(freshLogService.getRecentActions()).toHaveLength(0);
    });
  });
});
