/**
 * BroadcasterAuthPanel - Panel para autorización de broadcaster
 * 
 * Este componente permite:
 * 1. Al streamer: Autorizar la app con todos los permisos necesarios
 * 2. A los moderadores: Ver si el streamer ha autorizado y qué pueden hacer
 * 
 * FLUJO:
 * - Si el usuario es el broadcaster del canal actual → mostrar botón para autorizar
 * - Si el usuario es moderador → mostrar estado de autorización del broadcaster
 */

import React, { useState, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Info,
  Crown,
  Users,
} from 'lucide-react';
import {
  buildBroadcasterAuthUrl,
} from '../src/application/services/BroadcasterTokenService';
import { useBroadcasterToken, BROADCASTER_SCOPES } from '../src/application/hooks/useBroadcasterToken';

// ============================================
// Types
// ============================================

interface BroadcasterAuthPanelProps {
  /** ID del canal actual */
  channelId: string;
  /** Login del canal */
  channelLogin: string;
  /** Nombre del canal */
  channelName: string;
  /** ID del usuario logueado */
  currentUserId: string;
  /** Token del usuario logueado */
  currentUserToken: string;
  /** Scopes del usuario logueado */
  currentUserScopes: string[];
  /** Callback cuando se autoriza exitosamente */
  onAuthSuccess?: () => void;
  /** Callback para mostrar notificaciones */
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ============================================
// Constants
// ============================================

const REDIRECT_URI = typeof window !== 'undefined' 
  ? `${window.location.origin}/auth/callback`
  : 'http://localhost:5173/auth/callback';

// ============================================
// Component
// ============================================

export const BroadcasterAuthPanel: React.FC<BroadcasterAuthPanelProps> = ({
  channelId,
  channelLogin,
  channelName,
  currentUserId,
  currentUserToken,
  currentUserScopes,
  onAuthSuccess,
  onNotification,
}) => {
  const [isValidating, setIsValidating] = useState(false);

  const {
    broadcasterToken,
    hasBroadcasterToken,
    isOwnChannel,
    canCreatePredictions,
    canCreatePolls,
    canStartRaids,
    validateToken,
    storeBroadcasterToken,
  } = useBroadcasterToken(channelId, channelLogin, channelName, currentUserId);

  // ============================================
  // Handlers
  // ============================================

  /**
   * Iniciar flujo OAuth para el broadcaster
   */
  const handleAuthorize = useCallback(() => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_broadcaster_id', channelId);
    sessionStorage.setItem('oauth_broadcaster_login', channelLogin);
    sessionStorage.setItem('oauth_broadcaster_name', channelName);

    const authUrl = buildBroadcasterAuthUrl(state, REDIRECT_URI);
    
    // Abrir en popup
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'twitch_auth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    // Escuchar mensaje del popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'TWITCH_AUTH_SUCCESS') {
        const { accessToken, scopes, expiresIn } = event.data;
        
        const success = await storeBroadcasterToken({
          accessToken,
          scopes: scopes || [],
          expiresIn,
        });

        if (success) {
          onNotification?.('¡Autorización completada! Los moderadores ahora pueden crear predicciones.', 'success');
          onAuthSuccess?.();
        } else {
          onNotification?.('Error al guardar la autorización', 'error');
        }
        
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'TWITCH_AUTH_ERROR') {
        onNotification?.(event.data.error || 'Error en la autorización', 'error');
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Limpiar si el popup se cierra
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  }, [channelId, channelLogin, channelName, storeBroadcasterToken, onAuthSuccess, onNotification]);

