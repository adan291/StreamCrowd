import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Trophy, Users } from 'lucide-react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { pollSync } from '../src/infrastructure/sync/FirebaseSync';
import { useOverlayMode, OVERLAY_BG_COLORS } from '../hooks/useOverlayMode';

interface PollOption {
  id: number;
  label: string;
  votes: number;
  color: string;
}

interface PollState {
  question: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
  winner: PollOption | null;
}

interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
}

const POLL_CHANNEL = 'poll_overlay_sync';

// Get background color from URL param: ?bg=green, ?bg=transparent, ?bg=%23FF00FF
const getBgFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const bg = params.get('bg');
  if (!bg) return 'transparent';
  
  // Named colors
  const namedColors: Record<string, string> = {
    'green': '#00FF00',
    'magenta': '#FF00FF',
    'blue': '#0000FF',
    'black': '#000000',
    'transparent': 'transparent',
    'none': 'transparent',
  };
  
  if (namedColors[bg.toLowerCase()]) return namedColors[bg.toLowerCase()];
  if (bg.startsWith('#')) return bg;
  return 'transparent';
};

// Compare two poll states to avoid unnecessary re-renders
const arePollStatesEqual = (a: PollState, b: PollState): boolean => {
  if (a.question !== b.question) return false;
  if (a.totalVotes !== b.totalVotes) return false;
  if (a.isActive !== b.isActive) return false;
  if (a.options.length !== b.options.length) return false;
  for (let i = 0; i < a.options.length; i++) {
    if (a.options[i].votes !== b.options[i].votes) return false;
    if (a.options[i].label !== b.options[i].label) return false;
  }
  return true;
};

