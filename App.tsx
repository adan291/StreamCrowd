
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
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
import { twitchService } from './services/twitchService';
import { 
  AIConfig, 
  StreamSession, 
  loadAIConfig, 
  createSession, 
  saveSession,
  StoredMessage,
} from './services/aiAnalyticsService';
import { 
  ConnectionStatus, 
  Poll, 
  VoteRecord, 
  TwitchMessage, 
  MediaAsset,
  ModerationConfig,
  ModerationStats,
  ModerationLogEntry,
  DEFAULT_MODERATION_CONFIG,
  DEFAULT_MODERATION_STATS,
  UserVoteState,
  validateVote,
  calculateWeight,
  updateStats,
  createLogEntry,
  handleVoteChange,
} from './types';
import { CHART_COLORS } from './constants';
import { useTheme } from './context';
import { useI18n } from './i18n';
import { MessageSquare, Activity, Tv, Image as ImageIcon, Vote as VoteIcon, LayoutDashboard, Moon, Sun, History, Power, ChevronLeft, ChevronRight, BarChart3, Bot, Globe } from 'lucide-react';

const App: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<TwitchMessage[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const [channelAvatar, setChannelAvatar] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  // Right sidebar tabs (Chat, Stream)
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'stream'>('chat');
  
  // Left column tabs (Control Panel, Gallery, Data)
  const [leftTab, setLeftTab] = useState<'panel' | 'gallery' | 'data'>('panel');
  
  // Data sub-tabs (Activity, Analytics)
  const [dataSubTab, setDataSubTab] = useState<'activity' | 'analytics'>('activity');
  
  // Mobile sidebar toggle
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Desktop right sidebar collapsed state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  
  // Moderation State
  const [moderationConfig, setModerationConfig] = useState<ModerationConfig>(DEFAULT_MODERATION_CONFIG);
  const [moderationStats, setModerationStats] = useState<ModerationStats>(DEFAULT_MODERATION_STATS);
  const [moderationLog, setModerationLog] = useState<ModerationLogEntry[]>([]);
  const [userVoteStates, setUserVoteStates] = useState<Map<string, UserVoteState>>(new Map());
  const [userWeights, setUserWeights] = useState<Map<string, number>>(new Map());
  
  // Overlay Mode Logic
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlayBorderColor, setOverlayBorderColor] = useState('#FFFFFF');
  const [overlayShowBorders, setOverlayShowBorders] = useState(true);
  const [overlayFontSize, setOverlayFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [overlayFontStyle, setOverlayFontStyle] = useState<'normal' | 'bold' | 'italic'>('bold');
  const [overlayTheme, setOverlayTheme] = useState<'dark' | 'light'>('dark');
  
  // State for tracked votes to update UI efficiently
  const [votedUserIds, setVotedUserIds] = useState<Set<string>>(new Set());
  
  // Popup window ref (at App level so it persists across tab changes)
  const overlayWindowRef = useRef<Window | null>(null);
  
  // AI Analytics State
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [currentStreamSession, setCurrentStreamSession] = useState<StreamSession | null>(null);
  const [showAIConfig, setShowAIConfig] = useState(false);
  
  // Refs for callbacks
  const pollRef = useRef<Poll | null>(null);
  const votedUserIdsRef = useRef<Set<string>>(new Set());
  const moderationConfigRef = useRef<ModerationConfig>(DEFAULT_MODERATION_CONFIG);
  const userVoteStatesRef = useRef<Map<string, UserVoteState>>(new Map());
  const userWeightsRef = useRef<Map<string, number>>(new Map());

  // Memoize the map of UserID -> OptionID
  const userVoteMap = useMemo(() => {
    const map = new Map<string, number>();
    voteHistory.forEach(v => map.set(v.userId, v.optionId));
    return map;
  }, [voteHistory]);

  // Check for Overlay Mode on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('overlay') === 'true') {
        setIsOverlayMode(true);
        setTheme('dark');
        
        // If channel is provided in URL, connect to Twitch chat directly
        const channel = params.get('channel');
        if (channel) {
            setChannelName(channel);
            // Connect to Twitch chat (read-only, no token needed for reading)
            twitchService.connect(channel);
            
            // Check for poll config in URL (for OBS which doesn't share localStorage)
            // Format: ?overlay=true&channel=xxx&poll=Question&options=Opt1,Opt2,Opt3
            const pollQuestion = params.get('poll');
            const optionsParam = params.get('options');
            
            if (pollQuestion && optionsParam) {
                const optionLabels = optionsParam.split(',').map(o => o.trim()).filter(o => o);
                if (optionLabels.length >= 2) {
                    const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6'];
                    const newPoll: Poll = {
                        id: Date.now().toString(),
                        title: 'Encuesta',
                        question: decodeURIComponent(pollQuestion),
                        options: optionLabels.map((label, i) => ({
                            id: i + 1,
                            label: decodeURIComponent(label),
                            votes: 0,
                            color: colors[i % colors.length],
                        })),
                        isActive: true,
                        totalVotes: 0,
                        startTime: Date.now(),
                    };
                    setCurrentPoll(newPoll);
                }
            }
        }
    }
  }, []);

  // Sync State across Tabs using LocalStorage
  useEffect(() => {
    if (isOverlayMode) {
        // Overlay Mode: Listen for changes from other tabs
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'twitch_vote_sync_poll' && e.newValue) {
                try { setCurrentPoll(JSON.parse(e.newValue)); } catch{}
            }
            if (e.key === 'twitch_vote_sync_history' && e.newValue) {
                try { setVoteHistory(JSON.parse(e.newValue)); } catch{}
            }
        };
        window.addEventListener('storage', handleStorage);
        
        // Initial load
        const loadFromStorage = () => {
            const storedPoll = localStorage.getItem('twitch_vote_sync_poll');
            if (storedPoll) {
                try { setCurrentPoll(JSON.parse(storedPoll)); } catch{}
            }
            const storedHistory = localStorage.getItem('twitch_vote_sync_history');
            if (storedHistory) {
                try { setVoteHistory(JSON.parse(storedHistory)); } catch{}
            }
        };
        
        loadFromStorage();
        
        // Poll for changes every 500ms (storage event doesn't fire in same tab)
        const pollInterval = setInterval(loadFromStorage, 500);

        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(pollInterval);
        };
    }
  }, [isOverlayMode]);

  // Separate effect for saving sync data (Controller Mode)
  useEffect(() => {
      if (!isOverlayMode) {
          try {
             if (currentPoll) localStorage.setItem('twitch_vote_sync_poll', JSON.stringify(currentPoll));
             localStorage.setItem('twitch_vote_sync_history', JSON.stringify(voteHistory));
          } catch (e) {
             console.error("Storage Sync Error (Quota Exceeded?):", e);
             // In a real app we would compress data here or use IndexedDB
          }
      }
  }, [currentPoll, voteHistory, isOverlayMode]);


  // Theme is now managed by ThemeProvider context

  useEffect(() => {
    pollRef.current = currentPoll;
  }, [currentPoll]);

  useEffect(() => {
    moderationConfigRef.current = moderationConfig;
  }, [moderationConfig]);

  useEffect(() => {
    userVoteStatesRef.current = userVoteStates;
  }, [userVoteStates]);

  useEffect(() => {
    userWeightsRef.current = userWeights;
  }, [userWeights]);

  // Load Media Library
  useEffect(() => {
    const savedAssets = localStorage.getItem('twitch_vote_assets');
    if (savedAssets) {
        try {
            setMediaLibrary(JSON.parse(savedAssets));
        } catch (e) {
            console.error("Failed to load assets", e);
        }
    }
  }, []);

  // Load AI Config on mount
  useEffect(() => {
    const config = loadAIConfig();
    if (config) {
      setAIConfig(config);
    }
  }, []);

  // Create/manage stream session when connected
  useEffect(() => {
    if (status === ConnectionStatus.CONNECTED && channelName && !isOverlayMode) {
      // Create new session when connected
      const session = createSession(channelName);
      setCurrentStreamSession(session);
    } else if (status === ConnectionStatus.DISCONNECTED && currentStreamSession) {
      // Save session when disconnected
      const finalSession = { ...currentStreamSession, endTime: Date.now() };
      saveSession(finalSession);
      setCurrentStreamSession(null);
    }
  }, [status, channelName, isOverlayMode]);

  const addNotification = (type: NotificationType, message: string, metadata?: { channelInitial?: string }) => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, metadata }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAddAsset = (asset: MediaAsset) => {
      const updated = [asset, ...mediaLibrary];
      setMediaLibrary(updated);
      try {
        localStorage.setItem('twitch_vote_assets', JSON.stringify(updated));
      } catch (e) {
        addNotification('error', t.notifications.storageFull);
      }
  };

  const handleDeleteAsset = (id: string) => {
      const updated = mediaLibrary.filter(a => a.id !== id);
      setMediaLibrary(updated);
      localStorage.setItem('twitch_vote_assets', JSON.stringify(updated));
  };

  useEffect(() => {
    if (!channelName || isOverlayMode) return;

    // Connect when channelName changes
    twitchService.connect(channelName, authToken);
    
    // Attempt to fetch avatar
    setChannelAvatar(null);
    fetch(`https://decapi.me/twitch/avatar/${channelName}`)
        .then(res => res.text())
        .then(url => {
          if (url && !url.includes('not found')) {
            setChannelAvatar(url);
          }
        })
        .catch(err => console.error("Error fetching avatar", err));

  }, [channelName, isOverlayMode, authToken]);

  const handleConnect = (channel: string, token?: string) => {
      setChannelName(channel);
      if (token) setAuthToken(token);
      setStatus(ConnectionStatus.CONNECTING);
      setConnectionError(null);
  };

  const handleDisconnect = () => {
      twitchService.disconnect();
      setStatus(ConnectionStatus.DISCONNECTED);
      setChannelName('');
      setAuthToken('');
      setCurrentPoll(null);
      setVoteHistory([]);
      setChatMessages([]);
  };

  const handleCreatePoll = (title: string, question: string, options: any[], maxVotes?: number, duration?: number, progressBarColor?: string, limitIndicatorColor?: string, config?: ModerationConfig) => {
     const newPoll: Poll = {
         id: Date.now().toString(),
         title,
         question,
         options: options.map((o, i) => ({
             id: i+1,
             label: o.label,
             votes: 0,
             color: o.color,
             icon: o.icon,
             image: o.image
         })),
         isActive: true,
         totalVotes: 0,
         startTime: Date.now(),
         maxVotes,
         duration,
         progressBarColor,
         limitIndicatorColor
     };
     setCurrentPoll(newPoll);
     setVoteHistory([]);
     setVotedUserIds(new Set());
     votedUserIdsRef.current = new Set();
     
     // Reset moderation state for new poll
     if (config) {
       setModerationConfig(config);
       moderationConfigRef.current = config;
     }
     setModerationStats(DEFAULT_MODERATION_STATS);
     setModerationLog([]);
     setUserVoteStates(new Map());
     userVoteStatesRef.current = new Map();
     setUserWeights(new Map());
     userWeightsRef.current = new Map();
     
     // Announce in chat and sync with overlay
     if (authToken) {
         // Send sync command for overlay (hidden format that overlay reads)
         const optLabels = newPoll.options.map(o => o.label).join('|');
         twitchService.sendMessage(`!pollsync ${question}|${optLabels}`);
         
         // Send user-friendly announcement
         twitchService.sendMessage(`${t.chat.newPoll}: ${question}`);
         const opts = newPoll.options.map(o => `+${o.id} ${o.label}`).join(' | ');
         twitchService.sendMessage(`${t.chat.options}: ${opts}`);
         twitchService.sendMessage(t.chat.voteHint);
     }
  };

  const handleStopPoll = (auto = false) => {
      if (!currentPoll) return;
      
      const finishedPoll = { ...currentPoll, isActive: false };
      setCurrentPoll(finishedPoll);
      
      // Add to history
      setPastPolls(prev => [finishedPoll, ...prev]);
      
      // Save poll results to current session for analytics
      if (currentStreamSession) {
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
        setCurrentStreamSession(prev => prev ? {
          ...prev,
          pollResults: [...(prev.pollResults || []), pollSummary],
        } : null);
      }
      
      if (authToken) {
          // Sync end to overlay
          twitchService.sendMessage(`!pollend`);
          
          const winner = finishedPoll.options.reduce((a, b) => a.votes > b.votes ? a : b);
          twitchService.sendMessage(`${t.chat.pollEnded}: ${finishedPoll.question}`);
          twitchService.sendMessage(`${t.chat.winner}: ${winner.label} ${t.chat.withVotes.replace('{votes}', String(winner.votes))}`);
      }
      
      if (auto) addNotification('info', t.notifications.autoEnded);
  };

  const handleResetPoll = () => {
      setCurrentPoll(null);
      setVoteHistory([]);
      setVotedUserIds(new Set());
      votedUserIdsRef.current = new Set();
      // Reset moderation state
      setModerationStats(DEFAULT_MODERATION_STATS);
      setModerationLog([]);
      setUserVoteStates(new Map());
      userVoteStatesRef.current = new Map();
      setUserWeights(new Map());
      userWeightsRef.current = new Map();
  };

  // Process Messages
  useEffect(() => {
     twitchService.onMessage((tags, message, self) => {
         const msg: TwitchMessage = {
             username: tags['display-name'] || tags.username || 'Anon',
             message,
             color: tags.color || '#a970ff',
             id: tags.id,
             userId: tags['user-id']
         };
         
         setChatMessages(prev => [...prev.slice(-199), msg]); // Keep last 200
         
         // Store message in current session for analytics
         if (currentStreamSession) {
           const storedMsg: StoredMessage = {
             username: msg.username,
             message: msg.message,
             timestamp: Date.now(),
             userId: msg.userId,
           };
           setCurrentStreamSession(prev => prev ? {
             ...prev,
             messages: [...prev.messages.slice(-999), storedMsg], // Keep last 1000
           } : null);
         }

         // Process chat commands for overlay mode (broadcaster/mod only)
         const isBroadcaster = tags.badges && 'broadcaster' in tags.badges;
         const isMod = tags.mod === true || tags.mod === '1';
         const canControl = isBroadcaster || isMod;
         
         if (canControl) {
             const trimmedMsg = message.trim();
             
             // !poll Pregunta | Opción1 | Opción2 | Opción3
             if (trimmedMsg.startsWith('!poll ')) {
                 const parts = trimmedMsg.substring(6).split('|').map(p => p.trim()).filter(p => p);
                 if (parts.length >= 3) { // At least question + 2 options
                     const question = parts[0];
                     const optionLabels = parts.slice(1);
                     const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
                     const newPoll: Poll = {
                         id: Date.now().toString(),
                         title: 'Encuesta',
                         question,
                         options: optionLabels.map((label, i) => ({
                             id: i + 1,
                             label,
                             votes: 0,
                             color: colors[i % colors.length],
                         })),
                         isActive: true,
                         totalVotes: 0,
                         startTime: Date.now(),
                     };
                     setCurrentPoll(newPoll);
                     setVoteHistory([]);
                     setVotedUserIds(new Set());
                     votedUserIdsRef.current = new Set();
                     setModerationStats(DEFAULT_MODERATION_STATS);
                     setModerationLog([]);
                     setUserVoteStates(new Map());
                     userVoteStatesRef.current = new Map();
                     setUserWeights(new Map());
                     userWeightsRef.current = new Map();
                 }
             }
             
             // !endpoll - End current poll
             if (trimmedMsg === '!endpoll' && pollRef.current && pollRef.current.isActive) {
                 setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
             }
             
             // !resetpoll - Reset/clear poll
             if (trimmedMsg === '!resetpoll') {
                 setCurrentPoll(null);
                 setVoteHistory([]);
                 setVotedUserIds(new Set());
                 votedUserIdsRef.current = new Set();
             }
         }
         
         // !pollend - Sync end poll from main panel
         if (message.trim() === '!pollend' && pollRef.current) {
             setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
         }
         
         // !pollsync - Sync command from main panel (any broadcaster message)
         // Format: !pollsync Question|Option1|Option2|Option3
         if (message.trim().startsWith('!pollsync ')) {
             const syncData = message.trim().substring(10);
             const parts = syncData.split('|').map(p => p.trim()).filter(p => p);
             if (parts.length >= 3) {
                 const question = parts[0];
                 const optionLabels = parts.slice(1);
                 const colors = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
                 const newPoll: Poll = {
                     id: Date.now().toString(),
                     title: 'Encuesta',
                     question,
                     options: optionLabels.map((label, i) => ({
                         id: i + 1,
                         label,
                         votes: 0,
                         color: colors[i % colors.length],
                     })),
                     isActive: true,
                     totalVotes: 0,
                     startTime: Date.now(),
                 };
                 setCurrentPoll(newPoll);
                 setVoteHistory([]);
                 setVotedUserIds(new Set());
                 votedUserIdsRef.current = new Set();
                 setModerationStats(DEFAULT_MODERATION_STATS);
                 setModerationLog([]);
                 setUserVoteStates(new Map());
                 userVoteStatesRef.current = new Map();
                 setUserWeights(new Map());
                 userWeightsRef.current = new Map();
             }
         }

         // Process Vote with Moderation
         if (pollRef.current && pollRef.current.isActive) {
             const voteMatch = message.trim().match(/^\+(\d+)$/);
             if (voteMatch) {
                 const optionId = parseInt(voteMatch[1]);
                 const userId = tags['user-id'] || tags.username || 'unknown';
                 const currentTime = Date.now();
                 const config = moderationConfigRef.current;
                 
                 // Check valid option first
                 if (!pollRef.current.options.some(o => o.id === optionId)) {
                     // Invalid option - log and update stats
                     const logEntry = createLogEntry(
                         msg.username,
                         userId,
                         'REJECTED',
                         'INVALID_OPTION',
                         optionId,
                         0
                     );
                     setModerationLog(prev => [...prev, logEntry]);
                     setModerationStats(prev => updateStats(prev, false, 'INVALID_OPTION'));
                     return;
                 }
                 
                 // Get user's existing vote state
                 const existingVoteState = userVoteStatesRef.current.get(userId);
                 const hasVoted = existingVoteState !== undefined;
                 const lastVoteTime = existingVoteState?.timestamp ?? 0;
                 
                 // Extract user attributes from Twitch tags
                 const isSubscriber = tags.subscriber === true || tags.subscriber === '1';
                 const isFollower = tags.badges ? 'follower' in tags.badges : false;
                 
                 // Calculate account age (Twitch doesn't provide this directly, so we use 0 for now)
                 // In a real implementation, you'd fetch this from Twitch API
                 const accountAgeDays = 365; // Default to 1 year for now
                 
                 // Validate the vote using moderation service
                 const validationResult = validateVote(
                     {
                         accountAgeDays,
                         hasVoted,
                         lastVoteTime,
                         currentTime,
                         isSubscriber,
                         isFollower,
                     },
                     config
                 );
                 
                 if (!validationResult.isValid) {
                     // Vote rejected - log and update stats
                     const logEntry = createLogEntry(
                         msg.username,
                         userId,
                         'REJECTED',
                         validationResult.rejectionReason,
                         optionId,
                         0
                     );
                     setModerationLog(prev => [...prev, logEntry]);
                     setModerationStats(prev => updateStats(prev, false, validationResult.rejectionReason));
                     return;
                 }
                 
                 const weight = validationResult.weight;
                 
                 // Handle vote change vs new vote
                 if (hasVoted && existingVoteState) {
                     const oldOptionId = existingVoteState.optionId;
                     const oldWeight = existingVoteState.weight;
                     
                     // Update vote state
                     const newVoteState: UserVoteState = {
                         optionId,
                         timestamp: currentTime,
                         weight,
                         canChangeAt: config.voteChangeEnabled 
                             ? currentTime + (config.voteChangeCooldownSeconds * 1000) 
                             : undefined,
                     };
                     userVoteStatesRef.current.set(userId, newVoteState);
                     setUserVoteStates(new Map(userVoteStatesRef.current));
                     
                     // Log vote change
                     const logEntry = createLogEntry(
                         msg.username,
                         userId,
                         'VOTE_CHANGED',
                         undefined,
                         optionId,
                         weight
                     );
                     setModerationLog(prev => [...prev, logEntry]);
                     setModerationStats(prev => updateStats(prev, true));
                     
                     // Update poll counts (decrement old, increment new)
                     setCurrentPoll(prev => {
                         if (!prev) return null;
                         const newOptions = prev.options.map(o => {
                             if (o.id === oldOptionId) {
                                 return { ...o, votes: o.votes - oldWeight };
                             }
                             if (o.id === optionId) {
                                 return { ...o, votes: o.votes + weight };
                             }
                             return o;
                         });
                         return { ...prev, options: newOptions };
                     });
                     
                     // Update vote history
                     setVoteHistory(prev => prev.map(v => 
                         v.userId === userId 
                             ? { ...v, optionId, timestamp: currentTime }
                             : v
                     ));
                 } else {
                     // New vote
                     votedUserIdsRef.current.add(userId);
                     setVotedUserIds(new Set(votedUserIdsRef.current));
                     
                     // Store vote state
                     const newVoteState: UserVoteState = {
                         optionId,
                         timestamp: currentTime,
                         weight,
                         canChangeAt: config.voteChangeEnabled 
                             ? currentTime + (config.voteChangeCooldownSeconds * 1000) 
                             : undefined,
                     };
                     userVoteStatesRef.current.set(userId, newVoteState);
                     setUserVoteStates(new Map(userVoteStatesRef.current));
                     
                     // Store user weight
                     userWeightsRef.current.set(userId, weight);
                     setUserWeights(new Map(userWeightsRef.current));
                     
                     // Log accepted vote
                     const logEntry = createLogEntry(
                         msg.username,
                         userId,
                         'ACCEPTED',
                         undefined,
                         optionId,
                         weight
                     );
                     setModerationLog(prev => [...prev, logEntry]);
                     setModerationStats(prev => updateStats(prev, true));
                     
                     const newVote: VoteRecord = {
                         userId,
                         username: msg.username,
                         optionId,
                         timestamp: currentTime
                     };
                     setVoteHistory(prev => [...prev, newVote]);
                     
                     // Update Poll Counts with weight
                     setCurrentPoll(prev => {
                         if (!prev) return null;
                         const newOptions = prev.options.map(o => 
                             o.id === optionId ? { ...o, votes: o.votes + weight } : o
                         );
                         const newTotal = prev.totalVotes + weight;
                         
                         return { ...prev, options: newOptions, totalVotes: newTotal };
                     });
                 }
             }
         }
     });

     twitchService.onStatusChange((newStatus, err) => {
         setStatus(newStatus);
         if (err) {
             setConnectionError(err);
             addNotification('error', err);
         } else if (newStatus === ConnectionStatus.CONNECTED) {
             addNotification('success', t.connection.connectedSuccess, { channelInitial: channelName.charAt(0) });
         }
     });
  }, []);

  // Set distinctive window title for OBS overlay identification
  useEffect(() => {
      if (isOverlayMode) {
          document.title = '🎬 OVERLAY - Twitch Vote';
      }
  }, [isOverlayMode]);

  if (isOverlayMode) {
     const presetColors = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#FFFFFF', '#1a1a2e', '#16213e'];
     const textColors = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
     
     return (
        <div className="h-screen w-screen overflow-hidden relative" style={{ background: overlayBgColor }}>
             {/* Overlay Mode Indicator - Visible header for OBS identification */}
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
                onClick={() => setShowOverlaySettings(!showOverlaySettings)}
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
                                    onClick={() => setOverlayBgColor(color)}
                                    className={`w-6 h-6 rounded border-2 ${overlayBgColor === color ? 'border-white' : 'border-transparent'}`}
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
                                    onClick={() => setOverlayTextColor(color)}
                                    className={`w-6 h-6 rounded border-2 ${overlayTextColor === color ? 'border-white' : 'border-transparent'}`}
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
                                    onClick={() => setOverlayBorderColor(color)}
                                    className={`w-6 h-6 rounded border-2 ${overlayBorderColor === color ? 'border-white' : 'border-transparent'}`}
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
                            onClick={() => setOverlayShowBorders(!overlayShowBorders)}
                            className={`w-10 h-5 rounded-full transition-colors ${overlayShowBorders ? 'bg-green-500' : 'bg-zinc-600'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${overlayShowBorders ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    
                    {/* Font Size */}
                    <div className="mb-3">
                        <label className="text-zinc-400 text-xs block mb-1">{t.overlay.fontSize}</label>
                        <div className="flex gap-1">
                            {(['small', 'medium', 'large'] as const).map(size => (
                                <button
                                    key={size}
                                    onClick={() => setOverlayFontSize(size)}
                                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${overlayFontSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
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
                                onClick={() => setOverlayFontStyle('normal')}
                                className={`flex-1 py-1 px-2 rounded text-xs transition-colors ${overlayFontStyle === 'normal' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                            >
                                Normal
                            </button>
                            <button
                                onClick={() => setOverlayFontStyle('bold')}
                                className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${overlayFontStyle === 'bold' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                            >
                                Bold
                            </button>
                            <button
                                onClick={() => setOverlayFontStyle('italic')}
                                className={`flex-1 py-1 px-2 rounded text-xs italic transition-colors ${overlayFontStyle === 'italic' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                            >
                                Italic
                            </button>
                        </div>
                    </div>
                    
                    {/* Theme Toggle with Icons */}
                    <div className="pt-2 border-t border-zinc-700">
                        <label className="text-zinc-400 text-xs block mb-2">{t.overlay.theme}</label>
                        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                            <button
                                onClick={() => setOverlayTheme('light')}
                                className={`flex-1 p-2 rounded-md transition-all flex items-center justify-center gap-1 ${overlayTheme === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                title={t.overlay.light}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                <span className="text-xs">{t.overlay.light}</span>
                            </button>
                            <button
                                onClick={() => setOverlayTheme('dark')}
                                className={`flex-1 p-2 rounded-md transition-all flex items-center justify-center gap-1 ${overlayTheme === 'dark' ? 'bg-zinc-900 text-blue-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                title={t.overlay.dark}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>
                                <span className="text-xs">{t.overlay.dark}</span>
                            </button>
                        </div>
                    </div>
                </div>
             )}
             
             {currentPoll ? (
                 <LivePoll 
                    poll={currentPoll} 
                    voteHistory={voteHistory} 
                    onStop={()=>{}} 
                    onReset={()=>{}} 
                    theme={overlayTheme}
                    variant="overlay"
                    shouldRenderChart={true}
                    overlayStyles={{
                        textColor: overlayTextColor,
                        borderColor: overlayBorderColor,
                        showBorders: overlayShowBorders,
                        fontSize: overlayFontSize,
                        fontStyle: overlayFontStyle,
                    }}
                 />
             ) : (
                 <div className="h-full w-full flex items-center justify-center" style={{ color: overlayTextColor }}>
                     <div className="text-center p-8 bg-black/70 rounded-xl shadow-xl max-w-md" style={{ borderColor: overlayBorderColor, borderWidth: overlayShowBorders ? 2 : 0 }}>
                         <p className="font-bold mb-2 text-xl">{t.poll.waitingPoll}</p>
                         <p className="text-sm opacity-70">{t.poll.createPollHint}</p>
                     </div>
                 </div>
             )}
        </div>
     );
  }

  if (status !== ConnectionStatus.CONNECTED) {
      return (
          <div className="min-h-screen bg-slate-200 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col p-4 transition-colors duration-300 relative">
             <AnimatedBackground />
             <div className="flex justify-end mb-4 gap-2 relative z-50">
                 <LanguageSelector variant="icon" />
                 <button 
                   onClick={toggleTheme} 
                   className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
                 >
                     {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
             </div>
             <div className="relative z-10 flex-1 flex items-center justify-center">
               <ConnectionPanel 
                  status={status} 
                  onConnect={handleConnect} 
                  onDisconnect={handleDisconnect} 
                  errorMessage={connectionError}
               />
             </div>
             <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed top-16 left-1/2 -translate-x-1/2 z-[100]" />
          </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-30">
         <div className="flex items-center gap-3">
             {channelAvatar ? (
                 <img src={channelAvatar} alt={channelName} className="w-8 h-8 rounded-full border-2 border-twitch-brand" />
             ) : (
                 <div className="w-8 h-8 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-sm">
                     {channelName.charAt(0).toUpperCase()}
                 </div>
             )}
             <span className="font-bold text-sm text-zinc-900 dark:text-white">{channelName}</span>
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
      
      {/* Sidebar / Left Navigation - Hidden on mobile, shown as bottom nav */}
      <div className="hidden md:flex w-16 lg:w-20 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col items-center py-4 shrink-0 z-20">
         <div className="mb-6">
             {channelAvatar ? (
                 <img src={channelAvatar} alt={channelName} className="w-10 h-10 rounded-full border-2 border-twitch-brand" />
             ) : (
                 <div className="w-10 h-10 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-lg">
                     {channelName.charAt(0).toUpperCase()}
                 </div>
             )}
         </div>

         <div className="flex flex-col gap-3 w-full px-2">
             <NavButton active={leftTab === 'panel'} onClick={() => setLeftTab('panel')} icon={<LayoutDashboard size={20} />} label={t.nav.panel} />
             <NavButton active={leftTab === 'gallery'} onClick={() => setLeftTab('gallery')} icon={<ImageIcon size={20} />} label={t.nav.gallery} />
             <div className="relative">
               <NavButton active={leftTab === 'data'} onClick={() => setLeftTab('data')} icon={<BarChart3 size={20} />} label={t.nav.data} />
               {currentStreamSession && currentStreamSession.messages.length > 0 && (
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               )}
             </div>
         </div>

         <div className="mt-auto flex flex-col gap-3 w-full px-2">
             <NavButton onClick={() => setShowHistory(true)} icon={<History size={20} />} label={t.nav.history} />
             <div className="relative">
               <NavButton onClick={() => setShowLanguageMenu(!showLanguageMenu)} icon={<Globe size={20} />} label={t.common.language} />
               {showLanguageMenu && (
                 <div className="absolute left-full ml-2 bottom-0 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50 animate-scale-up min-w-[120px]">
                   {[
                     { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
                     { code: 'en' as const, name: 'English', flag: '🇺🇸' },
                   ].map((lang) => (
                     <button
                       key={lang.code}
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         console.log('Button clicked, setting locale to:', lang.code);
                         setLocale(lang.code); 
                         setShowLanguageMenu(false); 
                       }}
                       className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${locale === lang.code ? 'bg-twitch-brand/10 text-twitch-brand' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                     >
                       <span>{lang.flag}</span>
                       <span className="font-medium">{lang.name}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
             <NavButton onClick={toggleTheme} icon={theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />} label={t.common.theme} />
             <button onClick={handleDisconnect} className="p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center gap-1 group">
                 <Power size={20} />
                 <span className="text-[9px] font-bold group-hover:opacity-100 opacity-0 transition-opacity">{t.common.exit}</span>
             </button>
         </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around py-2 px-4 z-40 safe-area-bottom">
          <MobileNavButton active={leftTab === 'panel'} onClick={() => { setLeftTab('panel'); setShowMobileSidebar(false); }} icon={<LayoutDashboard size={20} />} label={t.nav.panel} />
          <MobileNavButton active={leftTab === 'gallery'} onClick={() => { setLeftTab('gallery'); setShowMobileSidebar(false); }} icon={<ImageIcon size={20} />} label={t.nav.gallery} />
          <MobileNavButton active={leftTab === 'data'} onClick={() => { setLeftTab('data'); setShowMobileSidebar(false); }} icon={<BarChart3 size={20} />} label={t.nav.data} />
          <MobileNavButton onClick={() => setShowHistory(true)} icon={<History size={20} />} label={t.nav.history} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex overflow-hidden relative">
              {/* Left Column Content */}
              <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-black/50 relative overflow-y-auto pb-16 md:pb-0">
                  {leftTab === 'panel' && (
                      currentPoll ? (
                          <LivePoll 
                            poll={currentPoll} 
                            voteHistory={voteHistory} 
                            onStop={handleStopPoll} 
                            onReset={handleResetPoll}
                            onUpdate={(t, q) => setCurrentPoll(prev => prev ? ({...prev, title: t, question: q}) : null)}
                            theme={theme}
                            moderationStats={moderationStats}
                            moderationLog={moderationLog}
                            userWeights={userWeights}
                            overlayWindowRef={overlayWindowRef}
                          />
                      ) : (
                          <PollCreator 
                            onCreate={handleCreatePoll} 
                            onNotification={addNotification}
                            mediaLibrary={mediaLibrary}
                            onAddAsset={handleAddAsset}
                            moderationConfig={moderationConfig}
                            onModerationConfigChange={setModerationConfig}
                          />
                      )
                  )}
                  {leftTab === 'gallery' && (
                      <AssetLibrary 
                        assets={mediaLibrary} 
                        onAdd={handleAddAsset} 
                        onDelete={handleDeleteAsset} 
                        onNotification={addNotification} 
                      />
                  )}
                  {leftTab === 'data' && (
                      <div className="h-full flex flex-col">
                          {/* Sub-tabs header */}
                          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                              <button 
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${dataSubTab === 'activity' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                                onClick={() => setDataSubTab('activity')}
                              >
                                  <Activity size={16} /> {t.nav.activity}
                              </button>
                              <button 
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${dataSubTab === 'analytics' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                                onClick={() => setDataSubTab('analytics')}
                              >
                                  <BarChart3 size={16} /> {t.nav.analytics}
                                  {aiConfig?.enabled && (
                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">IA</span>
                                  )}
                              </button>
                          </div>
                          
                          {/* Sub-tab content */}
                          <div className="flex-1 overflow-y-auto">
                              {dataSubTab === 'activity' && (
                                  <RecentVotes 
                                      votes={voteHistory} 
                                      options={currentPoll ? currentPoll.options.reduce((acc, opt) => ({...acc, [opt.id]: opt}), {}) : {}}
                                  />
                              )}
                              {dataSubTab === 'analytics' && (
                                  <div className="p-4 space-y-4">
                                      {/* AI Config Toggle */}
                                      <button
                                        onClick={() => setShowAIConfig(!showAIConfig)}
                                        className="w-full flex items-center justify-between p-3 bg-white/5 dark:bg-gray-800/50 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Bot className="w-5 h-5 text-purple-400" />
                                          <span className="text-white font-medium">{t.analytics.configureAI}</span>
                                          {aiConfig?.enabled && (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                              {t.analytics.aiActive}
                                            </span>
                                          )}
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showAIConfig ? 'rotate-90' : ''}`} />
                                      </button>
                                      
                                      {/* AI Config Panel (collapsible) */}
                                      {showAIConfig && (
                                        <AIConfigPanel onConfigChange={setAIConfig} />
                                      )}
                                      
                                      {/* Stream Analytics */}
                                      <StreamAnalytics
                                        currentSession={currentStreamSession}
                                        aiConfig={aiConfig}
                                        isStreamActive={status === ConnectionStatus.CONNECTED}
                                      />
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
                      <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
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
                      </div>
                      
                      <div className="flex-1 overflow-hidden relative">
                          {activeRightTab === 'chat' ? (
                              <ChatFeed 
                                messages={chatMessages} 
                                userVoteMap={userVoteMap} 
                                options={currentPoll?.options} 
                              />
                          ) : (
                              <div className="h-full p-2 bg-black">
                                  <StreamPlayer channel={channelName} />
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {showHistory && (
          <PollHistory history={pastPolls} onClose={() => setShowHistory(false)} />
      )}

      <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-[100]" />
    </div>
  );
};

const NavButton: React.FC<{ active?: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick} 
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
