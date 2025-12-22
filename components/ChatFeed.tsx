import React, { useEffect, useRef, useState } from 'react';
import { TwitchMessage, PollOption, CollaborationChannel } from '../types';
import { MessageSquare, CheckCircle2, ArrowDown, Settings, Send, X, Type, Minus, Plus } from 'lucide-react';
import { useI18n } from '../i18n';

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
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, userVoteMap, options, collaborationChannels = [], mainChannel, isConnected = false }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [settings, setSettings] = useState<ChatSettings>(() => {
    const saved = localStorage.getItem('chat_settings');
    return saved ? { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_CHAT_SETTINGS;
  });

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

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    // TODO: Implementar envío real cuando tengamos auth de Twitch
    console.log('Mensaje a enviar:', chatMessage);
    setChatMessage('');
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 opacity-50">
            <MessageSquare size={24} />
            <span className="text-xs italic">{t.chat.waitingMessages}</span>
          </div>
        )}
        {messages.map((msg, i) => {
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
                
                <span 
                  className="font-bold whitespace-nowrap" 
                  style={{ color: msg.color || '#a970ff' }}
                >
                  {msg.username}:
                </span>

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
        <div className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Escribe un mensaje..." : "Conecta para chatear"}
            disabled={!isConnected}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !chatMessage.trim()}
            className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-twitch-brand"
            title={isConnected ? "Enviar mensaje" : "Requiere autenticación de Twitch"}
          >
            <Send size={16} />
          </button>
        </div>
        {!isConnected && (
          <p className="text-[10px] text-zinc-400 mt-1 text-center">
            🔒 Enviar mensajes requiere autenticación de Twitch (próximamente)
          </p>
        )}
      </div>
    </div>
  );
};
