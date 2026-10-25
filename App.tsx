import React, { useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { CollaborationPanel } from './components/CollaborationPanel';
import { PollCreator } from './components/PollCreator';
import { LivePoll } from './components/LivePoll';
import { ChatFeed } from './components/ChatFeed';
import { NotificationContainer, NotificationItem, NotificationType } from './components/Notification';
import { StreamPlayer } from './components/StreamPlayer';
import { AssetLibrary } from './components/AssetLibrary';
import { AIConfigPanel } from './components/AIConfigPanel';
import { StreamAnalytics } from './components/StreamAnalytics';
import { AnimatedBackground } from './components/AnimatedBackground';
import { LanguageSelector } from './components/LanguageSelector';
import { AIVisionMascot, UserDifficulty } from './components/AIVisionMascot';
import { AuthCapabilitiesIndicator } from './components/AuthCapabilitiesIndicator';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getTwitchService } from './src/application/services/TwitchService';
import { getIndexedDBService } from './src/application/services/IndexedDBService';
import { getMigrationService } from './src/application/services/MigrationService';
import { getMacroService } from './src/application/services/MacroService';
import { createTwitchPredictionService } from './src/application/services/TwitchPredictionService';
import { StoredMessage } from './src/application/services/AnalyticsService';
import { useOBSTriggers } from './src/application/hooks/useOBSTriggers';
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
  LeftTab,
  DynamicsView,
  PlatformsView,
  PlatformsTool,
} from './types';
import { STORAGE_KEYS } from './constants/storageKeys';
import { PLATFORMS, TWITCH_TOOLS } from './config/platforms';
import { useTheme } from './context';
import { useI18n } from './i18n';
import { 
  usePoll, 
  useModeration, 
  useOverlay, 
  useDemoTour,
  useViewerCount,
  DEFAULT_OVERLAY_SETTINGS,
  getChannelFromUrl,
  getPollConfigFromUrl,
  TourStep,
} from './hooks';
import { useStreamNotifications } from './hooks/useStreamNotifications';
import { useMacroTriggers, type TwitchMessageWithRoles } from './hooks/useMacroTriggers';
import { 
  useTwitchService as useTwitchConnection,
  useStreamEventService as useStreamEvents,
  useAnalyticsService as useAIAnalytics,
  useAuth,
  useModeratedChannels,
} from './src/application/hooks';
import { DemoTourOverlay } from './components/DemoTourOverlay';
import { MessageSquare, Activity, Tv, Image as ImageIcon, Vote as VoteIcon, LayoutDashboard, Moon, Sun, Power, ChevronLeft, ChevronRight, ChevronDown, BarChart3, Bot, Eye, Play, Volume2, Wrench, Users, Trophy, X, Gift, Gamepad2, Monitor, Loader2, Sparkles, Layers, Zap } from 'lucide-react';
import { SoundBoard } from './components/SoundBoard';
import { Tools } from './components/Tools';
import { Countdown } from './components/Countdown';
import { GiveawayHub } from './components/GiveawayHub';
import { StreamGames } from './components/StreamGames';
import { DynamicsPanel } from './components/DynamicsPanel';
import { PlatformsPanel } from './components/PlatformsPanel';
import { useKeyboardShortcuts } from './components/KeyboardShortcuts';
import { ChannelSelector } from './components/ChannelSelector';
import { ChannelOrbit } from './components/ChannelOrbit';
import { ErrorBoundary } from './components/ErrorBoundary';
import { onTwitchAuthExpired } from './src/infrastructure/http/helixFetch';
import { useChatControlIntegration } from './hooks/useChatControlIntegration';

// Lazy load heavy components for better initial bundle size
const OBSControlPanel = lazy(() => import('./components/OBSControlPanel'));
const StreamActivity = lazy(() => import('./components/StreamActivity'));

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => (
  <div className="flex items-center justify-center h-full w-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3 text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-twitch-brand" />
      <span className="text-sm">{message}</span>
    </div>
  </div>
);

const DEMO_CHANNEL = 'twitchdev'; // Official Twitch test channel for demo

