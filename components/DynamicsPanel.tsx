import React, { Suspense, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DynamicsView, TwitchMessage, CollaborationChannel, MediaAsset, ModerationConfig } from '../types';
import { ActivitySelector } from './ActivitySelector';
import { PollCreator } from './PollCreator';
import { JudgePanelSkeleton, GiveawayHubSkeleton } from './ui/Skeleton';
import { useI18n } from '../i18n';

/**
 * Lazy load JudgePanel component
 * @requirements 7.1 - Lazy load JudgePanel when first accessed
 */
const LazyJudgePanel = React.lazy(() => import('./JudgePanel'));

/**
 * Lazy load GiveawayHub component
 * @requirements 7.2 - Lazy load GiveawayHub when first accessed
 */
const LazyGiveawayHub = React.lazy(() => import('./GiveawayHub'));

export interface DynamicsPanelProps {
  // Navigation state
  view: DynamicsView;
  onViewChange: (view: DynamicsView) => void;
  
  // Shared props for all panels
  chatMessages: TwitchMessage[];
  isConnected: boolean;
  userVoteMap: Map<string, number>;
  collaborationChannels: CollaborationChannel[];
  mainChannel: string;
  onAddCollaborator: (channel: string) => void;
  onRemoveCollaborator: (channel: string) => void;
  
  // PollCreator specific props
  onCreatePoll: (
    title: string,
    question: string,
    options: { label: string; color: string; icon?: string; image?: string; voteKey?: string }[],
    maxVotes?: number,
    duration?: number,
    progressBarColor?: string,
    limitIndicatorColor?: string,
    moderationConfig?: ModerationConfig,
    votePrefix?: string,
    voteMatchMode?: 'exact' | 'partial'
  ) => void;
  onNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  mediaLibrary: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  moderationConfig: ModerationConfig;
  onModerationConfigChange: (config: ModerationConfig) => void;
  onShowHistory: () => void;
  sidebarHidden: boolean;
  onClearChatMessages: () => void;
  onShowCountdown: () => void;
  
  // GiveawayHub specific props
  authToken?: string;
  userId?: string;
}

export const DynamicsPanel: React.FC<DynamicsPanelProps> = ({
  view,
  onViewChange,
  chatMessages,
  isConnected,
  userVoteMap,
  collaborationChannels,
  mainChannel,
  onAddCollaborator,
  onRemoveCollaborator,
  onCreatePoll,
  onNotification,
  mediaLibrary,
  onAddAsset,
  moderationConfig,
  onModerationConfigChange,
  onShowHistory,
  sidebarHidden,
  onClearChatMessages,
  onShowCountdown,
  authToken,
  userId,
}) => {
  const { t } = useI18n();

  /**
   * Preload lazy components after initial page load
   * @requirements 7.5 - Preload components after initial page load is complete
   */
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      // Preload JudgePanel
      import('./JudgePanel').catch(() => {
        // Silently ignore preload errors - component will load on demand
      });
      // Preload GiveawayHub
      import('./GiveawayHub').catch(() => {
        // Silently ignore preload errors - component will load on demand
      });
    }, 2000); // 2 seconds after mount

    return () => clearTimeout(preloadTimer);
  }, []);

  const handleBack = () => {
    onViewChange('selector');
  };

  const handleSelectActivity = (activity: Exclude<DynamicsView, 'selector'>) => {
    // Countdown se maneja como widget flotante global, no embebido
    if (activity === 'countdown') {
      onShowCountdown();
      return;
    }
    onViewChange(activity);
  };

  // Render back button for sub-views
  const renderBackButton = () => {
    if (view === 'selector') return null;

    return (
      <button
        type="button"
        onClick={handleBack}
        tabIndex={0}
        aria-label={t.nav?.dynamicsSelector || 'Volver al selector de dinámicas'}
        className="flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-twitch-brand focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
      >
        <ArrowLeft size={16} />
        <span>{t.nav?.backToSelector || 'Volver'}</span>
      </button>
    );
  };

  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case 'selector':
        return (
          <ActivitySelector onSelectActivity={handleSelectActivity} />
        );

      case 'poll':
        return (
          <div className="h-full flex flex-col" data-tour="poll-creator">
            <div className="px-4 pt-4">
              {renderBackButton()}
            </div>
            <div className="flex-1 min-h-0">
              <PollCreator
                onCreate={onCreatePoll}
                onNotification={onNotification}
                mediaLibrary={mediaLibrary}
                onAddAsset={onAddAsset}
                moderationConfig={moderationConfig}
                onModerationConfigChange={onModerationConfigChange}
                chatMessages={chatMessages}
                onShowHistory={onShowHistory}
                sidebarHidden={sidebarHidden}
                onClearChatMessages={onClearChatMessages}
                userVoteMap={userVoteMap}
                collaborationChannels={collaborationChannels}
                mainChannel={mainChannel}
                onAddCollaborator={onAddCollaborator}
                onRemoveCollaborator={onRemoveCollaborator}
                isConnected={isConnected}
              />
            </div>
          </div>
        );

      case 'judge':
        return (
          <div className="h-full flex flex-col" data-tour="judge-panel">
            <div className="px-4 pt-4">
              {renderBackButton()}
            </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<JudgePanelSkeleton />}>
                <LazyJudgePanel
                  chatMessages={chatMessages}
                  onClose={handleBack}
                  userVoteMap={userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={mainChannel}
                  onAddCollaborator={onAddCollaborator}
                  onRemoveCollaborator={onRemoveCollaborator}
                  isConnected={isConnected}
                  isEmbedded={true}
                  mediaLibrary={mediaLibrary}
                  onAddAsset={onAddAsset}
                />
              </Suspense>
            </div>
          </div>
        );

      case 'giveaway':
        return (
          <div className="h-full flex flex-col" data-tour="giveaway">
            <div className="px-4 pt-4">
              {renderBackButton()}
            </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<GiveawayHubSkeleton />}>
                <LazyGiveawayHub
                  chatMessages={chatMessages}
                  isConnected={isConnected}
                  onClearChatMessages={onClearChatMessages}
                  userVoteMap={userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={mainChannel}
                  authToken={authToken}
                  userId={userId}
                />
              </Suspense>
            </div>
          </div>
        );

      default:
        return <ActivitySelector onSelectActivity={handleSelectActivity} />;
    }
  };

  return (
    <div className="h-full" data-tour="dynamics-panel">
      {renderContent()}
    </div>
  );
};

export default DynamicsPanel;
