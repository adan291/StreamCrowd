/**
 * CloudSyncButton - Botón de sincronización con la nube
 * 
 * Muestra estado de sincronización y permite activar/desactivar sync
 * Migrated to use Redux state management
 * 
 * @requirements 3.5, 3.6 - Cloud sync integration with Redux
 */

import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useGiveaway } from '../../src/application/hooks/useGiveaway';

interface CloudSyncButtonProps {
  // Optional props for backward compatibility
  isReady?: boolean;
  isSyncing?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  syncEnabled?: boolean;
  lastSyncTime?: number | null;
  error?: string | null;
  onToggleSync?: (enabled: boolean) => void;
  onManualSync?: () => void;
}

export const CloudSyncButton: React.FC<CloudSyncButtonProps> = (props) => {
  const [showMenu, setShowMenu] = useState(false);
  
  // Use Redux state if props not provided (new behavior)
  const giveaway = useGiveaway();
  
  // Use props if provided (backward compatibility), otherwise use Redux state
  const isReady = props.isReady ?? true; // Assume ready if using Redux
  const isSyncing = props.isSyncing ?? false; // TODO: Add syncing state to Redux
  const syncStatus = props.syncStatus ?? (giveaway.cloudSyncEnabled ? 'synced' : 'idle');
  const syncEnabled = props.syncEnabled ?? giveaway.cloudSyncEnabled;
  const lastSyncTime = props.lastSyncTime ?? (giveaway.lastSyncedAt ? new Date(giveaway.lastSyncedAt).getTime() : null);
  const error = props.error ?? giveaway.error;
  
  const onToggleSync = props.onToggleSync ?? ((enabled: boolean) => {
    if (enabled) {
      giveaway.enableCloudSync();
    } else {
      giveaway.disableCloudSync();
    }
  });
  
  const onManualSync = props.onManualSync ?? (() => {
    giveaway.updateLastSynced();
  });

  const getStatusIcon = () => {
    if (!isReady) return <CloudOff size={16} className="text-zinc-400" />;
    if (isSyncing) return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    if (syncStatus === 'error') return <AlertCircle size={16} className="text-red-500" />;
    if (syncStatus === 'synced') return <Check size={16} className="text-green-500" />;
    if (!syncEnabled) return <CloudOff size={16} className="text-zinc-400" />;
    return <Cloud size={16} className="text-blue-500" />;
  };

  const getStatusText = () => {
    if (!isReady) return 'Sin conexión (inicia sesión con Twitch)';
    if (isSyncing) return 'Sincronizando...';
    if (syncStatus === 'error') return error || 'Error de sincronización';
    if (syncStatus === 'synced') {
      if (lastSyncTime) {
        const ago = Math.floor((Date.now() - lastSyncTime) / 1000);
        if (ago < 60) return `Sincronizado hace ${ago}s`;
        if (ago < 3600) return `Sincronizado hace ${Math.floor(ago / 60)}m`;
        return `Sincronizado hace ${Math.floor(ago / 3600)}h`;
      }
      return 'Sincronizado';
    }
    if (!syncEnabled) return 'Sincronización desactivada';
    return 'Listo para sincronizar';
  };

  const getButtonColor = () => {
    if (!isReady || !syncEnabled) return 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800';
    if (syncStatus === 'error') return 'text-red-500 hover:bg-red-500/10';
    if (syncStatus === 'synced') return 'text-green-500 hover:bg-green-500/10';
    if (isSyncing) return 'text-blue-500 hover:bg-blue-500/10';
    return 'text-blue-500 hover:bg-blue-500/10';
  };

  return (
    <div className="relative">
      <Tooltip content={getStatusText()}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`p-1.5 rounded-lg transition-colors ${getButtonColor()}`}
          disabled={isSyncing}
        >
          {getStatusIcon()}
        </button>
      </Tooltip>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-50 overflow-hidden">
            {/* Status header */}
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1">
              {/* Toggle sync */}
              <button
                onClick={() => {
                  onToggleSync(!syncEnabled);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {syncEnabled ? (
                  <>
                    <CloudOff size={14} />
                    <span>Desactivar sincronización</span>
                  </>
                ) : (
                  <>
                    <Cloud size={14} />
                    <span>Activar sincronización</span>
                  </>
                )}
              </button>

              {/* Manual sync */}
              {isReady && syncEnabled && (
                <button
                  onClick={() => {
                    onManualSync();
                    setShowMenu(false);
                  }}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>Sincronizar ahora</span>
                </button>
              )}
            </div>

            {/* Info footer */}
            {isReady && lastSyncTime && (
              <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">
                  Última sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Not logged in message */}
            {!isReady && (
              <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500">
                  Inicia sesión con Twitch para sincronizar tus sorteos en la nube
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CloudSyncButton;
