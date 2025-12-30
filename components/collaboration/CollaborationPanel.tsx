// Panel principal de colaboración
import React, { useState } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';
import { CollaboratorsList } from './CollaboratorsList';
import { ModeratorChat } from './ModeratorChat';
import { ActionLogViewer } from './ActionLogViewer';
import { ConnectionStatus } from './ConnectionStatus';
import { JoinSessionModal } from './JoinSessionModal';
import { InviteModal } from './InviteModal';

type TabType = 'collaborators' | 'chat' | 'log';

export interface CollaborationPanelProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  className?: string;
}

export function CollaborationPanel({
  userId,
  userName,
  userAvatar,
  className = ''
}: CollaborationPanelProps) {
  const {
    session,
    isInSession,
    isConnected,
    isLoading,
    error,
    startSession,
    leaveSession,
    endSession,
    clearError
  } = useCollaborationContext();

  const [activeTab, setActiveTab] = useState<TabType>('collaborators');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Handle create session
  const handleCreateSession = async () => {
    await startSession(userId, userName);
  };

  // Handle leave session
  const handleLeaveSession = () => {
    if (confirm('¿Estás seguro de que quieres salir de la sesión?')) {
      leaveSession();
    }
  };

  // Handle end session
  const handleEndSession = () => {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión para todos?')) {
      endSession();
    }
  };

  // Render not in session state
  if (!isInSession) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">
          Modo Colaborativo
        </h3>
        
        <p className="text-gray-400 text-sm mb-4">
          Colabora con otros moderadores en tiempo real. Crea una sesión o únete a una existente.
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-300 text-xs underline mt-1"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleCreateSession}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 
                     text-white py-2 px-4 rounded transition-colors"
          >
            {isLoading ? 'Creando...' : 'Crear Sesión'}
          </button>
          
          <button
            onClick={() => setShowJoinModal(true)}
            disabled={isLoading}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 
                     text-white py-2 px-4 rounded transition-colors"
          >
            Unirse a Sesión
          </button>
        </div>

        {showJoinModal && (
          <JoinSessionModal
            userId={userId}
            userName={userName}
            userAvatar={userAvatar}
            onClose={() => setShowJoinModal(false)}
          />
        )}
      </div>
    );
  }

  // Render in session state
  return (
    <div className={`bg-gray-800 rounded-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">
            Sesión Colaborativa
          </h3>
          <ConnectionStatus />
        </div>

        {/* Session code */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-400 text-sm">Código:</span>
          <code className="bg-gray-900 px-2 py-1 rounded text-purple-400 font-mono">
            {session?.code}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(session?.code || '')}
            className="text-gray-400 hover:text-white text-sm"
            title="Copiar código"
          >
            📋
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white 
                     py-1.5 px-3 rounded text-sm transition-colors"
          >
            Invitar
          </button>
          <button
            onClick={handleLeaveSession}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white 
                     py-1.5 px-3 rounded text-sm transition-colors"
          >
            Salir
          </button>
          {session?.ownerId === userId && (
            <button
              onClick={handleEndSession}
              className="bg-red-600 hover:bg-red-700 text-white 
                       py-1.5 px-3 rounded text-sm transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('collaborators')}
          className={`flex-1 py-2 text-sm transition-colors ${
            activeTab === 'collaborators'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Colaboradores
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-sm transition-colors ${
            activeTab === 'chat'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 text-sm transition-colors ${
            activeTab === 'log'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Historial
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'collaborators' && <CollaboratorsList />}
        {activeTab === 'chat' && <ModeratorChat />}
        {activeTab === 'log' && <ActionLogViewer />}
      </div>

      {/* Modals */}
      {showInviteModal && session && (
        <InviteModal
          sessionCode={session.code}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
