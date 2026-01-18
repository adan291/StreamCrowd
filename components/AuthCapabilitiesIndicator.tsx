import React, { useState } from 'react';
import { 
  Shield, 
  MessageSquare, 
  Users, 
  Star, 
  Crown, 
  Coins, 
  Ban,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Key,
  Wifi,
  WifiOff,
  LogIn,
  Trash2,
  Settings,
  Megaphone,
  RefreshCw,
  TrendingUp,
  Gift
} from 'lucide-react';
import { useAuth as useTwitchAuth, AuthCapabilities, AuthMode } from '../src/application/hooks/useTwitchAuth';
import { openTwitchOAuthPopup } from '../src/infrastructure/auth/TwitchOAuth';
import { getTwitchService } from '../src/application/services/TwitchService';

interface CapabilityItemProps {
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  description: string;
  onRequestAuth?: () => void;
}

const CapabilityItem: React.FC<CapabilityItemProps> = ({ name, icon, enabled, description, onRequestAuth }) => {
  const isClickable = !enabled && onRequestAuth;
  
  const content = (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
        enabled 
          ? 'bg-green-50 dark:bg-green-500/10' 
          : isClickable
            ? 'bg-zinc-100 dark:bg-zinc-800/50 opacity-80 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:opacity-100'
            : 'bg-zinc-100 dark:bg-zinc-800/50 opacity-60'
      }`}
      title={enabled ? description : `${description} - Click para activar`}
      onClick={isClickable ? onRequestAuth : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRequestAuth?.(); } : undefined}
    >
      <div className={`${enabled ? 'text-green-500' : isClickable ? 'text-blue-400' : 'text-zinc-400'}`}>
        {icon}
      </div>
      <span className={`text-xs flex-1 ${enabled ? 'text-green-700 dark:text-green-300' : isClickable ? 'text-blue-600 dark:text-blue-300' : 'text-zinc-500'}`}>
        {name}
      </span>
      {enabled ? (
        <Check size={12} className="text-green-500" />
      ) : isClickable ? (
        <RefreshCw size={12} className="text-blue-400" />
      ) : (
        <X size={12} className="text-zinc-400" />
      )}
    </div>
  );
  
  return content;
};

const getModeLabel = (mode: AuthMode): { label: string; color: string; icon: React.ReactNode } => {
  switch (mode) {
    case 'oauth':
      return { 
        label: 'OAuth', 
        color: 'bg-green-500', 
        icon: <Key size={12} /> 
      };
    case 'anonymous':
      return { 
        label: 'Anónimo', 
        color: 'bg-yellow-500', 
        icon: <Wifi size={12} /> 
      };
    case 'none':
      return { 
        label: 'Desconectado', 
        color: 'bg-zinc-500', 
        icon: <WifiOff size={12} /> 
      };
  }
};

const getCapabilityCount = (capabilities: AuthCapabilities): { enabled: number; total: number } => {
  const caps = Object.values(capabilities);
  return {
    enabled: caps.filter(Boolean).length,
    total: caps.length,
  };
};

interface AuthCapabilitiesIndicatorProps {
  compact?: boolean;
  className?: string;
  /** Callback when user successfully re-authenticates with new token */
  onReconnect?: (channel: string, token: string, userId: string) => void;
}

export const AuthCapabilitiesIndicator: React.FC<AuthCapabilitiesIndicatorProps> = ({ 
  compact = false,
  className = '',
  onReconnect,
}) => {
  const { mode, capabilities, isAuthenticated, authState, setOAuthAuth } = useTwitchAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  
  const modeInfo = getModeLabel(mode);
  const capCount = getCapabilityCount(capabilities);

  // Handler for re-authentication
  const handleRequestAuth = async () => {
    if (isReauthenticating) return;
    
    setIsReauthenticating(true);
    try {
      const result = await openTwitchOAuthPopup();
      
      // Update AuthService with new OAuth data
      setOAuthAuth({
        token: result.accessToken,
        userId: result.userId,
        channelName: result.username,
        scopes: result.scopes,
        expiresIn: result.expiresIn,
      });
      
      const currentChannel = authState.channelName || result.username;
      
      // If we have a callback, use it to update the hook state properly
      // This ensures the authToken in useTwitchService is updated
      if (onReconnect && currentChannel) {
        onReconnect(currentChannel, result.accessToken, result.userId);
      } else {
        // Fallback: directly update the TwitchService connection
        // Note: This won't update the hook state, which may cause issues
        const twitchService = getTwitchService();
        if (currentChannel) {
          twitchService.connect({
            channel: currentChannel,
            token: result.accessToken,
          });
        }
      }
    } catch (err: unknown) {
      // User cancelled popup - this is expected behavior, don't log as warning
      const error = err as { error?: string };
      if (error?.error !== 'popup_closed') {
        // Only log unexpected errors
        console.error('OAuth re-auth error:', err);
      }
      // Silently ignore popup_closed - user just closed the window
    } finally {
      setIsReauthenticating(false);
    }
  };

  // Compact version - just a badge
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white ${modeInfo.color} ${className}`}
        title={`Modo: ${modeInfo.label} (${capCount.enabled}/${capCount.total} permisos)`}
      >
        {modeInfo.icon}
        <span>{modeInfo.label}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${modeInfo.color} text-white`}>
            {modeInfo.icon}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-900 dark:text-white">
              {modeInfo.label}
            </div>
            <div className="text-[10px] text-zinc-500">
              {capCount.enabled}/{capCount.total} permisos activos
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini capability indicators */}
          <div className="flex gap-0.5">
            {capabilities.canAccessAPI && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="API" />
            )}
            {capabilities.canSendChat && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Chat" />
            )}
            {capabilities.canModerate && (
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Mod" />
            )}
          </div>
          {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-zinc-200 dark:border-zinc-700 animate-fade-in">
          {/* Scopes info */}
          {authState.scopes.length > 0 && (
            <div className="text-[10px] text-zinc-500 mb-2">
              Scopes: {authState.scopes.length}
            </div>
          )}
          
          {/* Capabilities grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <CapabilityItem
              name="Leer chat"
              icon={<MessageSquare size={14} />}
              enabled={capabilities.canReadChat}
              description="Leer mensajes del chat"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Enviar chat"
              icon={<MessageSquare size={14} />}
              enabled={capabilities.canSendChat}
              description="Enviar mensajes al chat (chat:edit)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="API Twitch"
              icon={<Shield size={14} />}
              enabled={capabilities.canAccessAPI}
              description="Acceso a la API de Twitch"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Chatters"
              icon={<Users size={14} />}
              enabled={capabilities.canReadChatters}
              description="Ver lista de usuarios en chat (moderator:read:chatters)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Suscriptores"
              icon={<Star size={14} />}
              enabled={capabilities.canReadSubscribers}
              description="Ver lista de suscriptores (channel:read:subscriptions)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="VIPs"
              icon={<Crown size={14} />}
              enabled={capabilities.canReadVIPs}
              description="Ver lista de VIPs (channel:read:vips)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Gestionar VIPs"
              icon={<Crown size={14} />}
              enabled={capabilities.canManageVIPs}
              description="Añadir/quitar VIPs (channel:manage:vips)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Ban/Timeout"
              icon={<Ban size={14} />}
              enabled={capabilities.canModerate}
              description="Banear/timeout usuarios (moderator:manage:banned_users)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Borrar mensajes"
              icon={<Trash2 size={14} />}
              enabled={capabilities.canDeleteMessages}
              description="Borrar mensajes del chat (moderator:manage:chat_messages)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Config chat"
              icon={<Settings size={14} />}
              enabled={capabilities.canManageChatSettings}
              description="Modo lento, solo subs, etc. (moderator:manage:chat_settings)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Anuncios"
              icon={<Megaphone size={14} />}
              enabled={capabilities.canSendAnnouncements}
              description="Enviar anuncios al chat (moderator:manage:announcements)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Bits"
              icon={<Coins size={14} />}
              enabled={capabilities.canReadBits}
              description="Ver leaderboard de bits (bits:read)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Predicciones"
              icon={<TrendingUp size={14} />}
              enabled={capabilities.canManagePredictions}
              description="Crear y gestionar predicciones (channel:manage:predictions)"
              onRequestAuth={handleRequestAuth}
            />
            <CapabilityItem
              name="Channel Points"
              icon={<Gift size={14} />}
              enabled={capabilities.canManageRedemptions}
              description="Gestionar recompensas y canjes (channel:manage:redemptions)"
              onRequestAuth={handleRequestAuth}
            />
          </div>

          {/* Re-auth button when authenticated but missing scopes */}
          {isAuthenticated && capCount.enabled < capCount.total && (
            <button
              onClick={handleRequestAuth}
              disabled={isReauthenticating}
              className="w-full mt-2 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              <p className="text-[10px] text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
                {isReauthenticating ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Re-autenticando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    Re-autenticar para activar permisos faltantes
                  </>
                )}
              </p>
            </button>
          )}

          {/* Help text */}
          {!isAuthenticated && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
              <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <LogIn size={12} />
                Inicia sesión con Twitch para desbloquear todas las funciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthCapabilitiesIndicator;
