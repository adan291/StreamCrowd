/**
 * GiveawayHub Component (Refactored)
 * Main hub for managing giveaways - uses modular components and hooks
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Gift, Layers, Download, Upload, BarChart3, 
  Trash2, AlertTriangle, Settings, Users, MessageSquare, Play, AlertCircle, X,
  History, CalendarClock, Trophy, Sparkles
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';
import { useHistoryRecorder } from '../../hooks/useHistoryRecorder';
import { useStreamNotifications } from '../../hooks/useStreamNotifications';
import { useGiveawayCloud } from '../../hooks/useGiveawayCloud';
import { GiveawayFirebaseService } from '../../src/infrastructure/firebase/GiveawayFirebaseService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { WizardStepper, useWizard } from '../ui/WizardStepper';
import { WizardButton } from '../ui/WizardButton';
import { ViewModeToggle, useViewMode } from '../ui/ViewModeToggle';
import { Tooltip } from '../ui/Tooltip';
import { SoundSettings } from './SoundSettings';
import { ChatSettings } from './ChatSettings';
import { MultiWinnerConfig } from './MultiWinnerConfig';
import { HistoryPanel } from './HistoryPanel';
import { CloudSyncButton } from './CloudSyncButton';
import { SchedulerService } from './services/SchedulerService';
import { getChatCommandsService, DEFAULT_CHAT_COMMANDS_CONFIG } from './services/ChatCommands';
import type { ChatCommandsConfig } from './services/ChatCommands';
import type { ParticipationRequirements } from './types';

// Import modular components and hooks
import {
  useRaffle,
  useParticipants,
  useThreads,
  useGiveawaySync,
  useWinnerAnimation,
  useGiveawaySound,
  RaffleTab,
  ThreadsTab,
  SubsConfigModal,
  StatsPanel,
  GiveawayStorage,
  ModeSelector,
  DurationPicker,
  BotDetectionService,
  type RaffleMode,
  type GiveawayThread,
  type FinishedGiveaway,
} from './index';

// ============================================
// TYPES
// ============================================

interface GiveawayHubProps {
  chatMessages: Array<{
    oderId: string;
    username: string;
    message: string;
    timestamp?: number;
    isSubscriber?: boolean;
  }>;
  isConnected: boolean;
  onClearChatMessages?: () => void;
  authToken?: string;
  userId?: string;
}

type TabType = 'raffle' | 'active' | 'scheduled' | 'stats' | 'history';

interface GiveawayExport {
  version: number;
  exportedAt: number;
  threads: GiveawayThread[];
  history: FinishedGiveaway[];
}

// Winner display state
interface WinnerDisplayState {
  threadId: string;
  threadName: string;
  winner: string;
  participantCount: number;
  prizeImages?: string[];
}

// ============================================
// COMPONENT
// ============================================

export const GiveawayHub: React.FC<GiveawayHubProps> = ({
  chatMessages,
  isConnected,
  onClearChatMessages,
  authToken,
  userId,
}) => {
  const { t } = useI18n();
  const { triggerGiveawayStart, triggerGiveawayWinner } = useOBSTriggers();
  const { recordGiveaway } = useHistoryRecorder();
  const { notifyGiveawayWinner } = useStreamNotifications();

  // ============================================
  // STATE
  // ============================================
  const [activeTab, setActiveTab] = useState<TabType>('raffle');
  const [showSubsConfig, setShowSubsConfig] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [wizardMode, setWizardMode] = useState(false);
  const [isLoadingChatters, setIsLoadingChatters] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const wizard = useWizard(3);
  const [viewMode, setViewMode] = useViewMode('giveaway_view_mode', 'expanded');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatConfig, setChatConfig] = useState<ChatCommandsConfig>(() => {
    const saved = localStorage.getItem('giveaway_chat_config');
    return saved ? JSON.parse(saved) : DEFAULT_CHAT_COMMANDS_CONFIG;
  });
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  
  // New Phase 4 state
  const [requirements, setRequirements] = useState<ParticipationRequirements>(() => {
    const saved = localStorage.getItem('giveaway_requirements');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Winner display state - shows winner until user closes it
  const [currentWinner, setCurrentWinner] = useState<WinnerDisplayState | null>(null);

  // Wizard steps configuration
  const wizardSteps = useMemo(() => [
    { id: 'mode', title: 'Tipo', icon: <Gift size={16} /> },
    { id: 'config', title: 'Configuración', icon: <Settings size={16} /> },
    { id: 'start', title: 'Iniciar', icon: <Play size={16} /> },
  ], []);

  // ============================================
  // HOOKS
  // ============================================
  const raffle = useRaffle();
  const participants = useParticipants({ persistBlacklist: true });
  const threads = useThreads();
  const cloud = useGiveawayCloud({ autoSync: true });
  const sync = useGiveawaySync({
    enableBroadcast: true,
    enableFirebase: true,
  });
  const animation = useWinnerAnimation({
    duration: 3000,
    onComplete: (winner) => {
      raffle.setWinner(winner);
      handleWinnerSelected(winner);
    },
  });
  
  // Sound effects
  const sound = useGiveawaySound({ persistSettings: true });

  // Check if wizard can proceed to next step (must be after raffle hook)
  const canWizardProceed = useMemo(() => {
    if (wizard.currentStep === 0) return true; // Mode step always valid
    if (wizard.currentStep === 1) {
      // Config step - keyword mode needs keyword
      if (raffle.mode === 'keyword') {
        return raffle.config.keyword.trim().length > 0;
      }
      return true;
    }
    if (wizard.currentStep === 2) {
      // Start step - need to be connected
      return isConnected;
    }
    return true;
  }, [wizard.currentStep, raffle.mode, raffle.config.keyword, isConnected]);

  // Refs for tracking
  const startTimeRef = useRef<number>(0);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // ============================================
  // RECOVERY & BACKUP
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (threads.activeCount > 0 || raffle.isRunning) {
        // Save backup to localStorage
        const backup: GiveawayExport = {
          version: 1,
          exportedAt: Date.now(),
          threads: threads.threads,
          history: GiveawayStorage.getHistory(),
        };
        localStorage.setItem('giveaway_backup', JSON.stringify(backup));
        
        // Sync to cloud if enabled (fire and forget - can't await in beforeunload)
        if (cloud.isReady && cloud.syncEnabled) {
          threads.threads.forEach(thread => {
            GiveawayFirebaseService.saveGiveaway(thread, true).catch(() => {});
          });
        }
        
        e.preventDefault();
        e.returnValue = `Tienes ${threads.activeCount} sorteo(s) activo(s). ¿Seguro que quieres salir?`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [threads.activeCount, raffle.isRunning, threads.threads, cloud.isReady, cloud.syncEnabled]);

  // Check for backup on load
  useEffect(() => {
    const backup = localStorage.getItem('giveaway_backup');
    if (backup && threads.threads.length === 0) {
      try {
        const data: GiveawayExport = JSON.parse(backup);
        if (data.threads && data.threads.length > 0) {
          const activeBackupThreads = data.threads.filter(t => !t.winner);
          if (activeBackupThreads.length > 0) {
            setShowRecoveryModal(true);
          }
        }
      } catch { /* ignore */ }
    }
  }, []);

  // ============================================
  // CHAT MESSAGE PROCESSING FOR ACTIVE THREADS
  // ============================================
  useEffect(() => {
    // Process chat messages for all active threads
    if (threads.activeThreads.length === 0) return;
    
    threads.activeThreads.forEach(thread => {
      if (!thread.isActive || thread.isPaused) return;
      
      const keyword = thread.keyword?.toLowerCase().trim() || '';
      
      chatMessages.forEach((msg) => {
        if (!msg.timestamp || msg.timestamp <= thread.createdAt) return;
        
        // Check if already a participant (by oderId)
        const alreadyParticipant = thread.participants.some(p => p.oderId === msg.oderId);
        if (alreadyParticipant && !thread.allowMultipleEntries) return;
        
        // Check if in blacklist (excluidos)
        if (participants.blacklist.has(msg.username.toLowerCase())) return;
        
        // Check subs only filter
        if (thread.subscribersOnly && !msg.isSubscriber) return;
        
        // Check mode-specific conditions
        let shouldAdd = false;
        
        if (thread.mode === 'keyword' && keyword) {
          if (msg.message.toLowerCase().includes(keyword)) {
            shouldAdd = true;
          }
        } else if (thread.mode === 'viewers') {
          shouldAdd = true;
        } else if (thread.mode === 'subs' && msg.isSubscriber) {
          shouldAdd = true;
        }
        
        if (shouldAdd) {
          threads.addParticipant(thread.id, {
            oderId: msg.oderId,
            username: msg.username,
            timestamp: msg.timestamp,
            messageId: msg.oderId,
          });
        }
      });
    });
  }, [chatMessages, threads.activeThreads, participants.blacklist]);

  // ============================================
  // CHAT MESSAGE PROCESSING (Legacy - for direct raffle mode)
  // ============================================
  useEffect(() => {
    if (!raffle.isRunning) return;

    const { mode, config } = raffle;
    const keyword = config.keyword.toLowerCase().trim();

    chatMessages.forEach((msg) => {
      if (!msg.timestamp || msg.timestamp <= startTimeRef.current) return;
      if (processedMessagesRef.current.has(msg.oderId)) return;

      // Check if in blacklist (excluidos)
      if (participants.blacklist.has(msg.username.toLowerCase())) return;

      // Check subs only filter
      if (config.subsOnly && !msg.isSubscriber) return;

      if (mode === 'keyword' && keyword) {
        if (msg.message.toLowerCase().includes(keyword)) {
          participants.add(msg.username, 'chat');
          processedMessagesRef.current.add(msg.oderId);
        }
      } else if (mode === 'viewers') {
        participants.add(msg.username, 'chat');
        processedMessagesRef.current.add(msg.oderId);
      }
    });
  }, [chatMessages, raffle.isRunning, raffle.mode, raffle.config, participants]);

  // ============================================
  // TIMER EFFECT
  // ============================================
  useEffect(() => {
    if (raffle.isRunning && raffle.config.useTimer && raffle.timeLeft <= 0) {
      handleFinishRaffle();
    }
  }, [raffle.isRunning, raffle.timeLeft, raffle.config.useTimer]);

  // ============================================
  // COUNTDOWN SOUND EFFECT
  // ============================================
  useEffect(() => {
    if (raffle.isRunning && raffle.config.useTimer && raffle.timeLeft <= 10 && raffle.timeLeft > 0) {
      sound.playCountdown(raffle.timeLeft);
    }
  }, [raffle.isRunning, raffle.config.useTimer, raffle.timeLeft, sound]);

  // ============================================
  // CHAT COMMANDS PROCESSING
  // ============================================
  const chatCommandsRef = useRef(getChatCommandsService(chatConfig));
  
  useEffect(() => {
    chatCommandsRef.current.updateConfig(chatConfig);
  }, [chatConfig]);

  // Process chat commands (only latest message)
  useEffect(() => {
    if (!chatConfig.enabled || chatMessages.length === 0) return;
    
    const latestMsg = chatMessages[chatMessages.length - 1];
    if (!latestMsg) return;
    
    const parsed = chatCommandsRef.current.parseCommand(latestMsg.message);
    if (!parsed) return;
    
    // Get active thread for context
    const activeThread = threads.activeThreads[0];
    
    const response = chatCommandsRef.current.executeCommand(parsed.command, parsed.args, {
      activeThread,
      lastWinner: lastWinner || undefined,
      participantCount: participants.count,
    });
    
    // Note: In a real implementation, you would send this response to chat
    // For now, we just log it
    if (response) {
      console.log('[ChatCommand]', response.message);
    }
  }, [chatMessages, chatConfig.enabled, threads.activeThreads, lastWinner, participants.count]);

  // ============================================
  // SYNC EFFECT
  // ============================================
  useEffect(() => {
    sync.sync({
      winner: raffle.winner,
      isSpinning: animation.isAnimating,
      displayName: animation.currentName || raffle.winner || '',
      participants: participants.getAll(),
    });
  }, [raffle.winner, animation.isAnimating, animation.currentName, participants]);

  // Sync threads to overlay
  useEffect(() => {
    sync.syncThreads(threads.activeThreads, threads.scheduledThreads);
  }, [threads.activeThreads, threads.scheduledThreads, sync]);

  // ============================================
  // SCHEDULER EFFECT
  // ============================================
  useEffect(() => {
    SchedulerService.start((scheduled) => {
      // Auto-start scheduled giveaway
      raffle.setMode(scheduled.config.keyword ? 'keyword' : 'viewers');
      raffle.updateConfig(scheduled.config);
      // Note: Would need to trigger handleStartRaffle here
      console.log('[Scheduler] Starting scheduled giveaway:', scheduled.config.title || scheduled.config.keyword);
    });
    
    return () => SchedulerService.stop();
  }, []);

  // Save requirements when changed
  useEffect(() => {
    localStorage.setItem('giveaway_requirements', JSON.stringify(requirements));
  }, [requirements]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleStartRaffle = useCallback(() => {
    startTimeRef.current = Date.now();
    processedMessagesRef.current.clear();
    
    // If editing, update existing thread instead of creating new one
    if (editingThreadId) {
      // Get duration from timingConfig (preferred) or timerDuration
      const duration = raffle.config.useTimer 
        ? (raffle.config.timingConfig?.fixedDuration || raffle.config.timerDuration || 0)
        : undefined;
      const now = Date.now();
      const newEndsAt = duration && duration > 0 ? now + (duration * 1000) : undefined;
      
      // Update the existing thread with all fields
      threads.updateThread(editingThreadId, {
        name: raffle.config.title || `Sorteo ${raffle.mode === 'keyword' ? raffle.config.keyword : raffle.mode === 'subs' ? 'Subs' : 'Viewers'}`,
        keyword: raffle.config.keyword,
        mode: raffle.mode,
        subscribersOnly: raffle.config.subsOnly,
        prizeImages: raffle.config.prizeImages,
        timerDuration: duration,
        endsAt: newEndsAt,
        timeRemaining: undefined, // Clear paused time since we're resuming
        subsConfig: raffle.config.subsConfig,
        isActive: true,
        isPaused: false,
      });
      
      // Play start sound when restarting
      sound.play('start');
      
      setEditingThreadId(null);
      raffle.reset();
      participants.clear();
      setActiveTab('active');
      return;
    }

    const duration = raffle.calculateDuration();
    triggerGiveawayStart?.();
    sound.play('start');
    
    // Create an active thread
    const newThread = threads.createThread({
      name: raffle.config.title || `Sorteo ${raffle.mode === 'keyword' ? raffle.config.keyword : raffle.mode === 'subs' ? 'Subs' : 'Viewers'}`,
      keyword: raffle.config.keyword,
      mode: raffle.mode,
      subscribersOnly: raffle.config.subsOnly,
      allowMultipleEntries: raffle.mode === 'subs',
      prizeImages: raffle.config.prizeImages,
      timerDuration: raffle.config.useTimer ? duration : undefined,
      timingConfig: raffle.config.useTimer ? raffle.config.timingConfig : undefined,
      startNow: raffle.config.timingConfig?.timingMode === 'instant',
    });
    
    // Sync to cloud (Firebase)
    if (cloud.isReady) {
      cloud.saveToCloud(newThread, true).catch(err => {
        console.error('[GiveawayHub] Error syncing to cloud:', err);
      });
    }
    
    // Add existing participants to the new thread
    const existingParticipants = participants.getAll();
    if (existingParticipants.length > 0) {
      const participantObjects = existingParticipants.map((username, index) => ({
        oderId: `manual_${Date.now()}_${index}`,
        username,
        timestamp: Date.now(),
      }));
      threads.addParticipants(newThread.id, participantObjects);
    }
    
    // Reset form to allow creating more raffles
    raffle.reset();
    participants.clear();
    
    // Switch to active tab to see the new raffle
    setActiveTab('active');
  }, [raffle, participants, triggerGiveawayStart, threads, editingThreadId, cloud, sound]);

  const handleFinishRaffle = useCallback(() => {
    raffle.stop();
    raffle.startSelecting();

    const candidates = participants.getFiltered();
    if (candidates.length === 0) {
      raffle.softReset();
      return;
    }

    sound.play('drumroll');
    animation.start(candidates);
  }, [raffle, participants, animation, sound]);

  const handleWinnerSelected = useCallback((winner: string) => {
    const count = participants.count;
    
    // Save last winner for chat commands
    setLastWinner(winner);
    
    // Record to history
    recordGiveaway?.({
      name: raffle.config.title || `Sorteo ${raffle.mode}`,
      mode: raffle.mode,
      keyword: raffle.mode === 'keyword' ? raffle.config.keyword : undefined,
      winner,
      participantCount: count,
      subscribersOnly: raffle.config.subsOnly,
    });

    // Save to storage
    GiveawayStorage.addToHistory({
      id: Math.random().toString(36).substring(2, 9),
      name: raffle.config.title || `Sorteo ${raffle.mode}`,
      keyword: raffle.config.keyword,
      mode: raffle.mode,
      winner,
      participantCount: count,
      subscribersOnly: raffle.config.subsOnly,
      createdAt: startTimeRef.current,
      finishedAt: Date.now(),
    });

    // Notifications
    triggerGiveawayWinner?.();
    notifyGiveawayWinner?.(winner);
    sound.play('winner');
  }, [raffle, participants, recordGiveaway, triggerGiveawayWinner, notifyGiveawayWinner, sound]);

  const handleReset = useCallback(() => {
    raffle.reset();
    participants.clear();
    animation.reset();
    processedMessagesRef.current.clear();
    onClearChatMessages?.();
  }, [raffle, participants, animation, onClearChatMessages]);

  // Load chatters from Twitch API
  const handleLoadChatters = useCallback(async (): Promise<string[]> => {
    if (!authToken || !userId) {
      console.warn('Cannot load chatters: missing authToken or userId');
      return [];
    }
    
    setIsLoadingChatters(true);
    try {
      // Use the TwitchAdapter directly since we have the token
      const response = await fetch(
        `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${userId}&moderator_id=${userId}&first=1000`,
        {
          headers: {
            'Authorization': `Bearer ${authToken.replace('oauth:', '')}`,
            'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID || '',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Failed to load chatters:', response.status);
        return [];
      }
      
      const data = await response.json();
      const allChatters: string[] = data.data?.map((c: { user_login: string }) => c.user_login) || [];
      
      // Use BotDetectionService to filter bots
      const knownBots = BotDetectionService.getKnownBots();
      
      // Separate bots from regular chatters
      const bots: string[] = [];
      const validChatters: string[] = [];
      
      allChatters.forEach((name: string) => {
        const lowerName = name.toLowerCase();
        if (knownBots.includes(lowerName) || BotDetectionService.isKnownBot(lowerName)) {
          bots.push(lowerName);
        } else {
          validChatters.push(name);
        }
      });
      
      // Add bots to blacklist (excluidos)
      bots.forEach(bot => participants.addToBlacklist(bot));
      
      // Add valid chatters to participants
      validChatters.forEach((name: string) => participants.add(name, 'chatter'));
      
      // Log results
      if (bots.length > 0) {
        console.log(`[Chatters] Filtrados ${bots.length} bots: ${bots.join(', ')}`);
      }
      console.log(`[Chatters] Añadidos ${validChatters.length} chatters`);
      
      return validChatters;
    } catch (err) {
      console.error('Error loading chatters:', err);
      return [];
    } finally {
      setIsLoadingChatters(false);
    }
  }, [authToken, userId, participants]);

  // ============================================
  // EXPORT/IMPORT
  // ============================================
  const handleExport = useCallback(() => {
    const data: GiveawayExport = {
      version: 1,
      exportedAt: Date.now(),
      threads: threads.threads,
      history: GiveawayStorage.getHistory(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorteos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [threads.threads]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as GiveawayExport;
        
        if (!data.version || !data.threads) {
          setImportError('Archivo inválido: formato no reconocido');
          return;
        }

        // Import threads
        data.threads.forEach(thread => {
          if (!thread.winner) {
            threads.importThread(thread);
          }
        });

        // Import history
        if (data.history) {
          data.history.forEach(item => {
            GiveawayStorage.addToHistory(item);
          });
        }

        setShowImportModal(false);
        setImportError(null);
      } catch (err) {
        setImportError('Error al leer el archivo');
      }
    };
    reader.readAsText(file);
  }, [threads]);

  const handleRecoverBackup = useCallback(() => {
    const backup = localStorage.getItem('giveaway_backup');
    if (backup) {
      try {
        const data: GiveawayExport = JSON.parse(backup);
        data.threads.forEach(thread => {
          if (!thread.winner) {
            threads.importThread(thread);
          }
        });
        localStorage.removeItem('giveaway_backup');
      } catch { /* ignore */ }
    }
    setShowRecoveryModal(false);
  }, [threads]);

  const handleDiscardBackup = useCallback(() => {
    localStorage.removeItem('giveaway_backup');
    setShowRecoveryModal(false);
  }, []);

  // Get viewers count for display
  const getViewersCount = useCallback(() => {
    const viewers = new Set<string>();
    chatMessages.forEach((msg) => {
      if (raffle.config.subsOnly) {
        if (msg.isSubscriber) viewers.add(msg.username);
      } else {
        viewers.add(msg.username);
      }
    });
    return viewers.size;
  }, [chatMessages, raffle.config.subsOnly]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Gift className="text-white" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                {t.randomWinner?.title || 'Sorteos'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isConnected ? '● Conectado' : '○ Desconectado'}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1">
            <CloudSyncButton
              isReady={cloud.isReady}
              isSyncing={cloud.isSyncing}
              syncStatus={cloud.syncStatus}
              syncEnabled={cloud.syncEnabled}
              lastSyncTime={cloud.lastSyncTime}
              error={cloud.error}
              onToggleSync={cloud.setSyncEnabled}
              onManualSync={cloud.manualSync}
            />
            <SoundSettings
              isEnabled={sound.isEnabled}
              volume={sound.volume}
              onEnabledChange={sound.setEnabled}
              onVolumeChange={sound.setVolume}
              onTestSound={() => sound.play('winner')}
              soundConfig={sound.soundConfig}
              onSoundConfigChange={sound.setSoundConfig}
              onTestSoundFile={sound.testSound}
              customSounds={sound.customSounds}
            />
            <Tooltip content="Configuración de chat">
              <button
                onClick={() => setShowChatSettings(true)}
                className={`p-1.5 rounded-lg transition-colors ${
                  chatConfig.enabled 
                    ? 'text-blue-500 hover:bg-blue-500/10' 
                    : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <MessageSquare size={16} />
              </button>
            </Tooltip>
            <ViewModeToggle
              mode={viewMode}
              onChange={setViewMode}
              disabled={wizardMode}
            />
            <Tooltip content="Modo asistente">
              <WizardButton
                isActive={wizardMode}
                onClick={() => {
                  const newWizardMode = !wizardMode;
                  setWizardMode(newWizardMode);
                  if (newWizardMode) {
                    setActiveTab('raffle'); // Go to "Nuevo" tab when activating wizard
                    wizard.reset();
                  }
                }}
              />
            </Tooltip>
            <Tooltip content="Exportar sorteos">
              <button
                onClick={handleExport}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Download size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Importar sorteos">
              <label className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <Upload size={16} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                />
              </label>
            </Tooltip>
            <Tooltip content="Limpiar todo">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mt-4">
          <button
            onClick={() => setActiveTab('raffle')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'raffle'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Gift size={14} />
            {editingThreadId ? 'Editando' : 'Nuevo'}
            {editingThreadId && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingThreadId(null);
                  raffle.reset();
                  participants.clear();
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/20 cursor-pointer"
                title="Cancelar edición"
              >
                <X size={12} />
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Layers size={14} />
            Activos
            {(threads.activeCount + threads.finishedThreads.length) > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'active' ? 'bg-white/20' : 'bg-green-500 text-white'
              }`}>
                {threads.activeCount + threads.finishedThreads.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scheduled'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <CalendarClock size={14} />
            Programados
            {threads.scheduledCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'scheduled' ? 'bg-white/20' : 'bg-blue-500 text-white'
              }`}>
                {threads.scheduledCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Estadísticas"
          >
            <BarChart3 size={14} />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Historial"
          >
            <History size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Wizard Mode */}
        {wizardMode ? (
          <div className="space-y-4">
            {/* Exit wizard button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setWizardMode(false);
                  wizard.reset();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={14} />
                Salir del asistente
              </button>
            </div>
            
            <WizardStepper
              steps={wizardSteps}
              currentStep={wizard.currentStep}
              onStepChange={wizard.goToStep}
              showNavigation={true}
              canProceed={canWizardProceed}
              finishLabel="Iniciar Sorteo"
              onFinish={() => {
                if (canWizardProceed && isConnected) {
                  handleStartRaffle();
                  setWizardMode(false);
                  wizard.reset();
                }
              }}
            />

            {/* Wizard Step Content */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              {/* Step 1: Mode Selection */}
              {wizard.currentStep === 0 && (
                <div className="space-y-4">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                    Selecciona el tipo de sorteo que quieres realizar:
                  </p>
                  <ModeSelector
                    value={raffle.mode}
                    onChange={raffle.setMode}
                    disabled={raffle.isRunning}
                    size="md"
                    showDescriptions={true}
                    direction="vertical"
                  />
                </div>
              )}

              {/* Step 2: Configuration */}
              {wizard.currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                    Configura las opciones del sorteo:
                  </p>

                  {/* Keyword input for keyword mode */}
                  {raffle.mode === 'keyword' && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                        Palabra clave *
                      </label>
                      <input
                        type="text"
                        value={raffle.config.keyword}
                        onChange={(e) => raffle.updateConfig({ keyword: e.target.value })}
                        placeholder="Ej: !sorteo"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                      />
                      {!raffle.config.keyword.trim() && (
                        <p className="text-yellow-500 text-xs flex items-center gap-1 mt-2">
                          <AlertCircle size={12} /> Debes escribir una palabra clave para continuar
                        </p>
                      )}
                    </div>
                  )}

                  {/* Subs config for subs mode */}
                  {raffle.mode === 'subs' && (
                    <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
                            Configuración de Subs
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            T1: {raffle.config.subsConfig.tier1Value}, T2: {raffle.config.subsConfig.tier2Value}, T3: {raffle.config.subsConfig.tier3Value}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowSubsConfig(true)}
                          className="p-2 rounded-lg bg-pink-500/20 text-pink-500 hover:bg-pink-500/30"
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timer toggle - not for subs mode */}
                  {raffle.mode !== 'subs' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          Usar temporizador
                        </span>
                        <button
                          onClick={() => raffle.updateConfig({ useTimer: !raffle.config.useTimer })}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            raffle.config.useTimer ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            raffle.config.useTimer ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Duration picker - only when timer enabled */}
                      {raffle.config.useTimer && (
                        <DurationPicker
                          value={raffle.config.timerDuration}
                          onChange={(d) => raffle.updateConfig({ timerDuration: d })}
                          showScheduled={true}
                          startNow={raffle.config.startNow}
                          onStartNowChange={(sn) => raffle.updateConfig({ startNow: sn })}
                          startDate={raffle.config.startDate}
                          onStartDateChange={(sd) => raffle.updateConfig({ startDate: sd })}
                          startTime={raffle.config.startTime}
                          onStartTimeChange={(st) => raffle.updateConfig({ startTime: st })}
                          endDate={raffle.config.endDate}
                          onEndDateChange={(ed) => raffle.updateConfig({ endDate: ed })}
                          endTime={raffle.config.endTime}
                          onEndTimeChange={(et) => raffle.updateConfig({ endTime: et })}
                        />
                      )}
                    </div>
                  )}

                  {/* Subs only toggle - not for subs mode */}
                  {raffle.mode !== 'subs' && (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Solo suscriptores
                      </span>
                      <button
                        onClick={() => raffle.updateConfig({ subsOnly: !raffle.config.subsOnly })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          raffle.config.subsOnly ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          raffle.config.subsOnly ? 'left-5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Start */}
              {wizard.currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                    Revisa la configuración y comienza el sorteo:
                  </p>

                  {/* Summary */}
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-purple-500" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {raffle.mode === 'viewers' && 'Sorteo entre viewers'}
                        {raffle.mode === 'keyword' && `Sorteo por palabra clave: "${raffle.config.keyword}"`}
                        {raffle.mode === 'subs' && 'Sorteo entre suscriptores'}
                      </span>
                    </div>
                    
                    {raffle.mode !== 'subs' && (
                      <>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className={`w-2 h-2 rounded-full ${raffle.config.useTimer ? 'bg-purple-500' : 'bg-zinc-400'}`} />
                          {raffle.config.useTimer 
                            ? `Con temporizador: ${Math.floor(raffle.config.timerDuration / 60)}m ${raffle.config.timerDuration % 60}s` 
                            : 'Sin temporizador'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className={`w-2 h-2 rounded-full ${raffle.config.subsOnly ? 'bg-pink-500' : 'bg-zinc-400'}`} />
                          {raffle.config.subsOnly ? 'Solo suscriptores' : 'Todos los usuarios'}
                        </div>
                      </>
                    )}

                    {raffle.mode === 'subs' && (
                      <div className="text-xs text-zinc-500">
                        Entradas: T1={raffle.config.subsConfig.tier1Value}, T2={raffle.config.subsConfig.tier2Value}, T3={raffle.config.subsConfig.tier3Value}
                      </div>
                    )}
                  </div>

                  {/* Connection status */}
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${
                    isConnected 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-sm ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isConnected ? 'Conectado al chat' : 'Desconectado - conecta para iniciar'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'raffle' ? (
          <RaffleTab
            mode={raffle.mode}
            onModeChange={raffle.setMode}
            keyword={raffle.config.keyword}
            onKeywordChange={(kw) => raffle.updateConfig({ keyword: kw })}
            useTimer={raffle.config.useTimer}
            onUseTimerChange={(ut) => raffle.updateConfig({ useTimer: ut })}
            subsOnly={raffle.config.subsOnly}
            onSubsOnlyChange={(so) => raffle.updateConfig({ subsOnly: so })}
            timerDuration={raffle.config.timerDuration}
            onTimerDurationChange={(d) => raffle.updateConfig({ timerDuration: d })}
            startNow={raffle.config.startNow}
            onStartNowChange={(sn) => raffle.updateConfig({ startNow: sn })}
            startDate={raffle.config.startDate}
            onStartDateChange={(sd) => raffle.updateConfig({ startDate: sd })}
            startTime={raffle.config.startTime}
            onStartTimeChange={(st) => raffle.updateConfig({ startTime: st })}
            endDate={raffle.config.endDate}
            onEndDateChange={(ed) => raffle.updateConfig({ endDate: ed })}
            endTime={raffle.config.endTime}
            onEndTimeChange={(et) => raffle.updateConfig({ endTime: et })}
            prizeImages={raffle.config.prizeImages}
            onPrizeImagesChange={(imgs) => raffle.updateConfig({ prizeImages: imgs })}
            timingConfig={raffle.config.timingConfig}
            onTimingConfigChange={(tc) => raffle.updateConfig({ timingConfig: tc })}
            timeLeft={raffle.timeLeft}
            participants={participants.participants}
            participantSources={participants.participantSources}
            onAddParticipant={participants.add}
            onAddMultipleParticipants={(names, source) => participants.addMultiple(names, source as 'manual' | 'chat' | 'import' | 'chatter' | undefined)}
            onRemoveParticipant={participants.remove}
            onClearParticipants={participants.clear}
            isParticipant={participants.has}
            excludedList={participants.blacklist}
            onExclude={participants.addToBlacklist}
            onRemoveExcluded={participants.removeFromBlacklist}
            onClearExcluded={participants.clearBlacklist}
            isExcluded={participants.isBlacklisted}
            onExportExcluded={() => {
              const content = participants.exportBlacklist();
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'excluidos.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            onImportExcluded={(content) => {
              const names = content.split(/[\n,;]+/).map(n => n.trim()).filter(n => n);
              names.forEach(n => participants.addToBlacklist(n));
            }}
            onMoveToExcluded={(name) => {
              participants.remove(name);
              participants.addToBlacklist(name);
            }}
            onMoveToParticipants={(name) => {
              participants.removeFromBlacklist(name);
              participants.add(name);
            }}
            onImportParticipants={(content) => {
              const names = content.split(/[\n,;]+/).map(n => n.trim()).filter(n => n);
              names.forEach(n => participants.add(n));
            }}
            onExportParticipants={() => {
              const content = participants.getAll().join('\n');
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'participantes.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            onLoadChatters={handleLoadChatters}
            isLoadingChatters={isLoadingChatters}
            isRunning={false}
            isSelecting={false}
            winner={null}
            onStart={handleStartRaffle}
            onStop={handleFinishRaffle}
            onReset={handleReset}
            canStart={isConnected}
            subsConfig={raffle.config.subsConfig}
            onOpenSubsConfig={() => setShowSubsConfig(true)}
            viewersCount={getViewersCount()}
            viewMode={viewMode}
            winnersCount={raffle.config.winnersCount}
            onWinnersCountChange={(count) => raffle.updateConfig({ winnersCount: count })}
            allowRepeatWinners={raffle.config.allowRepeatWinners}
            onAllowRepeatChange={(allow) => raffle.updateConfig({ allowRepeatWinners: allow })}
            prizes={raffle.config.prizes}
            onPrizesChange={(prizes) => raffle.updateConfig({ prizes })}
            requirements={requirements}
            onRequirementsChange={setRequirements}
            onCreateThread={() => {
              threads.createThread({
                name: raffle.config.title || `Sorteo ${raffle.config.keyword}`,
                keyword: raffle.config.keyword,
                mode: raffle.mode === 'subs' ? 'subs' : 'keyword',
                subscribersOnly: raffle.config.subsOnly,
                allowMultipleEntries: false,
                prizeImages: raffle.config.prizeImages,
                timerDuration: raffle.config.useTimer ? raffle.config.timerDuration : undefined,
                timingConfig: raffle.config.useTimer ? raffle.config.timingConfig : undefined,
              });
              setActiveTab('active');
            }}
          />
        ) : activeTab === 'active' ? (
          <ThreadsTab
            threads={[...threads.activeThreads, ...threads.finishedThreads]}
            viewMode={viewMode}
            onTogglePause={threads.togglePause}
            onDelete={threads.deleteThread}
            onPickWinner={async (id) => {
              const thread = threads.threads.find(t => t.id === id);
              if (!thread || thread.participants.length === 0) return;
              
              const participantNames = thread.participants.map(p => p.username);
              
              // Start spinning animation in overlay
              sync.sync({
                winner: null,
                isSpinning: true,
                displayName: '...',
                participants: participantNames,
              });
              
              sound.play('drumroll');
              
              // Animate through names for 2 seconds
              const animationDuration = 2000;
              const startTime = Date.now();
              
              const animateNames = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed < animationDuration) {
                  const randomName = participantNames[Math.floor(Math.random() * participantNames.length)];
                  sync.sync({
                    winner: null,
                    isSpinning: true,
                    displayName: randomName,
                    participants: participantNames,
                  });
                  setTimeout(animateNames, 80 + (elapsed / animationDuration) * 120); // Slow down over time
                } else {
                  // Pick actual winner
                  const winner = threads.pickWinner(id, participants.blacklist);
                  if (winner && thread) {
                    // Show winner modal
                    setCurrentWinner({
                      threadId: id,
                      threadName: thread.name,
                      winner,
                      participantCount: threads.getUniqueParticipantCount(thread),
                      prizeImages: thread.prizeImages,
                    });
                    
                    // Sync winner to cloud (Firebase)
                    if (cloud.isReady) {
                      cloud.updateInCloud(id, {
                        winner: { oderId: '', username: winner },
                        isActive: false,
                        closedAt: Date.now(),
                        participantCount: threads.getUniqueParticipantCount(thread),
                      }).catch(err => console.error('[GiveawayHub] Error updating cloud:', err));
                    }
                    
                    // Sync winner to overlay
                    sync.sync({
                      winner: winner,
                      isSpinning: false,
                      displayName: winner,
                      participants: participantNames,
                    });
                    
                    triggerGiveawayWinner?.();
                    notifyGiveawayWinner?.(winner);
                    sound.play('winner');
                  }
                }
              };
              
              animateNames();
            }}
            onCloseWinner={(id) => {
              threads.closeThread(id);
              setCurrentWinner(null);
              // Clear overlay winner state
              sync.sync({
                winner: null,
                isSpinning: false,
                displayName: '',
                participants: [],
              });
            }}
            onEdit={(id) => {
              const thread = threads.threads.find(t => t.id === id);
              if (thread) {
                // Load thread data into raffle config
                raffle.setMode(thread.mode);
                
                // Calculate remaining time
                let remainingTime = 0;
                const now = Date.now();
                
                // If thread has a winner, time is 0 (finished)
                if (thread.winner) {
                  remainingTime = 0;
                } else if (thread.timeRemaining !== undefined) {
                  // Thread was paused, use saved remaining time
                  remainingTime = thread.timeRemaining;
                } else if (thread.endsAt) {
                  // Calculate from endsAt - if in the past, will be 0
                  const remaining = Math.floor((thread.endsAt - now) / 1000);
                  remainingTime = remaining > 0 ? remaining : 0;
                } else if (thread.isActive && thread.timerDuration) {
                  // Thread is active with timer but no endsAt yet
                  // This means the thread has no time limit, use timerDuration as default
                  remainingTime = thread.timerDuration;
                }
                // Otherwise remainingTime stays 0
                
                raffle.updateConfig({
                  keyword: thread.keyword || '',
                  subsOnly: thread.subscribersOnly,
                  prizeImages: thread.prizeImages || [],
                  title: thread.name,
                  useTimer: true, // Always enable timer when editing so user can set new time
                  timerDuration: remainingTime,
                  subsConfig: thread.subsConfig || raffle.config.subsConfig,
                  // Update timingConfig to match the remaining time
                  timingConfig: {
                    ...raffle.config.timingConfig,
                    timingMode: 'instant',
                    durationMode: 'fixed',
                    fixedDuration: remainingTime,
                  },
                });
                
                // Load participants from thread
                participants.clear();
                thread.participants.forEach(p => participants.add(p.username));
                
                // Set editing state and switch to raffle tab
                setEditingThreadId(id);
                setActiveTab('raffle');
              }
            }}
            getUniqueCount={threads.getUniqueParticipantCount}
          />
        ) : activeTab === 'scheduled' ? (
          <ThreadsTab
            threads={threads.scheduledThreads}
            viewMode={viewMode}
            onTogglePause={threads.togglePause}
            onDelete={threads.deleteThread}
            onEdit={(id) => {
              const thread = threads.threads.find(t => t.id === id);
              if (thread) {
                raffle.setMode(thread.mode);
                
                // Calculate remaining time for scheduled threads
                // Scheduled threads haven't started yet, so use their configured duration
                let remainingTime = 0;
                
                if (thread.timerDuration) {
                  // Use the configured duration (thread hasn't started yet)
                  remainingTime = thread.timerDuration;
                } else if (thread.timeRemaining !== undefined) {
                  remainingTime = thread.timeRemaining;
                } else if (thread.endsAt && thread.startsAt) {
                  // Calculate duration from scheduled times
                  remainingTime = Math.max(0, Math.floor((thread.endsAt - thread.startsAt) / 1000));
                }
                
                raffle.updateConfig({
                  keyword: thread.keyword || '',
                  subsOnly: thread.subscribersOnly,
                  prizeImages: thread.prizeImages || [],
                  title: thread.name,
                  useTimer: true,
                  timerDuration: remainingTime,
                  subsConfig: thread.subsConfig || raffle.config.subsConfig,
                  // Update timingConfig to match the remaining time
                  timingConfig: {
                    ...raffle.config.timingConfig,
                    timingMode: thread.startsAt ? 'scheduled' : 'instant',
                    durationMode: 'fixed',
                    fixedDuration: remainingTime,
                    scheduledStartDate: thread.startsAt ? new Date(thread.startsAt).toISOString().split('T')[0] : undefined,
                    scheduledStartTime: thread.startsAt ? new Date(thread.startsAt).toTimeString().slice(0, 5) : undefined,
                  },
                });
                participants.clear();
                thread.participants.forEach(p => participants.add(p.username));
                setEditingThreadId(id);
                setActiveTab('raffle');
              }
            }}
            getUniqueCount={threads.getUniqueParticipantCount}
            emptyMessage="No hay sorteos programados"
          />
        ) : activeTab === 'stats' ? (
          <StatsPanel />
        ) : (
          <HistoryPanel />
        )}
      </div>

      {/* Winner Modal */}
      {currentWinner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Prize images */}
            {currentWinner.prizeImages && currentWinner.prizeImages.length > 0 && (
              <div className="flex justify-center gap-2 mb-4">
                {currentWinner.prizeImages.slice(0, 3).map((img, i) => (
                  <img 
                    key={i}
                    src={img} 
                    alt={`Premio ${i + 1}`}
                    className="w-20 h-20 rounded-xl object-cover ring-4 ring-purple-500/30 shadow-lg"
                  />
                ))}
              </div>
            )}
            
            {/* Celebration header */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="text-yellow-500" size={24} />
                <Trophy className="text-yellow-500" size={32} />
                <Sparkles className="text-yellow-500" size={24} />
              </div>
              <h2 className="text-xl font-bold text-zinc-800 dark:text-white">
                ¡Tenemos ganador!
              </h2>
              <p className="text-sm text-zinc-500">{currentWinner.threadName}</p>
            </div>
            
            {/* Winner name */}
            <div className="text-center py-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl mb-4">
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {currentWinner.winner}
              </p>
              <p className="text-sm text-zinc-500 mt-2">
                de {currentWinner.participantCount} participantes
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                threads.closeThread(currentWinner.threadId);
                setCurrentWinner(null);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Cerrar y guardar en historial
            </button>
          </div>
        </div>
      )}

      {/* OBS Overlay URL */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <OBSOverlayUrl overlayParam="overlayRandomWinner" title="el sorteo" />
      </div>

      {/* Modals */}
      {showSubsConfig && (
        <SubsConfigModal
          config={raffle.config.subsConfig}
          onChange={(config) => raffle.updateConfig({ subsConfig: config })}
          onClose={() => setShowSubsConfig(false)}
        />
      )}

      {/* Chat Settings Modal */}
      {showChatSettings && (
        <ChatSettings
          config={chatConfig}
          onConfigChange={(config) => {
            setChatConfig(config);
            localStorage.setItem('giveaway_chat_config', JSON.stringify(config));
            getChatCommandsService().updateConfig(config);
          }}
          onClose={() => setShowChatSettings(false)}
        />
      )}

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="text-yellow-500" size={24} />
              </div>
              <h3 className="font-bold text-lg text-zinc-800 dark:text-white">
                Sorteos sin finalizar
              </h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Se encontraron sorteos activos de una sesión anterior. ¿Deseas recuperarlos?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardBackup}
                className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleRecoverBackup}
                className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                Recuperar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Error Modal */}
      {importError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <h3 className="font-bold text-lg text-zinc-800 dark:text-white">
                Error de importación
              </h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">{importError}</p>
            <button
              onClick={() => setImportError(null)}
              className="w-full py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiveawayHub;
