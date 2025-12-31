// Property Tests for RoleService
import { describe, it, expect, beforeEach } from 'vitest';
import { RoleService } from '../../src/collaboration/services/RoleService';
import { SessionService } from '../../src/collaboration/services/SessionService';
import { ROLE_PERMISSIONS, Permission, CollaboratorRole } from '../../types/collaboration';

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

describe('RoleService Property Tests', () => {
  let roleService: RoleService;
  let sessionService: SessionService;
  let counter = 0;

  const generateUserId = () => `user-${Date.now()}-${counter++}`;

  beforeEach(() => {
    localStorageMock.clear();
    counter = 0;
    sessionService = new SessionService();
    roleService = new RoleService(sessionService);
  });

  describe('Property 1: Owner has all permissions', () => {
    it('should grant owner all permissions', () => {
      const ownerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');

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

      for (const permission of allPermissions) {
        expect(roleService.hasPermission(session.id, ownerId, permission)).toBe(true);
      }
    });

    it('should return all permissions for owner role', () => {
      const ownerPermissions = roleService.getPermissions('owner');
      expect(ownerPermissions.length).toBe(14);
      expect(ownerPermissions).toContain('session:manage');
      expect(ownerPermissions).toContain('collaborators:manage');
    });
  });

  describe('Property 2: Viewer cannot modify anything', () => {
    it('should deny write permissions to viewer', () => {
      const ownerId = generateUserId();
      const viewerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, viewerId, 'Viewer');
      
      // Change role to viewer
      const collaborator = sessionService.getCollaborator(session.id, viewerId);
      if (collaborator) {
        collaborator.role = 'viewer';
      }

      const writePermissions: Permission[] = [
        'polls:write',
        'predictions:write',
        'giveaways:write',
        'timers:write',
        'obs:write',
        'settings:write',
        'collaborators:manage',
        'session:manage'
      ];

      for (const permission of writePermissions) {
        expect(roleService.hasPermission(session.id, viewerId, permission)).toBe(false);
      }
    });

    it('should allow read permissions to viewer', () => {
      const ownerId = generateUserId();
      const viewerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, viewerId, 'Viewer');
      
      const collaborator = sessionService.getCollaborator(session.id, viewerId);
      if (collaborator) {
        collaborator.role = 'viewer';
      }

      const readPermissions: Permission[] = [
        'polls:read',
        'predictions:read',
        'giveaways:read',
        'timers:read',
        'obs:read'
      ];

      for (const permission of readPermissions) {
        expect(roleService.hasPermission(session.id, viewerId, permission)).toBe(true);
      }
    });
  });

  describe('Property 3: Permissions are validated correctly', () => {
    it('should validate permissions based on role', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      // Moderator should have polls:write
      expect(roleService.hasPermission(session.id, modId, 'polls:write')).toBe(true);
      
      // Moderator should NOT have collaborators:manage
      expect(roleService.hasPermission(session.id, modId, 'collaborators:manage')).toBe(false);
    });

    it('should use custom permissions when set', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      // Set custom permissions (only polls:read)
      roleService.setCustomPermissions(session.id, modId, ['polls:read'], ownerId);

      // Should have polls:read
      expect(roleService.hasPermission(session.id, modId, 'polls:read')).toBe(true);
      
      // Should NOT have polls:write anymore
      expect(roleService.hasPermission(session.id, modId, 'polls:write')).toBe(false);
    });

    it('should return false for non-existent user', () => {
      const ownerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');

      expect(roleService.hasPermission(session.id, 'non-existent', 'polls:read')).toBe(false);
    });
  });

  describe('Property 4: Role assignment', () => {
    it('should allow owner to change roles', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      const result = roleService.assignRole(session.id, modId, 'admin', ownerId);
      expect(result.success).toBe(true);
      expect(roleService.getRole(session.id, modId)).toBe('admin');
    });

    it('should not allow changing owner role', () => {
      const ownerId = generateUserId();
      const adminId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, adminId, 'Admin');
      const collaborator = sessionService.getCollaborator(session.id, adminId);
      if (collaborator) collaborator.role = 'admin';

      const result = roleService.assignRole(session.id, ownerId, 'admin', adminId);
      expect(result.success).toBe(false);
    });

    it('should not allow assigning owner role directly', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      const result = roleService.assignRole(session.id, modId, 'owner', ownerId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('transferOwnership');
    });

    it('should not allow moderator to change roles', () => {
      const ownerId = generateUserId();
      const mod1Id = generateUserId();
      const mod2Id = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, mod1Id, 'Mod1');
      sessionService.joinSession(session.code, mod2Id, 'Mod2');

      const result = roleService.assignRole(session.id, mod2Id, 'viewer', mod1Id);
      expect(result.success).toBe(false);
    });
  });

  describe('Property 5: Ownership transfer', () => {
    it('should transfer ownership correctly', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      const result = roleService.transferOwnership(session.id, ownerId, modId);
      expect(result.success).toBe(true);

      // New owner should have owner role
      expect(roleService.getRole(session.id, modId)).toBe('owner');
      
      // Old owner should be admin now
      expect(roleService.getRole(session.id, ownerId)).toBe('admin');

      // Session should reflect new owner
      const updatedSession = sessionService.getSession(session.id);
      expect(updatedSession?.ownerId).toBe(modId);
    });

    it('should only allow owner to transfer ownership', () => {
      const ownerId = generateUserId();
      const adminId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, adminId, 'Admin');
      sessionService.joinSession(session.code, modId, 'Mod');
      
      const collaborator = sessionService.getCollaborator(session.id, adminId);
      if (collaborator) collaborator.role = 'admin';

      const result = roleService.transferOwnership(session.id, adminId, modId);
      expect(result.success).toBe(false);
    });

    it('should not allow transferring to self', () => {
      const ownerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');

      const result = roleService.transferOwnership(session.id, ownerId, ownerId);
      expect(result.success).toBe(false);
    });
  });

  describe('Property 6: Custom permissions', () => {
    it('should set custom permissions', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      const customPerms: Permission[] = ['polls:read', 'timers:read', 'timers:write'];
      const result = roleService.setCustomPermissions(session.id, modId, customPerms, ownerId);
      
      expect(result.success).toBe(true);

      const collaborator = sessionService.getCollaborator(session.id, modId);
      expect(collaborator?.customPermissions).toEqual(customPerms);
    });

    it('should clear custom permissions', () => {
      const ownerId = generateUserId();
      const modId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, modId, 'Mod');

      roleService.setCustomPermissions(session.id, modId, ['polls:read'], ownerId);
      roleService.clearCustomPermissions(session.id, modId, ownerId);

      const collaborator = sessionService.getCollaborator(session.id, modId);
      expect(collaborator?.customPermissions).toBeUndefined();
    });

    it('should not allow modifying owner permissions', () => {
      const ownerId = generateUserId();
      const adminId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, adminId, 'Admin');
      const collaborator = sessionService.getCollaborator(session.id, adminId);
      if (collaborator) collaborator.role = 'admin';

      const result = roleService.setCustomPermissions(session.id, ownerId, ['polls:read'], adminId);
      expect(result.success).toBe(false);
    });
  });

  describe('Property 7: Role queries', () => {
    it('should correctly identify roles', () => {
      const ownerId = generateUserId();
      const adminId = generateUserId();
      const modId = generateUserId();
      const viewerId = generateUserId();
      const session = sessionService.createSession(ownerId, 'Owner');
      
      sessionService.joinSession(session.code, adminId, 'Admin');
      sessionService.joinSession(session.code, modId, 'Mod');
      sessionService.joinSession(session.code, viewerId, 'Viewer');
      
      // Set roles
      const admin = sessionService.getCollaborator(session.id, adminId);
      const viewer = sessionService.getCollaborator(session.id, viewerId);
      if (admin) admin.role = 'admin';
      if (viewer) viewer.role = 'viewer';

      expect(roleService.isOwner(session.id, ownerId)).toBe(true);
      expect(roleService.isOwner(session.id, adminId)).toBe(false);

      expect(roleService.isAdmin(session.id, ownerId)).toBe(true);
      expect(roleService.isAdmin(session.id, adminId)).toBe(true);
      expect(roleService.isAdmin(session.id, modId)).toBe(false);

      expect(roleService.isModerator(session.id, ownerId)).toBe(true);
      expect(roleService.isModerator(session.id, adminId)).toBe(true);
      expect(roleService.isModerator(session.id, modId)).toBe(true);
      expect(roleService.isModerator(session.id, viewerId)).toBe(false);
    });
  });

  describe('Property 8: Role hierarchy', () => {
    it('should return correct hierarchy', () => {
      const hierarchy = roleService.getRoleHierarchy();
      expect(hierarchy).toEqual(['owner', 'admin', 'moderator', 'viewer']);
    });

    it('should compare roles correctly', () => {
      expect(roleService.isRoleHigherOrEqual('owner', 'admin')).toBe(true);
      expect(roleService.isRoleHigherOrEqual('owner', 'owner')).toBe(true);
      expect(roleService.isRoleHigherOrEqual('admin', 'owner')).toBe(false);
      expect(roleService.isRoleHigherOrEqual('moderator', 'viewer')).toBe(true);
      expect(roleService.isRoleHigherOrEqual('viewer', 'moderator')).toBe(false);
    });
  });

  describe('Property 9: Permission categories', () => {
    it('should return permissions by category', () => {
      const categories = roleService.getPermissionsByCategory();
      
      expect(categories.polls).toContain('polls:read');
      expect(categories.polls).toContain('polls:write');
      expect(categories.management).toContain('collaborators:manage');
      expect(categories.management).toContain('session:manage');
    });

    it('should return all permissions', () => {
      const allPerms = roleService.getAllPermissions();
      expect(allPerms.length).toBe(14);
    });

    it('should return permission labels', () => {
      expect(roleService.getPermissionLabel('polls:read')).toBe('Ver encuestas');
      expect(roleService.getPermissionLabel('session:manage')).toBe('Gestionar sesión');
    });
  });

  describe('Property 10: Role labels', () => {
    it('should return correct role labels', () => {
      expect(roleService.getRoleLabel('owner')).toBe('Propietario');
      expect(roleService.getRoleLabel('admin')).toBe('Administrador');
      expect(roleService.getRoleLabel('moderator')).toBe('Moderador');
      expect(roleService.getRoleLabel('viewer')).toBe('Observador');
    });
  });
});