const App: React.FC = () => {
  // Offline mode services initialization state
  // @requirements 5.1, 5.2, 5.3, 5.4, 5.5
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  
  // Initialize offline mode services on app startup
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize IndexedDB service
        const indexedDBService = getIndexedDBService();
        await indexedDBService.init();
        
        // Check and run migration if needed
        const migrationService = getMigrationService();
        const needsMigration = await migrationService.checkMigrationNeeded();
        
        if (needsMigration) {
          console.log('Running data migration from localStorage to IndexedDB...');
          const result = await migrationService.migrate();
          if (result.success) {
            console.log(`Migration complete: ${result.totalItemsMigrated} items migrated`);
          } else {
            console.warn('Migration completed with errors:', result.errors);
          }
        }
        
        setMigrationComplete(true);
        setServicesInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline services:', error);
        // Continue anyway - the app should work with localStorage fallback
        setServicesInitialized(true);
        setMigrationComplete(true);
      }
    };
    
    initializeServices();
  }, []);
  
  const { theme, toggleTheme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { triggerPollEnd, triggerPollResults } = useOBSTriggers();
  
  // Auth capabilities for Twitch API features
  const { capabilities: authCapabilities, authState } = useAuth();

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
    userId,
    userLogin,
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

  // Store the original user's avatar (the logged-in user, not the active channel)
  const [userOriginalAvatar, setUserOriginalAvatar] = useState<string | null>(null);
  
  // Save the avatar when first connected (before any channel switch)
  // Only save once and never reset it while we have a valid userId
  useEffect(() => {
    if (channelAvatar && !userOriginalAvatar && userId) {
      console.log('[App] Saving original user avatar:', channelAvatar);
      setUserOriginalAvatar(channelAvatar);
    }
  }, [channelAvatar, userOriginalAvatar, userId]);

  // Only reset when fully logged out (no userId)
  useEffect(() => {
    if (!userId && !authToken) {
      console.log('[App] Resetting original user avatar (logged out)');
      setUserOriginalAvatar(null);
    }
  }, [userId, authToken]);

  // Moderated channels hook - allows switching between own channel and moderated channels
  const {
    channels: moderatedChannels,
    selectedChannel,
    selectChannel: selectModeratedChannel,
    isLoading: isLoadingChannels,
    refresh: refreshModeratedChannels,
    hasModeratedChannels,
    isViewingModeratedChannel,
    error: moderatedChannelsError,
  } = useModeratedChannels(
    userId,
    userLogin || channelName, // Use userLogin if available, fallback to channelName
    userLogin || channelName, // displayName same as login for now
    authToken,
    { 
      autoFetch: status === ConnectionStatus.CONNECTED,
      connectedChannelName: channelName, // The channel we're actually connected to
    }
  );

  // Active channel context - use selected moderated channel or own channel
  const activeChannelId = selectedChannel?.channelId || userId;
  const activeChannelName = selectedChannel?.channelName || channelName;
  const isActiveChannelOwn = selectedChannel?.isOwnChannel ?? true;

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

  // Stream events hook - captures subs, resubs, gifts, etc.
  const streamEventsHook = useStreamEvents();
  const { triggerRaidIncoming } = useOBSTriggers();
  
  // Stream notifications hook - connects stream events to notification system
  // @requirements 4.3 - Emit notifications for stream events
  const streamNotifications = useStreamNotifications({
    enabled: status === ConnectionStatus.CONNECTED && !isOverlayMode,
  });
  
  // Macro triggers hook - connects macro system with app events
  // @requirements 2.1, 2.2, 2.3, 2.4 - Macro trigger types
  const macroTriggers = useMacroTriggers({
    enabled: status === ConnectionStatus.CONNECTED && !isOverlayMode,
    onError: (error) => {
      console.error('Macro trigger error:', error);
    },
  });
  
  // Chat control commands integration - allows mods/streamers to control dynamics from chat
  // Commands: !encuesta, !sorteo, !prediccion, !torneo
  const chatControl = useChatControlIntegration({
    enabled: status === ConnectionStatus.CONNECTED && !isOverlayMode,
    poll: {
      currentPoll: poll.currentPoll,
      createPoll: poll.createPoll,
      stopPoll: poll.stopPoll,
      resetPoll: poll.resetPoll,
    },
    onSendMessage: (message) => {
      if (authToken) {
        getTwitchService().sendMessage(message);
      }
    },
    onCommandExecuted: (command, result) => {
      if (result.success) {
        console.log(`[ChatControl] Command executed: ${command.dynamic}/${command.action}`, result.message);
      }
    },
  });
  
  // Configure macro services when authenticated
  // This connects prediction service to MacroService for macro execution
  useEffect(() => {
    if (authToken && userId && status === ConnectionStatus.CONNECTED) {
      const predictionService = createTwitchPredictionService(authToken);
      const twitchService = getTwitchService();
      
      getMacroService().configureServices({
        predictionService: {
          createPrediction: async (data) => {
            return predictionService.createPrediction(data);
          },
          getBroadcasterId: () => userId,
        },
        chatService: {
          sendMessage: async (message: string) => {
            return twitchService.sendMessage(message);
          },
        },
      });
    }
  }, [authToken, userId, status]);
  
  // Sync channel name with stream events hook
  useEffect(() => {
    if (channelName) {
      streamEventsHook.setChannelName(channelName);
    }
  }, [channelName]);

  // Reconnect to chat when selected channel changes (for moderators)
  // This allows moderators to switch to the channel they're moderating
  const previousSelectedChannelRef = useRef<string | null>(null);
  useEffect(() => {
    // Skip if not connected or no selected channel
    if (status !== ConnectionStatus.CONNECTED || !selectedChannel || !authToken) {
      return;
    }

    const newChannelName = selectedChannel.channelLogin || selectedChannel.channelName;
    
    // Skip if this is the first render or same channel
    if (previousSelectedChannelRef.current === null) {
      previousSelectedChannelRef.current = newChannelName;
      return;
    }
    
    if (previousSelectedChannelRef.current === newChannelName) {
      return;
    }

    // Channel changed - switch to the new channel's chat silently
    console.log(`[App] Switching chat to channel: ${newChannelName} (silent switch, avatar should NOT change)`);
    console.log(`[App] userOriginalAvatar: ${userOriginalAvatar}, channelAvatar: ${channelAvatar}`);
    previousSelectedChannelRef.current = newChannelName;
    
    // Clear chat messages from previous channel
    setChatMessages([]);
    
    // Switch channel using the TwitchService directly (silent switch, no UI change)
    const twitchService = getTwitchService();
    twitchService.switchChannel(newChannelName, authToken);
    
    // Reset poll and moderation state for new channel
    poll.resetPoll();
    moderation.reset();
    
    // Update stream events channel
    streamEventsHook.setChannelName(newChannelName);
    
  }, [selectedChannel, status, authToken, poll, moderation, streamEventsHook, userOriginalAvatar, channelAvatar]);

  // Detect raids and trigger OBS automation
  const lastRaidRef = useRef<string | null>(null);
  useEffect(() => {
    const raidEvents = streamEventsHook.events.filter(e => e.type === 'raid');
    if (raidEvents.length > 0) {
      const latestRaid = raidEvents[raidEvents.length - 1];
      if (latestRaid.id !== lastRaidRef.current) {
        lastRaidRef.current = latestRaid.id;
        // Trigger OBS raid automation
        triggerRaidIncoming();
        addNotification('info', `🎉 Raid de ${latestRaid.username} con ${latestRaid.viewerCount || '?'} viewers!`);
      }
    }
  }, [streamEventsHook.events, triggerRaidIncoming]);

  // Process stream events for macro triggers
  // @requirements 2.4 - Event triggers (follower, raid, subscription, bits, etc.)
  const lastProcessedEventRef = useRef<string | null>(null);
  useEffect(() => {
    if (streamEventsHook.events.length === 0) return;
    
    const latestEvent = streamEventsHook.events[streamEventsHook.events.length - 1];
    if (latestEvent.id !== lastProcessedEventRef.current) {
      lastProcessedEventRef.current = latestEvent.id;
      macroTriggers.processStreamEvent(latestEvent);
    }
  }, [streamEventsHook.events, macroTriggers]);

  // UI State (not extracted to hooks - local to App)
  const [chatMessages, setChatMessages] = useState<TwitchMessage[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'stream' | 'collab'>('chat');
  const [leftTab, setLeftTab] = useState<LeftTab>('dynamics');
  const [dynamicsView, setDynamicsView] = useState<DynamicsView>('selector');
  const [platformsView, setPlatformsView] = useState<PlatformsView>('selector');
  const [platformsTool, setPlatformsTool] = useState<PlatformsTool>('none');
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

  // Handler for dynamics navigation
  const handleDynamicsNavigation = useCallback((view: DynamicsView) => {
    const validViews: DynamicsView[] = ['selector', 'poll', 'judge', 'giveaway', 'countdown', 'spinner'];
    if (validViews.includes(view)) {
      setDynamicsView(view);
    } else {
      console.warn(`Invalid dynamics view: ${view}, defaulting to selector`);
      setDynamicsView('selector');
    }
  }, []);

  // Reset dynamicsView to selector when navigating away from dynamics tab
  // This ensures users always see the selector when returning to dynamics
  useEffect(() => {
    if (leftTab !== 'dynamics') {
      // Optionally reset to selector when leaving dynamics
      // Comment out if you want to preserve the last view
      setDynamicsView('selector');
    }
  }, [leftTab]);

  // Handler for platform navigation - changes platformsView
  // @requirements 5.2, 5.3
  const handlePlatformNavigation = useCallback((platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (!platform || !platform.enabled) {
      console.warn(`Invalid or disabled platform: ${platformId}`);
      return;
    }
    setPlatformsView(platformId as PlatformsView);
  }, []);

  // Handler for tool navigation - changes platformsTool
  // @requirements 5.2, 5.3
  const handleToolNavigation = useCallback((toolId: string) => {
    const tool = TWITCH_TOOLS.find(t => t.id === toolId);
    if (!tool || !tool.enabled || tool.comingSoon) {
      console.warn(`Invalid or disabled tool: ${toolId}`);
      return;
    }
    setPlatformsTool(toolId as PlatformsTool);
  }, []);

  // Handler for platforms back navigation
  // From tool panel → tool selector, from tool selector → platform selector
  // @requirements 5.2, 5.3
  const handlePlatformsBack = useCallback(() => {
    if (platformsTool !== 'none') {
      // From tool panel, go back to tool selector
      setPlatformsTool('none');
    } else if (platformsView !== 'selector') {
      // From tool selector, go back to platform selector
      setPlatformsView('selector');
    }
  }, [platformsTool, platformsView]);

  // Combined handler for PlatformsPanel navigation
  // @requirements 5.1, 5.2, 5.3
  const handlePlatformsPanelNavigate = useCallback((view: PlatformsView, tool?: PlatformsTool) => {
    setPlatformsView(view);
    setPlatformsTool(tool || 'none');
  }, []);

  // Handler for reauthentication - disconnects and reconnects to get new scopes
  const handleReauthenticate = useCallback(() => {
    // Clear saved credentials to force new auth flow
    clearSavedCredentials();
    // Disconnect current session
    twitchDisconnect();
    // Start new connection (will trigger OAuth flow)
    setTimeout(() => {
      twitchConnect();
    }, 100);
  }, [clearSavedCredentials, twitchDisconnect, twitchConnect]);

  // Reset platforms state when navigating away from platforms tab
  useEffect(() => {
    if (leftTab !== 'platforms') {
      // Reset to selector when leaving platforms
      setPlatformsView('selector');
      setPlatformsTool('none');
    }
  }, [leftTab]);

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
    // Navigation to Dynamics selector
    navDynamics: () => {
      setLeftTab('dynamics');
      setDynamicsView('selector');
    },
    // Direct navigation to specific activities
    navPoll: () => {
      setLeftTab('dynamics');
      setDynamicsView('poll');
    },
    navJudge: () => {
      setLeftTab('dynamics');
      setDynamicsView('judge');
    },
    navGiveaway: () => {
      setLeftTab('dynamics');
      setDynamicsView('giveaway');
    },
    // Other navigation
    navGames: () => setLeftTab('games'),
    navGallery: () => setLeftTab('gallery'),
    navData: () => setLeftTab('data'),
    // Legacy action for backward compatibility
    navPanel: () => {
      setLeftTab('dynamics');
      setDynamicsView('selector');
    },
    closeModal: () => {
      setShowTools(false);
      setShowSoundBoard(false);
    },
    toggleTheme: () => toggleTheme(),
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
        const { leftTab: newLeftTab, dynamicsView: newDynamicsView, dataSubTab: newDataSubTab, rightTab, showModeration, createDemoPoll, showSoundBoard: showSoundBoardAction, showPredictions, showRewards } = step.action;
        
        // First set leftTab, then dynamicsView for proper navigation
        if (newLeftTab) setLeftTab(newLeftTab);
        if (newDynamicsView) setDynamicsView(newDynamicsView);
        if (newDataSubTab) setDataSubTab(newDataSubTab);
        if (rightTab) setActiveRightTab(rightTab);
        if (showModeration !== undefined) setDemoForceModeration(showModeration);
        
        // Handle Platforms navigation for Predictions and Rewards
        if (showPredictions) {
          setPlatformsView('twitch');
          setPlatformsTool('predictions');
        } else if (showRewards) {
          setPlatformsView('twitch');
          setPlatformsTool('channelpoints');
        }
        
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
      setLeftTab('dynamics');
      setDynamicsView('poll');
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

  // Latest hook APIs for the chat message subscription below. That effect
  // subscribes once ([] deps), so it must read these through a ref; otherwise
  // it keeps the first-render callbacks (e.g. macro triggers created while
  // `enabled` was false never fire, and createPoll uses a stale config).
  const chatHandlersRef = useRef({ poll, moderation, macroTriggers });
  useEffect(() => {
    chatHandlersRef.current = { poll, moderation, macroTriggers };
  });

  // Check for Overlay Mode on Mount - handle channel and poll from URL
  useEffect(() => {
    if (isOverlayMode) {
      setTheme('dark');
      
      const channel = getChannelFromUrl();
      if (channel) {
        getTwitchService().connect({ channel });
        
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

  // Session token rejected by Twitch (confirmed with /oauth2/validate by helixFetch).
  // Chat keeps working; API features (subs, polls, moderation...) need a new login.
  const [twitchAuthExpired, setTwitchAuthExpired] = useState(false);
  useEffect(() => onTwitchAuthExpired(() => setTwitchAuthExpired(true)), []);
  useEffect(() => {
    if (status !== ConnectionStatus.CONNECTED) setTwitchAuthExpired(false);
  }, [status]);

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

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
      // Internal sync command (hidden from users)
      const optLabels = newPoll.options.map(o => o.label).join('|');
      getTwitchService().sendMessage(`!pollsync ${question}|${optLabels}`);
      
      // User-friendly message with voting instructions
      const opts = newPoll.options.map((o, idx) => `${prefix}${idx + 1} ${o.label}`).join(' | ');
      const voteHint = t.chat.voteHint.replace('+', prefix);
      getTwitchService().sendMessage(`📊 ${t.chat.newPoll}: ${question} | ${opts} | ${voteHint}`);
      
      // Show remote control hint for mods
      getTwitchService().sendMessage(`💡 Mods: !tv poll close (cerrar) | !tv poll results (ver votos)`);
    }
  };

  const handleStopPoll = (auto = false) => {
    const result = poll.stopPoll(auto);
    if (!result) return;
    
    // OBS Trigger: Poll end
    triggerPollEnd();
    
    // Save poll results to current session for analytics
    const totalVotes = result.poll.options.reduce((acc, o) => acc + o.votes, 0);
    const winner = result.poll.options.reduce((a, b) => a.votes > b.votes ? a : b);
    
    if (aiAnalytics.currentSession) {
      const pollSummary = {
        question: result.poll.question,
        winner: winner.label,
        totalVotes,
        timestamp: Date.now(),
        options: result.poll.options.map(o => ({
          label: o.label,
          votes: o.votes,
          percentage: totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0,
        })),
      };
      aiAnalytics.addPollResultToSession(pollSummary);
    }
    
    // Send notification for poll ended
    // @requirements 4.3 - Emit notifications for poll ended
    streamNotifications.notifyPollEnded(result.poll.question, winner.label, totalVotes);
    
    if (authToken) {
      // Internal sync command
      getTwitchService().sendMessage(`!pollend`);
      // Results message
      getTwitchService().sendMessage(`📊 ${t.chat.pollEnded}: ${result.poll.question} | 🏆 ${winner.label} (${winner.votes} ${t.poll.votesLabel || 'votos'})`);
    }
    
    // OBS Trigger: Poll results (after a short delay)
    setTimeout(() => triggerPollResults(), 1000);
    
    if (auto) addNotification('info', t.notifications.autoEnded);
  };

  const handleResetPoll = () => {
    poll.resetPoll();
    moderation.reset();
  };

  // Process Messages
  useEffect(() => {
    const unsubscribe = getTwitchService().onMessage((chatMessage) => {
      // Always use the latest hook APIs (see chatHandlersRef)
      const { poll, moderation, macroTriggers } = chatHandlersRef.current;
      const message = chatMessage.message;
      const sourceChannel = chatMessage.sourceChannel;
      const isSubscriber = chatMessage.isSubscriber || 
        (chatMessage.badges && ('subscriber' in chatMessage.badges || 'founder' in chatMessage.badges));
      const msg: TwitchMessage = {
        username: chatMessage.displayName || chatMessage.username || 'Anon',
        message,
        color: chatMessage.color || '#a970ff',
        id: chatMessage.id,
        userId: chatMessage.userId,
        isSubscriber: !!isSubscriber,
        timestamp: Date.now(),
        sourceChannel: sourceChannel, // Track which channel the message came from
      };
      
      setChatMessages(prev => [...prev.slice(-199), msg]);
      
      // Process chat message for macro triggers
      // @requirements 2.1, 2.2 - Chat command and keyword triggers
      const macroMsg: TwitchMessageWithRoles = {
        ...msg,
        isBroadcaster: chatMessage.isBroadcaster,
        isModerator: chatMessage.isModerator,
      };
      macroTriggers.processChatMessage(macroMsg);
      
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
      const isBroadcaster = chatMessage.isBroadcaster;
      const isMod = chatMessage.isModerator;
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
          const userId = chatMessage.userId || chatMessage.username || 'unknown';
          
          // Extract user attributes from ChatMessage
          const isSubForVote = chatMessage.isSubscriber;
          const isFollower = chatMessage.badges ? 'follower' in chatMessage.badges : false;
          
          // Get valid option IDs
          const validOptionIds = pollRef.current.options.map(o => o.id);
          
          // Process vote through moderation hook
          const result = moderation.processVote(
            {
              userId,
              username: msg.username,
              optionId,
              isSubscriber: isSubForVote,
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
              const newVote = {
                oderId: userId,
                userId,
                username: msg.username,
                optionId,
                timestamp: Date.now(),
                weight: result.weight,
              };
              poll.addVote(newVote, result.weight);
            }
          }
        }
      }
    });

    // Note: Status changes are handled by useTwitchConnection hook
    // Do NOT call twitchService.onStatusChange here as it overwrites the hook's callback
    
    // Cleanup: unsubscribe from message callback to prevent duplicates
    return () => {
      unsubscribe();
    };
  }, []);

  // Disconnected State Render
  if (status !== ConnectionStatus.CONNECTED) {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col p-4 transition-colors duration-300 relative">
        <AnimatedBackground />
        <nav className="flex justify-between mb-4 gap-2 relative z-50" aria-label="Acciones principales">
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
        </nav>
        <main className="relative z-10 flex-1 flex items-center justify-center" data-tour="connection">
          <ConnectionPanel 
            status={status} 
            onConnect={handleConnect} 
            errorMessage={connectionError}
            savedCredentials={savedCredentials}
            onClearSavedCredentials={clearSavedCredentials}
          />
        </main>
        
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
        
        {/* Offline Indicator - Requirements 3.1, 3.2, 3.3, 3.4 */}
        <OfflineIndicator />
        
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
            {(userOriginalAvatar || channelAvatar) ? (
              <img src={userOriginalAvatar || channelAvatar || ''} alt={activeChannelName} className="w-8 h-8 rounded-full border-2 border-twitch-brand" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-sm">
                {activeChannelName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Moderator indicator */}
            {isViewingModeratedChannel && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border-2 border-white dark:border-zinc-900" title="Moderando">
                M
              </div>
            )}
            {/* Collaboration indicator */}
            {isCollaborationActive && !isViewingModeratedChannel && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border-2 border-white dark:border-zinc-900">
                +{collaborationChannels.length}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-zinc-900 dark:text-white">{activeChannelName}</span>
            {isViewingModeratedChannel && (
              <span className="text-[9px] text-green-500">Moderando</span>
            )}
          </div>
          <AuthCapabilitiesIndicator compact onReconnect={twitchConnect} />
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
            {(userOriginalAvatar || channelAvatar) ? (
              <img src={userOriginalAvatar || channelAvatar || ''} alt={activeChannelName} className="w-8 h-8 rounded-full border-2 border-twitch-brand" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-sm">
                {activeChannelName.charAt(0).toUpperCase()}
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
      <div className={`hidden md:flex bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col items-center py-4 shrink-0 z-20 transition-all duration-300 ${leftSidebarHidden ? 'w-0 border-r-0 p-0 overflow-hidden' : moderatedChannels.length > 1 ? 'w-20' : 'w-16 lg:w-20'}`}>
        {/* Channel Orbit - User Avatar with Moderated Channels */}
        <div className="mb-0 flex items-center justify-center w-full">
          {moderatedChannels.length > 1 ? (
            <ChannelOrbit
              channels={moderatedChannels}
              selectedChannel={selectedChannel}
              onSelectChannel={selectModeratedChannel}
              userAvatar={userOriginalAvatar || channelAvatar}
              userName={userLogin || channelName}
              size="md"
            />
          ) : (userOriginalAvatar || channelAvatar) ? (
            <img src={userOriginalAvatar || channelAvatar || ''} alt={activeChannelName} className="w-10 h-10 rounded-full border-2 border-twitch-brand" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-lg">
              {activeChannelName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Hide Sidebar Button */}
        <button
          onClick={() => setLeftSidebarHidden(true)}
          className="w-8 h-5 flex items-center justify-center text-zinc-400 hover:text-twitch-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors mb-2"
          title="Ocultar menú (Ctrl+B)"
        >
          <ChevronDown size={16} className="rotate-180" />
        </button>

        {/* Navigation */}
        <div className="flex flex-col gap-3 w-full px-2">
          <NavButton active={leftTab === 'dynamics'} onClick={() => setLeftTab('dynamics')} icon={<Sparkles size={20} />} label={t.nav?.dynamics || 'Dinámicas'} dataTour="nav-dynamics" />
          <NavButton active={leftTab === 'games'} onClick={() => setLeftTab('games')} icon={<Gamepad2 size={20} />} label={t.nav?.games || 'Juegos'} dataTour="nav-games" />
          <NavButton active={leftTab === 'platforms'} onClick={() => setLeftTab('platforms')} icon={<Layers size={20} />} label={t.nav?.platforms || 'Plataformas'} dataTour="nav-platforms" />
          <NavButton active={leftTab === 'obs'} onClick={() => setLeftTab('obs')} icon={<Monitor size={20} />} label="OBS" dataTour="nav-obs" />
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
          
          {/* AI Vision */}
          <NavButton 
            active={aiAnalytics.showMascot} 
            onClick={aiAnalytics.toggleMascot} 
            icon={<Eye size={20} />} 
            label="AI Vision" 
          />
          
          {/* Tools (incluye idioma y tema) */}
          <NavButton onClick={() => setShowTools(true)} icon={<Wrench size={20} />} label="Tools" />
        </div>

        {/* Disconnect button */}
        <div className="mt-auto w-full px-2 mb-3">
          <button onClick={handleDisconnect} className="w-full p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center gap-1 group">
            <Power size={20} />
            <span className="text-[9px] font-bold group-hover:opacity-100 opacity-0 transition-opacity">{t.common.exit}</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around py-2 px-4 z-40 safe-area-bottom">
        <MobileNavButton active={leftTab === 'dynamics'} onClick={() => { setLeftTab('dynamics'); setShowMobileSidebar(false); }} icon={<Sparkles size={20} />} label={t.nav?.dynamics || 'Dinámicas'} />
        <MobileNavButton active={leftTab === 'games'} onClick={() => { setLeftTab('games'); setShowMobileSidebar(false); }} icon={<Gamepad2 size={20} />} label={t.nav?.games || 'Juegos'} />
        <MobileNavButton active={leftTab === 'platforms'} onClick={() => { setLeftTab('platforms'); setShowMobileSidebar(false); }} icon={<Layers size={20} />} label={t.nav?.platforms || 'Plataformas'} />
        <MobileNavButton active={leftTab === 'obs'} onClick={() => { setLeftTab('obs'); setShowMobileSidebar(false); }} icon={<Monitor size={20} />} label="OBS" />
        <MobileNavButton active={leftTab === 'gallery'} onClick={() => { setLeftTab('gallery'); setShowMobileSidebar(false); }} icon={<ImageIcon size={20} />} label={t.nav.gallery} />
        <MobileNavButton active={leftTab === 'data'} onClick={() => { setLeftTab('data'); setShowMobileSidebar(false); }} icon={<BarChart3 size={20} />} label={t.nav.data} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Session expired: Twitch rejects the token for API calls */}
        {twitchAuthExpired && (
          <div role="alert" className="bg-red-900/80 border-b border-red-700 text-red-100 px-4 py-2 flex items-center justify-between gap-3 text-xs">
            <span>🔒 Tu sesión de Twitch ha caducado. El chat sigue funcionando, pero encuestas, predicciones, moderación y datos de subs necesitan volver a iniciar sesión.</span>
            <button
              onClick={() => { setTwitchAuthExpired(false); handleReauthenticate(); }}
              className="shrink-0 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-white font-medium transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        )}
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
            {/* A crash in one tab must not take down the dashboard; switching tab resets it */}
            <ErrorBoundary variant="panel" resetKey={`${leftTab}:${dataSubTab}`}>
            {leftTab === 'dynamics' && (
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
                <div data-tour="dynamics-panel" className="h-full">
                  <DynamicsPanel
                    view={dynamicsView}
                    onViewChange={handleDynamicsNavigation}
                    chatMessages={chatMessages}
                    isConnected={status === ConnectionStatus.CONNECTED}
                    userVoteMap={poll.userVoteMap}
                    collaborationChannels={collaborationChannels}
                    mainChannel={activeChannelName}
                    onAddCollaborator={addCollaborator}
                    onRemoveCollaborator={removeCollaborator}
                    onCreatePoll={handleCreatePoll}
                    onNotification={addNotification}
                    mediaLibrary={mediaLibrary}
                    onAddAsset={handleAddAsset}
                    moderationConfig={moderation.config}
                    onModerationConfigChange={moderation.setConfig}
                    sidebarHidden={leftSidebarHidden}
                    onClearChatMessages={() => setChatMessages([])}
                    onShowCountdown={() => setShowCountdown(true)}
                    authToken={authToken}
                    userId={userId}
                  />
                </div>
              )
            )}
            {leftTab === 'games' && (
              <div data-tour="stream-games" className="h-full">
                <StreamGames 
                  chatMessages={chatMessages}
                  isConnected={status === ConnectionStatus.CONNECTED}
                  isEmbedded={true}
                  userVoteMap={poll.userVoteMap}
                  collaborationChannels={collaborationChannels}
                  mainChannel={activeChannelName}
                  onAddCollaborator={addCollaborator}
                  onRemoveCollaborator={removeCollaborator}
                  authToken={authToken}
                />
              </div>
            )}
            {leftTab === 'platforms' && (
              <div data-tour="platforms-panel" className="h-full">
                <PlatformsPanel
                  view={platformsView}
                  tool={platformsTool}
                  onNavigate={handlePlatformsPanelNavigate}
                  onBack={handlePlatformsBack}
                  chatMessages={chatMessages}
                  isConnected={status === ConnectionStatus.CONNECTED}
                  sendMessage={(msg) => getTwitchService().sendMessage(msg)}
                  channel={activeChannelName}
                  channelId={activeChannelId}
                  authToken={authToken}
                  loggedInUserId={userId}
                  isPartnerOrAffiliate={true}
                  hasPredictionsScope={authCapabilities.canManagePredictions && isActiveChannelOwn}
                  hasRewardsScope={authCapabilities.canManageRedemptions && isActiveChannelOwn}
                  onNotification={addNotification}
                  onReauthenticate={handleReauthenticate}
                  // Channel selector props
                  moderatedChannels={moderatedChannels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={selectModeratedChannel}
                  isLoadingChannels={isLoadingChannels}
                  onRefreshChannels={refreshModeratedChannels}
                  hasModeratedChannels={hasModeratedChannels}
                  isViewingModeratedChannel={isViewingModeratedChannel}
                  moderatedChannelsError={moderatedChannelsError}
                  userScopes={authState.scopes}
                />
              </div>
            )}
            {leftTab === 'obs' && (
              <div data-tour="obs-control" className="h-full p-4 overflow-y-auto">
                <Suspense fallback={<LoadingFallback message="Cargando panel OBS..." />}>
                  <OBSControlPanel onNotification={addNotification} />
                </Suspense>
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
                    {aiAnalytics.config && Object.values(aiAnalytics.config.providers).some(p => p.enabled) && (
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
                    <Suspense fallback={<LoadingFallback message="Cargando actividad..." />}>
                      {/* Auth Capabilities Indicator */}
                      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                        <AuthCapabilitiesIndicator onReconnect={twitchConnect} />
                      </div>
                      <StreamActivity 
                        events={streamEventsHook.events}
                        votes={poll.voteHistory} 
                        pollOptions={poll.currentPoll ? poll.currentPoll.options.reduce((acc, opt) => ({...acc, [opt.id]: opt}), {}) : {}}
                        channelName={channelName}
                        authToken={authToken}
                        userId={userId}
                      />
                    </Suspense>
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
                          {aiAnalytics.config && Object.values(aiAnalytics.config.providers).some(p => p.enabled) && (
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
            </ErrorBoundary>
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
                      mainChannel={activeChannelName}
                      isConnected={status === ConnectionStatus.CONNECTED}
                      authToken={authToken}
                      broadcasterId={activeChannelId}
                      userId={authState.userId}
                    />
                  ) : activeRightTab === 'stream' ? (
                    <div className="h-full p-2 bg-black">
                      <StreamPlayer channel={activeChannelName} />
                    </div>
                  ) : (
                    // Collaboration tab
                    <div className="h-full p-4 overflow-y-auto">
                      <CollaborationPanel
                        mainChannel={activeChannelName}
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
                          mainChannel={activeChannelName}
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
                        mainChannel={activeChannelName}
                        isConnected={status === ConnectionStatus.CONNECTED}
                        authToken={authToken}
                        broadcasterId={activeChannelId}
                        userId={authState.userId}
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
                      <StreamPlayer channel={activeChannelName} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Offline Indicator - Requirements 3.1, 3.2, 3.3, 3.4 */}
      <OfflineIndicator />

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
        <Tools 
          onClose={() => setShowTools(false)} 
          theme={theme} 
          onToggleTheme={toggleTheme}
          showAIVision={aiAnalytics.showMascot}
          onToggleAIVision={aiAnalytics.toggleMascot}
        />
      )}

      {/* Countdown Widget - Global flotante */}
      {showCountdown && (
        <Countdown 
          chatMessages={chatMessages}
          onClose={() => setShowCountdown(false)}
        />
      )}
      
      {/* Vercel Speed Insights */}
      <SpeedInsights />
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
