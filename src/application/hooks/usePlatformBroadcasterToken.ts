/**
 * usePlatformBroadcasterToken - Hook for managing broadcaster tokens across platforms
 * 
 * Extends the useBroadcasterToken concept to support multiple platforms (Twitch, YouTube, Kick).
 * Allows moderators to execute actions that require the broadcaster's token
 * (predictions, polls, raids, etc.)
 * 
 * @requirements 2.6 - WHEN the toggle is set to OFF, THE Platform_Adapter SHALL disconnect but THE Token_Storage SHALL retain the credentials
 * @requirements 2.7 - WHEN the toggle is set to ON for a platform with stored credentials, THE Platform_Adapter SHALL automatically reconnect
 * @module src/application/hooks/usePlatformBroadcasterToken
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Platform } from '../../../types/platform';
import {
  PlatformBroadcasterTokenService,
  PLATFORM_BROADCASTER_SCOPES,
  type StoredBroadcasterToken,
  type BroadcasterCapabilities,
  type TokenVerificationResult,
} from '../services/PlatformBroadcasterTokenService';

// ============================================
// Types
// ============================================

/**
 * Return type for usePlatformBroadcasterToken hook
 */
export interface UsePlatformBroadcasterTokenReturn {
  /** Token del broadcaster actual (si está disponible) */
  broadcasterToken: StoredBroadcasterToken | null;
  /** Si tenemos token del broadcaster para el canal seleccionado */
  hasBroadcasterToken: boolean;
  /** Si el usuario actual es el broadcaster */
  isOwnChannel: boolean;
  /** Capacidades disponibles basadas en los scopes del token */
  capabilities: BroadcasterCapabilities;
  /** Si puede crear predicciones (tiene token + scope) - Solo Twitch */
  canCreatePredictions: boolean;
  /** Si puede crear polls (tiene token + scope) */
  canCreatePolls: boolean;
  /** Si puede iniciar raids (tiene token + scope) - Solo Twitch */
  canStartRaids: boolean;
  /** Si puede gestionar rewards (tiene token + scope) - Solo Twitch */
  canManageRewards: boolean;
  /** Si puede moderar el chat */
  canModerateChat: boolean;
  /** Si puede gestionar el broadcast - Solo YouTube */
  canManageBroadcast: boolean;
  /** Si está cargando datos de Firebase */
  isLoading: boolean;
  /** Obtener token para una acción específica */
  getTokenForAction: (requiredScopes: string[]) => Promise<{ token: string } | { error: string }>;
  /** Validar el token del broadcaster */
  validateToken: () => Promise<TokenVerificationResult>;
  /** Guardar token del broadcaster (cuando el streamer autoriza) */
  storeBroadcasterToken: (data: {
    accessToken: string;
    refreshToken?: string;
    scopes: string[];
    expiresIn?: number;
  }) => Promise<boolean>;
  /** Eliminar token del broadcaster */
  removeBroadcasterToken: () => Promise<void>;
  /** Mensaje de error/info para mostrar al usuario */
  statusMessage: string | null;
}

// ============================================
// Constants
// ============================================

const DEFAULT_CAPABILITIES: BroadcasterCapabilities = {
  canCreatePolls: false,
  canCreatePredictions: false,
  canStartRaids: false,
  canManageRewards: false,
  canModerateChat: false,
  canManageBroadcast: false,
};

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook para gestionar tokens de broadcaster en múltiples plataformas
 * 
 * @param platform - Plataforma (twitch, youtube, kick)
 * @param broadcasterId - ID del canal/broadcaster actual
 * @param broadcasterLogin - Login del broadcaster
 * @param broadcasterName - Display name del broadcaster
 * @param currentUserId - ID del usuario logueado
 * 
 * @example
 * ```tsx
 * const {
 *   canCreatePredictions,
 *   canCreatePolls,
 *   getTokenForAction,
 *   statusMessage,
 *   isLoading,
 * } = usePlatformBroadcasterToken('twitch', channelId, channelLogin, channelName, userId);
 * 
 * const handleCreatePrediction = async () => {
 *   const result = await getTokenForAction([PLATFORM_BROADCASTER_SCOPES.twitch.predictions]);
 *   if ('error' in result) {
 *     showError(result.error);
 *     return;
 *   }
 *   // Usar result.token para la API
 * };
 * ```
 */
