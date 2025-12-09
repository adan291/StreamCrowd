import React, { useEffect, useState, useRef } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { PollCreator } from './components/PollCreator';
import { LivePoll } from './components/LivePoll';
import { RecentVotes } from './components/RecentVotes';
import { PollHistory } from './components/PollHistory';
import { ChatFeed } from './components/ChatFeed';
import { NotificationContainer, NotificationItem, NotificationType } from './components/Notification';
import { StreamPlayer } from './components/StreamPlayer';
import { twitchService } from './services/twitchService';
import { ConnectionStatus, Poll, VoteRecord, TwitchMessage } from './types';
import { CHART_COLORS } from './constants';
import { History, MessageSquare, Activity, Tv } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<TwitchMessage[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'votes' | 'chat' | 'stream'>('votes');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Lifted from Ref to State to trigger re-renders in ChatFeed
  const [votedUserIds, setVotedUserIds] = useState<Set<string>>(new Set());
  
  // Use a ref to access the current poll state inside the TMI callback
  const pollRef = useRef<Poll | null>(null);
  
  // Keep ref for logic that needs instant access without dependencies
  const votedUserIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pollRef.current = currentPoll;
  }, [currentPoll]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!channelName) return;

    // Connect when channelName changes
    twitchService.connect(channelName, authToken);

    // Setup Twitch Service Listeners
    twitchService.onStatusChange((newStatus) => {
        setStatus(newStatus);
        if (newStatus === ConnectionStatus.ERROR) {
            addNotification('error', 'Error de conexión con Twitch. Verifica el canal o tu internet.');
        } else if (newStatus === ConnectionStatus.CONNECTED) {
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
      setChatMessages(prev => [...prev.slice(-99), chatMsg]);

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
        } else if (!optionExists) {
           // Optional: Debug log or silent ignore for invalid option
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
    // Just update state, useEffect will handle connection
    setAuthToken(token || '');
    setChannelName(channel);
  };

  const disconnectTwitch = () => {
    setChannelName('');
    setAuthToken('');
    setChatMessages([]);
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
    setActiveTab('votes'); // Switch to votes tab on new poll

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
    // Save to history before clearing
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
    <div className="min-h-screen p-4 md:p-8 relative">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      {showHistory && (
        <PollHistory history={pastPolls} onClose={() => setShowHistory(false)} />
      )}
      
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-twitch-brand rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-twitch-brand/30 animate-pulse">
              TV
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              TwitchVote Live
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {status === ConnectionStatus.CONNECTED && (
               <>
                 <Button variant="ghost" onClick={() => setShowHistory(true)} className="hidden md:flex">
                    <History size={18} /> Historial
                 </Button>
                 <div className="text-right">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Estado</span>
                    <div className="text-green-400 text-sm font-medium flex items-center justify-end gap-2">
                       Online <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                 </div>
               </>
             )}
          </div>
        </header>

        {/* Connection Overlay */}
        {status !== ConnectionStatus.CONNECTED && (
          <ConnectionPanel 
            status={status} 
            onConnect={connectTwitch} 
            onDisconnect={disconnectTwitch} 
          />
        )}

        {/* Main Dashboard */}
        {status === ConnectionStatus.CONNECTED && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (Poll) */}
            <div className="lg:col-span-8 h-[650px] transition-all duration-300">
              {currentPoll ? (
                <LivePoll 
                  poll={currentPoll} 
                  voteHistory={voteHistory}
                  onStop={() => stopPoll()}
                  onReset={resetPoll}
                />
              ) : (
                <PollCreator 
                  onCreate={createPoll} 
                  onNotification={(type, msg) => addNotification(type, msg)}
                />
              )}
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:col-span-4 flex flex-col gap-4 h-[650px]">
              
              {/* Mobile History Button */}
              <div className="md:hidden">
                 <Button variant="secondary" fullWidth onClick={() => setShowHistory(true)}>
                    <History size={18} /> Ver Historial
                 </Button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md shrink-0">
                <h3 className="font-bold text-white mb-2">Comandos de Chat</h3>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                     <span>Votar:</span>
                     <span className="text-white font-mono">+1, +2...</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                     <span>Info (Todos):</span>
                     <span className="text-white font-mono">!poll</span>
                  </div>
                  <div className="flex justify-between">
                     <span>Streamer:</span>
                     <span className="text-twitch-light font-mono">!stop, !reset</span>
                  </div>
                </div>
              </div>

              <ConnectionPanel 
                status={status} 
                onConnect={connectTwitch} 
                onDisconnect={disconnectTwitch} 
              />

              {/* Tabs and Content (Chat, Votes, Stream) */}
              <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex gap-2 mb-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 shrink-0">
                    <button 
                        onClick={() => setActiveTab('votes')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'votes' ? 'bg-twitch-brand text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                       <Activity size={14} /> Votos
                    </button>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-twitch-brand text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                       <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                        onClick={() => setActiveTab('stream')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'stream' ? 'bg-twitch-brand text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                       <Tv size={14} /> Stream
                    </button>
                 </div>

                 <div className="flex-1 min-h-0">
                     {activeTab === 'votes' && (
                        currentPoll ? (
                           <div className="h-full">
                               <RecentVotes votes={voteHistory} options={optionsMap} />
                           </div>
                        ) : (
                           <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-8 text-center text-zinc-500 text-sm h-full flex items-center justify-center">
                              <p>Inicia una votación para ver la actividad.</p>
                           </div>
                        )
                     )}
                     
                     {activeTab === 'chat' && (
                        <div className="h-full">
                           <ChatFeed 
                             messages={chatMessages} 
                             votedUserIds={votedUserIds} 
                             options={currentPoll?.options} 
                           />
                        </div>
                     )}

                     {activeTab === 'stream' && (
                        <div className="h-full">
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