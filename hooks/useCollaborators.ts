// Hook para gestionar lista de colaboradores
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Collaborator,
  CollaboratorRole,
  Permission
} from '../types/collaboration';
import { getCollaborationService } from '../src/collaboration/services/CollaborationService';

export interface UseCollaboratorsReturn {
  // State
  collaborators: Collaborator[];
  onlineCollaborators: Collaborator[];
  currentUser: Collaborator | null;
  
  // Queries
  getCollaborator: (userId: string) => Collaborator | undefined;
  isOnline: (userId: string) => boolean;
  isEditing: (userId: string) => boolean;
  getEditingItem: (userId: string) => string | undefined;
  
  // Actions
  kickCollaborator: (userId: string, reason?: string) => boolean;
  changeRole: (userId: string, newRole: CollaboratorRole) => boolean;
  setCustomPermissions: (userId: string, permissions: Permission[]) => boolean;
  transferOwnership: (newOwnerId: string) => boolean;
  
  // Computed
  collaboratorCount: number;
  onlineCount: number;
  editingUsers: Array<{ user: Collaborator; itemId: string }>;
}

export function useCollaborators(): UseCollaboratorsReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);

  // Sync state from service
  useEffect(() => {
    const service = getCollaborationService();
    
    const syncState = () => {
      setCollaborators(service.getCollaborators());
      setCurrentUser(service.getCurrentUser());
    };

    // Initial sync
    syncState();

    // Subscribe to relevant events
    const unsubscribers = [
      service.on('session:created', syncState),
      service.on('session:joined', syncState),
      service.on('session:left', syncState),
      service.on('collaborator:joined', syncState),
      service.on('collaborator:left', syncState),
      service.on('collaborator:kicked', syncState),
      service.on('collaborator:role_changed', syncState)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // Online collaborators
  const onlineCollaborators = useMemo(() => {
    return collaborators.filter(c => c.status === 'online');
  }, [collaborators]);

  // Get collaborator by ID
  const getCollaborator = useCallback((userId: string): Collaborator | undefined => {
    return collaborators.find(c => c.id === userId);
  }, [collaborators]);

  // Check if user is online
  const isOnline = useCallback((userId: string): boolean => {
    const collaborator = collaborators.find(c => c.id === userId);
    return collaborator?.status === 'online';
  }, [collaborators]);

  // Check if user is editing
  const isEditing = useCallback((userId: string): boolean => {
    const collaborator = collaborators.find(c => c.id === userId);
    return !!collaborator?.currentlyEditing;
  }, [collaborators]);

  // Get item being edited by user
  const getEditingItem = useCallback((userId: string): string | undefined => {
    const collaborator = collaborators.find(c => c.id === userId);
    return collaborator?.currentlyEditing;
  }, [collaborators]);

  // Kick collaborator
  const kickCollaborator = useCallback((userId: string, reason?: string): boolean => {
    const service = getCollaborationService();
    return service.kickCollaborator(userId, reason);
  }, []);

  // Change role
  const changeRole = useCallback((userId: string, newRole: CollaboratorRole): boolean => {
    const service = getCollaborationService();
    return service.changeRole(userId, newRole);
  }, []);

  // Set custom permissions
  const setCustomPermissions = useCallback((userId: string, permissions: Permission[]): boolean => {
    const service = getCollaborationService();
    return service.setCustomPermissions(userId, permissions);
  }, []);

  // Transfer ownership
  const transferOwnership = useCallback((newOwnerId: string): boolean => {
    const service = getCollaborationService();
    return service.transferOwnership(newOwnerId);
  }, []);

  // Editing users
  const editingUsers = useMemo(() => {
    return collaborators
      .filter(c => c.currentlyEditing)
      .map(c => ({ user: c, itemId: c.currentlyEditing! }));
  }, [collaborators]);

  return {
    collaborators,
    onlineCollaborators,
    currentUser,
    getCollaborator,
    isOnline,
    isEditing,
    getEditingItem,
    kickCollaborator,
    changeRole,
    setCustomPermissions,
    transferOwnership,
    collaboratorCount: collaborators.length,
    onlineCount: onlineCollaborators.length,
    editingUsers
  };
}
