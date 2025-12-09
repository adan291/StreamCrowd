
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
import { Overlays } from './components/Overlays';
import { twitchService } from './services/twitchService';
import { ConnectionStatus, Poll, VoteRecord, TwitchMessage, MediaAsset } from './types';
import { CHART_COLORS } from './constants';
import { MessageSquare, Activity, Tv, Image as ImageIcon, Vote as VoteIcon, LayoutDashboard, Moon, Sun, History, Power, Layers } from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<TwitchMessage[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Right sidebar tabs (Chat, Stream)
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'stream'>('chat');
  
  // Left column tabs (Control Panel, Gallery, Activity, Overlays)
  const [leftTab, setLeftTab] = useState<'panel' | 'gallery' | 'activity' | 'overlays'>('panel');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  
  // State for tracked votes to update UI efficiently
  const [votedUserIds, setVotedUserIds] = useState<Set<string>>(new Set());
  
  // Refs for callbacks
  const pollRef = useRef<Poll | null>(null);
  const votedUserIdsRef = useRef<Set<string>>(new Set());

  // Memoize the map of UserID -> OptionID
  const userVoteMap = useMemo(() => {
    const map = new Map<string, number>();
    voteHistory.forEach(v => map.set(v.userId, v.optionId));
    return map;
  }, [voteHistory]);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    pollRef.current = currentPoll;
  }, [currentPoll]);

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

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAddAsset = (asset: MediaAsset) => {
      const updated = [asset, ...mediaLibrary];
      setMediaLibrary(updated);
      localStorage.setItem('twitch_vote_assets', JSON.stringify(updated));
  };

  const handleDeleteAsset = (id: string) => {
      const updated = mediaLibrary.filter(a => a.id !== id);
      setMediaLibrary(updated);
      localStorage.setItem('twitch_vote_assets', JSON.stringify(updated));
  };

  useEffect(() => {
    if (!channelName) return;

    // Connect when channelName changes
    twitchService.connect(channelName, authToken);

    // Setup Twitch Service Listeners
    twitchService.onStatusChange((newStatus, errorMsg) => {
        setStatus(newStatus);
        
        if (newStatus === ConnectionStatus.ERROR) {
            const msg = errorMsg || 'Error de conexión con Twitch.';
            setConnectionError(msg);
            addNotification('error', msg);
        } else {
            setConnectionError(null);
        }

        if (newStatus === ConnectionStatus.CONNECTED) {
            addNotification('success', `Conectado al chat de ${channelName}`);
        } else if (newStatus === ConnectionStatus.DISCONNECTED && status === ConnectionStatus.CONNECTED) {
            addNotification('info', 'Desconectado del chat.');
        }
    });

    twitchService.onMessage((tags, message, self) => {
      // 0. Store in Chat History (Keep last 100 messages)
      const chatMsg: TwitchMessage = {
          username: tags['display-name'] || tags.username || 'Anonymous',
          message: message,
          color: tags.color,
          id: tags.id,
          userId: tags['user-id']
      };
      
      setChatMessages(prev => {
        // Enforce 100 message limit
        const updated = [...prev, chatMsg];
        if (updated.length > 100) {
            return updated.slice(updated.length - 100);
        }
        return updated;
      });

      // 1. Handle Streamer/Mod Commands
      const sender = tags.username?.toLowerCase() || '';
      const targetChannel = channelName.toLowerCase().replace('#', '');
      const isBroadcaster = sender === targetChannel;
      
      const lowerMsg = message.trim().toLowerCase();

      // Viewers can ask for poll info
      if (lowerMsg === '!poll') {
        if (pollRef.current && pollRef.current.isActive) {
           const optionsText = pollRef.current.options
             .map(o => `+${o.id} (${o.label})`)
             .join(' | ');
           twitchService.sendMessage(`📊 ${pollRef.current.question} 👉 Opciones: ${optionsText}`);
        }
        return;
      }

      // Streamer Controls
      if (isBroadcaster) {
        if (lowerMsg === '!stop' || lowerMsg === '!end') {
          stopPoll();
          return;
        }
        if (lowerMsg === '!reset') {
          resetPoll();
          return;
        }
      }

      // 2. Handle Voting
      if (self || !pollRef.current || !pollRef.current.isActive) return;

      const match = message.trim().match(/^\+(\d+)$/);

      if (match) {
        const optionId = parseInt(match[1], 10);
        const username = tags.username || 'Anonymous';
        const userId = tags['user-id'] || username; 

        const optionExists = pollRef.current.options.some(opt => opt.id === optionId);
        const hasVoted = votedUserIdsRef.current.has(userId);

        if (optionExists && !hasVoted) {
          handleVote(userId, username, optionId);
        }
      }
    });

    return () => {
      twitchService.disconnect();
    };
  }, [channelName, authToken]); // Re-run if channel or token changes

  const handleVote = (userId: string, username: string, optionId: number) => {
    // Check Max Votes Limit
    if (pollRef.current && pollRef.current.maxVotes) {
      if (pollRef.current.totalVotes >= pollRef.current.maxVotes) {
         return;
      }
    }

    // Update Refs and State
    votedUserIdsRef.current.add(userId);
    setVotedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
    });

    setCurrentPoll(prev => {
      if (!prev) return null;
      
      const newTotal = prev.totalVotes + 1;
      const newState = {
        ...prev,
        totalVotes: newTotal,
        options: prev.options.map(opt => 
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        )
      };

      return newState;
    });

    // Handle Max Votes Stop Logic AFTER state update logic
    if (pollRef.current?.maxVotes) {
       const newTotal = pollRef.current.totalVotes + 1;
       if (newTotal >= pollRef.current.maxVotes) {
          stopPoll(true); 
       }
    }

    setVoteHistory(prev => {
      const newRecord: VoteRecord = { userId, username, optionId, timestamp: Date.now() };
      // Keep last 50 votes
      return [...prev.slice(-49), newRecord];
    });
  };

  const connectTwitch = (channel: string, token?: string) => {
    setAuthToken(token || '');
    setChannelName(channel);
  };

  const disconnectTwitch = () => {
    setChannelName('');
    setAuthToken('');
    setChatMessages([]);
    setStatus(ConnectionStatus.DISCONNECTED);
  };

  const createPoll = (title: string, question: string, optionsData: { label: string; color: string; icon?: string; image?: string }[], maxVotes?: number) => {
    
    const newPoll: Poll = {
      id: Date.now().toString(),
      title,
      question,
      options: optionsData.map((opt, index) => ({
        id: index + 1,
        label: opt.label,
        votes: 0,
        color: opt.color || CHART_COLORS[index % CHART_COLORS.length],
        icon: opt.icon,
        image: opt.image
      })),
      isActive: true,
      totalVotes: 0,
      startTime: Date.now(),
      maxVotes
    };
    
    votedUserIdsRef.current.clear();
    setVotedUserIds(new Set());
    setVoteHistory([]);
    setCurrentPoll(newPoll);
    setLeftTab('panel'); // Switch to panel view automatically

    // Announce poll if connected
    const optionsText = newPoll.options.map(o => `+${o.id} (${o.label})`).join(' | ');
    const maxText = maxVotes ? ` (Meta: ${maxVotes} votos)` : '';
    twitchService.sendMessage(`🔴 ${title}: ${question}${maxText} 👉 Escribe: ${optionsText}`);
    
    addNotification('success', '¡Encuesta iniciada correctamente!');
  };

  const stopPoll = (auto = false) => {
    setCurrentPoll(prev => {
      if (!prev || !prev.isActive) return prev;
      const reason = auto ? "¡Meta de votos alcanzada! 🎯" : "La encuesta ha finalizado.";
      twitchService.sendMessage(`🛑 ${reason} ¡Gracias por votar!`);
      if (auto) addNotification('info', 'La encuesta se detuvo automáticamente (Meta alcanzada).');
      else addNotification('info', 'Encuesta detenida manualmente.');
      return { ...prev, isActive: false };
    });
  };

  const resetPoll = () => {
    if (currentPoll) {
      setPastPolls(prev => [currentPoll, ...prev]);
    }
    setCurrentPoll(null);
    votedUserIdsRef.current.clear();
    setVotedUserIds(new Set());
    setVoteHistory([]);
    addNotification('info', 'Panel reiniciado.');
  };

  const optionsMap = currentPoll ? currentPoll.options.reduce((acc, opt) => ({
    ...acc, [opt.id]: { color: opt.color, label: opt.label, icon: opt.icon, image: opt.image }
  }), {}) : {};

  return (
    <div className="min-h-screen p-4 md:p-6 relative bg-zinc-100 dark:bg-[#0f0f11] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      {showHistory && (
        <PollHistory history={pastPolls} onClose={() => setShowHistory(false)} />
      )}
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-twitch-brand rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-twitch-brand/30 animate-pulse">
              TV
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-twitch-brand to-zinc-500 dark:from-white dark:to-zinc-400 tracking-tight">
              TwitchVote Live
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
             {/* Connected Status Badge (Compact) */}
             {status === ConnectionStatus.CONNECTED && (
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 rounded-full pl-1.5 pr-3 py-1.5 shadow-sm animate-fade-in mr-2">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-600">
                             {/* Streamer Avatar Placeholder (Initial) */}
                             <span className="font-bold text-twitch-brand dark:text-twitch-light uppercase text-sm">{channelName.charAt(0)}</span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-800 rounded-full"></div>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Conectado a</span>
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 max-w-[100px] truncate">{channelName}</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
                    <button 
                        onClick={disconnectTwitch} 
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                        title="Desconectar"
                    >
                        <Power size={14} />
                    </button>
                </div>
             )}

             {status === ConnectionStatus.CONNECTED && (
               <button 
                  onClick={() => setShowHistory(true)} 
                  className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-400"
               >
                  <History size={18} /> <span className="hidden sm:inline">Historial</span>
               </button>
             )}
             
             <button 
                onClick={toggleTheme} 
                className="p-2.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-95"
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
             >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </header>

        {/* Connection Overlay (Disconnected) */}
        {status !== ConnectionStatus.CONNECTED && (
          <ConnectionPanel 
            status={status} 
            onConnect={connectTwitch} 
            onDisconnect={disconnectTwitch} 
            channelName={channelName}
            errorMessage={connectionError}
          />
        )}

        {/* Main Dashboard */}
        {status === ConnectionStatus.CONNECTED && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fade-in-up">
              
              {/* Left Column (Main Panel: Creator/LivePoll, Gallery, Activity) */}
              <div className="lg:col-span-8 flex flex-col h-auto lg:h-[650px] gap-6 lg:gap-0">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl h-[600px] lg:h-full flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                      {/* Tabs Header */}
                      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 shrink-0 overflow-x-auto">
                          <button 
                             onClick={() => setLeftTab('panel')}
                             className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${leftTab === 'panel' ? 'text-twitch-brand dark:text-twitch-light bg-white dark:bg-zinc-900' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                          >
                             {currentPoll ? <LayoutDashboard size={18} /> : <VoteIcon size={18} />} 
                             <span className="truncate">{currentPoll ? 'Panel' : 'Votación'}</span>
                             {leftTab === 'panel' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-twitch-brand dark:bg-twitch-light"></div>}
                          </button>
                          <button 
                             onClick={() => setLeftTab('gallery')}
                             className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${leftTab === 'gallery' ? 'text-twitch-brand dark:text-twitch-light bg-white dark:bg-zinc-900' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                          >
                             <ImageIcon size={18} /> <span className="truncate">Galería</span>
                             {leftTab === 'gallery' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-twitch-brand dark:bg-twitch-light"></div>}
                          </button>
                          <button 
                             onClick={() => setLeftTab('activity')}
                             className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${leftTab === 'activity' ? 'text-twitch-brand dark:text-twitch-light bg-white dark:bg-zinc-900' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                          >
                             <Activity size={18} /> <span className="truncate">Actividad</span>
                             {leftTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-twitch-brand dark:bg-twitch-light"></div>}
                          </button>
                          <button 
                             onClick={() => setLeftTab('overlays')}
                             className={`flex-1 min-w-[100px] py-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${leftTab === 'overlays' ? 'text-twitch-brand dark:text-twitch-light bg-white dark:bg-zinc-900' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                          >
                             <Layers size={18} /> <span className="truncate">Overlays</span>
                             {leftTab === 'overlays' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-twitch-brand dark:bg-twitch-light"></div>}
                          </button>
                      </div>

                      {/* Content Area - Using CSS display instead of conditional rendering to preserve state */}
                      <div className="flex-1 overflow-hidden relative">
                          
                          {/* PANEL (CREATOR + LIVE POLL) */}
                          <div className={`h-full flex flex-col ${leftTab === 'panel' ? '' : 'hidden'}`}>
                               {currentPoll ? (
                                  <LivePoll 
                                    poll={currentPoll} 
                                    voteHistory={voteHistory}
                                    onStop={() => stopPoll()}
                                    onReset={resetPoll}
                                    theme={theme}
                                  />
                               ) : (
                                  <PollCreator 
                                    onCreate={createPoll} 
                                    onNotification={(type, msg) => addNotification(type, msg)}
                                    mediaLibrary={mediaLibrary}
                                    onAddAsset={handleAddAsset}
                                  />
                               )}
                          </div>

                          {/* GALLERY */}
                          <div className={`h-full ${leftTab === 'gallery' ? '' : 'hidden'}`}>
                               <AssetLibrary 
                                  assets={mediaLibrary} 
                                  onAdd={handleAddAsset} 
                                  onDelete={handleDeleteAsset}
                                  onNotification={(type, msg) => addNotification(type, msg)}
                               />
                          </div>
                          
                          {/* ACTIVITY */}
                          <div className={`h-full ${leftTab === 'activity' ? '' : 'hidden'}`}>
                              <RecentVotes votes={voteHistory} options={optionsMap} />
                          </div>

                          {/* OVERLAYS */}
                          <div className={`h-full ${leftTab === 'overlays' ? '' : 'hidden'}`}>
                              <Overlays currentPoll={currentPoll} voteHistory={voteHistory} theme={theme} channelName={channelName} />
                          </div>

                      </div>
                  </div>
              </div>

              {/* Right Column (Sidebar: Connection, Chat, Stream) */}
              <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-4 h-auto lg:h-[650px]">
                
                {/* Right Sidebar Tabs (Chat, Stream) */}
                <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-[400px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                   <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20 shrink-0">
                      <button 
                          onClick={() => setActiveRightTab('chat')}
                          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeRightTab === 'chat' ? 'bg-white dark:bg-zinc-900 text-twitch-brand dark:text-twitch-light border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                      >
                         <MessageSquare size={14} /> Chat
                      </button>
                      <button 
                          onClick={() => setActiveRightTab('stream')}
                          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeRightTab === 'stream' ? 'bg-white dark:bg-zinc-900 text-twitch-brand dark:text-twitch-light border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                      >
                         <Tv size={14} /> Stream
                      </button>
                   </div>

                   <div className="flex-1 relative">
                       {activeRightTab === 'chat' && (
                          <div className="h-full absolute inset-0">
                             <ChatFeed 
                               messages={chatMessages} 
                               userVoteMap={userVoteMap} 
                               options={currentPoll?.options} 
                             />
                          </div>
                       )}

                       {activeRightTab === 'stream' && (
                          <div className="h-full absolute inset-0 bg-black">
                            <StreamPlayer channel={channelName} />
                          </div>
                       )}
                   </div>
                </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
