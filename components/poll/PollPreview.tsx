/**
 * PollPreview Component
 * Real-time preview of poll configuration before creation
 * Updates reactively when options or settings change
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Clock, BarChart3, RefreshCcw } from 'lucide-react';
import { CHART_COLORS } from '../../constants';

// ============================================
// TYPES
// ============================================

export interface PollPreviewOption {
  label: string;
  color: string;
  icon?: string;
  image?: string;
}

export interface PollPreviewProps {
  question: string;
  options: PollPreviewOption[];
  duration?: number;
  maxVotes?: number;
  votePrefix?: string;
  className?: string;
  showSimulation?: boolean;
  compact?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const PollPreview: React.FC<PollPreviewProps> = ({
  question,
  options,
  duration,
  maxVotes,
  votePrefix = '+',
  className = '',
  showSimulation = true,
  compact = false,
}) => {
  // Simulated votes for preview
  const [simulatedVotes, setSimulatedVotes] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState(showSimulation);

  // Initialize simulated votes when options change
  useEffect(() => {
    if (options.length > 0) {
      setSimulatedVotes(options.map(() => Math.floor(Math.random() * 50) + 10));
    }
  }, [options.length]);

  // Simulate vote changes
  useEffect(() => {
    if (!isSimulating || options.length === 0) return;

    const interval = setInterval(() => {
      setSimulatedVotes(prev => {
        const newVotes = [...prev];
        const randomIndex = Math.floor(Math.random() * newVotes.length);
        newVotes[randomIndex] = (newVotes[randomIndex] || 0) + Math.floor(Math.random() * 3) + 1;
        return newVotes;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulating, options.length]);

  // Calculate totals and percentages
  const totalVotes = useMemo(() => 
    simulatedVotes.reduce((sum, v) => sum + v, 0), 
    [simulatedVotes]
  );

  const optionsWithStats = useMemo(() => 
    options.map((opt, i) => ({
      ...opt,
      votes: simulatedVotes[i] || 0,
      percentage: totalVotes > 0 ? ((simulatedVotes[i] || 0) / totalVotes) * 100 : 0,
      color: opt.color || CHART_COLORS[i % CHART_COLORS.length],
    })),
    [options, simulatedVotes, totalVotes]
  );

  // Find leader
  const leader = useMemo(() => {
    if (optionsWithStats.length === 0) return null;
    return optionsWithStats.reduce((max, opt) => 
      opt.votes > max.votes ? opt : max, optionsWithStats[0]
    );
  }, [optionsWithStats]);

  // Reset simulation
  const resetSimulation = () => {
    setSimulatedVotes(options.map(() => Math.floor(Math.random() * 50) + 10));
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (options.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 ${className}`}>
        <div className="text-center text-zinc-500">
          <Eye size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Añade opciones para ver la vista previa</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-purple-500" />
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            Vista Previa
          </span>
          {isSimulating && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetSimulation}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Reiniciar simulación"
          >
            <RefreshCcw size={12} />
          </button>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-1 rounded transition-colors ${
              isSimulating 
                ? 'text-green-500 hover:text-green-600' 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title={isSimulating ? 'Pausar simulación' : 'Iniciar simulación'}
          >
            {isSimulating ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`p-3 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        {/* Question */}
        <div>
          <h4 className={`font-bold text-zinc-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {question || 'Tu pregunta aquí...'}
          </h4>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Users size={12} /> {totalVotes} votos
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatDuration(duration)}
              </span>
            )}
            {maxVotes && (
              <span className="flex items-center gap-1">
                <BarChart3 size={12} /> Meta: {maxVotes}
              </span>
            )}
          </div>
        </div>

        {/* Options */}
        <div className={`space-y-${compact ? '1.5' : '2'}`}>
          {optionsWithStats.map((opt, i) => {
            const isLeader = leader?.label === opt.label && opt.votes > 0;
            
            return (
              <div
                key={i}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  isLeader 
                    ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900' 
                    : ''
                }`}
              >
                {/* Background bar */}
                <div 
                  className="absolute inset-0 opacity-20 transition-all duration-500"
                  style={{ 
                    width: `${opt.percentage}%`,
                    backgroundColor: opt.color,
                  }}
                />
                
                {/* Content */}
                <div className={`relative flex items-center justify-between ${compact ? 'p-2' : 'p-2.5'} bg-white/50 dark:bg-zinc-800/50`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Vote key */}
                    <span 
                      className={`shrink-0 ${compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded flex items-center justify-center font-bold text-white`}
                      style={{ backgroundColor: opt.color }}
                    >
                      {votePrefix}{i + 1}
                    </span>
                    
                    {/* Icon/Image */}
                    {opt.image ? (
                      <img 
                        src={opt.image} 
                        alt="" 
                        className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-cover shrink-0`}
                      />
                    ) : opt.icon ? (
                      <span className={compact ? 'text-sm' : 'text-base'}>{opt.icon}</span>
                    ) : null}
                    
                    {/* Label */}
                    <span className={`truncate text-zinc-800 dark:text-zinc-200 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>
                      {opt.label || `Opción ${i + 1}`}
                    </span>
                    
                    {/* Leader badge */}
                    {isLeader && (
                      <span className="text-[9px] px-1 py-0.5 bg-yellow-400 text-yellow-900 rounded font-bold">
                        LÍDER
                      </span>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-zinc-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'} tabular-nums`}>
                      {opt.percentage.toFixed(1)}%
                    </span>
                    <span className={`text-zinc-500 ${compact ? 'text-[10px]' : 'text-xs'} tabular-nums`}>
                      ({opt.votes})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote hint */}
        <div className="text-[10px] text-zinc-500 text-center">
          Escribe <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded">{votePrefix}1</code> en el chat para votar
        </div>
      </div>
    </div>
  );
};

export default PollPreview;
