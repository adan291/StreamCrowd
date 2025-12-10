
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from 'recharts';
import { Poll, VoteRecord, PollOption, ModerationStats, ModerationLogEntry, calculateWeightedTotal } from '../types';
import { Button } from './Button';
import { StopCircle, RefreshCcw, Users, Target, CheckCircle2, Download, AlertTriangle, Trophy, Share2, Copy, Eye, Edit2, Save, X, Clock, Dices, FlaskConical, Shield, Scale } from 'lucide-react';
import { ModerationStatsDisplay } from './ModerationStatsDisplay';
import { ModerationLogViewer } from './ModerationLogViewer';

interface OverlayStyles {
  textColor?: string;
  borderColor?: string;
  showBorders?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  fontStyle?: 'normal' | 'bold' | 'italic';
}

interface LivePollProps {
  poll: Poll;
  voteHistory: VoteRecord[];
  onStop: (auto?: boolean) => void;
  onReset: () => void;
  onUpdate?: (title: string, question: string) => void;
  onSimulateVote?: () => void; 
  theme?: 'light' | 'dark';
  variant?: 'default' | 'preview' | 'overlay';
  shouldRenderChart?: boolean;
  moderationStats?: ModerationStats;
  moderationLog?: ModerationLogEntry[];
  userWeights?: Map<string, number>;
  overlayStyles?: OverlayStyles;
}

