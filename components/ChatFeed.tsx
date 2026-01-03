import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { TwitchMessage, PollOption, CollaborationChannel } from '../types';
import { MessageSquare, CheckCircle2, ArrowDown, Settings, Send, X, Type, Minus, Plus, Clock, Ban, Crown, Heart, ExternalLink, User, Terminal, Megaphone } from 'lucide-react';
import { useI18n } from '../i18n';
import { getTwitchService } from '../src/application/services/TwitchService';
import { ChatCommandService } from '../src/application/services/ChatCommandService';
import { getTwitchApiServiceAdapter } from '../src/application/adapters/TwitchApiServiceAdapter';
import { getTwitchAdapter } from '../src/infrastructure/adapters/TwitchAdapter';

// Local announcement message type
interface LocalAnnouncement {
  id: string;
  text: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'primary';
  timestamp: number;
  username: string;
}

// System notification type (for shoutout, raid, clip, etc.)
interface SystemNotification {
  id: string;
  type: 'shoutout' | 'raid' | 'clip' | 'poll' | 'prediction' | 'moderation';
  icon: string;
  text: string;
  link?: string;
  timestamp: number;
}

interface ChatSettings {
  fontSize: 'xs' | 'sm' | 'base' | 'lg';
  fontFamily: 'mono' | 'sans' | 'serif';
  showTimestamps: boolean;
  compactMode: boolean;
}

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  fontSize: 'sm',
  fontFamily: 'mono',
  showTimestamps: false,
  compactMode: false,
};

