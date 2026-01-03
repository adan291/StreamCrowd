import React from 'react';
import { Twitch, Youtube, Zap, CheckCircle, AlertCircle, Loader2, Shield, Crown } from 'lucide-react';
import { PlatformConfig } from '../config/platforms';
import { useI18n } from '../i18n';
import type { Platform, PlatformConnection, PlatformConnectionStatus } from '../types/platform';

// ============================================
// Broadcaster Auth Status Types
// ============================================

export interface BroadcasterAuthStatus {
  /** Si el broadcaster ha autorizado la app */
  isAuthorized: boolean;
  /** Si el usuario actual es el broadcaster */
  isOwnChannel: boolean;
  /** Nombre del broadcaster */
  broadcasterName?: string;
  /** Si está cargando el estado */
  isLoading?: boolean;
}

// Icon mapping for platform types
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Twitch: <Twitch size={28} />,
  Youtube: <Youtube size={28} />,
  Zap: <Zap size={28} />,
};

/**
 * Get status indicator for a platform connection
 * @requirements 6.4 - Show connection status for each platform independently
 */
function getStatusIndicator(status: PlatformConnectionStatus | undefined): React.ReactNode {
  if (!status) return null;
  
  switch (status) {
    case 'connected':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'connecting':
    case 'reconnecting':
      return <Loader2 size={16} className="text-yellow-500 animate-spin" />;
    case 'error':
      return <AlertCircle size={16} className="text-red-500" />;
    default:
      return null;
  }
}

interface PlatformCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  comingSoon?: boolean;
  onClick: () => void;
  comingSoonText: string;
  connection?: PlatformConnection | null;
  connectedText?: string;
  connectingText?: string;
  errorText?: string;
  /** Estado de autorización del broadcaster (solo para Twitch) */
  broadcasterAuth?: BroadcasterAuthStatus;
}

