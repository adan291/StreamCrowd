import React, { useState } from 'react';
import { CollaborationChannel } from '../types';
import { Users, Plus, X, Loader2, Link2, Unlink } from 'lucide-react';
import { useI18n } from '../i18n';

interface CollaborationPanelProps {
  mainChannel: string;
  collaborationChannels: CollaborationChannel[];
  /** May return void when the caller does not report the result (treated as success) */
  onAddCollaborator: (channel: string) => Promise<CollaborationChannel | null> | void;
  onRemoveCollaborator: (channel: string) => void;
  isConnected: boolean;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  mainChannel,
  collaborationChannels,
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected,
}) => {
  const { t } = useI18n();
  const [newChannel, setNewChannel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded so users can see it

  const handleAddCollaborator = async () => {
    if (!newChannel.trim() || isAdding) return;
    
    setIsAdding(true);
    setError(null);
    
    try {
      const result = await onAddCollaborator(newChannel.trim());
      if (result || result === undefined) {
        setNewChannel('');
      } else {
        setError(t.collaboration?.errorAdding || 'No se pudo agregar el canal');
      }
    } catch (err) {
      setError(t.collaboration?.errorAdding || 'Error al conectar');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCollaborator();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3 p-6">
        <Users size={32} className="opacity-50" />
        <p className="text-sm text-center">{t.collaboration?.helpText || 'Conecta a un canal para gestionar colaboraciones'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-zinc-800/80 rounded-lg border-2 border-cyan-500/30 dark:border-cyan-500/20 overflow-hidden shadow-sm">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-cyan-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t.collaboration?.title || 'Colaboración'}
          </span>
          {collaborationChannels.length > 0 && (
            <span className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
              +{collaborationChannels.length}
            </span>
          )}
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-zinc-400">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 animate-fade-in">
          {/* Main channel indicator */}
          <div className="flex items-center gap-2 p-2 bg-twitch-brand/10 rounded-lg border border-twitch-brand/20">
            <div 
              className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-800" 
              style={{ backgroundColor: '#a970ff' }}
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-1">
              {mainChannel}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-twitch-brand font-bold">
              {t.collaboration?.mainChannel || 'Principal'}
            </span>
          </div>

          {/* Collaboration channels list */}
          {collaborationChannels.length > 0 && (
            <div className="space-y-1.5">
              {collaborationChannels.map((channel) => (
                <div 
                  key={channel.name}
                  className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg group"
                >
                  <div 
                    className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-800" 
                    style={{ backgroundColor: channel.color }}
                  />
                  <Link2 size={12} className="text-zinc-400" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 flex-1">
                    {channel.name}
                  </span>
                  <button
                    onClick={() => onRemoveCollaborator(channel.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-all"
                    title={t.collaboration?.remove || 'Quitar'}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new collaborator */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.collaboration?.placeholder || 'Canal colaborador...'}
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light placeholder:text-zinc-400"
              disabled={isAdding}
            />
            <button
              onClick={handleAddCollaborator}
              disabled={!newChannel.trim() || isAdding}
              className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isAdding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <Unlink size={12} />
              {error}
            </p>
          )}

          {/* Help text */}
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            {t.collaboration?.helpText || 'Agrega canales de streamers colaboradores para ver sus mensajes y votos en tiempo real.'}
          </p>
        </div>
      )}
    </div>
  );
};
