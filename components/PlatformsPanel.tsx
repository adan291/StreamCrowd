/**
 * PlatformsPanel Component
 * 
 * Main wrapper component for the Platforms section.
 * Handles hierarchical navigation between platform selector, tool selector, and tool panels.
 * 
 * @requirements 4.1, 5.1
 */

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { PlatformsView, PlatformsTool, TwitchMessage } from '../types';
import { PLATFORMS, TWITCH_TOOLS } from '../config/platforms';
import { PlatformSelector, BroadcasterAuthStatus } from './PlatformSelector';
import { TwitchToolSelector } from './TwitchToolSelector';
import { EnhancedCommandPanel } from './commands/EnhancedCommandPanel';
import { PredictionPanel } from './PredictionPanel';
import { RewardsPanel } from './RewardsPanel';
import { TimersPanel } from './timers';
import { HypeTrainPanel, GoalsPanel, ShieldModeToggle, StreamMarkersPanel } from './twitch';
import { ChannelSelector } from './ChannelSelector';
import { MacroManager } from './macros/MacroManager';
import { useI18n } from '../i18n';
import { useBroadcasterToken } from '../src/application/hooks/useBroadcasterToken';
import type { NotificationType } from './Notification';
import type { ChannelContext } from '../src/application/services/ModeratedChannelsService';

export interface PlatformsPanelProps {
  // Navigation state
  view: PlatformsView;
  tool: PlatformsTool;
  onNavigate: (view: PlatformsView, tool?: PlatformsTool) => void;
  onBack: () => void;
  
  // Props for CommandPanel (and future tool panels)
  chatMessages: TwitchMessage[];
  isConnected: boolean;
  
  // Props for Timers
  sendMessage?: (message: string) => void;
  channel?: string;
  
  // Props for Twitch API tools (Predictions, Channel Points)
  channelId?: string;
  authToken?: string;
  /** User ID of the logged-in user (may differ from channelId when viewing moderated channel) */
  loggedInUserId?: string;
  isPartnerOrAffiliate?: boolean;
  hasPredictionsScope?: boolean;
  hasRewardsScope?: boolean;
  onNotification?: (type: NotificationType, message: string) => void;
  onReauthenticate?: () => void;
  
  // Channel selector props
  moderatedChannels?: ChannelContext[];
  selectedChannel?: ChannelContext | null;
  onSelectChannel?: (channelId: string) => void;
  isLoadingChannels?: boolean;
  onRefreshChannels?: () => void;
  hasModeratedChannels?: boolean;
  isViewingModeratedChannel?: boolean;
  /** Error message from moderated channels fetch */
  moderatedChannelsError?: string | null;
  /** User's OAuth scopes */
  userScopes?: string[];
}

