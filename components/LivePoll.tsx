
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Poll, VoteRecord, PollOption } from '../types';
import { Button } from './Button';
import { StopCircle, RefreshCcw, Users, Target, CheckCircle2, Download, AlertTriangle, Trophy, Share2, Copy, Eye } from 'lucide-react';

interface LivePollProps {
  poll: Poll;
  voteHistory: VoteRecord[];
  onStop: () => void;
  onReset: () => void;
  theme?: 'light' | 'dark';
  variant?: 'default' | 'preview' | 'overlay';
}

export const LivePoll: React.FC<LivePollProps> = ({ 
  poll, 
  voteHistory, 
  onStop, 
  onReset, 
  theme = 'dark',
  variant = 'default' 
}) => {
  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const [prevVotes, setPrevVotes] = useState<{[key: number]: number}>({});
  const [animatingOptions, setAnimatingOptions] = useState<{[key: number]: boolean}>({});
  const [copied, setCopied] = useState(false);
  const [copiedOptionId, setCopiedOptionId] = useState<number | null>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

  // Constants based on variant
  const isOverlay = variant === 'overlay';
  const isPreview = variant === 'preview';
  const isDefault = variant === 'default';

  // Detect vote changes to trigger animation
  useEffect(() => {
    const newAnimating: {[key: number]: boolean} = {};
    poll.options.forEach(opt => {
      if (prevVotes[opt.id] !== undefined && opt.votes > prevVotes[opt.id]) {
        newAnimating[opt.id] = true;
      }
    });

    if (Object.keys(newAnimating).length > 0) {
      setAnimatingOptions(prev => ({ ...prev, ...newAnimating }));
      const timer = setTimeout(() => {
        setAnimatingOptions({});
      }, 500);
      return () => clearTimeout(timer);
    }
    const currentVotesMap = poll.options.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.votes }), {});
    setPrevVotes(currentVotesMap);
  }, [poll.totalVotes]); 

  // Show winner overlay when poll ends
  useEffect(() => {
      if (!poll.isActive && poll.totalVotes > 0) {
          setShowWinnerOverlay(true);
      } else if (poll.isActive) {
          setShowWinnerOverlay(false);
      }
  }, [poll.isActive, poll.totalVotes]);

  const data = poll.options.map(opt => ({
    name: `+${opt.id}`,
    votes: opt.votes,
    label: opt.label,
    color: opt.color,
    icon: opt.icon,
    image: opt.image
  }));

  const maxVotes = Math.max(...poll.options.map(o => o.votes), 1);
  const maxVoteLimit = poll.maxVotes || 0;
  const progressPercent = maxVoteLimit > 0 ? (poll.totalVotes / maxVoteLimit) * 100 : 0;
  const isNearLimit = maxVoteLimit > 0 && progressPercent >= 90;
  const isAtLimit = maxVoteLimit > 0 && poll.totalVotes >= maxVoteLimit;

  // Find winner
  const winner = !poll.isActive && poll.totalVotes > 0
    ? poll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current)
    : null;

  const handleStopClick = () => {
    if (showConfirmStop) {
      onStop();
      setShowConfirmStop(false);
    } else {
      setShowConfirmStop(true);
      setTimeout(() => setShowConfirmStop(false), 4000);
    }
  };

  const exportCSV = () => {
    const headers = ['Option ID', 'Label', 'Votes', 'Is Winner'];
    const rows = poll.options.map(opt => [
       `+${opt.id}`,
       `"${opt.label}"`,
       opt.votes,
       winner?.id === opt.id ? 'YES' : 'NO'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `poll_results_${poll.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sharePoll = () => {
    const optionsText = poll.options.map(o => `+${o.id} ${o.label}`).join(' | ');
    const text = `📊 ${poll.question} 👉 Opciones: ${optionsText}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOption = (opt: PollOption, percentage: string) => {
    const text = `${opt.label}: ${percentage}% de los votos`;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedOptionId(opt.id);
        setTimeout(() => setCopiedOptionId(null), 1500);
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && !isOverlay) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg shadow-xl text-zinc-900 dark:text-white z-50">
          <div className="flex items-center gap-2 mb-1">
             {data.image ? (
                <img src={data.image} alt="" className="w-6 h-6 rounded object-cover" />
             ) : (
                <span className="text-xl">{data.icon}</span>
             )}
             <span className="font-bold text-sm">{data.label}</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
             Votos: <span className="text-twitch-brand dark:text-twitch-light font-bold text-base">{data.votes}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const tickColor = theme === 'dark' || isOverlay ? '#a1a1aa' : '#52525b';
  
  // Container Classes
  const containerClasses = isOverlay 
    ? "h-screen w-screen bg-transparent p-8 overflow-hidden" 
    : "h-full flex flex-col animate-[fadeIn_0.5s_ease-out] relative overflow-hidden p-4 md:p-6";

  const chartHeightClass = isOverlay ? "flex-1 min-h-[400px]" : isPreview ? "h-[200px]" : "h-[250px] lg:h-auto";
  const gridLayoutClass = isOverlay 
    ? "flex flex-col gap-8 h-full" 
    : isPreview 
        ? "flex flex-col gap-4" 
        : "grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[300px] relative z-10 overflow-hidden";

  return (
    <div className={containerClasses}>
      <style>{`
        @keyframes pulseGlow {
           0%, 100% { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.4)); }
           50% { filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.8)); }
        }
        .winner-border {
           box-shadow: 0 0 0 2px #facc15, 0 0 20px rgba(250, 204, 21, 0.3);
           animation: pulseGlow 2s infinite;
        }
      `}</style>
      
      {/* Header */}
      <div className={`flex justify-between items-start mb-4 relative z-10 ${isOverlay ? 'mb-8' : ''}`}>
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-1">
             {!isOverlay && (
                <span className="text-xs font-bold text-twitch-brand dark:text-twitch-light uppercase tracking-wider bg-twitch-brand/10 px-2 py-0.5 rounded">
                    {poll.title || 'Encuesta en Vivo'}
                </span>
             )}
             {isNearLimit && poll.isActive && !isOverlay && (
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${isAtLimit ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-black'}`}>
                   <AlertTriangle size={10} />
                   {isAtLimit ? 'Límite' : 'Casi Límite'}
                </span>
             )}
          </div>
          
          <h2 className={`font-bold text-zinc-900 dark:text-white leading-tight ${isOverlay ? 'text-4xl md:text-5xl drop-shadow-md text-white' : 'text-xl md:text-2xl'}`}>
            {poll.question}
          </h2>
          
          <div className={`flex flex-wrap items-center gap-4 text-zinc-500 dark:text-zinc-400 text-sm mt-2 ${isOverlay ? 'text-zinc-200' : ''}`}>
            <span className={`flex items-center gap-1 px-2 py-1 rounded ${isOverlay ? 'bg-black/50 text-white text-lg' : 'bg-zinc-200/50 dark:bg-zinc-800/50'}`}>
              <Users size={isOverlay ? 24 : 14} /> {poll.totalVotes} votos
            </span>
            
            {maxVoteLimit > 0 && !isOverlay && (
              <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                <Target size={14} /> Meta: {maxVoteLimit}
              </span>
            )}

            {poll.isActive && (
              <span className={`flex items-center gap-1 text-green-600 dark:text-green-400 animate-pulse px-2 py-1 rounded ${isOverlay ? 'bg-black/50 font-bold' : 'bg-green-500/10 border border-green-500/20'}`}>
                <span className="w-2 h-2 bg-green-500 rounded-full"/> {isOverlay ? 'EN VIVO' : 'En vivo'}
              </span>
            )}
            {!poll.isActive && (
                <span className={`text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded ${isOverlay ? 'bg-black/50 text-white' : 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'}`}>
                    Finalizada
                </span>
            )}
          </div>
        </div>
        
        {/* Actions - Only visible in Default mode */}
        {isDefault && (
          <div className="flex gap-2 shrink-0 flex-col items-end sm:flex-row">
             <Button variant="ghost" onClick={sharePoll} size="sm" className={copied ? "text-green-600 dark:text-green-400" : ""}>
               {copied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
             </Button>
             {!poll.isActive && <Button variant="ghost" onClick={exportCSV} size="sm"><Download size={18} /> CSV</Button>}
             {poll.isActive ? (
              <Button variant="danger" onClick={handleStopClick} size="sm" className={showConfirmStop ? "animate-pulse ring-2 ring-red-400" : ""}>
                {showConfirmStop ? <><AlertTriangle size={18} /> ¿Confirmar?</> : <><StopCircle size={18} /> Detener</>}
              </Button>
             ) : (
              <Button variant="secondary" onClick={onReset} size="sm"><RefreshCcw size={18} /> Nueva</Button>
             )}
          </div>
        )}
      </div>

      {/* Progress Bar (Hidden in Overlay for cleaner look) */}
      {maxVoteLimit > 0 && !isOverlay && (
        <div className="mb-6 relative z-10">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
             <span>Progreso</span>
             <span>{Math.min(100, progressPercent).toFixed(0)}%</span>
          </div>
          <div className="relative h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`absolute top-0 left-0 h-full transition-all duration-300 ease-linear ${progressPercent >= 100 ? 'bg-red-500' : progressPercent >= 90 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progressPercent, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={gridLayoutClass}>
        
        {/* Winner Overlay */}
        {winner && showWinnerOverlay && !poll.isActive && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-lg animate-fade-in p-4 text-center">
                {!isOverlay && (
                    <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => setShowWinnerOverlay(false)} className="text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 text-xs">
                            <Eye size={14} /> Ver Detalles
                        </button>
                    </div>
                )}
                <div className="mb-4 animate-bounce">
                    <Trophy size={isOverlay ? 100 : 48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                </div>
                
                <h3 className={`${isOverlay ? 'text-6xl mb-6' : 'text-4xl mb-4'} font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 uppercase tracking-widest drop-shadow-sm`}>
                    ¡Ganador!
                </h3>

                <div className="relative mb-8 group">
                    <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/30 to-purple-600/30 rounded-full blur-2xl opacity-75 animate-spin-slow"></div>
                    <div className={`relative ${isOverlay ? 'w-80 h-80 border-8' : 'w-48 h-48 border-[6px]'} rounded-full border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)] overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center`}>
                        {winner.image ? (
                            <img src={winner.image} alt="Winner" className="w-full h-full object-cover" />
                        ) : (
                            <span className={`${isOverlay ? 'text-9xl' : 'text-8xl'} select-none`}>{winner.icon || '🏆'}</span>
                        )}
                    </div>
                </div>

                <h2 className={`${isOverlay ? 'text-5xl text-white' : 'text-3xl text-zinc-900 dark:text-white'} font-bold leading-tight mb-2 px-4 drop-shadow-md`}>
                   {winner.label}
                </h2>
                <p className={`${isOverlay ? 'text-2xl text-zinc-300' : 'text-sm text-zinc-500 dark:text-zinc-400'} font-mono`}>{winner.votes} Votos</p>
            </div>
        )}

        {/* Chart */}
        <div className={`${isOverlay ? 'bg-transparent border-0' : 'bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800/50'} flex flex-col ${chartHeightClass} lg:col-span-2`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: isOverlay ? 40 : 20 }}>
              <XAxis 
                dataKey="name" 
                stroke={tickColor} 
                tick={({ x, y, payload }) => {
                    const opt = data.find(d => d.name === payload.value);
                    const size = isOverlay ? 60 : 32;
                    const fontSizeIcon = isOverlay ? 40 : 20;
                    const fontSizeText = isOverlay ? 20 : 12;
                    const dyIcon = isOverlay ? 40 : 25;
                    const dyText = isOverlay ? 80 : (opt?.image ? 50 : 45);

                    return (
                        <g transform={`translate(${x},${y})`} style={{ cursor: 'default' }}>
                            {opt?.image ? (
                                <foreignObject x={-size/2} y={5} width={size} height={size}>
                                   <img src={opt.image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: isOverlay ? '2px solid white' : 'none' }} alt="" />
                                </foreignObject>
                            ) : (
                                <text x={0} y={0} dy={dyIcon} textAnchor="middle" fill={tickColor} fontSize={fontSizeIcon}>
                                    {opt?.icon || ''}
                                </text>
                            )}
                            <text x={0} y={0} dy={dyText} textAnchor="middle" fill={isOverlay ? '#fff' : tickColor} fontSize={fontSizeText} fontWeight={isOverlay ? 700 : 600} style={{ textShadow: isOverlay ? '0 2px 4px rgba(0,0,0,0.5)' : 'none' }}>
                                {payload.value}
                            </text>
                        </g>
                    )
                }}
                tickLine={false}
                axisLine={false}
                height={isOverlay ? 100 : 60}
              />
              <YAxis hide domain={[0, 'auto']} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="votes" radius={[8, 8, 0, 0]} animationDuration={300} isAnimationActive={true}>
                {data.map((entry, index) => {
                  const isWinner = !poll.isActive && winner?.label === entry.label;
                  return (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke={isWinner ? '#facc15' : 'none'}
                        strokeWidth={isWinner ? 4 : 0}
                        style={isWinner ? { animation: 'pulseGlow 2s infinite' } : {}}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className={`space-y-3 overflow-y-auto pr-1 custom-scrollbar ${isOverlay ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
          {poll.options.map((opt) => {
            const percentage = poll.totalVotes > 0 ? ((opt.votes / poll.totalVotes) * 100).toFixed(1) : "0.0";
            const isWinner = !poll.isActive && winner?.id === opt.id && opt.votes > 0;
            const isAnimating = animatingOptions[opt.id];

            return (
              <div 
                key={opt.id} 
                className={`relative rounded-lg transition-all ${
                    isOverlay 
                      ? 'bg-black/60 border-2 border-white/10 p-4 text-white' 
                      : `p-3 border ${isWinner ? 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-400 winner-border' : 'bg-white dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800'}`
                    } ${isAnimating && !isOverlay ? 'flash-active' : ''}`}
              >
                <div className="flex justify-between items-center mb-1 relative z-10">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span 
                      className={`rounded-lg flex items-center justify-center font-bold text-black shadow-sm shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${isOverlay ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-xs'}`}
                      style={{ backgroundColor: opt.image ? 'transparent' : opt.color }}
                    >
                      {opt.image ? (
                          <img src={opt.image} alt="opt" className="w-full h-full object-cover" />
                      ) : (
                          <span>+{opt.id}</span>
                      )}
                    </span>
                    <span className={`font-medium truncate ${isOverlay ? 'text-xl text-white drop-shadow-md' : 'text-zinc-900 dark:text-zinc-200'}`}>
                      {opt.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`font-bold tabular-nums ${isOverlay ? 'text-2xl text-white' : 'text-zinc-900 dark:text-white'}`}>{percentage}%</span>
                      {isDefault && (
                        <button onClick={() => shareOption(opt, percentage)} className="text-zinc-400 hover:text-white transition-colors">
                           {copiedOptionId === opt.id ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      )}
                  </div>
                </div>
                
                {/* Progress Bar Background */}
                <div className={`absolute bottom-0 left-0 h-full w-full rounded-lg overflow-hidden -z-0 opacity-20 pointer-events-none`}>
                  <div 
                    className="h-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%`, backgroundColor: opt.color }}
                  />
                </div>
                
                <div className={`text-right ${isOverlay ? 'text-sm text-zinc-300' : 'text-xs text-zinc-500'} mt-1 relative z-10 flex justify-end items-center gap-1`}>
                  {opt.votes} votos
                </div>

                {isWinner && (
                  <div className="absolute -top-3 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border-2 border-white/20 animate-bounce z-20">
                    <Trophy size={14} className="fill-black" /> GANADOR
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {winner && !showWinnerOverlay && !poll.isActive && !isOverlay && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
              <button onClick={() => setShowWinnerOverlay(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-all animate-bounce">
                  <Trophy size={14} /> Ver Ganador
              </button>
          </div>
      )}
    </div>
  );
};
