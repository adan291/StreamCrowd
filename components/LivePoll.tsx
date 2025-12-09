import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Poll, VoteRecord, PollOption } from '../types';
import { Button } from './Button';
import { StopCircle, RefreshCcw, Users, Target, CheckCircle2, Download, AlertTriangle, Trophy, Share2, Copy, X, Eye } from 'lucide-react';

interface LivePollProps {
  poll: Poll;
  voteHistory: VoteRecord[];
  onStop: () => void;
  onReset: () => void;
  theme?: 'light' | 'dark';
}

export const LivePoll: React.FC<LivePollProps> = ({ poll, voteHistory, onStop, onReset, theme = 'dark' }) => {
  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const [prevVotes, setPrevVotes] = useState<{[key: number]: number}>({});
  const [animatingOptions, setAnimatingOptions] = useState<{[key: number]: boolean}>({});
  const [copied, setCopied] = useState(false);
  const [copiedOptionId, setCopiedOptionId] = useState<number | null>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

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
      
      // Clear animations after short duration
      const timer = setTimeout(() => {
        setAnimatingOptions({});
      }, 500);
      return () => clearTimeout(timer);
    }

    // Update prev votes
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

  // Find winner(s)
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
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

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
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg shadow-xl text-zinc-900 dark:text-white">
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

  const tickColor = theme === 'dark' ? '#a1a1aa' : '#52525b';

  return (
    <div className="h-full flex flex-col animate-[fadeIn_0.5s_ease-out] relative overflow-hidden p-4 md:p-6">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes flashHighlight {
           0% { background-color: rgba(169, 112, 255, 0.2); transform: scale(1.02); }
           100% { background-color: transparent; transform: scale(1); }
        }
        .flash-active {
           animation: flashHighlight 0.4s ease-out;
        }
        .winner-border {
           box-shadow: 0 0 0 2px #facc15, 0 0 20px rgba(250, 204, 21, 0.3);
        }
      `}</style>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-twitch-brand dark:text-twitch-light uppercase tracking-wider bg-twitch-brand/10 px-2 py-0.5 rounded">
                {poll.title || 'Encuesta en Vivo'}
             </span>
             
             {isNearLimit && poll.isActive && (
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${isAtLimit ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-black'}`}>
                   <AlertTriangle size={10} />
                   {isAtLimit ? 'Límite Alcanzado' : 'Límite Próximo'}
                </span>
             )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight">{poll.question}</h2>
          
          <div className="flex flex-wrap items-center gap-4 text-zinc-500 dark:text-zinc-400 text-sm">
            <span className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-800/50 px-2 py-1 rounded">
              <Users size={14} /> {poll.totalVotes} votos
            </span>
            
            {maxVoteLimit > 0 && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
                poll.totalVotes >= maxVoteLimit 
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              }`}>
                <Target size={14} /> Meta: {maxVoteLimit}
              </span>
            )}

            {poll.isActive && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 animate-pulse bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                <span className="w-2 h-2 bg-green-500 rounded-full"/> En vivo
              </span>
            )}
            {!poll.isActive && <span className="text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700">Finalizada</span>}
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0 flex-col items-end sm:flex-row">
           <Button 
              variant="ghost" 
              onClick={sharePoll} 
              size="sm" 
              title="Copiar pregunta y opciones al portapapeles"
              className={copied ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" : ""}
            >
              {copied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
           </Button>

           {!poll.isActive && (
             <Button variant="ghost" onClick={exportCSV} size="sm" title="Exportar CSV">
               <Download size={18} /> CSV
             </Button>
           )}

           {poll.isActive ? (
            <Button 
              variant={showConfirmStop ? "danger" : "danger"} 
              onClick={handleStopClick} 
              size="sm" 
              className={showConfirmStop ? "animate-pulse ring-2 ring-red-400" : ""}
              title="Comando chat: !stop"
            >
              {showConfirmStop ? (
                <>
                  <AlertTriangle size={18} /> ¿Confirmar?
                </>
              ) : (
                <>
                  <StopCircle size={18} /> Detener
                </>
              )}
            </Button>
           ) : (
            <Button variant="secondary" onClick={onReset} size="sm" title="Comando chat: !reset">
              <RefreshCcw size={18} /> Nueva
            </Button>
           )}
        </div>
      </div>

      {/* Max Vote Progress Bar */}
      {maxVoteLimit > 0 && (
        <div className="mb-6 relative z-10">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
             <span>Progreso de meta</span>
             <span>{Math.min(100, progressPercent).toFixed(0)}%</span>
          </div>
          <div className={`relative h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden ${isNearLimit && poll.isActive ? 'ring-2 ring-yellow-500/30' : ''}`}>
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-300 ease-linear ${
                  progressPercent >= 100 ? 'bg-red-500' : 
                  progressPercent >= 90 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Chart + Legend OR Winner Reveal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[300px] relative z-10 overflow-hidden">
        
        {/* Winner Overlay */}
        {winner && showWinnerOverlay && !poll.isActive && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-lg animate-fade-in p-4 text-center">
                <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => setShowWinnerOverlay(false)} className="text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 text-xs">
                        <Eye size={14} /> Ver Detalles
                    </button>
                </div>

                <div className="mb-2 animate-bounce">
                    <Trophy size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                </div>
                
                <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 mb-8 uppercase tracking-widest drop-shadow-sm">
                    ¡Ganador!
                </h3>

                <div className="relative mb-8 group">
                    <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/30 to-purple-600/30 rounded-full blur-2xl opacity-75 animate-spin-slow"></div>
                    <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-[6px] border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)] overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        {winner.image ? (
                            <img src={winner.image} alt="Winner" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-8xl select-none">{winner.icon || '🏆'}</span>
                        )}
                    </div>
                     <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-6 py-2 rounded-full shadow-lg border-2 border-white/50 whitespace-nowrap flex items-center gap-2 text-lg">
                        {winner.votes} Votos
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white max-w-2xl leading-tight mb-2 px-4 drop-shadow-md">
                   {winner.label}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm">La opción +{winner.id} ha ganado la encuesta</p>
            </div>
        )}

        {/* Chart Area */}
        <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800/50 flex flex-col h-[250px] lg:h-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                stroke={tickColor} 
                tick={({ x, y, payload }) => {
                    const opt = data.find(d => d.name === payload.value);
                    const size = 32;
                    return (
                        <g transform={`translate(${x},${y})`} style={{ cursor: 'default' }}>
                            {opt?.image ? (
                                <foreignObject x={-size/2} y={5} width={size} height={size}>
                                   <img src={opt.image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                </foreignObject>
                            ) : (
                                <text x={0} y={0} dy={25} textAnchor="middle" fill={tickColor} fontSize={20}>
                                    {opt?.icon || ''}
                                </text>
                            )}
                            <text x={0} y={0} dy={opt?.image ? 50 : 45} textAnchor="middle" fill={tickColor} fontSize={12} fontWeight={600}>
                                {payload.value}
                            </text>
                        </g>
                    )
                }}
                tickLine={false}
                axisLine={false}
                height={60}
              />
              <YAxis 
                hide 
                domain={[0, 'auto']} 
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="votes" radius={[8, 8, 0, 0]} animationDuration={300} isAnimationActive={true}>
                {data.map((entry, index) => {
                  const isWinner = !poll.isActive && winner?.label === entry.label;
                  return (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke={isWinner ? '#facc15' : 'none'}
                        strokeWidth={isWinner ? 4 : 0}
                        style={isWinner ? { filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))' } : {}}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Stats List */}
        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {poll.options.map((opt) => {
            const percentage = poll.totalVotes > 0 ? ((opt.votes / poll.totalVotes) * 100).toFixed(1) : "0.0";
            const isWinner = !poll.isActive && winner?.id === opt.id && opt.votes > 0;
            const isAnimating = animatingOptions[opt.id];
            const isCopied = copiedOptionId === opt.id;

            return (
              <div 
                key={opt.id} 
                className={`relative p-3 rounded-lg border transition-all ${
                    isWinner 
                        ? 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-400 ring-2 ring-yellow-400/50 winner-border' 
                        : 'bg-white dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800'
                    } ${isAnimating ? 'flash-active' : ''}`}
              >
                <div className="flex justify-between items-center mb-1 relative z-10">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-black shadow-sm shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                      style={{ backgroundColor: opt.image ? 'transparent' : opt.color }}
                    >
                      {opt.image ? (
                          <img src={opt.image} alt="opt" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-sm">+{opt.id}</span>
                      )}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200 truncate" title={opt.label}>
                      {!opt.image && opt.icon && <span className="mr-1.5">{opt.icon}</span>}
                      {opt.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{percentage}%</span>
                      <button 
                         onClick={() => shareOption(opt, percentage)}
                         className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                         title="Copiar resultado"
                      >
                         {isCopied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                  </div>
                </div>
                
                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 h-1 bg-zinc-100 dark:bg-zinc-800 w-full rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: opt.color
                    }}
                  />
                </div>
                
                <div className="text-right text-xs text-zinc-500 mt-1 relative z-10 flex justify-end items-center gap-1">
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
      
      {/* Winner Overlay for "View Details" state - show a small banner if overlay is dismissed but poll is over */}
      {winner && !showWinnerOverlay && !poll.isActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
              <button 
                onClick={() => setShowWinnerOverlay(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-all animate-bounce"
              >
                  <Trophy size={14} /> Ver Ganador
              </button>
          </div>
      )}
    </div>
  );
};