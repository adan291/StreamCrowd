/**
 * useBroadcasterToken - Hook para gestionar tokens de broadcaster
 * 
 * Permite a los moderadores ejecutar acciones que requieren el token
 * del broadcaster (predicciones, polls, raids, etc.)
 * 
 * Los tokens se almacenan en Firebase para que sean accesibles
 * desde cualquier dispositivo/navegador.
 * 
 * @module src/application/hooks/useBroadcasterToken
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BroadcasterTokenService,
  BROADCASTER_SCOPES,
  type StoredBroadcasterToken,
  type TokenVerificationResult,
} from '../services/BroadcasterTokenService';

// ============================================
// Types
// ============================================

export interface UseBroadcasterTokenReturn {
  /** Token del broadcaster actual (si está disponible) */
  broadcasterToken: StoredBroadcasterToken | null;
  /** Si tenemos token del broadcaster para el canal seleccionado */
  hasBroadcasterToken: boolean;
  /** Si el usuario actual es el broadcaster */
  isOwnChannel: boolean;
  /** Si puede crear predicciones (tiene token + scope) */
  canCreatePredictions: boolean;
  /** Si puede crear polls (tiene token + scope) */
  canCreatePolls: boolean;
  /** Si puede iniciar raids (tiene token + scope) */
  canStartRaids: boolean;
  /** Si está cargando datos de Firebase */
  isLoading: boolean;
  /** Obtener token para una acción específica */
  getTokenForAction: (requiredScopes: string[]) => Promise<{ token: string } | { error: string }>;
  /** Validar el token del broadcaster */
  validateToken: () => Promise<TokenVerificationResult>;
  /** Guardar token del broadcaster (cuando el streamer autoriza) */
  storeBroadcasterToken: (data: {
    accessToken: string;
    scopes: string[];
    expiresIn?: number;
  }) => Promise<boolean>;
  /** Mensaje de error/info para mostrar al usuario */
  statusMessage: string | null;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook para gestionar tokens de broadcaster
 * 
 * @param broadcasterId - ID del canal/broadcaster actual
 * @param broadcasterLogin - Login del broadcaster
 * @param broadcasterName - Display name del broadcaster
 * @param currentUserId - ID del usuario logueado
 * 
 * @example
 * ```tsx
 * const {
 *   canCreatePredictions,
 *   getTokenForAction,
 *   statusMessage,
 *   isLoading,
 * } = useBroadcasterToken(channelId, channelLogin, channelName, userId);
 * 
 * const handleCreatePrediction = async () => {
 *   const result = await getTokenForAction([BROADCASTER_SCOPES.predictions]);
 *   if ('error' in result) {
 *     showError(result.error);
 *     return;
 *   }
 *   // Usar result.token para la API
 * };
 * ```
 */
export function useBroadcasterToken(
  broadcasterId: string | null,
  broadcasterLogin: string | null,
  broadcasterName: string | null,
  currentUserId: string | null
): UseBroadcasterTokenReturn {
  // State
  const [broadcasterToken, setBroadcasterToken] = useState<StoredBroadcasterToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState({
    canCreatePredictions: false,
    canCreatePolls: false,
    canStartRaids: false,
  });

  // Computed values
  const isOwnChannel = !!(broadcasterId && currentUserId && broadcasterId === currentUserId);
  const hasBroadcasterToken = broadcasterToken !== null;

  // Subscribe to token changes from Firebase
  useEffect(() => {
    if (!broadcasterId) {
      setBroadcasterToken(null);
      setIsLoading(false);
      setStatusMessage(null);
      setCapabilities({
        canCreatePredictions: false,
        canCreatePolls: false,
        canStartRaids: false,
      });
      return;
    }

    setIsLoading(true);

    // Subscribe to real-time updates from Firebase
    const unsubscribe = BroadcasterTokenService.subscribeToToken(
      broadcasterId,
      (token) => {
        setBroadcasterToken(token);
        setIsLoading(false);

        if (isOwnChannel) {
          // User is the broadcaster - can do everything with their own token
          setCapabilities({
            canCreatePredictions: true,
            canCreatePolls: true,
            canStartRaids: true,
          });
          setStatusMessage(null);
        } else if (token) {
          // Moderator with broadcaster token available
          const canPredictions = token.scopes.includes(BROADCASTER_SCOPES.predictions);
          const canPolls = token.scopes.includes(BROADCASTER_SCOPES.polls);
          const canRaids = token.scopes.includes(BROADCASTER_SCOPES.raids);

          setCapabilities({
            canCreatePredictions: canPredictions,
            canCreatePolls: canPolls,
            canStartRaids: canRaids,
          });

          if (!canPredictions && !canPolls) {
            setStatusMessage('El streamer necesita reconectar con más permisos.');
          } else {
            setStatusMessage(null);
          }
        } else {
          // Moderator without broadcaster token
          setCapabilities({
            canCreatePredictions: false,
            canCreatePolls: false,
            canStartRaids: false,
          });
          setStatusMessage(
            'Para crear predicciones/polls, el streamer debe autorizar Stream Crowd.'
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [broadcasterId, isOwnChannel]);

  /**
   * Obtener token para ejecutar una acción
   */
  const getTokenForAction = useCallback(async (
    requiredScopes: string[]
  ): Promise<{ token: string } | { error: string }> => {
    if (!broadcasterId) {
      return { error: 'No hay canal seleccionado' };
    }

    // Si es el propio canal, el token del usuario actual debería funcionar
    if (isOwnChannel) {
      return { error: 'USE_OWN_TOKEN' }; // Señal para usar el token del usuario
    }

    return BroadcasterTokenService.getTokenForAction(broadcasterId, requiredScopes);
  }, [broadcasterId, isOwnChannel]);

  /**
   * Validar el token del broadcaster
   */
  const validateToken = useCallback(async (): Promise<TokenVerificationResult> => {
    if (!broadcasterId) {
      return { valid: false, error: 'No broadcaster selected' };
    }
    return BroadcasterTokenService.validateToken(broadcasterId);
  }, [broadcasterId]);

  /**
   * Guardar token del broadcaster
   */
  const storeBroadcasterToken = useCallback(async (data: {
    accessToken: string;
    scopes: string[];
    expiresIn?: number;
  }): Promise<boolean> => {
    if (!broadcasterId || !broadcasterLogin || !broadcasterName) {
      console.error('[useBroadcasterToken] Cannot store token: missing broadcaster info');
      return false;
    }

    const success = await BroadcasterTokenService.storeBroadcasterToken({
      broadcasterId,
      broadcasterLogin,
      broadcasterName,
      ...data,
    });

    return success;
  }, [broadcasterId, broadcasterLogin, broadcasterName]);

  return {
    broadcasterToken,
    hasBroadcasterToken,
    isOwnChannel,
    canCreatePredictions: isOwnChannel || capabilities.canCreatePredictions,
    canCreatePolls: isOwnChannel || capabilities.canCreatePolls,
    canStartRaids: isOwnChannel || capabilities.canStartRaids,
    isLoading,
    getTokenForAction,
    validateToken,
    storeBroadcasterToken,
    statusMessage,
  };
}

// Re-export scopes for convenience
export { BROADCASTER_SCOPES };

export default useBroadcasterToken;
