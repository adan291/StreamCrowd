// Gestor de roles y permisos
import React, { useState } from 'react';
import { 
  Collaborator, 
  CollaboratorRole, 
  Permission,
  ROLE_PERMISSIONS,
  PERMISSION_LABELS 
} from '../../types/collaboration';
import { useCollaborationContext } from '../../context/CollaborationContext';

export interface RoleManagerProps {
  user: Collaborator;
  onRoleChange: (userId: string, newRole: CollaboratorRole) => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  moderator: 'Moderador',
  viewer: 'Viewer'
};

const ROLE_DESCRIPTIONS: Record<CollaboratorRole, string> = {
  owner: 'Control total de la sesión',
  admin: 'Todos los permisos excepto gestión de sesión',
  moderator: 'Puede crear y editar contenido',
  viewer: 'Solo puede ver'
};

export function RoleManager({ user, onRoleChange, onClose }: RoleManagerProps) {
  const { session, currentUser } = useCollaborationContext();
  
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>(user.role);
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(
    user.customPermissions || []
  );
  const [useCustom, setUseCustom] = useState(!!user.customPermissions);

  const isOwner = currentUser?.role === 'owner';
  const canTransferOwnership = isOwner && user.role !== 'owner';

  // Get permissions for selected role
  const rolePermissions = ROLE_PERMISSIONS[selectedRole];

  // Handle permission toggle
  const togglePermission = (permission: Permission) => {
    setCustomPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Handle save
  const handleSave = () => {
    onRoleChange(user.id, selectedRole);
    // Note: Custom permissions would be handled separately
    onClose();
  };

  // Handle transfer ownership
  const handleTransferOwnership = () => {
    if (confirm(`¿Estás seguro de que quieres transferir la propiedad de la sesión a ${user.name}? Esta acción no se puede deshacer.`)) {
      onRoleChange(user.id, 'owner');
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Group permissions by category
  const permissionGroups = {
    'Encuestas': ['polls:read', 'polls:write'] as Permission[],
    'Predicciones': ['predictions:read', 'predictions:write'] as Permission[],
    'Sorteos': ['giveaways:read', 'giveaways:write'] as Permission[],
    'Timers': ['timers:read', 'timers:write'] as Permission[],
    'OBS': ['obs:read', 'obs:write'] as Permission[],
    'Configuración': ['settings:read', 'settings:write'] as Permission[],
    'Gestión': ['collaborators:manage', 'session:manage'] as Permission[]
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Gestionar Rol: {user.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-700/50 rounded">
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-gray-400 text-sm">Rol actual: {ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">
            Seleccionar Rol
          </label>
          <div className="space-y-2">
            {(['admin', 'moderator', 'viewer'] as CollaboratorRole[]).map(role => (
              <label
                key={role}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                  selectedRole === role
                    ? 'bg-purple-600/30 border border-purple-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={() => setSelectedRole(role)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === role ? 'border-purple-500' : 'border-gray-500'
                }`}>
                  {selectedRole === role && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{ROLE_LABELS[role]}</p>
                  <p className="text-gray-400 text-xs">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom permissions toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={e => setUseCustom(e.target.checked)}
              className="w-4 h-4 rounded border-gray-500 text-purple-600 
                       focus:ring-purple-500 focus:ring-offset-gray-800"
            />
            <span className="text-gray-300 text-sm">
              Usar permisos personalizados
            </span>
          </label>
        </div>

        {/* Permissions list */}
        {useCustom && (
          <div className="mb-6 space-y-4">
            {Object.entries(permissionGroups).map(([group, permissions]) => (
              <div key={group}>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                  {group}
                </p>
                <div className="space-y-1">
                  {permissions.map(permission => {
                    const isDefault = rolePermissions.includes(permission);
                    const isEnabled = useCustom 
                      ? customPermissions.includes(permission)
                      : isDefault;

                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => togglePermission(permission)}
                          disabled={!useCustom}
                          className="w-4 h-4 rounded border-gray-500 text-purple-600 
                                   focus:ring-purple-500 focus:ring-offset-gray-800
                                   disabled:opacity-50"
                        />
                        <span className={`text-sm ${isEnabled ? 'text-white' : 'text-gray-500'}`}>
                          {PERMISSION_LABELS[permission]}
                        </span>
                        {!useCustom && isDefault && (
                          <span className="text-xs text-gray-500">(por defecto)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transfer ownership */}
        {canTransferOwnership && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded">
            <p className="text-red-400 text-sm mb-2">
              ⚠️ Transferir Propiedad
            </p>
            <p className="text-gray-400 text-xs mb-3">
              Esto hará que {user.name} sea el nuevo propietario de la sesión. 
              Tú pasarás a ser Admin.
            </p>
            <button
              onClick={handleTransferOwnership}
              className="bg-red-600 hover:bg-red-700 text-white text-sm 
                       py-1.5 px-3 rounded transition-colors"
            >
              Transferir Propiedad
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white 
                     py-2 px-4 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white 
                     py-2 px-4 rounded transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
