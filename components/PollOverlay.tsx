import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Trophy, Users, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from 'recharts';
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
}

const POLL_CHANNEL = 'poll_overlay_sync';

const getBgFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const bg = params.get('bg');
  if (!bg) return 'transparent';
  
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

// Confetti particle component
const Confetti: React.FC<{ color: string }> = ({ color }) => {
  const style = {
    '--x': `${Math.random() * 100}vw`,
    '--delay': `${Math.random() * 3}s`,
    '--duration': `${2 + Math.random() * 2}s`,
    '--rotation': `${Math.random() * 360}deg`,
  } as React.CSSProperties;
  
  return (
    <div 
      className="confetti-particle"
      style={{ ...style, backgroundColor: color }}
    />
  );
};

export const PollOverlay: React.FC = () => {
  const { bgColor: defaultBg } = useOverlayMode(true);
  const [bgColor, setBgColor] = useState(getBgFromUrl() || defaultBg);
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<PollState>({
    question: '',
    options: [],
    totalVotes: 0,
    isActive: false,
  });
  const [showWinner, setShowWinner] = useState(false);
  const [winnerData, setWinnerData] = useState<{ winner: PollOption; options: PollOption[]; totalVotes: number; question: string } | null>(null);
  
  // Keep track of last active state with votes
  const lastActiveStateRef = useRef<PollState | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = pollSync.subscribe((data) => {
      if (data) {
        const newState: PollState = {
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
        
        // Save state while poll is active (to preserve votes for winner calculation)
        if (data.isActive && data.totalVotes > 0) {
          lastActiveStateRef.current = newState;
        }
        
        // Detect poll end: was active, now inactive
        if (wasActiveRef.current && !data.isActive) {
          // Use the last active state with votes to determine winner
          const stateForWinner = lastActiveStateRef.current || newState;
          if (stateForWinner.totalVotes > 0 && stateForWinner.options.length > 0) {
            const winner = stateForWinner.options.reduce((prev, curr) => 
              prev.votes > curr.votes ? prev : curr
            );
            setWinnerData({
              winner,
              options: stateForWinner.options,
              totalVotes: stateForWinner.totalVotes,
              question: stateForWinner.question
            });
            setShowWinner(true);
          }
        }
        
        wasActiveRef.current = data.isActive;
        setState(newState);
      } else {
        // Poll cleared - reset everything
        setState({ question: '', options: [], totalVotes: 0, isActive: false });
        setShowWinner(false);
        setWinnerData(null);
        lastActiveStateRef.current = null;
        wasActiveRef.current = false;
      }
    });

    const channel = new BroadcastChannel(POLL_CHANNEL);
    channel.onmessage = (e) => {
      if (e.data.type === 'poll_state') {
        setState(e.data.state);
      }
    };
    channel.postMessage({ type: 'request_state' });

    try {
      const storedPoll = localStorage.getItem(STORAGE_KEYS.POLL_SYNC);
      if (storedPoll) {
        const poll = JSON.parse(storedPoll);
        setState({
          question: poll.question,
          options: poll.options,
          totalVotes: poll.totalVotes,
          isActive: poll.isActive
        });
      }
    } catch { /* ignore */ }

    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  const { question, options, totalVotes, isActive } = state;

  // No poll active and no winner to show
  if ((!question || options.length === 0) && !showWinner) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
      >
        <SettingsButton bgColor={bgColor} setBgColor={setBgColor} showSettings={showSettings} setShowSettings={setShowSettings} />
        <div className="text-center bg-black/60 backdrop-blur rounded-xl px-8 py-6">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-white text-xl font-bold">Esperando encuesta...</p>
          <p className="text-zinc-400 text-sm mt-2">Crea una encuesta en el panel principal</p>
        </div>
      </div>
    );
  }

  // Show winner with animation
  if (showWinner && winnerData) {
    const { winner, options: winnerOptions, totalVotes: winnerTotalVotes, question: winnerQuestion } = winnerData;
    const winnerPercentage = winnerTotalVotes > 0 ? Math.round((winner.votes / winnerTotalVotes) * 100) : 0;
    const confettiColors = ['#facc15', '#a855f7', '#22c55e', '#3b82f6', '#ef4444', '#f97316'];
    
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center p-8 overflow-hidden"
        style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
      >
        <SettingsButton bgColor={bgColor} setBgColor={setBgColor} showSettings={showSettings} setShowSettings={setShowSettings} />
        
        {/* Confetti animation */}
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(var(--rotation)); opacity: 0; }
          }
          @keyframes winner-pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px ${winner.color}80); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 40px ${winner.color}); }
          }
          @keyframes trophy-bounce {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            25% { transform: translateY(-20px) rotate(5deg); }
            50% { transform: translateY(0) rotate(-5deg); }
            75% { transform: translateY(-10px) rotate(5deg); }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            50% { opacity: 1; transform: scale(1) rotate(180deg); }
          }
          .confetti-particle {
            position: fixed;
            top: -20px;
            left: var(--x);
            width: 10px;
            height: 10px;
            animation: confetti-fall var(--duration) ease-in-out var(--delay) infinite;
          }
          .winner-card {
            animation: winner-pulse 2s ease-in-out infinite;
          }
          .trophy-icon {
            animation: trophy-bounce 1.5s ease-in-out infinite;
          }
          .sparkle {
            animation: sparkle 1.5s ease-in-out infinite;
          }
        `}</style>
        
        {/* Confetti particles */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <Confetti key={i} color={confettiColors[i % confettiColors.length]} />
          ))}
        </div>
        
        <div className="text-center relative z-10">
          {/* Trophy with animation */}
          <div className="trophy-icon inline-block mb-6">
            <div className="relative">
              <Trophy className="text-yellow-400 w-24 h-24 mx-auto" />
              <Sparkles className="sparkle absolute -top-2 -right-2 text-yellow-300 w-8 h-8" style={{ animationDelay: '0s' }} />
              <Sparkles className="sparkle absolute -bottom-2 -left-2 text-yellow-300 w-6 h-6" style={{ animationDelay: '0.5s' }} />
              <Sparkles className="sparkle absolute top-1/2 -right-4 text-yellow-300 w-5 h-5" style={{ animationDelay: '1s' }} />
            </div>
          </div>
          
          {/* Winner announcement */}
          <p className="text-yellow-400 text-3xl font-black mb-4 tracking-wider">
            🎉 ¡GANADOR! 🎉
          </p>
          
          {/* Question */}
          <p className="text-zinc-400 text-lg mb-4">{winnerQuestion}</p>
          
          {/* Winner card */}
          <div 
            className="winner-card inline-block text-5xl font-black mb-6 px-12 py-6 rounded-3xl border-4"
            style={{ 
              backgroundColor: winner.color + '30',
              borderColor: winner.color,
              color: winner.color,
              textShadow: `0 0 30px ${winner.color}80`
            }}
          >
            {winner.label}
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-white text-2xl bg-black/60 backdrop-blur rounded-2xl px-8 py-4">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black" style={{ color: winner.color }}>{winner.votes}</span>
              <span className="text-zinc-400">votos</span>
            </div>
            <div className="w-px h-8 bg-zinc-600" />
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black text-yellow-400">{winnerPercentage}%</span>
              <span className="text-zinc-400">del total</span>
            </div>
          </div>
          
          {/* All results */}
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            {winnerOptions
              .slice()
              .sort((a, b) => b.votes - a.votes)
              .map((opt, idx) => {
                const pct = winnerTotalVotes > 0 ? Math.round((opt.votes / winnerTotalVotes) * 100) : 0;
                const isWinner = opt.id === winner.id;
                return (
                  <div 
                    key={opt.id}
                    className={`px-4 py-2 rounded-xl border ${isWinner ? 'border-yellow-400 bg-yellow-400/20' : 'border-zinc-700 bg-black/50'}`}
                  >
                    <span className="font-bold mr-2" style={{ color: opt.color }}>+{opt.id + 1}</span>
                    <span className="text-white">{opt.label}</span>
                    <span className="text-zinc-400 ml-2">({opt.votes} - {pct}%)</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data for active poll
  const chartData = options.map((opt) => ({
    name: `+${opt.id + 1}`,
    label: opt.label,
    votes: opt.votes,
    color: opt.color,
    percentage: totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0,
  }));

  const maxVotes = Math.max(...options.map(o => o.votes), 1);

  // Active poll with bar chart
  return (
    <div 
      className="w-screen h-screen flex flex-col p-6"
      style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
    >
      <SettingsButton bgColor={bgColor} setBgColor={setBgColor} showSettings={showSettings} setShowSettings={setShowSettings} />
      
      {/* Header */}
      <div className="bg-black/70 backdrop-blur rounded-2xl px-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/20 px-2 py-0.5 rounded">
              Encuesta Activa
            </span>
            <h1 className="text-white text-2xl font-bold mt-2">{question}</h1>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 bg-black/50 rounded-full px-4 py-2">
            <Users size={18} />
            <span className="font-bold text-white">{totalVotes}</span>
            <span>votos</span>
          </div>
        </div>
      </div>

      {/* Main content: Chart + Ranking */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Bar Chart */}
        <div className="flex-1 bg-black/50 backdrop-blur rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const item = chartData.find(d => d.name === payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={20} textAnchor="middle" fill="#a1a1aa" fontSize={14} fontWeight={600}>
                        {payload.value}
                      </text>
                      <text x={0} y={40} textAnchor="middle" fill="#71717a" fontSize={11}>
                        {item?.label}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis hide domain={[0, maxVotes * 1.1]} />
              <Bar dataKey="votes" radius={[8, 8, 0, 0]} maxBarSize={120}>
                <LabelList 
                  dataKey="percentage" 
                  position="top" 
                  formatter={(val: number) => `${val}%`}
                  fill="#fff"
                  fontSize={16}
                  fontWeight="bold"
                />
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking sidebar */}
        <div className="w-64 space-y-2 overflow-y-auto">
          {options
            .slice()
            .sort((a, b) => b.votes - a.votes)
            .map((option, index) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              const isLeading = index === 0 && totalVotes > 0;
              
              return (
                <div 
                  key={option.id}
                  className={`relative rounded-xl p-3 border transition-all ${
                    isLeading 
                      ? 'border-yellow-400 bg-yellow-400/10' 
                      : 'border-zinc-700 bg-black/50'
                  }`}
                >
                  <div 
                    className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
                    style={{ 
                      background: `linear-gradient(to right, ${option.color} ${percentage}%, transparent ${percentage}%)`
                    }}
                  />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ 
                          backgroundColor: index === 0 ? '#facc15' : index === 1 ? '#94a3b8' : '#cd7f32',
                          color: index === 0 ? '#000' : '#fff'
                        }}
                      >
                        {index + 1}
                      </span>
                      <span 
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: option.color, color: '#000' }}
                      >
                        +{option.id + 1}
                      </span>
                      <span className="text-white text-sm font-medium truncate">
                        {option.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white font-bold text-sm">
                        {Math.round(percentage)}%
                      </span>
                      <span className="text-zinc-500 text-xs">
                        ({option.votes})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
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