export const LivePoll: React.FC<LivePollProps> = ({ 
  poll, 
  voteHistory, 
  onStop, 
  onReset,
  onUpdate,
  onSimulateVote,
  theme = 'dark',
  variant = 'default',
  shouldRenderChart = true,
  moderationStats,
  moderationLog = [],
  userWeights = new Map(),
  overlayStyles = {},
}) => {
  // Helper for overlay font styles
  const getOverlayFontSize = (base: 'title' | 'label' | 'percent' | 'votes') => {
    const sizes = {
      small: { title: 'text-3xl', label: 'text-lg', percent: 'text-xl', votes: 'text-sm' },
      medium: { title: 'text-5xl', label: 'text-2xl', percent: 'text-3xl', votes: 'text-lg' },
      large: { title: 'text-7xl', label: 'text-3xl', percent: 'text-4xl', votes: 'text-xl' },
    };
    return sizes[overlayStyles.fontSize || 'medium'][base];
  };
  
  const getOverlayFontStyle = () => {
    switch (overlayStyles.fontStyle) {
      case 'italic': return 'italic';
      case 'bold': return 'font-bold';
      default: return 'font-normal';
    }
  };

  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const [prevVotes, setPrevVotes] = useState<{[key: number]: number}>({});
  const [animatingOptions, setAnimatingOptions] = useState<{[key: number]: boolean}>({});
  const [copied, setCopied] = useState(false);
  const [copiedOptionId, setCopiedOptionId] = useState<number | null>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Simulation Mode State
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedPoll, setSimulatedPoll] = useState<Poll | null>(null);
  
  // Chart container dimensions to avoid negative dimension warnings
  const [chartSize, setChartSize] = useState<{width: number, height: number}>({width: 400, height: 250});
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updateSize = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          setChartSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
        }
      }
    };
    
    // Initial measurement with delays
    const timers = [
      setTimeout(updateSize, 50),
      setTimeout(updateSize, 200),
      setTimeout(updateSize, 500),
    ];
    
    // Listen for resize
    const handleResize = () => updateSize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [variant]);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(poll.title || '');
  const [editQuestion, setEditQuestion] = useState(poll.question);
  
  // Moderation panel state
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  // Constants based on variant
  const isOverlay = variant === 'overlay';
  const isPreview = variant === 'preview';
  const isDefault = variant === 'default';

  // Determine which poll data to display
  const displayPoll = (isSimulationMode && isDefault && simulatedPoll) ? simulatedPoll : poll;

  // Timer Logic (always track real poll time)
  useEffect(() => {
    if (poll.isActive && poll.duration) {
       const elapsed = Math.floor((Date.now() - poll.startTime) / 1000);
       const remaining = Math.max(0, poll.duration - elapsed);
       setTimeLeft(remaining);

       if (remaining === 0) {
           onStop(true); // Auto stop
       } else {
           const interval = setInterval(() => {
               const newElapsed = Math.floor((Date.now() - poll.startTime) / 1000);
               const newRemaining = Math.max(0, poll.duration! - newElapsed);
               setTimeLeft(newRemaining);
               if (newRemaining === 0) {
                   onStop(true);
                   clearInterval(interval);
               }
           }, 1000);
           return () => clearInterval(interval);
       }
    } else {
        setTimeLeft(null);
    }
  }, [poll.isActive, poll.startTime, poll.duration]);

  // Detect vote changes to trigger animation
  useEffect(() => {
    const newAnimating: {[key: number]: boolean} = {};
    displayPoll.options.forEach(opt => {
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
    const currentVotesMap = displayPoll.options.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.votes }), {});
    setPrevVotes(currentVotesMap);
  }, [displayPoll.totalVotes]); 

  // Init/Sync Simulated Poll
  useEffect(() => {
    if (!simulatedPoll && poll) {
        setSimulatedPoll(JSON.parse(JSON.stringify(poll)));
    } else if (simulatedPoll && !isSimulationMode) {
        // Reset if closed
        setSimulatedPoll(JSON.parse(JSON.stringify(poll)));
    }
  }, [poll, isSimulationMode]);

  // Show winner overlay when poll ends
  useEffect(() => {
      if (!isSimulationMode) {
          if (!poll.isActive && poll.totalVotes > 0) {
              setShowWinnerOverlay(true);
          } else if (poll.isActive) {
              setShowWinnerOverlay(false);
          }
      }
  }, [poll.isActive, poll.totalVotes, isSimulationMode]);

  useEffect(() => {
      if (isEditing) {
          setEditTitle(poll.title || '');
          setEditQuestion(poll.question);
      }
  }, [isEditing, poll.title, poll.question]);

  const handleSimulateVote = () => {
     if (isSimulationMode && simulatedPoll) {
         const randomOptionIndex = Math.floor(Math.random() * simulatedPoll.options.length);
         const newOptions = [...simulatedPoll.options];
         newOptions[randomOptionIndex].votes += 1;
         const newTotal = simulatedPoll.totalVotes + 1;
         setSimulatedPoll({
             ...simulatedPoll,
             options: newOptions,
             totalVotes: newTotal
         });
     }
  };

  const chartData = displayPoll.options.map(opt => ({
    name: `+${opt.id}`,
    votes: opt.votes,
    label: opt.label,
    color: opt.color,
    icon: opt.icon,
    image: opt.image
  }));

  const maxVotes = Math.max(...displayPoll.options.map(o => o.votes), 1);
  const maxVoteLimit = displayPoll.maxVotes || 0;
  const progressPercent = maxVoteLimit > 0 ? (displayPoll.totalVotes / maxVoteLimit) * 100 : 0;
  const isNearLimit = maxVoteLimit > 0 && progressPercent >= 90;
  const isAtLimit = maxVoteLimit > 0 && displayPoll.totalVotes >= maxVoteLimit;

  // Custom Colors
  const progressBarColor = displayPoll.progressBarColor || (progressPercent >= 100 ? '#ef4444' : progressPercent >= 90 ? '#eab308' : '#3b82f6');
  const limitIndicatorColor = displayPoll.limitIndicatorColor || (isAtLimit ? '#ef4444' : '#eab308');

  // Find winner
  const winner = !displayPoll.isActive && displayPoll.totalVotes > 0
    ? displayPoll.options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current)
    : null;
    
  // Calculate weighted totals
  const weightedTotal = calculateWeightedTotal(voteHistory, userWeights);
  const hasWeightedVotes = userWeights.size > 0 && weightedTotal !== voteHistory.length;

  const handleStopClick = () => {
    if (showConfirmStop) {
      onStop(false);
      setShowConfirmStop(false);
    } else {
      setShowConfirmStop(true);
      setTimeout(() => setShowConfirmStop(false), 4000);
    }
  };

  const handleSaveEdit = () => {
      if (onUpdate && editQuestion.trim()) {
          onUpdate(editTitle, editQuestion);
          setIsEditing(false);
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

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
  };

  const tickColor = theme === 'dark' || isOverlay ? '#a1a1aa' : '#52525b';
  
  // Container Classes
  const containerClasses = isOverlay 
    ? "h-full w-full bg-transparent p-4 md:p-8 flex flex-col justify-center" 
    : isPreview 
        ? "flex flex-col animate-[fadeIn_0.5s_ease-out] relative w-full h-full" 
        : `h-full flex flex-col animate-[fadeIn_0.5s_ease-out] relative overflow-hidden p-4 md:p-6 ${isSimulationMode ? 'border-4 border-dashed border-twitch-brand/50 bg-twitch-brand/5 rounded-2xl' : ''}`;

  // Chart Height Logic - Fixed height for preview/mobile, flexible for desktop panel/overlay
  const chartHeightClass = isOverlay 
    ? "flex-1 min-h-0" 
    : isPreview 
        ? "h-[200px] shrink-0 min-h-[150px]" 
        : "h-[250px] lg:flex-1 lg:min-h-0"; 
  
  // Grid Layout Logic
  const gridLayoutClass = isOverlay 
    ? "flex flex-col gap-8 h-full" 
    : isPreview 
        ? "flex flex-col gap-3 mt-4" 
        : "flex flex-col lg:grid lg:grid-cols-3 gap-6 flex-1 min-h-0 relative z-10";

  // Title Text Size
  const titleTextSize = isOverlay 
     ? 'text-5xl md:text-6xl drop-shadow-lg font-black tracking-tight' 
     : isPreview 
         ? 'text-lg md:text-xl' 
         : 'text-xl md:text-2xl';

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

      {isSimulationMode && isDefault && (
          <div className="absolute top-0 left-0 w-full bg-twitch-brand/20 dark:bg-twitch-brand/40 text-twitch-brand dark:text-twitch-light text-center text-[10px] font-bold uppercase tracking-widest py-1 z-0 pointer-events-none">
              Modo Simulación Activo - Datos Reales Ocultos
          </div>
      )}
      
      {/* Header */}
      <div className={`flex justify-between items-start mb-4 relative z-10 shrink-0 ${isOverlay ? 'mb-10 w-full max-w-5xl mx-auto' : ''}`}>
        <div className="flex-1 mr-4 min-w-0">
          <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
             {!isOverlay && !isEditing && (
                <span className={`text-xs font-bold text-twitch-brand dark:text-twitch-light uppercase tracking-wider bg-twitch-brand/10 px-2 py-0.5 rounded truncate ${isPreview ? 'text-[10px]' : ''}`}>
                    {displayPoll.title || 'Encuesta en Vivo'}
                </span>
             )}
             
             {isEditing && !isOverlay && (
                 <input 
                    type="text" 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)}
                    className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 text-xs font-bold text-twitch-brand dark:text-twitch-light uppercase w-40"
                    placeholder="TÍTULO"
                 />
             )}

             {isNearLimit && displayPoll.isActive && !isOverlay && !isEditing && (
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap animate-pulse text-white`} style={{backgroundColor: limitIndicatorColor}}>
                   <AlertTriangle size={10} />
                   {isAtLimit ? 'Límite' : 'Casi Límite'}
                </span>
             )}
          </div>
          
          {isEditing && !isOverlay ? (
              <input 
                 type="text"
                 value={editQuestion}
                 onChange={e => setEditQuestion(e.target.value)}
                 className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 font-bold text-zinc-900 dark:text-white text-lg md:text-xl mt-1 focus:ring-2 focus:ring-twitch-brand focus:outline-none"
                 placeholder="Pregunta de la encuesta..."
              />
          ) : (
            <div className={`flex items-center gap-2 group ${isOverlay ? 'justify-center' : ''}`}>
                <h2 
                  className={`leading-tight break-words text-center md:text-left ${isOverlay ? `${getOverlayFontSize('title')} ${getOverlayFontStyle()} drop-shadow-lg tracking-tight` : `${titleTextSize} font-bold text-zinc-900 dark:text-white`}`}
                  style={isOverlay ? { color: overlayStyles.textColor } : {}}
                >
                    {displayPoll.question}
                </h2>
                {isDefault && displayPoll.isActive && onUpdate && !isSimulationMode && (
                    <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-twitch-brand transition-all p-1">
                        <Edit2 size={16} />
                    </button>
                )}
            </div>
          )}
          
          <div 
            className={`flex flex-wrap items-center gap-2 sm:gap-4 text-sm mt-2 ${isOverlay ? 'justify-center mt-4' : 'text-zinc-500 dark:text-zinc-400'}`}
            style={isOverlay ? { color: overlayStyles.textColor, opacity: 0.9 } : {}}
          >
             
             {isEditing ? (
                 <div className="flex gap-2 mt-1">
                     <button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><Save size={12}/> Guardar</button>
                     <button onClick={() => setIsEditing(false)} className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><X size={12}/> Cancelar</button>
                 </div>
             ) : (
                <>
                    <span 
                      className={`flex items-center gap-1 px-2 py-1 rounded ${isOverlay ? `${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} text-xl font-bold backdrop-blur-sm` : 'bg-zinc-200/50 dark:bg-zinc-800/50'}`}
                      style={isOverlay ? { color: overlayStyles.textColor } : {}}
                    >
                    <Users size={isOverlay ? 24 : 14} /> {displayPoll.totalVotes} votes
                    </span>
                    
                    {hasWeightedVotes && !isOverlay && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-twitch-brand/10 text-twitch-brand dark:text-twitch-light border border-twitch-brand/20">
                        <Scale size={14} /> {weightedTotal} weighted
                      </span>
                    )}
                    
                    {maxVoteLimit > 0 && !isOverlay && (
                    <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                        <Target size={14} /> Meta: {maxVoteLimit}
                    </span>
                    )}

                    {timeLeft !== null && (
                        <span 
                          className={`flex items-center gap-1 px-2 py-1 rounded border tabular-nums ${isOverlay ? `text-xl font-bold ${theme === 'dark' ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/10'} backdrop-blur-sm` : 'text-sm font-bold border-zinc-200 dark:border-zinc-700'} ${timeLeft <= 10 ? 'text-red-500 border-red-500/50 animate-pulse' : ''}`}
                          style={isOverlay && timeLeft > 10 ? { color: overlayStyles.textColor } : {}}
                        >
                           <Clock size={isOverlay ? 24 : 14} /> {formatTime(timeLeft)}
                        </span>
                    )}

                    {!displayPoll.isActive && (
                        <span 
                          className={`px-2 py-1 rounded ${isOverlay ? `${theme === 'dark' ? 'bg-black/50' : 'bg-white/80'} text-lg backdrop-blur-sm` : 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'}`}
                          style={isOverlay ? { color: overlayStyles.textColor } : {}}
                        >
                            Finalizada
                        </span>
                    )}
                </>
             )}
          </div>
        </div>
        
        {/* Actions - Only visible in Default mode */}
        {isDefault && (
          <div className="flex gap-2 shrink-0 flex-col items-end sm:flex-row relative z-20">
             {!isSimulationMode && (
                <Button variant="ghost" onClick={sharePoll} size="sm" className={copied ? "text-green-600 dark:text-green-400" : ""}>
                   {copied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
                </Button>
             )}
             
             {!poll.isActive && !isSimulationMode && <Button variant="ghost" onClick={exportCSV} size="sm"><Download size={18} /> CSV</Button>}
             
             {/* Simulation Toggle */}
             {poll.isActive && (
                 <Button 
                    variant={isSimulationMode ? "primary" : "ghost"} 
                    onClick={() => setIsSimulationMode(!isSimulationMode)} 
                    size="sm" 
                    title={isSimulationMode ? "Salir de Simulación" : "Modo Simulación (Privado)"}
                    className={isSimulationMode ? "ring-2 ring-offset-2 ring-twitch-brand dark:ring-offset-black" : ""}
                 >
                     <FlaskConical size={18} />
                 </Button>
             )}
             
             {/* Moderation Panel Toggle */}
             {moderationStats && !isSimulationMode && (
                 <Button 
                    variant={showModerationPanel ? "primary" : "ghost"} 
                    onClick={() => setShowModerationPanel(!showModerationPanel)} 
                    size="sm" 
                    title={showModerationPanel ? "Hide Moderation" : "Show Moderation Stats"}
                    className={showModerationPanel ? "ring-2 ring-offset-2 ring-twitch-brand dark:ring-offset-black" : ""}
                 >
                     <Shield size={18} />
                 </Button>
             )}

             {isSimulationMode && (
                 <Button variant="secondary" size="sm" onClick={handleSimulateVote}>
                     <Dices size={18} /> +1 Random
                 </Button>
             )}

             {!isSimulationMode && (
                 poll.isActive ? (
                  <Button variant="danger" onClick={handleStopClick} size="sm" className={showConfirmStop ? "animate-pulse ring-2 ring-red-400" : ""}>
                    {showConfirmStop ? <><AlertTriangle size={18} /> ¿Confirmar?</> : <><StopCircle size={18} /> Detener</>}
                  </Button>
                 ) : (
                  <Button variant="secondary" onClick={onReset} size="sm"><RefreshCcw size={18} /> Nueva</Button>
                 )
             )}
          </div>
        )}
      </div>

      {/* Progress Bar (Hidden in Overlay for cleaner look) */}
      {maxVoteLimit > 0 && !isOverlay && (
        <div className="mb-6 relative z-10 shrink-0">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
             <span>Progreso</span>
             <span>{Math.min(100, progressPercent).toFixed(0)}%</span>
          </div>
          <div className="relative h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className={`absolute top-0 left-0 h-full transition-all duration-300 ease-linear`} 
                style={{ width: `${Math.min(progressPercent, 100)}%`, backgroundColor: progressBarColor }} 
            />
          </div>
        </div>
      )}

      {/* Main Content - Displays either Real or Simulated poll based on mode */}
      <div className={gridLayoutClass}>
        
        {/* Winner Overlay */}
        {winner && showWinnerOverlay && !displayPoll.isActive && (
            <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg animate-fade-in p-4 text-center ${isOverlay ? 'bg-transparent' : 'bg-white/95 dark:bg-black/90 backdrop-blur-md'}`}>
                {!isOverlay && (
                    <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => setShowWinnerOverlay(false)} className="text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 text-xs">
                            <Eye size={14} /> Ver Detalles
                        </button>
                    </div>
                )}
                <div className="mb-4 animate-bounce">
                    <Trophy size={isOverlay ? 120 : 48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                </div>
                
                <h3 className={`${isOverlay ? 'text-7xl mb-8' : 'text-4xl mb-4'} font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 uppercase tracking-widest drop-shadow-sm`}>
                    ¡Ganador!
                </h3>

                <div className="relative mb-8 group">
                    <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/30 to-purple-600/30 rounded-full blur-2xl opacity-75 animate-spin-slow"></div>
                    <div className={`relative ${isOverlay ? 'w-96 h-96 border-8' : 'w-48 h-48 border-[6px]'} rounded-full border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.4)] overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center`}>
                        {winner.image ? (
                            <img src={winner.image} alt="Winner" className="w-full h-full object-cover" />
                        ) : (
                            <span className={`${isOverlay ? 'text-9xl' : 'text-8xl'} select-none`}>{winner.icon || '🏆'}</span>
                        )}
                    </div>
                </div>

                <h2 className={`${isOverlay ? 'text-6xl text-zinc-900 dark:text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.2)]' : 'text-3xl text-zinc-900 dark:text-white'} font-bold leading-tight mb-2 px-4`}>
                   {winner.label}
                </h2>
                <p className={`${isOverlay ? 'text-4xl text-yellow-500 dark:text-yellow-300 drop-shadow-md font-bold' : 'text-sm text-zinc-500 dark:text-zinc-400'} font-mono`}>{winner.votes} Votos</p>
            </div>
        )}

        {/* Chart */}
        <div className={`${isOverlay ? 'bg-transparent border-0' : 'bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800/50'} flex flex-col ${chartHeightClass} lg:col-span-2 relative min-w-0`}>
          <div ref={chartContainerRef} className="w-full h-full min-h-[250px] absolute inset-0 p-2 md:p-4">
          {shouldRenderChart && chartData.length > 0 && chartSize.width > 50 && chartSize.height > 50 ? (
                  <BarChart data={chartData} width={chartSize.width - 20} height={chartSize.height - 20} margin={{ top: 20, right: 10, left: 10, bottom: isOverlay ? 40 : 20 }}>
                      <XAxis 
                        dataKey="name" 
                        stroke={tickColor} 
                        tick={({ x, y, payload }) => {
                            const opt = chartData.find(d => d.name === payload.value);
                            
                            // Responsive sizing logic
                            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                            const isCompact = isMobile || isPreview;
                            
                            let size = isOverlay ? 70 : (isCompact ? 24 : 32);
                            let fontSizeIcon = isOverlay ? 50 : (isCompact ? 16 : 20);
                            let fontSizeText = isOverlay ? 24 : (isCompact ? 10 : 12);
                            
                            // Adjust DY (vertical offset)
                            let dyIcon = isOverlay ? 45 : (isCompact ? 15 : 25);
                            let dyText = isOverlay ? 90 : (opt?.image ? (isCompact ? 40 : 50) : (isCompact ? 35 : 45));

                            return (
                                <g transform={`translate(${x},${y})`} style={{ cursor: 'default' }}>
                                    {opt?.image ? (
                                        <foreignObject x={-size/2} y={5} width={size} height={size}>
                                          <img src={opt.image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: isOverlay ? '3px solid white' : 'none' }} alt="" />
                                        </foreignObject>
                                    ) : (
                                        <text x={0} y={0} dy={dyIcon} textAnchor="middle" fill={tickColor} fontSize={fontSizeIcon}>
                                            {opt?.icon || ''}
                                        </text>
                                    )}
                                    <text x={0} y={0} dy={dyText} textAnchor="middle" fill={isOverlay ? (theme === 'dark' ? '#fff' : '#18181b') : tickColor} fontSize={fontSizeText} fontWeight={isOverlay ? 700 : 600} style={{ textShadow: isOverlay && theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.8)' : 'none' }}>
                                        {payload.value}
                                    </text>
                                </g>
                            )
                        }}
                        tickLine={false}
                        axisLine={false}
                        height={isOverlay ? 120 : 60}
                        interval={0} // Show all ticks
                      />
                      <YAxis hide domain={[0, 'auto']} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar 
                        dataKey="votes" 
                        radius={[8, 8, 0, 0]} 
                        animationDuration={500} 
                        animationEasing="ease-out"
                        isAnimationActive={true}
                      >
                        {chartData.map((entry, index) => {
                          const isWinner = !displayPoll.isActive && winner?.label === entry.label;
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
          ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                {/* Loading chart... */}
             </div>
          )}
          </div>
        </div>

        {/* Legend */}
        <div className={`space-y-3 ${isOverlay ? 'grid grid-cols-2 gap-4 space-y-0 content-center w-full max-w-5xl mx-auto' : isPreview ? 'flex-1' : 'overflow-y-auto pr-1 custom-scrollbar'}`}>
          {displayPoll.options.map((opt) => {
            const percentage = displayPoll.totalVotes > 0 ? ((opt.votes / displayPoll.totalVotes) * 100).toFixed(1) : "0.0";
            const isWinner = !displayPoll.isActive && winner?.id === opt.id && opt.votes > 0;
            const isAnimating = animatingOptions[opt.id];
            
            // Overlay custom styles
            const overlayCardStyle = isOverlay ? {
              borderColor: overlayStyles.showBorders ? overlayStyles.borderColor : 'transparent',
              borderWidth: overlayStyles.showBorders ? 2 : 0,
              color: overlayStyles.textColor,
            } : {};

            // Card background based on theme
            const overlayCardBg = theme === 'dark' ? 'bg-black/70' : 'bg-white/90';

            return (
              <div 
                key={opt.id} 
                className={`relative rounded-lg transition-all ${
                    isOverlay 
                      ? `${overlayCardBg} p-4 shadow-lg backdrop-blur-sm` 
                      : `p-3 border ${isWinner ? 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-400 winner-border' : 'bg-white dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800'}`
                    } ${isAnimating && !isOverlay ? 'flash-active' : ''}`}
                style={overlayCardStyle}
              >
                <div className="flex justify-between items-center mb-1 relative z-10">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 mr-2">
                    <span 
                      className={`rounded-lg flex items-center justify-center font-bold text-black shadow-sm shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${isOverlay ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-xs'}`}
                      style={{ backgroundColor: opt.image ? 'transparent' : opt.color }}
                    >
                      {opt.image ? (
                          <img src={opt.image} alt="opt" className="w-full h-full object-cover" />
                      ) : (
                          <span>+{opt.id}</span>
                      )}
                    </span>
                    <span 
                      className={`truncate ${isOverlay ? `${getOverlayFontSize('label')} ${getOverlayFontStyle()}` : 'text-zinc-900 dark:text-zinc-200 text-sm font-medium'}`}
                      style={isOverlay ? { color: overlayStyles.textColor } : {}}
                    >
                      {opt.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                      <span 
                        className={`tabular-nums ${isOverlay ? `${getOverlayFontSize('percent')} ${getOverlayFontStyle()} drop-shadow-sm` : 'font-bold text-zinc-900 dark:text-white'}`}
                        style={isOverlay ? { color: overlayStyles.textColor } : {}}
                      >{percentage}%</span>
                      {isDefault && !isSimulationMode && (
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
                
                <div 
                  className={`text-right ${isOverlay ? `${getOverlayFontSize('votes')} ${getOverlayFontStyle()}` : 'text-xs text-zinc-500'} mt-1 relative z-10 flex justify-end items-center gap-1`}
                  style={isOverlay ? { color: overlayStyles.textColor, opacity: 0.8 } : {}}
                >
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
      
      {winner && !showWinnerOverlay && !displayPoll.isActive && !isOverlay && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
              <button onClick={() => setShowWinnerOverlay(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-all animate-bounce">
                  <Trophy size={14} /> Ver Ganador
              </button>
          </div>
      )}
      
      {/* Moderation Panel */}
      {showModerationPanel && moderationStats && isDefault && !isSimulationMode && (
        <div className="mt-4 space-y-4 animate-fade-in border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <ModerationStatsDisplay stats={moderationStats} />
          <ModerationLogViewer entries={moderationLog} pollId={poll.id} />
        </div>
      )}
    </div>
  );
};