export const PollOverlay: React.FC = () => {
  const { bgColor: defaultBg, setBgColor: setDefaultBg } = useOverlayMode(true);
  const [bgColor, setBgColor] = useState(getBgFromUrl() || defaultBg);
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<PollState>({
    question: '',
    options: [],
    totalVotes: 0,
    isActive: false,
    winner: null,
  });
  
  // Ref to track last state and avoid unnecessary updates
  const lastStateRef = useRef<PollState>(state);

  // Helper to update state from poll data - with deduplication
  const updateStateFromPoll = useCallback((poll: Poll | null) => {
    const newState: PollState = poll ? {
      question: poll.question,
      options: poll.options,
      totalVotes: poll.totalVotes,
      isActive: poll.isActive,
      winner: !poll.isActive && poll.totalVotes > 0
        ? poll.options.reduce((prev, curr) => prev.votes > curr.votes ? prev : curr)
        : null,
    } : {
      question: '',
      options: [],
      totalVotes: 0,
      isActive: false,
      winner: null,
    };
    
    // Only update if state actually changed
    if (!arePollStatesEqual(lastStateRef.current, newState)) {
      lastStateRef.current = newState;
      setState(newState);
    }
  }, []);

  useEffect(() => {
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribe = pollSync.subscribe((data) => {
      if (data) {
        const poll: Poll = {
          question: data.question,
          options: data.options.map((opt, i) => ({
            id: i,
            label: opt.text,
            votes: opt.votes,
            color: opt.color
          })),
          totalVotes: data.totalVotes,
          isActive: data.isActive
        };
        updateStateFromPoll(poll);
      } else {
        updateStateFromPoll(null);
      }
    });

    // Also try BroadcastChannel for same-browser tabs (faster)
    const channel = new BroadcastChannel(POLL_CHANNEL);
    channel.onmessage = (e) => {
      if (e.data.type === 'poll_state') {
        // Only update if different from current state
        if (!arePollStatesEqual(lastStateRef.current, e.data.state)) {
          lastStateRef.current = e.data.state;
          setState(e.data.state);
        }
      }
    };
    channel.postMessage({ type: 'request_state' });

    // Fallback: load from localStorage once on mount (not polling)
    try {
      const storedPoll = localStorage.getItem(STORAGE_KEYS.POLL_SYNC);
      if (storedPoll) {
        const poll = JSON.parse(storedPoll) as Poll;
        updateStateFromPoll(poll);
      }
    } catch { /* ignore */ }

    return () => {
      unsubscribe();
      channel.close();
    };
  }, [updateStateFromPoll]);

  const { question, options, totalVotes, isActive, winner } = state;

  // No poll active - show waiting
  if (!question || options.length === 0) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
      >
        <SettingsButton 
          bgColor={bgColor} 
          setBgColor={setBgColor} 
          showSettings={showSettings} 
          setShowSettings={setShowSettings} 
        />
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-6">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-white text-xl font-bold">Esperando encuesta...</p>
          <p className="text-zinc-400 text-sm mt-2">Crea una encuesta en el panel principal</p>
        </div>
      </div>
    );
  }

  // Show winner
  if (winner && !isActive) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center p-8"
        style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
      >
        <SettingsButton 
          bgColor={bgColor} 
          setBgColor={setBgColor} 
          showSettings={showSettings} 
          setShowSettings={setShowSettings} 
        />
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <p className="text-yellow-400 text-2xl font-bold mb-2">¡GANADOR!</p>
          <div 
            className="text-5xl font-black mb-4 px-8 py-4 rounded-2xl"
            style={{ 
              backgroundColor: winner.color + '40',
              color: winner.color,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {winner.label}
          </div>
          <div className="flex items-center justify-center gap-2 text-white text-xl">
            <Trophy className="text-yellow-400" size={24} />
            <span className="font-bold">{winner.votes}</span>
            <span className="text-zinc-400">votos</span>
            <span className="text-zinc-500 mx-2">|</span>
            <span className="text-zinc-400">{totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Active poll
  return (
    <div 
      className="w-screen h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
    >
      <SettingsButton 
        bgColor={bgColor} 
        setBgColor={setBgColor} 
        showSettings={showSettings} 
        setShowSettings={setShowSettings} 
      />
      
      {/* Question */}
      <div className="bg-black/70 backdrop-blur rounded-2xl px-8 py-4 mb-6 max-w-2xl">
        <h1 className="text-white text-3xl font-bold text-center">{question}</h1>
      </div>

      {/* Options */}
      <div className="w-full max-w-2xl space-y-3">
        {options
          .slice()
          .sort((a, b) => b.votes - a.votes)
          .map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const isLeading = index === 0 && totalVotes > 0;
            
            return (
              <div 
                key={option.id}
                className={`relative overflow-hidden rounded-xl ${isLeading ? 'ring-2 ring-yellow-400' : ''}`}
              >
                {/* Background bar */}
                <div 
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: option.color + '60',
                  }}
                />
                
                {/* Content */}
                <div className="relative flex items-center justify-between px-6 py-4 bg-black/50">
                  <div className="flex items-center gap-3">
                    {isLeading && <Trophy className="text-yellow-400" size={20} />}
                    <span 
                      className="text-xl font-bold"
                      style={{ color: option.color }}
                    >
                      {option.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white text-2xl font-black">
                      {Math.round(percentage)}%
                    </span>
                    <span className="text-zinc-400 text-sm">
                      {option.votes} votos
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Total votes */}
      <div className="mt-6 flex items-center gap-2 text-zinc-400 bg-black/50 rounded-full px-4 py-2">
        <Users size={18} />
        <span className="font-bold text-white">{totalVotes}</span>
        <span>votos totales</span>
      </div>
    </div>
  );
};

// Settings button component
const SettingsButton: React.FC<{
  bgColor: string;
  setBgColor: (color: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}> = ({ bgColor, setBgColor, showSettings, setShowSettings }) => (
  <>
    <button
      onClick={() => setShowSettings(!showSettings)}
      className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50"
    >
      <Settings size={18} />
    </button>
    
    {showSettings && (
      <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-48">
        <p className="text-xs text-zinc-400 mb-2 font-bold">Chroma Key (OBS)</p>
        <div className="flex gap-1 flex-wrap">
          {OVERLAY_BG_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setBgColor(color)}
              className={`w-8 h-8 rounded border-2 transition-transform ${
                bgColor === color ? 'border-white scale-110' : 'border-zinc-600'
              } ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`}
              style={{ backgroundColor: color === 'transparent' ? undefined : color }}
            />
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Para OBS usa: ?bg=green
        </p>
      </div>
    )}
  </>
);
