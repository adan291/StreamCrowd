/**
 * TimersPanel Component
 * 
 * Main panel for managing chat timers.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Play, Square, Clock, MessageSquare, 
  LayoutList, FileText, FolderOpen, History,
  WifiOff
} from 'lucide-react';
import type { Timer, TimerTemplate, TimerFormData, TimerGroupFormData } from '../../types/timers';
import type { TwitchMessage } from '../../types';
import { useTimers } from '../../src/application/hooks/useTimers';
import { useI18n } from '../../i18n';
import { TimerForm } from './TimerForm';
import { TimerList } from './TimerList';
import { TimerTemplates } from './TimerTemplates';
import { TimerGroups } from './TimerGroups';
import { TimerLog } from './TimerLog';

type TabId = 'timers' | 'templates' | 'groups' | 'log';

interface Tab {
  id: TabId;
  labelKey: keyof typeof TAB_LABELS;
  icon: React.ReactNode;
}

const TAB_LABELS = {
  timers: 'tabTimers',
  templates: 'tabTemplates',
  groups: 'tabGroups',
  log: 'tabLog'
} as const;

const TABS: Tab[] = [
  { id: 'timers', labelKey: 'timers', icon: <LayoutList size={16} /> },
  { id: 'templates', labelKey: 'templates', icon: <FileText size={16} /> },
  { id: 'groups', labelKey: 'groups', icon: <FolderOpen size={16} /> },
  { id: 'log', labelKey: 'log', icon: <History size={16} /> },
];

interface TimersPanelProps {
  sendMessage?: (message: string) => void;
  isConnected?: boolean;
  channel?: string;
  game?: string;
  uptime?: string;
  viewers?: number;
  followers?: number;
  chatMessages?: TwitchMessage[];
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const TimersPanel: React.FC<TimersPanelProps> = ({
  sendMessage,
  isConnected = false,
  channel,
  game,
  uptime,
  viewers,
  followers,
  chatMessages = [],
  onNotification
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('timers');
  const [showForm, setShowForm] = useState(false);
  const [editingTimer, setEditingTimer] = useState<Timer | null>(null);
  const [templateToUse, setTemplateToUse] = useState<TimerTemplate | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastMessageCountRef = useRef(0);

  // Announce for screen readers
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear after announcement is read
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  const {
    timers,
    groups,
    engineState,
    addTimer,
    updateTimer,
    deleteTimer,
    toggleTimer,
    addGroup,
    updateGroup,
    deleteGroup,
    toggleGroup,
    startEngine,
    stopEngine,
    executeTimerNow,
    incrementChatLines,
    clearLog,
    getNextExecutionTime
  } = useTimers({
    sendMessage,
    isConnected,
    channel,
    game,
    uptime,
    viewers,
    followers,
    onNotification
  });

  // Announce engine state changes
  const handleStartEngine = useCallback(() => {
    startEngine();
    announce(t.timers.engineStartedAnnouncement);
  }, [startEngine, announce, t]);

  const handleStopEngine = useCallback(() => {
    stopEngine();
    announce(t.timers.engineStoppedAnnouncement);
  }, [stopEngine, announce, t]);

  // Count chat lines for timer execution
  useEffect(() => {
    const newMessages = chatMessages.length - lastMessageCountRef.current;
    if (newMessages > 0) {
      for (let i = 0; i < newMessages; i++) {
        incrementChatLines();
      }
      lastMessageCountRef.current = chatMessages.length;
    }
  }, [chatMessages.length, incrementChatLines]);

  // Handle create timer
  const handleCreateTimer = () => {
    setEditingTimer(null);
    setTemplateToUse(null);
    setShowForm(true);
  };

  // Handle edit timer
  const handleEditTimer = (timer: Timer) => {
    setEditingTimer(timer);
    setTemplateToUse(null);
    setShowForm(true);
  };

  // Handle use template
  const handleUseTemplate = (template: TimerTemplate) => {
    setEditingTimer(null);
    setTemplateToUse(template);
    setShowForm(true);
    setActiveTab('timers');
  };

  // Handle save timer
  const handleSaveTimer = (data: TimerFormData) => {
    if (editingTimer) {
      updateTimer(editingTimer.id, data);
    } else {
      addTimer(data);
    }
    setShowForm(false);
    setEditingTimer(null);
    setTemplateToUse(null);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTimer(null);
    setTemplateToUse(null);
  };

  // Handle create group
  const handleCreateGroup = (data: TimerGroupFormData) => {
    addGroup(data);
  };

  // Get initial form values from template
  const getInitialTimerFromTemplate = (): Timer | undefined => {
    if (!templateToUse) return undefined;
    return {
      id: '',
      name: templateToUse.name,
      message: templateToUse.message,
      intervalMinutes: templateToUse.intervalMinutes,
      minChatLines: templateToUse.minChatLines,
      enabled: true,
      groupId: null,
      lastExecuted: null,
      createdAt: 0,
      updatedAt: 0
    };
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'timers':
        if (showForm) {
          return (
            <TimerForm
              timer={editingTimer || getInitialTimerFromTemplate()}
              groups={groups}
              onSave={handleSaveTimer}
              onCancel={handleCancelForm}
            />
          );
        }
        return (
          <TimerList
            timers={timers}
            groups={groups}
            getNextExecutionTime={getNextExecutionTime}
            onToggle={toggleTimer}
            onEdit={handleEditTimer}
            onDelete={deleteTimer}
            onExecuteNow={executeTimerNow}
            onCreateTimer={handleCreateTimer}
          />
        );

      case 'templates':
        return <TimerTemplates onUseTemplate={handleUseTemplate} />;

      case 'groups':
        return (
          <TimerGroups
            groups={groups}
            timers={timers}
            onCreateGroup={handleCreateGroup}
            onUpdateGroup={updateGroup}
            onDeleteGroup={deleteGroup}
            onToggleGroup={toggleGroup}
          />
        );

      case 'log':
        return (
          <TimerLog
            log={engineState.executionLog}
            onClear={clearLog}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-emerald-500" />
              {t.timers.title}
            </h2>
            <p className="text-xs text-zinc-500">{t.timers.subtitle}</p>
          </div>

          {/* Engine controls */}
          <div className="flex items-center gap-2">
            {!isConnected && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">
                <WifiOff size={12} />
                {t.timers.notConnected}
              </div>
            )}
            
            <button
              onClick={engineState.isRunning ? handleStopEngine : handleStartEngine}
              disabled={!isConnected}
              aria-label={engineState.isRunning ? t.timers.stopEngine : t.timers.startEngine}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                engineState.isRunning
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {engineState.isRunning ? (
                <>
                  <Square size={14} />
                  {t.timers.stopEngine}
                </>
              ) : (
                <>
                  <Play size={14} />
                  {t.timers.startEngine}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div 
              className={`w-2 h-2 rounded-full ${
                engineState.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
              }`} 
              aria-hidden="true"
            />
            <span className="text-zinc-400">
              {engineState.isRunning ? t.timers.engineRunning : t.timers.engineStopped}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-zinc-500">
            <MessageSquare size={12} aria-hidden="true" />
            <span>{engineState.chatLineCount} {t.timers.chatLines}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock size={12} aria-hidden="true" />
            <span>{timers.filter(t => t.enabled).length} {t.timers.timerEnabled.toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'timers') {
                setShowForm(false);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-emerald-400 border-emerald-500'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            {tab.icon}
            {t.timers[TAB_LABELS[tab.id] as keyof typeof t.timers]}
            {tab.id === 'timers' && timers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-zinc-800 rounded">
                {timers.length}
              </span>
            )}
            {tab.id === 'log' && engineState.executionLog.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-zinc-800 rounded">
                {engineState.executionLog.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {renderTabContent()}
      </div>

      {/* FAB for creating timer */}
      {activeTab === 'timers' && !showForm && (
        <button
          onClick={handleCreateTimer}
          className="absolute bottom-6 right-6 w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          aria-label={t.timers.createTimer}
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};

export default TimersPanel;