export const PlatformsPanel: React.FC<PlatformsPanelProps> = ({
  view,
  tool,
  onNavigate,
  onBack,
  chatMessages,
  isConnected,
  sendMessage,
  channel,
  channelId,
  authToken,
  loggedInUserId,
  isPartnerOrAffiliate = true,
  hasPredictionsScope = true,
  hasRewardsScope = true,
  onNotification,
  onReauthenticate,
  // Channel selector
  moderatedChannels = [],
  selectedChannel = null,
  onSelectChannel,
  isLoadingChannels = false,
  onRefreshChannels,
  hasModeratedChannels = false,
  isViewingModeratedChannel = false,
  moderatedChannelsError = null,
  userScopes = [],
}) => {
  const { t } = useI18n();

  // Hook para obtener estado de autorización del broadcaster
  const {
    hasBroadcasterToken,
    isOwnChannel,
    isLoading: isBroadcasterTokenLoading,
  } = useBroadcasterToken(
    selectedChannel?.id || channelId || null,
    selectedChannel?.login || channel || null,
    selectedChannel?.displayName || channel || null,
    loggedInUserId || null
  );

  // Estado de autorización del broadcaster para mostrar en PlatformSelector
  const twitchBroadcasterAuth: BroadcasterAuthStatus | undefined = channelId ? {
    isAuthorized: hasBroadcasterToken,
    isOwnChannel,
    broadcasterName: selectedChannel?.displayName || channel,
    isLoading: isBroadcasterTokenLoading,
  } : undefined;

  /**
   * Handle platform selection from PlatformSelector
   */
  const handleSelectPlatform = (platformId: string) => {
    // Navigate to the platform's tool selector
    onNavigate(platformId as PlatformsView, 'none');
  };

  /**
   * Handle tool selection from TwitchToolSelector
   */
  const handleSelectTool = (toolId: string) => {
    onNavigate(view, toolId as PlatformsTool);
  };

  /**
   * Handle back navigation based on current level
   * - From tool panel → tool selector
   * - From tool selector → platform selector
   */
  const handleBack = () => {
    if (tool !== 'none') {
      // From tool panel, go back to tool selector
      onNavigate(view, 'none');
    } else if (view !== 'selector') {
      // From tool selector, go back to platform selector
      onNavigate('selector', 'none');
    } else {
      // From platform selector, use parent's onBack
      onBack();
    }
  };

  /**
   * Render back button for tool panels
   */
  const renderToolBackButton = () => (
    <button
      type="button"
      onClick={handleBack}
      tabIndex={0}
      aria-label={t.platforms?.backToTwitchTools || 'Volver a herramientas de Twitch'}
      className="flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
    >
      <ArrowLeft size={16} />
      <span>{t.platforms?.back || 'Volver'}</span>
    </button>
  );

  /**
   * Render content based on current navigation state
   */
  const renderContent = () => {
    // Level 1: Platform Selector
    if (view === 'selector') {
      return (
        <PlatformSelector
          platforms={PLATFORMS}
          onSelectPlatform={handleSelectPlatform}
          twitchBroadcasterAuth={twitchBroadcasterAuth}
        />
      );
    }

    // Level 2: Twitch Tool Selector (when no tool is selected)
    if (view === 'twitch' && tool === 'none') {
      // Only show reconnect banner if there's an error AND user might want the feature
      const showModeratorHint = moderatedChannelsError && onReauthenticate;
      
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <TwitchToolSelector
              tools={TWITCH_TOOLS}
              onSelectTool={handleSelectTool}
              onBack={handleBack}
              broadcasterAuth={channelId ? {
                channelId: selectedChannel?.id || channelId,
                channelLogin: selectedChannel?.login || channel || '',
                channelName: selectedChannel?.displayName || channel || '',
                currentUserId: loggedInUserId || '',
                currentUserToken: authToken || '',
                currentUserScopes: userScopes,
                hasBroadcasterToken,
                isOwnChannel,
                isLoading: isBroadcasterTokenLoading,
              } : undefined}
              channelSelector={moderatedChannels.length > 1 ? {
                channels: moderatedChannels,
                selectedChannel,
                onSelectChannel: onSelectChannel || (() => {}),
                isLoading: isLoadingChannels,
                isViewingModeratedChannel,
              } : undefined}
              onNotification={onNotification}
            />
          </div>
          
          {/* Small hint for moderator feature - only show if scope is missing */}
          {showModeratorHint && (
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={onReauthenticate}
                className="w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-purple-500 transition-colors"
              >
                <Shield size={12} />
                <span>¿Eres moderador en otros canales? Reconecta para habilitarlo</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    // Level 3: Tool Panels

    if (view === 'twitch' && tool === 'commands') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <EnhancedCommandPanel />
          </div>
        </div>
      );
    }

    // Macros Panel
    if (view === 'twitch' && tool === 'macros') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0">
            <MacroManager 
              isModeratorView={isViewingModeratedChannel}
              platform="twitch"
              channelId={channelId}
              authToken={authToken}
              loggedInUserId={loggedInUserId}
            />
          </div>
        </div>
      );
    }

    // Predictions Panel
    if (view === 'twitch' && tool === 'predictions') {
      return (
        <div className="h-full flex flex-col" data-tour="predictions">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0">
            <PredictionPanel
              channelId={channelId || ''}
              authToken={authToken || ''}
              userId={loggedInUserId || ''}
              isPartnerOrAffiliate={isPartnerOrAffiliate}
              hasRequiredScope={hasPredictionsScope}
              isModeratorView={isViewingModeratedChannel}
              onNotification={onNotification}
              onReauthenticate={onReauthenticate}
            />
          </div>
        </div>
      );
    }

    // Channel Points (Rewards) Panel
    if (view === 'twitch' && tool === 'channelpoints') {
      return (
        <div className="h-full flex flex-col" data-tour="rewards">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0">
            <RewardsPanel
              channelId={channelId || ''}
              authToken={authToken || ''}
              hasRequiredScope={hasRewardsScope}
              onNotification={onNotification}
              onReauthenticate={onReauthenticate}
            />
          </div>
        </div>
      );
    }

    // Timers Panel
    if (view === 'twitch' && tool === 'timers') {
      return (
        <div className="h-full flex flex-col relative">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0">
            <TimersPanel
              sendMessage={sendMessage}
              isConnected={isConnected}
              channel={channel}
              chatMessages={chatMessages}
              onNotification={onNotification}
            />
          </div>
        </div>
      );
    }

    // Hype Train Panel
    if (view === 'twitch' && tool === 'hypetrain') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <HypeTrainPanel
              token={authToken || ''}
              broadcasterId={channelId || ''}
              onNotification={(msg, type) => onNotification?.(type, msg)}
            />
          </div>
        </div>
      );
    }

    // Goals Panel
    if (view === 'twitch' && tool === 'goals') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <GoalsPanel
              token={authToken || ''}
              broadcasterId={channelId || ''}
              isOwnChannel={!isViewingModeratedChannel}
              onNotification={(msg, type) => onNotification?.(type, msg)}
            />
          </div>
        </div>
      );
    }

    // Shield Mode Panel
    if (view === 'twitch' && tool === 'shieldmode') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <ShieldModeToggle
              token={authToken || ''}
              broadcasterId={channelId || ''}
              moderatorId={loggedInUserId || ''}
              isOwnChannel={!isViewingModeratedChannel}
              isModerator={isViewingModeratedChannel}
              onNotification={(msg, type) => onNotification?.(type, msg)}
            />
          </div>
        </div>
      );
    }

    // Stream Markers Panel
    if (view === 'twitch' && tool === 'markers') {
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 pt-4">
            {renderToolBackButton()}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <StreamMarkersPanel
              token={authToken || ''}
              broadcasterId={channelId || ''}
              isOwnChannel={!isViewingModeratedChannel}
              onNotification={(msg, type) => onNotification?.(type, msg)}
            />
          </div>
        </div>
      );
    }

    // Fallback to platform selector
    return (
      <PlatformSelector
        platforms={PLATFORMS}
        onSelectPlatform={handleSelectPlatform}
        twitchBroadcasterAuth={twitchBroadcasterAuth}
      />
    );
  };

  return (
    <div className="h-full" data-tour="platforms-panel">
      {renderContent()}
    </div>
  );
};

export default PlatformsPanel;
