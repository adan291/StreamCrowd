import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PollOption, TwitchMessage } from '../types';
import { RotateCcw, Play, X, Users, Timer, Pause, BarChart3, Equal } from 'lucide-react';

type WheelMode = 'classic' | 'voting';

interface SpinnerWheelProps {
  options: PollOption[];
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  votePrefix?: string;
}

interface VoteState {
  [optionId: number]: {
    votes: number;
    voters: Set<string>;
  };
}

export const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ 
  options, 
  onClose, 
  chatMessages = [],
  votePrefix = '+'
}) => {
  const [mode, setMode] = useState<WheelMode>('classic');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<PollOption | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Voting mode state
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState(30);
  const [votingDuration, setVotingDuration] = useState(30);
  const [voteState, setVoteState] = useState<VoteState>(() => {
    const initial: VoteState = {};
    options.forEach(opt => {
      initial[opt.id] = { votes: 0, voters: new Set() };
    });
    return initial;
  });
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const lastProcessedIndexRef = useRef(0);

  // Calculate total votes helper
  const getTotalVotes = useCallback(() => {
    return options.reduce((sum, opt) => sum + (voteState[opt.id]?.votes || 0), 0);
  }, [options, voteState]);

  // Calculate segment angles based on mode
  const getSegmentAngles = useCallback(() => {
    if (mode === 'classic') {
      // Equal segments
      const angle = 360 / options.length;
      return options.map(() => angle);
    } else {
      // Weighted by votes
      const totalVotes = getTotalVotes();
      if (totalVotes === 0) {
        // If no votes, equal segments
        const angle = 360 / options.length;
        return options.map(() => angle);
      }
      // Minimum 5% for each option to keep them visible
      const minAngle = 18; // 5% of 360
      const availableAngle = 360 - (minAngle * options.length);
      
      return options.map(opt => {
        const votes = voteState[opt.id]?.votes || 0;
        const proportion = votes / totalVotes;
        return minAngle + (availableAngle * proportion);
      });
    }
  }, [mode, options, voteState, getTotalVotes]);

  const segmentAngles = getSegmentAngles();

  // Process chat messages for votes
  useEffect(() => {
    if (!isVotingActive || mode !== 'voting') return;
    
    // Process only new messages
    const newMessages = chatMessages.slice(lastProcessedIndexRef.current);
    if (newMessages.length === 0) return;
    
    lastProcessedIndexRef.current = chatMessages.length;
    
    setVoteState(prev => {
      const newState = { ...prev };
      let hasChanges = false;
      
      newMessages.forEach(msg => {
        const msgId = msg.id || `${msg.userId}-${msg.message}-${Date.now()}`;
        
        // Skip if already processed
        if (processedMessageIds.has(msgId)) return;
        
        const msgLower = msg.message.toLowerCase().trim();
        
        // Check for votes: +1, +2, etc. or custom prefix
        options.forEach((opt, index) => {
          const voteNumber = index + 1;
          const votePatterns = [
            `${votePrefix}${voteNumber}`,
            `${votePrefix}${opt.label.toLowerCase()}`,
          ];
          
          // Also check for voteKey if defined
          if (opt.voteKey) {
            votePatterns.push(`${votePrefix}${opt.voteKey.toLowerCase()}`);
          }
          
          const isVote = votePatterns.some(pattern => 
            msgLower === pattern || msgLower.startsWith(pattern + ' ')
          );
          
          if (isVote) {
            const oderId = msg.userId || msg.username;
            if (!newState[opt.id].voters.has(oderId)) {
              // New vote
              newState[opt.id] = {
                votes: newState[opt.id].votes + 1,
                voters: new Set([...newState[opt.id].voters, oderId])
              };
              hasChanges = true;
            }
          }
        });
        
        // Mark as processed
        setProcessedMessageIds(prev => new Set([...prev, msgId]));
      });
      
      return hasChanges ? newState : prev;
    });
  }, [chatMessages, isVotingActive, mode, options, votePrefix, processedMessageIds]);

  // Voting timer
  useEffect(() => {
    if (!isVotingActive || votingTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setVotingTimeLeft(prev => {
        if (prev <= 1) {
          setIsVotingActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isVotingActive, votingTimeLeft]);

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    let currentAngle = -90; // Start from top
    
    options.forEach((option, index) => {
      const segmentAngle = segmentAngles[index];
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + segmentAngle) * (Math.PI / 180);

      // Segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = option.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segmentAngle * Math.PI / 360));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      const label = option.label.length > 12 ? option.label.slice(0, 12) + '...' : option.label;
      ctx.fillText(label, radius - 20, 5);
      ctx.restore();

      currentAngle += segmentAngle;
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#a970ff';
    ctx.lineWidth = 3;
    ctx.stroke();

  }, [options, segmentAngles]);

  const spin = () => {
    if (isSpinning || options.length === 0) return;
    if (mode === 'voting' && isVotingActive) return; // Can't spin while voting

    setIsSpinning(true);
    setShowWinner(false);
    setWinner(null);

    // Random spins (5-10 full rotations) + random final position
    const spins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + randomAngle;

    setRotation(totalRotation);

    // Calculate winner after spin
    setTimeout(() => {
      const finalRotation = totalRotation % 360;
      const pointerAngle = (360 - finalRotation + 360) % 360;
      
      // Find which segment the pointer is in
      let accumulatedAngle = 0;
      let winnerIndex = 0;
      
      for (let i = 0; i < options.length; i++) {
        accumulatedAngle += segmentAngles[i];
        if (pointerAngle < accumulatedAngle) {
          winnerIndex = i;
          break;
        }
      }
      
      setWinner(options[winnerIndex]);
      setShowWinner(true);
      setIsSpinning(false);
    }, 4000);
  };

  const reset = () => {
    setRotation(0);
    setWinner(null);
    setShowWinner(false);
  };

  const resetVotes = () => {
    const initial: VoteState = {};
    options.forEach(opt => {
      initial[opt.id] = { votes: 0, voters: new Set() };
    });
    setVoteState(initial);
    setProcessedMessageIds(new Set());
    lastProcessedIndexRef.current = chatMessages.length;
  };

  const startVoting = () => {
    resetVotes();
    setVotingTimeLeft(votingDuration);
    setIsVotingActive(true);
  };

  const stopVoting = () => {
    setIsVotingActive(false);
  };

  const totalVotes = getTotalVotes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-lg w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-4">
          🎰 Ruleta de la Suerte
        </h2>

        {/* Mode selector */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setMode('classic')}
            disabled={isSpinning || isVotingActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'classic'
                ? 'bg-twitch-brand text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            } disabled:opacity-50`}
          >
            <Equal size={18} />
            Clásica
          </button>
          <button
            onClick={() => setMode('voting')}
            disabled={isSpinning || isVotingActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'voting'
                ? 'bg-twitch-brand text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            } disabled:opacity-50`}
          >
            <BarChart3 size={18} />
            Por Votos
          </button>
        </div>

        {/* Voting mode controls */}
        {mode === 'voting' && (
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Duración de votación:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={votingDuration}
                  onChange={(e) => setVotingDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 30)))}
                  disabled={isVotingActive}
                  className="w-16 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm disabled:opacity-50"
                />
                <span className="text-zinc-400 text-sm">seg</span>
              </div>
            </div>
            
            {isVotingActive ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400">
                    <Timer size={16} className="animate-pulse" />
                    <span className="font-bold">{votingTimeLeft}s</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Users size={16} />
                    <span>{totalVotes} votos</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(votingTimeLeft / votingDuration) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 text-center">
                  Vota en el chat: {options.map((_, i) => `${votePrefix}${i + 1}`).join(', ')}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-2">
                  Los votos del chat determinarán el tamaño de cada sección
                </p>
              </div>
            )}

            {/* Vote counts */}
            {totalVotes > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {options.map((opt) => {
                  const votes = voteState[opt.id]?.votes || 0;
                  const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
                  return (
                    <div 
                      key={opt.id}
                      className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-2 py-1"
                    >
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span className="text-xs text-zinc-300 truncate flex-1">
                        {opt.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {votes} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              {!isVotingActive ? (
                <>
                  <button
                    onClick={startVoting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all"
                  >
                    <Play size={16} />
                    Iniciar Votación
                  </button>
                  {totalVotes > 0 && (
                    <button
                      onClick={resetVotes}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-all"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={stopVoting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all"
                >
                  <Pause size={16} />
                  Detener Votación
                </button>
              )}
            </div>
          </div>
        )}

        {/* Wheel container */}
        <div className="relative flex justify-center mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>

          {/* Canvas wheel */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Winner announcement */}
        {showWinner && winner && (
          <div className="text-center mb-4 animate-bounce">
            <div className="inline-block px-6 py-3 rounded-xl" style={{ backgroundColor: winner.color }}>
              <span className="text-white font-bold text-xl drop-shadow-lg">
                🎉 {winner.label} 🎉
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={spin}
            disabled={isSpinning || options.length === 0 || (mode === 'voting' && isVotingActive)}
            className="flex items-center gap-2 px-6 py-3 bg-twitch-brand hover:bg-twitch-brand/80 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <Play size={20} />
            {isSpinning ? 'Girando...' : 'Girar'}
          </button>
          
          <button
            onClick={reset}
            disabled={isSpinning}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {options.length === 0 && (
          <p className="text-center text-zinc-400 mt-4">
            Crea una encuesta primero para usar la ruleta
          </p>
        )}

        {mode === 'voting' && !isVotingActive && totalVotes === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-4">
            💡 Inicia una votación para que el chat decida las probabilidades
          </p>
        )}
      </div>
    </div>
  );
};