export function usePlatformBroadcasterToken(
  platform: Platform,
  broadcasterId: string | null,
  broadcasterLogin: string | null,
  broadcasterName: string | null,
  currentUserId: string | null
): UsePlatformBroadcasterTokenReturn {
  // State
  const [broadcasterToken, setBroadcasterToken] = useState<StoredBroadcasterToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BroadcasterCapabilities>(DEFAULT_CAPABILITIES);

  const mountedRef = useRef(true);

  // Computed values
  const isOwnChannel = !!(broadcasterId && currentUserId && broadcasterId === currentUserId);
  const hasBroadcasterToken = broadcasterToken !== null;

  // Subscribe to token changes from Firebase
  useEffect(() => {
    mountedRef.current = true;

    if (!broadcasterId) {
      setBroadcasterToken(null);
      setIsLoading(false);
      setStatusMessage(null);
      setCapabilities(DEFAULT_CAPABILITIES);
      return;
    }

    setIsLoading(true);

    // Subscribe to real-time updates from Firebase
    const unsubscribe = PlatformBroadcasterTokenService.subscribeToToken(
      platform,
      broadcasterId,
      async (token) => {
        if (!mountedRef.current) return;

        setBroadcasterToken(token);
        setIsLoading(false);

        if (isOwnChannel) {
          // User is the broadcaster - can do everything with their own token
          // Set capabilities based on platform
          const platformScopes = PLATFORM_BROADCASTER_SCOPES[platform];
          setCapabilities({
            canCreatePolls: !!platformScopes.polls,
            canCreatePredictions: !!platformScopes.predictions,
            canStartRaids: !!platformScopes.raids,
            canManageRewards: !!platformScopes.rewards,
            canModerateChat: true,
            canManageBroadcast: !!platformScopes.broadcast,
          });
          setStatusMessage(null);
        } else if (token) {
          // Moderator with broadcaster token available
          const caps = await PlatformBroadcasterTokenService.getCapabilities(platform, broadcasterId);
          
          if (mountedRef.current) {
            setCapabilities(caps);

            // Check if missing important capabilities
            const platformScopes = PLATFORM_BROADCASTER_SCOPES[platform];
            const missingCapabilities: string[] = [];

            if (platformScopes.predictions && !caps.canCreatePredictions) {
              missingCapabilities.push('predicciones');
            }
            if (platformScopes.polls && !caps.canCreatePolls) {
              missingCapabilities.push('encuestas');
            }

            if (missingCapabilities.length > 0) {
              setStatusMessage(`El streamer necesita reconectar con más permisos para: ${missingCapabilities.join(', ')}.`);
            } else {
              setStatusMessage(null);
            }
          }
        } else {
          // Moderator without broadcaster token
          setCapabilities(DEFAULT_CAPABILITIES);
          setStatusMessage(
            'Para usar herramientas avanzadas, el streamer debe autorizar Stream Crowd.'
          );
        }
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [platform, broadcasterId, isOwnChannel]);

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

    return PlatformBroadcasterTokenService.getTokenForAction(platform, broadcasterId, requiredScopes);
  }, [platform, broadcasterId, isOwnChannel]);

  /**
   * Validar el token del broadcaster
   */
  const validateToken = useCallback(async (): Promise<TokenVerificationResult> => {
    if (!broadcasterId) {
      return { valid: false, error: 'No broadcaster selected' };
    }
    return PlatformBroadcasterTokenService.validateToken(platform, broadcasterId);
  }, [platform, broadcasterId]);

  /**
   * Guardar token del broadcaster
   */
  const storeBroadcasterToken = useCallback(async (data: {
    accessToken: string;
    refreshToken?: string;
    scopes: string[];
    expiresIn?: number;
  }): Promise<boolean> => {
    if (!broadcasterId || !broadcasterLogin || !broadcasterName) {
      console.error('[usePlatformBroadcasterToken] Cannot store token: missing broadcaster info');
      return false;
    }

    const success = await PlatformBroadcasterTokenService.storeBroadcasterToken(platform, {
      broadcasterId,
      broadcasterLogin,
      broadcasterName,
      ...data,
    });

    return success;
  }, [platform, broadcasterId, broadcasterLogin, broadcasterName]);

  /**
   * Eliminar token del broadcaster
   */
  const removeBroadcasterToken = useCallback(async (): Promise<void> => {
    if (!broadcasterId) {
      console.error('[usePlatformBroadcasterToken] Cannot remove token: missing broadcaster ID');
      return;
    }

    await PlatformBroadcasterTokenService.removeBroadcasterToken(platform, broadcasterId);
  }, [platform, broadcasterId]);

  return {
    broadcasterToken,
    hasBroadcasterToken,
    isOwnChannel,
    capabilities,
    canCreatePredictions: isOwnChannel ? !!PLATFORM_BROADCASTER_SCOPES[platform].predictions : capabilities.canCreatePredictions,
    canCreatePolls: isOwnChannel ? !!PLATFORM_BROADCASTER_SCOPES[platform].polls : capabilities.canCreatePolls,
    canStartRaids: isOwnChannel ? !!PLATFORM_BROADCASTER_SCOPES[platform].raids : capabilities.canStartRaids,
    canManageRewards: isOwnChannel ? !!PLATFORM_BROADCASTER_SCOPES[platform].rewards : capabilities.canManageRewards,
    canModerateChat: isOwnChannel || capabilities.canModerateChat,
    canManageBroadcast: isOwnChannel ? !!PLATFORM_BROADCASTER_SCOPES[platform].broadcast : capabilities.canManageBroadcast,
    isLoading,
    getTokenForAction,
    validateToken,
    storeBroadcasterToken,
    removeBroadcasterToken,
    statusMessage,
  };
}

// ============================================
// Re-exports
// ============================================

export { PLATFORM_BROADCASTER_SCOPES };

export default usePlatformBroadcasterToken;