interface ChatFeedProps {
  messages: TwitchMessage[];
  userVoteMap: Map<string, number>;
  options?: PollOption[];
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  isConnected?: boolean;
  authToken?: string | null;
  broadcasterId?: string | null;
  userId?: string | null;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, userVoteMap, options, collaborationChannels = [], mainChannel, isConnected = false, authToken, broadcasterId, userId }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [localAnnouncements, setLocalAnnouncements] = useState<LocalAnnouncement[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(() => {
    const saved = localStorage.getItem('chat_settings');
    return saved ? { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_CHAT_SETTINGS;
  });

  // Function to add a local announcement
  const addLocalAnnouncement = useCallback((text: string, color: 'blue' | 'green' | 'orange' | 'purple' | 'primary', username: string) => {
    const announcement: LocalAnnouncement = {
      id: `announce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      color,
      timestamp: Date.now(),
      username,
    };
    setLocalAnnouncements(prev => [...prev, announcement]);
  }, []);

  // Function to add a system notification
  const addSystemNotification = useCallback((notification: { type: SystemNotification['type']; icon: string; text: string; link?: string }) => {
    const sysNotif: SystemNotification = {
      id: `sysnotif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: Date.now(),
    };
    setSystemNotifications(prev => [...prev, sysNotif]);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('chat_settings', JSON.stringify(settings));
  }, [settings]);

  // Build channel color map for quick lookup
  const channelColorMap = React.useMemo(() => {
    const map = new Map<string, { color: string; isMain: boolean }>();
    if (mainChannel) {
      map.set(mainChannel.toLowerCase(), { color: '#a970ff', isMain: true });
    }
    collaborationChannels.forEach(ch => {
      map.set(ch.name.toLowerCase(), { color: ch.color, isMain: false });
    });
    return map;
  }, [mainChannel, collaborationChannels]);

  const isCollaborationMode = collaborationChannels.length > 0;

  // Combine messages with local announcements and system notifications, sorted by timestamp
  type CombinedMessage = 
    | { type: 'message'; data: TwitchMessage; timestamp: number }
    | { type: 'announcement'; data: LocalAnnouncement; timestamp: number }
    | { type: 'system'; data: SystemNotification; timestamp: number };
  
  const combinedMessages = useMemo((): CombinedMessage[] => {
    const msgItems: CombinedMessage[] = messages.map(msg => ({
      type: 'message' as const,
      data: msg,
      timestamp: msg.timestamp || 0,
    }));
    
    const announceItems: CombinedMessage[] = localAnnouncements.map(ann => ({
      type: 'announcement' as const,
      data: ann,
      timestamp: ann.timestamp,
    }));

    const sysNotifItems: CombinedMessage[] = systemNotifications.map(notif => ({
      type: 'system' as const,
      data: notif,
      timestamp: notif.timestamp,
    }));
    
    // Combine and sort by timestamp
    return [...msgItems, ...announceItems, ...sysNotifItems].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, localAnnouncements, systemNotifications]);

  // Handle scroll events to detect if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  // Effect to auto-scroll when new messages arrive
  useEffect(() => {
    if (isAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isAutoScroll]);

  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Create ChatCommandService instance
  const commandService = useMemo(() => {
    // Initialize the adapter if needed
    const twitchAdapter = getTwitchAdapter();
    const twitchApiService = getTwitchApiServiceAdapter(twitchAdapter);
    
    if (!twitchApiService || !authToken || !broadcasterId) {
      return null;
    }

    // Set credentials on the adapter
    twitchApiService.setCredentials(authToken, broadcasterId, userId || broadcasterId);

    return new ChatCommandService({
      twitchApiService,
      sendChatMessage: async (message: string) => {
        return getTwitchService().sendMessage(message);
      },
      timeoutUser: async (username: string, duration: number) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().timeoutUser(authToken, broadcasterId, targetUserId, duration);
      },
      banUser: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().banUser(authToken, broadcasterId, targetUserId);
      },
      unbanUser: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().unbanUser(authToken, broadcasterId, targetUserId);
      },
      addVIP: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().addVIP(authToken, broadcasterId, targetUserId);
      },
      removeVIP: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().removeVIP(authToken, broadcasterId, targetUserId);
      },
      addModerator: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().addModerator(authToken, broadcasterId, targetUserId);
      },
      removeModerator: async (username: string) => {
        if (!authToken || !mainChannel) return false;
        const targetUserId = await getTwitchService().getUserId(authToken, username);
        if (!targetUserId || !broadcasterId) return false;
        return getTwitchService().removeModerator(authToken, broadcasterId, targetUserId);
      },
    });
  }, [authToken, broadcasterId, userId, mainChannel]);

  // Estado para menú de moderación
  const [selectedUser, setSelectedUser] = useState<{ username: string; userId?: string; color?: string; position: { x: number; y: number } } | null>(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<{ success: boolean; message: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSelectedUser(null);
        setModerationResult(null);
      }
    };
    if (selectedUser) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedUser]);

  // Funciones de moderación
  const timeoutUser = async (username: string, duration: number) => {
    if (!authToken || !mainChannel) return;
    setModerationLoading(true);
    setModerationResult(null);
    try {
      const broadcasterId = await getTwitchService().getUserId(authToken, mainChannel);
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      const success = await getTwitchService().timeoutUser(authToken, broadcasterId, targetUserId, duration);
      if (success) {
        const durationStr = duration < 60 ? `${duration}s` : duration < 3600 ? `${Math.floor(duration/60)}m` : `${Math.floor(duration/3600)}h`;
        setModerationResult({ success: true, message: `${username} silenciado ${durationStr}` });
      } else {
        setModerationResult({ success: false, message: 'Error al silenciar. Verifica permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al silenciar usuario' });
    } finally {
      setModerationLoading(false);
    }
  };

  const banUser = async (username: string) => {
    if (!authToken || !mainChannel) return;
    setModerationLoading(true);
    setModerationResult(null);
    try {
      const broadcasterId = await getTwitchService().getUserId(authToken, mainChannel);
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      const success = await getTwitchService().banUser(authToken, broadcasterId, targetUserId);
      if (success) {
        setModerationResult({ success: true, message: `${username} baneado` });
      } else {
        setModerationResult({ success: false, message: 'Error al banear. Verifica permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al banear usuario' });
    } finally {
      setModerationLoading(false);
    }
  };

  const unbanUser = async (username: string) => {
    if (!authToken || !mainChannel) return;
    setModerationLoading(true);
    setModerationResult(null);
    try {
      const broadcasterId = await getTwitchService().getUserId(authToken, mainChannel);
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      const success = await getTwitchService().unbanUser(authToken, broadcasterId, targetUserId);
      if (success) {
        setModerationResult({ success: true, message: `${username} desbaneado` });
      } else {
        setModerationResult({ success: false, message: 'Error al desbanear. Verifica permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al desbanear usuario' });
    } finally {
      setModerationLoading(false);
    }
  };

  const addVIP = async (username: string) => {
    if (!authToken || !mainChannel) return;
    setModerationLoading(true);
    setModerationResult(null);
    try {
      const broadcasterId = await getTwitchService().getUserId(authToken, mainChannel);
      if (!broadcasterId) {
        setModerationResult({ success: false, message: 'No se pudo obtener el ID del canal' });
        return;
      }
      const targetUserId = await getTwitchService().getUserId(authToken, username);
      if (!targetUserId) {
        setModerationResult({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      const success = await getTwitchService().addVIP(authToken, broadcasterId, targetUserId);
      if (success) {
        setModerationResult({ success: true, message: `${username} ahora es VIP` });
      } else {
        setModerationResult({ success: false, message: 'Error al dar VIP. Verifica permisos.' });
      }
    } catch (err) {
      setModerationResult({ success: false, message: 'Error al dar VIP' });
    } finally {
      setModerationLoading(false);
    }
  };

  const handleUsernameClick = (e: React.MouseEvent, msg: TwitchMessage) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSelectedUser({
      username: msg.username,
      userId: msg.userId,
      color: msg.color,
      position: { x: rect.left, y: rect.bottom + 5 }
    });
    setModerationResult(null);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !isConnected || !authToken) return;
    
    setSendingMessage(true);
    setSendError(null);
    setCommandFeedback(null);
    
    try {
      // Check if it's a command
      if (chatMessage.trim().startsWith('/')) {
        if (commandService) {
          const result = await commandService.execute(chatMessage.trim());
          if (result.isCommand) {
            setCommandFeedback({ message: result.message, success: result.success });
            if (result.success) {
              setChatMessage('');
              
              // If it was an announcement, add it to local display
              if (result.announcementData) {
                const username = mainChannel || 'Moderador';
                addLocalAnnouncement(
                  result.announcementData.text, 
                  result.announcementData.color,
                  username
                );
              }
              
              // If it has a system notification, add it to local display
              if (result.systemNotification) {
                addSystemNotification(result.systemNotification);
              }
            }
            // Auto-hide feedback after 5 seconds
            setTimeout(() => setCommandFeedback(null), 5000);
            return;
          }
        } else {
          setSendError('Comandos no disponibles. Verifica la autenticación.');
          return;
        }
      }
      
      // Regular message
      const success = await getTwitchService().sendMessage(chatMessage.trim());
      if (success) {
        setChatMessage('');
      } else {
        setSendError('No se pudo enviar el mensaje');
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setSendError('Error al enviar mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const updateSetting = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Font size classes
  const fontSizeClass = {
    xs: 'text-[10px]',
    sm: 'text-xs md:text-sm',
    base: 'text-sm md:text-base',
    lg: 'text-base md:text-lg',
  }[settings.fontSize];

  // Font family classes
  const fontFamilyClass = {
    mono: 'font-mono',
    sans: 'font-sans',
    serif: 'font-serif',
  }[settings.fontFamily];

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-900 border-0 md:border border-zinc-200 dark:border-zinc-800 rounded-none md:rounded-xl h-full flex flex-col shadow-lg overflow-hidden relative"
      role="log"
      aria-label={t.chat.liveChat}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 sm:p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10 shrink-0">
        <div className="p-1 sm:p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-twitch-brand dark:text-twitch-light" aria-hidden="true">
          <MessageSquare size={14} />
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{t.chat.liveChat}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono" aria-live="off">
            {messages.length > 0 ? `${messages.length} msgs` : 'Ready'}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-twitch-brand text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            title="Opciones del chat"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Opciones del Chat</span>
            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
              <X size={14} />
            </button>
          </div>
          
          {/* Font Size */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Type size={12} /> Tamaño
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const sizes: ChatSettings['fontSize'][] = ['xs', 'sm', 'base', 'lg'];
                  const idx = sizes.indexOf(settings.fontSize);
                  if (idx > 0) updateSetting('fontSize', sizes[idx - 1]);
                }}
                className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40"
                disabled={settings.fontSize === 'xs'}
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-mono w-12 text-center text-zinc-600 dark:text-zinc-300">
                {settings.fontSize.toUpperCase()}
              </span>
              <button
                onClick={() => {
                  const sizes: ChatSettings['fontSize'][] = ['xs', 'sm', 'base', 'lg'];
                  const idx = sizes.indexOf(settings.fontSize);
                  if (idx < sizes.length - 1) updateSetting('fontSize', sizes[idx + 1]);
                }}
                className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40"
                disabled={settings.fontSize === 'lg'}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Fuente</span>
            <div className="flex gap-1">
              {(['mono', 'sans', 'serif'] as const).map(font => (
                <button
                  key={font}
                  onClick={() => updateSetting('fontFamily', font)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    settings.fontFamily === font
                      ? 'bg-twitch-brand text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  } ${font === 'mono' ? 'font-mono' : font === 'serif' ? 'font-serif' : 'font-sans'}`}
                >
                  {font === 'mono' ? 'Mono' : font === 'sans' ? 'Sans' : 'Serif'}
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Mostrar hora</span>
            <button
              onClick={() => updateSetting('showTimestamps', !settings.showTimestamps)}
              className={`w-10 h-5 rounded-full transition-colors ${settings.showTimestamps ? 'bg-twitch-brand' : 'bg-zinc-300 dark:bg-zinc-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.showTimestamps ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Compact Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Modo compacto</span>
            <button
              onClick={() => updateSetting('compactMode', !settings.compactMode)}
              className={`w-10 h-5 rounded-full transition-colors ${settings.compactMode ? 'bg-twitch-brand' : 'bg-zinc-300 dark:bg-zinc-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.compactMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 custom-scrollbar bg-zinc-50/50 dark:bg-black/20 ${fontFamilyClass} ${fontSizeClass} ${settings.compactMode ? 'space-y-0.5' : 'space-y-1.5 sm:space-y-2 md:space-y-3'}`}
      >
        {combinedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 opacity-50">
            <MessageSquare size={24} />
            <span className="text-xs italic">{t.chat.waitingMessages}</span>
          </div>
        )}
        {combinedMessages.map((item, i) => {
          // Render announcement
          if (item.type === 'announcement') {
            const ann = item.data;
            const colorMap: Record<string, string> = {
              blue: '#3b82f6',
              green: '#22c55e',
              orange: '#f97316',
              purple: '#a855f7',
              primary: '#a855f7',
            };
            const bgColorMap: Record<string, string> = {
              blue: 'rgba(59, 130, 246, 0.15)',
              green: 'rgba(34, 197, 94, 0.15)',
              orange: 'rgba(249, 115, 22, 0.15)',
              purple: 'rgba(168, 85, 247, 0.15)',
              primary: 'rgba(168, 85, 247, 0.15)',
            };
            const borderColor = colorMap[ann.color] || colorMap.primary;
            const bgColor = bgColorMap[ann.color] || bgColorMap.primary;
            
            return (
              <div 
                key={ann.id}
                className="animate-fade-in rounded-lg p-2 border-l-4"
                style={{ 
                  backgroundColor: bgColor,
                  borderLeftColor: borderColor,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone size={14} style={{ color: borderColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: borderColor }}>
                    Anuncio
                  </span>
                  {settings.showTimestamps && (
                    <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">
                      {formatTimestamp(ann.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 text-sm font-medium">
                  {ann.text}
                </p>
              </div>
            );
          }

          // Render system notification
          if (item.type === 'system') {
            const notif = item.data;
            const typeColors: Record<string, { bg: string; border: string; text: string }> = {
              shoutout: { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#ec4899' },
              raid: { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#f97316' },
              clip: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' },
              poll: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#22c55e' },
              prediction: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#a855f7' },
              moderation: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' },
            };
            const colors = typeColors[notif.type] || typeColors.moderation;
            
            return (
              <div 
                key={notif.id}
                className="animate-fade-in rounded-lg p-2 border-l-4"
                style={{ 
                  backgroundColor: colors.bg,
                  borderLeftColor: colors.border,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{notif.icon}</span>
                  <span className="text-xs font-medium" style={{ color: colors.text }}>
                    {notif.text}
                  </span>
                  {notif.link && (
                    <a 
                      href={notif.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] underline hover:no-underline ml-1"
                      style={{ color: colors.text }}
                    >
                      Ver
                    </a>
                  )}
                  {settings.showTimestamps && (
                    <span className="text-zinc-400 dark:text-zinc-500 text-[10px] ml-auto">
                      {formatTimestamp(notif.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            );
          }
          
          // Render regular message
          const msg = item.data as TwitchMessage;
          const votedOptionId = userVoteMap.get(msg.userId || '') || userVoteMap.get(msg.username);
          const hasVoted = votedOptionId !== undefined;
          
          let previousVoteOption: PollOption | undefined;
          if (options && hasVoted) {
            previousVoteOption = options.find(o => o.id === votedOptionId);
          }
          
          const voteMatch = msg.message.trim().match(/^\+(\d+)$/);
          
          let currentMsgOption: PollOption | undefined;
          if (options && voteMatch) {
            const optId = parseInt(voteMatch[1]);
            currentMsgOption = options.find(o => o.id === optId);
          }

          const sourceChannel = msg.sourceChannel?.toLowerCase();
          const channelInfo = sourceChannel ? channelColorMap.get(sourceChannel) : null;

          return (
            <div 
              key={msg.id || i} 
              className={`break-words leading-snug animate-fade-in group hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded transition-colors ${settings.compactMode ? 'p-0.5 -mx-0.5' : 'p-1.5 -mx-1.5'}`}
            >
              <div className="flex flex-wrap items-baseline gap-1.5">
                
                {/* Timestamp */}
                {settings.showTimestamps && msg.timestamp && (
                  <span className="text-zinc-400 dark:text-zinc-600 text-[10px] shrink-0">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                )}
                
                {/* Channel indicator for collaboration mode */}
                {isCollaborationMode && channelInfo && (
                  <div className="inline-flex items-center shrink-0" title={sourceChannel}>
                    <div 
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: channelInfo.color }}
                    />
                    {!channelInfo.isMain && (
                      <span 
                        className="text-[9px] font-bold uppercase tracking-wider mr-1 opacity-70"
                        style={{ color: channelInfo.color }}
                      >
                        {sourceChannel}
                      </span>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={(e) => authToken && handleUsernameClick(e, msg)}
                  className={`font-bold whitespace-nowrap ${authToken ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                  style={{ color: msg.color || '#a970ff' }}
                  title={authToken ? 'Clic para opciones de moderación' : msg.username}
                >
                  {msg.username}:
                </button>

                {hasVoted && previousVoteOption && (
                  <div 
                    className="inline-flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700/50 select-none opacity-80 shadow-sm"
                    title={`${t.chat.votedFor}: ${previousVoteOption.label}`}
                  >
                    {previousVoteOption.image ? (
                      <img src={previousVoteOption.image} className="w-3 h-3 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="text-[10px] leading-none text-zinc-900 dark:text-white">{previousVoteOption.icon || '#'}</span>
                    )}
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold leading-none">+{previousVoteOption.id}</span>
                    <CheckCircle2 size={10} className="text-green-500" />
                  </div>
                )}

                <span className="text-zinc-800 dark:text-zinc-300 flex items-center gap-1 flex-wrap">
                  {msg.message}
                  
                  {currentMsgOption && !hasVoted && (
                    <span 
                      className="inline-flex items-center justify-center h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden border border-zinc-300 dark:border-zinc-700 ml-1 align-text-bottom shadow-sm"
                      title={currentMsgOption.label}
                    >
                      {currentMsgOption.image ? (
                        <img src={currentMsgOption.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-zinc-900 dark:text-white">{currentMsgOption.icon || '#'}</span>
                      )}
                    </span>
                  )}

                  {voteMatch && hasVoted && previousVoteOption && (
                    <span className="ml-1 flex items-center gap-1 text-[10px] text-zinc-400 italic">
                      ({t.chat.alreadyRegistered})
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Scroll Button */}
      {showScrollButton && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 animate-fade-in-up">
          <button 
            onClick={scrollToBottom}
            className="bg-twitch-brand hover:bg-twitch-light text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border border-white/10"
            aria-label={t.chat.newMessages}
          >
            <ArrowDown size={14} aria-hidden="true" /> {t.chat.newMessages}
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Command feedback */}
        {commandFeedback && (
          <div className={`mb-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
            commandFeedback.success 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <Terminal size={14} />
            <span>{commandFeedback.message}</span>
            <button 
              onClick={() => setCommandFeedback(null)}
              className="ml-auto hover:opacity-70"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        {/* Command hint when typing / */}
        {chatMessage.startsWith('/') && (
          <div className="mb-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg text-[10px] text-zinc-400 border border-zinc-700">
            <span className="text-twitch-brand font-bold">Comandos:</span> /announce, /slow, /emoteonly, /shoutout, /raid, /clip, /poll, /prediction, /timeout, /ban...
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            id="chat-message-input"
            name="chatMessage"
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected && authToken ? "Mensaje o /comando..." : "Conecta con OAuth para chatear"}
            aria-label={isConnected && authToken ? "Escribe un mensaje o comando" : "Conecta con OAuth para chatear"}
            disabled={!isConnected || !authToken || sendingMessage}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !authToken || !chatMessage.trim() || sendingMessage}
            className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-twitch-brand"
            title={isConnected && authToken ? "Enviar mensaje o ejecutar comando" : "Requiere autenticación OAuth de Twitch"}
          >
            {sendingMessage ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        {sendError && (
          <p className="text-[10px] text-red-400 mt-1 text-center">
            ⚠️ {sendError}
          </p>
        )}
        {!authToken && isConnected && (
          <p className="text-[10px] text-amber-400 mt-1 text-center">
            🔒 Enviar mensajes requiere autenticación OAuth (scope: chat:edit)
          </p>
        )}
      </div>

      {/* Menú de moderación */}
      {selectedUser && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          style={{
            left: Math.min(selectedUser.position.x, window.innerWidth - 220),
            top: Math.min(selectedUser.position.y, window.innerHeight - 350),
            minWidth: '200px'
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-zinc-700 flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: (selectedUser.color || '#a970ff') + '30' }}
            >
              <User className="w-4 h-4" style={{ color: selectedUser.color || '#a970ff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{selectedUser.username}</p>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setModerationResult(null); }}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Resultado */}
          {moderationResult && (
            <div className={`px-3 py-2 text-xs ${moderationResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {moderationResult.message}
            </div>
          )}

          {/* Acciones */}
          <div className="p-2 space-y-1">
            {/* Timeouts */}
            <p className="text-[10px] text-zinc-500 px-2 pt-1">Timeout</p>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '1m', seconds: 60 },
                { label: '5m', seconds: 300 },
                { label: '10m', seconds: 600 },
                { label: '1h', seconds: 3600 },
              ].map(({ label, seconds }) => (
                <button
                  key={label}
                  onClick={() => timeoutUser(selectedUser.username, seconds)}
                  disabled={moderationLoading}
                  className="py-1.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-[10px] font-bold disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Ban/Unban */}
            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                onClick={() => banUser(selectedUser.username)}
                disabled={moderationLoading}
                className="py-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-500 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Ban className="w-3 h-3" /> Ban
              </button>
              <button
                onClick={() => unbanUser(selectedUser.username)}
                disabled={moderationLoading}
                className="py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Heart className="w-3 h-3" /> Unban
              </button>
            </div>

            {/* VIP */}
            <button
              onClick={() => addVIP(selectedUser.username)}
              disabled={moderationLoading}
              className="w-full py-1.5 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Crown className="w-3 h-3" /> Dar VIP
            </button>

            {/* Links */}
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-zinc-700 mt-2">
              <a
                href={`https://twitch.tv/${selectedUser.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Canal
              </a>
              <a
                href={`https://www.twitch.tv/popout/${mainChannel}/viewercard/${selectedUser.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1"
              >
                <User className="w-3 h-3" /> Card
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
