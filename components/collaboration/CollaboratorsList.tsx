// Lista de colaboradores
import React, { useState } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';
import { useCollaborationPermissions } from '../../hooks/useCollaborationPermissions';
import { Collaborator, CollaboratorRole } from '../../types/collaboration';
import { RoleManager } from './RoleManager';

export interface CollaboratorsListProps {
  className?: string;
}

export function CollaboratorsList({ className = '' }: CollaboratorsListProps) {
  const { collaborators, currentUser, kickCollaborator, changeRole } = useCollaborationContext();
  const { canManageCollaborators, getRoleLabel } = useCollaborationPermissions();
  
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  const [showRoleManager, setShowRoleManager] = useState(false);

  // Get status color
  const getStatusColor = (status: Collaborator['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-600';
      case 'admin': return 'bg-blue-600';
      case 'moderator': return 'bg-green-600';
      case 'viewer': return 'bg-gray-600';
    }
  };

  // Handle kick
  const handleKick = (user: Collaborator) => {
    if (confirm(`¿Expulsar a ${user.name} de la sesión?`)) {
      kickCollaborator(user.id);
    }
  };

  // Handle role change
  const handleRoleChange = (userId: string, newRole: CollaboratorRole) => {
    changeRole(userId, newRole);
    setShowRoleManager(false);
    setSelectedUser(null);
  };

  return (
    <div className={`p-4 overflow-y-auto ${className}`}>
      <div className="space-y-2">
        {collaborators.map(collaborator => (
          <div
            key={collaborator.id}
            className={`flex items-center gap-3 p-2 rounded ${
              collaborator.id === currentUser?.id
                ? 'bg-purple-900/30 border border-purple-500/30'
                : 'bg-gray-700/50 hover:bg-gray-700'
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                {collaborator.avatar ? (
                  <img
                    src={collaborator.avatar}
                    alt={collaborator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg">
                    {collaborator.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Status indicator */}
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(collaborator.status)}`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {collaborator.name}
                </span>
                {collaborator.id === currentUser?.id && (
                  <span className="text-gray-400 text-xs">(tú)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(collaborator.role)}`}
                >
                  {getRoleLabel(collaborator.role)}
                </span>
                {collaborator.currentlyEditing && (
                  <span className="text-yellow-400 text-xs">
                    ✏️ Editando...
                  </span>
                )}
                {collaborator.isTyping && (
                  <span className="text-blue-400 text-xs">
                    💬 Escribiendo...
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManageCollaborators && 
             collaborator.id !== currentUser?.id && 
             collaborator.role !== 'owner' && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setSelectedUser(collaborator);
                    setShowRoleManager(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                  title="Cambiar rol"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => handleKick(collaborator)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                  title="Expulsar"
                >
                  🚫
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {collaborators.length === 0 && (
        <p className="text-gray-400 text-center py-4">
          No hay colaboradores en la sesión
        </p>
      )}

      {/* Role Manager Modal */}
      {showRoleManager && selectedUser && (
        <RoleManager
          user={selectedUser}
          onRoleChange={handleRoleChange}
          onClose={() => {
            setShowRoleManager(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
