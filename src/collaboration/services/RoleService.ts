// Role Service - Gestiona roles y permisos de colaboradores
import {
  CollaboratorRole,
  Permission,
  Collaborator,
  ROLE_PERMISSIONS,
  PERMISSION_LABELS
} from '../../../types/collaboration';
import { getSessionService, SessionService } from './SessionService';

export class RoleService {
  private sessionService: SessionService;

  constructor(sessionService?: SessionService) {
    this.sessionService = sessionService || getSessionService();
  }

  // ============================================
  // Permission Checking
  // ============================================

  hasPermission(sessionId: string, userId: string, permission: Permission): boolean {
    const collaborator = this.sessionService.getCollaborator(sessionId, userId);
    if (!collaborator) return false;

    return this.collaboratorHasPermission(collaborator, permission);
  }

  collaboratorHasPermission(collaborator: Collaborator, permission: Permission): boolean {
    // Check custom permissions first
    if (collaborator.customPermissions) {
      return collaborator.customPermissions.includes(permission);
    }

    // Fall back to role permissions
    return ROLE_PERMISSIONS[collaborator.role].includes(permission);
  }

  getPermissions(role: CollaboratorRole): Permission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  getCollaboratorPermissions(collaborator: Collaborator): Permission[] {
    if (collaborator.customPermissions) {
      return [...collaborator.customPermissions];
    }
    return this.getPermissions(collaborator.role);
  }

  // ============================================
  // Role Assignment
  // ============================================

  assignRole(
    sessionId: string,
    targetUserId: string,
    newRole: CollaboratorRole,
    assignerId: string
  ): { success: boolean; error?: string } {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    const assigner = session.collaborators.find(c => c.id === assignerId);
    if (!assigner) {
      return { success: false, error: 'Usuario no encontrado en la sesión' };
    }

    const target = session.collaborators.find(c => c.id === targetUserId);
    if (!target) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    // Check if assigner can change roles
    if (!this.canChangeRole(assigner, target, newRole)) {
      return { success: false, error: 'No tienes permiso para cambiar este rol' };
    }

    // Can't change owner's role (must transfer ownership instead)
    if (target.role === 'owner') {
      return { success: false, error: 'No se puede cambiar el rol del owner' };
    }

    // Can't assign owner role (must transfer ownership)
    if (newRole === 'owner') {
      return { success: false, error: 'Usa transferOwnership para asignar owner' };
    }

    target.role = newRole;
    target.customPermissions = undefined; // Reset custom permissions on role change

    return { success: true };
  }

  private canChangeRole(
    assigner: Collaborator,
    target: Collaborator,
    newRole: CollaboratorRole
  ): boolean {
    // Owner can change anyone's role
    if (assigner.role === 'owner') return true;

    // Admin can change moderator and viewer roles
    if (assigner.role === 'admin') {
      if (target.role === 'owner' || target.role === 'admin') return false;
      if (newRole === 'owner' || newRole === 'admin') return false;
      return true;
    }

    // Others can't change roles
    return false;
  }

  // ============================================
  // Custom Permissions
  // ============================================

  setCustomPermissions(
    sessionId: string,
    targetUserId: string,
    permissions: Permission[],
    assignerId: string
  ): { success: boolean; error?: string } {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    const assigner = session.collaborators.find(c => c.id === assignerId);
    if (!assigner) {
      return { success: false, error: 'Usuario no encontrado en la sesión' };
    }

    // Only owner and admin can set custom permissions
    if (assigner.role !== 'owner' && assigner.role !== 'admin') {
      return { success: false, error: 'No tienes permiso para modificar permisos' };
    }

    const target = session.collaborators.find(c => c.id === targetUserId);
    if (!target) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    // Can't modify owner's permissions
    if (target.role === 'owner') {
      return { success: false, error: 'No se pueden modificar los permisos del owner' };
    }

    // Admin can't modify other admin's permissions
    if (assigner.role === 'admin' && target.role === 'admin') {
      return { success: false, error: 'No puedes modificar permisos de otro admin' };
    }

    // Validate permissions
    const validPermissions = permissions.filter(p => 
      Object.keys(PERMISSION_LABELS).includes(p)
    );

    target.customPermissions = validPermissions;

    return { success: true };
  }

