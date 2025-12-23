import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { CollaborationPanel } from './components/CollaborationPanel';
import { PollCreator } from './components/PollCreator';
import { LivePoll } from './components/LivePoll';
import { RecentVotes } from './components/RecentVotes';
import { PollHistory } from './components/PollHistory';
import { ChatFeed } from './components/ChatFeed';
import { NotificationContainer, NotificationItem, NotificationType } from './components/Notification';
import { StreamPlayer } from './components/StreamPlayer';
import { AssetLibrary } from './components/AssetLibrary';
import { AIConfigPanel } from './components/AIConfigPanel';
import { StreamAnalytics } from './components/StreamAnalytics';
import { AnimatedBackground } from './components/AnimatedBackground';
import { LanguageSelector } from './components/LanguageSelector';
import { AIVisionMascot, UserDifficulty } from './components/AIVisionMascot';
import { twitchService } from './services/twitchService';
import { StoredMessage } from './services/aiAnalyticsService';
import { 
  ConnectionStatus, 
  Poll, 
  VoteRecord, 
  TwitchMessage, 
  MediaAsset,
  ModerationConfig,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  UserVoteState,
  createLogEntry,
  updateStats,
} from './types';
import { STORAGE_KEYS } from './constants/storageKeys';
import { useTheme } from './context';
import { useI18n } from './i18n';
import { 
  usePoll, 
  useModeration, 
  useOverlay, 
  useTwitchConnection, 
  useAIAnalytics,
  useDemoTour,
  useViewerCount,
  DEFAULT_OVERLAY_SETTINGS,
  getChannelFromUrl,
  getPollConfigFromUrl,
  TourStep,
} from './hooks';
import { DemoTourOverlay } from './components/DemoTourOverlay';
import { MessageSquare, Activity, Tv, Image as ImageIcon, Vote as VoteIcon, LayoutDashboard, Moon, Sun, History, Power, ChevronLeft, ChevronRight, ChevronDown, BarChart3, Bot, Eye, Play, Volume2, Wrench, Users, Trophy, X, Gift, Gamepad2 } from 'lucide-react';
import { SoundBoard } from './components/SoundBoard';
import { Tools } from './components/Tools';
import { Countdown } from './components/Countdown';
import { SpinnerWheel } from './components/SpinnerWheel';
import { RandomWinnerOverlay } from './components/RandomWinnerOverlay';
import { JudgePanel } from './components/JudgePanel';
import { GiveawayHub } from './components/GiveawayHub';
import { StreamGames } from './components/StreamGames';
import { PiumOverlay } from './components/games/PiumOverlay';
import { RouletteOverlay } from './components/games/RouletteOverlay';
import { FishingOverlay } from './components/games/FishingOverlay';
import { BattleshipOverlay } from './components/games/BattleshipOverlay';
import { DuckHuntOverlay } from './components/games/DuckHuntOverlay';
import { VeoVeoOverlay } from './components/games/VeoVeoOverlay';
import { PPTOverlay } from './components/games/PPTOverlay';
import { AhorcadoOverlay } from './components/games/AhorcadoOverlay';
import { CarreraOverlay } from './components/games/CarreraOverlay';
import { MemoriaOverlay } from './components/games/MemoriaOverlay';
import { PotatoOverlay } from './components/games/PotatoOverlay';
import { TriviaOverlay } from './components/games/TriviaOverlay';
import { useKeyboardShortcuts } from './components/KeyboardShortcuts';

const DEMO_CHANNEL = 'twitchdev'; // Official Twitch test channel for demo

