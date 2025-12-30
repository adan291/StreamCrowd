// Hook para gestionar permisos de colaboración
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Permission,
  CollaboratorRole,
  ROLE_PERMISSIONS,
  PERMISSION_LABELS
} from '../types/collaboration';
import { getCollaborationService } from '../src/collaboration/services/CollaborationService';
import { getRoleService } from '../src/collaboration/services/RoleService';

export interface UseCollaborationPermissionsReturn {
  // Current user permissions
  permissions: Permission[];
  role: CollaboratorRole | null;
  
  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  canRead: (resource: 'polls' | 'predictions' | 'giveaways' | 'timers' | 'obs' | 'settings') => boolean;
  canWrite: (resource: 'polls' | 'predictions' | 'giveaways' | 'timers' | 'obs' | 'settings') => boolean;
  canManageCollaborators: boolean;
  canManageSession: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  
  // Permission info
  getPermissionLabel: (permission: Permission) => string;
  getPermissionsForRole: (role: CollaboratorRole) => Permission[];
  getAllPermissions: () => Permission[];
  getPermissionsByCategory: () => Record<string, Permission[]>;
  
  // Role info
  getRoleLabel: (role: CollaboratorRole) => string;
  getRoleHierarchy: () => CollaboratorRole[];
}

export function useCollaborationPermissions(): UseCollaborationPermissionsReturn {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [role, setRole] = useState<CollaboratorRole | null>(null);

  // Sync with collaboration service
  useEffect(() => {
    const service = getCollaborationService();
    
    const syncPermissions = () => {
      const currentUser = service.getCurrentUser();
      if (currentUser) {
        setRole(currentUser.role);
        
        // Get permissions (custom or role-based)
        if (currentUser.customPermissions) {
          setPermissions(currentUser.customPermissions);
        } else {
          setPermissions(ROLE_PERMISSIONS[currentUser.role]);
        }
      } else {
        setRole(null);
        setPermissions([]);
      }
    };

    // Initial sync
    syncPermissions();

    // Subscribe to relevant events
    const unsubscribers = [
      service.on('session:created', syncPermissions),
      service.on('session:joined', syncPermissions),
      service.on('session:left', syncPermissions),
      service.on('collaborator:role_changed', syncPermissions)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Check if has permission
  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check read permission for resource
  const canRead = useCallback((resource: 'polls' | 'predictions' | 'giveaways' | 'timers' | 'obs' | 'settings'): boolean => {
    return permissions.includes(`${resource}:read` as Permission);
  }, [permissions]);

  // Check write permission for resource
  const canWrite = useCallback((resource: 'polls' | 'predictions' | 'giveaways' | 'timers' | 'obs' | 'settings'): boolean => {
    return permissions.includes(`${resource}:write` as Permission);
  }, [permissions]);

  // Can manage collaborators
  const canManageCollaborators = useMemo(() => {
    return permissions.includes('collaborators:manage');
  }, [permissions]);

  // Can manage session
  const canManageSession = useMemo(() => {
    return permissions.includes('session:manage');
  }, [permissions]);

  // Role checks
  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';
  const isModerator = role === 'owner' || role === 'admin' || role === 'moderator';

  // Get permission label
  const getPermissionLabel = useCallback((permission: Permission): string => {
    return PERMISSION_LABELS[permission] || permission;
  }, []);

  // Get permissions for role
  const getPermissionsForRole = useCallback((targetRole: CollaboratorRole): Permission[] => {
    return [...ROLE_PERMISSIONS[targetRole]];
  }, []);

  // Get all permissions
  const getAllPermissions = useCallback((): Permission[] => {
    return Object.keys(PERMISSION_LABELS) as Permission[];
  }, []);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((): Record<string, Permission[]> => {
    return {
      polls: ['polls:read', 'polls:write'],
      predictions: ['predictions:read', 'predictions:write'],
      giveaways: ['giveaways:read', 'giveaways:write'],
      timers: ['timers:read', 'timers:write'],
      obs: ['obs:read', 'obs:write'],
      settings: ['settings:read', 'settings:write'],
      management: ['collaborators:manage', 'session:manage']
    };
  }, []);

  // Get role label
  const getRoleLabel = useCallback((targetRole: CollaboratorRole): string => {
    const labels: Record<CollaboratorRole, string> = {
      owner: 'Propietario',
      admin: 'Administrador',
      moderator: 'Moderador',
      viewer: 'Observador'
    };
    return labels[targetRole];
  }, []);

  // Get role hierarchy
  const getRoleHierarchy = useCallback((): CollaboratorRole[] => {
    return ['owner', 'admin', 'moderator', 'viewer'];
  }, []);

  return {
    permissions,
    role,
    hasPermission,
    canRead,
    canWrite,
    canManageCollaborators,
    canManageSession,
    isOwner,
    isAdmin,
    isModerator,
    getPermissionLabel,
    getPermissionsForRole,
    getAllPermissions,
    getPermissionsByCategory,
    getRoleLabel,
    getRoleHierarchy
  };
}
