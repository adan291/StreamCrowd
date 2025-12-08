import React, { useEffect, useState, useRef } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { PollCreator } from './components/PollCreator';
import { LivePoll } from './components/LivePoll';
import { RecentVotes } from './components/RecentVotes';
import { PollHistory } from './components/PollHistory';
import { twitchService } from './services/twitchService';
import { ConnectionStatus, Poll, VoteRecord } from './types';
import { CHART_COLORS } from './constants';
import { History } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const [pastPolls, setPastPolls] = useState<Poll[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Use a ref for voted users to avoid closure staleness
  const votedUsersRef = useRef<Set<string>>(new Set());
  // Use a ref to access the current poll state inside the TMI callback
  const pollRef = useRef<Poll | null>(null);

  useEffect(() => {
    pollRef.current = currentPoll;
  }, [currentPoll]);

  useEffect(() => {
    // Setup Twitch Service Listeners
    twitchService.onStatusChange(setStatus);

    twitchService.onMessage((tags, message, self) => {
      // 1. Handle Streamer/Mod Commands
      const isBroadcaster = tags.username?.toLowerCase() === channelName.toLowerCase();
      // Simple command parser
      const lowerMsg = message.trim().toLowerCase();

      // Viewers can ask for poll info
      if (lowerMsg === '!poll') {
        if (pollRef.current && pollRef.current.isActive) {
           const optionsText = pollRef.current.options
             .map(o => `+${o.id} (${o.label})`)
             .join(' | ');
           twitchService.sendMessage(`📊 ${pollRef.current.question} 👉 Opciones: ${optionsText}`);
        } else {
           // Optional: Reply even if inactive, or stay silent to reduce spam
           // twitchService.sendMessage(`😴 No hay ninguna encuesta activa.`);
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
        const hasVoted = votedUsersRef.current.has(userId);

        if (optionExists && !hasVoted) {
          handleVote(userId, username, optionId);
        }
      }
    });

    return () => {
      twitchService.disconnect();
    };
  }, [channelName]);

  const handleVote = (userId: string, username: string, optionId: number) => {
    // Check Max Votes Limit
    if (pollRef.current && pollRef.current.maxVotes) {
      if (pollRef.current.totalVotes >= pollRef.current.maxVotes) {
         // Should have been stopped, but just in case
         return;
      }
    }

    votedUsersRef.current.add(userId);

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
          stopPoll(true); // true = auto stopped
       }
    }

    setVoteHistory(prev => {
      const newRecord: VoteRecord = { userId, username, optionId, timestamp: Date.now() };
      // Keep last 50 votes
      return [...prev.slice(-49), newRecord];
    });
  };

  const connectTwitch = (channel: string, token?: string) => {
    setChannelName(channel);
    twitchService.connect(channel, token);
  };

  const disconnectTwitch = () => {
    twitchService.disconnect();
    setChannelName('');
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
    
    votedUsersRef.current.clear();
    setVoteHistory([]);
    setCurrentPoll(newPoll);

    // Announce poll if connected
    const optionsText = newPoll.options.map(o => `+${o.id} (${o.label})`).join(' | ');
    const maxText = maxVotes ? ` (Meta: ${maxVotes} votos)` : '';
    twitchService.sendMessage(`🔴 ${title}: ${question}${maxText} 👉 Escribe: ${optionsText}`);
  };

  const stopPoll = (auto = false) => {
    setCurrentPoll(prev => {
      if (!prev || !prev.isActive) return prev;
      const reason = auto ? "¡Meta de votos alcanzada! 🎯" : "La encuesta ha finalizado.";
      twitchService.sendMessage(`🛑 ${reason} ¡Gracias por votar!`);
      return { ...prev, isActive: false };
    });
  };

  const resetPoll = () => {
    // Save to history before clearing
    if (currentPoll) {
      setPastPolls(prev => [currentPoll, ...prev]);
    }

    setCurrentPoll(null);
    votedUsersRef.current.clear();
    setVoteHistory([]);
  };

  const optionsMap = currentPoll ? currentPoll.options.reduce((acc, opt) => ({
    ...acc, [opt.id]: { color: opt.color, label: opt.label, icon: opt.icon, image: opt.image }
  }), {}) : {};

  return (
    <div className="min-h-screen p-4 md:p-8">
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
            
            {/* Left Column */}
            <div className="lg:col-span-8 h-[650px] transition-all duration-300">
              {currentPoll ? (
                <LivePoll 
                  poll={currentPoll} 
                  voteHistory={voteHistory}
                  onStop={() => stopPoll()}
                  onReset={resetPoll}
                />
              ) : (
                <PollCreator onCreate={createPoll} />
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Mobile History Button */}
              <div className="md:hidden">
                 <Button variant="secondary" fullWidth onClick={() => setShowHistory(true)}>
                    <History size={18} /> Ver Historial
                 </Button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md">
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

              {currentPoll && (
                <RecentVotes votes={voteHistory} options={optionsMap} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;