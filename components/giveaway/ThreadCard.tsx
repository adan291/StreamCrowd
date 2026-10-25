/**
 * ThreadCard Component
 * Card for displaying a single giveaway thread with actions
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Trophy, 
  Users, 
  Clock, 
  MessageSquare, 
  Heart,
  ChevronDown,
  ChevronUp,
  Hash,
  Pencil
} from 'lucide-react';
import type { GiveawayThread } from './types';

// ============================================
// TYPES
// ============================================

export interface ThreadCardProps {
  /** Thread data */
  thread: GiveawayThread;
  /** Callback to toggle thread active state */
  onToggle?: (id: string) => void;
  /** Callback to delete thread */
  onDelete?: (id: string) => void;
  /** Callback to pick winner */
  onPickWinner?: (id: string) => void;
  /** Callback to edit thread */
  onEdit?: (id: string) => void;
  /** Get unique participant count */
  getUniqueCount?: (thread: GiveawayThread) => number;
  /** Get total entries count */
  getTotalEntries?: (thread: GiveawayThread) => number;
  /** Thread color (for visual distinction) */
  color?: string;
  /** Show expanded details */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// COUNTDOWN COMPONENT
// ============================================

interface CountdownProps {
  startsAt?: number;
  endsAt?: number;
  isPaused?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ startsAt, endsAt, isPaused }) => {
  const [display, setDisplay] = useState({ text: '', type: 'neutral' as 'waiting' | 'active' | 'expired' | 'paused' | 'neutral' });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      
      // Si está pausado
      if (isPaused) {
        setDisplay({ text: 'Pausado', type: 'paused' });
        return;
      }
      
      // Si tiene fecha de inicio en el futuro
      if (startsAt && startsAt > now) {
        const diff = startsAt - now;
        setDisplay({ text: `Empieza en ${formatTimeDiff(diff)}`, type: 'waiting' });
        return;
      }
      
      // Si tiene fecha de fin
      if (endsAt) {
        const diff = endsAt - now;
        
        if (diff <= 0) {
          setDisplay({ text: '¡Finalizado!', type: 'expired' });
          return;
        }
        
        // Mostrar "Termina en X" si está activo
        setDisplay({ text: `Termina en ${formatTimeDiff(diff)}`, type: 'active' });
        return;
      }
      
      // Sin tiempo configurado
      setDisplay({ text: 'Sin límite', type: 'neutral' });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, endsAt, isPaused]);

  const colorClass = {
    waiting: 'text-blue-500',
    active: 'text-green-500',
    expired: 'text-orange-500',
    paused: 'text-yellow-500',
    neutral: 'text-zinc-400',
  }[display.type];

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {display.text}
    </span>
  );
};

// Helper para formatear diferencia de tiempo
const formatTimeDiff = (diffMs: number): string => {
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
};

// ============================================
// MODE ICON COMPONENT
// ============================================

const ModeIcon: React.FC<{ mode: GiveawayThread['mode'] }> = ({ mode }) => {
  switch (mode) {
    case 'keyword':
      return <MessageSquare size={14} className="text-blue-500" />;
    case 'subs':
      return <Heart size={14} className="text-pink-500" />;
    default:
      return <Users size={14} className="text-purple-500" />;
  }
};

// ============================================
// COMPONENT
// ============================================

export const ThreadCard: React.FC<ThreadCardProps> = ({
  thread,
  onToggle,
  onDelete,
  onPickWinner,
  onEdit,
  getUniqueCount,
  getTotalEntries,
  color = '#a970ff',
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const uniqueCount = getUniqueCount ? getUniqueCount(thread) : thread.participants.length;
  const totalEntries = getTotalEntries ? getTotalEntries(thread) : thread.participants.length;
  const hasMultipleEntries = totalEntries > uniqueCount;

  return (
    <div
      className={`
        bg-white dark:bg-zinc-900 rounded-xl border-l-4 shadow-sm
        transition-all hover:shadow-md
        ${thread.isActive ? 'border-green-500' : 'border-zinc-300 dark:border-zinc-700'}
        ${className}
      `}
      style={{ borderLeftColor: thread.isActive ? undefined : color }}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title and mode */}
            <div className="flex items-center gap-2 mb-1">
              <ModeIcon mode={thread.mode} />
              <h3 className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {thread.name}
              </h3>
              {thread.isActive && (
                <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>

            {/* Keyword if applicable */}
            {thread.mode === 'keyword' && thread.keyword && (
              <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <Hash size={12} />
                <span className="font-mono">{thread.keyword}</span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {uniqueCount}
                {hasMultipleEntries && (
                  <span className="text-zinc-400">({totalEntries} entradas)</span>
                )}
              </span>
              
              {(thread.startsAt || thread.endsAt || thread.isPaused) && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <Countdown 
                    startsAt={thread.startsAt} 
                    endsAt={thread.endsAt} 
                    isPaused={thread.isPaused}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onToggle && (
              <button
                onClick={() => onToggle(thread.id)}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${thread.isActive 
                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }
                `}
                title={thread.isActive ? 'Pausar' : 'Reanudar'}
              >
                {thread.isActive ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={() => onEdit(thread.id)}
                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            )}
            {onPickWinner && uniqueCount > 0 && (
              <button
                onClick={() => onPickWinner(thread.id)}
                className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                title="Sortear ganador"
              >
                <Trophy size={14} />
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(thread.id)}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
          {/* Participants preview */}
          {thread.participants.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Últimos participantes:
              </p>
              <div className="flex flex-wrap gap-1">
                {thread.participants.slice(-10).map((p, i) => (
                  <span
                    key={`${p.oderId}-${i}`}
                    className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400"
                  >
                    {p.username}
                  </span>
                ))}
                {thread.participants.length > 10 && (
                  <span className="text-xs px-2 py-0.5 text-zinc-400">
                    +{thread.participants.length - 10} más
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic">
              Sin participantes aún
            </p>
          )}

          {/* Subs config preview */}
          {thread.mode === 'subs' && thread.subsConfig && (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Config:</span>{' '}
              T1: {thread.subsConfig.tier1Value}, 
              T2: {thread.subsConfig.tier2Value}, 
              T3: {thread.subsConfig.tier3Value}
            </div>
          )}

          {/* Created at */}
          <div className="mt-2 text-xs text-zinc-400">
            Creado: {new Date(thread.createdAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadCard;
