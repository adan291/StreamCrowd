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
  Megaphone
} from 'lucide-react';
import { useAuth, AuthCapabilities, AuthMode } from '../src/application/hooks/useAuth';

interface CapabilityItemProps {
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  description: string;
}

const CapabilityItem: React.FC<CapabilityItemProps> = ({ name, icon, enabled, description }) => (
  <div 
    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
      enabled 
        ? 'bg-green-50 dark:bg-green-500/10' 
        : 'bg-zinc-100 dark:bg-zinc-800/50 opacity-60'
    }`}
    title={description}
  >
    <div className={`${enabled ? 'text-green-500' : 'text-zinc-400'}`}>
      {icon}
    </div>
    <span className={`text-xs flex-1 ${enabled ? 'text-green-700 dark:text-green-300' : 'text-zinc-500'}`}>
      {name}
    </span>
    {enabled ? (
      <Check size={12} className="text-green-500" />
    ) : (
      <X size={12} className="text-zinc-400" />
    )}
  </div>
);

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
}

export const AuthCapabilitiesIndicator: React.FC<AuthCapabilitiesIndicatorProps> = ({ 
  compact = false,
  className = '' 
}) => {
  const { mode, capabilities, isAuthenticated, authState } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const modeInfo = getModeLabel(mode);
  const capCount = getCapabilityCount(capabilities);

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
            />
            <CapabilityItem
              name="Enviar chat"
              icon={<MessageSquare size={14} />}
              enabled={capabilities.canSendChat}
              description="Enviar mensajes al chat (chat:edit)"
            />
            <CapabilityItem
              name="API Twitch"
              icon={<Shield size={14} />}
              enabled={capabilities.canAccessAPI}
              description="Acceso a la API de Twitch"
            />
            <CapabilityItem
              name="Chatters"
              icon={<Users size={14} />}
              enabled={capabilities.canReadChatters}
              description="Ver lista de usuarios en chat (moderator:read:chatters)"
            />
            <CapabilityItem
              name="Suscriptores"
              icon={<Star size={14} />}
              enabled={capabilities.canReadSubscribers}
              description="Ver lista de suscriptores (channel:read:subscriptions)"
            />
            <CapabilityItem
              name="VIPs"
              icon={<Crown size={14} />}
              enabled={capabilities.canReadVIPs}
              description="Ver lista de VIPs (channel:read:vips)"
            />
            <CapabilityItem
              name="Gestionar VIPs"
              icon={<Crown size={14} />}
              enabled={capabilities.canManageVIPs}
              description="Añadir/quitar VIPs (channel:manage:vips)"
            />
            <CapabilityItem
              name="Ban/Timeout"
              icon={<Ban size={14} />}
              enabled={capabilities.canModerate}
              description="Banear/timeout usuarios (moderator:manage:banned_users)"
            />
            <CapabilityItem
              name="Borrar mensajes"
              icon={<Trash2 size={14} />}
              enabled={capabilities.canDeleteMessages}
              description="Borrar mensajes del chat (moderator:manage:chat_messages)"
            />
            <CapabilityItem
              name="Config chat"
              icon={<Settings size={14} />}
              enabled={capabilities.canManageChatSettings}
              description="Modo lento, solo subs, etc. (moderator:manage:chat_settings)"
            />
            <CapabilityItem
              name="Anuncios"
              icon={<Megaphone size={14} />}
              enabled={capabilities.canSendAnnouncements}
              description="Enviar anuncios al chat (moderator:manage:announcements)"
            />
            <CapabilityItem
              name="Bits"
              icon={<Coins size={14} />}
              enabled={capabilities.canReadBits}
              description="Ver leaderboard de bits (bits:read)"
            />
          </div>

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