const App: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();

  // Use custom hooks for state management
  const { 
    isOverlayMode, 
    settings: overlaySettings, 
    showSettings: showOverlaySettings, 
    setSettings: setOverlaySettings, 
    toggleSettings: toggleOverlaySettings 
  } = useOverlay();

  const {
    status,
    error: connectionError,
    channelName,
    channelAvatar,
    authToken,
    connect: twitchConnect,
    disconnect: twitchDisconnect,
    collaborationChannels,
    addCollaborator,
    removeCollaborator,
    isCollaborationActive,
    tokenExpiresIn,
    tokenExpiringSoon,
    savedCredentials,
    clearSavedCredentials,
  } = useTwitchConnection({
    onStatusChange: (newStatus, err) => {
      if (err) {
        addNotification('error', err);
        aiAnalytics.incrementConnectionAttempts();
        aiAnalytics.setUserDifficulty({
          type: 'connection_failed',
          timestamp: Date.now(),
          context: err
        });
      } else if (newStatus === ConnectionStatus.CONNECTED) {
        addNotification('success', t.connection.connectedSuccess, { channelInitial: channelName.charAt(0) });
        aiAnalytics.resetConnectionAttempts();
        aiAnalytics.setUserDifficulty(undefined);
      }
    },
    skipConnection: isOverlayMode,
  });

  const poll = usePoll({
    syncToStorage: !isOverlayMode,
    isOverlayMode,
  });

  const moderation = useModeration();

  const aiAnalytics = useAIAnalytics();

  // Viewer count hook - fetches real viewer count from Twitch
  const { viewerCount } = useViewerCount({
    enabled: status === ConnectionStatus.CONNECTED,
    interval: 30000, // Update every 30 seconds
  });

  // UI State (not extracted to hooks - local to App)
  const [chatMessages, setChatMessages] = useState<TwitchMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'stream' | 'collab'>('chat');
  const [leftTab, setLeftTab] = useState<'poll' | 'judge' | 'giveaway' | 'games' | 'gallery' | 'data'>('poll');
  const [dataSubTab, setDataSubTab] = useState<'activity' | 'analytics'>('analytics');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'tabs' | 'split'>('tabs'); // 'tabs' = one at a time, 'split' = both visible
  const [splitRatio, setSplitRatio] = useState(50); // Percentage for chat (stream gets the rest)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showCollabInSplit, setShowCollabInSplit] = useState(false); // Show collab panel in split mode
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [demoForceModeration, setDemoForceModeration] = useState(false);
  const [showSoundBoard, setShowSoundBoard] = useState(false);
  const [leftSidebarHidden, setLeftSidebarHidden] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [miniBarPosition, setMiniBarPosition] = useState({ x: 16, y: 16 });
  const [isDraggingMiniBar, setIsDraggingMiniBar] = useState(false);
  const miniBarDragOffset = useRef({ x: 0, y: 0 });

  // Keyboard shortcuts actions
  const shortcutActions = useMemo(() => ({
    createPoll: () => {
      // This would need to trigger the poll creation - handled in PollCreator
    },
    stopPoll: () => {
      if (poll.currentPoll?.isActive) {
        poll.setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
      }
    },
    resetPoll: () => {
      poll.resetPoll();
    },
    navPanel: () => setLeftTab('poll'),
    navGallery: () => setLeftTab('gallery'),
    navData: () => setLeftTab('data'),
    closeModal: () => {
      setShowHistory(false);
      setShowTools(false);
      setShowSoundBoard(false);
    },
    toggleTheme: () => toggleTheme(),
    showHistory: () => setShowHistory(true),
    toggleSidebar: () => setLeftSidebarHidden(prev => !prev),
  }), [poll, toggleTheme]);

  // Use keyboard shortcuts
  useKeyboardShortcuts(shortcutActions);

  // Demo tour hook - connects to demo channel and navigates automatically
  const demoTour = useDemoTour({ 
    locale,
    onStart: () => {
      // Auto-connect to demo channel when tour starts
      twitchConnect(DEMO_CHANNEL);
    },
    onStepChange: (step: TourStep) => {
      // Execute navigation actions for each step
      if (step.action) {
        const { leftTab: newLeftTab, dataSubTab: newDataSubTab, rightTab, showModeration, createDemoPoll, showSoundBoard: showSoundBoardAction } = step.action;
        
        if (newLeftTab) setLeftTab(newLeftTab);
        if (newDataSubTab) setDataSubTab(newDataSubTab);
        if (rightTab) setActiveRightTab(rightTab);
        if (showModeration !== undefined) setDemoForceModeration(showModeration);
        
        // Handle SoundBoard - close it when moving to other steps
        setShowSoundBoard(showSoundBoardAction === true);
        
        // Create a demo poll if needed (with spinner-friendly options)
        if (createDemoPoll && !poll.currentPoll) {
          poll.createPoll({
            title: 'Demo',
            question: '¿Qué prefieres?',
            options: [
              { label: 'Pizza', color: '#a970ff', voteKey: 'pizza' },
              { label: 'Burger', color: '#00f0f0', voteKey: 'burger' },
              { label: 'Tacos', color: '#ff6b6b', voteKey: 'tacos' },
            ],
          });
        }
      }
    },
    onEnd: () => {
      // Reset demo state when tour ends
      setDemoForceModeration(false);
      setShowSoundBoard(false);
      setLeftTab('poll');
    },
  });
  
  // Popup window ref (at App level so it persists across tab changes)
  const overlayWindowRef = useRef<Window | null>(null);
  
  // Refs for callbacks
  const pollRef = useRef<Poll | null>(null);
  const moderationConfigRef = useRef<ModerationConfig>(DEFAULT_MODERATION_CONFIG);
  const addMessageToSessionRef = useRef(aiAnalytics.addMessageToSession);

  // Sync refs with hook state
  useEffect(() => {
    pollRef.current = poll.currentPoll;
  }, [poll.currentPoll]);

  useEffect(() => {
    moderationConfigRef.current = moderation.config;
  }, [moderation.config]);

  useEffect(() => {
    addMessageToSessionRef.current = aiAnalytics.addMessageToSession;
  }, [aiAnalytics.addMessageToSession]);

  // Check for Overlay Mode on Mount - handle channel and poll from URL
  useEffect(() => {
    if (isOverlayMode) {
      setTheme('dark');
      
      const channel = getChannelFromUrl();
      if (channel) {
        twitchService.connect(channel);
        
        const pollConfig = getPollConfigFromUrl();
        if (pollConfig) {
          const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6'];
          poll.createPoll({
            title: 'Encuesta',
            question: pollConfig.question,
            options: pollConfig.options.map((label, i) => ({
              label,
              color: colors[i % colors.length],
            })),
          });
        }
      }
    }
  }, [isOverlayMode]);

  // Load Media Library from localStorage
  useEffect(() => {
    const savedAssets = localStorage.getItem(STORAGE_KEYS.MEDIA_ASSETS);
    if (savedAssets) {
      try {
        setMediaLibrary(JSON.parse(savedAssets));
      } catch (e) {
        console.error("Failed to load assets", e);
      }
    }
  }, []);

  // Create/manage stream session when connected
  useEffect(() => {
    if (status === ConnectionStatus.CONNECTED && channelName && !isOverlayMode) {
      aiAnalytics.startSession(channelName);
    } else if (status === ConnectionStatus.DISCONNECTED && aiAnalytics.currentSession) {
      aiAnalytics.endSession();
    }
  }, [status, channelName, isOverlayMode]);

  // Token expiration warning
  const [tokenWarningShown, setTokenWarningShown] = useState(false);
  useEffect(() => {
    if (tokenExpiringSoon && !tokenWarningShown && status === ConnectionStatus.CONNECTED) {
      const minutes = tokenExpiresIn ? Math.ceil(tokenExpiresIn / 60) : 0;
      addNotification('info', `Token OAuth expira en ~${minutes}min. Solo afecta a: emotes de Twitch, lista de subs/chatters. El chat y juegos seguirán funcionando.`);
      setTokenWarningShown(true);
    }
    // Reset warning flag when token is refreshed or disconnected
    if (!tokenExpiringSoon) {
      setTokenWarningShown(false);
    }
  }, [tokenExpiringSoon, tokenExpiresIn, status, tokenWarningShown]);

  // Set distinctive window title for OBS overlay identification
  useEffect(() => {
    if (isOverlayMode) {
      document.title = '🎬 OVERLAY - Twitch Vote';
    }
  }, [isOverlayMode]);

  // AI Vision Mascot - Detect user difficulties
  useEffect(() => {
    if (!poll.currentPoll || !poll.currentPoll.isActive || isOverlayMode) return;
    
    const checkNoVotes = setTimeout(() => {
      if (poll.currentPoll && poll.currentPoll.isActive && poll.currentPoll.totalVotes === 0) {
        aiAnalytics.setUserDifficulty({
          type: 'no_votes',
          timestamp: Date.now(),
          context: 'La encuesta lleva activa un rato sin votos'
        });
      }
    }, 30000);
    
    if (poll.currentPoll.totalVotes > 0 && aiAnalytics.userDifficulty?.type === 'no_votes') {
      aiAnalytics.setUserDifficulty(undefined);
    }
    
    return () => clearTimeout(checkNoVotes);
  }, [poll.currentPoll, isOverlayMode]);

  // Track last notification to prevent spam
  const lastNotificationRef = useRef<{ message: string; time: number }>({ message: '', time: 0 });
  
  const addNotification = (type: NotificationType, message: string, metadata?: { channelInitial?: string }) => {
    const now = Date.now();
    // Prevent duplicate notifications within 3 seconds
    if (lastNotificationRef.current.message === message && 
        now - lastNotificationRef.current.time < 3000) {
      return;
    }
    
    lastNotificationRef.current = { message, time: now };
    const id = now.toString() + Math.random();
    
    // Limit to max 3 notifications at a time
    setNotifications(prev => {
      const newNotifications = [...prev, { id, type, message, metadata }];
      return newNotifications.slice(-3);
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAddAsset = (asset: MediaAsset) => {
    const updated = [asset, ...mediaLibrary];
    setMediaLibrary(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.MEDIA_ASSETS, JSON.stringify(updated));
    } catch (e) {
      addNotification('error', t.notifications.storageFull);
    }
  };

  const handleDeleteAsset = (id: string) => {
    const updated = mediaLibrary.filter(a => a.id !== id);
    setMediaLibrary(updated);
    localStorage.setItem(STORAGE_KEYS.MEDIA_ASSETS, JSON.stringify(updated));
  };

  const handleConnect = (channel: string, token?: string) => {
    twitchConnect(channel, token);
  };

  const handleDisconnect = () => {
    twitchDisconnect();
    poll.resetPoll();
    moderation.reset();
    setChatMessages([]);
  };

  const handleCreatePoll = (title: string, question: string, options: any[], maxVotes?: number, duration?: number, progressBarColor?: string, limitIndicatorColor?: string, config?: ModerationConfig, votePrefix?: string, voteMatchMode?: 'exact' | 'partial') => {
    const prefix = votePrefix || '+';
    const newPoll = poll.createPoll({
      title,
      question,
      options: options.map(o => ({
        label: o.label,
        color: o.color,
        icon: o.icon,
        image: o.image,
        voteKey: o.voteKey,
      })),
      maxVotes,
      duration,
      progressBarColor,
      limitIndicatorColor,
      votePrefix: prefix,
      voteMatchMode: voteMatchMode || 'exact',
    });
    
    // Reset moderation state for new poll
    if (config) {
      moderation.setConfig(config);
    }
    moderation.reset();
    
    // Announce in chat and sync with overlay
    if (authToken) {
      const optLabels = newPoll.options.map(o => o.label).join('|');
      twitchService.sendMessage(`!pollsync ${question}|${optLabels}`);
      twitchService.sendMessage(`${t.chat.newPoll}: ${question}`);
      const opts = newPoll.options.map(o => `${prefix}${o.id} ${o.label}`).join(' | ');
      twitchService.sendMessage(`${t.chat.options}: ${opts}`);
      twitchService.sendMessage(t.chat.voteHint.replace('+', prefix));
    }
  };

  const handleStopPoll = (auto = false) => {
    const finishedPoll = poll.stopPoll(auto);
    if (!finishedPoll) return;
    
    // Save poll results to current session for analytics
    if (aiAnalytics.currentSession) {
      const totalVotes = finishedPoll.options.reduce((acc, o) => acc + o.votes, 0);
      const pollSummary = {
        question: finishedPoll.question,
        winner: finishedPoll.options.reduce((a, b) => a.votes > b.votes ? a : b).label,
        totalVotes,
        options: finishedPoll.options.map(o => ({
          label: o.label,
          votes: o.votes,
          percentage: totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0,
        })),
      };
      aiAnalytics.addPollResultToSession(pollSummary);
    }
    
    if (authToken) {
      twitchService.sendMessage(`!pollend`);
      const winner = finishedPoll.options.reduce((a, b) => a.votes > b.votes ? a : b);
      twitchService.sendMessage(`${t.chat.pollEnded}: ${finishedPoll.question}`);
      twitchService.sendMessage(`${t.chat.winner}: ${winner.label} ${t.chat.withVotes.replace('{votes}', String(winner.votes))}`);
    }
    
    if (auto) addNotification('info', t.notifications.autoEnded);
  };

  const handleResetPoll = () => {
    poll.resetPoll();
    moderation.reset();
  };

  // Process Messages
  useEffect(() => {
    twitchService.onMessage((tags, message, self, sourceChannel) => {
      const isSubscriber = tags.subscriber === true || tags.subscriber === '1' || 
        (tags.badges && ('subscriber' in tags.badges || 'founder' in tags.badges));
      const msg: TwitchMessage = {
        username: tags['display-name'] || tags.username || 'Anon',
        message,
        color: tags.color || '#a970ff',
        id: tags.id,
        userId: tags['user-id'],
        isSubscriber: !!isSubscriber,
        timestamp: Date.now(),
        sourceChannel: sourceChannel, // Track which channel the message came from
      };
      
      setChatMessages(prev => [...prev.slice(-199), msg]);
      
      // Store message in current session for analytics
      // Always try to add - the function handles null session internally
      const storedMsg: StoredMessage = {
        username: msg.username,
        message: msg.message,
        timestamp: Date.now(),
        userId: msg.userId,
      };
      addMessageToSessionRef.current(storedMsg);

      // Process chat commands for overlay mode (broadcaster/mod only)
      const isBroadcaster = tags.badges && 'broadcaster' in tags.badges;
      const isMod = tags.mod === true || tags.mod === '1';
      const canControl = isBroadcaster || isMod;
      
      if (canControl) {
        const trimmedMsg = message.trim();
        
        // !poll Pregunta | Opción1 | Opción2 | Opción3
        if (trimmedMsg.startsWith('!poll ')) {
          const parts = trimmedMsg.substring(6).split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 3) {
            const question = parts[0];
            const optionLabels = parts.slice(1);
            const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
            poll.createPoll({
              title: 'Encuesta',
              question,
              options: optionLabels.map((label, i) => ({
                label,
                color: colors[i % colors.length],
              })),
            });
            moderation.reset();
          }
        }
        
        // !endpoll - End current poll
        if (trimmedMsg === '!endpoll' && pollRef.current && pollRef.current.isActive) {
          poll.setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
        }
        
        // !resetpoll - Reset/clear poll
        if (trimmedMsg === '!resetpoll') {
          poll.resetPoll();
        }
      }
      
      // !pollend - Sync end poll from main panel
      if (message.trim() === '!pollend' && pollRef.current) {
        poll.setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
      }
      
      // !pollsync - Sync command from main panel
      if (message.trim().startsWith('!pollsync ')) {
        const syncData = message.trim().substring(10);
        const parts = syncData.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 3) {
          const question = parts[0];
          const optionLabels = parts.slice(1);
          const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
          poll.createPoll({
            title: 'Encuesta',
            question,
            options: optionLabels.map((label, i) => ({
              label,
              color: colors[i % colors.length],
            })),
          });
          moderation.reset();
        }
      }

      // Process Vote with Moderation
      if (pollRef.current && pollRef.current.isActive) {
        const prefix = pollRef.current.votePrefix || '+';
        // Escape special regex characters in prefix
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const trimmedMsg = message.trim().toLowerCase();
        
        // Try to match vote by number (e.g., +1, +2)
        const voteRegex = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');
        const voteMatch = trimmedMsg.match(voteRegex);
        
        let optionId: number | null = null;
        
        if (voteMatch) {
          // Matched by number
          optionId = parseInt(voteMatch[1]);
        } else {
          // Try to match by voteKey (e.g., #chula, #rojo)
          const voteKeyRegex = new RegExp(`^${escapedPrefix}([a-z0-9]+)$`, 'i');
          const keyMatch = trimmedMsg.match(voteKeyRegex);
          if (keyMatch) {
            const key = keyMatch[1].toLowerCase();
            const matchMode = pollRef.current.voteMatchMode || 'exact';
            const matchedOption = pollRef.current.options.find(o => {
              if (!o.voteKey) return false;
              const optKey = o.voteKey.toLowerCase();
              if (matchMode === 'partial') {
                return key.includes(optKey) || optKey.includes(key);
              }
              return optKey === key;
            });
            if (matchedOption) {
              optionId = matchedOption.id;
            }
          }
        }
        
        // Partial match mode: also check if message contains any voteKey
        if (optionId === null && pollRef.current.voteMatchMode === 'partial') {
          const msgLower = message.toLowerCase();
          for (const opt of pollRef.current.options) {
            if (opt.voteKey && msgLower.includes(`${prefix}${opt.voteKey.toLowerCase()}`)) {
              optionId = opt.id;
              break;
            }
          }
        }
        
        if (optionId !== null) {
          const userId = tags['user-id'] || tags.username || 'unknown';
          
          // Extract user attributes from Twitch tags
          const isSubscriber = tags.subscriber === true || tags.subscriber === '1';
          const isFollower = tags.badges ? 'follower' in tags.badges : false;
          
          // Get valid option IDs
          const validOptionIds = pollRef.current.options.map(o => o.id);
          
          // Process vote through moderation hook
          const result = moderation.processVote(
            {
              userId,
              username: msg.username,
              optionId,
              isSubscriber,
              isFollower,
              accountAgeDays: 365, // Default to 1 year
            },
            validOptionIds
          );
          
          if (result.isValid) {
            if (result.isVoteChange && result.previousOptionId !== undefined && result.previousWeight !== undefined) {
              // Update vote in poll hook
              poll.updateVote(userId, result.previousOptionId, optionId, result.previousWeight, result.weight);
            } else {
              // Add new vote
              const newVote: VoteRecord = {
                userId,
                username: msg.username,
                optionId,
                timestamp: Date.now()
              };
              poll.addVote(newVote, result.weight);
            }
          }
        }
      }
    });

    // Note: Status changes are handled by useTwitchConnection hook
    // Do NOT call twitchService.onStatusChange here as it overwrites the hook's callback
  }, []);

  // Check for Component Overlay Modes
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isCountdownOverlay = urlParams?.get('overlayCountdown') === 'true';
  const isSpinnerOverlay = urlParams?.get('overlaySpinner') === 'true';
  const isRandomWinnerOverlay = urlParams?.get('overlayRandomWinner') === 'true';
  const isJudgePanelOverlay = urlParams?.get('overlayJudgePanel') === 'true';
  const isPiumOverlay = urlParams?.get('overlayPium') === 'true';
  const isRouletteOverlay = urlParams?.get('overlayRoulette') === 'true';
  const isFishingOverlay = urlParams?.get('overlayFishing') === 'true';
  const isPotatoOverlay = urlParams?.get('overlayPotato') === 'true';
  const isTriviaOverlay = urlParams?.get('overlayTrivia') === 'true';
  const isBattleshipOverlay = urlParams?.get('overlayBattleship') === 'true';
  const isDuckHuntOverlay = urlParams?.get('overlayDuckHunt') === 'true';
  const isVeoVeoOverlay = urlParams?.get('overlayVeoVeo') === 'true';
  const isPPTOverlay = urlParams?.get('overlayPPT') === 'true';
  const isAhorcadoOverlay = urlParams?.get('overlayAhorcado') === 'true';
  const isCarreraOverlay = urlParams?.get('overlayCarrera') === 'true';
  const isMemoriaOverlay = urlParams?.get('overlayMemoria') === 'true';
  
  // Countdown Overlay Mode Render
  if (isCountdownOverlay) {
    return <Countdown onClose={() => window.close()} chatMessages={chatMessages} isOverlayMode={true} />;
  }

  // Spinner Overlay Mode Render
  if (isSpinnerOverlay) {
    const defaultOptions = poll.currentPoll?.options || [
      { id: 1, label: 'Opción 1', votes: 0, color: '#a970ff' },
      { id: 2, label: 'Opción 2', votes: 0, color: '#00f0f0' },
      { id: 3, label: 'Opción 3', votes: 0, color: '#ff6b6b' },
    ];
    return <SpinnerWheel options={defaultOptions} onClose={() => window.close()} chatMessages={chatMessages} isOverlayMode={true} />;
  }

  // Random Winner Overlay Mode Render
  if (isRandomWinnerOverlay) {
    return <RandomWinnerOverlay chatMessages={chatMessages} onClose={() => window.close()} />;
  }

  // Judge Panel Overlay Mode Render
  if (isJudgePanelOverlay) {
    return <JudgePanel chatMessages={chatMessages} onClose={() => window.close()} isOverlayMode={true} />;
  }

  // Pium Game Overlay Mode Render
  if (isPiumOverlay) {
    return <PiumOverlay />;
  }

  // Casino Roulette Overlay Mode Render
  if (isRouletteOverlay) {
    return <RouletteOverlay />;
  }

  // Fishing Game Overlay Mode Render
  if (isFishingOverlay) {
    return <FishingOverlay />;
  }

  // Hot Potato Overlay Mode Render
  if (isPotatoOverlay) {
    return <PotatoOverlay />;
  }

  // Trivia Battle Overlay Mode Render
  if (isTriviaOverlay) {
    return <TriviaOverlay />;
  }

  // Battleship Game Overlay Mode Render
  if (isBattleshipOverlay) {
    return <BattleshipOverlay />;
  }

  // Duck Hunt Game Overlay Mode Render
  if (isDuckHuntOverlay) {
    return <DuckHuntOverlay />;
  }

  // Veo Veo Overlay Mode Render
  if (isVeoVeoOverlay) {
    return <VeoVeoOverlay />;
  }

  // Piedra Papel Tijera Overlay Mode Render
  if (isPPTOverlay) {
    return <PPTOverlay />;
  }

  // Ahorcado Overlay Mode Render
  if (isAhorcadoOverlay) {
    return <AhorcadoOverlay />;
  }

  // Carrera Emotes Overlay Mode Render
  if (isCarreraOverlay) {
    return <CarreraOverlay />;
  }

  // Memoria IRL Overlay Mode Render
  if (isMemoriaOverlay) {
    return <MemoriaOverlay />;
  }

  // Overlay Mode Render
  if (isOverlayMode) {
    const presetColors = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#FFFFFF', '#1a1a2e', '#16213e'];
    const textColors = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
    
    return (
      <div className="h-screen w-screen overflow-hidden relative" style={{ background: overlaySettings.bgColor }}>
        {/* Overlay Mode Indicator */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center py-1 bg-gradient-to-r from-purple-600/80 via-twitch-brand/80 to-purple-600/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>🎬 {t.overlay.mode} - {t.overlay.forOBS}</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </div>
        </div>
        
        {/* Settings Toggle Button */}
        <button 
          onClick={toggleOverlaySettings}
          className="absolute top-8 right-2 z-50 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all"
          title="Configuración"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        
        {/* Settings Panel */}
        {showOverlaySettings && (
          <div className="absolute top-16 right-2 z-50 bg-zinc-900 rounded-xl p-4 shadow-2xl border border-zinc-700 w-64">
            <h3 className="text-white font-bold mb-3 text-sm">{t.overlay.title}</h3>
            
            {/* Background Color */}
            <div className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">{t.overlay.background} ({t.overlay.chromaKey})</label>
              <div className="flex gap-1 flex-wrap">
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setOverlaySettings({ bgColor: color })}
                    className={`w-6 h-6 rounded border-2 ${overlaySettings.bgColor === color ? 'border-white' : 'border-transparent'}`}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            {/* Text Color */}
            <div className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">{t.overlay.textColor}</label>
              <div className="flex gap-1 flex-wrap">
                {textColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setOverlaySettings({ textColor: color })}
                    className={`w-6 h-6 rounded border-2 ${overlaySettings.textColor === color ? 'border-white' : 'border-transparent'}`}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            {/* Border Color */}
            <div className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">{t.overlay.borderColor}</label>
              <div className="flex gap-1 flex-wrap">
                {textColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setOverlaySettings({ borderColor: color })}
                    className={`w-6 h-6 rounded border-2 ${overlaySettings.borderColor === color ? 'border-white' : 'border-transparent'}`}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            {/* Show Borders Toggle */}
            <div className="flex items-center justify-between mb-3">
              <label className="text-zinc-400 text-xs">{t.overlay.showBorders}</label>
              <button
                onClick={() => setOverlaySettings({ showBorders: !overlaySettings.showBorders })}
                className={`w-10 h-5 rounded-full transition-colors ${overlaySettings.showBorders ? 'bg-green-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${overlaySettings.showBorders ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            {/* Font Size */}
            <div className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">{t.overlay.fontSize}</label>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setOverlaySettings({ fontSize: size })}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${overlaySettings.fontSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                  >
                    {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Font Style */}
            <div className="mb-3">
              <label className="text-zinc-400 text-xs block mb-1">{t.overlay.fontStyle}</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setOverlaySettings({ fontStyle: 'normal' })}
                  className={`flex-1 py-1 px-2 rounded text-xs transition-colors ${overlaySettings.fontStyle === 'normal' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setOverlaySettings({ fontStyle: 'bold' })}
                  className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${overlaySettings.fontStyle === 'bold' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                >
                  Bold
                </button>
                <button
                  onClick={() => setOverlaySettings({ fontStyle: 'italic' })}
                  className={`flex-1 py-1 px-2 rounded text-xs italic transition-colors ${overlaySettings.fontStyle === 'italic' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                >
                  Italic
                </button>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <div className="pt-2 border-t border-zinc-700">
              <label className="text-zinc-400 text-xs block mb-2">{t.overlay.theme}</label>
              <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setOverlaySettings({ theme: 'light' })}
                  className={`flex-1 p-2 rounded-md transition-all flex items-center justify-center gap-1 ${overlaySettings.theme === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  title={t.overlay.light}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  <span className="text-xs">{t.overlay.light}</span>
                </button>
                <button
                  onClick={() => setOverlaySettings({ theme: 'dark' })}
                  className={`flex-1 p-2 rounded-md transition-all flex items-center justify-center gap-1 ${overlaySettings.theme === 'dark' ? 'bg-zinc-900 text-blue-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  title={t.overlay.dark}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>
                  <span className="text-xs">{t.overlay.dark}</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {poll.currentPoll ? (
          <LivePoll 
            poll={poll.currentPoll} 
            voteHistory={poll.voteHistory} 
            onStop={()=>{}} 
            onReset={()=>{}} 
            theme={overlaySettings.theme}
            variant="overlay"
            shouldRenderChart={true}
            overlayStyles={{
              textColor: overlaySettings.textColor,
              borderColor: overlaySettings.borderColor,
              showBorders: overlaySettings.showBorders,
              fontSize: overlaySettings.fontSize,
              fontStyle: overlaySettings.fontStyle,
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center" style={{ color: overlaySettings.textColor }}>
            <div className="text-center p-8 bg-black/70 rounded-xl shadow-xl max-w-md" style={{ borderColor: overlaySettings.borderColor, borderWidth: overlaySettings.showBorders ? 2 : 0 }}>
              <p className="font-bold mb-2 text-xl">{t.poll.waitingPoll}</p>
              <p className="text-sm opacity-70">{t.poll.createPollHint}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected State Render
  if (status !== ConnectionStatus.CONNECTED) {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col p-4 transition-colors duration-300 relative">
        <AnimatedBackground />
        <div className="flex justify-between mb-4 gap-2 relative z-50">
          {/* Demo button */}
          <button 
            onClick={demoTour.startTour}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-twitch-brand text-white font-medium text-sm hover:from-purple-600 hover:to-twitch-light transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
          >
            <Play size={16} />
            <span className="hidden sm:inline">Demo</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <LanguageSelector variant="icon" />
          </div>
        </div>
        <div className="relative z-10 flex-1 flex items-center justify-center" data-tour="connection">
          <ConnectionPanel 
            status={status} 
            onConnect={handleConnect} 
            errorMessage={connectionError}
            savedCredentials={savedCredentials}
            onClearSavedCredentials={clearSavedCredentials}
          />
        </div>
        
        {/* AI Vision Mascot on connection screen - hidden during demo tour */}
        {aiAnalytics.showMascot && !demoTour.isActive && (
          <AIVisionMascot
            chatMessages={[]}
            isConnected={false}
            hasPoll={false}
            pollVotes={0}
            userDifficulty={connectionError ? { type: 'connection_failed', timestamp: Date.now(), context: connectionError } : undefined}
            onDismiss={aiAnalytics.toggleMascot}
            className="w-72"
            initialPosition={{ x: window.innerWidth - 340, y: window.innerHeight - 150 }}
            theme={theme}
          />
        )}
        
        <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed top-16 left-1/2 -translate-x-1/2 z-[100]" />
        
        {/* Demo Tour Overlay */}
        {demoTour.isActive && demoTour.currentStepData && (
          <DemoTourOverlay
            step={demoTour.currentStepData}
            currentStep={demoTour.currentStep}
            totalSteps={demoTour.totalSteps}
            onNext={demoTour.nextStep}
            onPrev={demoTour.prevStep}
            onClose={demoTour.endTour}
            isConnected={false}
          />
        )}
      </div>
    );
  }

  // Main Connected State Render
  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative">
            {channelAvatar ? (
              <img src={channelAvatar} alt={channelName} className="w-8 h-8 rounded-full border-2 border-twitch-brand" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-sm">
                {channelName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Collaboration indicator */}
            {isCollaborationActive && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border-2 border-white dark:border-zinc-900">
                +{collaborationChannels.length}
              </div>
            )}
          </div>
          <span className="font-bold text-sm text-zinc-900 dark:text-white">{channelName}</span>
          {isCollaborationActive && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded-full font-medium">
              Collab
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMobileSidebar(!showMobileSidebar)} 
            className={`p-2 rounded-lg transition-colors ${showMobileSidebar ? 'bg-twitch-brand text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
          >
            <MessageSquare size={20} />
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
      
      {/* Floating Mini Bar - Only visible when sidebar is hidden */}
      {leftSidebarHidden && (
        <div 
          className={`hidden md:flex fixed z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-2 gap-2 items-center select-none ${isDraggingMiniBar ? 'cursor-grabbing' : ''}`}
          style={{ left: miniBarPosition.x, top: miniBarPosition.y }}
        >
          {/* Drag handle - User Avatar */}
          <div 
            className={`cursor-grab ${isDraggingMiniBar ? 'cursor-grabbing' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingMiniBar(true);
              miniBarDragOffset.current = {
                x: e.clientX - miniBarPosition.x,
                y: e.clientY - miniBarPosition.y
              };
              
              const handleMouseMove = (e: MouseEvent) => {
                const newX = Math.max(0, Math.min(window.innerWidth - 150, e.clientX - miniBarDragOffset.current.x));
                const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - miniBarDragOffset.current.y));
                setMiniBarPosition({ x: newX, y: newY });
              };
              
              const handleMouseUp = () => {
                setIsDraggingMiniBar(false);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
              };
              
              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp);
            }}
          >
            {channelAvatar ? (
              <img src={channelAvatar} alt={channelName} className="w-8 h-8 rounded-full border-2 border-twitch-brand" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-sm">
                {channelName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Disconnect button */}
          <button 
            onClick={handleDisconnect} 
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t.common.exit}
          >
            <Power size={18} />
          </button>
          
          {/* Show sidebar button */}
          <button
            onClick={() => setLeftSidebarHidden(false)}
            className="p-2 rounded-lg text-zinc-400 hover:text-twitch-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Mostrar menú (Ctrl+B)"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}
      
      {/* Full Sidebar - Hidden when collapsed */}
      <div className={`hidden md:flex bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col items-center py-4 shrink-0 z-20 transition-all duration-300 ${leftSidebarHidden ? 'w-0 border-r-0 p-0 overflow-hidden' : 'w-16 lg:w-20'}`}>
        {/* User Avatar */}
        <div className="mb-2">
          {channelAvatar ? (
            <img src={channelAvatar} alt={channelName} className="w-10 h-10 rounded-full border-2 border-twitch-brand" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-lg">
              {channelName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Hide Sidebar Button */}
        <button
          onClick={() => setLeftSidebarHidden(true)}
          className="w-8 h-5 flex items-center justify-center text-zinc-400 hover:text-twitch-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors mb-4"
          title="Ocultar menú (Ctrl+B)"
        >
          <ChevronDown size={16} className="rotate-180" />
        </button>

        {/* Navigation */}
        <div className="flex flex-col gap-3 w-full px-2">
          <NavButton active={leftTab === 'poll'} onClick={() => setLeftTab('poll')} icon={<VoteIcon size={20} />} label={t.nav.poll || 'Encuesta'} dataTour="nav-poll" />
          <NavButton active={leftTab === 'judge'} onClick={() => setLeftTab('judge')} icon={<Trophy size={20} />} label={t.nav.judge || 'Jurado'} dataTour="nav-judge" />
          <NavButton active={leftTab === 'giveaway'} onClick={() => setLeftTab('giveaway')} icon={<Gift size={20} />} label={t.nav.giveaway || 'Sorteos'} dataTour="nav-giveaway" />
          <NavButton active={leftTab === 'games'} onClick={() => setLeftTab('games')} icon={<Gamepad2 size={20} />} label={t.nav?.games || 'Juegos'} dataTour="nav-games" />
          <div className="relative">
            <NavButton active={leftTab === 'data'} onClick={() => setLeftTab('data')} icon={<BarChart3 size={20} />} label={t.nav.data} />
            {aiAnalytics.currentSession && aiAnalytics.currentSession.messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
          
          {/* Gallery */}
          <NavButton active={leftTab === 'gallery'} onClick={() => setLeftTab('gallery')} icon={<ImageIcon size={20} />} label={t.nav.gallery} />
          
          {/* Sound Board Button */}
          <NavButton 
            onClick={() => setShowSoundBoard(true)} 
            icon={<Volume2 size={20} />} 
            label={t.nav.sounds}
            dataTour="soundboard"
          />
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-3 w-full px-2 mb-3">
          {/* 1. Historial */}
          <NavButton onClick={() => setShowHistory(true)} icon={<History size={20} />} label={t.nav.history} />
          
          {/* 2. AI Vision */}
          <NavButton 
            active={aiAnalytics.showMascot} 
            onClick={aiAnalytics.toggleMascot} 
            icon={<Eye size={20} />} 
            label="AI Vision" 
          />
          
          {/* 3. Tools (incluye idioma y tema) */}
          <NavButton onClick={() => setShowTools(true)} icon={<Wrench size={20} />} label="Tools" />
        </div>
        
        {/* Disconnect button */}
        <div className="w-full px-2 mt-auto">
          <button onClick={handleDisconnect} className="w-full p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center gap-1 group">
            <Power size={20} />
            <span className="text-[9px] font-bold group-hover:opacity-100 opacity-0 transition-opacity">{t.common.exit}</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around py-2 px-4 z-40 safe-area-bottom">
        <MobileNavButton active={leftTab === 'poll'} onClick={() => { setLeftTab('poll'); setShowMobileSidebar(false); }} icon={<VoteIcon size={20} />} label={t.nav.poll || 'Encuesta'} />
        <MobileNavButton active={leftTab === 'judge'} onClick={() => { setLeftTab('judge'); setShowMobileSidebar(false); }} icon={<Trophy size={20} />} label={t.nav.judge || 'Jurado'} />
        <MobileNavButton active={leftTab === 'giveaway'} onClick={() => { setLeftTab('giveaway'); setShowMobileSidebar(false); }} icon={<Gift size={20} />} label={t.nav.giveaway || 'Sorteos'} />
        <MobileNavButton active={leftTab === 'games'} onClick={() => { setLeftTab('games'); setShowMobileSidebar(false); }} icon={<Gamepad2 size={20} />} label={t.nav?.games || 'Juegos'} />
        <MobileNavButton active={leftTab === 'gallery'} onClick={() => { setLeftTab('gallery'); setShowMobileSidebar(false); }} icon={<ImageIcon size={20} />} label={t.nav.gallery} />
        <MobileNavButton active={leftTab === 'data'} onClick={() => { setLeftTab('data'); setShowMobileSidebar(false); }} icon={<BarChart3 size={20} />} label={t.nav.data} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Token Expiration Info Banner - Non-invasive */}
        {tokenExpiringSoon && status === ConnectionStatus.CONNECTED && tokenExpiresIn !== null && (
          <div className="bg-zinc-800 border-b border-zinc-700 text-zinc-300 px-4 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">🔑</span>
              <span>
                Token expira en <strong className="text-white">{Math.floor(tokenExpiresIn / 60)}:{(tokenExpiresIn % 60).toString().padStart(2, '0')}</strong>
                <span className="text-zinc-500 ml-2">· Solo afecta: emotes Twitch, subs/chatters</span>
              </span>
            </div>
            <button
              onClick={() => {
                twitchDisconnect();
                setTimeout(() => {
                  if (savedCredentials) {
                    twitchConnect(savedCredentials.channel, savedCredentials.token);
                  }
                }, 500);
              }}
              className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 hover:text-white transition-colors"
            >
              Renovar
            </button>
          </div>
        )}
        
        <div className="flex-1 flex overflow-hidden relative">
          {/* AI Vision Mascot - Draggable (hidden during demo tour) */}
          {aiAnalytics.showMascot && !isOverlayMode && !demoTour.isActive && (
            <AIVisionMascot
              chatMessages={chatMessages}
              isConnected={status === ConnectionStatus.CONNECTED}
              hasPoll={!!poll.currentPoll}
              pollVotes={poll.currentPoll?.totalVotes || 0}
              userDifficulty={aiAnalytics.userDifficulty}
              onDismiss={aiAnalytics.toggleMascot}
              className="w-72"
              initialPosition={{ x: window.innerWidth - 340, y: window.innerHeight - 150 }}
              theme={theme}
              viewerCount={viewerCount}
            />
          )}
          
          {/* Left Column Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-black/50 relative overflow-y-auto pb-16 md:pb-0">
            {leftTab === 'poll' && (
              poll.currentPoll ? (
                <div data-tour="live-poll" className="h-full">
                  <LivePoll 
                    poll={poll.currentPoll} 
                    voteHistory={poll.voteHistory} 
                    onStop={handleStopPoll} 
                    onReset={handleResetPoll}
                    onUpdate={(t, q) => poll.setCurrentPoll(prev => prev ? ({...prev, title: t, question: q}) : null)}
                    theme={theme}
                    moderationStats={moderation.stats}
                    moderationLog={moderation.log}
                    userWeights={moderation.userWeights}
                    overlayWindowRef={overlayWindowRef}
                    forceShowModeration={demoTour.isActive ? demoForceModeration : undefined}
                  />
                </div>
              ) : (
                <div data-tour="poll-creator" className="h-full">
                  <PollCreator 
                    onCreate={handleCreatePoll} 
                    onNotification={addNotification}
                    mediaLibrary={mediaLibrary}
                    onAddAsset={handleAddAsset}
                    moderationConfig={moderation.config}
                    onModerationConfigChange={moderation.setConfig}
                    chatMessages={chatMessages}
                    onShowHistory={() => setShowHistory(true)}
                    sidebarHidden={leftSidebarHidden}
                    onClearChatMessages={() => setChatMessages([])}
                    userVoteMap={poll.userVoteMap}
                    collaborationChannels={collaborationChannels}
                    mainChannel={channelName}
                    onAddCollaborator={addCollaborator}
                    onRemoveCollaborator={removeCollaborator}
                    isConnected={status === ConnectionStatus.CONNECTED}
                    onShowCountdown={() => setShowCountdown(true)}
                  />
                </div>
              )
            )}
            {leftTab === 'judge' && (
              <div data-tour="judge-panel" className="h-full">
                <JudgePanel 
                  chatMessages={chatMessages}
                  onClose={() => setLeftTab('poll')}
                  userVoteMap={poll.userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={channelName}
                  onAddCollaborator={addCollaborator}
                  onRemoveCollaborator={removeCollaborator}
                  isConnected={status === ConnectionStatus.CONNECTED}
                  isEmbedded={true}
                  mediaLibrary={mediaLibrary}
                  onAddAsset={handleAddAsset}
                />
              </div>
            )}
            {leftTab === 'giveaway' && (
              <div data-tour="giveaway-hub" className="h-full">
                <GiveawayHub 
                  chatMessages={chatMessages}
                  isConnected={status === ConnectionStatus.CONNECTED}
                  onClearChatMessages={() => setChatMessages([])}
                  userVoteMap={poll.userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={channelName}
                  authToken={authToken}
                />
              </div>
            )}
            {leftTab === 'games' && (
              <div data-tour="stream-games" className="h-full">
                <StreamGames 
                  chatMessages={chatMessages}
                  isConnected={status === ConnectionStatus.CONNECTED}
                  isEmbedded={true}
                  userVoteMap={poll.userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={channelName}
                  onAddCollaborator={addCollaborator}
                  onRemoveCollaborator={removeCollaborator}
                  authToken={authToken}
                />
              </div>
            )}
            {leftTab === 'gallery' && (
              <div data-tour="gallery" className="h-full">
                <AssetLibrary 
                  assets={mediaLibrary} 
                  onAdd={handleAddAsset} 
                  onDelete={handleDeleteAsset} 
                  onNotification={addNotification} 
                />
              </div>
            )}
            {leftTab === 'data' && (
              <div className="h-full flex flex-col">
                {/* Sub-tabs header - Analytics primero, luego Actividad */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                  <button 
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${dataSubTab === 'analytics' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                    onClick={() => setDataSubTab('analytics')}
                  >
                    <BarChart3 size={16} /> {t.nav.analytics}
                    {aiAnalytics.config?.enabled && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">IA</span>
                    )}
                  </button>
                  <button 
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${dataSubTab === 'activity' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                    onClick={() => setDataSubTab('activity')}
                  >
                    <Activity size={16} /> {t.nav.activity}
                  </button>
                </div>
                
                {/* Sub-tab content */}
                <div className="flex-1 overflow-y-auto">
                  {dataSubTab === 'activity' && (
                    <RecentVotes 
                      votes={poll.voteHistory} 
                      options={poll.currentPoll ? poll.currentPoll.options.reduce((acc, opt) => ({...acc, [opt.id]: opt}), {}) : {}}
                    />
                  )}
                  {dataSubTab === 'analytics' && (
                    <div className="p-4 space-y-4">
                      {/* AI Config Toggle */}
                      <button
                        onClick={aiAnalytics.toggleConfig}
                        className="w-full flex items-center justify-between p-3 bg-white/5 dark:bg-gray-800/50 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-purple-400" />
                          <span className="text-white font-medium">{t.analytics.configureAI}</span>
                          {aiAnalytics.config?.enabled && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              {t.analytics.aiActive}
                            </span>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${aiAnalytics.showConfig ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {/* AI Config Panel (collapsible) */}
                      {aiAnalytics.showConfig && (
                        <AIConfigPanel onConfigChange={aiAnalytics.setConfig} />
                      )}
                      
                      {/* Stream Analytics */}
                      <div data-tour="analytics">
                        <StreamAnalytics
                          currentSession={aiAnalytics.currentSession}
                          aiConfig={aiAnalytics.config}
                          isStreamActive={status === ConnectionStatus.CONNECTED}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Sidebar Overlay */}
          {showMobileSidebar && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* Right Sidebar (Chat/Stream) - Collapsible */}
          <div className={`
            bg-white dark:bg-zinc-900 
            border-l border-zinc-200 dark:border-zinc-800 
            flex flex-col shrink-0 
            transition-all duration-300 ease-in-out
            fixed md:relative 
            inset-y-0 right-0 
            z-50 md:z-auto
            transform ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
            pt-14 md:pt-0 pb-16 md:pb-0
            ${rightSidebarCollapsed ? 'md:w-0 md:border-l-0' : 'w-full md:w-80 lg:w-96 max-w-[85vw] md:max-w-none'}
          `}>
            {/* Desktop collapse toggle button */}
            <button 
              className={`
                hidden md:flex 
                absolute top-1/2 -translate-y-1/2 -left-4
                w-4 h-16 
                items-center justify-center
                bg-zinc-200 dark:bg-zinc-800 
                hover:bg-zinc-300 dark:hover:bg-zinc-700
                border border-zinc-300 dark:border-zinc-700
                rounded-l-lg
                text-zinc-500 dark:text-zinc-400
                hover:text-zinc-700 dark:hover:text-zinc-200
                transition-colors
                z-10
                shadow-sm
              `}
              onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              title={rightSidebarCollapsed ? 'Mostrar Chat/Stream' : 'Ocultar Chat/Stream'}
            >
              {rightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Mobile close button */}
            <button 
              className="md:hidden absolute top-2 left-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              onClick={() => setShowMobileSidebar(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            
            {/* Sidebar content - hidden when collapsed */}
            <div className={`flex flex-col h-full ${rightSidebarCollapsed ? 'md:hidden' : ''}`}>
              {/* Header with tabs and mode toggle */}
              <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                {rightPanelMode === 'tabs' ? (
                  <>
                    <button 
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'chat' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                      onClick={() => setActiveRightTab('chat')}
                    >
                      <MessageSquare size={16} /> {t.nav.chat}
                    </button>
                    <button 
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'stream' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                      onClick={() => setActiveRightTab('stream')}
                    >
                      <Tv size={16} /> {t.nav.stream}
                    </button>
                    <button 
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'collab' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                      onClick={() => setActiveRightTab('collab')}
                    >
                      <Users size={16} /> 
                      {collaborationChannels.length > 0 && (
                        <span className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] px-1 py-0.5 rounded-full font-bold">
                          {collaborationChannels.length}
                        </span>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex-1 py-2 px-3 flex items-center justify-end">
                    <button
                      onClick={() => setShowCollabInSplit(!showCollabInSplit)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        showCollabInSplit 
                          ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' 
                          : 'text-zinc-500 hover:text-cyan-500 hover:bg-cyan-500/10'
                      }`}
                      title="Mostrar/ocultar colaboración"
                    >
                      <Users size={14} />
                      <span>Colaboración</span>
                      {collaborationChannels.length > 0 && (
                        <span className="bg-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] px-1.5 rounded-full font-bold">
                          {collaborationChannels.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
                {/* Mode toggle button */}
                <button
                  onClick={() => setRightPanelMode(rightPanelMode === 'tabs' ? 'split' : 'tabs')}
                  className="p-2 mr-1 text-zinc-400 hover:text-twitch-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title={rightPanelMode === 'tabs' ? 'Ver ambos (split)' : 'Ver uno (tabs)'}
                >
                  {rightPanelMode === 'tabs' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  )}
                </button>
              </div>
              
              {/* Content area */}
              <div className="flex-1 overflow-hidden relative flex flex-col" data-tour="chat">
                {rightPanelMode === 'tabs' ? (
                  // Tab mode - show one at a time
                  activeRightTab === 'chat' ? (
                    <ChatFeed 
                      messages={chatMessages} 
                      userVoteMap={poll.userVoteMap} 
                      options={poll.currentPoll?.options}
                      collaborationChannels={collaborationChannels}
                      mainChannel={channelName}
                      isConnected={status === ConnectionStatus.CONNECTED}
                    />
                  ) : activeRightTab === 'stream' ? (
                    <div className="h-full p-2 bg-black">
                      <StreamPlayer channel={channelName} />
                    </div>
                  ) : (
                    // Collaboration tab
                    <div className="h-full p-4 overflow-y-auto">
                      <CollaborationPanel
                        mainChannel={channelName}
                        collaborationChannels={collaborationChannels}
                        onAddCollaborator={addCollaborator}
                        onRemoveCollaborator={removeCollaborator}
                        isConnected={status === ConnectionStatus.CONNECTED}
                      />
                    </div>
                  )
                ) : (
                  // Split mode - show both with draggable divider
                  <>
                    {/* Collab panel overlay in split mode */}
                    {showCollabInSplit && (
                      <div className="absolute inset-0 z-10 bg-white dark:bg-zinc-900 overflow-y-auto p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                            <Users size={16} className="text-cyan-500" /> Colaboración
                          </h3>
                          <button
                            onClick={() => setShowCollabInSplit(false)}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <CollaborationPanel
                          mainChannel={channelName}
                          collaborationChannels={collaborationChannels}
                          onAddCollaborator={addCollaborator}
                          onRemoveCollaborator={removeCollaborator}
                          isConnected={status === ConnectionStatus.CONNECTED}
                        />
                      </div>
                    )}

                    {/* Chat section */}
                    <div 
                      className="overflow-hidden shrink-0"
                      style={{ height: `${splitRatio}%` }}
                    >
                      <ChatFeed 
                        messages={chatMessages} 
                        userVoteMap={poll.userVoteMap} 
                        options={poll.currentPoll?.options}
                        collaborationChannels={collaborationChannels}
                        mainChannel={channelName}
                        isConnected={status === ConnectionStatus.CONNECTED}
                      />
                    </div>
                    
                    {/* Draggable divider */}
                    <div 
                      className={`h-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-twitch-brand/50 cursor-row-resize flex items-center justify-center shrink-0 transition-colors ${isDraggingSplit ? 'bg-twitch-brand/50' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsDraggingSplit(true);
                        const startY = e.clientY;
                        const startRatio = splitRatio;
                        const container = e.currentTarget.parentElement;
                        if (!container) return;
                        const containerHeight = container.offsetHeight;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const deltaY = e.clientY - startY;
                          const deltaRatio = (deltaY / containerHeight) * 100;
                          const newRatio = Math.min(80, Math.max(20, startRatio + deltaRatio));
                          setSplitRatio(newRatio);
                        };
                        
                        const handleMouseUp = () => {
                          setIsDraggingSplit(false);
                          window.removeEventListener('mousemove', handleMouseMove);
                          window.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div className="w-8 h-1 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                    </div>
                    
                    {/* Stream section */}
                    <div 
                      className="flex-1 overflow-hidden bg-black p-1"
                      style={{ minHeight: '20%' }}
                    >
                      <StreamPlayer channel={channelName} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <PollHistory 
          history={poll.pastPolls} 
          onClose={() => setShowHistory(false)} 
          onLoadPoll={(pastPoll) => {
            // Load poll data into creator by creating a new poll with same options
            poll.createPoll({
              title: pastPoll.title || 'Encuesta',
              question: pastPoll.question,
              options: pastPoll.options.map(o => ({
                label: o.label,
                color: o.color,
                icon: o.icon,
                image: o.image,
                voteKey: o.voteKey
              })),
              maxVotes: pastPoll.maxVotes,
              duration: pastPoll.duration
            });
            moderation.reset();
            addNotification('success', 'Encuesta cargada del historial');
          }}
          onDownloadPoll={() => addNotification('success', 'Encuesta descargada')}
        />
      )}

      <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-[100]" />
      
      {/* Demo Tour Overlay - also shown when connected */}
      {demoTour.isActive && demoTour.currentStepData && (
        <DemoTourOverlay
          step={demoTour.currentStepData}
          currentStep={demoTour.currentStep}
          totalSteps={demoTour.totalSteps}
          onNext={demoTour.nextStep}
          onPrev={demoTour.prevStep}
          onClose={demoTour.endTour}
          isConnected={true}
        />
      )}
      
      {/* Sound Board Modal */}
      {showSoundBoard && (
        <SoundBoard onClose={() => setShowSoundBoard(false)} />
      )}
      
      {/* Tools Modal */}
      {showTools && (
        <Tools onClose={() => setShowTools(false)} theme={theme} onToggleTheme={toggleTheme} />
      )}

      {/* Countdown Widget - Global flotante */}
      {showCountdown && (
        <Countdown 
          chatMessages={chatMessages}
          onClose={() => setShowCountdown(false)}
        />
      )}
    </div>
  );
};

const NavButton: React.FC<{ active?: boolean; onClick: () => void; icon: React.ReactNode; label: string; dataTour?: string }> = ({ active, onClick, icon, label, dataTour }) => (
  <button 
    onClick={onClick} 
    data-tour={dataTour}
    className={`w-full p-2 lg:p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${active ? 'bg-twitch-brand text-white shadow-lg shadow-twitch-brand/30' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'}`}
  >
    {icon}
    <span className="text-[8px] lg:text-[9px] font-bold hidden lg:block">{label}</span>
  </button>
);

const MobileNavButton: React.FC<{ active?: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all min-w-[48px] ${active ? 'text-twitch-brand' : 'text-zinc-500'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