const PlatformCard: React.FC<PlatformCardProps> = ({
  icon,
  title,
  description,
  color,
  enabled,
  comingSoon,
  onClick,
  comingSoonText,
  connection,
  connectedText = 'Connected',
  connectingText = 'Connecting...',
  errorText = 'Error',
  broadcasterAuth,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && enabled && !comingSoon) {
      e.preventDefault();
      onClick();
    }
  };

  const handleClick = () => {
    if (enabled && !comingSoon) {
      onClick();
    }
  };

  const isInteractive = enabled && !comingSoon;
  const isConnected = connection?.status === 'connected';
  const isConnecting = connection?.status === 'connecting' || connection?.status === 'reconnecting';
  const hasError = connection?.status === 'error';

  // Get status text
  const getStatusText = () => {
    if (isConnected && connection?.channel) {
      return `${connectedText}: ${connection.channel}`;
    }
    if (isConnecting) return connectingText;
    if (hasError) return connection?.lastError || errorText;
    return null;
  };

  const statusText = getStatusText();

  return (
    <div
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${title}: ${description}${comingSoon ? ` (${comingSoonText})` : ''}${statusText ? ` - ${statusText}` : ''}`}
      aria-disabled={!isInteractive}
      className={`group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950 ${
        isInteractive
          ? 'cursor-pointer hover:border-transparent hover:shadow-lg hover:shadow-current/10 hover:scale-[1.02]'
          : 'cursor-not-allowed opacity-60'
      } ${isConnected ? 'ring-2 ring-green-500/30' : ''}`}
      style={{
        '--tw-ring-color': color,
        '--hover-border-color': color,
      } as React.CSSProperties}
    >
      {/* Coming Soon Badge */}
      {comingSoon && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
          {comingSoonText}
        </div>
      )}

      {/* Connection Status Badge */}
      {!comingSoon && connection && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {getStatusIndicator(connection.status)}
        </div>
      )}

      {/* Colored accent bar on hover */}
      {isInteractive && (
        <div
          className={`absolute inset-x-0 top-0 h-1 rounded-t-xl transition-opacity duration-200 ${
            isConnected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{ backgroundColor: isConnected ? '#22c55e' : color }}
        />
      )}
      
      {/* Icon container */}
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-1 sm:mb-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>

      {/* Connection Status */}
      {statusText && (
        <p className={`mt-2 text-xs font-medium ${
          isConnected ? 'text-green-600 dark:text-green-400' :
          isConnecting ? 'text-yellow-600 dark:text-yellow-400' :
          hasError ? 'text-red-600 dark:text-red-400' :
          'text-zinc-500'
        }`}>
          {statusText}
        </p>
      )}

      {/* Broadcaster Auth Status (Twitch only) */}
      {broadcasterAuth && !broadcasterAuth.isLoading && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs ${
          broadcasterAuth.isAuthorized 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-yellow-600 dark:text-yellow-400'
        }`}>
          {broadcasterAuth.isOwnChannel ? (
            <>
              <Crown size={12} className="text-yellow-500" />
              <span>{broadcasterAuth.isAuthorized ? 'Autorizado' : 'Autorizar app'}</span>
            </>
          ) : (
            <>
              <Shield size={12} />
              <span>
                {broadcasterAuth.isAuthorized 
                  ? `${broadcasterAuth.broadcasterName || 'Streamer'} autorizado`
                  : 'Streamer no autorizado'
                }
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface PlatformSelectorProps {
  platforms: PlatformConfig[];
  onSelectPlatform: (platformId: string) => void;
  /** Connection state for each platform */
  connections?: Record<Platform, PlatformConnection | null>;
  /** Allow selecting multiple platforms */
  multiSelect?: boolean;
  /** Estado de autorización del broadcaster para Twitch */
  twitchBroadcasterAuth?: BroadcasterAuthStatus;
}

/**
 * Platform selector component with multi-platform support
 * @requirements 6.1 - Allow connecting to multiple platforms simultaneously
 * @requirements 6.4 - Show connection status for each platform independently
 */
export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  platforms,
  onSelectPlatform,
  connections,
  multiSelect = false,
  twitchBroadcasterAuth,
}) => {
  const { t } = useI18n();

  // Count connected platforms
  const connectedCount = connections 
    ? Object.values(connections).filter(c => c?.status === 'connected').length 
    : 0;

  return (
    <div
      className="h-full flex flex-col p-4 sm:p-6 bg-zinc-50 dark:bg-black/10"
      aria-label={t.nav?.platformsSelector || 'Selector de plataformas'}
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          {t.nav?.platforms || 'Plataformas'}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {multiSelect 
            ? (t.nav?.platformsDescriptionMulti || 'Conecta múltiples plataformas para agregar votos')
            : (t.nav?.platformsDescription || 'Selecciona una plataforma para acceder a sus herramientas')
          }
        </p>
        {multiSelect && connectedCount > 0 && (
          <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
            {connectedCount} {connectedCount === 1 
              ? (t.platforms?.platformConnected || 'plataforma conectada')
              : (t.platforms?.platformsConnected || 'plataformas conectadas')
            }
          </p>
        )}
      </div>

      {/* Platform Cards Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        role="group"
        aria-label={t.nav?.availablePlatforms || 'Plataformas disponibles'}
      >
        {platforms.map((platform) => (
          <PlatformCard
            key={platform.id}
            icon={PLATFORM_ICONS[platform.icon] || <Zap size={28} />}
            title={platform.title}
            description={platform.description}
            color={platform.color}
            enabled={platform.enabled}
            comingSoon={platform.comingSoon}
            comingSoonText={t.platforms?.comingSoon || 'Próximamente'}
            onClick={() => onSelectPlatform(platform.id)}
            connection={connections?.[platform.id as Platform]}
            connectedText={t.platforms?.connected || 'Conectado'}
            connectingText={t.platforms?.connecting || 'Conectando...'}
            errorText={t.platforms?.error || 'Error'}
            broadcasterAuth={platform.id === 'twitch' ? twitchBroadcasterAuth : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default PlatformSelector;
