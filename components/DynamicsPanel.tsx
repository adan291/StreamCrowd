import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { DynamicsView, TwitchMessage, CollaborationChannel, MediaAsset, ModerationConfig } from '../types';
import { ActivitySelector } from './ActivitySelector';
import { PollCreator } from './PollCreator';
import { JudgePanel } from './JudgePanel';
import { GiveawayHub } from './GiveawayHub';
import { useI18n } from '../i18n';

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

  const handleBack = () => {
    onViewChange('selector');
  };

  const handleSelectActivity = (activity: Exclude<DynamicsView, 'selector'>) => {
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
          <div className="h-full flex flex-col">
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
                onShowCountdown={onShowCountdown}
              />
            </div>
          </div>
        );

      case 'judge':
        return (
          <div className="h-full flex flex-col">
            <div className="px-4 pt-4">
              {renderBackButton()}
            </div>
            <div className="flex-1 min-h-0">
              <JudgePanel
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
            </div>
          </div>
        );

      case 'giveaway':
        return (
          <div className="h-full flex flex-col">
            <div className="px-4 pt-4">
              {renderBackButton()}
            </div>
            <div className="flex-1 min-h-0">
              <GiveawayHub
                chatMessages={chatMessages}
                isConnected={isConnected}
                onClearChatMessages={onClearChatMessages}
                userVoteMap={userVoteMap}
                collaborationChannels={collaborationChannels}
                mainChannel={mainChannel}
                authToken={authToken}
                userId={userId}
              />
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
