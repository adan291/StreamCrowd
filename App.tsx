
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
  const [channelAvatar, setChannelAvatar] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Right sidebar tabs (Chat, Stream)
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'stream'>('chat');
  
  // Left column tabs (Control Panel, Gallery, Activity, Overlays)
  const [leftTab, setLeftTab] = useState<'panel' | 'gallery' | 'activity' | 'overlays'>('panel');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  
  // Overlay Mode Logic
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  
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

  // Check for Overlay Mode on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('overlay') === 'true') {
        setIsOverlayMode(true);
        setTheme('dark'); 
    }
  }, []);

  // Sync State across Tabs using LocalStorage
  useEffect(() => {
    if (isOverlayMode) {
        // Overlay Mode: Listen for changes
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
        const storedPoll = localStorage.getItem('twitch_vote_sync_poll');
        if (storedPoll) setCurrentPoll(JSON.parse(storedPoll));
        const storedHistory = localStorage.getItem('twitch_vote_sync_history');
        if (storedHistory) setVoteHistory(JSON.parse(storedHistory));

        return () => window.removeEventListener('storage', handleStorage);
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
        addNotification('error', 'Espacio lleno. Elimina imágenes antiguas.');
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

  const handleCreatePoll = (title: string, question: string, options: any[], maxVotes?: number, duration?: number, progressBarColor?: string, limitIndicatorColor?: string) => {
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
     
     // Announce in chat
     if (authToken) {
         twitchService.sendMessage(`📊 Nueva Encuesta: ${question}`);
         const opts = newPoll.options.map(o => `+${o.id} ${o.label}`).join(' | ');
         twitchService.sendMessage(`Opciones: ${opts}`);
         twitchService.sendMessage(`Vota escribiendo +1, +2, etc.`);
     }
  };

  const handleStopPoll = (auto = false) => {
      if (!currentPoll) return;
      
      const finishedPoll = { ...currentPoll, isActive: false };
      setCurrentPoll(finishedPoll);
      
      // Add to history
      setPastPolls(prev => [finishedPoll, ...prev]);
      
      if (authToken) {
          const winner = finishedPoll.options.reduce((a, b) => a.votes > b.votes ? a : b);
          twitchService.sendMessage(`🏁 Encuesta Finalizada: ${finishedPoll.question}`);
          twitchService.sendMessage(`🏆 Ganador: ${winner.label} con ${winner.votes} votos!`);
      }
      
      if (auto) addNotification('info', 'Encuesta finalizada por tiempo/límite.');
  };

  const handleResetPoll = () => {
      setCurrentPoll(null);
      setVoteHistory([]);
      setVotedUserIds(new Set());
      votedUserIdsRef.current = new Set();
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

         // Process Vote
         if (pollRef.current && pollRef.current.isActive) {
             const voteMatch = message.trim().match(/^\+(\d+)$/);
             if (voteMatch) {
                 const optionId = parseInt(voteMatch[1]);
                 const userId = tags['user-id'] || tags.username || 'unknown';
                 
                 // Check valid option
                 if (pollRef.current.options.some(o => o.id === optionId)) {
                     // Check if already voted
                     if (!votedUserIdsRef.current.has(userId)) {
                         votedUserIdsRef.current.add(userId);
                         setVotedUserIds(new Set(votedUserIdsRef.current));
                         
                         const newVote: VoteRecord = {
                             userId,
                             username: msg.username,
                             optionId,
                             timestamp: Date.now()
                         };
                         setVoteHistory(prev => [...prev, newVote]);
                         
                         // Update Poll Counts
                         setCurrentPoll(prev => {
                             if (!prev) return null;
                             const newOptions = prev.options.map(o => 
                                 o.id === optionId ? { ...o, votes: o.votes + 1 } : o
                             );
                             const newTotal = prev.totalVotes + 1;
                             
                             return { ...prev, options: newOptions, totalVotes: newTotal };
                         });
                     }
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
             addNotification('success', 'Conectado al chat correctamente.', { channelInitial: channelName.charAt(0) });
         }
     });
  }, []);

  if (isOverlayMode) {
     return (
        <div className="h-screen w-screen overflow-hidden bg-transparent">
             <Overlays 
                currentPoll={currentPoll} 
                voteHistory={voteHistory} 
                theme={theme} 
                channelName={channelName}
             />
        </div>
     );
  }

  if (status !== ConnectionStatus.CONNECTED) {
      return (
          <div className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col p-4 transition-colors duration-300">
             <div className="flex justify-end mb-4">
                 <button onClick={toggleTheme} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                     {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
             </div>
             <ConnectionPanel 
                status={status} 
                onConnect={handleConnect} 
                onDisconnect={handleDisconnect} 
                errorMessage={connectionError}
             />
             <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed bottom-4 right-4 z-50 items-end" />
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Sidebar / Left Navigation */}
      <div className="w-16 md:w-20 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-4 shrink-0 z-20">
         <div className="mb-6">
             {channelAvatar ? (
                 <img src={channelAvatar} alt={channelName} className="w-10 h-10 rounded-full border-2 border-twitch-brand" />
             ) : (
                 <div className="w-10 h-10 rounded-full bg-twitch-brand flex items-center justify-center text-white font-bold text-lg">
                     {channelName.charAt(0).toUpperCase()}
                 </div>
             )}
         </div>

         <div className="flex flex-col gap-4 w-full px-2">
             <NavButton active={leftTab === 'panel'} onClick={() => setLeftTab('panel')} icon={<LayoutDashboard size={20} />} label="Panel" />
             <NavButton active={leftTab === 'gallery'} onClick={() => setLeftTab('gallery')} icon={<ImageIcon size={20} />} label="Galería" />
             <NavButton active={leftTab === 'activity'} onClick={() => setLeftTab('activity')} icon={<Activity size={20} />} label="Actividad" />
             <NavButton active={leftTab === 'overlays'} onClick={() => setLeftTab('overlays')} icon={<Layers size={20} />} label="Overlays" />
         </div>

         <div className="mt-auto flex flex-col gap-4 w-full px-2">
             <NavButton onClick={() => setShowHistory(true)} icon={<History size={20} />} label="Historial" />
             <NavButton onClick={toggleTheme} icon={theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />} label="Tema" />
             <button onClick={handleDisconnect} className="p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center gap-1 group">
                 <Power size={20} />
                 <span className="text-[9px] font-bold group-hover:opacity-100 opacity-0 transition-opacity">Salir</span>
             </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
              {/* Left Column Content */}
              <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-black/50 relative">
                  {leftTab === 'panel' && (
                      currentPoll ? (
                          <LivePoll 
                            poll={currentPoll} 
                            voteHistory={voteHistory} 
                            onStop={handleStopPoll} 
                            onReset={handleResetPoll}
                            onUpdate={(t, q) => setCurrentPoll(prev => prev ? ({...prev, title: t, question: q}) : null)}
                            theme={theme}
                          />
                      ) : (
                          <PollCreator 
                            onCreate={handleCreatePoll} 
                            onNotification={addNotification}
                            mediaLibrary={mediaLibrary}
                            onAddAsset={handleAddAsset}
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
                  {leftTab === 'activity' && (
                      <RecentVotes 
                          votes={voteHistory} 
                          options={currentPoll ? currentPoll.options.reduce((acc, opt) => ({...acc, [opt.id]: opt}), {}) : {}}
                      />
                  )}
                  {leftTab === 'overlays' && (
                      <Overlays 
                        currentPoll={currentPoll} 
                        voteHistory={voteHistory} 
                        theme={theme}
                        channelName={channelName}
                      />
                  )}
              </div>

              {/* Right Sidebar (Chat/Stream) */}
              <div className="w-80 lg:w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 transition-all duration-300 absolute right-0 top-0 bottom-0 z-30 transform translate-x-full md:relative md:translate-x-0">
                  <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                      <button 
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeRightTab === 'chat' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                        onClick={() => setActiveRightTab('chat')}
                      >
                          <MessageSquare size={16} /> Chat
                      </button>
                      <button 
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeRightTab === 'stream' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                        onClick={() => setActiveRightTab('stream')}
                      >
                          <Tv size={16} /> Stream
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

      {showHistory && (
          <PollHistory history={pastPolls} onClose={() => setShowHistory(false)} />
      )}

      <NotificationContainer notifications={notifications} onRemove={removeNotification} className="fixed bottom-4 right-4 z-50 items-end" />
    </div>
  );
};

const NavButton: React.FC<{ active?: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick} 
        className={`w-full p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${active ? 'bg-twitch-brand text-white shadow-lg shadow-twitch-brand/30' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'}`}
    >
        {icon}
        <span className="text-[9px] font-bold">{label}</span>
    </button>
);

export default App;