  clearCustomPermissions(
    sessionId: string,
    targetUserId: string,
    assignerId: string
  ): { success: boolean; error?: string } {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    const assigner = session.collaborators.find(c => c.id === assignerId);
    if (!assigner || (assigner.role !== 'owner' && assigner.role !== 'admin')) {
      return { success: false, error: 'No tienes permiso para modificar permisos' };
    }

    const target = session.collaborators.find(c => c.id === targetUserId);
    if (!target) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    target.customPermissions = undefined;

    return { success: true };
  }

  // ============================================
  // Ownership Transfer
  // ============================================

  transferOwnership(
    sessionId: string,
    fromUserId: string,
    toUserId: string
  ): { success: boolean; error?: string } {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    const currentOwner = session.collaborators.find(c => c.id === fromUserId);
    if (!currentOwner || currentOwner.role !== 'owner') {
      return { success: false, error: 'Solo el owner puede transferir ownership' };
    }

    const newOwner = session.collaborators.find(c => c.id === toUserId);
    if (!newOwner) {
      return { success: false, error: 'Usuario objetivo no encontrado' };
    }

    if (newOwner.id === currentOwner.id) {
      return { success: false, error: 'Ya eres el owner' };
    }

    // Transfer ownership
    currentOwner.role = 'admin';
    currentOwner.customPermissions = undefined;
    
    newOwner.role = 'owner';
    newOwner.customPermissions = undefined;

    // Update session owner info
    session.ownerId = newOwner.id;
    session.ownerName = newOwner.name;

    return { success: true };
  }

  // ============================================
  // Role Queries
  // ============================================

  getRole(sessionId: string, userId: string): CollaboratorRole | null {
    const collaborator = this.sessionService.getCollaborator(sessionId, userId);
    return collaborator?.role || null;
  }

  isOwner(sessionId: string, userId: string): boolean {
    return this.getRole(sessionId, userId) === 'owner';
  }

  isAdmin(sessionId: string, userId: string): boolean {
    const role = this.getRole(sessionId, userId);
    return role === 'owner' || role === 'admin';
  }

  isModerator(sessionId: string, userId: string): boolean {
    const role = this.getRole(sessionId, userId);
    return role === 'owner' || role === 'admin' || role === 'moderator';
  }

  canManageCollaborators(sessionId: string, userId: string): boolean {
    return this.hasPermission(sessionId, userId, 'collaborators:manage');
  }

  canManageSession(sessionId: string, userId: string): boolean {
    return this.hasPermission(sessionId, userId, 'session:manage');
  }

  // ============================================
  // Permission Labels
  // ============================================

  getPermissionLabel(permission: Permission): string {
    return PERMISSION_LABELS[permission] || permission;
  }

  getAllPermissions(): Permission[] {
    return Object.keys(PERMISSION_LABELS) as Permission[];
  }

  getPermissionsByCategory(): Record<string, Permission[]> {
    return {
      polls: ['polls:read', 'polls:write'],
      predictions: ['predictions:read', 'predictions:write'],
      giveaways: ['giveaways:read', 'giveaways:write'],
      timers: ['timers:read', 'timers:write'],
      obs: ['obs:read', 'obs:write'],
      settings: ['settings:read', 'settings:write'],
      management: ['collaborators:manage', 'session:manage']
    };
  }

  // ============================================
  // Role Hierarchy
  // ============================================

  getRoleHierarchy(): CollaboratorRole[] {
    return ['owner', 'admin', 'moderator', 'viewer'];
  }

  isRoleHigherOrEqual(role1: CollaboratorRole, role2: CollaboratorRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy.indexOf(role1) <= hierarchy.indexOf(role2);
  }

  getRoleLabel(role: CollaboratorRole): string {
    const labels: Record<CollaboratorRole, string> = {
      owner: 'Propietario',
      admin: 'Administrador',
      moderator: 'Moderador',
      viewer: 'Observador'
    };
    return labels[role];
  }
}

// Singleton
let instance: RoleService | null = null;

export function getRoleService(): RoleService {
  if (!instance) {
    instance = new RoleService();
  }
  return instance;
}

export function resetRoleService(): void {
  instance = null;
}
