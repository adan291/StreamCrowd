import React, { useState } from 'react';
import { Terminal, TrendingUp, Coins, Zap, ArrowLeft, Timer, Shield, CheckCircle, Users, Workflow, ChevronDown, ChevronUp, Train, Target, Bookmark } from 'lucide-react';
import { ToolConfig } from '../config/platforms';
import { useI18n } from '../i18n';
import { BroadcasterAuthPanel } from './BroadcasterAuthPanel';
import type { ChannelContext } from '../src/application/services/ModeratedChannelsService';

// Icon mapping for tool types
const TOOL_ICONS: Record<string, React.ReactNode> = {
  Terminal: <Terminal size={28} />,
  TrendingUp: <TrendingUp size={28} />,
  Coins: <Coins size={28} />,
  Zap: <Zap size={28} />,
  Timer: <Timer size={28} />,
  Workflow: <Workflow size={28} />,
  Train: <Train size={28} />,
  Target: <Target size={28} />,
  Bookmark: <Bookmark size={28} />,
  Shield: <Shield size={28} />,
};

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  comingSoon?: boolean;
  onClick: () => void;
  comingSoonText: string;
}

const ToolCard: React.FC<ToolCardProps> = ({
  icon,
  title,
  description,
  color,
  enabled,
  comingSoon,
  onClick,
  comingSoonText,
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

  return (
    <div
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${title}: ${description}${comingSoon ? ` (${comingSoonText})` : ''}`}
      aria-disabled={!isInteractive}
      className={`group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950 ${
        isInteractive
          ? 'cursor-pointer hover:border-transparent hover:shadow-lg hover:shadow-current/10 hover:scale-[1.02]'
          : 'cursor-not-allowed opacity-60'
      }`}
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

      {/* Colored accent bar on hover */}
      {isInteractive && (
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: color }}
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
    </div>
  );
};

interface TwitchToolSelectorProps {
  tools: ToolConfig[];
  onSelectTool: (toolId: string) => void;
  onBack: () => void;
  /** Broadcaster auth props */
  broadcasterAuth?: {
    channelId: string;
    channelLogin: string;
    channelName: string;
    currentUserId: string;
    currentUserToken: string;
    currentUserScopes: string[];
    hasBroadcasterToken: boolean;
    isOwnChannel: boolean;
    isLoading: boolean;
  };
  /** Channel selector props */
  channelSelector?: {
    channels: ChannelContext[];
    selectedChannel: ChannelContext | null;
    onSelectChannel: (channelId: string) => void;
    isLoading: boolean;
    isViewingModeratedChannel: boolean;
  };
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const TwitchToolSelector: React.FC<TwitchToolSelectorProps> = ({
  tools,
  onSelectTool,
  onBack,
  broadcasterAuth,
  channelSelector,
  onNotification,
}) => {
  const { t } = useI18n();
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBack();
    }
  };

  // Compact channel selector for header
  const renderChannelSelector = () => {
    if (!channelSelector || channelSelector.channels.length <= 1) return null;

    const selected = channelSelector.selectedChannel;
    
    return (
      <div className="relative">
        <button
          onClick={() => setShowChannelDropdown(!showChannelDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/50 border border-purple-300 dark:border-purple-700 transition-colors"
        >
          {selected?.channelAvatar ? (
            <img src={selected.channelAvatar} alt="" className="w-6 h-6 rounded-full ring-2 ring-purple-400/50" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {selected?.channelName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <span className="text-purple-700 dark:text-purple-200 font-semibold text-sm max-w-[140px] truncate">
            {selected?.channelName || 'Seleccionar canal'}
          </span>
          <ChevronDown size={16} className={`text-purple-600 dark:text-purple-300 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showChannelDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowChannelDropdown(false)} 
            />
            <div className="absolute top-full right-0 mt-1 w-60 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-20 py-1.5 overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">
                Cambiar canal
              </div>
              {channelSelector.channels.map((ch) => (
                <button
                  key={ch.channelId}
                  onClick={() => {
                    channelSelector.onSelectChannel(ch.channelId);
                    setShowChannelDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors ${
                    ch.channelId === selected?.channelId ? 'bg-purple-100 dark:bg-purple-900/30' : ''
                  }`}
                >
                  {ch.channelAvatar ? (
                    <img src={ch.channelAvatar} alt="" className="w-8 h-8 rounded-full ring-2 ring-purple-300 dark:ring-purple-600" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{ch.channelName?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="flex-1 text-left truncate font-semibold text-zinc-800 dark:text-white">
                    {ch.channelName}
                  </span>
                  {ch.isOwnChannel ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500 text-white font-semibold">
                      Tuyo
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-white font-semibold">
                      Mod
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col p-4 sm:p-6 bg-zinc-50 dark:bg-black/10"
      aria-label={t.platforms?.twitchToolsDescription || 'Selector de herramientas de Twitch'}
    >
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        onKeyDown={handleBackKeyDown}
        className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 -ml-2"
        aria-label={t.platforms?.backToPlatforms || 'Volver a plataformas'}
      >
        <ArrowLeft size={16} />
        <span>{t.platforms?.back || 'Volver'}</span>
      </button>

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            {t.platforms?.twitchTitle || 'Twitch'}
          </h2>
          {renderChannelSelector()}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.platforms?.twitchToolsDescription || 'Herramientas y funcionalidades de Twitch'}
          </p>
          {channelSelector?.isViewingModeratedChannel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/10 text-green-600 dark:text-green-400">
              <Shield size={10} />
              Moderador
            </span>
          )}
        </div>
      </div>

      {/* Broadcaster Auth Banner */}
      {broadcasterAuth && !broadcasterAuth.isLoading && (
        <div className="mb-4 sm:mb-6">
          {broadcasterAuth.isOwnChannel ? (
            // Broadcaster view
            <div className={`rounded-lg p-3 border ${
              broadcasterAuth.hasBroadcasterToken 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-purple-500/10 border-purple-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {broadcasterAuth.hasBroadcasterToken ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <Users size={20} className="text-purple-500" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      broadcasterAuth.hasBroadcasterToken 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {broadcasterAuth.hasBroadcasterToken 
                        ? 'Moderadores habilitados' 
                        : 'Habilitar moderadores'
                      }
                    </p>
                    <p className={`text-xs ${
                      broadcasterAuth.hasBroadcasterToken 
                        ? 'text-green-600/70 dark:text-green-400/70' 
                        : 'text-purple-600/70 dark:text-purple-400/70'
                    }`}>
                      {broadcasterAuth.hasBroadcasterToken 
                        ? 'Tus mods pueden crear predicciones y polls' 
                        : 'Permite que tus mods creen predicciones y polls'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthPanel(!showAuthPanel)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    broadcasterAuth.hasBroadcasterToken
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30'
                      : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30'
                  }`}
                >
                  {showAuthPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {broadcasterAuth.hasBroadcasterToken ? 'Gestionar' : 'Configurar'}
                </button>
              </div>
              
              {/* Expandable Auth Panel */}
              {showAuthPanel && (
                <div className="mt-3 pt-3 border-t border-current/10">
                  <BroadcasterAuthPanel
                    channelId={broadcasterAuth.channelId}
                    channelLogin={broadcasterAuth.channelLogin}
                    channelName={broadcasterAuth.channelName}
                    currentUserId={broadcasterAuth.currentUserId}
                    currentUserToken={broadcasterAuth.currentUserToken}
                    currentUserScopes={broadcasterAuth.currentUserScopes}
                    onAuthSuccess={() => {
                      setShowAuthPanel(false);
                      onNotification?.('success', '¡Moderadores habilitados!');
                    }}
                    onNotification={(msg, type) => onNotification?.(type, msg)}
                  />
                </div>
              )}
            </div>
          ) : (
            // Moderator view
            <div className={`rounded-lg p-3 border ${
              broadcasterAuth.hasBroadcasterToken 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <Shield size={20} className={
                  broadcasterAuth.hasBroadcasterToken ? 'text-green-500' : 'text-yellow-500'
                } />
                <div>
                  <p className={`text-sm font-medium ${
                    broadcasterAuth.hasBroadcasterToken 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {broadcasterAuth.hasBroadcasterToken 
                      ? `${broadcasterAuth.channelName} te ha autorizado` 
                      : 'Permisos limitados'
                    }
                  </p>
                  <p className={`text-xs ${
                    broadcasterAuth.hasBroadcasterToken 
                      ? 'text-green-600/70 dark:text-green-400/70' 
                      : 'text-yellow-600/70 dark:text-yellow-400/70'
                  }`}>
                    {broadcasterAuth.hasBroadcasterToken 
                      ? 'Puedes crear predicciones y polls' 
                      : `${broadcasterAuth.channelName} debe autorizar Stream Crowd`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool Cards Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        role="group"
        aria-label={t.platforms?.availableTools || 'Herramientas disponibles'}
      >
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            icon={TOOL_ICONS[tool.icon] || <Zap size={28} />}
            title={tool.title}
            description={tool.description}
            color={tool.color}
            enabled={tool.enabled}
            comingSoon={tool.comingSoon}
            comingSoonText={t.platforms?.comingSoon || 'Próximamente'}
            onClick={() => onSelectTool(tool.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default TwitchToolSelector;