  /**
   * Validar token existente
   */
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const result = await validateToken();
      if (result.valid) {
        onNotification?.('Token válido', 'success');
      } else {
        onNotification?.(result.error || 'Token inválido o expirado', 'error');
      }
    } finally {
      setIsValidating(false);
    }
  }, [validateToken, onNotification]);

  /**
   * Si el usuario actual es el broadcaster, guardar su token automáticamente
   */
  const handleSaveOwnToken = useCallback(async () => {
    if (!isOwnChannel) return;

    const success = await storeBroadcasterToken({
      accessToken: currentUserToken,
      scopes: currentUserScopes,
    });

    if (success) {
      onNotification?.('Token guardado. Los moderadores ahora pueden usar tus permisos.', 'success');
    } else {
      onNotification?.('Error al guardar el token', 'error');
    }
  }, [isOwnChannel, currentUserToken, currentUserScopes, storeBroadcasterToken, onNotification]);

  // ============================================
  // Render Helpers
  // ============================================

  const renderCapabilityItem = (
    label: string,
    enabled: boolean,
    scope: string
  ) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        {enabled ? (
          <CheckCircle size={14} className="text-green-400" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
        <code className="text-xs text-gray-500">{scope}</code>
      </div>
    </div>
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-purple-400" />
        <h3 className="font-semibold text-white">Permisos de Broadcaster</h3>
      </div>

      {/* Info sobre el canal */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {isOwnChannel ? (
          <>
            <Crown size={14} className="text-yellow-400" />
            <span>Este es tu canal</span>
          </>
        ) : (
          <>
            <Users size={14} className="text-blue-400" />
            <span>Moderando: <strong className="text-white">{channelName}</strong></span>
          </>
        )}
      </div>

      {/* Estado de autorización */}
      {isOwnChannel ? (
        // Vista para el broadcaster
        <div className="space-y-3">
          <div className="bg-gray-700/50 rounded p-3">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                Autoriza la app para que tus moderadores puedan crear predicciones, 
                polls y otras acciones desde Stream Crowd.
              </p>
            </div>
          </div>

          {hasBroadcasterToken ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={16} />
                <span className="text-sm">App autorizada</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />
                  Verificar
                </button>
                <button
                  onClick={handleAuthorize}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm transition-colors"
                >
                  <ExternalLink size={14} />
                  Reautorizar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleSaveOwnToken}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded font-medium transition-colors"
              >
                <Shield size={16} />
                Autorizar para moderadores
              </button>
              <p className="text-xs text-gray-500 text-center">
                Esto permite que tus mods creen predicciones/polls desde la app
              </p>
            </div>
          )}
        </div>
      ) : (
        // Vista para moderadores
        <div className="space-y-3">
          {hasBroadcasterToken ? (
            <>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={16} />
                <span className="text-sm">El streamer ha autorizado la app</span>
              </div>

              {/* Capacidades disponibles */}
              <div className="bg-gray-700/50 rounded p-3 space-y-1">
                <p className="text-xs text-gray-400 mb-2">Acciones disponibles:</p>
                {renderCapabilityItem('Predicciones', canCreatePredictions, BROADCASTER_SCOPES.predictions)}
                {renderCapabilityItem('Polls', canCreatePolls, BROADCASTER_SCOPES.polls)}
                {renderCapabilityItem('Raids', canStartRaids, BROADCASTER_SCOPES.raids)}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle size={16} />
                <span className="text-sm">El streamer no ha autorizado la app</span>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
                <p className="text-sm text-yellow-200">
                  Para crear predicciones y polls, <strong>{channelName}</strong> debe 
                  iniciar sesión en Stream Crowd y autorizar la app.
                </p>
              </div>

              <div className="text-xs text-gray-500">
                <p>Mientras tanto, puedes usar las acciones de moderador:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Anuncios</li>
                  <li>Shoutouts</li>
                  <li>Slow mode / Emote-only</li>
                  <li>Timeouts / Bans</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scopes del token guardado */}
      {broadcasterToken && broadcasterToken.scopes && (
        <details className="text-xs">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
            Ver scopes autorizados ({broadcasterToken.scopes.length})
          </summary>
          <div className="mt-2 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
            <code className="text-gray-400 whitespace-pre-wrap">
              {broadcasterToken.scopes.join('\n')}
            </code>
          </div>
        </details>
      )}
    </div>
  );
};

export default BroadcasterAuthPanel;
