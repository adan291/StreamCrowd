/**
 * OfflineIndicator - Componente visual para mostrar el estado de conexión
 * 
 * Este componente muestra un banner cuando el usuario está offline,
 * un mensaje de reconexión cuando vuelve online, y el número de
 * operaciones pendientes de sincronizar.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CloudOff, Check } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useI18n } from '../i18n/context';

// ============ TYPES ============

export interface OfflineIndicatorProps {
  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;
  
  /**
   * Duración en ms del mensaje de reconexión (default: 3000)
   */
  reconnectMessageDuration?: number;
  
  /**
   * Callback cuando el estado de conexión cambia
   */
  onStatusChange?: (isOnline: boolean) => void;
}

// ============ COMPONENT ============

/**
 * Componente que muestra el estado de conexión y operaciones pendientes
 * 
 * @example
 * ```tsx
 * <OfflineIndicator />
 * ```
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  reconnectMessageDuration = 3000,
  onStatusChange
}) => {
  const { t } = useI18n();
  const { isOnline, isOffline } = useOfflineStatus();
  const { pendingCount, hasPending, isProcessing } = useSyncQueue();
  
  // Track if we just reconnected to show the reconnection message
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Handle status change callback
  useEffect(() => {
    onStatusChange?.(isOnline);
  }, [isOnline, onStatusChange]);

  // Track offline state to detect reconnection
  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline && isOnline) {
      // Just reconnected
      setShowReconnected(true);
      setWasOffline(false);
      
      // Hide reconnection message after duration
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, reconnectMessageDuration);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, isOffline, wasOffline, reconnectMessageDuration]);

  // Get offline translations with fallback
  const offlineText = t.offline || {
    offlineBanner: 'Sin conexión a internet',
    reconnected: '¡Conexión restablecida!',
    pendingOperations: 'operaciones pendientes',
    pendingOperation: 'operación pendiente',
    syncing: 'Sincronizando...'
  };

  // Don't render anything if online and no pending operations and not showing reconnected
  if (isOnline && !hasPending && !showReconnected) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Offline Banner - Requirements 3.1 */}
      {isOffline && (
        <div 
          className="bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-fade-in-down"
          role="alert"
          aria-label={offlineText.offlineBanner}
        >
          <WifiOff size={18} className="shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            {offlineText.offlineBanner}
          </span>
          
          {/* Pending operations count - Requirements 3.3 */}
          {hasPending && (
            <span className="ml-2 bg-amber-700 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} {pendingCount === 1 
                ? offlineText.pendingOperation 
                : offlineText.pendingOperations}
            </span>
          )}
        </div>
      )}

      {/* Reconnection Message - Requirements 3.2 */}
      {showReconnected && isOnline && (
        <div 
          className="bg-green-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-fade-in-down"
          role="status"
        >
          <Check size={18} className="shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            {offlineText.reconnected}
          </span>
        </div>
      )}

      {/* Syncing indicator when online with pending operations - Requirements 3.4 */}
      {isOnline && hasPending && !showReconnected && (
        <div 
          className="bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-fade-in-down"
          role="status"
        >
          <RefreshCw 
            size={18} 
            className={`shrink-0 ${isProcessing ? 'animate-spin' : ''}`} 
            aria-hidden="true" 
          />
          <span className="text-sm font-medium">
            {isProcessing 
              ? offlineText.syncing 
              : `${pendingCount} ${pendingCount === 1 
                  ? offlineText.pendingOperation 
                  : offlineText.pendingOperations}`
            }
          </span>
        </div>
      )}
    </div>
  );
};

// ============ COMPACT VARIANT ============

export interface OfflineIndicatorCompactProps {
  className?: string;
}

/**
 * Versión compacta del indicador para usar en headers o sidebars
 * 
 * @example
 * ```tsx
 * <OfflineIndicatorCompact />
 * ```
 */
export const OfflineIndicatorCompact: React.FC<OfflineIndicatorCompactProps> = ({
  className = ''
}) => {
  const { isOnline, isOffline } = useOfflineStatus();
  const { pendingCount, hasPending, isProcessing } = useSyncQueue();
  const { t } = useI18n();

  // Get offline translations with fallback
  const offlineText = t.offline || {
    offline: 'Offline',
    online: 'Online',
    syncing: 'Sincronizando'
  };

  if (isOnline && !hasPending) {
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <CloudOff size={14} className="text-amber-500" aria-hidden="true" />
          <span className="text-xs text-amber-500 font-medium">
            {offlineText.offline}
          </span>
        </>
      ) : hasPending ? (
        <>
          <RefreshCw 
            size={14} 
            className={`text-blue-500 ${isProcessing ? 'animate-spin' : ''}`} 
            aria-hidden="true" 
          />
          <span className="text-xs text-blue-500 font-medium">
            {isProcessing ? offlineText.syncing : pendingCount}
          </span>
        </>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
